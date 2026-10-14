from pathlib import Path
from shutil import copy2

app = Path('/opt/fenix-os/grg/src/app.js')
old = app.read_text()
needle = "dockerHost: runtimeEnv.DOCKER_HOST, enforceRootless: true });"
replacement = "dockerHost: runtimeEnv.DOCKER_HOST, enforceRootless: true, cpuMode: runtimeEnv.FENIX_SANDBOX_CPU_MODE || 'quota' });"
if old.count(needle) != 1 or replacement in old:
    raise SystemExit('Unexpected app sandbox wiring')
backup = app.with_name('app.js.pre-sandbox-cpu-mode-20260924')
if backup.exists():
    raise SystemExit('Backup already exists')
copy2(app, backup)
app.write_text(old.replace(needle, replacement, 1))
print('Wired explicit CPU mode')
