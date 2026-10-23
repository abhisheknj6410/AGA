#!/bin/bash
set -e

BACKEND_URL="${GIS_BACKEND_URL:-http://localhost:4000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_PAYLOAD_FILE="${SCRIPT_DIR}/../data/test_cases/apollo_quantum_sabotage.json"

if [ ! -f "$BASE_PAYLOAD_FILE" ]; then
  echo "Error: Test case payload not found at $BASE_PAYLOAD_FILE"
  exit 1
fi

# Generate unique suffix so this test case can be ingested repeatedly without ID collisions
SUFFIX=$(date +%s | cut -c 6-10)
TRANSFORMED_PAYLOAD=$(node -e '
  const fs = require("fs");
  const raw = fs.readFileSync(process.argv[1], "utf8");
  const suffix = process.argv[2];
  const updated = raw.replace(/"(entity-[^"]+|evt-[^"]+|ev-[^"]+|edge-[^"]+)"/g, "\"$1_" + suffix + "\"");
  process.stdout.write(updated);
' "$BASE_PAYLOAD_FILE" "$SUFFIX")

CASE_NAME="Operation Quantum Ghost [Run #$SUFFIX]"
CASE_DESC="Industrial cyber-physical sabotage case featuring biometric palm spoofing, cryo-chamber airlock breach, disputed hotel room alibi, and SCADA coolant purge."

echo "=== 1. Creating New Case ($CASE_NAME) ==="
CASE_RESPONSE=$(curl -s -X POST "${BACKEND_URL}/api/cases" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$CASE_NAME\", \"description\": \"$CASE_DESC\"}")

CASE_ID=$(echo "$CASE_RESPONSE" | grep -o '"id":"[^"]*' | head -n1 | cut -d'"' -f4)

if [ -z "$CASE_ID" ]; then
  echo "Failed to create case. Backend response: $CASE_RESPONSE"
  exit 1
fi

echo "Case Created: $CASE_ID"

echo "=== 2. Ingesting Structured Dataset ==="
IMPORT_RESULT=$(echo "$TRANSFORMED_PAYLOAD" | curl -s -X POST "${BACKEND_URL}/api/cases/${CASE_ID}/import/json" \
  -H "Content-Type: application/json" \
  --data-binary @-)

echo "Import Result:"
echo "$IMPORT_RESULT" | grep -o '"imported":{[^}]*}' || echo "$IMPORT_RESULT"

echo "=== 3. Generating Possibilities (Hypotheses) ==="
POSS_RESULT=$(curl -s -X POST "${BACKEND_URL}/api/cases/${CASE_ID}/possibilities/generate")
echo "$POSS_RESULT" | grep -o '"generatedCount":[0-9]*' || echo "$POSS_RESULT"

echo "=== 4. Running Dominator Analysis (Choke Points) ==="
ROOT_NODE="evt-01-cargo-meet_${SUFFIX}"
TARGET_NODE="evt-06-quantum-overheat_${SUFFIX}"

CHOKE_RESULT=$(curl -s -X POST "${BACKEND_URL}/api/cases/${CASE_ID}/analysis/run" \
  -H "Content-Type: application/json" \
  -d "{
    \"algorithm\": \"DOMINATORS\",
    \"parameters\": {
      \"sourceId\": \"$ROOT_NODE\",
      \"targetId\": \"$TARGET_NODE\"
    }
  }")

SUMMARY=$(echo "$CHOKE_RESULT" | grep -o '"summary":"[^"]*' | cut -d'"' -f4)
if [ -n "$SUMMARY" ]; then
  echo "Choke Point Result: $SUMMARY"
else
  echo "$CHOKE_RESULT"
fi

echo ""
echo "=========================================================="
echo " Ingestion Successful!"
echo " Case ID : $CASE_ID"
echo " View in Web UI: http://localhost:3000"
echo "=========================================================="
