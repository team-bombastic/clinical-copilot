'use client';

import { useState, useRef, useCallback } from 'react';
import { PRESCRIPTION_TEMPLATES } from './prescription-templates';
import PrescriptionTemplateRenderer, {
  templateRenderers,
  DEFAULT_DOCTOR_INFO,
  type DoctorInfo,
} from './prescription-template-renderer';
import { PDF_FILENAME_PREFIX } from '@/constants/config';
import {
  DOC_GEN_TITLE,
  DOC_GEN_SUBTITLE,
  DOWNLOAD_PDF_TEXT,
  SELECT_TEMPLATE_TEXT,
  TOOLTIP_CLOSE,
  TOOLTIP_DOWNLOAD_PDF,
} from '@/constants/ui-strings';
import styles from './document-generator.module.css';

interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

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
  followUp?: string;
}

interface DocumentGeneratorProps {
  transcription: string;
  segments: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  onClose: () => void;
  onBackToAnalysis?: () => void;
  prescriptionData?: PrescriptionData;
}

const DOCTOR_FIELDS: { key: keyof DoctorInfo; label: string }[] = [
  { key: 'name', label: 'Doctor Name' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'tagline', label: 'Qualifications / Reg. No.' },
  { key: 'clinic', label: 'Clinic / Hospital' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Clinic Address' },
];

export default function DocumentGenerator({
  onClose,
  onBackToAnalysis,
  prescriptionData,
}: DocumentGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({ ...DEFAULT_DOCTOR_INFO });
  const [showDoctorEditor, setShowDoctorEditor] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  const updateDoctorField = useCallback((key: keyof DoctorInfo, value: string) => {
    setDoctorInfo((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const render = templateRenderers[selectedTemplate];
      if (!render) throw new Error('Template not found');

      // Zero-size clip container keeps the element in the DOM (capturable by html2canvas)
      // but completely invisible — no flash behind the modal.
      const clip = document.createElement('div');
      clip.style.position = 'fixed';
      clip.style.left = '0';
      clip.style.top = '0';
      clip.style.width = '0';
      clip.style.height = '0';
      clip.style.overflow = 'hidden';
      clip.style.zIndex = '-1';

      const wrapper = document.createElement('div');
      wrapper.style.width = '794px';
      wrapper.style.background = '#fff';
      wrapper.innerHTML = render(prescriptionData || {}, doctorInfo);

      clip.appendChild(wrapper);
      document.body.appendChild(clip);

      // Capture to canvas — html2canvas reads computed styles from the DOM even inside overflow:hidden
      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, width: 794 });
      document.body.removeChild(clip);

      // Place canvas image onto A4 portrait PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210; // A4 width in mm
      const pageH = 297; // A4 height in mm
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, Math.min(imgH, pageH));
      pdf.save(`${PDF_FILENAME_PREFIX}-${Date.now()}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, prescriptionData, doctorInfo]);

  const previewHtml = selectedTemplate
    ? templateRenderers[selectedTemplate]?.(prescriptionData || {}, doctorInfo) || ''
    : '';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {onBackToAnalysis && !selectedTemplate && (
              <button onClick={onBackToAnalysis} className={styles.backButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Analysis
              </button>
            )}
            <h2 className={styles.title}>{DOC_GEN_TITLE}</h2>
            <p className={styles.subtitle}>{DOC_GEN_SUBTITLE}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton} title={TOOLTIP_CLOSE}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Template Selector */}
        {!selectedTemplate && (
          <div className={styles.templateSection}>
            <p className={styles.sectionLabel}>{SELECT_TEMPLATE_TEXT}</p>
            <div className={styles.templateGrid}>
              {PRESCRIPTION_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={styles.templateCard}
                >
                  <div
                    className={styles.templateThumb}
                    style={{ background: tmpl.thumbnailColor }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(255,255,255,0.85)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div className={styles.templateInfo}>
                    <span className={styles.templateName}>{tmpl.name}</span>
                    <span className={styles.templateDesc}>{tmpl.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Preview + Doctor Editor + Actions */}
        {selectedTemplate && (
          <div className={styles.resultsSection}>
            {/* Doctor Info Editor Toggle */}
            <button
              onClick={() => setShowDoctorEditor((p) => !p)}
              className={styles.editorToggle}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {showDoctorEditor ? 'Hide' : 'Edit'} Doctor / Clinic Details
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: showDoctorEditor ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Doctor Info Form */}
            {showDoctorEditor && (
              <div className={styles.doctorEditor}>
                <div className={styles.doctorGrid}>
                  {DOCTOR_FIELDS.map(({ key, label }) => (
                    <label key={key} className={styles.fieldLabel}>
                      <span className={styles.fieldName}>{label}</span>
                      <input
                        type="text"
                        value={doctorInfo[key]}
                        onChange={(e) => updateDoctorField(key, e.target.value)}
                        className={styles.fieldInput}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Live Preview */}
            <div className={styles.previewContainer}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>

            {/* Hidden render target for PDF */}
            <PrescriptionTemplateRenderer
              ref={templateRef}
              templateId={selectedTemplate}
              prescriptionData={prescriptionData}
              doctorInfo={doctorInfo}
            />

            {/* Actions */}
            <div className={styles.resultActions}>
              <button
                onClick={() => setSelectedTemplate(null)}
                className={styles.regenerateButton}
              >
                ← Choose different template
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className={styles.downloadButton}
                title={TOOLTIP_DOWNLOAD_PDF}
              >
                <span className={styles.buttonContent}>
                  {isGenerating ? (
                    <>
                      <span className={styles.spinnerSmall} />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {DOWNLOAD_PDF_TEXT}
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
