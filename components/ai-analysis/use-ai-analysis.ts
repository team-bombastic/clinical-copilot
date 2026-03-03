'use client';

import { useState, useCallback } from 'react';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fetchAuthSession } from 'aws-amplify/auth';
import { AWS_REGION_DEFAULT } from '@/constants/config';
import {
  ERR_NOT_AUTHENTICATED,
  ERR_ANALYSIS_FUNCTION_NOT_CONFIGURED,
  ERR_ANALYSIS_FAILED,
  errLambda,
} from '@/constants/errors';
import type {
  ClinicalAnalysisResult,
  Medication,
  OpdNoteData,
  PrescriptionData,
  ConsultationSegment,
  VitalSigns,
} from '@/types/clinical-analysis';

export interface ExtendedClinicalData {
  vitalSigns?: VitalSigns;
  allergies?: string[];
  medicalHistory?: string[];
  clinicalSummary?: string;
}

export interface UseAiAnalysisReturn {
  isAnalyzing: boolean;
  analysisResult: ClinicalAnalysisResult | null;
  editedResult: ClinicalAnalysisResult | null;
  error: string | null;
  analyzeTranscript: (
    transcription: string,
    segments: ConsultationSegment[],
    mode: 'dictation' | 'consultation'
  ) => Promise<void>;
  updateField: <K extends keyof ClinicalAnalysisResult>(
    field: K,
    value: ClinicalAnalysisResult[K]
  ) => void;
  addMedication: () => void;
  removeMedication: (index: number) => void;
  updateMedication: (index: number, updates: Partial<Medication>) => void;
  acknowledgeSafetyAlert: (alertId: string) => void;
  getPrescriptionData: () => PrescriptionData | null;
  getExtendedClinicalData: () => ExtendedClinicalData | null;
  clearAnalysis: () => void;
}

// Read the ai-analysis Lambda function name from amplify outputs
function getAnalysisFunctionName(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const outputs = require('../../amplify_outputs.json');
    return outputs?.custom?.aiAnalysisFunctionName || '';
  } catch {
    return '';
  }
}

export function useAiAnalysis(): UseAiAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ClinicalAnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState<ClinicalAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeTranscript = useCallback(
    async (
      transcription: string,
      segments: ConsultationSegment[],
      mode: 'dictation' | 'consultation'
    ) => {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);
      setEditedResult(null);

      try {
        const session = await fetchAuthSession();
        const credentials = session.credentials;
        if (!credentials) throw new Error(ERR_NOT_AUTHENTICATED);

        const region =
          (session.tokens?.idToken?.payload?.['custom:region'] as string) || AWS_REGION_DEFAULT;

        const lambda = new LambdaClient({
          region,
          credentials: {
            accessKeyId: credentials.accessKeyId,
            secretAccessKey: credentials.secretAccessKey,
            sessionToken: credentials.sessionToken,
          },
        });

        const userId = session.tokens?.idToken?.payload?.sub || 'anonymous';

        const payload = {
          transcriptionText: transcription,
          consultationSegments: segments,
          mode,
          userId,
        };

        const functionName = getAnalysisFunctionName();
        if (!functionName) {
          throw new Error(ERR_ANALYSIS_FUNCTION_NOT_CONFIGURED);
        }

        const response = await lambda.send(
          new InvokeCommand({
            FunctionName: functionName,
            Payload: new TextEncoder().encode(JSON.stringify(payload)),
          })
        );

        if (response.FunctionError) {
          const errorPayload = new TextDecoder().decode(response.Payload);
          throw new Error(errLambda(errorPayload));
        }

        const result = JSON.parse(new TextDecoder().decode(response.Payload));
        const analysis = result.analysis as ClinicalAnalysisResult;

        setAnalysisResult(analysis);
        setEditedResult(structuredClone(analysis));
      } catch (err) {
        setError(err instanceof Error ? err.message : ERR_ANALYSIS_FAILED);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const updateField = useCallback(
    <K extends keyof ClinicalAnalysisResult>(field: K, value: ClinicalAnalysisResult[K]) => {
      setEditedResult((prev) => {
        if (!prev) return prev;
        return { ...prev, [field]: value };
      });
    },
    []
  );

  const addMedication = useCallback(() => {
    setEditedResult((prev) => {
      if (!prev) return prev;
      const newMed: Medication = {
        name: '',
        genericName: '',
        dosage: '',
        frequency: '',
        duration: '',
        route: 'oral',
        nlemMatch: false,
      };
      return {
        ...prev,
        medications: [...(prev.medications || []), newMed],
      };
    });
  }, []);

  const removeMedication = useCallback((index: number) => {
    setEditedResult((prev) => {
      if (!prev || !prev.medications) return prev;
      return {
        ...prev,
        medications: prev.medications.filter((_, i) => i !== index),
      };
    });
  }, []);

  const updateMedication = useCallback((index: number, updates: Partial<Medication>) => {
    setEditedResult((prev) => {
      if (!prev || !prev.medications) return prev;
      return {
        ...prev,
        medications: prev.medications.map((med, i) => (i === index ? { ...med, ...updates } : med)),
      };
    });
  }, []);

  const acknowledgeSafetyAlert = useCallback((alertId: string) => {
    setEditedResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        safetyAlerts: prev.safetyAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ),
      };
    });
  }, []);

  const getPrescriptionData = useCallback((): PrescriptionData | null => {
    if (!editedResult) return null;

    return {
      patientName: editedResult.patientName,
      age: editedResult.age,
      sex: editedResult.sex,
      date: editedResult.date,
      address: editedResult.address,
      chiefComplaints: editedResult.chiefComplaints,
      diagnosis: editedResult.diagnosis,
      medications: editedResult.medications?.map((med) => ({
        name: med.brandName || med.genericName || med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })),
      investigations: editedResult.investigations,
      instructions: editedResult.instructions,
      followUp: editedResult.followUp,
    };
  }, [editedResult]);

  const getExtendedClinicalData = useCallback((): ExtendedClinicalData | null => {
    if (!editedResult) return null;
    return {
      vitalSigns: editedResult.vitalSigns,
      allergies: editedResult.allergies,
      medicalHistory: editedResult.medicalHistory,
      clinicalSummary: editedResult.clinicalSummary,
    };
  }, [editedResult]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setEditedResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    analysisResult,
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
  };
}
