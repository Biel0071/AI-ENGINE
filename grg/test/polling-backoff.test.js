'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.resolve(__dirname, '..', 'public');

test('Qwen status polling is serialized and backs off after provider or auth failures', () => {
  const source = fs.readFileSync(path.join(publicDir, 'qwen-project-orchestrator.js'), 'utf8');
  assert.match(source, /if \(refreshInFlight\) return null/);
  assert.match(source, /document\.visibilityState === 'visible' && Date\.now\(\) >= retryAfter/);
  assert.match(source, /\}, 30000\)/);
  assert.match(source, /timeoutMs: 10000/);
  assert.match(source, /AbortSignal\.timeout\(timeoutMs\)/);
  assert.match(source, /Math\.min\(baseDelay \* \(2 \*\* Math\.min\(failureCount - 1, 4\)\), 300000\)/);
});

test('command-center polling pauses after an expired session and resumes when the token changes', () => {
  const source = fs.readFileSync(path.join(publicDir, 'command-center.js'), 'utf8');
  assert.match(source, /apiAuthBackoffUntil/);
  assert.match(source, /getAuthToken\(\) === apiAuthBackoffToken/);
  assert.match(source, /apiAuthBackoffUntil = Date\.now\(\) \+ 60000/);
  assert.match(source, /if \(res\.status === 401\)[\s\S]*?return null;/);
});

