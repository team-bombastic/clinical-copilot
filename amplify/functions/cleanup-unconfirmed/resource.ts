import { defineFunction } from '@aws-amplify/backend';

export const cleanupUnconfirmed = defineFunction({
  name: 'cleanup-unconfirmed',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 256,
  resourceGroupName: 'auth',
});
