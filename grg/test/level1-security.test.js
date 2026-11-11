'use strict';
// LEVEL 1 SECURITY RECOVERY - comportamento HTTP real (nao inspecao textual).
// Cobre: backdoor de login, sessao de preview, escalada de privilegio, execucao de
// comandos, escrita/restauracao de arquivos, path traversal, token invalido/expirado,
// troca de identidade por header, varredura de todas as rotas de escrita.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { start } = require('../src/server');
const { loadSecurityConfig } = require('../src/security/config');

const SRC = path.join(__dirname, '..', 'src');
const strong = () => crypto.randomBytes(24).toString('base64url');
const ADMIN = { tenantId: 'grg', userId: 'grg-admin', password: strong() };
const VIEWER = { tenantId: 'grg', userId: 'level1-viewer', password: strong() };
const SUBADMIN = { tenantId: 'grg', userId: 'level1-subadmin', password: strong() };

let server; let base; let dataFile; let outsideDir;

async function login(who) {
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: who.tenantId, userId: who.userId, password: who.password, rememberMe: false }) });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, token: body.token };
}
const bearer = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
async function post(p, body, headers = { 'content-type': 'application/json' }) {
  const r = await fetch(`${base}${p}`, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, body: json };
}

before(async () => {
  dataFile = path.join(os.tmpdir(), `grg-level1-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-level1-outside-'));
  // O Reality Operator e um singleton que grava memoria em grg/memory/; no teste, isola em tmp.
  const { globalRealityOperatorKernel } = require('../src/reality-operator/reality-operator-kernel');
  const { DevelopmentMemory } = require('../src/memory/development-memory');
  globalRealityOperatorKernel.memoryEngine = new DevelopmentMemory({ memoryDir: fs.mkdtempSync(path.join(os.tmpdir(), 'grg-level1-devmem-')) });
  const securityConfig = loadSecurityConfig({ FENIX_ENV: 'test', FENIX_ENABLE_PREVIEW_SESSION: '1' });
  server = await start(0, {
    dataFile, llm: false, securityConfig,
    operationalActivation: false, autonomousEvolution: false, worldSimulation: false,
    bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Test', name: 'Level1 Admin', role: 'master_admin' },
  });
  base = `http://127.0.0.1:${server.address().port}`;
  await server.app.auth.ensureUser(VIEWER.tenantId, VIEWER.userId, VIEWER.password, 'viewer');
  await server.app.auth.ensureUser(SUBADMIN.tenantId, SUBADMIN.userId, SUBADMIN.password, 'subadmin');
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { fs.unlinkSync(dataFile); } catch {}
  try { fs.rmSync(outsideDir, { recursive: true, force: true }); } catch {}
});

// ---------------- GATE A: autenticacao ----------------
test('GATE A: trivial legacy passwords never authenticate the admin', async () => {
  for (const guess of ['admin', 'grg-admin']) {
    const r = await login({ ...ADMIN, password: guess });
    assert.equal(r.status, 403, `trivial password must be rejected`);
  }
  const real = await login(ADMIN);
  assert.equal(real.status, 200, 'the real configured password must still work after the failed guesses');
  assert.ok(real.token);
});

test('GATE A: security config never invents predictable bootstrap credentials', () => {
  assert.equal(loadSecurityConfig({ FENIX_ENV: 'development' }).bootstrapAdmin, null);
  assert.equal(loadSecurityConfig({}).bootstrapAdmin, null);
  assert.throws(() => loadSecurityConfig({ FENIX_BOOTSTRAP_ADMIN_USER: 'x' }), /user and password/);
  assert.throws(() => loadSecurityConfig({ FENIX_BOOTSTRAP_ADMIN_PASSWORD: strong() }), /user and password/);
  assert.throws(() => loadSecurityConfig({ FENIX_ENV: 'production', FENIX_BOOTSTRAP_ADMIN_USER: 'grg-admin', FENIX_BOOTSTRAP_ADMIN_PASSWORD: 'admin' }), /strong/);
  const prod = loadSecurityConfig({ FENIX_ENV: 'production', FENIX_BOOTSTRAP_ADMIN_USER: 'grg-admin', FENIX_BOOTSTRAP_ADMIN_PASSWORD: strong() });
  assert.equal(prod.bootstrapAdmin.userId, 'grg-admin');
  assert.equal(prod.production, true);
});

// ---------------- GATE B: sessoes ----------------
test('GATE B: preview sessions are disabled in production and by default', () => {
  assert.equal(loadSecurityConfig({ FENIX_ENV: 'production', FENIX_ENABLE_PREVIEW_SESSION: '1' }).allowPreviewSession, false);
  assert.equal(loadSecurityConfig({ FENIX_ENV: 'development' }).allowPreviewSession, false);
});

test('GATE B: preview session ignores client identity and stays read-only', async () => {
  const r = await post('/api/v2/preview/dev-session', { userId: 'grg-admin', tenantId: 'grg' });
  assert.equal(r.status, 200);
  assert.notEqual(r.body.session.userId, 'grg-admin', 'client-supplied identity must be ignored');
  const token = r.body.token;
  const me = await fetch(`${base}/api/me`, { headers: bearer(token) }).then((x) => x.json());
  assert.notEqual(me.role, 'master_admin');
  const exec = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version' }, bearer(token));
  assert.equal(exec.status, 403, 'preview session must not execute commands');
  const write = await post('/api/v2/reality-operator/files/edit', { filePath: path.join(outsideDir, 'x.txt'), content: 'x' }, bearer(token));
  assert.equal(write.status, 403);
});

test('GATE B: preview session cannot be minted when the preview flag is off', async () => {
  const securityConfig = loadSecurityConfig({ FENIX_ENV: 'test' });
  const file = path.join(os.tmpdir(), `grg-level1-noprev-${Date.now()}.json`);
  const s = await start(0, { dataFile: file, llm: false, securityConfig, operationalActivation: false, autonomousEvolution: false, worldSimulation: false });
  try {
    const r = await fetch(`http://127.0.0.1:${s.address().port}/api/v2/preview/dev-session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId: 'grg-admin' }) });
    assert.equal(r.status, 404);
  } finally { await new Promise((resolve) => s.close(resolve)); try { fs.unlinkSync(file); } catch {} }
});

test('GATE B: invalid, expired and header-forged identities are rejected', async () => {
  const bad = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version' }, bearer('not-a-real-token'));
  assert.equal(bad.status, 401);

  const forged = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version' }, { 'content-type': 'application/json', 'x-tenant-id': 'grg', 'x-user-id': 'grg-admin' });
  assert.equal(forged.status, 401, 'dev identity headers must not authenticate');

  const viewer = await login(VIEWER);
  const asViewerClaimingAdmin = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version' }, { ...bearer(viewer.token), 'x-user-id': 'grg-admin' });
  assert.equal(asViewerClaimingAdmin.status, 403);

  const temp = await login(VIEWER);
  await server.app.store.update((s) => {
    for (const sess of s.sessions) if (sess.userId === VIEWER.userId) sess.expiresAt = new Date(Date.now() - 1000).toISOString();
    return s;
  });
  server.app.auth.sessions.clear();
  const expired = await fetch(`${base}/api/me`, { headers: bearer(temp.token) });
  assert.equal(expired.status, 401);
});

// ---------------- GATE C: execucao e escrita ----------------
const EXEC_ROUTES = [
  ['/api/v2/reality-operator/terminal/exec', { command: 'node --version' }],
  ['/api/v2/reality-operator/command-palette', { commandId: 'terminal_exec', params: { command: 'node --version' } }],
  ['/api/v2/reality-operator/files/edit', { filePath: 'README.md', content: 'x' }],
  ['/api/v2/reality-operator/files/revert', { filePath: 'README.md' }],
  ['/api/v2/reality-operator/runtime/control', { action: 'LOGS', service: 'fenix-os' }],
  ['/api/v2/terminal/exec', { command: 'node --version' }],
];

test('GATE C: anonymous callers cannot reach any execution or file route', async () => {
  for (const [route, body] of EXEC_ROUTES) {
    const r = await post(route, body);
    assert.equal(r.status, 401, `${route} must require authentication`);
  }
});

test('GATE C: viewer and subadmin cannot execute commands or write files', async () => {
  for (const who of [VIEWER, SUBADMIN]) {
    const { token } = await login(who);
    for (const [route, body] of EXEC_ROUTES) {
      const r = await post(route, body, bearer(token));
      assert.equal(r.status, 403, `${who.userId} must be forbidden on ${route} (got ${r.status})`);
    }
  }
});

test('GATE C: admin terminal runs only allowlisted commands without a shell', async () => {
  const { token } = await login(ADMIN);
  const ok = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version' }, bearer(token));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.ok, true);
  assert.match(String(ok.body.stdout), /^v\d+/);

  const attacks = [
    'node --version; whoami',
    'node --version && id',
    'node --version | cat',
    'node -e "process.exit(0)"',
    'rm -rf /',
    'curl http://example.com',
    'node --version `id`',
    'node --version $(id)',
    'git -c core.pager=id log',
  ];
  for (const command of attacks) {
    const r = await post('/api/v2/reality-operator/terminal/exec', { command, options: { confirmed: true } }, bearer(token));
    assert.equal(r.status, 403, `command must be refused: ${command} (got ${r.status})`);
  }
  const outside = await post('/api/v2/reality-operator/terminal/exec', { command: 'node --version', cwd: outsideDir }, bearer(token));
  assert.equal(outside.status, 403, 'cwd outside the workspace must be refused');
});

test('GATE C: admin file edit and revert are confined to the workspace', async () => {
  const { token } = await login(ADMIN);
  const victim = path.join(outsideDir, 'victim.txt');
  fs.writeFileSync(victim, 'original');
  const edit = await post('/api/v2/reality-operator/files/edit', { filePath: victim, content: 'pwned' }, bearer(token));
  assert.equal(edit.status, 403);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'original');

  const traversal = await post('/api/v2/reality-operator/files/edit', { filePath: `projects/../../../../../../${path.basename(outsideDir)}/victim.txt`, content: 'pwned' }, bearer(token));
  assert.equal(traversal.status, 403);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'original');

  const revert = await post('/api/v2/reality-operator/files/revert', { filePath: victim }, bearer(token));
  assert.equal(revert.status, 403);

  const checkpoint = await post('/api/v2/reality-operator/command-palette', { commandId: 'create_checkpoint', params: { filePath: victim } }, bearer(token));
  assert.equal(checkpoint.status, 403);
  assert.equal(fs.existsSync(victim + '.fenix-bak'), false);

  const secretTarget = await post('/api/v2/reality-operator/files/edit', { filePath: '.env.production', content: 'x' }, bearer(token));
  assert.equal(secretTarget.status, 403, 'secret-bearing files are never editable');
});

// Varredura: extrai do codigo-fonte TODAS as rotas de escrita com caminho literal e
// confirma por HTTP que um viewer autenticado recebe 403 e um anonimo 401 em cada uma.
function collectWriteRoutes() {
  const files = [path.join(SRC, 'server.js'), path.join(SRC, 'chat', 'live-chat-routes.js'), path.join(SRC, 'missions', 'mission-routes.js'), path.join(SRC, 'knowledge', 'knowledge-routes.js')]
    .concat(fs.readdirSync(path.join(SRC, 'api')).filter((f) => f.endsWith('.js')).map((f) => path.join(SRC, 'api', f)));
  const routes = new Set();
  const patterns = [
    /method\s*===\s*'(POST|PUT|PATCH|DELETE)'\s*&&\s*(?:url\.)?pathname\s*===\s*'(\/[^']+)'/g,
    /(?:url\.)?pathname\s*===\s*'(\/[^']+)'\s*&&\s*(?:req\.)?method\s*===\s*'(POST|PUT|PATCH|DELETE)'/g,
    /method\s*===\s*'(POST|PUT|PATCH|DELETE)'\s*&&\s*subPath\s*===\s*'([^']+)'/g,
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const [i, re] of patterns.entries()) {
      for (const m of src.matchAll(re)) {
        if (i === 0) routes.add(`${m[1]} ${m[2]}`);
        if (i === 1) routes.add(`${m[2]} ${m[1]}`);
        if (i === 2) routes.add(`${m[1]} /api/v2/reality-operator/${m[2]}`);
      }
    }
  }
  return [...routes].filter((r) => r.split(' ')[1].startsWith('/api/'));
}

// Rotas publicas por desenho, tratadas antes da autenticacao.
const PUBLIC_WRITE_ROUTES = new Map([
  ['POST /api/login', 'login is public by definition'],
  ['POST /api/logout', 'revokes only the caller token'],
  ['POST /api/v2/preview/dev-session', 'disabled unless FENIX_ENABLE_PREVIEW_SESSION outside production; read-only session'],
  ['POST /api/test/event', 'diagnostic no-op (writes nothing), disabled in production'],
]);

test('GATE C: route-table sweep - every write route rejects viewer (403) and anonymous (401)', async () => {
  const routes = collectWriteRoutes();
  assert.ok(routes.length > 50, `expected to discover many write routes, found ${routes.length}`);
  const { token } = await login(VIEWER);
  const failures = [];
  for (const route of routes) {
    if (PUBLIC_WRITE_ROUTES.has(route)) continue;
    const [method, p] = route.split(' ');
    const anon = await fetch(`${base}${p}`, { method, headers: { 'content-type': 'application/json' }, body: '{}' });
    if (![401, 403, 404].includes(anon.status)) failures.push(`${route} anonymous -> ${anon.status}`);
    const viewer = await fetch(`${base}${p}`, { method, headers: bearer(token), body: '{}' });
    if (![403, 404].includes(viewer.status)) failures.push(`${route} viewer -> ${viewer.status}`);
  }
  assert.deepEqual(failures, [], `write routes reachable without authorization:\n${failures.join('\n')}`);

  // Rotas com caminho dinamico (regex) nao entram na extracao literal; o gate central
  // e por metodo, entao tambem as cobre. Prova com caminhos dinamicos reais.
  for (const [method, p] of [['POST', '/api/v2/projects/some-project/files'], ['PUT', '/api/fenix/projects/x/settings'], ['DELETE', '/api/v2/missions/abc'], ['PATCH', '/api/v2/anything/at/all']]) {
    const r = await fetch(`${base}${p}`, { method, headers: bearer(token), body: '{}' });
    assert.equal(r.status, 403, `${method} ${p} must be blocked for viewer by the central write gate`);
  }
});

// ---------------- GATE D: segredos ----------------
test('GATE D: no secret files are tracked by git', (t) => {
  let tracked;
  try { tracked = execFileSync('git', ['ls-files'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }
  catch { t.skip('git not available'); return; }
  const offenders = tracked.split(/\r?\n/).filter((f) => /(^|\/)\.secrets\/|secrets-vault\.json$|(^|\/)\.env(\.[a-z]+)?$/i.test(f) && !/\.env\.example$/i.test(f));
  assert.deepEqual(offenders, []);
});

test('GATE D: secret vault fails closed without FENIX_VAULT_KEY', () => {
  const { SecretVault } = require('../src/security/secret-vault');
  const saved = process.env.FENIX_VAULT_KEY;
  delete process.env.FENIX_VAULT_KEY;
  try {
    const vault = new SecretVault({ vaultPath: path.join(outsideDir, 'vault.json') });
    assert.throws(() => vault.storeSecret('openai', { apiKey: 'k' }), /FENIX_VAULT_KEY/);
    assert.equal(fs.existsSync(path.join(outsideDir, 'vault.json')), false);
  } finally { if (saved !== undefined) process.env.FENIX_VAULT_KEY = saved; }
});

// ---------------- GATE E: superficie publica ----------------
test('GATE E: backups, dotfiles and sibling paths are never served statically', async () => {
  for (const p of ['/index_frozen_backup.html', '/fenix-world-3d.js.bak', '/anything.bak', '/x.orig', '/.env', '/.secrets/ai_provider_key', '/../public-files.txt', '/%2e%2e/src/server.js']) {
    const r = await fetch(`${base}${p}`);
    assert.equal(r.status, 404, `${p} must not be served (got ${r.status})`);
  }
  const app = await fetch(`${base}/app`);
  assert.equal(app.status, 200, 'the canonical frontend must still be served');
});

test('GATE E: production health hides internal topology from anonymous callers', async () => {
  const { summarizeHealthForPublic } = require('../src/server');
  const full = { ok: true, status: 'ready', checks: { 'state-store': { adapter: 'postgresql' } }, environment: 'production', dependencies: { postgres: 'available' }, checkedAt: 'now' };
  const pub = summarizeHealthForPublic(full);
  assert.deepEqual(Object.keys(pub).sort(), ['checkedAt', 'ok', 'service', 'status']);
});

test('GATE E: production compose pins FENIX_ENV=production for api and worker', () => {
  const compose = fs.readFileSync(path.join(__dirname, '..', 'docker-compose.enterprise.yml'), 'utf8');
  assert.match(compose, /environment: &fenix-environment\s*\n\s*FENIX_ENV: production/);
  assert.match(compose, /worker:[\s\S]*?environment:\s*\n?\s*<<: \*fenix-environment|worker:[\s\S]*?environment: \*fenix-environment/);
});

// ---------------- falhas globais ----------------
test('fatal handler logs safely, closes resources and exits non-zero', async () => {
  const { createFatalHandler } = require('../src/server');
  const calls = [];
  const handler = createFatalHandler({
    log: (entry) => calls.push(['log', entry]),
    shutdown: async () => calls.push(['shutdown']),
    exit: (code) => calls.push(['exit', code]),
    timeoutMs: 1000,
  });
  const err = new Error('boom Bearer abcdef0123456789abcdef0123456789 password=hunter2');
  await handler('uncaughtException', err);
  assert.deepEqual(calls.map((c) => c[0]), ['log', 'shutdown', 'exit']);
  assert.equal(calls[2][1], 1);
  const logged = JSON.stringify(calls[0][1]);
  assert.doesNotMatch(logged, /abcdef0123456789abcdef0123456789/);
  assert.doesNotMatch(logged, /hunter2/);
});