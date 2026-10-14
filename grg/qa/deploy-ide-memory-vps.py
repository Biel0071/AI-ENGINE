from pathlib import Path
from shutil import copy2

app = Path('/opt/fenix-os/grg/src/app.js')
source = app.read_text()
before = '    vectorStore, memory, hierarchy, knowledgeGraph, eventStore, fabricEvents, registry, fabric, fabricProjection,'
after = '    vectorStore, memory, memoryEngine: baseMemoryEngine, hierarchy, knowledgeGraph, eventStore, fabricEvents, registry, fabric, fabricProjection,'
if source.count(before) != 1:
    raise SystemExit(f'Expected one app export insertion point, found {source.count(before)}')
backup = app.with_name('app.js.pre-ide-memory-20260923')
if backup.exists():
    raise SystemExit(f'Backup already exists: {backup}')
copy2(app, backup)
app.write_text(source.replace(before, after, 1))
print('Exported direct persistent memory engine with backup')
