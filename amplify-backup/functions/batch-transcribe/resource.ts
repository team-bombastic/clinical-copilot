import { defineFunction } from '@aws-amplify/backend';

export const batchTranscribe = defineFunction({
  name: 'batch-transcribe',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 512,
});
