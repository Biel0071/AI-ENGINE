from pathlib import Path
from shutil import copy2

remote = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
candidate = Path('/tmp/universal-system-routes.history-candidate.js')
old = remote.read_text()
new = candidate.read_text()
start = 'async function recordLegacyProjectEdit('
end = "const { execSync } = require('child_process');"
if any(text.count(marker) != 1 for text in (old, new) for marker in (start, end)):
    raise SystemExit('Unexpected helper markers')
helper = new[new.index(start):new.index(end)]
if 'legacy-ide-file' not in helper or 'legacy-ide-file' in old:
    raise SystemExit('Unexpected memory scope state')
backup = remote.with_name('universal-system-routes.js.pre-legacy-memory-scope-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(remote, backup)
remote.write_text(old[:old.index(start)] + helper + old[old.index(end):])
print('Adjusted legacy memory scope')
