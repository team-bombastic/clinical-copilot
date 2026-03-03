export interface LanguageOption {
  code: string;
  label: string;
  mode: 'streaming' | 'batch';
  /** Whether this language supports AWS Transcribe multi-language identification */
  multiLanguageSupported: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'auto',
    label: 'Auto-detect (English/Hindi)',
    mode: 'streaming',
    multiLanguageSupported: true,
  },
  { code: 'en-IN', label: 'English', mode: 'streaming', multiLanguageSupported: true },
  { code: 'hi-IN', label: 'Hindi', mode: 'streaming', multiLanguageSupported: true },
  { code: 'ta-IN', label: 'Tamil', mode: 'batch', multiLanguageSupported: true },
  { code: 'te-IN', label: 'Telugu', mode: 'batch', multiLanguageSupported: true },
  { code: 'kn-IN', label: 'Kannada', mode: 'batch', multiLanguageSupported: false },
  { code: 'ml-IN', label: 'Malayalam', mode: 'batch', multiLanguageSupported: false },
  { code: 'bn-IN', label: 'Bengali', mode: 'batch', multiLanguageSupported: false },
  { code: 'mr-IN', label: 'Marathi', mode: 'batch', multiLanguageSupported: false },
  { code: 'gu-IN', label: 'Gujarati', mode: 'batch', multiLanguageSupported: false },
  { code: 'pa-IN', label: 'Punjabi', mode: 'batch', multiLanguageSupported: false },
];

export const STREAMING_LANGUAGES = LANGUAGES.filter((l) => l.mode === 'streaming');
export const BATCH_LANGUAGES = LANGUAGES.filter((l) => l.mode === 'batch');

export function isStreamingLanguage(code: string): boolean {
  return STREAMING_LANGUAGES.some((l) => l.code === code);
}

export function getLanguageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label || code;
}

/** Check if a language code supports multi-language identification */
export function supportsMultiLanguage(langCode: string): boolean {
  const lang = LANGUAGES.find((l) => l.code === langCode);
  return lang?.multiLanguageSupported ?? false;
}

/**
 * For consultation mode: returns language options string pairing the
 * selected regional language with en-IN for multi-language detection.
 * If already English, returns just en-IN.
 * Returns null if the language doesn't support multi-language identification.
 */
export function getLanguageOptions(langCode: string): string | null {
  if (!supportsMultiLanguage(langCode)) {
    return null;
  }
  if (langCode === 'en-IN' || langCode === 'en-US') {
    // AWS requires at least 2 language options; pair English with Hindi
    return 'en-IN,hi-IN';
  }
  return `en-IN,${langCode}`;
}

/** All languages except auto-detect, for use in consultation mode */
export const CONSULTATION_LANGUAGES = LANGUAGES.filter((l) => l.code !== 'auto');
