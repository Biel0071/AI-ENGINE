'use strict';
// LEVEL 2 (2026-11-11): mapa de elementos da interface gerado do código, para o Fênix achar
// "painel de jobs" -> elemento #dockWindowJobs, tela city, arquivos que o controlam.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildUiElementMap, searchUiElements } = require('../src/knowledge/ui-element-map');

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-ui-map-'));
  fs.writeFileSync(path.join(dir, 'index.html'), `
    <section id="view-city" class="view">
      <div id="dockWindowJobs" class="dock-card"><header><h3 class="dock-card-title">Jobs Recentes</h3></header></div>
      <button id="footerDirectorBtn" title="Fênix Diretor: enviar ordem e aprovar etapas">Precisa de você</button>
    </section>
    <section id="view-memory" class="view">
      <input id="memorySearchInput" placeholder="Pesquisar memórias" />
    </section>`);
  fs.writeFileSync(path.join(dir, 'fenix-city-adaptive-dock.js'), "document.getElementById('dockWindowJobs').classList.add('x');");
  fs.writeFileSync(path.join(dir, 'fenix-director-console.js'), "const b = document.querySelector('#footerDirectorBtn');");
  fs.writeFileSync(path.join(dir, 'unrelated.js'), "console.log('nada');");
  return dir;
}

test('elements carry their label, screen and the files that control them', () => {
  const map = buildUiElementMap({ publicDir: fixture() });
  const jobs = map.elements.find((e) => e.id === 'dockWindowJobs');
  assert.equal(jobs.label, 'Jobs Recentes');
  assert.equal(jobs.view, 'city');
  assert.deepEqual(jobs.files, ['public/fenix-city-adaptive-dock.js']);
  const dir = map.elements.find((e) => e.id === 'footerDirectorBtn');
  assert.match(dir.label, /Diretor/);
  assert.deepEqual(dir.files, ['public/fenix-director-console.js']);
});

test('a Portuguese question finds the right element, screen and file', () => {
  const map = buildUiElementMap({ publicDir: fixture() });
  const [top] = searchUiElements(map, 'Onde fica o código do painel de jobs da Cidade?');
  assert.equal(top.id, 'dockWindowJobs');
  const [approval] = searchUiElements(map, 'qual botão abre a aprovação do diretor?');
  assert.equal(approval.id, 'footerDirectorBtn');
  const [mem] = searchUiElements(map, 'busca de memórias');
  assert.equal(mem.id, 'memorySearchInput');
  assert.equal(mem.view, 'memory');
});

test('unrelated questions return nothing instead of a guess', () => {
  const map = buildUiElementMap({ publicDir: fixture() });
  assert.deepEqual(searchUiElements(map, 'qual a capital da Austrália'), []);
});

test('the real frontend map finds the City jobs panel', () => {
  const map = buildUiElementMap({ publicDir: path.join(__dirname, '..', 'public') });
  assert.ok(map.elements.length > 200, `map has ${map.elements.length} elements`);
  const results = searchUiElements(map, 'painel de jobs recentes da cidade');
  assert.ok(results.some((r) => r.id === 'dockWindowJobs'), JSON.stringify(results.slice(0, 3).map((r) => r.id)));
});
test('elements in the global footer do not belong to the last screen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-ui-map-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<section id="view-defense"><div id="defensePanel">Defesa</div></section><footer id="fenixPresentationFooter"><button id="footerDirectorBtn" title="Fênix Diretor">x</button></footer>');
  const map = buildUiElementMap({ publicDir: dir });
  assert.equal(map.elements.find((e) => e.id === 'defensePanel').view, 'defense');
  assert.equal(map.elements.find((e) => e.id === 'footerDirectorBtn').view, null);
});