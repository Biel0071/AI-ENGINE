'use strict';
// Runs untrusted generated JavaScript against tests in an isolated child process.
// Isolation layers (reported back honestly in `isolation`):
//  - fresh temp dir as cwd; dir is deleted afterwards
//  - Node permission model: fs read/write only inside the temp dir; child_process/worker threads denied
//  - preload guard that makes net/http/https/dns/tls/dgram/child_process/worker_threads/cluster throw
//  - Linux + root + unshare available: separate network namespace (kernel-level "no network")
//  - empty env, wall-clock timeout with SIGKILL, heap cap, bounded stdout/stderr
const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const MAX_OUTPUT = 64 * 1024;
const BLOCKED = ['net', 'http', 'https', 'http2', 'dns', 'tls', 'dgram', 'child_process', 'worker_threads', 'cluster', 'inspector'];

const GUARD_SOURCE = `'use strict';
const Module = require('module');
const blocked = new Set(${JSON.stringify(BLOCKED)});
const load = Module._load;
Module._load = function (request, parent, isMain) {
  const name = String(request).replace(/^node:/, '');
  if (blocked.has(name)) throw new Error('sandbox: module "' + name + '" is blocked');
  return load.apply(this, arguments);
};
if (typeof globalThis.fetch === 'function') globalThis.fetch = () => Promise.reject(new Error('sandbox: network is blocked'));
`;

// tests: { kind: 'examples', cases: [{ fn, args, expected }] } | { kind: 'assert', source } | { kind: 'smoke' }
function buildHarness(tests, nonce = 'R') {
  const marker = `__RESULT_${nonce}__`;
  // References are captured and the harness/guard files are deleted BEFORE the untrusted solution
  // is loaded, so the solution cannot read the nonce or trivially patch the comparison/output.
  const head = `'use strict';
const __fs = require('node:fs');
const __util = require('node:util');
const __eq = __util.isDeepStrictEqual;
const __write = process.stdout.write.bind(process.stdout);
const __json = JSON.stringify;
const __assign = Object.assign;
const __create = Object.create;
const __M = ${JSON.stringify(marker)};
// Result records are copied onto null-prototype objects and concatenated as strings, so a solution
// that patches Object/Array.prototype (e.g. a prototype-level toJSON) cannot rewrite the serialized output.
const __rec = (o) => __json(__assign(__create(null), o));
const __emit = (o) => __write('\\n' + __M + __rec(o) + '\\n');
try { __fs.unlinkSync(__filename); __fs.unlinkSync(require('node:path').join(__dirname, 'guard.js')); } catch (_) {}
const assert = require('node:assert/strict');
let __out = '';
const __add = (r) => { __out = __out === '' ? __rec(r) : __out + ',' + __rec(r); };
let mod;
try { mod = require('./solution.js'); } catch (e) { __emit({ loaded: false, error: String(e && e.message || e) }); process.exit(0); }
`;
  let body = '';
  if (tests.kind === 'examples') {
    body = tests.cases.map((c, i) => `
try {
  const fn = mod[${JSON.stringify(c.fn)}];
  if (typeof fn !== 'function') throw new Error('function ${c.fn.replace(/[^\w$]/g, '')} is not exported');
  const actual = fn(...[${c.args}]);
  const expected = (${c.expected});
  if (!__eq(actual, expected)) throw new Error('expected ' + __json(expected) + ' but got ' + __json(actual));
  __add({ name: ${JSON.stringify(`${c.fn}(${c.args})`)}, passed: true });
} catch (e) { __add({ name: ${JSON.stringify(`case ${i + 1}: ${c.fn}(${c.args})`)}, passed: false, error: String(e && e.message || e).slice(0, 500) }); }`).join('\n');
  } else if (tests.kind === 'assert') {
    body = `
try { (function (module_exports) { const m = module_exports; Object.assign(globalThis, m);
${tests.source}
})(mod); __add({ name: 'provided assertions', passed: true }); }
catch (e) { __add({ name: 'provided assertions', passed: false, error: String(e && e.message || e).slice(0, 500) }); }`;
  } else {
    body = `
const exported = Object.keys(mod || {}).filter((k) => typeof mod[k] === 'function');
__add({ name: 'smoke: module loads and exports a function', passed: exported.length > 0, exported });`;
  }
  return `${head}${body}
__write('\\n' + __M + '{"loaded":true,"results":[' + __out + ']}\\n');
`;
}

