#!/bin/bash
set -e
echo "Testing Fênix VPS Unreal API..."
LOGIN_RESP=$(curl -s -X POST http://127.0.0.1:4410/api/login -H "Content-Type: application/json" -d '{"tenantId":"grg","userId":"grg-admin","password":"admin"}')
TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token: $LOGIN_RESP"
  exit 1
fi

echo "Got token: ${TOKEN:0:15}..."

echo "--- 1. Testing /api/v2/unreal/health ---"
HEALTH_RESP=$(curl -s -H "Cookie: fenix_session=$TOKEN" http://127.0.0.1:4410/api/v2/unreal/health)
echo "$HEALTH_RESP"

echo "--- 2. Testing /api/v2/unreal/world-snapshot ---"
SNAP_RESP=$(curl -s -H "Cookie: fenix_session=$TOKEN" http://127.0.0.1:4410/api/v2/unreal/world-snapshot)
echo "$SNAP_RESP" | head -c 350
echo ""

echo "--- 3. Verifying Gateway :3000 ---"
curl -s -o /dev/null -w "Gateway HTTP Code: %{http_code}\n" http://127.0.0.1:3000/app

echo "--- 4. Verifying dual webroot parity ---"
diff -qr --exclude='*.bak*' --exclude='*.before-*' /opt/fenix-os/public /opt/fenix-os/grg/public
echo "DUAL PARITY VERIFIED 100%!"
