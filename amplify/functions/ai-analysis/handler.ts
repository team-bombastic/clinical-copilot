import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

// Static imports — esbuild bundles these into the output
import drugInteractionsData from './safety-rules/drug-interactions.json';
import dosageRangesData from './safety-rules/dosage-ranges.json';
import contraindicationsData from './safety-rules/contraindications.json';
import allergyDrugMappingData from './safety-rules/allergy-drug-mapping.json';
import brandGenericMappingData from './safety-rules/brand-generic-mapping.json';

// ─── Constants ───

const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const KNOWLEDGE_BASE_REGION = process.env.KNOWLEDGE_BASE_REGION || process.env.AWS_REGION || 'ap-south-1';
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID || '';
const MODEL_ID = 'amazon.nova-pro-v1:0';
const MAX_TOKENS = 4096;

const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION });
const bedrockAgent = new BedrockAgentRuntimeClient({ region: KNOWLEDGE_BASE_REGION });

// ─── Types ───

interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

interface AiAnalysisEvent {
  transcriptionText?: string;
  consultationSegments?: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  userId?: string;
}

interface MedicalEntity {
  type: string;
  value: string;
  confidence: number;
  icdCode?: string;
  context?: string;
}

interface Medication {
  name: string;
  genericName: string;
  brandName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  nlemMatch: boolean;
}

interface SafetyAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  involvedEntities: string[];
  acknowledged: boolean;
}

interface VitalSigns {
  bloodPressure?: string;
  pulse?: string;
  temperature?: string;
  respiratoryRate?: string;
  spO2?: string;
  weight?: string;
  height?: string;
  bmi?: string;
}

interface RagSourceChunk {
  text: string;
  sourceUri?: string;
}

interface ClinicalAnalysisResult {
  patientName?: string;
  age?: string;
  sex?: string;
  date?: string;
  address?: string;
  chiefComplaints?: string[];
  diagnosis?: string;
  differentialDiagnosis?: string[];
  medications?: Medication[];
  investigations?: string[];
  instructions?: string[];
  followUp?: string;
  extractedEntities: MedicalEntity[];
  vitalSigns?: VitalSigns;
  allergies?: string[];
  medicalHistory?: string[];
  clinicalSummary?: string;
  evidenceNotes?: string[];
  ragSourceChunks?: RagSourceChunk[];
  safetyAlerts: SafetyAlert[];
}

// ─── Safety rule types ───

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'critical' | 'warning';
  message: string;
}

interface DosageRange {
  min: number;
  max: number;
  unit: string;
  maxDailyDose: number;
  frequency: string;
  notes: string;
}

interface Contraindication {
  condition: string;
  drug: string;
  severity: 'critical' | 'warning';
  message: string;
}

// ─── Safety rules (statically bundled) ───

const drugInteractions = drugInteractionsData as DrugInteraction[];
const dosageRanges = dosageRangesData as Record<string, DosageRange>;
const contraindications = contraindicationsData as Contraindication[];
const allergyDrugMapping = allergyDrugMappingData as Record<string, string[]>;
const brandGenericMapping = brandGenericMappingData as Record<string, string>;

// ─── Helpers ───

const SPEAKER_DOCTOR = 'Doctor';
const SPEAKER_PATIENT = 'Patient';

function buildTranscriptionBlock(event: AiAnalysisEvent): string {
  if (event.mode === 'consultation' && event.consultationSegments?.length) {
    return event.consultationSegments
      .map((seg) => {
        const label =
          seg.speaker === 'spk_0'
            ? SPEAKER_DOCTOR
            : seg.speaker === 'spk_1'
              ? SPEAKER_PATIENT
              : seg.speaker;
        const text = seg.translatedText || seg.text;
        return `${label}: ${text}`;
      })
      .join('\n');
  }
  return event.transcriptionText || '';
}

/** Resolve a drug name to its generic name using brand-generic mapping */
function resolveGenericName(name: string): string {
  const lower = name.toLowerCase().trim();
  return brandGenericMapping[lower] || lower;
}

