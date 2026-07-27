const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('OIDC login disables hidden required inputs so the identity button can submit', () => {
  const login = readFileSync(join(__dirname, '..', 'public', 'login.html'), 'utf8');
  assert.match(login, /if \(element\.matches\('input'\)\) element\.disabled=true/);
});
