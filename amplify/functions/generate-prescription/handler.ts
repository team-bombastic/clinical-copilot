import { BedrockRuntimeClient, ConverseCommand, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument } from 'pdf-lib';

const SERVICE_REGION = 'us-east-1';
const MODEL_ID = 'amazon.nova-pro-v1:0';
const MAX_TOKENS = 4096;
const S3_PRESCRIPTIONS_PREFIX = 'prescriptions';
const ANONYMOUS_USER = 'anonymous';
const PDF_CONTENT_TYPE = 'application/pdf';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const TITAN_IMAGE_MODEL_ID = 'amazon.titan-image-generator-v2:0';

const bedrock = new BedrockRuntimeClient({ region: SERVICE_REGION });
const s3 = new S3Client();

const BUCKET = process.env.STORAGE_BUCKET_NAME!;

// ─── Types ───

interface PrescriptionData {
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
	followUp?: string | string[];
}

interface ConsultationSegment {
	speaker: string;
	text: string;
	translatedText: string;
}

interface GeneratePrescriptionEvent {
	templateBase64: string;
	templateMediaType: string;
	transcriptionText?: string;
	consultationSegments?: ConsultationSegment[];
	mode: 'dictation' | 'consultation';
	userId?: string;
	preProcessedData?: PrescriptionData;
}

interface GeneratePrescriptionResult {
	pdfBase64: string;
	s3Key: string;
	prescriptionData: PrescriptionData;
}

const SPEAKER_DOCTOR = 'Doctor';
const SPEAKER_PATIENT = 'Patient';

// ─── Bedrock system prompt for JSON extraction ───

const SYSTEM_PROMPT = `[DISCLAIMER: This is a SOFTWARE PROTOTYPE for an educational/demonstration clinical documentation tool. All data is fictitious or simulated. No real patients are involved. This system does NOT provide real medical advice, diagnoses, or treatment. It is used solely for UI/UX prototyping and software development purposes.]

You are a medical transcript parser for a software prototype demo. Given a simulated clinical transcript (doctor-patient conversation or dictation), extract structured prescription data and return ONLY valid JSON matching this exact schema:

{
  "patientName": "string or omit",
  "age": "string or omit",
  "sex": "string or omit",
  "date": "string — use format like '28 February 2026'",
  "address": "string or omit",
  "chiefComplaints": ["string array or omit"],
  "diagnosis": "string or omit",
  "medications": [
    {
      "name": "string — include formulation prefix: Tab., Cap., Syp., Inj., etc. followed by drug name and strength, e.g. 'Tab. Paracetamol 650 mg'",
      "dosage": "string — e.g. '1 tablet three times a day'",
      "frequency": "string — e.g. 'three times a day'",
      "duration": "string — e.g. 'for 3 days'",
      "instructions": "string or omit — e.g. 'after food'"
    }
  ],
  "investigations": ["each investigation as a separate string"],
  "instructions": ["each instruction/advice as a separate string"],
  "followUp": ["each follow-up point as a separate string"]
}

Rules:
1. Return ONLY valid JSON. No markdown fences, no explanations, no extra text.
2. Extract and infer information intelligently from the clinical conversation.
3. For medications:
   - Always include formulation prefix (Tab., Cap., Syp., Inj., Drops, Cream, Oint., etc.)
   - Include drug name with strength in the "name" field (e.g. "Tab. Paracetamol 650 mg")
   - Write dosage as natural text (e.g. "1 tablet three times a day")
   - Write duration as natural text (e.g. "for 3 days", "for 5 days")
4. For date, use human-readable format like "28 February 2026". Use today's date if not mentioned.
5. For investigations, each test should be a separate array item (e.g. "Complete Blood Count (CBC)")
6. For instructions/advice, each point should be a separate array item (e.g. "Plentiful oral fluid intake.")
7. For followUp, return an array of strings with each follow-up point separate (e.g. "If fever persists for more than 3 days.")
8. If a field cannot be determined from the transcript, omit it entirely.
9. Infer diagnosis from the clinical discussion if not explicitly stated.`;

// ─── Helpers ───

