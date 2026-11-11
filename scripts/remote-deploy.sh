#!/usr/bin/env bash
# Remote half of scripts/deploy-fenix.ps1. Uploaded to /tmp and run as: bash /tmp/fenix-remote-deploy.sh <tarball> <stamp>
# Tarball contains paths relative to ai-engine/: grg/src/..., grg/public/..., platform/...
# grg/public/* is written to BOTH /opt/fenix-os/grg/public and /opt/fenix-os/public (dual webroot parity).
set -uo pipefail

TARBALL="${1:?tarball required}"
STAMP="${2:?stamp required}"
APP=/opt/fenix-os
STAGE="/tmp/fenix-stage-$STAMP"
BACKUP="$APP/.deploy-backups/$STAMP"
PM2_IDS="${PM2_IDS:-12 11 9}"
MIN_FREE_MB="${MIN_FREE_MB:-500}"

log() { echo "[remote-deploy] $*"; }
die() { log "FATAL: $*"; exit 1; }

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
log "backup at $BACKUP"

rollback() {
  log "ROLLBACK: restoring $BACKUP"
  (cd "$BACKUP/files" 2>/dev/null && find . -type f | sed 's#^\.##' | while read -r t; do cp -p "$BACKUP/files$t" "$t"; done)
  while read -r t; do [ -n "$t" ] && rm -f "$t"; done < "$BACKUP/created.list"
  pm2 restart $PM2_IDS --update-env >/dev/null 2>&1
  sleep 5
  check_health && log "rollback healthy" || log "rollback DONE BUT HEALTH STILL FAILING - manual action needed"
  exit 1
}

check_health() {
  local ok=1
  for i in $(seq 1 12); do
    c1=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/ || true)
    c2=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4410/health || true)
    if [ "$c1" = "200" ] && [ "$c2" = "200" ]; then ok=0; break; fi
    sleep 5
  done
  log "health :3000=$c1 :4410/health=$c2"
  return $ok
}

# 3) Install.
for f in "${FILES[@]}"; do
  while read -r t; do mkdir -p "$(dirname "$t")" && cp "$STAGE/$f" "$t" || rollback; done < <(targets_for "$f")
done

# 4) Dual webroot parity for the deployed public files.
for f in "${FILES[@]}"; do
  case "$f" in grg/public/*)
    r=${f#grg/public/}
    cmp -s "$APP/grg/public/$r" "$APP/public/$r" || { log "parity mismatch: $r"; rollback; } ;;
  esac
done
log "dual webroot parity ok"

# 5) Reload processes and verify.
pm2 restart $PM2_IDS --update-env || rollback
sleep 5
for id in $PM2_IDS; do
  st=$(pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>String(x.pm_id)===process.argv[1]);console.log(p?p.pm2_env.status:"missing")})' "$id")
  log "pm2 $id: $st"
  [ "$st" = "online" ] || rollback
done
check_health || rollback

rm -rf "$STAGE" "$TARBALL"
log "DEPLOY OK ($STAMP). Backup kept at $BACKUP"