function permissionFlag() {
  const flags = process.allowedNodeEnvironmentFlags;
  if (flags.has('--permission')) return '--permission';
  if (flags.has('--experimental-permission')) return '--experimental-permission';
  return null;
}

function canUseNetns(env) {
  if (env.FENIX_SANDBOX_NETNS === '0') return false;
  if (process.platform !== 'linux' || typeof process.getuid !== 'function' || process.getuid() !== 0) return false;
  return ['/usr/bin/unshare', '/bin/unshare'].some((p) => fs.existsSync(p));
}

async function runInSandbox({ code, tests, timeoutMs = 10_000, env = process.env }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-sbx-'));
  const realDir = fs.realpathSync(dir);
  const perm = permissionFlag();
  const netns = canUseNetns(env);
  const isolation = {
    tempDir: true, permissionModel: perm, moduleGuard: true, envCleared: true, timeoutMs,
    networkNamespace: netns,
    network: netns ? 'blocked (netns + module guard)' : 'blocked at module level only (no netns on this host)',
  };
  try {
    fs.writeFileSync(path.join(realDir, 'solution.js'), String(code));
    fs.writeFileSync(path.join(realDir, 'guard.js'), GUARD_SOURCE);
    const nonce = crypto.randomBytes(12).toString('hex');
    fs.writeFileSync(path.join(realDir, 'harness.js'), buildHarness(tests, nonce));
    const nodeArgs = ['--max-old-space-size=64'];
    // Node 20 (--experimental-permission) needs an explicit wildcard for directory contents.
    const allow = perm === '--experimental-permission' ? path.join(realDir, '*') : realDir;
    if (perm) nodeArgs.push(perm, `--allow-fs-read=${allow}`, `--allow-fs-write=${allow}`);
    nodeArgs.push('--require', path.join(realDir, 'guard.js'), path.join(realDir, 'harness.js'));
    const cmd = netns ? 'unshare' : process.execPath;
    const args = netns ? ['--net', '--', process.execPath, ...nodeArgs] : nodeArgs;
    const started = Date.now();
    const outcome = await new Promise((resolve) => {
      let stdout = ''; let stderr = ''; let timedOut = false;
      const child = spawn(cmd, args, { cwd: realDir, env: {}, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
      child.stdout.on('data', (d) => { if (stdout.length < MAX_OUTPUT) stdout += d; });
      child.stderr.on('data', (d) => { if (stderr.length < MAX_OUTPUT) stderr += d; });
      child.on('error', (error) => { clearTimeout(timer); resolve({ exitCode: null, stdout, stderr: `${stderr}${error.message}`, timedOut }); });
      child.on('close', (exitCode, signal) => { clearTimeout(timer); resolve({ exitCode, signal, stdout, stderr, timedOut }); });
    });
    const marker = `__RESULT_${nonce}__`;
    const line = outcome.stdout.split(/\r?\n/).reverse().find((l) => l.startsWith(marker));
    let parsed = null;
    try { parsed = line ? JSON.parse(line.slice(marker.length)) : null; } catch { parsed = null; }
    // Child output is untrusted: validate shape strictly instead of trusting it.
    const rawResults = Array.isArray(parsed?.results) ? parsed.results : [];
    const results = rawResults.filter((r) => r && typeof r === 'object').map((r) => ({
      name: String(r.name ?? ''), passed: r.passed === true,
      ...(r.error != null ? { error: String(r.error).slice(0, 500) } : {}),
    }));
    const expectedCount = tests.kind === 'examples' ? tests.cases.length : 1;
    const passedCount = results.filter((r) => r.passed).length;
    return {
      passed: parsed?.loaded === true && results.length === expectedCount && passedCount === results.length && !outcome.timedOut,
      loaded: parsed?.loaded === true,
      loadError: parsed?.error != null ? String(parsed.error).slice(0, 500) : null,
      total: results.length, passedCount, results,
      timedOut: outcome.timedOut, exitCode: outcome.exitCode,
      stderr: outcome.stderr.slice(0, 2000),
      durationMs: Date.now() - started,
      testKind: tests.kind,
      isolation,
    };
  } finally {
    fs.rmSync(realDir, { recursive: true, force: true });
  }
}

function createDockerRootlessCodeSandbox({ adapter, workspaceRoot, image }) {
  if (!adapter || adapter.productionSafe !== true) throw new Error('code delivery requires a production-safe rootless sandbox adapter');
  if (!workspaceRoot) throw new Error('code delivery sandbox requires an authorized workspace root');
  if (!/^\S+@sha256:[a-f0-9]{64}$/i.test(String(image || ''))) throw new Error('code delivery sandbox requires an image pinned by sha256 digest');

  const sandbox = async ({ code, tests, timeoutMs = 10_000 }) => {
    const root = path.resolve(workspaceRoot);
    fs.mkdirSync(root, { recursive: true });
    const dir = fs.mkdtempSync(path.join(root, 'fenix-code-delivery-'));
    const nonce = crypto.randomBytes(12).toString('hex');
    try {
      fs.writeFileSync(path.join(dir, 'solution.js'), String(code));
      fs.writeFileSync(path.join(dir, 'guard.js'), GUARD_SOURCE);
      fs.writeFileSync(path.join(dir, 'harness.js'), buildHarness(tests, nonce));
      const result = await adapter.run({
        executionId: nonce,
        tool: { image, allowedNetworks: ['none'] },
        argv: ['node', '--max-old-space-size=64', '--experimental-permission', '--allow-fs-read=/workspace/*', '--allow-fs-write=/workspace/*', '--require', '/workspace/guard.js', '/workspace/harness.js'],
        workspacePath: dir,
        limits: { timeoutMs, memoryMb: 128, cpuUnits: 500, pids: 64 },
        network: 'none',
      });
      const marker = `__RESULT_${nonce}__`;
      const line = String(result.stdout || '').split(/\r?\n/).reverse().find((entry) => entry.startsWith(marker));
      let parsed = null;
      try { parsed = line ? JSON.parse(line.slice(marker.length)) : null; } catch { parsed = null; }
      const rawResults = Array.isArray(parsed?.results) ? parsed.results : [];
      const results = rawResults.filter((entry) => entry && typeof entry === 'object').map((entry) => ({
        name: String(entry.name ?? ''), passed: entry.passed === true,
        ...(entry.error != null ? { error: String(entry.error).slice(0, 500) } : {}),
      }));
      const expectedCount = tests.kind === 'examples' ? tests.cases.length : 1;
      const passedCount = results.filter((entry) => entry.passed).length;
      return {
        passed: parsed?.loaded === true && results.length === expectedCount && passedCount === results.length,
        loaded: parsed?.loaded === true,
        loadError: parsed?.error != null ? String(parsed.error).slice(0, 500) : null,
        total: results.length, passedCount, results,
        timedOut: false, exitCode: result.exitCode,
        stderr: String(result.stderr || '').slice(0, 2000),
        durationMs: Number(result.durationMs) || null,
        testKind: tests.kind,
        isolation: { driver: 'docker-rootless', network: 'none', image, memoryMb: 128, cpuUnits: 500, pids: 64 },
      };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
  sandbox.productionSafe = true;
  return sandbox;
}

module.exports = { runInSandbox, createDockerRootlessCodeSandbox, buildHarness, BLOCKED };