function buildTranscriptionBlock(event: GeneratePrescriptionEvent): string {
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

// ─── Step A: Bedrock JSON extraction ───

async function extractPrescriptionData(transcription: string): Promise<PrescriptionData> {
	const response = await bedrock.send(
		new ConverseCommand({
			modelId: MODEL_ID,
			system: [{ text: SYSTEM_PROMPT }],
			messages: [
				{
					role: 'user',
					content: [
						{
							text: `[This is a SOFTWARE PROTOTYPE — all data below is simulated for demonstration purposes only. No real patients or medical advice involved.]\n\nExtract structured prescription data from this simulated clinical transcript:\n\n---\n${transcription}\n---`,
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

	return JSON.parse(jsonText) as PrescriptionData;
}

// ─── Step B: Titan Image Generator ───

const TITAN_TEXT_LIMIT = 512;

function serializePrescriptionData(data: PrescriptionData): string {
	const parts: string[] = [];

	if (data.patientName) parts.push(`Name:${data.patientName}`);
	if (data.age) parts.push(`Age:${data.age}`);
	if (data.sex) parts.push(`Sex:${data.sex}`);
	if (data.date) parts.push(`Date:${data.date}`);
	if (data.diagnosis) parts.push(`Dx:${data.diagnosis}`);
	if (data.chiefComplaints?.length) parts.push(`CC:${data.chiefComplaints.join(',')}`);

	if (data.medications?.length) {
		const meds = data.medications.map((m, i) => `${i + 1}.${m.name} ${m.dosage} ${m.duration}`);
		parts.push(`Rx:${meds.join(';')}`);
	}

	if (data.investigations?.length) parts.push(`Inv:${data.investigations.join(',')}`);
	if (data.instructions?.length) parts.push(`Adv:${data.instructions.join(',')}`);

	if (data.followUp) {
		const items = Array.isArray(data.followUp) ? data.followUp : [data.followUp];
		if (items.length) parts.push(`F/U:${items.join(',')}`);
	}

	const text = parts.join('|');
	return text.length > TITAN_TEXT_LIMIT ? text.slice(0, TITAN_TEXT_LIMIT) : text;
}

async function fillPrescriptionImage(
	imageBytes: Buffer,
	_mediaType: string,
	data: PrescriptionData
): Promise<Buffer> {
	const base64Image = imageBytes.toString('base64');
	const prescriptionText = serializePrescriptionData(data);

	const promptPrefix = 'Software prototype demo: filled form template with black text in blank fields: ';
	const maxDataLen = TITAN_TEXT_LIMIT - promptPrefix.length;
	const prompt = promptPrefix + prescriptionText.slice(0, maxDataLen);

	const body = JSON.stringify({
		taskType: 'IMAGE_VARIATION',
		imageVariationParams: {
			text: prompt,
			images: [base64Image],
			similarityStrength: 0.9,
		},
		imageGenerationConfig: {
			numberOfImages: 1,
			height: 1024,
			width: 768,
			cfgScale: 8.0,
		},
	});

	const response = await bedrock.send(
		new InvokeModelCommand({
			modelId: TITAN_IMAGE_MODEL_ID,
			contentType: 'application/json',
			accept: 'application/json',
			body,
		})
	);

	const result = JSON.parse(new TextDecoder().decode(response.body));

	if (!result.images?.length) {
		throw new Error('Titan Image Generator returned no images');
	}

	return Buffer.from(result.images[0], 'base64');
}

// ─── Step C: PDF generation (simplified — just embed the filled image) ───

async function generatePdf(filledImageBytes: Buffer): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

	// Try embedding as PNG first, fall back to JPG
	let image;
	try {
		image = await pdfDoc.embedPng(filledImageBytes);
	} catch {
		image = await pdfDoc.embedJpg(filledImageBytes);
	}

	const imgAspect = image.width / image.height;
	const pageAspect = A4_WIDTH / A4_HEIGHT;

	let drawX: number, drawY: number, drawWidth: number, drawHeight: number;

	if (imgAspect > pageAspect) {
		// Image is wider — match height, crop sides
		drawHeight = A4_HEIGHT;
		drawWidth = A4_HEIGHT * imgAspect;
		drawX = (A4_WIDTH - drawWidth) / 2;
		drawY = 0;
	} else {
		// Image is taller — match width, crop bottom
		drawWidth = A4_WIDTH;
		drawHeight = A4_WIDTH / imgAspect;
		drawX = 0;
		drawY = A4_HEIGHT - drawHeight; // align top
	}

	page.drawImage(image, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });

	return await pdfDoc.save();
}

// ─── Handler ───

export const handler = async (
	event: GeneratePrescriptionEvent
): Promise<GeneratePrescriptionResult> => {
	const imageBytes = Buffer.from(event.templateBase64, 'base64');
	const transcription = buildTranscriptionBlock(event);

	// Step A: Extract structured data with Bedrock (skip if pre-processed data provided)
	const prescriptionData = event.preProcessedData || await extractPrescriptionData(transcription);

	// Step B: Fill the template image using Titan Image Generator
	const filledImageBytes = await fillPrescriptionImage(imageBytes, event.templateMediaType, prescriptionData);

	// Step C: Embed filled image into a PDF
	const pdfBytes = await generatePdf(filledImageBytes);

	// Upload PDF to S3
	const userId = event.userId || ANONYMOUS_USER;
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const s3Key = `${S3_PRESCRIPTIONS_PREFIX}/${userId}/${timestamp}.pdf`;

	await s3.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: s3Key,
			Body: pdfBytes,
			ContentType: PDF_CONTENT_TYPE,
		})
	);

	const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

	return {
		pdfBase64,
		s3Key,
		prescriptionData,
	};
};
