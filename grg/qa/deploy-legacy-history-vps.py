from pathlib import Path
from shutil import copy2

remote = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
candidate = Path('/tmp/universal-system-routes.history-candidate.js')
old = remote.read_text()
new = candidate.read_text()
helper_start = 'async function recordLegacyProjectEdit('
helper_end = "const { execSync } = require('child_process');"
block_start = '  // 13. File Tree & Real IDE File Read/Write'
block_end = "  if (method === 'POST' && pathname === '/api/v2/terminal/exec')"
for marker in (helper_start, helper_end, block_start, block_end, "const path = require('path');"):
    if new.count(marker) != 1:
        raise SystemExit(f'Candidate marker invalid: {marker}')
for marker in (helper_end, block_start, block_end, "const path = require('path');"):
    if old.count(marker) != 1:
        raise SystemExit(f'Remote marker invalid: {marker}')
if helper_start in old or "const crypto = require('node:crypto');" in old:
    raise SystemExit('History already deployed')
helper = new[new.index(helper_start):new.index(helper_end)]
block = new[new.index(block_start):new.index(block_end)]
patched = old.replace("const path = require('path');", "const path = require('path');\nconst crypto = require('node:crypto');", 1)
patched = patched.replace(helper_end, helper + helper_end, 1)
patched = patched[:patched.index(block_start)] + block + patched[patched.index(block_end):]
backup = remote.with_name('universal-system-routes.js.pre-legacy-history-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(remote, backup)
remote.write_text(patched)
print('Deployed legacy file history while preserving other VPS routes')
