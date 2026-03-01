import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { TextractClient, AnalyzeDocumentCommand, Block } from '@aws-sdk/client-textract';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

const SERVICE_REGION = 'us-east-1';
const MODEL_ID = 'amazon.nova-pro-v1:0';
const MAX_TOKENS = 4096;
const S3_PRESCRIPTIONS_PREFIX = 'prescriptions';
const ANONYMOUS_USER = 'anonymous';
const PDF_CONTENT_TYPE = 'application/pdf';

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const FIELD_PADDING = 1;

const bedrock = new BedrockRuntimeClient({ region: SERVICE_REGION });
const textract = new TextractClient({ region: SERVICE_REGION });
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

interface TextractField {
  key: string;
  valueBBox: BBox;
}

interface BBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TableCell {
  rowIndex: number;
  columnIndex: number;
  text: string;
  bbox: BBox;
}

interface ImagePlacement {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

const SPEAKER_DOCTOR = 'Doctor';
const SPEAKER_PATIENT = 'Patient';

// ─── Bedrock system prompt for JSON extraction ───

const SYSTEM_PROMPT = `You are a medical transcript parser. Given a clinical transcript (doctor-patient conversation or dictation), extract structured prescription data and return ONLY valid JSON matching this exact schema:

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

/** Fuzzy match a Textract key against PrescriptionData field names */
function matchFieldName(textractKey: string): keyof PrescriptionData | null {
  const normalized = textractKey.toLowerCase().replace(/[^a-z]/g, '');

  const mappings: Array<{ patterns: string[]; field: keyof PrescriptionData }> = [
    { patterns: ['patientname', 'patientsname', 'patname'], field: 'patientName' },
    { patterns: ['age', 'ageyrs', 'ageyears'], field: 'age' },
    { patterns: ['sex', 'gender'], field: 'sex' },
    { patterns: ['date', 'dateofvisit', 'visitdate'], field: 'date' },
    { patterns: ['address', 'addr', 'patientaddress'], field: 'address' },
    {
      patterns: ['chiefcomplaints', 'chiefcomplaint', 'complaints', 'presentingcomplaints'],
      field: 'chiefComplaints',
    },
    { patterns: ['diagnosis', 'provisionaldiagnosis', 'finaldiagnosis'], field: 'diagnosis' },
    { patterns: ['followup', 'followupdate', 'nextvisit', 'reviewon'], field: 'followUp' },
  ];

  for (const { patterns, field } of mappings) {
    if (patterns.some((p) => normalized.includes(p))) {
      return field;
    }
  }

  return null;
}

/** Compute font size that fits within a bounding box height */
function fitFontSize(boxHeightPts: number, maxSize: number = 16, minSize: number = 8): number {
  const available = boxHeightPts - FIELD_PADDING * 2;
  // Use most of the available height — PDF font size ≈ cap height,
  // which is roughly 70% of the em square, so divide by 0.7 to fill the box
  const fitted = Math.floor(available * 0.72);
  return Math.max(minSize, Math.min(fitted, maxSize));
}

/**
 * Compute font size that fits text within a given width.
 * Shrinks from maxSize down to minSize until the text fits on one line.
 * Returns the chosen size and how many wrapped lines the text would occupy.
 */
function fitFontSizeToWidth(
  text: string,
  font: PDFFont,
  maxWidthPts: number,
  maxSize: number = 12,
  minSize: number = 7
): { fontSize: number; lineCount: number } {
  for (let size = maxSize; size >= minSize; size -= 0.5) {
    const textWidth = font.widthOfTextAtSize(text, size);
    if (textWidth <= maxWidthPts) {
      return { fontSize: size, lineCount: 1 };
    }
  }
  // At minSize the text still doesn't fit — calculate wrapped line count
  const textWidth = font.widthOfTextAtSize(text, minSize);
  const lineCount = Math.ceil(textWidth / maxWidthPts);
  return { fontSize: minSize, lineCount };
}

/**
 * Convert Textract image-relative coords (0-1, top-left origin) to
 * PDF page coords (bottom-left origin), accounting for cover-crop placement.
 */
function imageToPage(
  imgLeft: number,
  imgTop: number,
  placement: ImagePlacement
): { x: number; y: number } {
  const x = placement.drawX + imgLeft * placement.drawWidth;
  // PDF Y is bottom-up: the top of the drawn image is at drawY + drawHeight
  const y = placement.drawY + placement.drawHeight - imgTop * placement.drawHeight;
  return { x, y };
}

function bboxHeightPts(bbox: BBox, placement: ImagePlacement): number {
  return bbox.height * placement.drawHeight;
}

function bboxWidthPts(bbox: BBox, placement: ImagePlacement): number {
  return bbox.width * placement.drawWidth;
}

// ─── Step A: Textract ───

interface TextractResult {
  fields: TextractField[];
  tables: TableCell[][];
}

function getBlockText(block: Block, blockMap: Map<string, Block>): string {
  const parts: string[] = [];
  for (const rel of block.Relationships || []) {
    if (rel.Type === 'CHILD') {
      for (const childId of rel.Ids || []) {
        const child = blockMap.get(childId);
        if (child?.BlockType === 'WORD' && child.Text) {
          parts.push(child.Text);
        }
      }
    }
  }
  return parts.join(' ');
}

async function extractFieldsAndTables(imageBytes: Buffer): Promise<TextractResult> {
  const response = await textract.send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: imageBytes },
      FeatureTypes: ['FORMS', 'TABLES'],
    })
  );

  const blocks = response.Blocks || [];
  const blockMap = new Map<string, Block>();
  for (const block of blocks) {
    if (block.Id) blockMap.set(block.Id, block);
  }

  // Extract KEY_VALUE_SET fields
  const fields: TextractField[] = [];
  for (const block of blocks) {
    if (block.BlockType !== 'KEY_VALUE_SET' || !block.EntityTypes?.includes('KEY')) continue;

    const keyText = getBlockText(block, blockMap);
    if (!keyText) continue;

    for (const rel of block.Relationships || []) {
      if (rel.Type === 'VALUE') {
        for (const valueId of rel.Ids || []) {
          const valueBlock = blockMap.get(valueId);
          if (valueBlock?.Geometry?.BoundingBox) {
            const bb = valueBlock.Geometry.BoundingBox;
            fields.push({
              key: keyText,
              valueBBox: {
                top: bb.Top ?? 0,
                left: bb.Left ?? 0,
                width: bb.Width ?? 0,
                height: bb.Height ?? 0,
              },
            });
          }
        }
      }
    }
  }

  // Extract TABLE structures
  const tables: TableCell[][] = [];
  for (const block of blocks) {
    if (block.BlockType !== 'TABLE') continue;

    const cells: TableCell[] = [];
    for (const rel of block.Relationships || []) {
      if (rel.Type === 'CHILD') {
        for (const cellId of rel.Ids || []) {
          const cellBlock = blockMap.get(cellId);
          if (cellBlock?.BlockType === 'CELL' && cellBlock.Geometry?.BoundingBox) {
            const bb = cellBlock.Geometry.BoundingBox;
            const cellText = getBlockText(cellBlock, blockMap);
            cells.push({
              rowIndex: cellBlock.RowIndex ?? 0,
              columnIndex: cellBlock.ColumnIndex ?? 0,
              text: cellText,
              bbox: {
                top: bb.Top ?? 0,
                left: bb.Left ?? 0,
                width: bb.Width ?? 0,
                height: bb.Height ?? 0,
              },
            });
          }
        }
      }
    }
    if (cells.length > 0) tables.push(cells);
  }

  return { fields, tables };
}

// ─── Step B: Bedrock JSON extraction ───

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
              text: `Extract structured prescription data from this clinical transcript:\n\n---\n${transcription}\n---`,
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

// ─── Step C: PDF generation ───

/** Find the medication table by checking header row text */
function findMedicationTable(tables: TableCell[][]): TableCell[] | null {
  const medKeywords = ['drug', 'medicine', 'medication', 'formulation', 'dosage', 'frequency', 'duration', 'rx', 's.no', 'sr'];

  for (const table of tables) {
    // Check header row (row 1) for medication-related keywords
    const headerCells = table.filter((c) => c.rowIndex === 1);
    const headerText = headerCells.map((c) => c.text.toLowerCase()).join(' ');
    if (medKeywords.some((kw) => headerText.includes(kw))) {
      return table;
    }
  }
  return null;
}

/** Map medication table columns by header text */
interface ColumnMapping {
  serialCol: number;
  nameCol: number;
  dosageCol: number;
  durationCol: number;
  instructionsCol: number;
}

function mapTableColumns(headerCells: TableCell[]): ColumnMapping {
  const mapping: ColumnMapping = {
    serialCol: 1,
    nameCol: 2,
    dosageCol: 3,
    durationCol: 4,
    instructionsCol: 5,
  };

  for (const cell of headerCells) {
    const text = cell.text.toLowerCase();
    if (text.includes('s.no') || text.includes('sr') || text.includes('sl')) {
      mapping.serialCol = cell.columnIndex;
    } else if (text.includes('drug') || text.includes('medicine') || text.includes('name') || text.includes('formulation')) {
      mapping.nameCol = cell.columnIndex;
    } else if (text.includes('dosage') || text.includes('frequency') || text.includes('dose')) {
      mapping.dosageCol = cell.columnIndex;
    } else if (text.includes('duration')) {
      mapping.durationCol = cell.columnIndex;
    } else if (text.includes('remark') || text.includes('instruction') || text.includes('note')) {
      mapping.instructionsCol = cell.columnIndex;
    }
  }

  return mapping;
}

function drawTextInBox(
  page: PDFPage,
  text: string,
  bbox: BBox,
  placement: ImagePlacement,
  font: PDFFont,
  options?: { maxFontSize?: number; color?: ReturnType<typeof rgb> }
) {
  if (!text) return;

  const heightPts = bboxHeightPts(bbox, placement);
  const widthPts = bboxWidthPts(bbox, placement);
  const fontSize = fitFontSize(heightPts, options?.maxFontSize ?? 16);

  // Position: left edge of box, vertically centered
  const { x, y: boxTopY } = imageToPage(bbox.left, bbox.top, placement);
  const boxBottomY = boxTopY - heightPts;
  // Center text vertically within the box
  const textY = boxBottomY + (heightPts - fontSize) / 2 + FIELD_PADDING;

  page.drawText(text, {
    x: x + FIELD_PADDING,
    y: textY,
    size: fontSize,
    font,
    color: options?.color ?? rgb(0, 0, 0),
    maxWidth: widthPts - FIELD_PADDING * 2,
  });
}

async function generatePdf(
  imageBytes: Buffer,
  mediaType: string,
  textractResult: TextractResult,
  data: PrescriptionData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed template image as background (cover-crop, preserving aspect ratio)
  const image = mediaType.includes('png')
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);

  const imgAspect = image.width / image.height;
  const pageAspect = A4_WIDTH / A4_HEIGHT;

  let placement: ImagePlacement;

  if (imgAspect > pageAspect) {
    // Image is wider — match height, crop sides
    const drawHeight = A4_HEIGHT;
    const drawWidth = A4_HEIGHT * imgAspect;
    placement = {
      drawX: (A4_WIDTH - drawWidth) / 2,
      drawY: 0,
      drawWidth,
      drawHeight,
    };
  } else {
    // Image is taller — match width, crop bottom
    const drawWidth = A4_WIDTH;
    const drawHeight = A4_WIDTH / imgAspect;
    placement = {
      drawX: 0,
      drawY: A4_HEIGHT - drawHeight, // align top
      drawWidth,
      drawHeight,
    };
  }

  page.drawImage(image, {
    x: placement.drawX,
    y: placement.drawY,
    width: placement.drawWidth,
    height: placement.drawHeight,
  });

  const { fields, tables } = textractResult;

  // ── Fill form fields ──
  const usedFields = new Set<keyof PrescriptionData>();

  for (const field of fields) {
    const matchedField = matchFieldName(field.key);
    if (!matchedField || usedFields.has(matchedField)) continue;
    usedFields.add(matchedField);

    const value = data[matchedField];
    if (!value) continue;

    if (typeof value === 'string') {
      drawTextInBox(page, value, field.valueBBox, placement, font);
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
      drawTextInBox(page, (value as string[]).join(', '), field.valueBBox, placement, font);
    }
  }

  // ── Determine the Rx body area ──
  // The body starts below the lowest form field / "Rx" marker and ends
  // before the footer region (signature line, contact bar, etc.).

  const RX_BODY_LEFT = 0.06;
  const RX_BODY_RIGHT_MARGIN = 0.06;
  const RX_BODY_BOTTOM_LIMIT = 0.80; // stop before signature / footer
  const BODY_FONT_SIZE = 10;
  const BODY_FONT_MIN = 7;
  const HEADER_FONT_SIZE = 11;
  const LINE_HEIGHT_RATIO = 0.020; // ~2% of image height per text line
  const SECTION_GAP = 0.014; // gap between sections

  let contentCursor = 0;

  // Find the lowest form field value box
  for (const f of fields) {
    const bottom = f.valueBBox.top + f.valueBBox.height;
    if (bottom > contentCursor) contentCursor = bottom;
  }

  // Ensure content starts below form fields area
  contentCursor = Math.max(contentCursor, 0.28);
  contentCursor += 0.015;

  const bodyWidth = A4_WIDTH * (1 - RX_BODY_LEFT - RX_BODY_RIGHT_MARGIN);

  // Helper: draw a single line of text and advance cursor
  const drawLine = (
    text: string,
    useFont: PDFFont,
    maxSize: number = BODY_FONT_SIZE,
    minSize: number = BODY_FONT_MIN,
    leftOffset: number = 0
  ) => {
    if (!text || contentCursor > RX_BODY_BOTTOM_LIMIT) return;
    const lineWidth = bodyWidth - leftOffset * placement.drawWidth;
    const { fontSize, lineCount } = fitFontSizeToWidth(text, useFont, lineWidth, maxSize, minSize);
    const { x, y } = imageToPage(RX_BODY_LEFT + leftOffset, contentCursor, placement);
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font: useFont,
      color: rgb(0, 0, 0),
      maxWidth: lineWidth,
    });
    contentCursor += LINE_HEIGHT_RATIO * lineCount;
  };

  // Helper: draw a section with a bold header then bulleted items below
  const drawBulletSection = (header: string, items: string[]) => {
    if (!items.length || contentCursor > RX_BODY_BOTTOM_LIMIT) return;
    drawLine(`${header}:`, fontBold, HEADER_FONT_SIZE, BODY_FONT_MIN);
    for (const item of items) {
      if (contentCursor > RX_BODY_BOTTOM_LIMIT) break;
      drawLine(`- ${item}`, font);
    }
    contentCursor += SECTION_GAP;
  };

  // ── Medications ──
  if (data.medications?.length) {
    const medTable = findMedicationTable(tables);

    if (medTable) {
      // Fill Textract-detected medication table
      const headerCells = medTable.filter((c) => c.rowIndex === 1);
      const colMap = mapTableColumns(headerCells);
      const maxRow = Math.max(...medTable.map((c) => c.rowIndex));
      const dataStartRow = 2;
      const lastFilledRow = Math.min(dataStartRow + data.medications.length - 1, maxRow);

      for (let i = 0; i < data.medications.length; i++) {
        const med = data.medications[i];
        const targetRow = dataStartRow + i;
        if (targetRow > maxRow) break;

        const rowCells = medTable.filter((c) => c.rowIndex === targetRow);
        const cellByCol = new Map<number, TableCell>();
        for (const cell of rowCells) cellByCol.set(cell.columnIndex, cell);

        const serialCell = cellByCol.get(colMap.serialCol);
        if (serialCell) drawTextInBox(page, `${i + 1}.`, serialCell.bbox, placement, font);

        const nameCell = cellByCol.get(colMap.nameCol);
        if (nameCell) drawTextInBox(page, `${med.name} ${med.dosage}`, nameCell.bbox, placement, font);

        const dosageCell = cellByCol.get(colMap.dosageCol);
        if (dosageCell) drawTextInBox(page, med.frequency, dosageCell.bbox, placement, font);

        const durationCell = cellByCol.get(colMap.durationCol);
        if (durationCell) drawTextInBox(page, med.duration, durationCell.bbox, placement, font);

        const instrCell = cellByCol.get(colMap.instructionsCol);
        if (instrCell && med.instructions) drawTextInBox(page, med.instructions, instrCell.bbox, placement, font);
      }

      // Update cursor to bottom of the last filled table row
      const lastRowCells = medTable.filter((c) => c.rowIndex === lastFilledRow);
      for (const cell of lastRowCells) {
        const bottom = cell.bbox.top + cell.bbox.height;
        if (bottom > contentCursor) contentCursor = bottom;
      }
      contentCursor += SECTION_GAP;
    } else {
      // No table — draw medications as numbered list in the Rx body
      drawLine('Medications:', fontBold, HEADER_FONT_SIZE, BODY_FONT_MIN);
      for (let i = 0; i < data.medications.length; i++) {
        if (contentCursor > RX_BODY_BOTTOM_LIMIT) break;
        const med = data.medications[i];
        const line = `${i + 1}. ${med.name} - ${med.dosage} ${med.duration}.`;
        drawLine(line, font);
      }
      contentCursor += SECTION_GAP;
    }
  }

  // ── Advice / Instructions ──
  if (!usedFields.has('instructions') && data.instructions?.length) {
    drawBulletSection('Advice', data.instructions);
  }

  // ── Investigations ──
  if (!usedFields.has('investigations') && data.investigations?.length) {
    drawBulletSection('Investigations', data.investigations);
  }

  // ── Review / Follow-up ──
  const followUpItems = Array.isArray(data.followUp)
    ? data.followUp
    : data.followUp
      ? [data.followUp]
      : [];
  if (!usedFields.has('followUp') && followUpItems.length) {
    drawBulletSection('Review', followUpItems);
  }

  return await pdfDoc.save();
}

// ─── Handler ───

export const handler = async (
  event: GeneratePrescriptionEvent
): Promise<GeneratePrescriptionResult> => {
  const imageBytes = Buffer.from(event.templateBase64, 'base64');
  const transcription = buildTranscriptionBlock(event);

  // Step A: Extract field positions and table structure with Textract
  const textractResult = await extractFieldsAndTables(imageBytes);

  // Step B: Extract structured data with Bedrock (skip if pre-processed data provided)
  const prescriptionData = event.preProcessedData || await extractPrescriptionData(transcription);

  // Step C: Generate PDF with pdf-lib
  const pdfBytes = await generatePdf(imageBytes, event.templateMediaType, textractResult, prescriptionData);

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
