/**
 * Script de injeção do FenixAutonomousLoop no server.js
 * Substitui o bloco server.close canônico para adicionar o loop e o stop.
 */
const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'src', 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Verifica se já foi injetado
if (content.includes('FenixAutonomousLoop') && content.includes('autonomousLoop.stop()')) {
  console.log('[inject] Loop autônomo já integrado no server.js. Nada a fazer.');
  process.exit(0);
}

// BLOCO A INSERIR — após `runLocalBatch();` e antes de `const originalClose`
const INSERT_AFTER = `    runLocalBatch();\r\n  }\r\n\r\n  const originalClose = server.close.bind(server);`;
const INSERT_REPLACEMENT = `    runLocalBatch();\r\n  }\r\n\r\n  // ── FÊNIX AUTONOMOUS LOOP — OBSERVE → DECIDE → EXECUTE → VALIDATE → LEARN ──\r\n  let autonomousLoop = null;\r\n  if (options.autonomousLoop !== false) {\r\n    const _resolveActor = async () => {\r\n      try {\r\n        const state = await app.store.read();\r\n        const tenant = (state.tenants || []).find(t => t.status === 'active') || { id: 'grg' };\r\n        const actor = (state.memberships || []).find(m => m.tenantId === tenant.id && m.status === 'active')?.userId\r\n          || (state.users || []).find(u => u.tenantId === tenant.id && u.status === 'active')?.id\r\n          || 'grg-admin';\r\n        return { tenantId: tenant.id, actorId: actor };\r\n      } catch (_) { return { tenantId: 'grg', actorId: 'grg-admin' }; }\r\n    };\r\n    _resolveActor().then(({ tenantId, actorId }) => {\r\n      autonomousLoop = new FenixAutonomousLoop({ app, tenantId, actorId,\r\n        intervalMs: Number(process.env.FENIX_AUTONOMOUS_LOOP_INTERVAL_MS || 60_000), logger });\r\n      server.autonomousLoop = autonomousLoop;\r\n      if (process.env.FENIX_AUTONOMOUS_LOOP_AUTOSTART !== 'false') {\r\n        setTimeout(() => autonomousLoop.start(), 10_000);\r\n        logger.info?.({ event: 'autonomous.loop.scheduled', tenantId, actorId });\r\n      } else {\r\n        logger.info?.({ event: 'autonomous.loop.standby' });\r\n      }\r\n    }).catch(err => logger.error({ event: 'autonomous.loop.init.failed', error: err.message }));\r\n  }\r\n\r\n  const originalClose = server.close.bind(server);`;

// BLOCO server.close — adiciona stop do autonomousLoop
const CLOSE_OLD = `    if (typeof app.close === 'function') {\r\n      app.close().catch(() => {});\r\n    }\r\n    return originalClose(cb);\r\n  };`;
const CLOSE_NEW = `    if (server.autonomousLoop) { server.autonomousLoop.stop(); server.autonomousLoop = null; }\r\n    if (typeof app.close === 'function') {\r\n      app.close().catch(() => {});\r\n    }\r\n    return originalClose(cb);\r\n  };`;

if (!content.includes(INSERT_AFTER.replace(/\\r\\n/g, '\r\n'))) {
  // tenta com \n apenas
  const INSERT_AFTER_LF = INSERT_AFTER.replace(/\r\n/g, '\n');
  const INSERT_REPLACEMENT_LF = INSERT_REPLACEMENT.replace(/\r\n/g, '\n');
  if (content.includes(INSERT_AFTER_LF)) {
    content = content.replace(INSERT_AFTER_LF, INSERT_REPLACEMENT_LF);
    const CLOSE_OLD_LF = CLOSE_OLD.replace(/\r\n/g, '\n');
    const CLOSE_NEW_LF = CLOSE_NEW.replace(/\r\n/g, '\n');
    content = content.replace(CLOSE_OLD_LF, CLOSE_NEW_LF);
  } else {
    console.error('[inject] Bloco-alvo não encontrado. Verifique o server.js manualmente.');
    process.exit(1);
  }
} else {
  content = content.replace(INSERT_AFTER, INSERT_REPLACEMENT);
  content = content.replace(CLOSE_OLD, CLOSE_NEW);
}

fs.writeFileSync(serverPath, content, 'utf8');
console.log('[inject] FenixAutonomousLoop integrado com sucesso no server.js.');
