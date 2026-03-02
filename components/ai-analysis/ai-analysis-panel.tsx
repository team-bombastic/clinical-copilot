'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAiAnalysis, type ExtendedClinicalData } from './use-ai-analysis';
import type { PrescriptionData, ConsultationSegment } from '@/types/clinical-analysis';
import {
  ANALYSIS_PANEL_TITLE,
  ANALYSIS_PANEL_SUBTITLE,
  ANALYZING_TEXT,
  PROCEED_TO_GENERATION_TEXT,
  REANALYZE_TEXT,
  BACK_TO_TRANSCRIPT_TEXT,
  SECTION_SAFETY_ALERTS,
  SECTION_EXTRACTED_ENTITIES,
  SECTION_CLINICAL_DATA,
  SECTION_MEDICATIONS,
  SECTION_EVIDENCE_NOTES,
  LABEL_PATIENT_NAME,
  LABEL_AGE,
  LABEL_SEX,
  LABEL_DATE,
  LABEL_ADDRESS,
  LABEL_CHIEF_COMPLAINTS,
  LABEL_DIAGNOSIS,
  LABEL_INVESTIGATIONS,
  LABEL_INSTRUCTIONS,
  LABEL_FOLLOW_UP,
  LABEL_ALLERGIES,
  LABEL_MEDICAL_HISTORY,
  LABEL_CLINICAL_SUMMARY,
  LABEL_DRUG_NAME,
  LABEL_GENERIC_NAME,
  LABEL_DOSAGE,
  LABEL_FREQUENCY,
  LABEL_DURATION,
  LABEL_ROUTE,
  LABEL_MED_INSTRUCTIONS,
  LABEL_NLEM,
  ADD_MEDICATION_TEXT,
  REMOVE_MEDICATION_TEXT,
  ACKNOWLEDGE_TEXT,
  ACKNOWLEDGED_TEXT,
  ALERT_CRITICAL,
  ALERT_WARNING,
  ALERT_INFO,
  NO_SAFETY_ALERTS,
  CRITICAL_ALERTS_BLOCK,
  TOOLTIP_CLOSE,
  SHOW_SOURCE_TEXT,
  HIDE_SOURCE_TEXT,
  RAG_SOURCE_HEADER,
  RAG_SOURCE_EMPTY,
} from '@/constants/ui-strings';
import styles from './ai-analysis-panel.module.css';

interface AiAnalysisPanelProps {
  transcription: string;
  segments: ConsultationSegment[];
  mode: 'dictation' | 'consultation';
  onClose: () => void;
  onProceedToGeneration: (prescriptionData: PrescriptionData, extendedData: ExtendedClinicalData) => void;
}

