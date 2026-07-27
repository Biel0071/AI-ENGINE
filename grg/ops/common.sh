#!/usr/bin/env sh
set -eu
OPS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
FENIX_DIR=$(CDPATH= cd -- "$OPS_DIR/.." && pwd)
COMPOSE_FILE="$FENIX_DIR/docker-compose.enterprise.yml"
compose() { docker compose --env-file "$FENIX_DIR/.env.production" -f "$COMPOSE_FILE" "$@"; }
require_command() { command -v "$1" >/dev/null 2>&1 || { echo "required command missing: $1" >&2; exit 1; }; }
require_file() { test -f "$1" || { echo "required file missing: $1" >&2; exit 1; }; }
