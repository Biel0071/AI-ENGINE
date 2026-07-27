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
const { dockerArgs } = require('../src/execution/docker-rootless-sandbox');
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