// ─── Phase 1: NLP Extraction ───

const EXTRACTION_SYSTEM_PROMPT = `You are a medical NLP system specialized in Indian clinical practice. Given a clinical transcript (doctor-patient conversation or dictation), extract all medical entities and return ONLY valid JSON matching this schema:

{
  "entities": [
    {
      "type": "symptom|vital|diagnosis|medication|allergy|procedure|lab_result|history",
      "value": "string",
      "confidence": 0.0-1.0,
      "context": "surrounding text from transcript"
    }
  ],
  "demographics": {
    "patientName": "string or null",
    "age": "string or null",
    "sex": "string or null",
    "address": "string or null"
  }
}

Rules:
1. Return ONLY valid JSON. No markdown fences, no explanations.
2. Recognize Indian drug brand names (e.g., Dolo=Paracetamol, Crocin=Paracetamol, Augmentin=Amoxicillin+Clavulanate, Azithral=Azithromycin, Pan D=Pantoprazole+Domperidone, Ecosprin=Aspirin, Glycomet=Metformin).
3. Extract dosages, frequencies, and durations when mentioned.
4. For medications, include both the brand name used and infer the generic name.
5. Extract vital signs with units (e.g., "BP 130/80 mmHg", "Temp 99.2°F").
6. Identify allergies explicitly mentioned or strongly implied.
7. Confidence should reflect how explicitly the entity was stated (1.0 for explicit, 0.5-0.8 for inferred).
8. Extract medical history items (diabetes, hypertension, past surgeries, etc.).`;

async function extractMedicalEntities(
  transcription: string
): Promise<{ entities: MedicalEntity[]; demographics: Record<string, string | null> }> {
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: EXTRACTION_SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [
            {
              text: `Extract all medical entities from this clinical transcript:\n\n---\n${transcription}\n---`,
            },
          ],
        },
      ],
      inferenceConfig: { maxTokens: MAX_TOKENS },
    })
  );

  let jsonText = response.output?.message?.content?.[0]?.text || '{}';
  jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  jsonText = jsonText.trim();

  const parsed = JSON.parse(jsonText);
  return {
    entities: parsed.entities || [],
    demographics: parsed.demographics || {},
  };
}

// ─── Phase 2: RAG Structuring ───

const STRUCTURING_SYSTEM_PROMPT = `You are a clinical data structuring system for Indian medical practice. Given extracted medical entities and RAG context from Indian medical references (NLEM, ICMR guidelines, ICD-10), produce a structured clinical analysis.

Return ONLY valid JSON matching this schema:

{
  "chiefComplaints": ["string array"],
  "diagnosis": "primary diagnosis string",
  "differentialDiagnosis": ["string array"],
  "medications": [
    {
      "name": "display name (brand or generic)",
      "genericName": "generic/INN name",
      "brandName": "Indian brand name if mentioned",
      "dosage": "strength with unit",
      "frequency": "dosing frequency",
      "duration": "treatment duration",
      "route": "oral/topical/IV/IM/inhaled/etc",
      "instructions": "special instructions"
    }
  ],
  "investigations": ["string array"],
  "instructions": ["patient instructions array"],
  "followUp": "follow-up plan string",
  "vitalSigns": {
    "bloodPressure": "string or null",
    "pulse": "string or null",
    "temperature": "string or null",
    "respiratoryRate": "string or null",
    "spO2": "string or null",
    "weight": "string or null",
    "height": "string or null",
    "bmi": "string or null"
  },
  "allergies": ["string array"],
  "medicalHistory": ["string array"],
  "clinicalSummary": "2-3 sentence clinical summary",
  "evidenceNotes": ["relevant guideline references from RAG context"]
}

Rules:
1. Return ONLY valid JSON. No markdown fences.
2. Use the RAG context to validate ICD-10 codes and align with ICMR/STG guidelines.
3. For medications, always include the generic name. Include brand name if mentioned in transcript.
4. If a field cannot be determined, use an empty array or null.
5. Use today's date if date is not mentioned.
6. For evidence notes, cite specific guidelines or references from the provided context.
7. Infer diagnosis from clinical discussion if not explicitly stated.`;

