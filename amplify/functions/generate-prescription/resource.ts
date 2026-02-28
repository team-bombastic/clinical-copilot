import { defineFunction } from '@aws-amplify/backend';

export const generatePrescription = defineFunction({
  name: 'generate-prescription',
  entry: './handler.ts',
  timeoutSeconds: 180,
  memoryMB: 1024,
});
