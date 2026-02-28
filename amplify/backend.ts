import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { batchTranscribe } from './functions/batch-transcribe/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  batchTranscribe,
});

// -- Authenticated user policies (streaming transcribe + translate) --
const authenticatedRole = backend.auth.resources.authenticatedUserIamRole;

authenticatedRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: [
      'transcribe:StartStreamTranscription',
      'transcribe:StartStreamTranscriptionWebSocket',
    ],
    resources: ['*'],
  })
);

authenticatedRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['translate:TranslateText'],
    resources: ['*'],
  })
);

// Grant authenticated user permission to invoke the batch-transcribe Lambda
const batchFn = backend.batchTranscribe.resources.lambda;

authenticatedRole.addToPrincipalPolicy(
  new PolicyStatement({
    actions: ['lambda:InvokeFunction'],
    resources: [batchFn.functionArn],
  })
);

// -- Lambda permissions --
// S3 access to the audio bucket
const bucket = backend.storage.resources.bucket;
bucket.grantReadWrite(batchFn);
bucket.grantDelete(batchFn);

// Pass bucket name as env var
backend.batchTranscribe.addEnvironment(
  'STORAGE_BUCKET_NAME',
  bucket.bucketName
);

// Transcribe + Translate permissions for Lambda
batchFn.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'transcribe:StartTranscriptionJob',
      'transcribe:GetTranscriptionJob',
    ],
    resources: ['*'],
  })
);

batchFn.addToRolePolicy(
  new PolicyStatement({
    actions: ['translate:TranslateText'],
    resources: ['*'],
  })
);

// Comprehend is needed when Translate uses SourceLanguageCode: 'auto'
batchFn.addToRolePolicy(
  new PolicyStatement({
    actions: ['comprehend:DetectDominantLanguage'],
    resources: ['*'],
  })
);

// Export the Lambda function name so the client can reference it
backend.addOutput({
  custom: {
    batchTranscribeFunctionName: batchFn.functionName,
  },
});
