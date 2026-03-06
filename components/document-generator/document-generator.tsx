'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { PRESCRIPTION_TEMPLATES } from './prescription-templates';
import { OPD_TEMPLATES } from './opd-templates';
import PrescriptionTemplateRenderer, {
  templateRenderers,
  DEFAULT_DOCTOR_INFO,
  type DoctorInfo,
} from './prescription-template-renderer';
import OpdTemplateRenderer, { opdTemplateRenderers } from './opd-template-renderer';
import { PDF_FILENAME_PREFIX, OPD_PDF_FILENAME_PREFIX } from '@/constants/config';
import type { OpdNoteData, VitalSigns } from '@/types/clinical-analysis';
import { useTranslations } from 'next-intl';
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

type DocumentType = 'prescription' | 'opd';

interface DocumentGeneratorProps {
  transcription: string;
  segments: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  onClose: () => void;
  onBackToAnalysis?: () => void;
  prescriptionData?: PrescriptionData;
  vitalSigns?: VitalSigns;
  allergies?: string[];
  medicalHistory?: string[];
  clinicalSummary?: string;
}

const DOCTOR_FIELDS: { key: keyof DoctorInfo; labelKey: string }[] = [
  { key: 'name', labelKey: 'doctorName' },
  { key: 'specialty', labelKey: 'specialty' },
  { key: 'tagline', labelKey: 'qualifications' },
  { key: 'clinic', labelKey: 'clinicHospital' },
  { key: 'phone', labelKey: 'phone' },
  { key: 'email', labelKey: 'email' },
  { key: 'website', labelKey: 'website' },
  { key: 'address', labelKey: 'clinicAddress' },
];

function TemplateThumbnail({ id, color }: { id: string; color: string }) {
  // Simple CSS-based mini-previews of the templates
  const renderLayout = () => {
    switch (id) {
      case 'classic':
        return (
          <div className={styles.thumbClassic}>
            <div className={styles.thumbHeader} style={{ background: color }} />
            <div className={styles.thumbContent}>
              <div className={styles.thumbLineShort} />
              <div className={styles.thumbLineLong} />
              <div className={styles.thumbLineLong} />
            </div>
          </div>
        );
      case 'modern-minimal':
        return (
          <div className={styles.thumbMinimal}>
            <div className={styles.thumbLineShort} />
            <div className={styles.thumbLineLong} style={{ marginTop: 8 }} />
            <div className={styles.thumbLineLong} />
            <div className={styles.thumbLineLong} />
          </div>
        );
      case 'clinical':
        return (
          <div className={styles.thumbClinical}>
            <div className={styles.thumbLineShort} />
            <div className={styles.thumbTable}>
              <div className={styles.thumbTableRow} />
              <div className={styles.thumbTableRow} />
              <div className={styles.thumbTableRow} />
            </div>
          </div>
        );
      case 'compact':
        return (
          <div className={styles.thumbCompact}>
            <div className={styles.thumbLineShort} />
            <div className={styles.thumbGrid}>
              <div className={styles.thumbLineLong} />
              <div className={styles.thumbLineLong} />
              <div className={styles.thumbLineLong} />
              <div className={styles.thumbLineLong} />
            </div>
          </div>
        );
      case 'elegant':
        return (
          <div className={styles.thumbElegant}>
            <div className={styles.thumbHeaderCenter} style={{ borderColor: color }} />
            <div className={styles.thumbLineLong} style={{ width: '40%', margin: '4px auto' }} />
            <div className={styles.thumbContent} style={{ marginTop: 8 }}>
              <div className={styles.thumbLineLong} />
              <div className={styles.thumbLineLong} />
            </div>
          </div>
        );
      case 'soap':
        return (
          <div className={styles.thumbSoap}>
            <div className={styles.thumbSection}><div className={styles.thumbLabel} style={{ background: color }} /><div className={styles.thumbLineLong} /></div>
            <div className={styles.thumbSection}><div className={styles.thumbLabel} style={{ background: color }} /><div className={styles.thumbLineLong} /></div>
            <div className={styles.thumbSection}><div className={styles.thumbLabel} style={{ background: color }} /><div className={styles.thumbLineLong} /></div>
          </div>
        );
      case 'two-column':
        return (
          <div className={styles.thumbTwoCol}>
            <div className={styles.thumbCol}><div className={styles.thumbLineLong} /><div className={styles.thumbLineLong} /></div>
            <div className={styles.thumbCol} style={{ borderLeft: '1px solid #e2e8f0' }}><div className={styles.thumbLineLong} /><div className={styles.thumbLineLong} /></div>
          </div>
        );
      case 'structured-form':
        return (
          <div className={styles.thumbStructured}>
            <div className={styles.thumbBox} /><div className={styles.thumbBox} /><div className={styles.thumbBox} />
          </div>
        );
      case 'systems-based':
        return (
          <div className={styles.thumbSystems}>
            <div className={styles.thumbGrid2}>
              <div className={styles.thumbBoxSmall} /><div className={styles.thumbBoxSmall} />
              <div className={styles.thumbBoxSmall} /><div className={styles.thumbBoxSmall} />
            </div>
          </div>
        );
      case 'progress-note':
        return (
          <div className={styles.thumbProgress}>
            <div className={styles.thumbLineShort} style={{ opacity: 0.5 }} />
            <div className={styles.thumbLineLong} />
            <div className={styles.thumbLineShort} style={{ opacity: 0.5, marginTop: 6 }} />
            <div className={styles.thumbLineLong} />
          </div>
        );
      default:
        return <div className={styles.thumbDefault} />;
    }
  };

  return (
    <div className={styles.templateThumbWrapper} style={{ borderColor: color }}>
      {renderLayout()}
    </div>
  );
}

