export interface LanguageOption {
  code: string;
  label: string;
  mode: 'streaming' | 'batch';
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Auto-detect (English/Hindi)', mode: 'streaming' },
  { code: 'en-IN', label: 'English', mode: 'streaming' },
  { code: 'hi-IN', label: 'Hindi', mode: 'streaming' },
  { code: 'ta-IN', label: 'Tamil', mode: 'batch' },
  { code: 'te-IN', label: 'Telugu', mode: 'batch' },
  { code: 'kn-IN', label: 'Kannada', mode: 'batch' },
  { code: 'ml-IN', label: 'Malayalam', mode: 'batch' },
  { code: 'bn-IN', label: 'Bengali', mode: 'batch' },
  { code: 'mr-IN', label: 'Marathi', mode: 'batch' },
  { code: 'gu-IN', label: 'Gujarati', mode: 'batch' },
  { code: 'pa-IN', label: 'Punjabi', mode: 'batch' },
];

export const STREAMING_LANGUAGES = LANGUAGES.filter((l) => l.mode === 'streaming');
export const BATCH_LANGUAGES = LANGUAGES.filter((l) => l.mode === 'batch');

export function isStreamingLanguage(code: string): boolean {
  return STREAMING_LANGUAGES.some((l) => l.code === code);
}

export function getLanguageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label || code;
}

/**
 * For consultation mode: returns language options string pairing the
 * selected regional language with en-IN for multi-language detection.
 * If already English, returns just en-IN.
 */
export function getLanguageOptions(langCode: string): string {
  if (langCode === 'en-IN' || langCode === 'en-US') {
    // AWS requires at least 2 language options; pair English with Hindi
    return 'en-IN,hi-IN';
  }
  return `en-IN,${langCode}`;
}

/** All languages except auto-detect, for use in consultation mode */
export const CONSULTATION_LANGUAGES = LANGUAGES.filter((l) => l.code !== 'auto');