export default function AiAnalysisPanel({
  transcription,
  segments,
  mode,
  onClose,
  onProceedToGeneration,
}: AiAnalysisPanelProps) {
  const {
    isAnalyzing,
    editedResult,
    error,
    analyzeTranscript,
    updateField,
    addMedication,
    removeMedication,
    updateMedication,
    acknowledgeSafetyAlert,
    getPrescriptionData,
    getExtendedClinicalData,
    clearAnalysis,
  } = useAiAnalysis();

  const [showEntities, setShowEntities] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [expandedSourceIdx, setExpandedSourceIdx] = useState<number | null>(null);

  // Auto-analyze on mount
  const [hasStarted, setHasStarted] = useState(false);
  if (!hasStarted && !isAnalyzing && !editedResult && !error) {
    setHasStarted(true);
    analyzeTranscript(transcription, segments, mode);
  }

  const hasCriticalUnacknowledged = useMemo(() => {
    if (!editedResult) return false;
    return editedResult.safetyAlerts.some(
      (a) => a.severity === 'critical' && !a.acknowledged
    );
  }, [editedResult]);

  const handleProceed = useCallback(() => {
    const data = getPrescriptionData();
    const extended = getExtendedClinicalData();
    if (data) {
      onProceedToGeneration(data, extended || {});
    }
  }, [getPrescriptionData, getExtendedClinicalData, onProceedToGeneration]);

  const handleReanalyze = useCallback(() => {
    clearAnalysis();
    analyzeTranscript(transcription, segments, mode);
  }, [clearAnalysis, analyzeTranscript, transcription, segments, mode]);

  const handleClose = useCallback(() => {
    clearAnalysis();
    onClose();
  }, [clearAnalysis, onClose]);

  const severityLabel = (s: string) => {
    if (s === 'critical') return ALERT_CRITICAL;
    if (s === 'warning') return ALERT_WARNING;
    return ALERT_INFO;
  };

  const severityStyle = (s: string) => {
    if (s === 'critical') return styles.alertCritical;
    if (s === 'warning') return styles.alertWarning;
    return styles.alertInfo;
  };

  const badgeStyle = (s: string) => {
    if (s === 'critical') return styles.badgeCritical;
    if (s === 'warning') return styles.badgeWarning;
    return styles.badgeInfo;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{ANALYSIS_PANEL_TITLE}</h2>
            <p className={styles.subtitle}>{ANALYSIS_PANEL_SUBTITLE}</p>
          </div>
          <button onClick={handleClose} className={styles.closeButton} title={TOOLTIP_CLOSE}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading */}
        {isAnalyzing && (
          <div className={styles.loadingContainer}>
            <span className={styles.spinner} />
            <span className={styles.loadingText}>{ANALYZING_TEXT}</span>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Analysis Results */}
        {editedResult && (
          <>
            {/* Safety Alerts */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeader}>{SECTION_SAFETY_ALERTS}</h3>
              {editedResult.safetyAlerts.length === 0 ? (
                <p className={styles.noAlerts}>{NO_SAFETY_ALERTS}</p>
              ) : (
                <div className={styles.alertsContainer}>
                  {editedResult.safetyAlerts.map((alert) => (
                    <div key={alert.id} className={`${styles.alertCard} ${severityStyle(alert.severity)}`}>
                      <div className={styles.alertContent}>
                        <span className={`${styles.alertBadge} ${badgeStyle(alert.severity)}`}>
                          {severityLabel(alert.severity)}
                        </span>
                        <span className={styles.alertMessage}>{alert.message}</span>
                        <span className={styles.alertEntities}>
                          {alert.involvedEntities.join(' • ')}
                        </span>
                      </div>
                      <button
                        onClick={() => acknowledgeSafetyAlert(alert.id)}
                        className={`${styles.acknowledgeButton} ${alert.acknowledged ? styles.acknowledgedButton : ''}`}
                        disabled={alert.acknowledged}
                      >
                        {alert.acknowledged ? ACKNOWLEDGED_TEXT : ACKNOWLEDGE_TEXT}
                      </button>
                    </div>
                  ))}
                  {hasCriticalUnacknowledged && (
                    <p className={styles.criticalBlock}>{CRITICAL_ALERTS_BLOCK}</p>
                  )}
                </div>
              )}
            </div>

            {/* Clinical Summary */}
            {editedResult.clinicalSummary && (
              <div className={styles.section}>
                <h3 className={styles.sectionHeader}>{LABEL_CLINICAL_SUMMARY}</h3>
                <div className={styles.summaryText}>{editedResult.clinicalSummary}</div>
              </div>
            )}

            {/* Extracted Entities (collapsible) */}
            <div className={styles.section}>
              <h3
                className={styles.sectionHeader}
                onClick={() => setShowEntities(!showEntities)}
              >
                <span className={`${styles.sectionHeaderToggle} ${showEntities ? styles.sectionHeaderToggleOpen : ''}`}>
                  &#9654;
                </span>
                {SECTION_EXTRACTED_ENTITIES} ({editedResult.extractedEntities.length})
              </h3>
              {showEntities && (
                <div className={styles.entitiesGrid}>
                  {editedResult.extractedEntities.map((entity, idx) => (
                    <div key={idx} className={styles.entityChip}>
                      <span className={styles.entityType}>{entity.type}</span>
                      {entity.value}
                      <span className={styles.confidenceBadge}>
                        {Math.round(entity.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Structured Data Editor */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeader}>{SECTION_CLINICAL_DATA}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{LABEL_PATIENT_NAME}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.patientName || ''}
                    onChange={(e) => updateField('patientName', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{LABEL_AGE}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.age || ''}
                    onChange={(e) => updateField('age', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{LABEL_SEX}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.sex || ''}
                    onChange={(e) => updateField('sex', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{LABEL_DATE}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.date || ''}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_ADDRESS}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_CHIEF_COMPLAINTS}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={(editedResult.chiefComplaints || []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'chiefComplaints',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={2}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_DIAGNOSIS}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.diagnosis || ''}
                    onChange={(e) => updateField('diagnosis', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_ALLERGIES}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={(editedResult.allergies || []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'allergies',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={1}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_MEDICAL_HISTORY}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={(editedResult.medicalHistory || []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'medicalHistory',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={1}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_INVESTIGATIONS}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={(editedResult.investigations || []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'investigations',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={1}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_INSTRUCTIONS}</label>
                  <textarea
                    className={styles.formTextarea}
                    value={(editedResult.instructions || []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        'instructions',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    rows={2}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{LABEL_FOLLOW_UP}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.followUp || ''}
                    onChange={(e) => updateField('followUp', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeader}>{SECTION_MEDICATIONS}</h3>
              <div className={styles.medicationsWrapper}>
                <table className={styles.medicationsTable}>
                  <thead>
                    <tr>
                      <th>{LABEL_DRUG_NAME}</th>
                      <th>{LABEL_GENERIC_NAME}</th>
                      <th>{LABEL_DOSAGE}</th>
                      <th>{LABEL_FREQUENCY}</th>
                      <th>{LABEL_DURATION}</th>
                      <th>{LABEL_ROUTE}</th>
                      <th>{LABEL_MED_INSTRUCTIONS}</th>
                      <th>{LABEL_NLEM}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editedResult.medications || []).map((med, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.name}
                            onChange={(e) => updateMedication(idx, { name: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.genericName}
                            onChange={(e) => updateMedication(idx, { genericName: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.dosage}
                            onChange={(e) => updateMedication(idx, { dosage: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.frequency}
                            onChange={(e) => updateMedication(idx, { frequency: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.duration}
                            onChange={(e) => updateMedication(idx, { duration: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.route || ''}
                            onChange={(e) => updateMedication(idx, { route: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className={styles.medInput}
                            value={med.instructions || ''}
                            onChange={(e) => updateMedication(idx, { instructions: e.target.value })}
                          />
                        </td>
                        <td>
                          {med.nlemMatch && <span className={styles.nlemBadge}>NLEM</span>}
                        </td>
                        <td>
                          <button
                            className={styles.removeMedButton}
                            onClick={() => removeMedication(idx)}
                          >
                            {REMOVE_MEDICATION_TEXT}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className={styles.addMedButton} onClick={addMedication}>
                + {ADD_MEDICATION_TEXT}
              </button>
            </div>

            {/* Evidence Notes (collapsible) */}
            {editedResult.evidenceNotes && editedResult.evidenceNotes.length > 0 && (
              <div className={styles.section}>
                <h3
                  className={styles.sectionHeader}
                  onClick={() => setShowEvidence(!showEvidence)}
                >
                  <span className={`${styles.sectionHeaderToggle} ${showEvidence ? styles.sectionHeaderToggleOpen : ''}`}>
                    &#9654;
                  </span>
                  {SECTION_EVIDENCE_NOTES}
                </h3>
                {showEvidence && (
                  <div className={styles.evidenceList}>
                    {editedResult.evidenceNotes.map((note, idx) => (
                      <div key={idx} className={styles.evidenceItem}>
                        <div className={styles.evidenceItemRow}>
                          <span className={styles.evidenceItemText}>{note}</span>
                          <button
                            className={styles.evidenceButton}
                            onClick={() => setExpandedSourceIdx(expandedSourceIdx === idx ? null : idx)}
                          >
                            {expandedSourceIdx === idx ? HIDE_SOURCE_TEXT : SHOW_SOURCE_TEXT}
                          </button>
                        </div>
                        {expandedSourceIdx === idx && (
                          <div className={styles.sourcePanel}>
                            <div className={styles.sourcePanelHeader}>{RAG_SOURCE_HEADER}</div>
                            <div className={styles.sourcePanelBody}>
                              {editedResult.ragSourceChunks && editedResult.ragSourceChunks.length > 0 ? (
                                editedResult.ragSourceChunks.map((chunk, cIdx) => (
                                  <div key={cIdx} className={styles.sourceChunk}>
                                    <div className={styles.sourceChunkText}>{chunk.text}</div>
                                    {chunk.sourceUri && (
                                      <div className={styles.sourceChunkUri}>{chunk.sourceUri}</div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className={styles.sourceEmpty}>{RAG_SOURCE_EMPTY}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className={styles.actionsRow}>
              <button className={styles.backButton} onClick={handleClose}>
                {BACK_TO_TRANSCRIPT_TEXT}
              </button>
              <div className={styles.actionsRight}>
                <button className={styles.reanalyzeButton} onClick={handleReanalyze}>
                  {REANALYZE_TEXT}
                </button>
                <button
                  className={`${styles.proceedButton} ${hasCriticalUnacknowledged ? styles.proceedButtonDisabled : ''}`}
                  onClick={handleProceed}
                  disabled={hasCriticalUnacknowledged}
                >
                  {PROCEED_TO_GENERATION_TEXT}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