export default function DocumentGenerator({
  onClose,
  onBackToAnalysis,
  prescriptionData,
  vitalSigns,
  allergies,
  medicalHistory,
  clinicalSummary,
}: DocumentGeneratorProps) {
  const t = useTranslations('docGenerator');
  const tTooltips = useTranslations('tooltips');

  const [documentType, setDocumentType] = useState<DocumentType>('prescription');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({ ...DEFAULT_DOCTOR_INFO });
  const [showDoctorEditor, setShowDoctorEditor] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);

  const isOpd = documentType === 'opd';
  const templates = isOpd ? OPD_TEMPLATES : PRESCRIPTION_TEMPLATES;
  const title = isOpd ? t('opdTitle') : t('title');
  const subtitle = isOpd ? t('opdSubtitle') : t('subtitle');
  const selectText = isOpd ? t('selectOpdTemplate') : t('selectTemplate');
  const filenamePrefix = isOpd ? OPD_PDF_FILENAME_PREFIX : PDF_FILENAME_PREFIX;

  const opdNoteData: OpdNoteData = useMemo(() => ({
    ...prescriptionData,
    vitalSigns,
    allergies,
    medicalHistory,
    clinicalSummary,
  }), [prescriptionData, vitalSigns, allergies, medicalHistory, clinicalSummary]);

  const updateDoctorField = useCallback((key: keyof DoctorInfo, value: string) => {
    setDoctorInfo((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDocTypeChange = useCallback((type: DocumentType) => {
    setDocumentType(type);
    setSelectedTemplate(null);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setError(null);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const render = isOpd
        ? opdTemplateRenderers[selectedTemplate]
        : templateRenderers[selectedTemplate];
      if (!render) throw new Error('Template not found');

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
      wrapper.innerHTML = isOpd
        ? render(opdNoteData, doctorInfo)
        : render(prescriptionData || {}, doctorInfo);

      clip.appendChild(wrapper);
      document.body.appendChild(clip);

      const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, width: 794 });
      document.body.removeChild(clip);

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, Math.min(imgH, pageH));
      pdf.save(`${filenamePrefix}-${Date.now()}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedTemplate, prescriptionData, opdNoteData, doctorInfo, isOpd, filenamePrefix]);

  const previewHtml = selectedTemplate
    ? isOpd
      ? opdTemplateRenderers[selectedTemplate]?.(opdNoteData, doctorInfo) || ''
      : templateRenderers[selectedTemplate]?.(prescriptionData || {}, doctorInfo) || ''
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
                {t('backToAnalysis')}
              </button>
            )}
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <button onClick={onClose} className={styles.closeButton} title={tTooltips('close')}>
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

        {/* Document Type Tabs + Template Selector */}
        {!selectedTemplate && (
          <div className={styles.templateSection}>
            <div className={styles.docTypeTabs}>
              <button
                className={`${styles.docTypeTab} ${!isOpd ? styles.docTypeTabActive : ''}`}
                onClick={() => handleDocTypeChange('prescription')}
              >
                {t('docTypePrescription')}
              </button>
              <button
                className={`${styles.docTypeTab} ${isOpd ? styles.docTypeTabActive : ''}`}
                onClick={() => handleDocTypeChange('opd')}
              >
                {t('docTypeOpdNote')}
              </button>
            </div>
            <p className={styles.sectionLabel}>{selectText}</p>
            <div className={styles.templateGrid}>
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={styles.templateCard}
                >
                  <TemplateThumbnail id={tmpl.id} color={tmpl.thumbnailColor} />
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
              {showDoctorEditor ? t('hideDoctorDetails') : t('editDoctorDetails')}
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
                  {DOCTOR_FIELDS.map(({ key, labelKey }) => (
                    <label key={key} className={styles.fieldLabel}>
                      <span className={styles.fieldName}>{t(labelKey)}</span>
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
            {isOpd ? (
              <OpdTemplateRenderer
                ref={templateRef}
                templateId={selectedTemplate}
                opdNoteData={opdNoteData}
                doctorInfo={doctorInfo}
              />
            ) : (
              <PrescriptionTemplateRenderer
                ref={templateRef}
                templateId={selectedTemplate}
                prescriptionData={prescriptionData}
                doctorInfo={doctorInfo}
              />
            )}

            {/* Actions */}
            <div className={styles.resultActions}>
              <button
                onClick={() => setSelectedTemplate(null)}
                className={styles.regenerateButton}
              >
                {t('chooseDifferentTemplate')}
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className={styles.downloadButton}
                title={tTooltips('downloadPdf')}
              >
                <span className={styles.buttonContent}>
                  {isGenerating ? (
                    <>
                      <span className={styles.spinnerSmall} />
                      {t('generatingPdf')}
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
                      {t('downloadPdf')}
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
