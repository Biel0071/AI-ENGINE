#!/usr/bin/env bash
set -e

echo "=== DEPLOYING PHASE 54: AUTONOMOUS EVOLUTION ENGINE & GRG UNIVERSAL HUB TO VPS ==="

TAR_FILE="/tmp/fenix-phase54.tar.gz"

if [ ! -f "$TAR_FILE" ]; then
  echo "Error: $TAR_FILE not found!"
  exit 1
fi

echo "1. Backing up existing files..."
mkdir -p /root/grg-space-backups/phase54-backup/
cp -f /opt/fenix-os/grg/src/evolution/autonomous-mission-queue.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/src/evolution/fenix-autonomous-loop.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/src/api/autonomous-loop-routes.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/src/services/rea-intelligence-engine.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/src/api/rea-memory-index-routes.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /root/grg-space-backups/phase54-backup/ || true
cp -f /opt/fenix-os/grg/public/operations-live.js /root/grg-space-backups/phase54-backup/ || true

echo "2. Extracting into /opt/fenix-os/ ..."
tar -xzf "$TAR_FILE" -C /opt/fenix-os/

echo "3. Enforcing 100% dual webroot parity between /opt/fenix-os/grg/public/ and /opt/fenix-os/public/ ..."
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /opt/fenix-os/public/fenix-world-3d.js
cp -f /opt/fenix-os/grg/public/operations-live.js /opt/fenix-os/public/operations-live.js

echo "4. Verifying remote syntax with node -c ..."
node -c /opt/fenix-os/grg/src/evolution/autonomous-mission-queue.js
node -c /opt/fenix-os/grg/src/evolution/fenix-autonomous-loop.js
node -c /opt/fenix-os/grg/src/api/autonomous-loop-routes.js
node -c /opt/fenix-os/grg/src/services/rea-intelligence-engine.js
node -c /opt/fenix-os/grg/src/api/rea-memory-index-routes.js
node -c /opt/fenix-os/grg/public/fenix-world-3d.js
node -c /opt/fenix-os/grg/public/operations-live.js

echo "5. Restarting PM2 processes (fenix-backend and fenix-frontend)..."
pm2 restart fenix-backend --update-env
pm2 restart fenix-frontend --update-env

echo "6. Probing live endpoints..."
for i in {1..15}; do
  sleep 2
  HTTP_FE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/app || echo "000")
  HTTP_BE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4410/health || echo "000")
  if [ "$HTTP_FE" = "200" ] && [ "$HTTP_BE" = "200" ]; then
    break
  fi
done

echo "Frontend HTTP status: $HTTP_FE"
echo "Backend HTTP status: $HTTP_BE"

if [ "$HTTP_FE" != "200" ]; then
  echo "Error: Frontend returned $HTTP_FE instead of 200"
  exit 1
fi

if [ "$HTTP_BE" != "200" ]; then
  echo "Error: Backend returned $HTTP_BE instead of 200"
  exit 1
fi

echo "=== VPS DEPLOYMENT PHASE 54 COMPLETED SUCCESSFULLY & 100% ONLINE ==="
