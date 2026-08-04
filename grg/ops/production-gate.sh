#!/bin/bash
# ============================================================================
# FENIX PRODUCTION GATE — checklist objetiva de deploy.
#
# Regra: o deploy do frontend unico SO acontece quando TODOS os itens obrigatorios
# estao verdes. Se um unico item obrigatorio falhar, o gate sai != 0 e o deploy NAO
# deve acontecer. Itens que NAO podem ser auto-verificados localmente (Refresh OIDC,
# Rollback de deploy) sao marcados REQUER_CONTEXTO -- nao fake-passam (REALITY FIRST).
#
# Uso:  bash ops/production-gate.sh
# Saida: tabela de itens + veredito FINAL (GREEN=deploy liberado / RED=bloqueado).
# ============================================================================
set -u
cd "$(dirname "$0")/.."   # raiz do grg/

NODE="${FENIX_NODE:-/c/Program Files/Adobe/Adobe Photoshop 2023/node.exe}"
PORT=4600
BASE="http://127.0.0.1:$PORT"
DATA=".data/gate-$$.json"
LOG=".gate-server-$$.log"

PASS=0; FAIL=0; MANUAL=0
declare -a ROWS

row() { ROWS+=("$1|$2|$3"); }        # nome | status | detalhe
ok()   { PASS=$((PASS+1)); row "$1" "GREEN" "$2"; }
bad()  { FAIL=$((FAIL+1)); row "$1" "RED"   "$2"; }
man()  { MANUAL=$((MANUAL+1)); row "$1" "MANUAL" "$2"; }

cleanup() {
  [ -n "${SRVPID:-}" ] && kill "$SRVPID" 2>/dev/null
  rm -f "$DATA" "$LOG" 2>/dev/null
}
trap cleanup EXIT

echo "=== FENIX PRODUCTION GATE ==="
echo "node: $NODE"
echo

# --- 1. Build API: os modulos de entrada resolvem (require sem erro) ---
if "$NODE" -e "require('./src/app.js'); require('./src/server.js'); require('./src/ai-runtime/provider-registry.js'); require('./src/ai-runtime/ai-router.js');" 2>/tmp/gate-build.$$; then
  ok "Build API" "app.js/server.js/provider-registry/ai-router resolvem"
else
  bad "Build API" "erro de require: $(head -1 /tmp/gate-build.$$ 2>/dev/null)"
fi
rm -f /tmp/gate-build.$$ 2>/dev/null

# --- 2. Build Front: HTML oficial existe e referencia assets presentes ---
FRONT_OK=1; FRONT_DET=""
for f in public/login.html public/index.html public/app.html; do
  [ -f "$f" ] || { FRONT_OK=0; FRONT_DET="$f ausente"; break; }
done
if [ "$FRONT_OK" = 1 ]; then
  # cada src/href local referenciado pelo app.html deve existir em public/
  MISSING=""
  for asset in $(grep -oE '(src|href)="/[^"]+"' public/app.html 2>/dev/null | sed -E 's/.*"\/([^"]+)".*/\1/' | grep -vE '^https?:|^api/|^app$' | sort -u); do
    [ -f "public/$asset" ] || MISSING="$MISSING $asset"
  done
  if [ -z "$MISSING" ]; then ok "Build Front" "3 telas + assets do app.html presentes"
  else bad "Build Front" "assets ausentes:$MISSING"; fi
else
  bad "Build Front" "$FRONT_DET"
fi

# --- Sobe UM servidor para os checks de runtime (login, views, health, 401) ---
FENIX_ALLOW_DEV_HEADERS=0 NODE_ENV=development PORT=$PORT FENIX_PORT=$PORT \
  FENIX_BIND_ADDRESS=127.0.0.1 FENIX_BOOTSTRAP_TENANT_ID=grg FENIX_BOOTSTRAP_TENANT_NAME="GRG FENIX" \
  FENIX_BOOTSTRAP_ADMIN_USER=gate-admin FENIX_BOOTSTRAP_ADMIN_PASSWORD=gate-local-not-secret \
  GRG_LLM=0 GRG_DATA_FILE="$DATA" "$NODE" src/server.js > "$LOG" 2>&1 &
SRVPID=$!
# espera o server escutar (ate 25s)
UP=0
for i in $(seq 1 25); do
  code=$(curl -s -m3 -o /dev/null -w "%{http_code}" "$BASE/health" 2>/dev/null)
  [ "$code" = "200" ] && { UP=1; break; }
  sleep 1
done

if [ "$UP" != 1 ]; then
  bad "Server boot" "servidor nao respondeu /health em 25s (ver $LOG)"
  bad "Health" "servidor fora do ar"
  bad "Login" "servidor fora do ar"
  bad "401 sem login" "servidor fora do ar"
  bad "Dashboard" "servidor fora do ar"
  bad "19 Views" "servidor fora do ar"
