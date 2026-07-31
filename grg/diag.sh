#!/usr/bin/env bash
set -eu

API="http://localhost:4400"

echo "=== AUTH ==="
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"grg-admin","password":"grg123"}')
echo "$LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Token OK' if d.get('token') else 'Auth FAILED: '+str(d))"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

echo ""
echo "=== /health ==="
curl -s "$API/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print('STATUS:',d.get('status'),'ENV:',d.get('environment'),'STORE:',d['checks']['state-store']['adapter'],'AI:',d['checks']['ai-providers']['ok'])"

echo ""
echo "=== /api/overview ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/overview" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
m=d.get('metrics',{})
print('projects:', m.get('projects'), 'repos:', m.get('repositories'), 'capabilities:', m.get('capabilities'), 'cityNodes:', m.get('cityNodes'))
"

echo ""
echo "=== /api/connectors ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/connectors" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
for c in d.get('connectors',[]):
  print(c.get('connectorId'),':', c.get('state',{}).get('value'))
"

echo ""
echo "=== /api/missions ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/missions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
missions=d.get('missions',[])
print('Total missions:', len(missions))
for m in missions[:3]:
  print(' -', m.get('id'), m.get('status'), m.get('progress'))
"

echo ""
echo "=== /api/operations/state ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/operations/state" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
print('activation:', d.get('activation',{}).get('status'))
comps=d.get('components',[])
print('components:', len(comps))
for c in comps[:5]:
  print(' -', c.get('componentId'), c.get('status'))
"

echo ""
echo "=== /api/ai-city ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/ai-city" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
nodes=d.get('nodes',[])
print('city nodes:', len(nodes))
"

echo ""
echo "=== /api/jobs ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/jobs" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'error' in d: print('ERROR:', d['error']); sys.exit(1)
jobs=d.get('jobs',[])
print('jobs:', len(jobs))
for j in jobs[:5]:
  print(' -', j.get('type'), j.get('status'))
"

echo ""
echo "=== NGINX INSIDE CONTAINER ==="
docker logs fenix_frontend --tail=10 2>&1

echo ""
echo "=== LEGACY APP (port 4400 local) ==="
ps aux | grep -E 'node|server' | grep -v grep | head -5

echo ""
echo "=== CURRENT OPENRESTY config routes ==="
cat /etc/nginx/conf.d/default.conf 2>/dev/null || echo "NOT FOUND"
docker exec ic-openresty-4M98 cat /etc/nginx/conf.d/default.conf 2>/dev/null || true

echo ""
echo "=== WHAT IS RUNNING ON 4400 ==="
ss -tlnp sport = :4400 2>/dev/null || netstat -tlnp | grep :4400
