import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  type LanguageCode,
  type MediaFormat,
} from '@aws-sdk/client-transcribe';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const SERVICE_REGION = 'ap-south-1';
const TEMP_AUDIO_PREFIX = 'temp-audio';
const POLL_INTERVAL_MS = 1500;
const MAX_SPEAKERS = 2;
const JOB_NAME_PREFIX = 'clinical';
const TARGET_LANGUAGE = 'en';
const CONTENT_TYPE_WEBM = 'audio/webm';
const STATUS_IN_PROGRESS = 'IN_PROGRESS';
const STATUS_QUEUED = 'QUEUED';
const STATUS_COMPLETED = 'COMPLETED';
const STATUS_FAILED = 'FAILED';

const s3 = new S3Client();
const transcribe = new TranscribeClient({ region: SERVICE_REGION });
const translate = new TranslateClient({ region: SERVICE_REGION });

const BUCKET = process.env.STORAGE_BUCKET_NAME!;

// Map AWS Transcribe language codes to AWS Translate language codes
const TRANSCRIBE_TO_TRANSLATE: Record<string, string> = {
  'hi-IN': 'hi',
  'ta-IN': 'ta',
  'te-IN': 'te',
  'kn-IN': 'kn',
  'ml-IN': 'ml',
  'bn-IN': 'bn',
  'mr-IN': 'mr',
  'gu-IN': 'gu',
  'pa-IN': 'pa',
};

interface BatchTranscribeEvent {
  audioBase64: string;
  languageCode: string;
  mediaFormat: string;
  mode?: 'consultation' | 'dictation';
  languageOptions?: string | null;
}

interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

interface DictationResult {
  mode: 'dictation';
  transcript: string;
  translatedText: string;
  languageCode: string;
}

interface ConsultationResult {
  mode: 'consultation';
  segments: ConsultationSegment[];
}

type BatchTranscribeResult = DictationResult | ConsultationResult;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TranscribeItem {
  speaker_label?: string;
  language_code?: string;
  type: string;
  alternatives: { content: string }[];
}

function isEnglishCode(code?: string): boolean {
  return !!code && code.startsWith('en');
}

function groupItemsBySpeaker(
  items: TranscribeItem[]
): { speaker: string; text: string; isEnglish: boolean }[] {
  const segments: { speaker: string; text: string; isEnglish: boolean }[] = [];
  let currentSpeaker = '';
  let currentWords: string[] = [];
  // Track the dominant language per group: if ANY word is non-English, treat as non-English
  let currentAllEnglish = true;

  for (const item of items) {
    const speaker = item.speaker_label || currentSpeaker;
    const content = item.alternatives?.[0]?.content || '';

    if (item.type === 'punctuation') {
      // Append punctuation without space to the last word
      if (currentWords.length > 0) {
        currentWords[currentWords.length - 1] += content;
      }
      continue;
    }

    if (speaker !== currentSpeaker && currentWords.length > 0) {
      segments.push({
        speaker: currentSpeaker,
        text: currentWords.join(' '),
        isEnglish: currentAllEnglish,
      });
      currentWords = [];
      currentAllEnglish = true;
    }

    currentSpeaker = speaker;
    currentWords.push(content);
    if (!isEnglishCode(item.language_code)) {
      currentAllEnglish = false;
    }
  }

  if (currentWords.length > 0) {
    segments.push({
      speaker: currentSpeaker,
      text: currentWords.join(' '),
      isEnglish: currentAllEnglish,
    });
  }

  return segments;
}

