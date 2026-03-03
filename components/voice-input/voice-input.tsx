'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranscribe, TranscriptSegment } from './use-transcribe';
import { useBatchTranscribe, ConsultationSegment } from './use-batch-transcribe';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  STREAMING_LANGUAGES,
  BATCH_LANGUAGES,
  CONSULTATION_LANGUAGES,
  isStreamingLanguage,
  getLanguageLabel,
  getLanguageOptions,
} from './languages';
import DocumentGenerator from '../document-generator/document-generator';
import AiAnalysisPanel from '../ai-analysis/ai-analysis-panel';
import type { PrescriptionData, VitalSigns } from '@/types/clinical-analysis';
import { LANGUAGE_LABELS, getSpeakerLabel } from '@/constants/mappings';
import { AWS_REGION_DEFAULT, TRANSLATION_DEBOUNCE_MS } from '@/constants/config';
import { ERR_NOT_AUTHENTICATED, ERR_TRANSLATION_FAILED } from '@/constants/errors';
import {
  MODE_CONSULTATION,
  MODE_DICTATION,
  MODE_DESC_CONSULTATION,
  MODE_DESC_DICTATION,
  TITLE_CONSULTATION,
  TITLE_DICTATION,
  OPTGROUP_REALTIME,
  OPTGROUP_OTHER,
  LISTENING_TEXT,
  PROCESSING_CONSULTATION_TEXT,
  CLEAR_BUTTON_TEXT,
  GENERATE_BUTTON_TEXT,
  TRANSLATION_SECTION_LABEL,
  TRANSLATING_FALLBACK,
  BADGE_MIXED_LANGUAGE,
  BADGE_DETECTED_PREFIX,
  placeholderConsultation,
  placeholderStreaming,
  placeholderBatch,
  recordingConsultation,
  recordingBatch,
  processingBatch,
  TOOLTIP_STOP_RECORDING,
  TOOLTIP_START_RECORDING,
} from '@/constants/ui-strings';
import styles from './voice-input.module.css';

type InputMode = 'consultation' | 'dictation';

// Read the batch Lambda function name from amplify outputs
function getBatchFunctionName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const outputs = require('../../amplify_outputs.json');
    return outputs?.custom?.batchTranscribeFunctionName || '';
  } catch {
    return '';
  }
}

/**
 * Translates only Hindi segments, keeps English as-is,
 * and returns the composed English transcript.
 */
async function translateSegments(segments: TranscriptSegment[]): Promise<string> {
  const hindiSegments = segments.filter((s) => s.languageCode.startsWith('hi'));
  if (hindiSegments.length === 0) {
    return '';
  }

  const session = await fetchAuthSession();
  const credentials = session.credentials;
  if (!credentials) throw new Error(ERR_NOT_AUTHENTICATED);

  const region =
    (session.tokens?.idToken?.payload?.['custom:region'] as string) || AWS_REGION_DEFAULT;

  const client = new TranslateClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  const allHindi = hindiSegments.length === segments.length;

  if (allHindi) {
    // All segments are Hindi — translate the full text as one block for accuracy
    const fullText = segments.map((s) => s.text).join(' ');
    const response = await client.send(
      new TranslateTextCommand({
        Text: fullText,
        SourceLanguageCode: 'hi',
        TargetLanguageCode: 'en',
      })
    );
    return response.TranslatedText || fullText;
  }

  // Mixed language — translate consecutive Hindi groups as blocks, preserve English as-is
  type Group = { lang: 'hi' | 'en'; texts: string[] };
  const groups: Group[] = [];
  for (const seg of segments) {
    const isHindi = seg.languageCode.startsWith('hi');
    const groupLang = isHindi ? 'hi' : 'en';
    const last = groups[groups.length - 1];
    if (last && last.lang === groupLang) {
      last.texts.push(seg.text);
    } else {
      groups.push({ lang: groupLang, texts: [seg.text] });
    }
  }

  const translatedGroups = await Promise.all(
    groups.map(async (group) => {
      if (group.lang === 'en') {
        return group.texts.join(' ');
      }
      const text = group.texts.join(' ');
      const response = await client.send(
        new TranslateTextCommand({
          Text: text,
          SourceLanguageCode: 'hi',
          TargetLanguageCode: 'en',
        })
      );
      return response.TranslatedText || text;
    })
  );

  return translatedGroups.join(' ');
}

