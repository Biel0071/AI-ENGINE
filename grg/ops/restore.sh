#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"
BACKUP=${1:-}; test "${2:-}" = --confirm-destructive || { echo 'usage: restore.sh BACKUP --confirm-destructive' >&2; exit 2; }
require_file "$BACKUP"; require_file "$BACKUP.sha256"; (cd "$(dirname "$BACKUP")" && sha256sum -c "$(basename "$BACKUP").sha256")
compose exec -T postgres pg_restore --clean --if-exists -U "${POSTGRES_USER:-fenix}" -d "${POSTGRES_DB:-fenix}" < "$BACKUP"
"$OPS_DIR/healthcheck.sh"
