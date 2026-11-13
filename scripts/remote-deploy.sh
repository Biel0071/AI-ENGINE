#!/usr/bin/env bash
# Remote half of scripts/deploy-fenix.ps1. Uploaded to /tmp and run as: bash /tmp/fenix-remote-deploy.sh <tarball> <stamp>
# Tarball contains paths relative to ai-engine/: grg/src/..., grg/public/..., platform/...
# grg/public/* is written to BOTH /opt/fenix-os/grg/public and /opt/fenix-os/public (dual webroot parity).
set -uo pipefail

TARBALL="${1:?tarball required}"
STAMP="${2:?stamp required}"
EXPECTED_ARCHIVE_SHA256="${3:?source archive sha256 required}"
APP="${APP_ROOT:-/opt/fenix-os}"
STAGE_ROOT="${STAGE_ROOT:-/tmp}"
STAGE="$STAGE_ROOT/fenix-stage-$STAMP"
BACKUP="$APP/.deploy-backups/$STAMP"
PM2_IDS="${PM2_IDS:-12 11 9}"
PM2="${PM2_BIN:-pm2}"
MIN_FREE_MB="${MIN_FREE_MB:-500}"
HEALTH_URLS="${HEALTH_URLS:-http://127.0.0.1:3000/ http://127.0.0.1:4410/health}"
HEALTH_TRIES="${HEALTH_TRIES:-12}"
# APP_ROOT / PM2_BIN / HEALTH_URLS / HEALTH_TRIES exist so the backup+rollback path can be exercised
# against a throwaway target (scripts/test-remote-deploy-rollback.sh) without touching production.

log() { echo "[remote-deploy] $*"; }
die() { log "FATAL: $*"; exit 1; }
file_hash() { local sum; sum=$(sha256sum "$1") || return 1; printf '%s' "${sum%% *}"; }

[[ "$EXPECTED_ARCHIVE_SHA256" =~ ^[[:xdigit:]]{64}$ ]] || die "invalid source archive sha256"
[ -f "$TARBALL" ] || die "archive not found: $TARBALL"
actual_archive_sha256=$(file_hash "$TARBALL") || die "cannot hash received archive"
[ "${actual_archive_sha256,,}" = "${EXPECTED_ARCHIVE_SHA256,,}" ] || die "archive sha256 mismatch"
log "source archive sha256 verified: $actual_archive_sha256"

free_mb=$(df -Pm "$APP" | awk 'NR==2{print $4}')
[ "$free_mb" -ge "$MIN_FREE_MB" ] || die "only ${free_mb}MB free on $APP (< ${MIN_FREE_MB}MB)"

rm -rf "$STAGE" && mkdir -p "$STAGE" "$BACKUP" || die "cannot create stage/backup"
tar -xf "$TARBALL" -C "$STAGE" || die "tar extract failed"

