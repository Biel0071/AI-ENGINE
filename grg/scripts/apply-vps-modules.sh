#!/usr/bin/env bash
set -e

echo "=== Applying Fênix OS Universal Engineering Modules ==="

# 1. Move files into place
mv /tmp/universal-system-model.js /opt/fenix-os/grg/src/world-model/universal-system-model.js
mv /tmp/universal-engineering-engine.js /opt/fenix-os/grg/src/intelligence/universal-engineering-engine.js
mv /tmp/universal-digital-twin.js /opt/fenix-os/grg/src/digital-twin/universal-digital-twin.js
mv /tmp/digital-twin-engine.js /opt/fenix-os/grg/src/digital-twin/digital-twin-engine.js
mv /tmp/autonomous-evolution-controller.js /opt/fenix-os/grg/src/evolution/autonomous-evolution-controller.js
mv /tmp/universal-system-routes.js /opt/fenix-os/grg/src/api/universal-system-routes.js

# 2. Syntax check
echo "Checking remote syntax..."
node -c /opt/fenix-os/grg/src/world-model/universal-system-model.js
node -c /opt/fenix-os/grg/src/intelligence/universal-engineering-engine.js
node -c /opt/fenix-os/grg/src/digital-twin/universal-digital-twin.js
node -c /opt/fenix-os/grg/src/digital-twin/digital-twin-engine.js
node -c /opt/fenix-os/grg/src/evolution/autonomous-evolution-controller.js
node -c /opt/fenix-os/grg/src/api/universal-system-routes.js
echo "All remote syntax checks passed."

# 3. Reload PM2 backend
echo "Reloading PM2 #16 (fenix-backend)..."
pm2 reload 16

sleep 3

echo "=== Verifying Live Remote Endpoints ==="
AUTH_TOKEN="c71b131efe4b926d5bdf976fc915a05ccfebf30836e1f0b5bc40079782fa7a29"

# Test heartbeat
echo "1. Autonomous Heartbeat:"
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://127.0.0.1:4410/api/v2/autonomous/heartbeat || true
echo ""

# Test digital twin city state
echo "2. Digital Twin City State:"
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://127.0.0.1:4410/api/v2/digital-twin/city-state || true
echo ""

# Test reciprocity verify
echo "3. Reciprocity Verify:"
curl -s -X POST -H "Authorization: Bearer $AUTH_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Remote Test","frontendActions":[{"id":"t1","method":"GET","endpoint":"/api/v2/test"}],"backendRoutes":[{"method":"GET","path":"/api/v2/test"}],"hasPersistence":true,"hasTests":true}' \
  http://127.0.0.1:4410/api/v2/engineering/reciprocity/verify || true
echo ""

echo "=== VPS Deployment & Verification Complete ==="
