"""Apply the verified auth and canonical jobs routing fix to the active VPS server."""

from pathlib import Path
from shutil import copy2
from datetime import datetime, timezone

source = Path('/opt/fenix-os/grg/src/server.js')
text = source.read_text()
start_marker = '      // ═══ FÊNIX OS V12.5 — UNIVERSAL SYSTEM & REALITY ROUTES (NO-AUTH GATE FOR SINGLE SHELL SPA) ═══'
end_marker = '      const cx = await app.security.authenticate(req.headers);'
assert text.count(start_marker) == 1
assert text.count(end_marker) == 1
start = text.index(start_marker)
end = text.index(end_marker, start)
text = text[:start] + text[end:]

identity_marker = '      ({ tenantId, actorId } = cx);'
assert text.count(identity_marker) == 1
text = text.replace(identity_marker, identity_marker + '''

      // Universal routes share the authenticated identity of the main API.
      if (url.pathname.startsWith('/api/v2/')) {
        const universalHandled = await handleUniversalSystemRoutes(
          req, res, url, sendJson, readJson, { tenantId, actorId }
        );
        if (universalHandled || res.headersSent) return;
      }
''', 1)

legacy_block = '''      const conversationHandled = await handleConversationRoutes(
        req, res, url, sendJson, readJson, { tenantId, actorId }
      );
      if (conversationHandled) return;'''
assert text.count(legacy_block) == 1
text = text.replace(legacy_block, '''      // /api/v2/jobs belongs to the persistent JobEngine below.
      if (!url.pathname.startsWith('/api/v2/jobs')) {
        const conversationHandled = await handleConversationRoutes(
          req, res, url, sendJson, readJson, { tenantId, actorId }
        );
        if (conversationHandled) return;
      }''', 1)

stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
copy2(source, source.with_name(source.name + '.bak-' + stamp))
source.write_text(text)
print('authenticated universal routing and canonical jobs routing patched')