export const handler = async (event: BatchTranscribeEvent): Promise<BatchTranscribeResult> => {
  const { audioBase64, languageCode, mediaFormat, mode = 'dictation', languageOptions } = event;
  const jobName = `${JOB_NAME_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const audioKey = `${TEMP_AUDIO_PREFIX}/${jobName}.${mediaFormat}`;
  const outputKey = `${TEMP_AUDIO_PREFIX}/${jobName}-output`;

  try {
    // 1. Upload audio to S3
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: mediaFormat === 'webm' ? CONTENT_TYPE_WEBM : `audio/${mediaFormat}`,
      })
    );

    // 2. Start transcription job
    if (mode === 'consultation') {
      // Consultation: speaker diarization + language detection
      if (languageOptions) {
        // Multi-language identification supported
        await transcribe.send(
          new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            IdentifyMultipleLanguages: true,
            LanguageOptions: languageOptions
              .split(',')
              .map((c) => c.trim()) as LanguageCode[],
            MediaFormat: mediaFormat as MediaFormat,
            Media: {
              MediaFileUri: `s3://${BUCKET}/${audioKey}`,
            },
            OutputBucketName: BUCKET,
            OutputKey: `${outputKey}.json`,
            Settings: {
              ShowSpeakerLabels: true,
              MaxSpeakerLabels: MAX_SPEAKERS,
            },
          })
        );
      } else {
        // Language doesn't support multi-language identification;
        // fall back to single language with speaker diarization
        await transcribe.send(
          new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            LanguageCode: languageCode as LanguageCode,
            MediaFormat: mediaFormat as MediaFormat,
            Media: {
              MediaFileUri: `s3://${BUCKET}/${audioKey}`,
            },
            OutputBucketName: BUCKET,
            OutputKey: `${outputKey}.json`,
            Settings: {
              ShowSpeakerLabels: true,
              MaxSpeakerLabels: MAX_SPEAKERS,
            },
          })
        );
      }
    } else {
      // Dictation: fixed language, no speaker labels
      await transcribe.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          LanguageCode: languageCode as LanguageCode,
          MediaFormat: mediaFormat as MediaFormat,
          Media: {
            MediaFileUri: `s3://${BUCKET}/${audioKey}`,
          },
          OutputBucketName: BUCKET,
          OutputKey: `${outputKey}.json`,
        })
      );
    }

    // 3. Poll until complete
    let status = 'IN_PROGRESS';
    while (status === STATUS_IN_PROGRESS || status === STATUS_QUEUED) {
      await sleep(POLL_INTERVAL_MS);
      const jobResponse = await transcribe.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobName,
        })
      );
      status = jobResponse.TranscriptionJob?.TranscriptionJobStatus || STATUS_FAILED;
    }

    if (status !== STATUS_COMPLETED) {
      throw new Error(`Transcription job failed with status: ${status}`);
    }

    // 4. Read transcript from S3 output
    const outputResponse = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: `${outputKey}.json`,
      })
    );
    const outputBody = await outputResponse.Body!.transformToString();
    const outputJson = JSON.parse(outputBody);

    if (mode === 'consultation') {
      // Parse speaker-labeled items (includes per-item language_code)
      const items: TranscribeItem[] = outputJson.results?.items || [];
      const speakerGroups = groupItemsBySpeaker(items);

      // Only translate non-English segments; skip English ones
      const segments: ConsultationSegment[] = await Promise.all(
        speakerGroups.map(async (group) => {
          if (group.isEnglish) {
            return {
              speaker: group.speaker,
              text: group.text,
              translatedText: group.text,
            };
          }
          const translateResponse = await translate.send(
            new TranslateTextCommand({
              Text: group.text || ' ',
              SourceLanguageCode: 'auto',
              TargetLanguageCode: TARGET_LANGUAGE,
            })
          );
          return {
            speaker: group.speaker,
            text: group.text,
            translatedText: translateResponse.TranslatedText || group.text,
          };
        })
      );

      return { mode: 'consultation', segments };
    } else {
      // Dictation: return flat transcript + translation
      const transcript = outputJson.results?.transcripts?.[0]?.transcript || '';

      const sourceLanguageCode =
        TRANSCRIBE_TO_TRANSLATE[languageCode] || languageCode.split('-')[0];
      const translateResponse = await translate.send(
        new TranslateTextCommand({
          Text: transcript || ' ',
          SourceLanguageCode: sourceLanguageCode,
          TargetLanguageCode: TARGET_LANGUAGE,
        })
      );

      return {
        mode: 'dictation',
        transcript,
        translatedText: translateResponse.TranslatedText || '',
        languageCode,
      };
    }
  } finally {
    // Clean up temp S3 files
    const keysToDelete = [audioKey, `${outputKey}.json`];
    await Promise.allSettled(
      keysToDelete.map((key) => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })))
    );
  }
};
