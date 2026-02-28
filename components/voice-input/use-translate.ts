import { useState, useRef, useCallback } from 'react';
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface UseTranslateReturn {
  translatedText: string;
  isTranslating: boolean;
  translateError: string | null;
  translateText: (text: string, sourceLang: string, targetLang: string) => void;
  clearTranslation: () => void;
}

export function useTranslate(): UseTranslateReturn {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef(0);

  const translateText = useCallback(
    (text: string, sourceLang: string, targetLang: string) => {
      if (!text.trim() || !targetLang || sourceLang === targetLang) {
        setTranslatedText('');
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        const requestId = ++lastRequestRef.current;
        setIsTranslating(true);
        setTranslateError(null);

        try {
          const session = await fetchAuthSession();
          const credentials = session.credentials;
          if (!credentials) throw new Error('Not authenticated');

          const region =
            (session.tokens?.idToken?.payload?.['custom:region'] as string) ||
            'ap-south-1';

          const client = new TranslateClient({
            region,
            credentials: {
              accessKeyId: credentials.accessKeyId,
              secretAccessKey: credentials.secretAccessKey,
              sessionToken: credentials.sessionToken,
            },
          });

          const command = new TranslateTextCommand({
            Text: text,
            SourceLanguageCode: sourceLang,
            TargetLanguageCode: targetLang,
          });

          const response = await client.send(command);

          // Only update if this is still the latest request
          if (requestId === lastRequestRef.current) {
            setTranslatedText(response.TranslatedText || '');
          }
        } catch (err) {
          if (requestId === lastRequestRef.current) {
            setTranslateError(
              err instanceof Error ? err.message : 'Translation failed'
            );
          }
        } finally {
          if (requestId === lastRequestRef.current) {
            setIsTranslating(false);
          }
        }
      }, 600);
    },
    []
  );

  const clearTranslation = useCallback(() => {
    setTranslatedText('');
    setTranslateError(null);
  }, []);

  return {
    translatedText,
    isTranslating,
    translateError,
    translateText,
    clearTranslation,
  };
}
