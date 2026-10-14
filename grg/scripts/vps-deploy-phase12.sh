#!/usr/bin/env bash
set -e

echo "=== [1/7] Moving modules into production tree ==="
mkdir -p /opt/fenix-os/grg/src/evolution /opt/fenix-os/grg/src/ops /opt/fenix-os/grg/src/api /opt/fenix-os/grg/test /opt/fenix-os/data/sessions

cp -v /tmp/fenix-phase12/evolution/*.js /opt/fenix-os/grg/src/evolution/
cp -v /tmp/fenix-phase12/ops/*.js /opt/fenix-os/grg/src/ops/
cp -v /tmp/fenix-phase12/api/*.js /opt/fenix-os/grg/src/api/
cp -v /tmp/fenix-phase12/server.js /opt/fenix-os/grg/src/server.js
cp -v /tmp/fenix-phase12/test/*.js /opt/fenix-os/grg/test/

echo "=== [2/7] Checking remote JavaScript syntax ==="
for f in /opt/fenix-os/grg/src/evolution/*.js /opt/fenix-os/grg/src/ops/*.js /opt/fenix-os/grg/src/server.js /opt/fenix-os/grg/src/api/autonomous-loop-routes.js; do
  node -c "$f"
done
echo "All syntax checks passed."

echo "=== [3/7] Running 7 evolution test suites on VPS ==="
cd /opt/fenix-os/
for t in \
  grg/test/evolution-queue.test.js \
  grg/test/evolution-session.test.js \
  grg/test/snapshot-rollback.test.js \
  grg/test/resource-governor.test.js \
  grg/test/evolution-worker.test.js \
  grg/test/supervisor.test.js \
  grg/test/evolution-anti-loop.test.js; do
  echo "Running $t on VPS..."
  node "$t"
done

echo "=== [4/7] Registering PM2 #18: fenix-evolution-worker ==="
pm2 delete fenix-evolution-worker 2>/dev/null || true
pm2 start /opt/fenix-os/grg/src/evolution/fenix-evolution-worker.js \
  --name fenix-evolution-worker \
  --node-args="--max-old-space-size=512"

echo "=== [5/7] Registering PM2 #19: fenix-supervisor ==="
pm2 delete fenix-supervisor 2>/dev/null || true
pm2 start /opt/fenix-os/grg/src/ops/fenix-supervisor.js \
  --name fenix-supervisor \
  --node-args="--max-old-space-size=256"

echo "=== [6/7] Updating PM2 #16: fenix-backend with FENIX_DEDICATED_WORKER=true ==="
pm2 restart fenix-backend --update-env

echo "=== [7/7] Saving PM2 state and checking health ==="
pm2 save

sleep 4
echo "=== PM2 STATUS ==="
pm2 list

echo "=== HEALTH RESPONSES ==="
echo "--- Backend (4410):"
curl -s http://127.0.0.1:4410/api/health
echo ""
echo "--- Frontend (3000):"
curl -s http://127.0.0.1:3000/api/health
echo ""
echo "--- Evolution Worker (4420):"
curl -s http://127.0.0.1:4420/health
echo ""
echo "--- Supervisor (4430):"
curl -s http://127.0.0.1:4430/health
echo ""
echo "--- Reciprocal Heartbeat via Backend Proxy (4410):"
curl -s http://127.0.0.1:4410/api/v2/autonomous/heartbeat
echo ""
