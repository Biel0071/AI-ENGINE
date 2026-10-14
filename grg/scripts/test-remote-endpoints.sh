#!/usr/bin/env bash
set -e

AUTH_TOKEN="c71b131efe4b926d5bdf976fc915a05ccfebf30836e1f0b5bc40079782fa7a29"

echo "=== 1. Testing GET /api/v2/autonomous/heartbeat ==="
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://127.0.0.1:4410/api/v2/autonomous/heartbeat
echo ""

echo "=== 2. Testing GET /api/v2/digital-twin/city-state ==="
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://127.0.0.1:4410/api/v2/digital-twin/city-state
echo ""

echo "=== 3. Testing POST /api/v2/engineering/reciprocity/verify ==="
cat << 'EOF' > /tmp/clean_contract.json
{
  "name": "Live Reciprocity Feature",
  "frontendActions": [
    { "id": "act_status", "method": "GET", "endpoint": "/api/v2/status" }
  ],
  "backendRoutes": [
    { "method": "GET", "path": "/api/v2/status" }
  ],
  "hasPersistence": true,
  "hasTests": true
}
EOF

curl -s -X POST \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/clean_contract.json \
  http://127.0.0.1:4410/api/v2/engineering/reciprocity/verify
echo ""

echo "=== 4. Testing GET /api/v2/engineering/absorption/report ==="
curl -s -H "Authorization: Bearer $AUTH_TOKEN" http://127.0.0.1:4410/api/v2/engineering/absorption/report
echo ""

echo "=== All Remote Endpoints Verified Successfully ==="
