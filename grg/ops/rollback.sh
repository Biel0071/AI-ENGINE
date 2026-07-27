#!/usr/bin/env sh
set -eu
. "$(dirname "$0")/common.sh"
VERSION=${1:?usage: rollback.sh VERSION}; FENIX_VERSION="$VERSION" compose up -d --no-build api worker; "$OPS_DIR/healthcheck.sh"
