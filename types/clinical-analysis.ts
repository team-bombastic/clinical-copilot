// ─── Medical Entity (extracted from transcript) ───

export interface MedicalEntity {
  type:
    | 'symptom'
    | 'vital'
    | 'diagnosis'
    | 'medication'
    | 'allergy'
    | 'procedure'
    | 'lab_result'
    | 'history';
  value: string;
  confidence: number; // 0–1
  icdCode?: string;
  context?: string; // surrounding transcript text
}

// ─── Medication (extends existing shape with Indian-specific fields) ───

export interface Medication {
  name: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  nlemMatch: boolean; // on National List of Essential Medicines
}

// ─── Safety Alert ───

export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertType =
  | 'drug_interaction'
  | 'dosage_range'
  | 'allergy_conflict'
  | 'contraindication'
  | 'duplicate_therapy';

export interface SafetyAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  involvedEntities: string[];
  acknowledged: boolean;
}

// ─── Vital Signs ───

export interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respiratoryRate?: string;
  spO2?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

// ─── RAG Source Chunk (retrieved from knowledge base) ───

export interface RagSourceChunk {
  text: string;
  sourceUri?: string;
}

// ─── Clinical Analysis Result ───

export interface ClinicalAnalysisResult {
  // Demographics (from existing PrescriptionData)
  patientName?: string;
  age?: string;
  sex?: string;
  date?: string;
  address?: string;

  // Clinical data
  chiefComplaints?: string[];
  diagnosis?: string;
  differentialDiagnosis?: string[];
  medications?: Medication[];
  investigations?: string[];
  instructions?: string[];
  followUp?: string;

  // Extended fields
  extractedEntities: MedicalEntity[];
  vitalSigns?: VitalSigns;
  allergies?: string[];
  medicalHistory?: string[];
  clinicalSummary?: string;
  evidenceNotes?: string[];
  ragSourceChunks?: RagSourceChunk[];

  // Safety
  safetyAlerts: SafetyAlert[];
}

// ─── OPD Note Data (extends PrescriptionData with clinical fields) ───

export interface OpdNoteData extends PrescriptionData {
  vitalSigns?: VitalSigns;
  allergies?: string[];
  medicalHistory?: string[];
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  clinicalSummary?: string;
}

// ─── PrescriptionData (matches existing shape in generate-prescription) ───

export interface PrescriptionData {
  patientName?: string;
  age?: string;
  sex?: string;
  date?: string;
  address?: string;
  chiefComplaints?: string[];
  diagnosis?: string;
  medications?: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  investigations?: string[];
  instructions?: string[];
  followUp?: string;
}

// ─── Consultation Segment (shared across components) ───

export interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

// ─── AI Analysis Lambda Event / Result ───

export interface AiAnalysisEvent {
  transcriptionText?: string;
  consultationSegments?: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  userId?: string;
}

export interface AiAnalysisResult {
  analysis: ClinicalAnalysisResult;
}
