const { ValidationError, NotFoundError } = require('../kernel/errors');

// Cidade HONESTA (Constituicao da Experiencia).
//
// MEDIDO EM PRODUCAO (2026-07-29): a versao anterior nascia com `status: 'IDLE_OBSERVING'` e
// `queueCount: 0` ESCRITOS A MAO em toda linha, independentemente do que o agente estava
// fazendo -- os 4 personagens "fingindo trabalhar" que a regra do dono proibe. E o balao de
// fala (`npcReply`) era uma STRING DE TEMPLATE ("Recebi sua solicitacao... notifiquei o Avatar
// Mestre") que nao refletia o evento realmente despachado.
//
// Regra: um elemento visual so existe se corresponde a um estado real do runtime. O status e a
// fila de cada personagem sao DERIVADOS dos eventos reais do stream `swarm:${agentId}` no event
// store -- os mesmos que `agentSwarm.dispatchEvent` grava. Personagem so aparece "trabalhando"
// se ha evento recente atribuido a ele; senao, aparece ocioso, honestamente.
//
// STALE_MS: janela para considerar um agente "ativo". Nao e medicao de trabalho -- e a definicao
// de "recente" para a projecao visual. Configuravel; o default de 5 min casa com a cadencia do
// worker. Sem `Date.now()` fixo no corpo: o agora vem de `this.clock()`, injetavel em teste.
const STALE_MS = 5 * 60 * 1000;

class NpcCityEngine {
  constructor({ store, bus, controlPlane, agentSwarm, masterAvatar, digitalTwin, eventStore, clock }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.agentSwarm = agentSwarm;
    this.masterAvatar = masterAvatar;
    this.digitalTwin = digitalTwin;
    this.eventStore = eventStore;
    this.clock = clock || (() => Date.now());
  }

  async listNpcAgents(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    const specialists = this.agentSwarm ? this.agentSwarm.specialists : [];
    const now = this.clock();

    const npcs = [];
    for (let idx = 0; idx < specialists.length; idx += 1) {
      const s = specialists[idx];
      // Estado real: eventos do agente no seu stream dedicado. Sem event store, a resposta
      // honesta e UNKNOWN -- nunca um `IDLE_OBSERVING` fabricado que pareceria medido.
      const events = this.eventStore ? await this.eventStore.readStream(tenantId, `swarm:${s.id}`) : null;
      npcs.push({
        id: s.id,
        name: s.name,
        domain: s.domain,
        role: s.role,
        district: idx < 4 ? 'Central Core' : idx < 8 ? 'Infrastructure' : idx < 12 ? 'Intelligence' : 'Operations',
        position: { x: (idx % 4) * 120 + 40, y: Math.floor(idx / 4) * 100 + 30 },
        interactive: true,
        ...this.#derive(events, now),
      });
    }

    return { npcs, total: npcs.length };
  }

  // Deriva status + fila a partir dos eventos reais. Nunca inventa.
  #derive(events, now) {
    if (events == null) return { status: 'UNKNOWN', queueCount: null, lastEventAt: null };
    if (events.length === 0) return { status: 'IDLE', queueCount: 0, lastEventAt: null };
    const last = events[events.length - 1];
    const lastAt = last.occurredAt || last.recordedAt || null;
    const ageMs = lastAt ? now - Date.parse(lastAt) : Infinity;
    // ACTIVE so quando houve evento dentro da janela; caso contrario o agente ja trabalhou mas
    // agora esta ocioso -- e mentira mante-lo aceso. queueCount e a contagem REAL do stream.
    return { status: ageMs <= STALE_MS ? 'ACTIVE' : 'IDLE', queueCount: events.length, lastEventAt: lastAt };
  }

  async chatWithNpc(tenantId, actorId, npcId, message = '') {
    await this.cp.authorize(tenantId, actorId, 'governance:read');
    if (!message) throw new ValidationError('Message to NPC is required');

    const specialists = this.agentSwarm ? this.agentSwarm.specialists : [];
    const npc = specialists.find((s) => s.id === npcId || s.domain === npcId);
    if (!npc) throw new NotFoundError(`NPC Subagent not found: ${npcId}`);

    // A fala do personagem so pode afirmar o que de fato aconteceu: o evento despachado.
    let dispatchedEvent = null;
    if (this.agentSwarm && typeof this.agentSwarm.dispatchEvent === 'function') {
      dispatchedEvent = await this.agentSwarm.dispatchEvent(tenantId, actorId, {
        targetAgent: npc.id,
        type: 'npc.user.chat',
        data: { message, prompt: message },
      });
    }

    if (this.masterAvatar && typeof this.masterAvatar.reportAction === 'function') {
      await this.masterAvatar.reportAction(`Conversou com NPC ${npc.name}: ${message.slice(0, 50)}`);
    }

    // O balao de fala descreve o resultado REAL. Se o evento foi despachado, ele carrega o id e
    // o stream onde a prova vive; se nao houve barramento, diz isso -- nao finge notificacao.
    const reply = dispatchedEvent
      ? `[${npc.name} (${npc.role})]: evento ${dispatchedEvent.type} despachado no stream swarm:${npc.id} (id ${dispatchedEvent.id}).`
      : `[${npc.name} (${npc.role})]: mensagem recebida, mas nenhum barramento de eventos esta conectado -- nada foi despachado.`;

    return {
      npcId: npc.id,
      npcName: npc.name,
      userMessage: message,
      npcReply: reply,
      dispatched: Boolean(dispatchedEvent),
      eventId: dispatchedEvent ? dispatchedEvent.id : null,
      eventStream: dispatchedEvent ? `swarm:${npc.id}` : null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = { NpcCityEngine };
