const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(root, 'qa-results', 'screen-readiness-report.json'), 'utf8'));
const queue = JSON.parse(fs.readFileSync(path.join(root, 'qa-results', 'screen-improvement-queue.json'), 'utf8'));

test('readiness report covers every screen in the five functional domains', () => {
  assert.equal(report.domains, 5);
  assert.equal(report.screens, 15);
  assert.equal(new Set(report.rows.map(row => row.screen)).size, 15);
  assert.ok(report.rows.every(row => row.staticView && row.backendContract));
});

test('readiness report preserves authentication as a separate runtime state', () => {
  assert.ok(['BLOCKED_AUTH', 'BLOCKED_RUNTIME', 'PASS', 'NOT_RUN'].includes(report.rows[0].navigation));
  assert.ok(report.rows.every(row => ['BLOCKED_AUTH', 'NOT_BLOCKED'].includes(row.apiAccess)));
  if (report.navigationBlock?.component === 'navigation') {
    assert.ok(report.rows.every(row => row.navigation === 'BLOCKED_RUNTIME'));
    assert.equal(report.authenticationBlocked, true, 'API auth state remains independently visible');
  }
  if (report.navigationSummary.fatalConsoleErrors !== undefined) {
    assert.equal(typeof report.navigationSummary.fatalConsoleErrors, 'number');
  }
});

test('improvement queue never turns stale navigation passes into runtime PASS when API auth is blocked', () => {
  if (report.authenticationBlocked) {
    assert.equal(queue.summary.blockedAuth, report.screens);
    assert.ok(queue.items.every(item => item.currentEvidence.navigation === 'BLOCKED_AUTH'));
    assert.ok(queue.items.every(item => item.priority === 'P1'), 'authentication blocks all screen data and must be prioritized as P1');
  }
});
