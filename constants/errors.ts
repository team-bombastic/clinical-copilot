// ─── Authentication ───
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

// ─── Lambda ───
export const errLambda = (payload: string) => `Lambda error: ${payload}`;
export const errTranscriptionJobFailed = (status: string) =>
  `Transcription job failed with status: ${status}`;
