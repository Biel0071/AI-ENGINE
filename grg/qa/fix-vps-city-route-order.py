from pathlib import Path
from shutil import copy2
from datetime import datetime, timezone

path = Path('/opt/fenix-os/grg/src/server.js')
source = path.read_text()
handler = "      if (await handleLivingCityRoutes(req, res, url, app, sendJson, { tenantId, actorId })) return;\n\n"
universal = "      if (url.pathname.startsWith('/api/v2/')) {"
if source.count(handler) != 1 or source.count(universal) != 1:
    raise RuntimeError('Unexpected server route layout')
updated = source.replace(handler, '', 1).replace(universal, handler + universal, 1)
backup = path.with_name(path.name + '.before-city-route-order-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
copy2(path, backup)
path.write_text(updated)
print(f'City routes now precede legacy universal routes; backup {backup}')
