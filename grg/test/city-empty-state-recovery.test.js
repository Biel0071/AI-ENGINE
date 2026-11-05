const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');

test('city runtime surfaces failed world reads and provides a manual retry', () => {
  assert.match(source, /lastWorldReadStatus/);
  assert.match(source, /Runtime indisponível · HTTP \$\{status\}/);
  assert.match(source, /Tentar novamente/);
  assert.match(source, /retryButton\.addEventListener\('click', \(\) => this\.syncRealData\(\)\)/);
  assert.match(source, /this\._showWorldReadFailure\(lastWorldReadStatus\)/);
});
