const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { DockerDeployAdapter, stablePort } = require('../src/runtime/docker-deploy-adapter');
const { DevelopmentDeployAdapter } = require('../src/runtime/deployer');
const { createApp } = require('../src/app');
const { loadSecurityConfig } = require('../src/security/config');

test('Docker adapter performs a real hardened build and container run without a shell', async () => {
  const calls = [];
  const exec = async (file, args, options) => {
    calls.push({ file, args, options });
    if (args[0] === 'image' && args[1] === 'inspect') throw new Error('not found');
    if (args[0] === 'container' && args[1] === 'inspect') throw new Error('not found');
    return { stdout: args[0] === 'run' ? 'container-id\n' : '', stderr: '' };
  };
  const root = path.resolve('generated');
  const adapter = new DockerDeployAdapter({ generatedRoot: root, exec });
  const result = await adapter.deploy({ project: { id: 'crm', outputPath: path.join(root, 'crm') }, environment: 'production', revision: 'abc123' });
  const build = calls.find((call) => call.args[0] === 'build'); const run = calls.find((call) => call.args[0] === 'run');
  assert.equal(build.file, 'docker'); assert.equal(build.options.shell, undefined);
  assert.ok(run.args.includes('--read-only')); assert.ok(run.args.includes('ALL')); assert.ok(run.args.includes('no-new-privileges'));
  assert.equal(result.url, `http://127.0.0.1:${stablePort('crm', 'production')}`);
  assert.equal(adapter.productionSafe, true);
});

test('Docker adapter rejects traversal and unsafe deployment identities', async () => {
  const root = path.resolve('generated'); const adapter = new DockerDeployAdapter({ generatedRoot: root, exec: async () => ({ stdout: '' }) });
  await assert.rejects(() => adapter.deploy({ project: { id: 'crm;rm', outputPath: path.join(root, 'crm') }, environment: 'production', revision: 'x' }), /invalid Docker/);
  await assert.rejects(() => adapter.deploy({ project: { id: 'crm', outputPath: path.resolve('outside') }, environment: 'production', revision: 'x' }), /outside generatedRoot/);
});

test('production fails closed for missing or development deploy adapters', async () => {
  const securityConfig = loadSecurityConfig({ FENIX_ENV: 'production' });
  await assert.rejects(() => createApp({ securityConfig, env: {}, identityProvider: {} }), /production-safe deploy adapters/);
  await assert.rejects(() => createApp({ securityConfig, env: {}, identityProvider: {}, deployProviders: { node: new DevelopmentDeployAdapter('node') } }), /production-safe deploy adapters/);
});
