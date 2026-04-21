#!/usr/bin/env bash
set -euo pipefail

SHIPGATE_API_URL="${SHIPGATE_API_URL:-http://localhost:4000}"

echo "Triggering Shipgate analysis via webhook..."
echo "API: $SHIPGATE_API_URL/webhooks/jenkins"
echo ""

PAYLOAD=$(cat <<EOF
{
    "event": "build_complete",
    "job": "manual-trigger",
    "build": $(date +%s),
    "status": "${1:-SUCCESS}",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "trigger": "manual",
    "allure_report": "${ALLURE_REPORT_URL:-}"
}
EOF
)

echo "Payload:"
echo "$PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$PAYLOAD"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SHIPGATE_API_URL/webhooks/jenkins" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    echo "Analysis triggered successfully."
else
    echo "Failed to trigger analysis (HTTP $HTTP_CODE)."
    exit 1
fi
