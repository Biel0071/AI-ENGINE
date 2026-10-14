"""Preserve the bounded discovery summary on the active VPS JobEngine."""

from pathlib import Path
from shutil import copy2
from datetime import datetime, timezone

source = Path('/opt/fenix-os/grg/src/runtime/job-engine.js')
text = source.read_text()
needle = "      readiness: result.readiness?.id ? { id: result.readiness.id, status: result.readiness.status } : undefined,"
assert text.count(needle) == 1
addition = """
      scan: result.scan?.id ? { id: result.scan.id, status: result.scan.status, resourceCount: result.scan.resourceCount } : undefined,
      changes: Number.isInteger(result.changes) ? result.changes : undefined,"""
assert 'scan: result.scan?.id' not in text
stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
copy2(source, source.with_name(source.name + '.bak-' + stamp))
source.write_text(text.replace(needle, needle + addition, 1))
print('bounded discovery job summary patched')
