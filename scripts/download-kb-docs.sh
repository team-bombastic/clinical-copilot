#!/usr/bin/env bash
#
# download-kb-docs.sh — Downloads publicly available Indian medical guideline PDFs
# into kb-documents/ for upload to the Bedrock Knowledge Base.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_ROOT/kb-documents"

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo "=== Downloading Indian medical reference documents ==="
echo "Output directory: $OUTPUT_DIR"
echo ""

download() {
  local url="$1"
  local filename="$2"

  if [ -f "$filename" ]; then
    echo "[SKIP] $filename already exists"
    return 0
  fi

  echo "[DOWNLOAD] $filename"
  if curl -fSL --max-time 120 -o "$filename" "$url"; then
    echo "  -> OK ($(du -h "$filename" | cut -f1))"
  else
    echo "  -> FAILED (url: $url)"
    rm -f "$filename"
    return 0  # Continue with other downloads
  fi
}

# --- NLEM 2022 (National List of Essential Medicines) ---
# Source: cdsco.gov.in — 384 essential drugs across 27 categories
download \
  "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2022/NLEM.pdf" \
  "NLEM-2022-National-List-Essential-Medicines.pdf"

# --- ICMR Standard Treatment Workflows ---
# Source: icmr.gov.in

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_T2_Diabetes.pdf" \
  "ICMR-STW-Type2-Diabetes.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Depression.pdf" \
  "ICMR-STW-Depression.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Headache.pdf" \
  "ICMR-STW-Headache.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Acute_Diarrhea.pdf" \
  "ICMR-STW-Acute-Diarrhea.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_TB.pdf" \
  "ICMR-STW-Tuberculosis.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Liver_Failure.pdf" \
  "ICMR-STW-Liver-Failure.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Dermatophytoses.pdf" \
  "ICMR-STW-Dermatophytoses.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Bacterial_skin_infections.pdf" \
  "ICMR-STW-Bacterial-Skin-Infections.pdf"

download \
  "https://main.icmr.nic.in/sites/default/files/guidelines/STW_Male_Infertility.pdf" \
  "ICMR-STW-Male-Infertility.pdf"

# --- National Formulary of India 2016 ---
# Source: ipc.gov.in — Full drug monographs
download \
  "https://ipc.gov.in/images/NFI_2016.pdf" \
  "National-Formulary-India-2016.pdf"

# --- NHM Standard Treatment Guidelines ---
# Source: nhm.gov.in

download \
  "https://nhm.gov.in/images/pdf/guidelines/nrhm-guidelines/stg/Hypertension_full.pdf" \
  "NHM-STG-Hypertension.pdf"

download \
  "https://nhm.gov.in/images/pdf/guidelines/nrhm-guidelines/stg/Snakebite_full.pdf" \
  "NHM-STG-Snakebite.pdf"

# --- ICMR Antimicrobial Resistance Guidelines ---
# Source: iamrsn.icmr.org.in
download \
  "https://iamrsn.icmr.org.in/images/pdf/ICMR_Antimicrobial_Guidelines.pdf" \
  "ICMR-Antimicrobial-Resistance-Guidelines.pdf"

echo ""
echo "=== Download complete ==="
echo "Files in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR"
echo ""
echo "Next step: run scripts/sync-kb-documents.sh to upload to S3 and trigger ingestion."
