import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { batchTranscribe } from './functions/batch-transcribe/resource';
import { aiAnalysis } from './functions/ai-analysis/resource';
import { cleanupUnconfirmed } from './functions/cleanup-unconfirmed/resource';

const backend = defineBackend({
	auth,
	data,
	storage,
	batchTranscribe,
	aiAnalysis,
	cleanupUnconfirmed,
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

// Grant authenticated user permission to invoke the ai-analysis Lambda
const analysisFn = backend.aiAnalysis.resources.lambda;

authenticatedRole.addToPrincipalPolicy(
	new PolicyStatement({
		actions: ['lambda:InvokeFunction'],
		resources: [analysisFn.functionArn],
	})
);

// -- Lambda permissions --
// S3 access to the audio bucket
const bucket = backend.storage.resources.bucket;
bucket.grantReadWrite(batchFn);
bucket.grantDelete(batchFn);

// Pass bucket name as env var
backend.batchTranscribe.addEnvironment('STORAGE_BUCKET_NAME', bucket.bucketName);

// Transcribe + Translate permissions for batch Lambda
batchFn.addToRolePolicy(
	new PolicyStatement({
		actions: ['transcribe:StartTranscriptionJob', 'transcribe:GetTranscriptionJob'],
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

// -- Knowledge Base Stack --
const kbStack = backend.createStack('KnowledgeBaseStack');

const kbDocsBucket = new s3.Bucket(kbStack, 'KBDocsBucket', {
	removalPolicy: cdk.RemovalPolicy.DESTROY,
	autoDeleteObjects: true,
});

const knowledgeBase = new bedrock.VectorKnowledgeBase(kbStack, 'ClinicalKB', {
	embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
	instruction:
		'Contains Indian medical reference documents including NLEM 2022, ICMR Standard Treatment Workflows, National Formulary of India, NHM Standard Treatment Guidelines, and ICMR Antimicrobial Resistance Guidelines. Use for clinical decision support, drug formulary lookups, and evidence-based treatment recommendations.',
});

const kbDataSource = new bedrock.S3DataSource(kbStack, 'KBDataSource', {
	bucket: kbDocsBucket,
	knowledgeBase,
	chunkingStrategy: bedrock.ChunkingStrategy.fixedSize({
		maxTokens: 500,
		overlapPercentage: 20,
	}),
});

// Grant the KB role read access to the docs bucket
kbDocsBucket.grantRead(knowledgeBase.role);

// Grant the authenticated (SSO) user read-write access so scripts can upload docs
kbDocsBucket.grantReadWrite(authenticatedRole);

// Also allow the Amplify deployer / SSO role to manage the bucket contents
kbDocsBucket.addToResourcePolicy(
	new PolicyStatement({
		actions: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
		resources: [kbDocsBucket.bucketArn, `${kbDocsBucket.bucketArn}/*`],
		principals: [new cdk.aws_iam.AccountRootPrincipal()],
	})
);

// Bedrock permissions for ai-analysis Lambda (scoped to specific KB)
analysisFn.addToRolePolicy(
	new PolicyStatement({
		actions: ['bedrock:InvokeModel'],
		resources: ['*'],
	})
);

analysisFn.addToRolePolicy(
	new PolicyStatement({
		actions: ['bedrock:Retrieve'],
		resources: [knowledgeBase.knowledgeBaseArn],
	})
);

// S3 read access for ai-analysis Lambda
bucket.grantRead(analysisFn);

// Pass env vars to ai-analysis Lambda
backend.aiAnalysis.addEnvironment('STORAGE_BUCKET_NAME', bucket.bucketName);
backend.aiAnalysis.addEnvironment('BEDROCK_REGION', 'ap-south-1');
backend.aiAnalysis.addEnvironment('KNOWLEDGE_BASE_ID', knowledgeBase.knowledgeBaseId);

// -- Cleanup Unconfirmed Users Lambda (scheduled every minute) --
const cleanupFn = backend.cleanupUnconfirmed.resources.lambda;
const userPoolId = backend.auth.resources.userPool.userPoolId;

backend.cleanupUnconfirmed.addEnvironment('USER_POOL_ID', userPoolId);

cleanupFn.addToRolePolicy(
	new PolicyStatement({
		actions: [
			'cognito-idp:ListUsers',
			'cognito-idp:AdminDeleteUser',
		],
		resources: [backend.auth.resources.userPool.userPoolArn],
	})
);

const cleanupScheduleStack = backend.createStack('CleanupScheduleStack');
const rule = new events.Rule(cleanupScheduleStack, 'CleanupUnconfirmedRule', {
	schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
});
rule.addTarget(new targets.LambdaFunction(cleanupFn));

// Export the Lambda function names + KB outputs so the client and scripts can reference them
backend.addOutput({
	custom: {
		batchTranscribeFunctionName: batchFn.functionName,
		aiAnalysisFunctionName: analysisFn.functionName,
		kbDocsBucketName: kbDocsBucket.bucketName,
		knowledgeBaseId: knowledgeBase.knowledgeBaseId,
		kbDataSourceId: kbDataSource.dataSourceId,
	},
});
