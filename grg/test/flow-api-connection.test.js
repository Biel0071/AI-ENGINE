const test = require('node:test');
const assert = require('node:assert/strict');
const { ApiConnectionManager } = require('../src/ai-runtime/api-connection-manager');
const { MemoryStore } = require('../src/kernel/store');

// FLUXO 8 — API Connection Manager, ponta a ponta.
//
// Prova o estado de conexao HONESTO: enquanto o provider esta indisponivel, o estado diz OFFLINE
// com motivo/backoff -- nunca resposta ficticia. Quando volta, e detectado e as capacidades sao
// descobertas. O estado deriva de provider.available() real, nunca escrito a mao.

function store() { return new MemoryStore(); }

// Provider controlavel: `up` decide o resultado de available() (inferencia real simulada no teste).
function fakeProvider() {
  const p = { up: false, models: ['fake-model-1'], name: 'aiplatform' };
  p.available = async () => p.up;
  return p;
}

test('connection: provider indisponivel => OFFLINE com motivo e proxima tentativa', async () => {
  const provider = fakeProvider(); // up: false
  const mgr = new ApiConnectionManager({ store: store(), bus: null, providers: { aiplatform: provider }, clock: () => 1_000_000 });
  const snap = await mgr.check('aiplatform');
  assert.equal(snap.status, 'OFFLINE');
  assert.ok(snap.reason, 'o motivo do offline e registrado');
  assert.ok(snap.nextAttemptAt, 'ha uma proxima tentativa agendada (backoff)');
  assert.equal(snap.consecutiveFailures, 1);
});

test('connection: sem provider configurado => OFFLINE, nunca ONLINE fabricado', async () => {
  const mgr = new ApiConnectionManager({ store: store(), bus: null, providers: {}, clock: () => 1_000_000 });
  const snap = await mgr.check('aiplatform');
  assert.equal(snap.status, 'OFFLINE');
  assert.match(snap.reason, /not configured/);
});

test('connection: provider volta => detecta ONLINE, transiciona e descobre capacidades', async () => {
  const provider = fakeProvider();
  const st = store();
  let t = 1_000_000;
  const mgr = new ApiConnectionManager({ store: st, bus: null, providers: { aiplatform: provider }, clock: () => t });

  await mgr.check('aiplatform'); // OFFLINE
  provider.up = true;            // a API Platform ficou online
  t += 10_000;
  const snap = await mgr.check('aiplatform');
  assert.equal(snap.status, 'ONLINE');
  assert.equal(snap.transitioned, true);
  assert.equal(snap.previousStatus, 'OFFLINE');
  assert.equal(snap.reason, null);
  assert.equal(snap.consecutiveFailures, 0);

  // Discovery real disparado na transicao para ONLINE: as capacidades vem do provider.
  const state = await st.read();
  const entry = state.apiConnectionState.find((e) => e.provider === 'aiplatform');
  assert.ok(entry.discoveredAt, 'houve discovery na subida');
  assert.deepEqual(entry.capabilities[0].value, ['fake-model-1']);

  // O historico registrou as transicoes reais (UNKNOWN->OFFLINE->ONLINE).
  assert.ok(state.apiConnectionEvents.some((e) => e.to === 'ONLINE' && e.from === 'OFFLINE'));
});

test('connection: backoff cresce a cada falha consecutiva (nao fixo)', async () => {
  const provider = fakeProvider();
  const st = store();
  let t = 1_000_000;
  const mgr = new ApiConnectionManager({ store: st, bus: null, providers: { aiplatform: provider }, clock: () => t });

  const s1 = await mgr.check('aiplatform');
  t += 1000;
  const s2 = await mgr.check('aiplatform');
  const gap1 = Date.parse(s1.nextAttemptAt) - Date.parse(s1.lastCheckAt);
  const gap2 = Date.parse(s2.nextAttemptAt) - Date.parse(s2.lastCheckAt);
  assert.ok(gap2 > gap1, 'a proxima tentativa recua exponencialmente enquanto offline');
  assert.equal(s2.consecutiveFailures, 2);
});

test('connection: status() deriva do ultimo check, nunca inventado', async () => {
  const provider = fakeProvider();
  const mgr = new ApiConnectionManager({ store: store(), bus: null, providers: { aiplatform: provider }, clock: () => 1_000_000 });
  // Antes de qualquer check, status e unknown (nunca ONLINE fabricado).
  const before = await mgr.status('aiplatform');
  assert.equal(before.state, 'unknown');
  await mgr.check('aiplatform');
  const after = await mgr.status('aiplatform');
  assert.equal(after.state, 'measured');
  assert.equal(after.value.status, 'OFFLINE');
});
