const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const source = readFileSync(join(__dirname, '..', 'public', 'app.js'), 'utf8');

test('browser API rejects non-success responses before rendering their payload', () => {
  assert.match(source, /if \(!response\.ok\) throw new FenixApiError/);
});

test('chat renderer guards missing replies and installs global fallback boundaries', () => {
  assert.match(source, /typeof text === 'string'/);
  assert.match(source, /typeof res\.reply !== 'string'/);
  assert.match(source, /window\.addEventListener\('error'/);
  assert.match(source, /window\.addEventListener\('unhandledrejection'/);
});
