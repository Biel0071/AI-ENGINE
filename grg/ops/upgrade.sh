#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"
"$OPS_DIR/backup.sh" >/dev/null
compose build --pull api; compose up -d --remove-orphans; "$OPS_DIR/healthcheck.sh"
