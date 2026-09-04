const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { auditFrontend } = require('../src/governance/frontend-honesty-audit');

// O simulation-audit varre src/ e nunca olhou public/. Este teste fecha o ponto cego:
// para o usuario, metrica falsa na TELA mente igual a metrica falsa no servidor.
//
// A regra: o HTML carrega ROTULO e marcador de ausencia; o VALOR chega por JS a partir
// de uma resposta de API. Se alguem voltar a escrever "99.99%" ou "128 agentes" no HTML,
// este teste quebra.

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

test('frontend: nenhum valor fabricado no HTML/JS servido ao usuario', () => {
  const audit = auditFrontend(PUBLIC_DIR);
  const offenders = audit.files.filter((f) => f.fakeSignalCount > 0);
  const detail = offenders
    .map((f) => `${f.file}: ${f.signals.map((s) => `L${s.line} [${s.signal}] ${s.excerpt}`).join(' | ')}`)
    .join('\n');
  assert.equal(
    audit.totals.totalFakeSignals,
    0,
    `valores fabricados no frontend (o HTML deve trazer rotulo e "—", nunca o valor):\n${detail}`,
  );
});

test('frontend: o auditor realmente detecta um valor fabricado (prova por mutacao)', () => {
  // Sem esta prova, um auditor quebrado passaria como "0 sinais" e daria falsa seguranca.
  const { FAKE_SIGNALS } = require('../src/governance/frontend-honesty-audit');
  const percent = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-percent');
  const count = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-count');
  const health = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-health');
  assert.ok(new RegExp(percent.rx.source, percent.rx.flags).test('<b>99.99%</b>'));
  assert.ok(new RegExp(count.rx.source, count.rx.flags).test('<span class="count">128 agentes</span>'));
  assert.ok(new RegExp(health.rx.source, health.rx.flags).test('<b>HEALTHY</b>'));
});

test('frontend: ausencia honesta e slot dinamico NAO sao punidos', () => {
  const { FAKE_SIGNALS } = require('../src/governance/frontend-honesty-audit');
  const percent = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-percent');
  const health = FAKE_SIGNALS.find((s) => s.id === 'html-hardcoded-health');
  // Um traco no slot de valor e exatamente o comportamento correto da Regra 2.
  assert.ok(!new RegExp(percent.rx.source, percent.rx.flags).test('<b id="cpu">—</b>'));
  // Estado negativo/desconhecido e a resposta honesta e nunca deve ser punida.
  assert.ok(!new RegExp(health.rx.source, health.rx.flags).test('<b>OFFLINE</b>'));
  assert.ok(!new RegExp(health.rx.source, health.rx.flags).test('<b>UNKNOWN</b>'));
});

test('frontend: o painel principal consome API de verdade', () => {
  const audit = auditFrontend(PUBLIC_DIR);
  const app = audit.files.find((f) => f.file === 'unified-app.js');
  assert.ok(app, 'public/unified-app.js deve existir');
  // 'honest' exige 0 sinais falsos E consumo real de fetch/api.
  assert.equal(app.classification, 'honest');
});

test('ai city live: atividade e eventos devem ser determinísticos e derivados do runtime', () => {
  const city = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'iso-city.js'), 'utf8');
  const adapter = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'fenix-city-event-adapter.js'), 'utf8');
  assert.equal(city.includes('Math.random'), false, 'a cidade live não pode gerar atividade aleatória');
  assert.match(adapter, /CITY_EVENT_MAP/);
  assert.match(adapter, /fenix-live/);
  assert.match(adapter, /sourceEventId/);
});

test('ai city: deep links suportam entidades do snapshot', () => {
  const city = require('node:fs').readFileSync(path.join(PUBLIC_DIR, 'iso-city.js'), 'utf8');
  assert.match(city, /query\.get\('agent'\)/);
  assert.match(city, /query\.get\('mission'\)/);
  assert.match(city, /query\.get\('job'\)/);
  assert.match(city, /focusAgent\(agent\)/);
  assert.match(city, /focusMission\(mission\)/);
  assert.match(city, /focusJob\(job\)/);
});
