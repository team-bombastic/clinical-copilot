// ─── Page ───
export const PAGE_TITLE = 'Clinical Copilot';
export const PAGE_SUBTITLE = 'Dictate or type clinical notes with live transcription';
export const SIGN_OUT_LABEL = 'Sign out';

// ─── Voice Input ───
export const MODE_CONSULTATION = 'Consultation';
export const MODE_DICTATION = 'Dictation';
export const MODE_DESC_CONSULTATION =
	'Record a doctor-patient conversation with speaker separation and translation.';
export const MODE_DESC_DICTATION =
	'Dictate or type clinical notes directly in your preferred language.';
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
	`Tap the mic, speak in ${lang} (or type here in English), then stop to transcribe...`;
export const recordingConsultation = (lang: string) => `Recording consultation (${lang})...`;
export const recordingBatch = (lang: string) => `Recording (${lang})...`;
export const processingBatch = (lang: string) => `Processing ${lang} audio...`;

// ─── Document Generator ───
export const DOC_GEN_TITLE = 'Select Prescription Template';
export const DOC_GEN_SUBTITLE =
	'Choose a template and download your prescription as PDF';
export const SELECT_TEMPLATE_TEXT = 'Choose a template to get started';
export const DOWNLOAD_PDF_TEXT = 'Download PDF';

// ─── Document Type Tabs ───
export const DOC_TYPE_PRESCRIPTION = 'Prescription';
export const DOC_TYPE_OPD_NOTE = 'OPD Note';
export const OPD_GEN_TITLE = 'Select OPD Note Template';
export const OPD_GEN_SUBTITLE =
	'Choose a template and download your OPD note as PDF';
export const SELECT_OPD_TEMPLATE_TEXT = 'Choose an OPD note template to get started';

// ─── OPD Section Labels ───
export const LABEL_VITAL_SIGNS = 'Vital Signs';
export const LABEL_HISTORY_OF_PRESENT_ILLNESS = 'History of Present Illness';
export const LABEL_PHYSICAL_EXAMINATION = 'Physical Examination';
export const LABEL_PAST_MEDICAL_HISTORY = 'Past Medical History';
export const LABEL_TREATMENT_PLAN = 'Treatment Plan / Medications';

// ─── AI Analysis ───
export const ANALYSIS_PANEL_TITLE = 'AI Clinical Analysis';
export const ANALYSIS_PANEL_SUBTITLE =
	'Review AI-extracted clinical data and safety alerts before generating documents';
export const ANALYZING_TEXT = 'Analyzing transcript with AI...';
export const ANALYZE_BUTTON_TEXT = 'Analyze with AI';
export const PROCEED_TO_GENERATION_TEXT = 'Proceed to Document Generation';
export const REANALYZE_TEXT = 'Re-analyze';
export const BACK_TO_TRANSCRIPT_TEXT = 'Back to Transcript';

export const SECTION_SAFETY_ALERTS = 'Safety Alerts';
export const SECTION_EXTRACTED_ENTITIES = 'Extracted Entities';
export const SECTION_CLINICAL_DATA = 'Clinical Data';
export const SECTION_MEDICATIONS = 'Medications';
export const SECTION_EVIDENCE_NOTES = 'Evidence & Guidelines';
export const SHOW_SOURCE_TEXT = 'Show Source';
export const HIDE_SOURCE_TEXT = 'Hide Source';
export const RAG_SOURCE_HEADER = 'Knowledge Base Source';
export const RAG_SOURCE_EMPTY = 'No source passages available for this item.';

export const LABEL_PATIENT_NAME = 'Patient Name';
export const LABEL_AGE = 'Age';
export const LABEL_SEX = 'Sex';
export const LABEL_DATE = 'Date';
export const LABEL_ADDRESS = 'Address';
export const LABEL_CHIEF_COMPLAINTS = 'Chief Complaints';
export const LABEL_DIAGNOSIS = 'Diagnosis';
export const LABEL_DIFFERENTIAL_DIAGNOSIS = 'Differential Diagnosis';
export const LABEL_INVESTIGATIONS = 'Investigations';
export const LABEL_INSTRUCTIONS = 'Instructions';
export const LABEL_FOLLOW_UP = 'Follow-up';
export const LABEL_VITALS = 'Vital Signs';
export const LABEL_ALLERGIES = 'Allergies';
export const LABEL_MEDICAL_HISTORY = 'Medical History';
export const LABEL_CLINICAL_SUMMARY = 'Clinical Summary';

export const LABEL_DRUG_NAME = 'Drug Name';
export const LABEL_GENERIC_NAME = 'Generic Name';
export const LABEL_DOSAGE = 'Dosage';
export const LABEL_FREQUENCY = 'Frequency';
export const LABEL_DURATION = 'Duration';
export const LABEL_ROUTE = 'Route';
export const LABEL_MED_INSTRUCTIONS = 'Instructions';
export const LABEL_NLEM = 'NLEM';

export const ADD_MEDICATION_TEXT = 'Add Medication';
export const REMOVE_MEDICATION_TEXT = 'Remove';
export const ACKNOWLEDGE_TEXT = 'Acknowledge';
export const ACKNOWLEDGED_TEXT = 'Acknowledged';

export const ALERT_CRITICAL = 'Critical';
export const ALERT_WARNING = 'Warning';
export const ALERT_INFO = 'Info';

export const NO_SAFETY_ALERTS = 'No safety alerts detected';
export const CRITICAL_ALERTS_BLOCK =
	'Acknowledge all critical alerts before proceeding to document generation';

// ─── Tooltip / Title Attributes ───
export const TOOLTIP_CLOSE = 'Close';
export const TOOLTIP_STOP_RECORDING = 'Stop recording';
export const TOOLTIP_START_RECORDING = 'Start recording';
export const TOOLTIP_DOWNLOAD_PDF = 'Download PDF';
