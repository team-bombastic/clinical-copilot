// ─── Page ───
export const PAGE_TITLE = 'Clinical Copilot';
export const PAGE_SUBTITLE = 'Dictate or type clinical notes with live transcription';
export const SIGN_OUT_LABEL = 'Sign out';

// ─── Voice Input ───
export const MODE_CONSULTATION = 'Consultation';
export const MODE_DICTATION = 'Dictation';
export const TITLE_CONSULTATION = 'Consultation Recording';
export const TITLE_DICTATION = 'Clinical Notes';
export const OPTGROUP_REALTIME = 'Real-time';
export const OPTGROUP_OTHER = 'Other Languages';

export const LISTENING_TEXT = 'Listening...';
export const PROCESSING_CONSULTATION_TEXT = 'Processing consultation...';
export const CLEAR_BUTTON_TEXT = 'Clear';
export const GENERATE_BUTTON_TEXT = 'Generate Medical Documents';

export const TRANSLATION_SECTION_LABEL = 'English Translation';
export const TRANSLATING_FALLBACK = 'Translating...';

export const BADGE_MIXED_LANGUAGE = 'English + Hindi';
export const BADGE_DETECTED_PREFIX = 'Detected:';

// ─── Voice Input Placeholders ───
export const placeholderConsultation = (lang: string) =>
  `Tap the mic to record a consultation in ${lang}...`;
export const placeholderStreaming = 'Tap the mic and speak — language is detected automatically...';
export const placeholderBatch = (lang: string) =>
  `Tap the mic, speak in ${lang}, then stop to transcribe...`;
export const recordingConsultation = (lang: string) => `Recording consultation (${lang})...`;
export const recordingBatch = (lang: string) => `Recording (${lang})...`;
export const processingBatch = (lang: string) => `Processing ${lang} audio...`;

// ─── Document Generator ───
export const DOC_GEN_TITLE = 'Generate Prescription';
export const DOC_GEN_SUBTITLE =
  'Upload your hospital template and generate a formatted prescription';
export const DROP_ZONE_TEXT = 'Drop your hospital prescription template here';
export const DROP_ZONE_HINT = 'or click to browse • JPEG, PNG';
export const GENERATING_TEXT = 'Generating with AI...';
export const GENERATE_PRESCRIPTION_TEXT = 'Generate Prescription';
export const TAB_PREVIEW = 'Preview';
export const DOWNLOAD_PDF_TEXT = 'Download PDF';
export const REUPLOAD_TEXT = '← Upload a different template';

// ─── Tooltip / Title Attributes ───
export const TOOLTIP_CLOSE = 'Close';
export const TOOLTIP_STOP_RECORDING = 'Stop recording';
export const TOOLTIP_START_RECORDING = 'Start recording';
export const TOOLTIP_DOWNLOAD_PDF = 'Download PDF';
