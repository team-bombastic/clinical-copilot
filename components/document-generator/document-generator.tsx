'use client';

import { useRef, useCallback } from 'react';
import { useGenerateDocument } from './use-generate-document';
import PdfPreview from './pdf-preview';
import { PDF_FILENAME_PREFIX } from '@/constants/config';
import {
  DOC_GEN_TITLE,
  DOC_GEN_SUBTITLE,
  DROP_ZONE_TEXT,
  DROP_ZONE_HINT,
  GENERATING_TEXT,
  GENERATE_PRESCRIPTION_TEXT,
  DOWNLOAD_PDF_TEXT,
  REUPLOAD_TEXT,
  TOOLTIP_CLOSE,
  TOOLTIP_DOWNLOAD_PDF,
} from '@/constants/ui-strings';
import { ACCEPTED_TEMPLATE_TYPES } from '@/constants/config';
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
  prescriptionData?: PrescriptionData;
}

export default function DocumentGenerator({
  transcription,
  segments,
  mode,
  onClose,
  prescriptionData: preProcessedData,
}: DocumentGeneratorProps) {
  const {
    uploadedFile,
    pdfBase64,
    isGenerating,
    error,
    setUploadedFile,
    generateDocument,
    clearState,
  } = useGenerateDocument();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedFile(file);
      }
    },
    [setUploadedFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        setUploadedFile(file);
      }
    },
    [setUploadedFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGenerate = useCallback(() => {
    if (!uploadedFile) return;
    generateDocument(uploadedFile, transcription, segments, mode, preProcessedData);
  }, [uploadedFile, transcription, segments, mode, generateDocument, preProcessedData]);

  const handleDownloadPdf = useCallback(() => {
    if (!pdfBase64) return;

    const byteChars = atob(pdfBase64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${PDF_FILENAME_PREFIX}-${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pdfBase64]);

  const handleClose = useCallback(() => {
    clearState();
    onClose();
  }, [clearState, onClose]);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{DOC_GEN_TITLE}</h2>
            <p className={styles.subtitle}>{DOC_GEN_SUBTITLE}</p>
          </div>
          <button onClick={handleClose} className={styles.closeButton} title={TOOLTIP_CLOSE}>
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

        {/* Upload section */}
        {!pdfBase64 && (
          <div className={styles.uploadSection}>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={`${styles.dropZone} ${uploadedFile ? styles.dropZoneActive : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TEMPLATE_TYPES}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              {uploadedFile ? (
                <div className={styles.fileInfo}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(110, 231, 183, 0.9)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span className={styles.fileName}>{uploadedFile.name}</span>
                  <span className={styles.fileSize}>
                    ({(uploadedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div className={styles.dropZoneContent}>
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(165, 180, 252, 0.6)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span className={styles.dropText}>{DROP_ZONE_TEXT}</span>
                  <span className={styles.dropHint}>{DROP_ZONE_HINT}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!uploadedFile || isGenerating}
              className={`${styles.generateButton} ${!uploadedFile || isGenerating ? styles.generateButtonDisabled : ''}`}
            >
              {isGenerating ? (
                <span className={styles.buttonContent}>
                  <span className={styles.spinner} />
                  {GENERATING_TEXT}
                </span>
              ) : (
                <span className={styles.buttonContent}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {GENERATE_PRESCRIPTION_TEXT}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Results section */}
        {pdfBase64 && (
          <div className={styles.resultsSection}>
            {/* PDF Preview */}
            <PdfPreview pdfBase64={pdfBase64} />

            {/* Actions */}
            <div className={styles.resultActions}>
              <button onClick={() => clearState()} className={styles.regenerateButton}>
                {REUPLOAD_TEXT}
              </button>
              <button
                onClick={handleDownloadPdf}
                className={styles.downloadButton}
                title={TOOLTIP_DOWNLOAD_PDF}
              >
                <span className={styles.buttonContent}>
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
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
