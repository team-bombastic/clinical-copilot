#!/usr/bin/env bash
#
# sync-kb-documents.sh — Uploads KB documents to S3 and triggers Bedrock ingestion.
# Reads bucket name, KB ID, and data source ID from amplify_outputs.json.
#
set -euo pipefail

# Pass --ingest-only to skip uploads and just trigger ingestion
INGEST_ONLY=false
if [ "${1:-}" = "--ingest-only" ]; then
  INGEST_ONLY=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUTS_FILE="$PROJECT_ROOT/amplify_outputs.json"
DOCS_DIR="$PROJECT_ROOT/kb-documents"

# --- Validate prerequisites ---

if [ ! -f "$OUTPUTS_FILE" ]; then
  echo "ERROR: $OUTPUTS_FILE not found."
  echo "Run 'npx ampx sandbox' or 'npx amplify deploy' first to provision the stack."
  exit 1
fi

if [ ! -d "$DOCS_DIR" ] || [ -z "$(ls -A "$DOCS_DIR" 2>/dev/null)" ]; then
  echo "ERROR: $DOCS_DIR is empty or does not exist."
  echo "Run 'bash scripts/download-kb-docs.sh' first to download documents."
  exit 1
fi

# --- Read outputs ---

# The custom outputs are nested under custom key in amplify_outputs.json
KB_BUCKET=$(jq -r '.custom.kbDocsBucketName // empty' "$OUTPUTS_FILE")
KB_ID=$(jq -r '.custom.knowledgeBaseId // empty' "$OUTPUTS_FILE")
DS_ID=$(jq -r '.custom.kbDataSourceId // empty' "$OUTPUTS_FILE")

if [ -z "$KB_BUCKET" ] || [ -z "$KB_ID" ] || [ -z "$DS_ID" ]; then
  echo "ERROR: Could not read KB outputs from $OUTPUTS_FILE."
  echo "Ensure the KnowledgeBaseStack has been deployed."
  echo "  kbDocsBucketName: ${KB_BUCKET:-<missing>}"
  echo "  knowledgeBaseId:  ${KB_ID:-<missing>}"
  echo "  kbDataSourceId:   ${DS_ID:-<missing>}"
  exit 1
fi

REGION=$(jq -r '.auth.aws_region // "us-east-1"' "$OUTPUTS_FILE")

echo "=== Syncing KB documents ==="
echo "Bucket:      $KB_BUCKET"
echo "KB ID:       $KB_ID"
echo "DataSource:  $DS_ID"
echo "Region:      $REGION"
echo "Docs dir:    $DOCS_DIR"
echo ""

# --- Upload documents to S3 ---

if [ "$INGEST_ONLY" = false ]; then
  echo "[1/3] Uploading documents to S3..."
  # Use cp per-file instead of sync to avoid needing s3:ListBucket permission
  for f in "$DOCS_DIR"/*.pdf; do
    [ -f "$f" ] || continue
    BASENAME="$(basename "$f")"
    echo "  Uploading: $BASENAME"
    aws s3 cp "$f" "s3://$KB_BUCKET/$BASENAME" --region "$REGION"
  done
  echo "  -> Upload complete."
  echo ""
else
  echo "[1/3] Skipping upload (--ingest-only)"
  echo ""
fi

# --- Start ingestion job ---

echo "[2/3] Starting KB ingestion job..."
INGESTION_RESPONSE=$(aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$KB_ID" \
  --data-source-id "$DS_ID" \
  --region "$REGION" \
  --output json)

INGESTION_JOB_ID=$(echo "$INGESTION_RESPONSE" | jq -r '.ingestionJob.ingestionJobId')
echo "  -> Ingestion job started: $INGESTION_JOB_ID"
echo ""

# --- Poll for completion ---

echo "[3/3] Waiting for ingestion to complete..."
while true; do
  STATUS_RESPONSE=$(aws bedrock-agent get-ingestion-job \
    --knowledge-base-id "$KB_ID" \
    --data-source-id "$DS_ID" \
    --ingestion-job-id "$INGESTION_JOB_ID" \
    --region "$REGION" \
    --output json)

  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.ingestionJob.status')
  echo "  Status: $STATUS"

  case "$STATUS" in
    COMPLETE)
      STATS=$(echo "$STATUS_RESPONSE" | jq -r '.ingestionJob.statistics')
      echo ""
      echo "=== Ingestion complete ==="
      echo "Statistics:"
      echo "$STATS" | jq .
      exit 0
      ;;
    FAILED)
      echo ""
      echo "ERROR: Ingestion failed."
      echo "$STATUS_RESPONSE" | jq '.ingestionJob.failureReasons'
      exit 1
      ;;
    STARTING|IN_PROGRESS)
      sleep 10
      ;;
    *)
      echo "  Unknown status: $STATUS — waiting..."
      sleep 10
      ;;
  esac
done