async function structureWithRAG(
  transcription: string,
  entities: MedicalEntity[],
  demographics: Record<string, string | null>
): Promise<Partial<ClinicalAnalysisResult>> {
  let ragContext = '';
  const ragSourceChunks: RagSourceChunk[] = [];

  // Query Knowledge Base if configured
  if (KNOWLEDGE_BASE_ID) {
    try {
      const entitySummary = entities
        .filter((e) => ['diagnosis', 'medication', 'symptom'].includes(e.type))
        .map((e) => e.value)
        .join(', ');

      const ragQuery = `Indian clinical guidelines for: ${entitySummary}. Include NLEM status, ICD-10 codes, and ICMR standard treatment guidelines.`;

      const ragResponse = await bedrockAgent.send(
        new RetrieveCommand({
          knowledgeBaseId: KNOWLEDGE_BASE_ID,
          retrievalQuery: { text: ragQuery },
          retrievalConfiguration: {
            vectorSearchConfiguration: {
              numberOfResults: 10,
            },
          },
        })
      );

      // Extract retrieved chunks and build RAG context for the structuring prompt
      if (ragResponse.retrievalResults) {
        for (const result of ragResponse.retrievalResults) {
          const text = result.content?.text;
          if (text) {
            const sourceUri = result.location?.s3Location?.uri || undefined;
            ragSourceChunks.push({ text, sourceUri });
            ragContext += text + '\n\n';
          }
        }
      }
    } catch (err) {
      console.warn('RAG query failed, proceeding without KB context:', err);
    }
  }

  // Structure with Bedrock using entities + RAG context
  const entityBlock = JSON.stringify({ entities, demographics }, null, 2);

  const userMessage = ragContext
    ? `Structure the following extracted medical entities into a clinical analysis.\n\nExtracted Entities:\n${entityBlock}\n\nOriginal Transcript:\n${transcription}\n\nReference Guidelines (from Indian medical knowledge base):\n${ragContext}`
    : `Structure the following extracted medical entities into a clinical analysis.\n\nExtracted Entities:\n${entityBlock}\n\nOriginal Transcript:\n${transcription}`;

  const response = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: STRUCTURING_SYSTEM_PROMPT }],
      messages: [
        {
          role: 'user',
          content: [{ text: userMessage }],
        },
      ],
      inferenceConfig: { maxTokens: MAX_TOKENS },
    })
  );

  let jsonText = response.output?.message?.content?.[0]?.text || '{}';
  jsonText = jsonText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  jsonText = jsonText.trim();

  const structured = JSON.parse(jsonText);

  return {
    patientName: demographics.patientName || undefined,
    age: demographics.age || undefined,
    sex: demographics.sex || undefined,
    date: demographics.date || new Date().toISOString().split('T')[0],
    address: demographics.address || undefined,
    chiefComplaints: structured.chiefComplaints || [],
    diagnosis: structured.diagnosis || undefined,
    differentialDiagnosis: structured.differentialDiagnosis || [],
    medications: (structured.medications || []).map(
      (med: Record<string, string | undefined>) => ({
        name: med.name || med.genericName || '',
        genericName: med.genericName || resolveGenericName(med.name || ''),
        brandName: med.brandName || undefined,
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        route: med.route || 'oral',
        instructions: med.instructions || undefined,
        nlemMatch: false, // Will be set during safety validation
      })
    ),
    investigations: structured.investigations || [],
    instructions: structured.instructions || [],
    followUp: structured.followUp || undefined,
    vitalSigns: structured.vitalSigns || undefined,
    allergies: structured.allergies || [],
    medicalHistory: structured.medicalHistory || [],
    clinicalSummary: structured.clinicalSummary || undefined,
    evidenceNotes: structured.evidenceNotes || [],
    ragSourceChunks: ragSourceChunks.length > 0 ? ragSourceChunks : undefined,
  };
}