# Map staged relative paths to one or more absolute targets.
targets_for() {
  case "$1" in
    grg/public/*) echo "$APP/$1"; echo "$APP/public/${1#grg/public/}" ;;
    grg/src/*|platform/*) echo "$APP/$1" ;;
    *) return 1 ;;
  esac
}

mapfile -t FILES < <(cd "$STAGE" && find . -type f | sed 's#^\./##' | sort)
[ "${#FILES[@]}" -gt 0 ] || die "empty payload"

# 1) Syntax check every JS in the staged payload BEFORE touching the app.
for f in "${FILES[@]}"; do
  targets_for "$f" >/dev/null || die "path outside allowed roots: $f"
  case "$f" in *.js|*.cjs) node --check "$STAGE/$f" || die "node --check failed: $f" ;; esac
done
log "syntax ok for ${#FILES[@]} staged files"

# 2) Backup replaced files; remember newly created ones for rollback.
: > "$BACKUP/created.list"
for f in "${FILES[@]}"; do
  while read -r t; do
    if [ -e "$t" ]; then mkdir -p "$BACKUP/files$(dirname "$t")" && cp -p "$t" "$BACKUP/files$t"
    else echo "$t" >> "$BACKUP/created.list"; fi
  done < <(targets_for "$f")
done
(cd "$BACKUP" && find files -type f -print0 | sort -z | xargs -0 -r sha256sum > files.sha256) || die "cannot hash backup files"
(cd "$BACKUP" && sha256sum created.list > created.sha256) || die "cannot hash created-file list"
(cd "$BACKUP" && sha256sum -c files.sha256 && sha256sum -c created.sha256) >/dev/null || die "backup hash verification failed before install"
log "backup sha256 verified at $BACKUP"

rollback() {
  log "ROLLBACK: restoring $BACKUP"
  (cd "$BACKUP" && sha256sum -c files.sha256 && sha256sum -c created.sha256) >/dev/null || { log "FATAL: backup hash verification failed; refusing unverified restore"; exit 2; }
  while IFS= read -r entry; do
    hash=${entry:0:64}; relative=${entry:66}; target="/${relative#files/}"
    mkdir -p "$(dirname "$target")" && cp -p "$BACKUP/$relative" "$target" || { log "FATAL: rollback copy failed for $target"; exit 2; }
    actual=$(file_hash "$target") || { log "FATAL: cannot hash restored file $target"; exit 2; }
    [ "$actual" = "$hash" ] || { log "FATAL: rollback hash mismatch for $target"; exit 2; }
  done < "$BACKUP/files.sha256"
  while read -r t; do [ -n "$t" ] && rm -f "$t"; done < "$BACKUP/created.list"
  log "rollback sha256 verified"
  $PM2 restart $PM2_IDS --update-env >/dev/null 2>&1
  sleep "${RESTART_SETTLE_S:-5}"
  check_health && log "rollback healthy" || { log "ROLLBACK RESTORED BUT HEALTH STILL FAILING - manual action required"; exit 2; }
  exit 1
}

check_health() {
  local ok=1 codes u c
  for i in $(seq 1 "$HEALTH_TRIES"); do
    codes=""; ok=0
    for u in $HEALTH_URLS; do
      c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$u" || true)
      codes="$codes $u=$c"; [ "$c" = "200" ] || ok=1
    done
    [ "$ok" = 0 ] && break
    sleep "${HEALTH_SLEEP_S:-5}"
  done
  log "health$codes"
  return $ok
}

# 3) Install.
: > "$BACKUP/installed.sha256"
for f in "${FILES[@]}"; do
  expected=$(file_hash "$STAGE/$f") || rollback
  while read -r t; do
    mkdir -p "$(dirname "$t")" && cp "$STAGE/$f" "$t" || rollback
    printf '%s  %s\n' "$expected" "$t" >> "$BACKUP/installed.sha256"
    actual=$(file_hash "$t") || rollback
    [ "$actual" = "$expected" ] || { log "installed hash mismatch: $t"; rollback; }
  done < <(targets_for "$f")
done
log "installed sha256 verified"

# 4) Dual webroot parity for the deployed public files.
for f in "${FILES[@]}"; do
  case "$f" in grg/public/*)
    r=${f#grg/public/}
    cmp -s "$APP/grg/public/$r" "$APP/public/$r" || { log "parity mismatch: $r"; rollback; } ;;
  esac
done
log "dual webroot parity ok"

# 5) Reload processes and verify.
$PM2 restart $PM2_IDS --update-env || rollback
sleep "${RESTART_SETTLE_S:-5}"
for id in $PM2_IDS; do
  st=$($PM2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>String(x.pm_id)===process.argv[1]);console.log(p?p.pm2_env.status:"missing")})' "$id")
  log "pm2 $id: $st"
  [ "$st" = "online" ] || rollback
done
check_health || rollback

rm -rf "$STAGE" "$TARBALL"
log "DEPLOY OK ($STAMP). Backup kept at $BACKUP"
