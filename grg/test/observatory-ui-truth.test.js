const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const client = fs.readFileSync(path.join(__dirname, '..', 'public', 'observatory-client.js'), 'utf8');

test('observatory UI does not substitute fixed project, screen, health, or audit values', () => {
  assert.doesNotMatch(client, /totalProjects\s*\|\|\s*3/);
  assert.doesNotMatch(client, /totalScreens\s*\|\|\s*14/);
  assert.doesNotMatch(client, /summaryRes\.status\s*\|\|\s*'ONLINE'/);
  assert.doesNotMatch(client, /unknowns\.length\s*\|\|\s*0/);
  assert.doesNotMatch(client, /gaps\.length\s*\|\|\s*0/);
  assert.doesNotMatch(client, /CENSUS AUDIT CONCLUÍDO COM SUCESSO/);
  assert.doesNotMatch(client, /setTimeout\(r => setTimeout\(r, 600\)/);
  assert.match(client, /score\.status === 'NOT_EVALUATED'/);
  assert.match(client, /Auditoria visual indisponível ou ainda não executada/);
  assert.match(client, /summary\.metrics\?\.jobsTotal/);
});

test('observatory UI labels a registered screen as unverified and escapes API text', () => {
  assert.match(client, /maturityLevel \|\| 'NÃO VERIFICADA'/);
  assert.match(client, /const html = \(value\) => String\(value \?\? ''\)/);
  assert.match(client, /html\(p\.name \|\| p\.id/);
});

test('screen inspector opens records from the real screen registry and omits invented baselines', () => {
  assert.match(client, /readApi\('\/api\/v2\/observatory\/twins\/screen'\)/);
  assert.doesNotMatch(client, /census_v13\/screen_/);
  assert.doesNotMatch(client, /0\.00% \(PASS\)/);
  assert.doesNotMatch(client, /s\.lastVerified \|\| Date\.now\(\)/);
});
