// ─── Language Display Labels ───
export const LANGUAGE_LABELS: Record<string, string> = {
  'en-IN': 'English',
  'en-US': 'English',
  'hi-IN': 'Hindi',
};

// ─── Speaker Diarization Labels ───
export const SPEAKER_LABELS: Record<string, string> = {
  spk_0: 'Doctor',
  spk_1: 'Patient',
};

export function getSpeakerLabel(speaker: string): string {
  return SPEAKER_LABELS[speaker] || speaker;
}

// ─── AWS Transcribe → Translate Language Code Map ───
export const TRANSCRIBE_TO_TRANSLATE: Record<string, string> = {
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