else
  # --- 3. Health ---
  H=$(curl -s -m6 "$BASE/health")
  if echo "$H" | grep -q '"status":"ready"'; then ok "Health" "/health status=ready"
  else bad "Health" "/health nao esta ready: $(echo "$H" | head -c 80)"; fi

  # --- 4. 401 sem login ---
  C=$(curl -s -m6 -o /dev/null -w "%{http_code}" "$BASE/api/overview")
  if [ "$C" = "401" ]; then ok "401 sem login" "/api/overview sem token = 401"
  else bad "401 sem login" "/api/overview devolveu $C (esperado 401)"; fi

  # --- 5. Dashboard serve ---
  D=$(curl -s -m6 "$BASE/app")
  if echo "$D" | grep -q "GRG Services OS"; then ok "Dashboard" "/app serve o workspace"
  else bad "Dashboard" "/app nao serve o HTML esperado"; fi

  # --- 6. Login real (form path: POST /api/login) ---
  LOGIN=$(curl -s -m8 -X POST "$BASE/api/login" -H "content-type: application/json" \
    -d '{"tenantId":"grg","userId":"gate-admin","password":"gate-local-not-secret"}')
  TOKEN=$(echo "$LOGIN" | sed -nE 's/.*"token":"([^"]+)".*/\1/p')
  if [ -n "$TOKEN" ]; then ok "Login" "POST /api/login devolve token"
  else bad "Login" "login sem token: $(echo "$LOGIN" | head -c 80)"; fi

  # --- 7. 19 Views apos autenticacao ---
  if [ -n "$TOKEN" ]; then
    VIEWS="overview capabilities connectors agents/swarm digital-twin/operational observability/metrics governance/readiness-matrix governance/simulation-audit security/encryption/status performance/hot-memory performance/speed-score ai/telemetry events insights missions"
    VN=0; VOK=0; VBAD=""
    for e in $VIEWS; do
      VN=$((VN+1))
      c=$(curl -s -m8 -o /dev/null -w "%{http_code}" -H "authorization: Bearer $TOKEN" "$BASE/api/$e")
      if [ "$c" = "200" ]; then VOK=$((VOK+1)); else VBAD="$VBAD $e($c)"; fi
    done
    if [ "$VOK" = "$VN" ]; then ok "19 Views" "$VOK/$VN endpoints de view = 200 com token"
    else bad "19 Views" "$VOK/$VN ok; falharam:$VBAD"; fi
  else
    bad "19 Views" "sem token (login falhou)"
  fi

  # --- 11. Logs: o servidor emitiu logs estruturados no boot ---
  if [ -s "$LOG" ] && grep -qE "GRG Services OS:|Kernel|ACTIVATION|PHASE" "$LOG"; then
    ok "Logs" "servidor emite logs de boot/kernel"
  else
    bad "Logs" "sem logs de boot detectados"
  fi
fi

# --- 8. Testes E2E (e2e-http) ---
E2E=$("$NODE" -e "require('./test/e2e-http.test.js')" 2>&1)
E2E_OK=$(echo "$E2E" | grep -cE "^ok ")
E2E_NO=$(echo "$E2E" | grep -cE "^not ok ")
if [ "$E2E_NO" = 0 ] && [ "$E2E_OK" -gt 0 ]; then ok "Testes E2E" "e2e-http $E2E_OK/$E2E_OK"
else bad "Testes E2E" "e2e-http: $E2E_OK ok, $E2E_NO falhas"; fi

# --- 9. Testes unitarios (nucleo critico: auth, security, control-plane, ai-runtime) ---
UNIT_FILES="auth control-plane security-governance ai-router fabricated-response aiplatform-job-polling compose-runtime-env container-entrypoint"
UOK=0; UNO=0; UBAD=""
for f in $UNIT_FILES; do
  [ -f "test/$f.test.js" ] || continue
  r=$("$NODE" -e "require('./test/$f.test.js')" 2>&1)
  o=$(echo "$r" | grep -cE "^ok "); n=$(echo "$r" | grep -cE "^not ok ")
  UOK=$((UOK+o)); UNO=$((UNO+n))
  [ "$n" != 0 ] && UBAD="$UBAD $f($n)"
done
if [ "$UNO" = 0 ] && [ "$UOK" -gt 0 ]; then ok "Testes unitarios" "nucleo $UOK ok, 0 falhas"
else bad "Testes unitarios" "$UOK ok, $UNO falhas:$UBAD"; fi

# --- 10. Refresh Token: fluxo OIDC (so existe em producao com IdP) ---
man "Refresh Token" "fluxo OIDC refresh so em producao (IdP real); dev usa token direto sem refresh"

# --- 12. Rollback testado: procedimento de deploy, nao auto-verificavel local ---
man "Rollback" "verificar no deploy: backup do compose/imagem anterior + restore testado na .22"

# ============================ RELATORIO ============================
echo
printf "%-18s %-8s %s\n" "ITEM" "STATUS" "DETALHE"
printf "%-18s %-8s %s\n" "----" "------" "-------"
for r in "${ROWS[@]}"; do
  IFS='|' read -r nome st det <<< "$r"
  printf "%-18s %-8s %s\n" "$nome" "$st" "$det"
done
echo
echo "verde=$PASS  vermelho=$FAIL  manual=$MANUAL"
echo
if [ "$FAIL" = 0 ]; then
  echo "VEREDITO: GREEN — itens automaticos OK. Resolver os $MANUAL itens MANUAL (Refresh/Rollback) no contexto de deploy antes do cutover."
  exit 0
else
  echo "VEREDITO: RED — $FAIL item(ns) obrigatorio(s) falhou(aram). Deploy BLOQUEADO."
  exit 1
fi
