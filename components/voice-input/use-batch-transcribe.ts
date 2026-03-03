import { useState, useRef, useCallback } from 'react';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AWS_REGION_DEFAULT, AUDIO_MIME_TYPE, AUDIO_CONTENT_TYPE } from '@/constants/config';
import {
  ERR_NOT_AUTHENTICATED,
  ERR_BATCH_TRANSCRIPTION_FAILED,
  ERR_RECORDING_FAILED,
  errLambda,
} from '@/constants/errors';

export interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

export interface UseBatchTranscribeReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  translatedText: string;
  segments: ConsultationSegment[];
  error: string | null;
  startRecording: (
    languageCode: string,
    mode?: 'consultation' | 'dictation',
    languageOptions?: string | null
  ) => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
  setSegments: React.Dispatch<React.SetStateAction<ConsultationSegment[]>>;
}

export function useBatchTranscribe(functionName: string): UseBatchTranscribeReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [segments, setSegments] = useState<ConsultationSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const languageCodeRef = useRef<string>('');
  const modeRef = useRef<'consultation' | 'dictation'>('dictation');
  const languageOptionsRef = useRef<string | null | undefined>(undefined);

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Convert blob to base64 (chunked to avoid call-stack limit)
        const arrayBuffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);

        // Get credentials
        const session = await fetchAuthSession();
        const credentials = session.credentials;
        if (!credentials) throw new Error(ERR_NOT_AUTHENTICATED);

        const region =
          (session.tokens?.idToken?.payload?.['custom:region'] as string) || AWS_REGION_DEFAULT;

        const lambda = new LambdaClient({
          region,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        const payload: Record<string, unknown> = {
          audioBase64: base64,
          languageCode: languageCodeRef.current,
          mediaFormat: 'webm',
          mode: modeRef.current,
        };
        if (languageOptionsRef.current) {
          payload.languageOptions = languageOptionsRef.current;
        }

        const response = await lambda.send(
          new InvokeCommand({
            FunctionName: functionName,
            Payload: new TextEncoder().encode(JSON.stringify(payload)),
          })
        );

        if (response.FunctionError) {
          const errorPayload = new TextDecoder().decode(response.Payload);
          throw new Error(errLambda(errorPayload));
        }

        const result = JSON.parse(new TextDecoder().decode(response.Payload));

        if (result.mode === 'consultation') {
          setSegments((prev) => [...prev, ...(result.segments || [])]);
        } else {
          const newTranscript = result.transcript || '';
          const newTranslation = result.translatedText || '';
          setTranscript((prev) => (prev ? prev + ' ' + newTranscript : newTranscript));
          setTranslatedText((prev) => (prev ? prev + ' ' + newTranslation : newTranslation));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : ERR_BATCH_TRANSCRIPTION_FAILED);
      } finally {
        setIsProcessing(false);
      }
    },
    [functionName]
  );

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(
    async (
      languageCode: string,
      mode: 'consultation' | 'dictation' = 'dictation',
      languageOptions?: string | null
    ) => {
      setError(null);
      languageCodeRef.current = languageCode;
      modeRef.current = mode;
      languageOptionsRef.current = languageOptions;
      chunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: AUDIO_MIME_TYPE,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(chunksRef.current, {
            type: AUDIO_CONTENT_TYPE,
          });
          processAudio(audioBlob);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : ERR_RECORDING_FAILED);
      }
    },
    [processAudio]
  );

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setTranslatedText('');
    setSegments([]);
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    translatedText,
    segments,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
    setTranscript,
    setTranslatedText,
    setSegments,
  };
}
