#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"; require_command docker; require_command curl
docker info --format '{{json .SecurityOptions}}' | grep -q rootless || { echo 'Docker rootless mode is required.' >&2; exit 1; }
require_file "$FENIX_DIR/.env.production"; compose config --quiet; compose ps
"$OPS_DIR/healthcheck.sh"
echo 'FENIX doctor: all configured checks passed.'
