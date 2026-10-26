#!/usr/bin/env bash
set -e

echo "=== DEPLOYING REALITY-FIRST ENGINEERING & ZERO-MOCK PIPELINE TO VPS ==="

TAR_FILE="/tmp/fenix-reality-first.tar.gz"

if [ ! -f "$TAR_FILE" ]; then
  echo "Error: $TAR_FILE not found!"
  exit 1
fi

echo "1. Backing up existing files..."
mkdir -p /root/grg-space-backups/reality-first-backup/
cp -f /opt/fenix-os/grg/public/project-ide-live.js /root/grg-space-backups/reality-first-backup/ || true
cp -f /opt/fenix-os/grg/public/login.html /root/grg-space-backups/reality-first-backup/ || true
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /root/grg-space-backups/reality-first-backup/ || true
cp -f /opt/fenix-os/grg/public/memory-live.js /root/grg-space-backups/reality-first-backup/ || true

echo "2. Extracting into /opt/fenix-os/ ..."
tar -xzf "$TAR_FILE" -C /opt/fenix-os/

echo "3. Enforcing dual webroot parity between /opt/fenix-os/grg/public/ and /opt/fenix-os/public/ ..."
cp -f /opt/fenix-os/grg/public/project-ide-live.js /opt/fenix-os/public/project-ide-live.js
cp -f /opt/fenix-os/grg/public/login.html /opt/fenix-os/public/login.html
cp -f /opt/fenix-os/grg/public/fenix-world-3d.js /opt/fenix-os/public/fenix-world-3d.js
cp -f /opt/fenix-os/grg/public/memory-live.js /opt/fenix-os/public/memory-live.js

echo "4. Verifying remote syntax with node -c ..."
node -c /opt/fenix-os/grg/src/projects/local-project-catalog.js
node -c /opt/fenix-os/grg/src/projects/local-project-status-scanner.js
node -c /opt/fenix-os/grg/src/api/local-project-management-routes.js
node -c /opt/fenix-os/grg/src/kernel/access-control.js
node -c /opt/fenix-os/grg/src/auth/auth.js
node -c /opt/fenix-os/grg/src/api/project-mirror-routes.js
node -c /opt/fenix-os/grg/src/world-model/world-state-engine.js
node -c /opt/fenix-os/grg/src/api/living-city-routes.js
node -c /opt/fenix-os/grg/src/server.js
node -c /opt/fenix-os/grg/public/project-ide-live.js
node -c /opt/fenix-os/grg/public/fenix-world-3d.js
node -c /opt/fenix-os/grg/public/memory-live.js

echo "5. Restarting PM2 processes (fenix-backend and fenix-frontend)..."
pm2 restart fenix-backend --update-env
pm2 restart fenix-frontend --update-env

echo "6. Probing endpoints..."
sleep 6
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

echo "=== VPS DEPLOYMENT REALITY-FIRST COMPLETED & ONLINE ==="
