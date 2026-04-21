#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
E2E_DIR="$ROOT_DIR/tests/e2e"

MORTGAGE_APP_URL="${MORTGAGE_APP_URL:-http://localhost:3099}"
SHIPGATE_API_URL="${SHIPGATE_API_URL:-http://localhost:4000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }

STARTED_MORTGAGE_APP=false
cleanup() {
    if [ "$STARTED_MORTGAGE_APP" = true ]; then
        log "Stopping mortgage app..."
        kill "$MORTGAGE_APP_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo ""
echo "========================================"
echo "  Shipgate Nightly Regression Simulator"
echo "========================================"
echo ""

# Step 1: Check / start mortgage app
log "Checking mortgage app at $MORTGAGE_APP_URL..."
if curl -sf "$MORTGAGE_APP_URL" > /dev/null 2>&1; then
    ok "Mortgage app already running"
else
    warn "Mortgage app not running, starting it..."
    cd "$ROOT_DIR/apps/mortgage-app"
    pnpm build > /dev/null 2>&1
    pnpm preview &
    MORTGAGE_APP_PID=$!
    STARTED_MORTGAGE_APP=true

    for i in $(seq 1 15); do
        if curl -sf "$MORTGAGE_APP_URL" > /dev/null 2>&1; then
            break
        fi
        sleep 2
    done

    if curl -sf "$MORTGAGE_APP_URL" > /dev/null 2>&1; then
        ok "Mortgage app started (PID: $MORTGAGE_APP_PID)"
    else
        fail "Could not start mortgage app"
        exit 1
    fi
fi

# Step 2: Check Shipgate API
log "Checking Shipgate API at $SHIPGATE_API_URL..."
if curl -sf "$SHIPGATE_API_URL/health" > /dev/null 2>&1; then
    ok "Shipgate API is running"
else
    warn "Shipgate API not running - webhook notification will be skipped"
fi

# Step 3: Install e2e dependencies
log "Installing e2e dependencies..."
cd "$E2E_DIR"
npm install --silent 2>/dev/null
ok "Dependencies installed"

# Step 4: Clean previous results
log "Cleaning previous results..."
rm -rf allure-results allure-report output 2>/dev/null || true
ok "Cleaned"

# Step 5: Run CodeceptJS tests
log "Running CodeceptJS tests..."
TEST_EXIT=0
npx codeceptjs run --steps --plugins allure 2>&1 | tee /tmp/shipgate-test-output.log || TEST_EXIT=$?

if [ $TEST_EXIT -eq 0 ]; then
    ok "All tests passed"
else
    warn "Some tests failed (exit code: $TEST_EXIT)"
fi

# Step 6: Generate Allure report
log "Generating Allure report..."
if command -v allure &> /dev/null; then
    allure generate allure-results --clean -o allure-report 2>/dev/null
    ok "Allure report at $E2E_DIR/allure-report/index.html"
else
    warn "Allure CLI not installed - skipping report generation"
    warn "Install with: brew install allure"
fi

# Step 7: Count results
TOTAL_RESULTS=$(ls allure-results/*.json 2>/dev/null | wc -l | tr -d ' ')
PASSED=$(grep -l '"status":"passed"' allure-results/*-result.json 2>/dev/null | wc -l | tr -d ' ')
FAILED=$(grep -l '"status":"failed"' allure-results/*-result.json 2>/dev/null | wc -l | tr -d ' ')
BROKEN=$(grep -l '"status":"broken"' allure-results/*-result.json 2>/dev/null | wc -l | tr -d ' ')

# Step 8: Notify Shipgate API
log "Notifying Shipgate API..."
if curl -sf "$SHIPGATE_API_URL/health" > /dev/null 2>&1; then
    BUILD_NUM=$(date +%s)
    SIM_STATUS=$([ $TEST_EXIT -eq 0 ] && echo 'SUCCESS' || echo 'FAILURE')
    PAYLOAD=$(cat <<EOF
{
    "buildNumber": $BUILD_NUM,
    "jobName": "simulate-nightly",
    "status": "$SIM_STATUS",
    "duration": 0,
    "autoAnalyze": true
}
EOF
)
    RESPONSE=$(curl -sf -X POST "$SHIPGATE_API_URL/api/regression/webhooks/jenkins" \
        -H "Content-Type: application/json" \
        -d "$PAYLOAD" 2>&1 || true)
    if [ -n "$RESPONSE" ]; then
        ok "Webhook sent: $RESPONSE"
    else
        warn "Webhook sent but no response"
    fi
else
    warn "Shipgate API not available - skipped webhook"
fi

# Summary
echo ""
echo "========================================"
echo "  Nightly Simulation Complete"
echo "========================================"
echo ""
echo "  Results: $TOTAL_RESULTS total files"
echo "  Passed:  $PASSED"
echo "  Failed:  $FAILED"
echo "  Broken:  $BROKEN"
echo ""
if [ $TEST_EXIT -eq 0 ]; then
    echo -e "  Status:  ${GREEN}SUCCESS${NC}"
else
    echo -e "  Status:  ${RED}FAILURE${NC}"
fi
echo ""

exit $TEST_EXIT
