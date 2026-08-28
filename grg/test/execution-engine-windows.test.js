const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveInvocation } = require('../src/execution/execution-engine');

test('terminal runs the Windows npm CLI through node without enabling a shell', () => {
  const resolved = resolveInvocation('npm', ['ci'], {
    platform: 'win32', env: { FENIX_NPM_CLI: 'C:\\tools\\npm-cli.js' }, execPath: 'C:\\node.exe', exists: () => true,
  });
  assert.deepEqual(resolved, { command: 'C:\\node.exe', args: ['C:\\tools\\npm-cli.js', 'ci'] });
});

test('terminal preserves native executables and non-Windows commands', () => {
  assert.deepEqual(resolveInvocation('git', ['status'], { platform: 'win32' }), { command: 'git', args: ['status'] });
  assert.deepEqual(resolveInvocation('npm', ['test'], { platform: 'linux' }), { command: 'npm', args: ['test'] });
});

test('terminal fails explicitly when a Windows package-manager CLI cannot be located', () => {
  assert.throws(
    () => resolveInvocation('pnpm', ['install'], { platform: 'win32', env: {}, exists: () => false }),
    /configure FENIX_PNPM_CLI/,
  );
});
