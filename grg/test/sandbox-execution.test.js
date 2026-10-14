const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { MemoryStore } = require('../src/kernel/store');
const { EventBus } = require('../src/kernel/event-bus');
const { ControlPlane } = require('../src/control-plane/control-plane');
const { AuditTrail } = require('../src/governance/audit-trail');
const { PolicyEngine } = require('../src/governance/policy-engine');
const { ApprovalEngine } = require('../src/governance/approval-engine');
const { EventStore } = require('../src/eventing/event-store');
const { FabricEventBus } = require('../src/eventing/fabric-event-bus');
const { ToolRegistry } = require('../src/execution/tool-registry');
const { ScriptLibrary, canonical } = require('../src/execution/script-library');
const { SandboxExecutionEngine } = require('../src/execution/sandbox-execution-engine');
const { dockerArgs, DockerRootlessSandbox } = require('../src/execution/docker-rootless-sandbox');
const { ValidationError } = require('../src/kernel/errors');

async function bootstrap(adapter = { run: async ({ argv, tool, limits }) => ({ exitCode: 0, stdout: `ran ${argv.join(' ')} token=secret-value`, stderr: '', sandbox: { image: tool.image, limits } }) }) {
  const store = new MemoryStore(); const bus = new EventBus(); const cp = await new ControlPlane({ store, bus }).initialize(); await cp.createTenant({ id: 'grg', name: 'GRG' }, 'admin');
  const audit = new AuditTrail({ store }).attach(bus); const approvals = new ApprovalEngine({ store, bus, controlPlane: cp, audit, policy: new PolicyEngine() }); const events = new FabricEventBus({ eventStore: new EventStore({ store }), liveBus: bus });
  const tools = new ToolRegistry({ store, controlPlane: cp, bus }); const scripts = new ScriptLibrary({ store, controlPlane: cp, tools, bus }); const sandbox = new SandboxExecutionEngine({ store, controlPlane: cp, tools, scripts, adapter, approvals, audit, events });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519'); await scripts.registerSigner('grg', 'admin', { signerId: 'release-security', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) });
  const image = `registry.example/fenix/node@sha256:${'a'.repeat(64)}`; await tools.register('grg', 'admin', { id: 'node-test', version: '24', command: 'node', image, capabilities: ['test'], permissions: ['workspace:read'], allowedNetworks: ['none'] });
  const manifest = { id: 'project-test', version: '1.0.0', toolId: 'node-test', entrypoint: 'node', args: ['--test', '{{target}}'], parameters: [{ name: 'target', pattern: '^[a-zA-Z0-9._/-]{1,100}$', required: true }], description: 'Authorized Node test' };
  const signature = crypto.sign(null, Buffer.from(canonical(manifest)), privateKey).toString('base64'); await scripts.register('grg', 'admin', { signerId: 'release-security', manifest, signature });
  return { store, cp, tools, scripts, sandbox, manifest, image };
}

test('only signed versioned scripts execute and produce an audit timeline', async () => {
  const { sandbox } = await bootstrap(); const result = await sandbox.execute('grg', 'admin', { scriptId: 'project-test', version: '1.0.0', params: { target: 'test/unit.test.js' } });
  assert.equal(result.status, 'SUCCEEDED'); assert.equal(result.timeline.map((item) => item.type).join(','), 'EXECUTION_STARTED,EXECUTION_SUCCEEDED'); assert.match(result.result.stdout, /token=\[REDACTED\]/); assert.equal(result.result.sandbox.limits.memoryMb, 512);
});

test('script tampering and arbitrary parameters are rejected', async () => {
  const { scripts, manifest, sandbox } = await bootstrap();
  await assert.rejects(() => scripts.register('grg', 'admin', { signerId: 'release-security', manifest: { ...manifest, args: ['-e', 'process.exit()'] }, signature: 'invalid' }), ValidationError);
  await assert.rejects(() => sandbox.execute('grg', 'admin', { scriptId: 'project-test', params: { target: '../outside;rm', extra: 'x' } }), ValidationError);
});

test('production execution fails closed without a matching consumed approval', async () => {
  const { sandbox } = await bootstrap(); await assert.rejects(() => sandbox.execute('grg', 'admin', { scriptId: 'project-test', params: { target: 'test/a.js' }, environmentName: 'production' }), /requires approval/);
});

test('docker sandbox arguments enforce isolation and immutable image', () => {
  const image = `repo/node@sha256:${'b'.repeat(64)}`; const args = dockerArgs({ executionId: 'abc123', tool: { image }, argv: ['node', '--test'], workdir: '/tmp/work', limits: { pids: 64, memoryMb: 256, cpuUnits: 500 }, network: 'none', environment: {} });
  assert.ok(args.includes('--rm')); assert.ok(args.includes('--read-only')); assert.ok(args.includes('ALL')); assert.ok(args.includes('no-new-privileges')); assert.ok(args.includes('none')); assert.ok(args.includes(image)); assert.equal(args.includes('/bin/sh'), false);
});

test('rootless process-time mode bounds CPU without a CPU cgroup controller', () => {
  const args = dockerArgs({ executionId: 'cpu-test', tool: { image: `repo/node@sha256:${'b'.repeat(64)}` }, argv: ['node', '--version'], workdir: '/tmp/work', limits: { pids: 64, memoryMb: 256, cpuUnits: 500, timeoutMs: 5000 }, network: 'none', cpuMode: 'process-time' });
  assert.deepEqual(args.slice(args.indexOf('--ulimit'), args.indexOf('--ulimit') + 2), ['--ulimit', 'cpu=3:4']);
  assert.equal(args.includes('--cpus'), false);
  assert.ok(args.includes('--memory'));
  assert.ok(args.includes('--pids-limit'));
});

test('rootless sandbox force-removes a container after Docker run fails', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-sandbox-cleanup-'));
  const repo = path.join(parent, 'repo');
  fs.mkdirSync(repo);
  const calls = [];
  try {
    const sandbox = new DockerRootlessSandbox({ workspaceRoot: parent, dockerHost: 'unix:///run/user/1001/docker.sock', cpuMode: 'process-time', exec: async (_bin, args) => {
      calls.push(args);
      if (args[0] === 'run') throw new Error('simulated timeout');
      return { stdout: '', stderr: '' };
    } });
    await assert.rejects(sandbox.run({ executionId: 'cleanup-proof', tool: { image: 'node:22-alpine', allowedNetworks: ['none'] }, argv: ['node', '--version'], workspacePath: repo, limits: { timeoutMs: 5000, memoryMb: 256, cpuUnits: 1000, pids: 64 } }), /simulated timeout/);
    assert.deepEqual(calls[1], ['rm', '-f', 'fenix-sbx-cleanup-proo']);
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
});
