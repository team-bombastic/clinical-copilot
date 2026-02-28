'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranscribe, TranscriptSegment } from './use-transcribe';
import { useBatchTranscribe, ConsultationSegment } from './use-batch-transcribe';
import {
  TranslateClient,
  TranslateTextCommand,
} from '@aws-sdk/client-translate';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  STREAMING_LANGUAGES,
  BATCH_LANGUAGES,
  CONSULTATION_LANGUAGES,
  isStreamingLanguage,
  getLanguageLabel,
  getLanguageOptions,
} from './languages';

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

const LANGUAGE_LABELS: Record<string, string> = {
  'en-IN': 'English',
  'en-US': 'English',
  'hi-IN': 'Hindi',
};

/**
 * Translates only Hindi segments, keeps English as-is,
 * and returns the composed English transcript.
 */
async function translateSegments(
  segments: TranscriptSegment[]
): Promise<string> {
  const hindiSegments = segments.filter((s) => s.languageCode.startsWith('hi'));
  if (hindiSegments.length === 0) {
    // Everything is English — no translation needed
    return '';
  }

  const session = await fetchAuthSession();
  const credentials = session.credentials;
  if (!credentials) throw new Error('Not authenticated');

  const region =
    (session.tokens?.idToken?.payload?.['custom:region'] as string) ||
    'ap-south-1';

  const client = new TranslateClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  // Translate all Hindi text in one call (joined with " | " separator to preserve boundaries)
  const separator = ' | ';
  const hindiTexts = hindiSegments.map((s) => s.text);
  const joinedHindi = hindiTexts.join(separator);

  const response = await client.send(
    new TranslateTextCommand({
      Text: joinedHindi,
      SourceLanguageCode: 'hi',
      TargetLanguageCode: 'en',
    })
  );

  const translatedParts = (response.TranslatedText || '').split(separator);

  // Build a map from Hindi segment text to its translation
  const translationMap = new Map<string, string>();
  hindiSegments.forEach((seg, i) => {
    translationMap.set(seg.text, translatedParts[i]?.trim() || seg.text);
  });

  // Compose the full English version: English segments as-is, Hindi segments translated
  const result = segments
    .map((seg) => {
      if (seg.languageCode.startsWith('hi')) {
        return translationMap.get(seg.text) || seg.text;
      }
      return seg.text;
    })
    .join(' ');

  return result;
}

const SPEAKER_LABELS: Record<string, string> = {
  spk_0: 'Doctor',
  spk_1: 'Patient',
};

function getSpeakerLabel(speaker: string): string {
  return SPEAKER_LABELS[speaker] || speaker;
}

