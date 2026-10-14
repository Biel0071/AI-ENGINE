#!/usr/bin/env sh
set -eu
echo "LEGACY_BURN_TEST_DISABLED: this script overwrote production secrets and restarted a retired runtime." >&2
exit 1