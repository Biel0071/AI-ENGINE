from pathlib import Path
from shutil import copy2

server = Path('/opt/fenix-os/grg/src/server.js')
source = server.read_text()
edits = [
    ("const { handleLivingCityRoutes } = require('./api/living-city-routes');", "const { handleLivingCityRoutes } = require('./api/living-city-routes');\nconst { handleProjectWorkspaceRoutes } = require('./api/project-workspace-routes');"),
    ("      if (await handleLivingCityRoutes(req, res, url, app, sendJson, { tenantId, actorId })) return;", "      if (await handleLivingCityRoutes(req, res, url, app, sendJson, { tenantId, actorId })) return;\n      if (await handleProjectWorkspaceRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId })) return;"),
]
for before, after in edits:
    if source.count(before) != 1:
        raise SystemExit(f'Expected one insertion point, found {source.count(before)}: {before[:60]}')
    source = source.replace(before, after, 1)
backup = server.with_name('server.js.pre-project-ide-20260923')
if backup.exists():
    raise SystemExit(f'Backup already exists: {backup}')
copy2(server, backup)
server.write_text(source)
print('Patched server route with backup')
