import { defineFunction } from '@aws-amplify/backend';

export const aiAnalysis = defineFunction({
  name: 'ai-analysis',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 1024,
});
