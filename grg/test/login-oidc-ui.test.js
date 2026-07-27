const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('OIDC login disables hidden required inputs so the identity button can submit', () => {
  const login = readFileSync(join(__dirname, '..', 'public', 'login.html'), 'utf8');
  assert.match(login, /if \(element\.matches\('input'\)\) element\.disabled=true/);
});

test('OIDC login validates or refreshes an existing session instead of redirect looping', () => {
  const login = readFileSync(join(__dirname, '..', 'public', 'login.html'), 'utf8');
  assert.match(login, /fetch\('\/api\/me'/);
  assert.match(login, /grant_type:'refresh_token'/);
  assert.match(login, /sessionStorage\.setItem\('grg_refresh_token'/);
  assert.match(login, /localStorage\.removeItem\('grg_token'\)/);
  assert.doesNotMatch(login, /if \(localStorage\.getItem\('grg_token'\)\) location\.href/);
});
