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

// A barra de console operacional era quatro literais congelados (98.4/100, L0-L5
// PREWARMED, 15 NPCs, VPS ONLINE) ligados a IDs inexistentes: nunca mudava. Este teste
// tranca o conserto — cada valor tem que ser escrito por JS a partir de dado real, e os
// numeros inventados nao podem voltar ao HTML.
test('operational console bar is data-driven, not frozen literals', () => {
  // Os literais inventados nao existem mais no HTML.
  assert.doesNotMatch(html, /98\.4 \/ 100/, 'the invented speed score must not be hardcoded');
  assert.doesNotMatch(html, /L0-L5 PREWARMED/, 'the invented hot memory state must not be hardcoded');
  assert.doesNotMatch(html, /15 Especialistas NPCs/, 'the invented agent count must not be hardcoded');
  assert.doesNotMatch(html, /VPS ONLINE/, 'the invented master node status must not be hardcoded');
  // Todo id de console presente no HTML e escrito por app.js — sem elemento orfao nem
  // wiring morto (o bug original: consoleJobs/consoleAi/consoleVps eram referenciados sem
  // existir, e consoleSpeedScore/consoleHotMemory existiam sem serem atualizados).
  const consoleIds = [...html.matchAll(/id="(console[A-Za-z]+)"/g)].map((m) => m[1]);
  assert.ok(consoleIds.length >= 4, 'the console bar must expose several live fields');
  for (const id of consoleIds) assert.ok(js.includes(id), `${id} exists in HTML but is never updated by app.js`);
  // O contrato de medicao chega ao frontend: valor ausente vira traco, nunca zero fabricado.
  assert.match(js, /state === 'measured'/, 'the UI must read the measured()/unknown() envelope');
  assert.match(js, /renderConsoleBar/, 'the console bar must be rendered from a refresh cycle');
});

test('voice is capability-detected and fails closed when the browser lacks STT or TTS', () => {
  assert.match(js, /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/); assert.match(js, /const ttsSupported='speechSynthesis'in window/); assert.match(js, /ui\.ttsToggle\.disabled=!ttsSupported/); assert.match(js, /utterance\.lang='pt-BR'/);
});

test('operational messages go through the Master Avatar and refresh mission state', () => {
  assert.match(js, /api\('\/avatar\/message'/); assert.match(js, /FÊNIX está planejando/); assert.match(js, /await refresh\(\)/); assert.match(js, /mission\.steps/);
});
