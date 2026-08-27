const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '..', 'public', 'unified-app.js'), 'utf8');

test('browser API rejects non-success responses before rendering their payload', () => {
  assert.match(source, /if \(!res\.ok\) throw/);
});

test('command chat delegates operator prompts to the canonical autonomous cycle', () => {
  assert.match(source, /api\('\/autonomous\/cycle'/);
  assert.match(source, /Executive Brain/);
  assert.match(source, /DELEGATED/);
  assert.match(source, /Falha ao iniciar missão/);
  assert.match(source, /refreshAll\(\)/);
});

test('expired sessions refresh once and clear stale tokens before redirecting', () => {
  assert.match(source, /grant_type:\s*'refresh_token'/);
  assert.match(source, /if \(res\.status === 401 && !retried && await refreshAccessToken\(\)\)/);
  assert.match(source, /localStorage\.removeItem\('grg_token'\)/);
  assert.match(source, /location\.replace\('\/GRG-login'\)/);
});

test('project scan renders measured envelopes without leaking object stringification', () => {
  assert.match(source, /function compactValue/);
  assert.match(source, /JSON\.stringify\(value\)/);
  assert.doesNotMatch(source, /getMeasured\(d\.frontendFramework\) \|\| d\.frontendFramework\?\.reason/);
  assert.match(source, /row\('acoplamento'/);
});

test('developer IDE can save files and poll terminal output sessions', () => {
  assert.match(source, /function saveFile/);
  assert.match(source, /api\(`\/dev\/fs\/file\?path=\$\{encodeURIComponent\(filePath\)\}`/);
  assert.match(source, /function pollTerminal/);
  assert.match(source, /api\(`\/dev\/terminal\/\$\{encodeURIComponent\(sessionId\)\}`/);
});
