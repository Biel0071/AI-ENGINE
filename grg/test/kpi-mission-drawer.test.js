const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/unified-app.js'), 'utf8');
const missionHelperSource = source.match(/const OPEN_MISSION_STATUSES\s*=\s*new Set\([\s\S]*?window\.fenixIsMissionOpen\s*=\s*function\(mission\)\s*\{[\s\S]*?^\};/m)?.[0];
assert.ok(missionHelperSource, 'shared open mission status helper must exist');
const start = source.indexOf('window.fnxToggleKpiDrawer = function(category) {');
const end = source.indexOf('\n};', start) + 3;
assert.ok(start >= 0 && end > start, 'KPI drawer renderer must exist');
const functionSource = source.slice(start, end);

function renderMissionDrawer({ data = {}, missions, live } = {}) {
  const elements = new Map();
  const document = { getElementById(id) {
    if (!elements.has(id)) elements.set(id, { style: {}, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } });
    return elements.get(id);
  } };
  const window = { state: { data, missions }, FENIX: { live } };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  vm.runInNewContext(`${missionHelperSource}\nlet _fnxCurrentKpiCategory = null; window.fnxCloseKpiDrawer = () => {}; ${functionSource}`, { window, document, escapeHtml });
  window.fnxToggleKpiDrawer('missions');
  return elements.get('fnxKpiDdBody').innerHTML;
}

test('missions drawer shows only open canonical records, including approval, with safe names', () => {
  const html = renderMissionDrawer({ data: { missions: { missions: [
    { id: 'mission-42', title: '<script>alert(1)</script>', status: 'AWAITING_APPROVAL' },
    { id: 'mission-43', title: 'Concluída', status: 'SUCCEEDED' },
  ] } } });
  assert.match(html, /mission-42/);
  assert.match(html, /AWAITING_APPROVAL/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /mission-43|Concluída|<script>/);
});

test('missions drawer distinguishes unavailable data from a measured empty list', () => {
  assert.match(renderMissionDrawer({ data: { missions: { __error: 'HTTP 503' } } }), /Missões indisponíveis/);
  assert.match(renderMissionDrawer({ data: { missions: { missions: [] } } }), /Nenhuma missão ativa/);
});
