#!/usr/bin/env bash
# Exercises scripts/remote-deploy.sh backup + rollback against a THROWAWAY target under /tmp.
# Never touches /opt/fenix-os or the real PM2: APP_ROOT, PM2_BIN and HEALTH_URLS are overridden.
# Usage: bash test-remote-deploy-rollback.sh /path/to/remote-deploy.sh
set -uo pipefail
DEPLOY="${1:?path to remote-deploy.sh}"
W=$(mktemp -d /tmp/fenix-rollback-test.XXXX)
APPR="$W/app"; PASS=0; FAIL=0
ok()   { echo "PASS: $*"; PASS=$((PASS+1)); }
bad()  { echo "FAIL: $*"; FAIL=$((FAIL+1)); }

# Fake PM2: restart succeeds, jlist reports ids online.
cat > "$W/pm2" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  restart)
    echo "fake-pm2 restart ${*:2}" >> "$(dirname "$0")/pm2.calls"
    if [ -n "${CORRUPT_BACKUP_FILE:-}" ] && [ ! -f "$(dirname "$0")/backup-corrupted" ]; then
      printf 'tamper\n' >> "$CORRUPT_BACKUP_FILE"
      touch "$(dirname "$0")/backup-corrupted"
    fi
    exit 0 ;;
  jlist) echo '[{"pm_id":12,"pm2_env":{"status":"online"}},{"pm_id":11,"pm2_env":{"status":"online"}},{"pm_id":9,"pm2_env":{"status":"online"}}]' ;;
esac
EOF
chmod +x "$W/pm2"

# Fake health endpoint: returns the HTTP code stored in $W/health.code.
PORT=$((30000 + RANDOM % 20000))
echo 200 > "$W/health.code"
node -e '
const fs=require("fs");require("http").createServer((q,s)=>{s.writeHead(Number(fs.readFileSync(process.argv[1],"utf8").trim()));s.end();}).listen(Number(process.argv[2]),"127.0.0.1");
' "$W/health.code" "$PORT" &
HP=$!
trap 'kill $HP 2>/dev/null; rm -rf "$W"' EXIT
sleep 1

reset_app() {
  rm -rf "$APPR"; mkdir -p "$APPR/grg/src" "$APPR/grg/public" "$APPR/public"
  echo "module.exports = 'v1';" > "$APPR/grg/src/a.js"
  echo "<p>v1</p>" > "$APPR/grg/public/x.html"; cp "$APPR/grg/public/x.html" "$APPR/public/x.html"
}
make_payload() { # $1 = tar path, $2 = a.js content
  local P="$W/payload"; rm -rf "$P"; mkdir -p "$P/grg/src" "$P/grg/public"
  printf '%s\n' "$2" > "$P/grg/src/a.js"
  echo "module.exports = 'new';" > "$P/grg/src/new.js"
  echo "<p>v2</p>" > "$P/grg/public/x.html"
  tar -cf "$1" -C "$P" grg
}
run_deploy() { # $1 tar, $2 stamp
  APP_ROOT="$APPR" STAGE_ROOT="$W/stages" PM2_BIN="$W/pm2" CORRUPT_BACKUP_FILE="${CORRUPT_BACKUP_FILE:-}" HEALTH_URLS="http://127.0.0.1:$PORT/" HEALTH_TRIES=2 HEALTH_SLEEP_S=0 \
  RESTART_SETTLE_S=0 MIN_FREE_MB=1 bash "$DEPLOY" "$1" "$2" "$(sha256sum "$1" | cut -d' ' -f1)" > "$W/out.$2" 2>&1
}
run_deploy_with_hash() { # $1 tar, $2 stamp, $3 expected sha256
  APP_ROOT="$APPR" STAGE_ROOT="$W/stages" PM2_BIN="$W/pm2" HEALTH_URLS="http://127.0.0.1:$PORT/" HEALTH_TRIES=2 HEALTH_SLEEP_S=0 \
  RESTART_SETTLE_S=0 MIN_FREE_MB=1 bash "$DEPLOY" "$1" "$2" "$3" > "$W/out.$2" 2>&1
}

# 1) Happy path: files installed, dual webroot written, backup kept.
reset_app; make_payload "$W/p1.tar" "module.exports = 'v2';"
run_deploy "$W/p1.tar" rbt-1; rc=$?
[ $rc = 0 ] && ok "happy path exit 0" || { bad "happy path exit $rc"; cat "$W/out.rbt-1"; }
grep -q v2 "$APPR/grg/src/a.js" && grep -q v2 "$APPR/public/x.html" && [ -f "$APPR/grg/src/new.js" ] && ok "happy path installed + dual webroot" || bad "happy path content"
grep -q v1 "$APPR/.deploy-backups/rbt-1/files$APPR/grg/src/a.js" && ok "happy path backup holds v1" || bad "happy path backup"
[ -f "$APPR/.deploy-backups/rbt-1/files.sha256" ] && grep -q 'backup sha256 verified' "$W/out.rbt-1" && ok "backup manifest created and verified before install" || bad "backup manifest missing or not verified"
(cd "$APPR/.deploy-backups/rbt-1" && sha256sum -c files.sha256 created.sha256 >/dev/null) && ok "backup manifest independently validates saved files" || bad "backup manifest checksum mismatch"
[ -f "$APPR/.deploy-backups/rbt-1/installed.sha256" ] && grep -q 'installed sha256 verified' "$W/out.rbt-1" && ok "installed files verified against staged payload" || bad "installed manifest missing or not verified"
sha256sum -c "$APPR/.deploy-backups/rbt-1/installed.sha256" >/dev/null && ok "installed manifest independently validates live targets" || bad "installed target checksum mismatch"

