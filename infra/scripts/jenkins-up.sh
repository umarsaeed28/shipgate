#!/usr/bin/env bash
# Start Jenkins (repo-root docker-compose.yml) and wait until HTTP responds.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker &> /dev/null; then
  echo "Docker not found. Install Docker Desktop and ensure it is running."
  exit 1
fi

echo "Starting Jenkins container..."
docker compose up -d jenkins

echo "Waiting for Jenkins at http://127.0.0.1:8080 (first boot can take 1–3 minutes)..."
for _ in $(seq 1 90); do
  if curl -sf -o /dev/null --connect-timeout 2 "http://127.0.0.1:8080/login" 2>/dev/null; then
    echo ""
    echo "Jenkins is reachable: http://localhost:8080"
    echo "If this is the first run, get the admin password with:"
    echo "  docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword"
    exit 0
  fi
  sleep 2
done

echo ""
echo "Jenkins is still starting or port 8080 is in use. Check:"
echo "  docker compose ps jenkins"
echo "  docker compose logs -f jenkins"
exit 0
