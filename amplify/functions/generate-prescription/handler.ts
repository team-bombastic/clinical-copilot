import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const SERVICE_REGION = 'ap-south-1';
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
const ANTHROPIC_VERSION = 'bedrock-2023-05-31';
const MAX_TOKENS = 8192;
const S3_PRESCRIPTIONS_PREFIX = 'prescriptions';
const ANONYMOUS_USER = 'anonymous';
const TEX_CONTENT_TYPE = 'application/x-tex';

const bedrock = new BedrockRuntimeClient({ region: SERVICE_REGION });
const s3 = new S3Client();

const BUCKET = process.env.STORAGE_BUCKET_NAME!;

const SYSTEM_PROMPT = `You are a medical document LaTeX generator. Your job is to analyze a hospital prescription template image and generate complete, compilable LaTeX code that recreates the hospital's format, layout, branding, and structure. You must insert the provided clinical notes into the correct section of the prescription.

Rules:
1. Generate ONLY valid, complete LaTeX code — nothing else. No explanations, no markdown fences.
2. Start with \\documentclass and end with \\end{document}.
3. Recreate the hospital header/logo area, hospital name, address, and any visible branding as closely as possible using LaTeX formatting.
4. Include proper sections for patient details (leave placeholder fields like \\rule lines for name, age, date, etc.).
5. Insert the clinical notes/prescription into the main body of the document.
6. Use standard LaTeX packages only (geometry, fancyhdr, enumitem, multicol, xcolor, graphicx, etc.).
7. Make the document look professional and match the hospital's style.
8. Use A4 paper size.`;

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
}

interface GeneratePrescriptionResult {
  latexCode: string;
  s3Key: string;
}

const SPEAKER_DOCTOR = 'Doctor';
const SPEAKER_PATIENT = 'Patient';

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

export const handler = async (
  event: GeneratePrescriptionEvent
): Promise<GeneratePrescriptionResult> => {
  const transcription = buildTranscriptionBlock(event);

  const userMessage = `Here is the clinical transcription to insert into the prescription:

---
${transcription}
---

Analyze the attached hospital prescription template image and generate complete LaTeX code that recreates this format with the above clinical notes inserted into the appropriate prescription/notes section.`;

  const bedrockPayload = {
    anthropic_version: ANTHROPIC_VERSION,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: event.templateMediaType,
              data: event.templateBase64,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
  };

  const bedrockResponse = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(bedrockPayload),
    })
  );

  const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
  let latexCode: string = responseBody.content?.[0]?.text || '';

  // Clean up — strip markdown fences if present
  latexCode = latexCode.replace(/^```(?:latex|tex)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  latexCode = latexCode.trim();

  // Save to S3
  const userId = event.userId || ANONYMOUS_USER;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const s3Key = `${S3_PRESCRIPTIONS_PREFIX}/${userId}/${timestamp}.tex`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: latexCode,
      ContentType: TEX_CONTENT_TYPE,
    })
  );

  return {
    latexCode,
    s3Key,
  };
};
