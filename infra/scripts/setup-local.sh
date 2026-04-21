#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }

echo ""
echo "========================================"
echo "  Shipgate Local Setup"
echo "========================================"
echo ""

cd "$ROOT_DIR"

# Step 1: Check prerequisites
log "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    fail "Node.js not found. Install Node.js 20+ from https://nodejs.org"
fi
ok "Node.js $(node --version)"

if ! command -v pnpm &> /dev/null; then
    warn "pnpm not found, installing..."
    npm install -g pnpm
fi
ok "pnpm $(pnpm --version)"

if ! command -v docker &> /dev/null; then
    fail "Docker not found. Install Docker Desktop from https://docker.com"
fi
ok "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# Step 2: Create .env if missing
log "Checking environment config..."
if [ ! -f .env ]; then
    cat > .env <<EOF
DATABASE_URL="postgresql://shipgate:shipgate@localhost:5432/shipgate?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=4000
NODE_ENV=development
EOF
    ok "Created .env file"
else
    ok ".env already exists"
fi

# Step 3: Start infrastructure services
log "Starting Postgres, Redis, and Jenkins..."
docker compose up -d postgres redis jenkins
ok "Postgres, Redis, and Jenkins running (Jenkins UI: http://localhost:8080 - first boot may take a few minutes)"

# Wait for Postgres
log "Waiting for Postgres to be ready..."
for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U shipgate -d shipgate > /dev/null 2>&1; then
        break
    fi
    sleep 1
done
ok "Postgres is ready"

# Step 4: Install dependencies
log "Installing dependencies..."
pnpm install
ok "Dependencies installed"

# Step 5: Generate Prisma client
log "Generating Prisma client..."
pnpm db:generate
ok "Prisma client generated"

# Step 6: Push database schema
log "Pushing database schema..."
pnpm db:push
ok "Database schema applied"

# Step 7: Seed demo data
log "Seeding demo data..."
pnpm db:seed || warn "Seed script not configured yet (this is ok for first setup)"

# Step 8: Install e2e dependencies
log "Installing e2e test dependencies..."
cd tests/e2e && npm install && cd "$ROOT_DIR"
ok "E2E dependencies installed"

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "  Start all services:"
echo "    pnpm dev"
echo ""
echo "  Or start individually:"
echo "    pnpm dev:api        → API at http://localhost:4000"
echo "    pnpm dev:web        → UI  at http://localhost:3000"
echo "    cd apps/mortgage-app && pnpm dev"
echo "                        → Mortgage App at http://localhost:3099"
echo ""
echo "  Run tests:"
echo "    cd tests/e2e && npx codeceptjs run --steps"
echo ""
echo "  Simulate nightly run:"
echo "    ./infra/scripts/simulate-nightly.sh"
echo ""
echo "  Jenkins only (if not already up):"
echo "    pnpm jenkins:up"
echo "    Create job \"shipgate-regression\" from repo Jenkinsfile, then Shipgate can poll it."
echo ""
