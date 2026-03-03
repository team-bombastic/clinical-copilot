import { useState, useRef, useCallback } from 'react';
import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  AudioStream,
} from '@aws-sdk/client-transcribe-streaming';
import { fetchAuthSession } from 'aws-amplify/auth';
import { pcmProcessorWorkletCode } from './pcm-processor.worklet';
import { AWS_REGION_DEFAULT, AUDIO_SAMPLE_RATE, AUDIO_ENCODING } from '@/constants/config';
import { ERR_NOT_AUTHENTICATED, ERR_TRANSCRIPTION_FAILED } from '@/constants/errors';

const FILLER_WORDS =
  /\b(um|uh|erm|ah|hmm|you know|basically|actually|literally|sort of|kind of)\b/gi;
const FILLER_LIKE = /,?\s*\blike\b\s*,?/g;

function cleanTranscript(text: string): string {
  let cleaned = text;
  cleaned = cleaned.replace(FILLER_WORDS, '');
  cleaned = cleaned.replace(FILLER_LIKE, (match, offset, full) => {
    const before = full.substring(Math.max(0, offset - 5), offset);
    const after = full.substring(offset + match.length, offset + match.length + 5);
    if (/[,.]/.test(before) || /[,.]/.test(after) || /^\s*$/.test(before.trim())) {
      return ' ';
    }
    return match;
  });
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
  cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
  return cleaned.trim();
}

export interface TranscriptSegment {
  text: string;
  languageCode: string;
}

export interface UseTranscribeReturn {
  isRecording: boolean;
  transcript: string;
  segments: TranscriptSegment[];
  partialTranscript: string;
  detectedLanguage: string | null;
  error: string | null;
  isConnecting: boolean;
  startRecording: (languageCode?: string) => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
}

export function useTranscribe(): UseTranscribeReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stoppedRef = useRef(false);
  const recordingLangRef = useRef<string>('en-IN');

  const stopRecording = useCallback(() => {
    stoppedRef.current = true;
    setIsRecording(false);

    // Promote any remaining partial transcript into the finalized transcript and segments
    setPartialTranscript((partial) => {
      if (partial.trim()) {
        const cleaned = cleanTranscript(partial.trim());
        if (cleaned) {
          setTranscript((prev) => (prev ? prev + ' ' + cleaned : cleaned));
          setSegments((prev) => [
            ...prev,
            { text: cleaned, languageCode: recordingLangRef.current },
          ]);
        }
      }
      return '';
    });

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {});
    }
    audioContextRef.current = null;

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setSegments([]);
    setPartialTranscript('');
    setDetectedLanguage(null);
  }, []);

  const startRecording = useCallback(
    async (languageCode?: string) => {
      setError(null);
      setIsConnecting(true);
      setDetectedLanguage(null);
      stoppedRef.current = false;
      const useAutoDetect = !languageCode || languageCode === 'auto';
      const fallbackLang = useAutoDetect ? 'en-IN' : languageCode!;
      recordingLangRef.current = fallbackLang;

      try {
        // 1. Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        mediaStreamRef.current = stream;

        // 2. AudioContext + Worklet (use default sample rate; worklet downsamples to 16 kHz)
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const blob = new Blob([pcmProcessorWorkletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        await audioContext.audioWorklet.addModule(workletUrl);
        URL.revokeObjectURL(workletUrl);

        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        // 3. PCM chunk queue
        const pcmChunks: ArrayBuffer[] = [];
        let resolveChunk: (() => void) | null = null;

        workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          pcmChunks.push(e.data);
          if (resolveChunk) {
            resolveChunk();
            resolveChunk = null;
          }
        };

        // 4. Async generator for audio events
        async function* audioStream(): AsyncGenerator<AudioStream> {
          while (!stoppedRef.current) {
            if (pcmChunks.length === 0) {
              await new Promise<void>((r) => {
                resolveChunk = r;
                setTimeout(r, 50);
              });
            }
            while (pcmChunks.length > 0) {
              const chunk = pcmChunks.shift()!;
              yield { AudioEvent: { AudioChunk: new Uint8Array(chunk) } };
            }
          }
        }

        // 5. Get credentials & create client
        const session = await fetchAuthSession();
        const credentials = session.credentials;
        if (!credentials) throw new Error(ERR_NOT_AUTHENTICATED);

        const region =
          (session.tokens?.idToken?.payload?.['custom:region'] as string) || AWS_REGION_DEFAULT;

        const client = new TranscribeStreamingClient({
          region,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        // 6. Start streaming transcription
        const command = new StartStreamTranscriptionCommand({
          ...(useAutoDetect
            ? { IdentifyLanguage: true, LanguageOptions: 'en-IN,hi-IN' }
            : { LanguageCode: languageCode as 'en-IN' | 'hi-IN' }),
          MediaEncoding: AUDIO_ENCODING,
          MediaSampleRateHertz: AUDIO_SAMPLE_RATE,
          AudioStream: audioStream(),
        });

        setIsConnecting(false);
        setIsRecording(true);

        const response = await client.send(command);

        // 7. Process results — track each finalized segment with its language
        if (response.TranscriptResultStream) {
          for await (const event of response.TranscriptResultStream) {
            if (stoppedRef.current) break;

            if (event.TranscriptEvent?.Transcript?.Results) {
              for (const result of event.TranscriptEvent.Transcript.Results) {
                const alt = result.Alternatives?.[0];
                if (!alt?.Transcript) continue;

                const lang = result.LanguageCode || fallbackLang;

                if (result.LanguageCode) {
                  setDetectedLanguage(result.LanguageCode);
                }

                if (result.IsPartial) {
                  setPartialTranscript(alt.Transcript);
                } else {
                  const cleaned = cleanTranscript(alt.Transcript);
                  if (cleaned) {
                    const segment: TranscriptSegment = {
                      text: cleaned,
                      languageCode: lang,
                    };
                    setSegments((prev) => [...prev, segment]);
                    setTranscript((prev) => {
                      if (!prev) return cleaned;
                      return prev + ' ' + cleaned;
                    });
                  }
                  setPartialTranscript('');
                }
              }
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : ERR_TRANSCRIPTION_FAILED;
        if (!stoppedRef.current) {
          setError(msg);
        }
      } finally {
        setIsConnecting(false);
        stopRecording();
      }
    },
    [stopRecording]
  );

  return {
    isRecording,
    transcript,
    segments,
    partialTranscript,
    detectedLanguage,
    error,
    isConnecting,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript,
  };
}
