const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'qa-results', 'screen-readiness-report.json'), 'utf8'));

test('readiness report covers every screen in the five functional domains', () => {
  assert.equal(report.domains, 5);
  assert.equal(report.screens, 14);
  assert.equal(new Set(report.rows.map(row => row.screen)).size, 14);
  assert.ok(report.rows.every(row => row.staticView && row.backendContract));
});

test('readiness report preserves authentication as a separate runtime state', () => {
  assert.ok(['BLOCKED_AUTH', 'PASS', 'NOT_RUN'].includes(report.rows[0].navigation));
  if (report.navigationSummary.fatalConsoleErrors !== undefined) {
    assert.equal(typeof report.navigationSummary.fatalConsoleErrors, 'number');
  }
});
