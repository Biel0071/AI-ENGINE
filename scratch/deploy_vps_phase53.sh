#!/usr/bin/env bash
set -e

echo "=== DEPLOYING PHASE 53: GLOBAL EVOLUTION (FASES 1-14) TO VPS ==="

TAR_FILE="/tmp/fenix-phase53.tar.gz"

if [ ! -f "$TAR_FILE" ]; then
  echo "Error: $TAR_FILE not found!"
  exit 1
fi

echo "1. Backing up existing files..."
mkdir -p /root/grg-space-backups/phase53-backup/
cp -f /opt/fenix-os/grg/src/memory/project-memory-index.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/src/services/rea-intelligence-engine.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/src/api/rea-memory-index-routes.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/src/api/project-workspace-routes.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/index.html /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/project-ide-live.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/fenix-flow-graph.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/office-live.js /root/grg-space-backups/phase53-backup/ || true
cp -f /opt/fenix-os/grg/public/memory-live.js /root/grg-space-backups/phase53-backup/ || true

echo "2. Extracting into /opt/fenix-os/ ..."
tar -xzf "$TAR_FILE" -C /opt/fenix-os/

echo "3. Enforcing 100% dual webroot parity between /opt/fenix-os/grg/public/ and /opt/fenix-os/public/ ..."
cp -f /opt/fenix-os/grg/public/index.html /opt/fenix-os/public/index.html
cp -f /opt/fenix-os/grg/public/project-ide-live.js /opt/fenix-os/public/project-ide-live.js
cp -f /opt/fenix-os/grg/public/fenix-flow-graph.js /opt/fenix-os/public/fenix-flow-graph.js
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /opt/fenix-os/public/fenix-world-3d.js
cp -f /opt/fenix-os/grg/public/office-live.js /opt/fenix-os/public/office-live.js
cp -f /opt/fenix-os/grg/public/memory-live.js /opt/fenix-os/public/memory-live.js

echo "4. Verifying remote syntax with node -c ..."
node -c /opt/fenix-os/grg/src/memory/project-memory-index.js
node -c /opt/fenix-os/grg/src/services/rea-intelligence-engine.js
node -c /opt/fenix-os/grg/src/api/rea-memory-index-routes.js
node -c /opt/fenix-os/grg/src/api/project-workspace-routes.js
node -c /opt/fenix-os/grg/public/project-ide-live.js
node -c /opt/fenix-os/grg/public/fenix-flow-graph.js
node -c /opt/fenix-os/grg/public/fenix-world-3d.js
node -c /opt/fenix-os/grg/public/office-live.js
node -c /opt/fenix-os/grg/public/memory-live.js

echo "5. Restarting PM2 processes (fenix-backend and fenix-frontend)..."
pm2 restart fenix-backend --update-env
pm2 restart fenix-frontend --update-env

echo "6. Probing live endpoints..."
sleep 9
HTTP_FE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/app)
HTTP_BE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4410/health)

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

echo "=== VPS DEPLOYMENT PHASE 53 COMPLETED SUCCESSFULLY & 100% ONLINE ==="