# 2) Health fails after restart -> rollback restores v1 and removes created files, exit 1.
reset_app; echo 500 > "$W/health.code"; make_payload "$W/p2.tar" "module.exports = 'v2';"
run_deploy "$W/p2.tar" rbt-2; rc=$?
[ $rc = 2 ] && grep -q 'manual action required' "$W/out.rbt-2" && ok "health failure after rollback exits 2 and requires operator" || bad "health failure exit $rc without operator escalation"
grep -q ROLLBACK "$W/out.rbt-2" && ok "rollback triggered" || bad "rollback not triggered"
grep -q v1 "$APPR/grg/src/a.js" && grep -q v1 "$APPR/grg/public/x.html" && grep -q v1 "$APPR/public/x.html" && ok "rollback restored v1 in src + both webroots" || bad "rollback content not restored"
[ -f "$APPR/.deploy-backups/rbt-2/files.sha256" ] && grep -q 'rollback sha256 verified' "$W/out.rbt-2" && ok "rollback restoration verified against backup hashes" || bad "rollback hashes missing or not verified"
[ ! -e "$APPR/grg/src/new.js" ] && ok "rollback removed newly created file" || bad "created file left behind"
[ "$(grep -c restart "$W/pm2.calls")" -ge 3 ] && ok "pm2 restarted on deploy and on rollback (fake pm2)" || bad "pm2 restart calls: $(cat "$W/pm2.calls")"
echo 200 > "$W/health.code"

# 3) Syntax error in payload -> aborts before touching the app.
reset_app; make_payload "$W/p3.tar" "module.exports = ;"
run_deploy "$W/p3.tar" rbt-3; rc=$?
[ $rc = 1 ] && grep -q 'node --check failed' "$W/out.rbt-3" && ok "syntax error aborts" || bad "syntax error rc=$rc"
grep -q v1 "$APPR/grg/src/a.js" && [ ! -e "$APPR/grg/src/new.js" ] && ok "syntax error left app untouched" || bad "app modified on syntax error"

# 4) Path outside allowed roots -> refused.
reset_app; mkdir -p "$W/evil/etc"; echo x > "$W/evil/etc/passwd"; tar -cf "$W/p4.tar" -C "$W/evil" etc
run_deploy "$W/p4.tar" rbt-4; rc=$?
[ $rc = 1 ] && grep -q 'outside allowed roots' "$W/out.rbt-4" && ok "foreign path refused" || bad "foreign path rc=$rc"

# 5) A tampered backup is never used for rollback; distinguish the failure for operator action.
reset_app; echo 500 > "$W/health.code"; make_payload "$W/p5.tar" "module.exports = 'v2';"
CORRUPT_BACKUP_FILE="$APPR/.deploy-backups/rbt-5/files$APPR/grg/src/a.js"; export CORRUPT_BACKUP_FILE
run_deploy "$W/p5.tar" rbt-5; rc=$?; unset CORRUPT_BACKUP_FILE
[ $rc = 2 ] && grep -q 'backup hash verification failed' "$W/out.rbt-5" && ok "tampered backup refused with operator exit 2" || bad "tampered backup exit=$rc"
[ "$(cat "$APPR/grg/src/a.js")" = "module.exports = 'v2';" ] && ok "unverified backup was not restored" || bad "tampered backup was restored"

# 6) A transfer hash mismatch is rejected before extraction, backup, or target writes.
reset_app; make_payload "$W/p6.tar" "module.exports = 'v2';"
run_deploy_with_hash "$W/p6.tar" rbt-6 "$(printf '%064d' 0)"; rc=$?
[ $rc = 1 ] && grep -q 'archive sha256 mismatch' "$W/out.rbt-6" && ok "archive hash mismatch rejected" || bad "archive mismatch exit=$rc"
[ "$(cat "$APPR/grg/src/a.js")" = "module.exports = 'v1';" ] && [ ! -e "$APPR/.deploy-backups/rbt-6" ] && ok "archive mismatch left app and backup untouched" || bad "archive mismatch changed target"

echo "RESULT: $PASS passed, $FAIL failed"
[ $FAIL = 0 ]
