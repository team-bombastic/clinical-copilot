'use client';

import { useState, useCallback } from 'react';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AWS_REGION_DEFAULT } from '@/constants/config';
import {
  ERR_NOT_AUTHENTICATED,
  ERR_FUNCTION_NOT_CONFIGURED,
  ERR_DOC_GENERATION_FAILED,
  errLambda,
} from '@/constants/errors';

interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

export interface UseGenerateDocumentReturn {
  uploadedFile: File | null;
  latexCode: string;
  s3Key: string;
  isGenerating: boolean;
  error: string | null;
  setUploadedFile: (file: File | null) => void;
  generateDocument: (
    file: File,
    transcription: string,
    segments: ConsultationSegment[],
    mode: 'dictation' | 'consultation'
  ) => Promise<void>;
  clearState: () => void;
}

// Read the prescription Lambda function name from amplify outputs
function getPrescriptionFunctionName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const outputs = require('../../amplify_outputs.json');
    return outputs?.custom?.generatePrescriptionFunctionName || '';
  } catch {
    return '';
  }
}

export function useGenerateDocument(): UseGenerateDocumentReturn {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [latexCode, setLatexCode] = useState('');
  const [s3Key, setS3Key] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateDocument = useCallback(
    async (
      file: File,
      transcription: string,
      segments: ConsultationSegment[],
      mode: 'dictation' | 'consultation'
    ) => {
      setIsGenerating(true);
      setError(null);
      setLatexCode('');
      setS3Key('');

      try {
        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const base64 = btoa(binary);

        // Determine media type
        const mediaType = file.type || 'image/jpeg';

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

        const userId = session.tokens?.idToken?.payload?.sub || 'anonymous';

        const payload = {
          templateBase64: base64,
          templateMediaType: mediaType,
          transcriptionText: transcription,
          consultationSegments: segments,
          mode,
          userId,
        };

        const functionName = getPrescriptionFunctionName();
        if (!functionName) {
          throw new Error(ERR_FUNCTION_NOT_CONFIGURED);
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

        setLatexCode(result.latexCode || '');
        setS3Key(result.s3Key || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : ERR_DOC_GENERATION_FAILED);
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const clearState = useCallback(() => {
    setUploadedFile(null);
    setLatexCode('');
    setS3Key('');
    setError(null);
  }, []);

  return {
    uploadedFile,
    latexCode,
    s3Key,
    isGenerating,
    error,
    setUploadedFile,
    generateDocument,
    clearState,
  };
}