// ─── Phase 3: Safety Validation ───

function validateSafety(
  result: Partial<ClinicalAnalysisResult>
): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  let alertId = 0;

  const medications = result.medications || [];
  const allergies = (result.allergies || []).map((a) => a.toLowerCase().trim());
  const history = (result.medicalHistory || []).map((h) => h.toLowerCase().trim());
  const diagnosis = (result.diagnosis || '').toLowerCase();

  // Collect all conditions from history + diagnosis for contraindication checks
  const conditions = [...history];
  if (diagnosis) conditions.push(diagnosis);

  // Resolve all medication generic names
  const resolvedMeds = medications.map((med) => ({
    ...med,
    resolvedGeneric: resolveGenericName(med.genericName || med.name),
  }));

  // --- Drug-Drug Interactions ---
  for (let i = 0; i < resolvedMeds.length; i++) {
    for (let j = i + 1; j < resolvedMeds.length; j++) {
      const med1Generic = resolvedMeds[i].resolvedGeneric;
      const med2Generic = resolvedMeds[j].resolvedGeneric;

      // Check both combinations including multi-component drugs
      const med1Components = med1Generic.split('+').map((s) => s.trim());
      const med2Components = med2Generic.split('+').map((s) => s.trim());

      for (const interaction of drugInteractions) {
        const d1 = interaction.drug1.toLowerCase();
        const d2 = interaction.drug2.toLowerCase();

        const match1has = med1Components.some((c) => c === d1) || med1Generic === d1;
        const match2has = med2Components.some((c) => c === d2) || med2Generic === d2;
        const match1hasRev = med1Components.some((c) => c === d2) || med1Generic === d2;
        const match2hasRev = med2Components.some((c) => c === d1) || med2Generic === d1;

        if ((match1has && match2has) || (match1hasRev && match2hasRev)) {
          alerts.push({
            id: `safety-${++alertId}`,
            severity: interaction.severity,
            type: 'drug_interaction',
            message: interaction.message,
            involvedEntities: [
              resolvedMeds[i].name || resolvedMeds[i].genericName,
              resolvedMeds[j].name || resolvedMeds[j].genericName,
            ],
            acknowledged: false,
          });
        }
      }
    }
  }

  // --- Dosage Range Checks ---
  for (const med of resolvedMeds) {
    const generic = med.resolvedGeneric;
    const range = dosageRanges[generic];
    if (!range || !med.dosage) continue;

    const dosageMatch = med.dosage.match(/([\d.]+)\s*(mg|mcg|g|ml|iu)/i);
    if (!dosageMatch) continue;

    let doseValue = parseFloat(dosageMatch[1]);
    const doseUnit = dosageMatch[2].toLowerCase();

    // Normalize to the range's unit
    if (range.unit === 'mg' && doseUnit === 'g') doseValue *= 1000;
    if (range.unit === 'mg' && doseUnit === 'mcg') doseValue /= 1000;
    if (range.unit === 'mcg' && doseUnit === 'mg') doseValue *= 1000;

    if (doseValue > range.max) {
      alerts.push({
        id: `safety-${++alertId}`,
        severity: doseValue > range.max * 2 ? 'critical' : 'warning',
        type: 'dosage_range',
        message: `${med.name || med.genericName}: Dose ${med.dosage} exceeds recommended maximum of ${range.max}${range.unit} per dose. ${range.notes}`,
        involvedEntities: [med.name || med.genericName],
        acknowledged: false,
      });
    } else if (doseValue < range.min) {
      alerts.push({
        id: `safety-${++alertId}`,
        severity: 'info',
        type: 'dosage_range',
        message: `${med.name || med.genericName}: Dose ${med.dosage} is below typical minimum of ${range.min}${range.unit}. Verify if subtherapeutic dose is intended.`,
        involvedEntities: [med.name || med.genericName],
        acknowledged: false,
      });
    }
  }

  // --- Allergy-Drug Conflicts ---
  for (const allergy of allergies) {
    // Check direct drug allergy
    for (const med of resolvedMeds) {
      const generic = med.resolvedGeneric;
      const genericComponents = generic.split('+').map((s) => s.trim());

      if (generic === allergy || genericComponents.includes(allergy)) {
        alerts.push({
          id: `safety-${++alertId}`,
          severity: 'critical',
          type: 'allergy_conflict',
          message: `Patient has documented allergy to "${allergy}". ${med.name || med.genericName} contains this drug.`,
          involvedEntities: [med.name || med.genericName, allergy],
          acknowledged: false,
        });
      }
    }

    // Check allergy class mapping
    const drugClass = allergyDrugMapping[allergy];
    if (drugClass) {
      for (const med of resolvedMeds) {
        const generic = med.resolvedGeneric;
        const genericComponents = generic.split('+').map((s) => s.trim());

        for (const classDrug of drugClass) {
          if (generic === classDrug || genericComponents.includes(classDrug)) {
            alerts.push({
              id: `safety-${++alertId}`,
              severity: 'critical',
              type: 'allergy_conflict',
              message: `Patient has "${allergy}" allergy. ${med.name || med.genericName} (${classDrug}) belongs to this drug class and may cause cross-reactivity.`,
              involvedEntities: [med.name || med.genericName, allergy],
              acknowledged: false,
            });
          }
        }
      }
    }
  }

  // --- Contraindication Checks ---
  for (const ci of contraindications) {
    const ciCondition = ci.condition.toLowerCase();

    // Check if any patient condition matches
    const conditionMatch = conditions.some(
      (c) => c.includes(ciCondition) || ciCondition.includes(c)
    );

    if (!conditionMatch) continue;

    for (const med of resolvedMeds) {
      const generic = med.resolvedGeneric;
      const genericComponents = generic.split('+').map((s) => s.trim());
      const ciDrug = ci.drug.toLowerCase();

      if (generic === ciDrug || genericComponents.includes(ciDrug)) {
        alerts.push({
          id: `safety-${++alertId}`,
          severity: ci.severity,
          type: 'contraindication',
          message: ci.message,
          involvedEntities: [med.name || med.genericName, ci.condition],
          acknowledged: false,
        });
      }
    }
  }

  // --- Duplicate Therapy Check ---
  const genericGroups = new Map<string, string[]>();
  for (const med of resolvedMeds) {
    const generic = med.resolvedGeneric;
    if (!genericGroups.has(generic)) {
      genericGroups.set(generic, []);
    }
    genericGroups.get(generic)!.push(med.name || med.genericName);
  }

  for (const [generic, names] of genericGroups) {
    if (names.length > 1) {
      alerts.push({
        id: `safety-${++alertId}`,
        severity: 'warning',
        type: 'duplicate_therapy',
        message: `Duplicate therapy detected: ${names.join(' and ')} both contain ${generic}.`,
        involvedEntities: names,
        acknowledged: false,
      });
    }
  }

  return alerts;
}

// ─── Handler ───

export const handler = async (
  event: AiAnalysisEvent
): Promise<{ analysis: ClinicalAnalysisResult }> => {
  const transcription = buildTranscriptionBlock(event);

  if (!transcription) {
    throw new Error('No transcription text provided');
  }

  // Phase 1: Extract medical entities
  const { entities, demographics } = await extractMedicalEntities(transcription);

  // Phase 2: Structure with RAG
  const structured = await structureWithRAG(transcription, entities, demographics);

  // Phase 3: Safety validation
  const safetyAlerts = validateSafety(structured);

  // Assemble final result
  const analysis: ClinicalAnalysisResult = {
    ...structured,
    extractedEntities: entities,
    safetyAlerts,
  } as ClinicalAnalysisResult;

  return { analysis };
};
