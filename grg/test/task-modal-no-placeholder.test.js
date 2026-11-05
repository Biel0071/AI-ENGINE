const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-task-modal.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('task modal accepts only identified approval requests with real task text', () => {
  for (const pattern of [/function isValidApprovalPopup\(task\)/, /task\.requiresApproval === true/, /task\.status === 'APPROVAL_PENDING'/, /isValidApprovalPopup\(task\)/]) {
    assert.equal(pattern.test(source), true, `missing approval validation: ${pattern}`);
  }
});

test('task modal rejects numeric or ID-only titles and exposes the actionable task ID', () => {
  assert.match(source, /function hasMeaningfulTaskText\(value\)/);
  assert.match(source, /hasMeaningfulTaskText\(task\.title\)/);
  assert.match(source, /hasMeaningfulTaskText\(task\.objective\)/);
  assert.match(source, /task\.title\.trim\(\) !== task\.taskId\.trim\(\)/);
  assert.match(source, /id="fnxTaskId"/);
  assert.match(source, /getElementById\('fnxTaskId'\)[\s\S]*textContent = task\.taskId/);
  assert.equal((source.match(/const taskId = this\.activeTask\.taskId;/g) || []).length, 2);
  assert.equal((source.match(/encodeURIComponent\(taskId\)/g) || []).length, 2);
});

test('task modal starts without fabricated approval, progress, token, or cost values', () => {
  for (const value of ['Carregando tarefa...', '3,450 tok', '$0.0028', '65%', 'width: 65%', '3800', '0.0032', '2600', '0.0024']) {
    assert.equal(source.includes(value), false, `placeholder should not be rendered: ${value}`);
  }
});

test('shell requests the approval-validated modal asset with a fresh cache key', () => {
  assert.match(html, /fenix-task-modal\.js\?v=20261021-task-id-guard-1/);
});

test('inactive approval modal is hidden from layout and assistive technology', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/fenix-task-modal.css'), 'utf8');
  assert.match(css, /\.fnx-task-modal-overlay\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /\.fnx-task-modal-overlay\.active\s*\{[^}]*visibility:\s*visible/s);
  assert.match(html, /fenix-task-modal\.css\?v=20261022-modal-a11y-1/);
});

test('mission and job creation do not invent an approval popup or runtime telemetry', () => {
  const creator = fs.readFileSync(path.join(__dirname, '../public/task-creator.js'), 'utf8');
  assert.equal(creator.includes('FenixTaskModal.show'), false);
  assert.equal(creator.includes('tokensEstimated'), false);
  assert.equal(creator.includes('costEstimated'), false);
});
