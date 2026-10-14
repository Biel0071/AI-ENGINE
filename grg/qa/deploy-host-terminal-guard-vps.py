from pathlib import Path
from shutil import copy2

remote = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
candidate = Path('/tmp/universal-system-routes.terminal-candidate.js')
old = remote.read_text()
new = candidate.read_text()
start = "  if (method === 'POST' && pathname === '/api/v2/terminal/exec')"
end = '\n  return false;\n}\n\nmodule.exports ='
if any(text.count(marker) != 1 for text in (old, new) for marker in (start, end)):
    raise SystemExit('Unexpected terminal markers')
if 'runtime.host_command.started' in old:
    raise SystemExit('Guard already deployed')
block = new[new.index(start):new.index(end)]
backup = remote.with_name('universal-system-routes.js.pre-host-terminal-guard-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(remote, backup)
remote.write_text(old[:old.index(start)] + block + old[old.index(end):])
print('Deployed host terminal permission and audit guard')
