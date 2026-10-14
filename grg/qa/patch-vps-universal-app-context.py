from pathlib import Path
from shutil import copy2

server = Path('/opt/fenix-os/grg/src/server.js')
routes = Path('/opt/fenix-os/grg/src/api/universal-system-routes.js')
server_text = server.read_text()
route_text = routes.read_text()
server_before = 'const universalHandled = await handleUniversalSystemRoutes(\n          req, res, url, sendJson, readJson, { tenantId, actorId }\n        );'
server_after = 'const universalHandled = await handleUniversalSystemRoutes(\n          req, res, url, sendJson, readJson, { tenantId, actorId }, app\n        );'
route_before = 'async function handleUniversalSystemRoutes(req, res, url, sendJson, readJson, identity) {'
route_after = 'async function handleUniversalSystemRoutes(req, res, url, sendJson, readJson, identity, app) {'
if server_text.count(server_before) != 1 or route_text.count(route_before) != 1:
    raise SystemExit(f'Universal app-context insertion point changed: server={server_text.count(server_before)} routes={route_text.count(route_before)}')
for target in (server, routes):
    backup = target.with_name(target.name + '.pre-universal-app-context-20260924')
    if backup.exists():
        raise SystemExit(f'Backup already exists: {backup}')
    copy2(target, backup)
server.write_text(server_text.replace(server_before, server_after, 1))
routes.write_text(route_text.replace(route_before, route_after, 1))
print('Universal route now receives authenticated app context')
