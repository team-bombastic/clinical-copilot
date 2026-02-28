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
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';

const SERVICE_REGION = 'ap-south-1';

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
  languageOptions?: string;
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

export const handler = async (
  event: BatchTranscribeEvent
): Promise<BatchTranscribeResult> => {
  const { audioBase64, languageCode, mediaFormat, mode = 'dictation', languageOptions } = event;
  const jobName = `clinical-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const audioKey = `temp-audio/${jobName}.${mediaFormat}`;
  const outputKey = `temp-audio/${jobName}-output`;

  try {
    // 1. Upload audio to S3
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: audioKey,
        Body: audioBuffer,
        ContentType: mediaFormat === 'webm' ? 'audio/webm' : `audio/${mediaFormat}`,
      })
    );

    // 2. Start transcription job
    if (mode === 'consultation') {
      // Consultation: multi-language detection + speaker diarization
      await transcribe.send(
        new StartTranscriptionJobCommand({
          TranscriptionJobName: jobName,
          IdentifyMultipleLanguages: true,
          LanguageOptions: (languageOptions || `en-IN,${languageCode}`)
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
            MaxSpeakerLabels: 2,
          },
        })
      );
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
    while (status === 'IN_PROGRESS' || status === 'QUEUED') {
      await sleep(1500);
      const jobResponse = await transcribe.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobName,
        })
      );
      status = jobResponse.TranscriptionJob?.TranscriptionJobStatus || 'FAILED';
    }

    if (status !== 'COMPLETED') {
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
              TargetLanguageCode: 'en',
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
      const transcript =
        outputJson.results?.transcripts?.[0]?.transcript || '';

      const sourceLanguageCode = TRANSCRIBE_TO_TRANSLATE[languageCode] || languageCode.split('-')[0];
      const translateResponse = await translate.send(
        new TranslateTextCommand({
          Text: transcript || ' ',
          SourceLanguageCode: sourceLanguageCode,
          TargetLanguageCode: 'en',
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
      keysToDelete.map((key) =>
        s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
      )
    );
  }
};
