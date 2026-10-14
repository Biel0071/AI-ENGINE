from pathlib import Path
from shutil import copy2

target = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
old = target.read_text()
needle = "      fs.copyFileSync(resolved, resolved + '.fenix-bak');"
replacement = "      if (fs.existsSync(resolved + '.fenix-bak') && fs.lstatSync(resolved + '.fenix-bak').isSymbolicLink()) return sendJson(res, 403, { error: 'Backup is not a regular project file' });\n" + needle
if old.count(needle) != 1 or replacement in old:
    raise SystemExit('Unexpected backup guard state')
backup = target.with_name('universal-system-routes.js.pre-backup-guard-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(target, backup)
target.write_text(old.replace(needle, replacement, 1))
print('Added backup symlink guard')
