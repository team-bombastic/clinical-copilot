'use client';

import { useState, useCallback, useMemo } from 'react';
import { useAiAnalysis, type ExtendedClinicalData } from './use-ai-analysis';
import type { PrescriptionData, ConsultationSegment } from '@/types/clinical-analysis';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('aiAnalysis');
  const tTooltips = useTranslations('tooltips');
  
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
    if (s === 'critical') return t('alertCritical');
    if (s === 'warning') return t('alertWarning');
    return t('alertInfo');
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
            <h2 className={styles.title}>{t('panelTitle')}</h2>
            <p className={styles.subtitle}>{t('panelSubtitle')}</p>
          </div>
          <button onClick={handleClose} className={styles.closeButton} title={tTooltips('close')}>
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
            <span className={styles.loadingText}>{t('analyzingText')}</span>
          </div>
        )}

        {/* Error */}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Analysis Results */}
        {editedResult && (
          <>
            {/* Safety Alerts */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeader}>{t('sectionSafetyAlerts')}</h3>
              {editedResult.safetyAlerts.length === 0 ? (
                <p className={styles.noAlerts}>{t('noSafetyAlerts')}</p>
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
                        {alert.acknowledged ? t('acknowledged') : t('acknowledge')}
                      </button>
                    </div>
                  ))}
                  {hasCriticalUnacknowledged && (
                    <p className={styles.criticalBlock}>{t('criticalAlertsBlock')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Clinical Summary */}
            {editedResult.clinicalSummary && (
              <div className={styles.section}>
                <h3 className={styles.sectionHeader}>{t('labelClinicalSummary')}</h3>
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
                {t('sectionExtractedEntities')} ({editedResult.extractedEntities.length})
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
              <h3 className={styles.sectionHeader}>{t('sectionClinicalData')}</h3>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('labelPatientName')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.patientName || ''}
                    onChange={(e) => updateField('patientName', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('labelAge')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.age || ''}
                    onChange={(e) => updateField('age', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('labelSex')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.sex || ''}
                    onChange={(e) => updateField('sex', e.target.value)}
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>{t('labelDate')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.date || ''}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{t('labelAddress')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.address || ''}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{t('labelChiefComplaints')}</label>
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
                  <label className={styles.formLabel}>{t('labelDiagnosis')}</label>
                  <input
                    className={styles.formInput}
                    value={editedResult.diagnosis || ''}
                    onChange={(e) => updateField('diagnosis', e.target.value)}
                  />
                </div>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <label className={styles.formLabel}>{t('labelAllergies')}</label>
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
                  <label className={styles.formLabel}>{t('labelMedicalHistory')}</label>
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
                  <label className={styles.formLabel}>{t('labelInvestigations')}</label>
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
                  <label className={styles.formLabel}>{t('labelInstructions')}</label>
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
                  <label className={styles.formLabel}>{t('labelFollowUp')}</label>
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
              <h3 className={styles.sectionHeader}>{t('sectionMedications')}</h3>
              <div className={styles.medicationsWrapper}>
                <table className={styles.medicationsTable}>
                  <thead>
                    <tr>
                      <th>{t('labelDrugName')}</th>
                      <th>{t('labelGenericName')}</th>
                      <th>{t('labelDosage')}</th>
                      <th>{t('labelFrequency')}</th>
                      <th>{t('labelDuration')}</th>
                      <th>{t('labelRoute')}</th>
                      <th>{t('labelMedInstructions')}</th>
                      <th>{t('labelNlem')}</th>
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
                            {t('removeMedication')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className={styles.addMedButton} onClick={addMedication}>
                + {t('addMedication')}
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
                  {t('sectionEvidenceNotes')}
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
                            {expandedSourceIdx === idx ? t('hideSource') : t('showSource')}
                          </button>
                        </div>
                        {expandedSourceIdx === idx && (
                          <div className={styles.sourcePanel}>
                            <div className={styles.sourcePanelHeader}>{t('ragSourceHeader')}</div>
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
                                <p className={styles.sourceEmpty}>{t('ragSourceEmpty')}</p>
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
                {t('backToTranscript')}
              </button>
              <div className={styles.actionsRight}>
                <button className={styles.reanalyzeButton} onClick={handleReanalyze}>
                  {t('reanalyze')}
                </button>
                <button
                  className={`${styles.proceedButton} ${hasCriticalUnacknowledged ? styles.proceedButtonDisabled : ''}`}
                  onClick={handleProceed}
                  disabled={hasCriticalUnacknowledged}
                >
                  {t('proceedToGeneration')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
