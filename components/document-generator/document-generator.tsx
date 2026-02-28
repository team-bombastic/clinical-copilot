'use client';

import { useState, useRef, useCallback } from 'react';
import { useGenerateDocument } from './use-generate-document';
import LatexPreview from './latex-preview';
import {
  PDF_FILENAME_PREFIX,
  PDF_IMAGE_QUALITY,
  PDF_SCALE,
  PDF_FORMAT,
  PDF_ORIENTATION,
} from '@/constants/config';
import { ERR_NO_RENDERED_CONTENT } from '@/constants/errors';
import {
  DOC_GEN_TITLE,
  DOC_GEN_SUBTITLE,
  DROP_ZONE_TEXT,
  DROP_ZONE_HINT,
  GENERATING_TEXT,
  GENERATE_PRESCRIPTION_TEXT,
  TAB_PREVIEW,
  TAB_LATEX,
  COPY_TEXT,
  COPIED_TEXT,
  DOWNLOAD_PDF_TEXT,
  EXPORTING_TEXT,
  REUPLOAD_TEXT,
  TOOLTIP_CLOSE,
  TOOLTIP_COPY_LATEX,
  TOOLTIP_DOWNLOAD_PDF,
} from '@/constants/ui-strings';
import { ACCEPTED_TEMPLATE_TYPES } from '@/constants/config';
import styles from './document-generator.module.css';

interface ConsultationSegment {
  speaker: string;
  text: string;
  translatedText: string;
}

interface DocumentGeneratorProps {
  transcription: string;
  segments: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  onClose: () => void;
}

type ActiveTab = 'preview' | 'latex';

export default function DocumentGenerator({
  transcription,
  segments,
  mode,
  onClose,
}: DocumentGeneratorProps) {
  const {
    uploadedFile,
    latexCode,
    isGenerating,
    error,
    setUploadedFile,
    generateDocument,
    clearState,
  } = useGenerateDocument();

  const [activeTab, setActiveTab] = useState<ActiveTab>('preview');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
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
    generateDocument(uploadedFile, transcription, segments, mode);
  }, [uploadedFile, transcription, segments, mode, generateDocument]);

  const handleCopyLatex = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latexCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = latexCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [latexCode]);

  const handleDownloadPdf = useCallback(async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const wrapper = previewRef.current.querySelector('div');
      if (!wrapper) throw new Error(ERR_NO_RENDERED_CONTENT);

      const opt = {
        margin: 0,
        filename: `${PDF_FILENAME_PREFIX}-${Date.now()}.pdf`,
        image: { type: 'jpeg' as const, quality: PDF_IMAGE_QUALITY },
        html2canvas: {
          scale: PDF_SCALE,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'pt',
          format: PDF_FORMAT,
          orientation: PDF_ORIENTATION,
        },
      };

      await html2pdf().set(opt).from(wrapper).save();
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  }, []);

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
        {!latexCode && (
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
        {latexCode && (
          <div className={styles.resultsSection}>
            {/* Tabs */}
            <div className={styles.tabRow}>
              <div className={styles.tabs}>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`${styles.tab} ${activeTab === 'preview' ? styles.tabActive : ''}`}
                >
                  {TAB_PREVIEW}
                </button>
                <button
                  onClick={() => setActiveTab('latex')}
                  className={`${styles.tab} ${activeTab === 'latex' ? styles.tabActive : ''}`}
                >
                  {TAB_LATEX}
                </button>
              </div>
              <div className={styles.actionButtons}>
                <button
                  onClick={handleCopyLatex}
                  className={styles.actionButton}
                  title={TOOLTIP_COPY_LATEX}
                >
                  {copied ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="rgba(110, 231, 183, 0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
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
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copied ? COPIED_TEXT : COPY_TEXT}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className={styles.downloadButton}
                  title={TOOLTIP_DOWNLOAD_PDF}
                >
                  {isDownloading ? (
                    <span className={styles.buttonContent}>
                      <span className={styles.spinnerSmall} />
                      {EXPORTING_TEXT}
                    </span>
                  ) : (
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
                  )}
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className={styles.tabContent}>
              {activeTab === 'preview' ? (
                <LatexPreview latexCode={latexCode} previewRef={previewRef} />
              ) : (
                <div className={styles.codeContainer}>
                  <pre className={styles.codeBlock}>{latexCode}</pre>
                </div>
              )}
            </div>

            {/* Re-generate button */}
            <button onClick={() => clearState()} className={styles.regenerateButton}>
              {REUPLOAD_TEXT}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
