// ─── AWS Configuration ───
export const AWS_REGION_DEFAULT = 'ap-south-1';
export const BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
export const BEDROCK_ANTHROPIC_VERSION = 'bedrock-2023-05-31';
export const BEDROCK_MAX_TOKENS = 8192;

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

// ─── File Upload ───
export const ACCEPTED_TEMPLATE_TYPES = 'image/jpeg,image/png,image/webp';

// ─── PDF Export ───
export const PDF_FILENAME_PREFIX = 'prescription';
export const PDF_IMAGE_QUALITY = 0.98;
export const PDF_SCALE = 2;
export const PDF_FORMAT = 'a4';
export const PDF_ORIENTATION = 'portrait' as const;