export default function VoiceInput() {
  const [inputMode, setInputMode] = useState<InputMode>('dictation');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [englishTranslation, setEnglishTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const streaming = useTranscribe();
  const batch = useBatchTranscribe(getBatchFunctionName());

  const isConsultation = inputMode === 'consultation';
  const isStreaming = !isConsultation && isStreamingLanguage(selectedLanguage);
  const isBusy =
    streaming.isRecording ||
    streaming.isConnecting ||
    batch.isRecording ||
    batch.isProcessing;

  // Track whether any Hindi segments exist
  const hasHindi = streaming.segments.some((s) =>
    s.languageCode.startsWith('hi')
  );

  // Debounced per-segment translation for streaming mode
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
          setTranslateError(
            err instanceof Error ? err.message : 'Translation failed'
          );
        }
      } finally {
        if (requestId === lastRequestRef.current) {
          setIsTranslating(false);
        }
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [streaming.segments, hasHindi, isStreaming]);

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
      // Reset language: consultation defaults to en-IN, dictation to auto
      setSelectedLanguage(newMode === 'consultation' ? 'en-IN' : 'auto');
    },
    [inputMode, clearAllState]
  );

  const handleMicClick = useCallback(() => {
    if (isConsultation) {
      // Consultation always uses batch
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

  // Determine what to display
  const currentTranscript = isStreaming
    ? streaming.transcript
    : batch.transcript;
  const currentPartial = isStreaming ? streaming.partialTranscript : '';
  const displayValue =
    currentTranscript +
    (currentPartial
      ? (currentTranscript ? ' ' : '') + currentPartial
      : '');

  const currentError = isStreaming
    ? streaming.error || translateError
    : batch.error;

  // Language badge for streaming — show the most recent detected language
  const detectedLabel = streaming.detectedLanguage
    ? LANGUAGE_LABELS[streaming.detectedLanguage] || streaming.detectedLanguage
    : null;

  // Show language mix badge when both languages detected
  const hasEnglish = streaming.segments.some((s) =>
    s.languageCode.startsWith('en')
  );
  const mixedLanguage = hasHindi && hasEnglish;

  // Translation display (dictation mode only)
  const showTranslation =
    !isConsultation &&
    (isStreaming
      ? hasHindi && (englishTranslation || isTranslating)
      : batch.translatedText);

  const translationContent = isStreaming
    ? englishTranslation
    : batch.translatedText;
  const isTranslationLoading = isStreaming ? isTranslating : false;

  const updateSegment = useCallback(
    (idx: number, field: 'text' | 'translatedText', value: string) => {
      batch.setSegments((prev) =>
        prev.map((seg, i) => (i === idx ? { ...seg, [field]: value } : seg))
      );
    },
    [batch]
  );

  // Whether we have consultation results to show
  const hasConsultationResults = isConsultation && batch.segments.length > 0;
  const hasAnyContent = currentTranscript || batch.translatedText || hasConsultationResults;

  return (
    <div style={styles.card}>
      {/* Mode toggle */}
      <div style={styles.modeToggleRow}>
        <div style={styles.modeToggle}>
          <button
            onClick={() => handleModeSwitch('consultation')}
            disabled={isBusy}
            style={{
              ...styles.modeButton,
              ...(isConsultation ? styles.modeButtonActive : {}),
            }}
          >
            Consultation
          </button>
          <button
            onClick={() => handleModeSwitch('dictation')}
            disabled={isBusy}
            style={{
              ...styles.modeButton,
              ...(!isConsultation ? styles.modeButtonActive : {}),
            }}
          >
            Dictation
          </button>
        </div>
      </div>

      {/* Header: language selector + mic button */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <span style={styles.cardTitle}>
            {isConsultation ? 'Consultation Recording' : 'Clinical Notes'}
          </span>
          {isConsultation ? (
            <select
              value={selectedLanguage}
              onChange={handleLanguageChange}
              disabled={isBusy}
              style={styles.languageSelect}
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
              style={styles.languageSelect}
            >
              <optgroup label="Real-time">
                {STREAMING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Languages">
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
          style={{
            ...styles.micButton,
            ...(streaming.isRecording || batch.isRecording
              ? styles.micButtonRecording
              : {}),
          }}
          title={
            streaming.isRecording || batch.isRecording
              ? 'Stop recording'
              : 'Start recording'
          }
        >
          {streaming.isConnecting ? (
            <span style={styles.spinner} />
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
        <div style={styles.statusRow}>
          <div style={styles.listeningIndicator}>
            <span style={styles.listeningDot} />
            Listening...
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {mixedLanguage ? (
              <span style={styles.languageBadge}>English + Hindi</span>
            ) : (
              detectedLabel && (
                <span style={styles.languageBadge}>{detectedLabel}</span>
              )
            )}
          </div>
        </div>
      )}

      {/* Recording indicator (batch/consultation mode) */}
      {(isConsultation || !isStreaming) && batch.isRecording && (
        <div style={styles.statusRow}>
          <div style={styles.listeningIndicator}>
            <span style={styles.listeningDot} />
            {isConsultation
              ? `Recording consultation (${getLanguageLabel(selectedLanguage)})...`
              : `Recording (${getLanguageLabel(selectedLanguage)})...`}
          </div>
        </div>
      )}

      {/* Processing spinner (batch mode) */}
      {batch.isProcessing && (
        <div style={styles.statusRow}>
          <div style={styles.processingIndicator}>
            <span style={styles.spinner} />
            {isConsultation
              ? 'Processing consultation...'
              : `Processing ${getLanguageLabel(selectedLanguage)} audio...`}
          </div>
        </div>
      )}

      {/* Detected language badge when not recording (streaming) */}
      {!isConsultation &&
        isStreaming &&
        !streaming.isRecording &&
        streaming.transcript && (
          <div style={styles.statusRow}>
            {mixedLanguage ? (
              <span style={styles.languageBadge}>
                Detected: English + Hindi
              </span>
            ) : (
              detectedLabel && (
                <span style={styles.languageBadge}>
                  Detected: {detectedLabel}
                </span>
              )
            )}
          </div>
        )}

      {/* Consultation results: conversation view */}
      {hasConsultationResults ? (
        <div style={styles.conversationView}>
          {batch.segments.map((seg: ConsultationSegment, idx: number) => (
            <div key={idx} style={styles.segmentRow}>
              <div style={styles.speakerHeader}>
                <span
                  style={{
                    ...styles.speakerBadge,
                    ...(seg.speaker === 'spk_0'
                      ? styles.speakerDoctor
                      : styles.speakerPatient),
                  }}
                >
                  {getSpeakerLabel(seg.speaker)}
                </span>
              </div>
              <textarea
                value={seg.text}
                onChange={(e) => updateSegment(idx, 'text', e.target.value)}
                style={styles.segmentTextarea}
                rows={2}
              />
              {seg.translatedText && seg.translatedText !== seg.text && (
                <textarea
                  value={seg.translatedText}
                  onChange={(e) =>
                    updateSegment(idx, 'translatedText', e.target.value)
                  }
                  style={styles.segmentTranslationTextarea}
                  rows={2}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Textarea — original transcription (dictation mode) */
        <textarea
          value={displayValue}
          onChange={handleTextChange}
          placeholder={
            isConsultation
              ? `Tap the mic to record a consultation in ${getLanguageLabel(selectedLanguage)}...`
              : isStreaming
                ? 'Tap the mic and speak — language is detected automatically...'
                : `Tap the mic, speak in ${getLanguageLabel(selectedLanguage)}, then stop to transcribe...`
          }
          style={styles.textarea}
          rows={6}
        />
      )}

      {/* Clear button */}
      {hasAnyContent && (
        <button onClick={handleClear} style={styles.clearButton}>
          Clear
        </button>
      )}

      {/* Error display */}
      {currentError && <div style={styles.errorBox}>{currentError}</div>}

      {/* English translation (dictation mode only) */}
      {showTranslation && (
        <div style={styles.translationSection}>
          <div style={styles.translationHeader}>
            <span style={styles.translationLabel}>English Translation</span>
            {isTranslationLoading && <span style={styles.translatingDot} />}
          </div>
          <div style={styles.translationText}>
            {translationContent || 'Translating...'}
          </div>
        </div>
      )}

      {/* Generate button — visible when transcription is available and not recording */}
      {hasAnyContent && !isBusy && (
        <button onClick={() => {}} style={styles.generateButton}>
          Generate Medical Documents
        </button>
      )}

      <style>{keyframeStyles}</style>
    </div>
  );
}

const keyframeStyles = `
  @keyframes pulse-ring {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '28px 32px',
    width: '100%',
    maxWidth: '640px',
    boxShadow:
      '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 1px 0 rgba(255, 255, 255, 0.08) inset',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  modeToggleRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  modeToggle: {
    display: 'inline-flex',
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '3px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modeButton: {
    padding: '8px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    letterSpacing: '0.01em',
  },
  modeButtonActive: {
    background: 'rgba(99, 102, 241, 0.25)',
    color: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  languageSelect: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '6px 10px',
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: '0.82rem',
    outline: 'none',
    cursor: 'pointer',
    maxWidth: '220px',
  },
  micButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background:
      'linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8))',
    color: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
  },
  micButtonRecording: {
    background:
      'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9))',
    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
    animation: 'pulse-ring 1.5s infinite',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  listeningIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'rgba(252, 165, 165, 0.9)',
    fontWeight: 500,
  },
  listeningDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.8)',
    animation: 'blink 1s infinite',
    display: 'inline-block',
  },
  processingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.85rem',
    color: 'rgba(165, 180, 252, 0.9)',
    fontWeight: 500,
  },
  languageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(99, 102, 241, 0.15)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    color: 'rgba(165, 180, 252, 0.95)',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  textarea: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '14px',
    padding: '14px 16px',
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  conversationView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
    padding: '4px 0',
  },
  segmentRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.04)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  speakerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  speakerBadge: {
    fontSize: '0.72rem',
    fontWeight: 700,
    padding: '2px 10px',
    borderRadius: '8px',
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
  },
  speakerDoctor: {
    background: 'rgba(99, 102, 241, 0.2)',
    color: 'rgba(165, 180, 252, 0.95)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  speakerPatient: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: 'rgba(110, 231, 183, 0.95)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
  },
  segmentTextarea: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  segmentTranslationTextarea: {
    background: 'rgba(99, 102, 241, 0.06)',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: '8px',
    padding: '8px 10px',
    color: 'rgba(165, 180, 252, 0.85)',
    fontSize: '0.85rem',
    lineHeight: '1.5',
    fontStyle: 'italic' as const,
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  clearButton: {
    alignSelf: 'flex-end',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '6px 16px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'rgba(252, 165, 165, 0.95)',
    fontSize: '0.85rem',
    backdropFilter: 'blur(8px)',
  },
  translationSection: {
    background: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: '14px',
    padding: '14px 16px',
  },
  translationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  translationLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'rgba(165, 180, 252, 0.8)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  translatingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(165, 180, 252, 0.6)',
    animation: 'blink 1s infinite',
    display: 'inline-block',
  },
  translationText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.95rem',
    lineHeight: '1.6',
  },
  generateButton: {
    width: '100%',
    padding: '14px 20px',
    borderRadius: '14px',
    border: 'none',
    background:
      'linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8))',
    color: '#ffffff',
    fontSize: '0.92rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
    letterSpacing: '0.01em',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
};
