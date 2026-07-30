const test = require('node:test');
const assert = require('node:assert/strict');
const { NpcCityEngine } = require('../src/ai-city/npc-city-engine');

// A cidade nascia com status:'IDLE_OBSERVING' e queueCount:0 fixos em todo personagem, e a
// fala era template. Estes testes provam estado DERIVADO do runtime real e falham se a mentira
// voltar (verificado por mutacao: fixar status quebra o caso ACTIVE).

const cp = { authorize: async () => true };
const swarm = {
  specialists: [
    { id: 'agent-architect', name: 'Arquiteto', domain: 'architecture', role: 'Arch' },
    { id: 'agent-backend', name: 'Backend', domain: 'backend', role: 'BE' },
  ],
  dispatchEvent: async (t, a, ev) => ({ id: 'evt-1', type: ev.type, data: ev.data }),
};

// Event store falso: mapeia stream -> lista de eventos com occurredAt controlado.
function fakeEventStore(streams) {
  return { readStream: async (t, stream) => streams[stream] || [] };
}

test('npc-city: agente sem eventos aparece IDLE com fila 0 (nao fabricado)', async () => {
  const eng = new NpcCityEngine({ store: null, controlPlane: cp, agentSwarm: swarm, eventStore: fakeEventStore({}), clock: () => 1000 });
  const { npcs } = await eng.listNpcAgents('t', 'a');
  assert.equal(npcs.length, 2);
  assert.equal(npcs[0].status, 'IDLE');
  assert.equal(npcs[0].queueCount, 0);
  // A mentira antiga nao pode reaparecer.
  assert.ok(!JSON.stringify(npcs).includes('IDLE_OBSERVING'));
});

test('npc-city: evento recente => ACTIVE; contagem real da fila', async () => {
  const now = 10_000_000;
  const recent = new Date(now - 1000).toISOString();
  const eng = new NpcCityEngine({
    store: null, controlPlane: cp, agentSwarm: swarm, clock: () => now,
    eventStore: fakeEventStore({ 'swarm:agent-architect': [{ occurredAt: recent }, { occurredAt: recent }] }),
  });
  const { npcs } = await eng.listNpcAgents('t', 'a');
  const arch = npcs.find((n) => n.id === 'agent-architect');
  assert.equal(arch.status, 'ACTIVE');
  assert.equal(arch.queueCount, 2);
  // O outro agente, sem eventos, continua IDLE -- estados independentes, nao um selo global.
  assert.equal(npcs.find((n) => n.id === 'agent-backend').status, 'IDLE');
});

test('npc-city: evento antigo => IDLE (nao fica aceso para sempre)', async () => {
  const now = 10_000_000;
  const old = new Date(now - 60 * 60 * 1000).toISOString(); // 1h atras
  const eng = new NpcCityEngine({
    store: null, controlPlane: cp, agentSwarm: swarm, clock: () => now,
    eventStore: fakeEventStore({ 'swarm:agent-architect': [{ occurredAt: old }] }),
  });
  const { npcs } = await eng.listNpcAgents('t', 'a');
  const arch = npcs.find((n) => n.id === 'agent-architect');
  assert.equal(arch.status, 'IDLE');
  assert.equal(arch.queueCount, 1); // ja trabalhou uma vez -- a contagem e real
});

test('npc-city: sem event store => UNKNOWN, nunca status fabricado', async () => {
  const eng = new NpcCityEngine({ store: null, controlPlane: cp, agentSwarm: swarm, eventStore: null, clock: () => 1000 });
  const { npcs } = await eng.listNpcAgents('t', 'a');
  assert.equal(npcs[0].status, 'UNKNOWN');
  assert.equal(npcs[0].queueCount, null);
});

test('npc-city: fala reflete o evento REALMENTE despachado', async () => {
  const eng = new NpcCityEngine({ store: null, controlPlane: cp, agentSwarm: swarm, eventStore: fakeEventStore({}), clock: () => 1000 });
  const r = await eng.chatWithNpc('t', 'a', 'agent-architect', 'Analisar arquitetura hexagonal');
  assert.equal(r.npcId, 'agent-architect');
  assert.ok(r.npcReply.includes('Arquiteto')); // contrato preservado (v70-v71)
  assert.equal(r.dispatched, true);
  assert.equal(r.eventId, 'evt-1');
  assert.equal(r.eventStream, 'swarm:agent-architect');
});

test('npc-city: sem swarm/barramento, a fala NAO finge despacho', async () => {
  const eng = new NpcCityEngine({ store: null, controlPlane: cp, agentSwarm: { specialists: swarm.specialists }, eventStore: fakeEventStore({}), clock: () => 1000 });
  const r = await eng.chatWithNpc('t', 'a', 'agent-architect', 'oi');
  assert.equal(r.dispatched, false);
  assert.equal(r.eventId, null);
  assert.match(r.npcReply, /nenhum barramento|nada foi despachado/i);
});