export default function VoiceInput() {
  const [inputMode, setInputMode] = useState<InputMode>('dictation');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
  const [preProcessedData, setPreProcessedData] = useState<PrescriptionData | undefined>(undefined);
  const [extendedVitals, setExtendedVitals] = useState<VitalSigns | undefined>(undefined);
  const [extendedAllergies, setExtendedAllergies] = useState<string[] | undefined>(undefined);
  const [extendedMedicalHistory, setExtendedMedicalHistory] = useState<string[] | undefined>(undefined);
  const [extendedClinicalSummary, setExtendedClinicalSummary] = useState<string | undefined>(undefined);

  const streaming = useTranscribe();
  const batch = useBatchTranscribe(getBatchFunctionName());

  const isConsultation = inputMode === 'consultation';
  const isStreaming = !isConsultation && isStreamingLanguage(selectedLanguage);
  const isBusy =
    streaming.isRecording || streaming.isConnecting || batch.isRecording || batch.isProcessing;

  const hasHindi = streaming.segments.some((s) => s.languageCode.startsWith('hi'));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) return;

    if (!hasHindi || streaming.segments.length === 0) {
      setEnglishTranslation('');
      setTranslateError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Translate immediately when not recording (final pass), debounce while recording
    const delay = streaming.isRecording ? TRANSLATION_DEBOUNCE_MS : 0;

    debounceRef.current = setTimeout(async () => {
      const requestId = ++lastRequestRef.current;
      setIsTranslating(true);
      setTranslateError(null);

      try {
        const result = await translateSegments(streaming.segments);
        if (requestId === lastRequestRef.current) {
          setEnglishTranslation(result);
        }
      } catch (err) {
        if (requestId === lastRequestRef.current) {
          setTranslateError(err instanceof Error ? err.message : ERR_TRANSLATION_FAILED);
        }
      } finally {
        if (requestId === lastRequestRef.current) {
          setIsTranslating(false);
        }
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [streaming.segments, hasHindi, isStreaming, streaming.isRecording]);

  const clearAllState = useCallback(() => {
    streaming.clearTranscript();
    batch.clearTranscript();
    setEnglishTranslation('');
    setTranslateError(null);
  }, [streaming, batch]);

  const handleModeSwitch = useCallback(
    (newMode: InputMode) => {
      if (newMode === inputMode) return;
      clearAllState();
      setInputMode(newMode);
      setSelectedLanguage(newMode === 'consultation' ? 'en-IN' : 'auto');
    },
    [inputMode, clearAllState]
  );

  const handleMicClick = useCallback(() => {
    if (isConsultation) {
      if (batch.isRecording) {
        batch.stopRecording();
      } else {
        const langOpts = getLanguageOptions(selectedLanguage);
        batch.startRecording(selectedLanguage, 'consultation', langOpts);
      }
    } else if (isStreaming) {
      if (streaming.isRecording) {
        streaming.stopRecording();
      } else {
        streaming.startRecording(selectedLanguage);
      }
    } else {
      if (batch.isRecording) {
        batch.stopRecording();
      } else {
        batch.startRecording(selectedLanguage, 'dictation');
      }
    }
  }, [isConsultation, isStreaming, streaming, batch, selectedLanguage]);

  const handleClear = useCallback(() => {
    clearAllState();
  }, [clearAllState]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (isStreaming) {
        streaming.setTranscript(e.target.value);
      } else {
        batch.setTranscript(e.target.value);
      }
    },
    [isStreaming, streaming, batch]
  );

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguage(e.target.value);
      clearAllState();
    },
    [clearAllState]
  );

  const currentTranscript = isStreaming ? streaming.transcript : batch.transcript;
  const currentPartial = isStreaming ? streaming.partialTranscript : '';
  const displayValue =
    currentTranscript + (currentPartial ? (currentTranscript ? ' ' : '') + currentPartial : '');

  const currentError = isStreaming ? streaming.error || translateError : batch.error;

  const detectedLabel = streaming.detectedLanguage
    ? LANGUAGE_LABELS[streaming.detectedLanguage] || streaming.detectedLanguage
    : null;

  const hasEnglish = streaming.segments.some((s) => s.languageCode.startsWith('en'));
  const mixedLanguage = hasHindi && hasEnglish;

  const showTranslation =
    !isConsultation &&
    (isStreaming ? hasHindi && (englishTranslation || isTranslating) : batch.translatedText);

  const translationContent = isStreaming ? englishTranslation : batch.translatedText;
  const isTranslationLoading = isStreaming ? isTranslating : false;

  const updateSegment = useCallback(
    (idx: number, field: 'text' | 'translatedText', value: string) => {
      batch.setSegments((prev) =>
        prev.map((seg, i) => (i === idx ? { ...seg, [field]: value } : seg))
      );
    },
    [batch]
  );

  const deleteSegment = useCallback(
    (idx: number) => {
      batch.setSegments((prev) => prev.filter((_, i) => i !== idx));
    },
    [batch]
  );

  const hasConsultationResults = isConsultation && batch.segments.length > 0;
  const hasAnyContent = currentTranscript || batch.translatedText || hasConsultationResults;
  const isRecordingActive = streaming.isRecording || batch.isRecording;

  return (
    <div className={styles.card}>
      {/* Mode toggle */}
      <div className={styles.modeToggleRow}>
        <div className={styles.modeToggle}>
          <button
            onClick={() => handleModeSwitch('consultation')}
            disabled={isBusy}
            className={`${styles.modeButton} ${isConsultation ? styles.modeButtonActive : ''}`}
          >
            {MODE_CONSULTATION}
          </button>
          <button
            onClick={() => handleModeSwitch('dictation')}
            disabled={isBusy}
            className={`${styles.modeButton} ${!isConsultation ? styles.modeButtonActive : ''}`}
          >
            {MODE_DICTATION}
          </button>
        </div>
        <p className={styles.modeDescription}>
          {isConsultation ? MODE_DESC_CONSULTATION : MODE_DESC_DICTATION}
        </p>
      </div>

      {/* Header: language selector + mic button */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.cardTitle}>
            {isConsultation ? TITLE_CONSULTATION : TITLE_DICTATION}
          </span>
          {isConsultation ? (
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={isBusy}
              className={styles.languageSelect}
            >
              {CONSULTATION_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={isBusy}
              className={styles.languageSelect}
            >
              <optgroup label={OPTGROUP_REALTIME}>
                {STREAMING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label={OPTGROUP_OTHER}>
                {BATCH_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </optgroup>
            </select>
          )}
        </div>

        <button
          onClick={handleMicClick}
          disabled={streaming.isConnecting || batch.isProcessing}
          className={`${styles.micButton} ${isRecordingActive ? styles.micButtonRecording : ''}`}
          title={isRecordingActive ? TOOLTIP_STOP_RECORDING : TOOLTIP_START_RECORDING}
        >
          {streaming.isConnecting ? (
            <span className={styles.spinner} />
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      </div>

      {/* Recording indicator (streaming mode) */}
      {!isConsultation && isStreaming && streaming.isRecording && (
        <div className={styles.statusRow}>
          <div className={styles.listeningIndicator}>
            <span className={styles.listeningDot} />
            {LISTENING_TEXT}
          </div>
          <div className={styles.statusFlexRow}>
            {mixedLanguage ? (
              <span className={styles.languageBadge}>{BADGE_MIXED_LANGUAGE}</span>
            ) : (
              detectedLabel && <span className={styles.languageBadge}>{detectedLabel}</span>
            )}
          </div>
        </div>
      )}

      {/* Recording indicator (batch/consultation mode) */}
      {(isConsultation || !isStreaming) && batch.isRecording && (
        <div className={styles.statusRow}>
          <div className={styles.listeningIndicator}>
            <span className={styles.listeningDot} />
            {isConsultation
              ? recordingConsultation(getLanguageLabel(selectedLanguage))
              : recordingBatch(getLanguageLabel(selectedLanguage))}
          </div>
        </div>
      )}

      {/* Processing spinner (batch mode) */}
      {batch.isProcessing && (
        <div className={styles.statusRow}>
          <div className={styles.processingIndicator}>
            <span className={styles.spinner} />
            {isConsultation
              ? PROCESSING_CONSULTATION_TEXT
              : processingBatch(getLanguageLabel(selectedLanguage))}
          </div>
        </div>
      )}

      {/* Detected language badge when not recording (streaming) */}
      {!isConsultation && isStreaming && !streaming.isRecording && streaming.transcript && (
        <div className={styles.statusRow}>
          {mixedLanguage ? (
            <span className={styles.languageBadge}>
              {BADGE_DETECTED_PREFIX} {BADGE_MIXED_LANGUAGE}
            </span>
          ) : (
            detectedLabel && (
              <span className={styles.languageBadge}>
                {BADGE_DETECTED_PREFIX} {detectedLabel}
              </span>
            )
          )}
        </div>
      )}

      {/* Consultation results: conversation view */}
      {hasConsultationResults ? (
        <div className={styles.conversationView}>
          {batch.segments.map((seg: ConsultationSegment, idx: number) => (
            <div key={idx} className={styles.segmentRow}>
              <div className={styles.speakerHeader}>
                <span
                  className={`${styles.speakerBadge} ${seg.speaker === 'spk_0' ? styles.speakerDoctor : styles.speakerPatient}`}
                >
                  {getSpeakerLabel(seg.speaker)}
                </span>
                <button
                  onClick={() => deleteSegment(idx)}
                  className={styles.deleteSegmentButton}
                  title="Delete segment"
                  aria-label="Delete segment"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <textarea
                value={seg.text}
                onChange={(e) => updateSegment(idx, 'text', e.target.value)}
                className={styles.segmentTextarea}
                rows={2}
              />
              {seg.translatedText && seg.translatedText !== seg.text && (
                <textarea
                  value={seg.translatedText}
                  onChange={(e) => updateSegment(idx, 'translatedText', e.target.value)}
                  className={styles.segmentTranslationTextarea}
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={displayValue}
          onChange={handleTextChange}
          placeholder={
            isConsultation
              ? placeholderConsultation(getLanguageLabel(selectedLanguage))
              : isStreaming
                ? placeholderStreaming
                : placeholderBatch(getLanguageLabel(selectedLanguage))
          }
          className={styles.textarea}
          rows={6}
        />
      )}

      {/* Clear button */}
      {hasAnyContent && (
        <button onClick={handleClear} className={styles.clearButton}>
          {CLEAR_BUTTON_TEXT}
        </button>
      )}

      {/* Error display */}
      {currentError && <div className={styles.errorBox}>{currentError}</div>}

      {/* English translation (dictation mode only) */}
      {showTranslation && (
        <div className={styles.translationSection}>
          <div className={styles.translationHeader}>
            <span className={styles.translationLabel}>{TRANSLATION_SECTION_LABEL}</span>
            {isTranslationLoading && <span className={styles.translatingDot} />}
          </div>
          <textarea
            value={translationContent || TRANSLATING_FALLBACK}
            onChange={(e) => {
              if (isStreaming) {
                setEnglishTranslation(e.target.value);
              } else {
                batch.setTranslatedText(e.target.value);
              }
            }}
            className={styles.translationTextarea}
            rows={4}
          />
        </div>
      )}

      {/* Generate button — opens AI Analysis first */}
      {hasAnyContent && !isBusy && (
        <button onClick={() => setShowAnalysis(true)} className={styles.generateButton}>
          {GENERATE_BUTTON_TEXT}
        </button>
      )}

      {/* AI Analysis Panel — stays mounted while doc generator is open so state is preserved */}
      {showAnalysis && (
        <AiAnalysisPanel
          transcription={translationContent || currentTranscript}
          segments={batch.segments}
          mode={isConsultation ? 'consultation' : 'dictation'}
          onClose={() => {
            setShowAnalysis(false);
            setShowDocumentGenerator(false);
            setPreProcessedData(undefined);
            setExtendedVitals(undefined);
            setExtendedAllergies(undefined);
            setExtendedMedicalHistory(undefined);
            setExtendedClinicalSummary(undefined);
          }}
          onProceedToGeneration={(data, extended) => {
            setPreProcessedData(data);
            setExtendedVitals(extended.vitalSigns);
            setExtendedAllergies(extended.allergies);
            setExtendedMedicalHistory(extended.medicalHistory);
            setExtendedClinicalSummary(extended.clinicalSummary);
            setShowDocumentGenerator(true);
          }}
        />
      )}

      {/* Document Generator Modal — renders on top of the analysis panel */}
      {showDocumentGenerator && (
        <DocumentGenerator
          transcription={translationContent || currentTranscript}
          segments={batch.segments}
          mode={isConsultation ? 'consultation' : 'dictation'}
          onClose={() => {
            setShowDocumentGenerator(false);
            setShowAnalysis(false);
            setPreProcessedData(undefined);
            setExtendedVitals(undefined);
            setExtendedAllergies(undefined);
            setExtendedMedicalHistory(undefined);
            setExtendedClinicalSummary(undefined);
          }}
          onBackToAnalysis={() => {
            setShowDocumentGenerator(false);
          }}
          prescriptionData={preProcessedData}
          vitalSigns={extendedVitals}
          allergies={extendedAllergies}
          medicalHistory={extendedMedicalHistory}
          clinicalSummary={extendedClinicalSummary}
        />
      )}
    </div>
  );
}
