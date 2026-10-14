from pathlib import Path
from datetime import datetime, timezone

path = Path('/opt/fenix-os/grg/src/server.js')
source = path.read_text()
start = source.index('    // Check auth via headers, cookies, or dev fallback', source.index("server.on('upgrade'"))
end = source.index('    wss.handleUpgrade(request, socket, head, (ws) => {', start)
replacement = '''    request.headers = headers;
    const context = await app.security.authenticate(request.headers).catch(() => null);
    if (!context || context.readOnly) return socket.destroy();

'''
backup = path.with_name(f'server.js.bak-ws-{datetime.now(timezone.utc):%Y%m%d%H%M%S}')
backup.write_text(source)
path.write_text(source[:start] + replacement + source[end:])
print('WebSocket authentication patched; backup:', backup.name)
