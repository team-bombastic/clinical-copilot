// ─── AWS Configuration ───
export const AWS_REGION_DEFAULT = 'ap-south-1';

// ─── Audio / Transcription ───
export const AUDIO_SAMPLE_RATE = 16000;
export const AUDIO_ENCODING = 'pcm' as const;
export const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus';
export const AUDIO_CONTENT_TYPE = 'audio/webm';
export const TRANSLATION_DEBOUNCE_MS = 600;

// ─── Lambda ───
export const LAMBDA_TIMEOUT_SECONDS = 120;
export const LAMBDA_MEMORY_MB = 512;
export const TRANSCRIBE_POLL_INTERVAL_MS = 1500;

// ─── S3 Paths ───
export const S3_TEMP_AUDIO_PREFIX = 'temp-audio';
export const S3_PRESCRIPTIONS_PREFIX = 'prescriptions';

// ─── PDF ───
export const PDF_FILENAME_PREFIX = 'prescription';
export const OPD_PDF_FILENAME_PREFIX = 'opd-note';
