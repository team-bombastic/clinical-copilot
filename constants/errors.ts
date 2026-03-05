// ─── Authentication ───
/**
 * @deprecated Use `next-intl` and `useTranslations('errors')` instead.
 */
export const ERR_NOT_AUTHENTICATED = 'Not authenticated';

// ─── Transcription ───
export const ERR_TRANSCRIPTION_FAILED = 'Transcription failed';
export const ERR_BATCH_TRANSCRIPTION_FAILED = 'Batch transcription failed';
export const ERR_RECORDING_FAILED = 'Failed to start recording';
export const ERR_TRANSLATION_FAILED = 'Translation failed';

// ─── Document Generation ───
export const ERR_DOC_GENERATION_FAILED = 'Document generation failed';
export const ERR_FUNCTION_NOT_CONFIGURED =
  'Prescription function not configured. Deploy the Amplify backend first.';
export const ERR_TEXTRACT_FAILED = 'Failed to extract fields from template image';
export const ERR_PDF_GENERATION_FAILED = 'Failed to generate PDF';

// ─── AI Analysis ───
export const ERR_ANALYSIS_FAILED = 'AI analysis failed';
export const ERR_ANALYSIS_FUNCTION_NOT_CONFIGURED =
  'AI analysis function not configured. Deploy the Amplify backend first.';
export const ERR_NO_TRANSCRIPT_FOR_ANALYSIS = 'No transcript available for analysis';
export const ERR_CRITICAL_ALERTS_UNACKNOWLEDGED =
  'Please acknowledge all critical safety alerts before proceeding';

// ─── Lambda ───
export const errLambda = (payload: string) => `Lambda error: ${payload}`;
export const errTranscriptionJobFailed = (status: string) =>
  `Transcription job failed with status: ${status}`;
