const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..', 'public');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const js = readFileSync(join(root, 'app.js'), 'utf8');
const css = readFileSync(join(root, 'styles.css'), 'utf8');

test('operational console exposes the Master Avatar, missions, live city and observability', () => {
  for (const id of ['command', 'fenix', 'missions', 'city', 'observability', 'runtime', 'gateway']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /GRG FÊNIX — Centro Operacional Cognitivo/); assert.match(css, /\.city-map/); assert.match(css, /\.phoenix/);
});

test('console consumes real operational contracts instead of hardcoded city state', () => {
  for (const endpoint of ['/avatar/message', '/operations/state', '/missions/avatar-state', '/city', '/runtime/jobs', '/ai/telemetry']) assert.ok(js.includes(endpoint));
  assert.match(js, /nodes\.filter\(\(n\)=>n\.type==='BUILDING'\)/); assert.match(js, /state\.city\.nodes\.filter/); assert.doesNotMatch(html, /Torre IA|Banco PostgreSQL|Redis Building/);
});

test('voice is capability-detected and fails closed when the browser lacks STT or TTS', () => {
  assert.match(js, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/); assert.match(js, /const ttsSupported='speechSynthesis'in window/); assert.match(js, /ui\.ttsToggle\.disabled=!ttsSupported/); assert.match(js, /utterance\.lang='pt-BR'/);
});

test('operational messages go through the Master Avatar and refresh mission state', () => {
  assert.match(js, /api\('\/avatar\/message'/); assert.match(js, /FÊNIX está planejando/); assert.match(js, /await refresh\(\)/); assert.match(js, /mission\.steps/);
});
