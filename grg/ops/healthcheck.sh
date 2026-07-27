#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"; require_command curl
attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:${FENIX_PORT:-4400}/health" >/dev/null; do attempt=$((attempt + 1)); test "$attempt" -lt 30 || { compose ps; exit 1; }; sleep 2; done
echo 'FENIX health check: OK'
