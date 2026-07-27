#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"
BACKUP_DIR=${FENIX_BACKUP_DIR:-/var/backups/grg-fenix}; sudo install -d -m 0700 "$BACKUP_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ); TARGET="$BACKUP_DIR/postgres-$STAMP.dump"
compose exec -T postgres pg_dump -U "${POSTGRES_USER:-fenix}" -d "${POSTGRES_DB:-fenix}" -Fc | sudo tee "$TARGET" >/dev/null
sudo test -s "$TARGET"; sudo sha256sum "$TARGET" | sudo tee "$TARGET.sha256" >/dev/null
echo "$TARGET"
