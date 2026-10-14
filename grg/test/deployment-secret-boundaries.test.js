'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const credentialSources = [
  'scripts/deploy-gateway-and-backend.js',
  'scripts/deploy-auth-vps.bat',
  'scripts/vps-update-admin-hash.js',
  'test-vps-chat.js',
  'scripts/test-api-vps.js',
  'scripts/patch-universal-api-platform.js',
  'ops/burn-test.sh',
  'scripts/capture-city-screenshot.js',
  'scripts/test-vps-persistence.js',
  '../.env.example',
  '../memory/ACTIVE_PROJECT_MEMORY.md',
  'ecosystem.config.js',
  '_start-server.ps1',
  'ops/container-entrypoint.sh',
  '.env.enterprise.example',
  'memory/projects-knowledge-map.json',
];

test('runtime and deployment configuration never embed provider or bootstrap credentials', () => {
  for (const relative of credentialSources) {
    const source = read(relative);
    assert.equal(/ap_live_[A-Za-z0-9]{20,}/i.test(source), false, `${relative} must not contain a live provider key`);
    assert.equal(/FENIX_BOOTSTRAP_ADMIN_PASSWORD\s*:\s*['"][^'"]+['"]/i.test(source), false, `${relative} must not contain a bootstrap password`);
    assert.equal(/(?:password|pass)\s*:\s*['"]admin123['"]/i.test(source), false, `${relative} must not contain the default gateway password`);
    assert.equal(/(?:postgres(?:ql)?|redis):\/\/(?!\$\{)[^:\/\s]+:(?!\$\{)[^@\/\s]+@/i.test(source), false, `${relative} must not contain database or cache credentials`);
  }
});

test('frontend gateway forwards the browser session without acquiring or injecting an admin session', () => {
  const source = read('gateway/frontend-gateway.js');
  assert.equal(/cookie:\s*caller\?\.headers\.cookie/.test(source), true, 'the proxy must forward the caller cookie');
  assert.equal(/authorization:\s*caller\?\.headers\.authorization/.test(source), true, 'the proxy must forward caller authorization');
  assert.equal(/loginToBackend|ensureToken|cachedToken/.test(source), false);
  assert.equal(/authorization\s*:\s*['"]Bearer\s/i.test(source), false);
  assert.equal(/^\s*localStorage\.setItem\((['"])(?:token|grg_token|fenix_token)\1/im.test(source), false);
  assert.equal(/document\.cookie\s*=/.test(source), false);
});

test('legacy PM2 deploy path is explicitly disabled until production source parity is proven', () => {
  const source = read('scripts/deploy-gateway-and-backend.js');
  assert.equal(/LEGACY_DEPLOY_DISABLED/.test(source), true);
  assert.equal(/require\(['"](?:ssh2|child_process)['"]\)/i.test(source), false);
  assert.equal(/\b(?:spawn|exec)\s*\(/i.test(source), false);
  assert.equal(/\bpm2\s+(?:start|restart|delete)\b/i.test(source), false);
});

test('legacy API Platform patch route cannot execute a remote deploy', () => {
  const source = read('scripts/patch-universal-api-platform.js');
  assert.equal(/LEGACY_API_PLATFORM_PATCH_DISABLED/.test(source), true);
  assert.equal(/require\(['"](?:ssh2|child_process)['"]\)/i.test(source), false);
  assert.equal(/\/api\/v2\/api-platform\/deploy/.test(source), false);
});

test('legacy auth deployment and password reset scripts cannot overwrite production auth', () => {
  const deploy = read('scripts/deploy-auth-vps.bat');
  const reset = read('scripts/vps-update-admin-hash.js');
  assert.equal(/LEGACY_AUTH_DEPLOY_DISABLED/.test(deploy), true);
  assert.equal(/LEGACY_ADMIN_RESET_DISABLED/.test(reset), true);
  assert.equal(/\b(?:ssh|scp|pm2)\b/i.test(deploy), false);
  assert.equal(/new Pool|hashPassword\(|UPDATE fenix\.kernel_state/i.test(reset), false);
});

test('legacy burn test cannot overwrite production secrets or restart services', () => {
  const source = read('ops/burn-test.sh');
  assert.equal(/LEGACY_BURN_TEST_DISABLED/.test(source), true);
  assert.equal(/docker\s+compose|dummy-secret|\.secrets\//i.test(source), false);
});

test('legacy release entrypoints cannot erase or mutate the active VPS runtime', () => {
  const retired = [
    ['../deploy.bat', 'LEGACY_DEPLOY_DISABLED'],
    ['../deploy-direct.ps1', 'LEGACY_DEPLOY_DISABLED'],
    ['../deploy-ssh.ps1', 'LEGACY_DEPLOY_DISABLED'],
    ['scripts/bundle-and-deploy.ps1', 'LEGACY_DEPLOY_DISABLED'],
    ['scripts/remote-apply-update.sh', 'LEGACY_REMOTE_APPLY_DISABLED'],
  ];
  for (const [relative, marker] of retired) {
    const source = read(relative);
    assert.equal(source.includes(marker), true, `${relative} must clearly refuse the retired release path`);
    assert.equal(/\brm\s+-rf\s+\/opt\/fenix-os|\b(?:ssh|scp|pm2)\s+(?:start|reload|restart|delete)/i.test(source), false, `${relative} must not mutate the legacy VPS runtime`);
  }
});

test('legacy local restart helper cannot inject development auth or a fixed administrator session', () => {
  const source = read('../restart-helper.js');
  assert.equal(/LEGACY_RESTART_DISABLED/.test(source), true);
  assert.equal(/FENIX_ALLOW_DEV_HEADERS|FENIX_BOOTSTRAP_ADMIN_PASSWORD|admin123|child_process/i.test(source), false);
});

test('local secret material is excluded from Git by the root ignore rules', () => {
  const ignore = fs.readFileSync(path.join(root, '..', '.gitignore'), 'utf8');
  assert.equal(/^\.secrets\/$/m.test(ignore), true);
});
