from pathlib import Path
from shutil import copy2

remote = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
candidate = Path('/tmp/universal-system-routes.guard-candidate.js')
old = remote.read_text()
new = candidate.read_text()
helper_start = "const LEGACY_PROTECTED = new Set("
helper_end = "const { execSync } = require('child_process');"
block_start = '  // 13. File Tree & Real IDE File Read/Write'
block_end = "  if (method === 'POST' && pathname === '/api/v2/terminal/exec')"
for value in (helper_start, helper_end, block_start, block_end):
    if new.count(value) != 1:
        raise SystemExit(f'Candidate marker count invalid: {value}')
for value in ("const path = require('path');", block_start, block_end, 'module.exports = { handleUniversalSystemRoutes };'):
    if old.count(value) != 1:
        raise SystemExit(f'Remote marker count invalid: {value}')
helper = new[new.index(helper_start):new.index(helper_end)]
block = new[new.index(block_start):new.index(block_end)]
patched = old.replace("const path = require('path');\n", "const path = require('path');\n\n" + helper, 1)
patched = patched[:patched.index(block_start)] + block + patched[patched.index(block_end):]
patched = patched.replace('module.exports = { handleUniversalSystemRoutes };', 'module.exports = { handleUniversalSystemRoutes, resolveLegacyProjectFile };', 1)
backup = remote.with_name('universal-system-routes.js.pre-file-guard-20260923')
if backup.exists():
    raise SystemExit(f'Backup already exists: {backup}')
copy2(remote, backup)
remote.write_text(patched)
print('Patched legacy file guard while preserving VPS-specific routes')
