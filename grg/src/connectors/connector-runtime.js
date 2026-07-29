'use strict';

const { uuid } = require('../kernel/ids');
const { measured, unknown } = require('../kernel/measurement');
const { assertConnectorContract, CONNECTOR_STATES } = require('./connector-contract');

// MISSION-0004 — CONNECTOR RUNTIME.
//
// Registra conectores e responde UMA pergunta com honestidade: "este conector está de fato
// conectado?". A resposta NUNCA vem de um campo gravado. Ela é derivada rodando
// authenticate() + selfTest() + health() do conector, no momento da pergunta.
//
// Por que derivar em vez de guardar: um campo `status: 'CONNECTED'` no store seria a
// simulação clássica — verdadeiro no instante em que foi escrito, mentira um segundo depois
// quando o token expira. O painel do FÊNIX foi desenhado mostrando tudo CONNECTED por
// configuração; este runtime existe para tornar isso impossível. CONNECTED só se a fonte
// respondeu AGORA.
//
// O que É gravado no store: métrica (chamada aconteceu, latência, ok/falha) e evento
// (transição observada). Nunca a credencial, nunca o veredito como literal.

class ConnectorRuntime {
  constructor({ store, bus = null, controlPlane }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.connectors = new Map();
  }

  // Registra um conector. Rejeita quem não cumpre o contrato dos 12 métodos — um conector
  // incompleto não entra e falha no meio de uma operação; ele nem entra.
  register(connector) {
    assertConnectorContract(connector);
    this.connectors.set(connector.id, connector);
    return connector.register();
  }

  list() { return [...this.connectors.keys()]; }

  #get(connectorId) {
    const connector = this.connectors.get(connectorId);
    if (!connector) throw new Error(`connector not registered: ${connectorId}`);
    return connector;
  }

  // O CORAÇÃO DA REGRA. Deriva o estado real. Nenhum ramo devolve CONNECTED sem que
  // authenticate E selfTest tenham passado por medição nesta chamada.
  async status(tenantId, actorId, connectorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const connector = this.#get(connectorId);

    const auth = await connector.authenticate();
    if (!auth.ok) {
      // Sem credencial provada: CONFIGURED (registrado, mas não autenticado). Nunca CONNECTED.
      await this.#recordMetric(tenantId, connectorId, { kind: 'status', ok: false, state: CONNECTOR_STATES.CONFIGURED });
      return this.#report(connectorId, CONNECTOR_STATES.CONFIGURED, {
        authenticated: false,
        // Adaptadores diferentes nomeiam a evidência de forma diferente (github: `credential`;
        // ai-provider: `detail`). Aceitar ambos evita perder a evidência no report.
        detail: auth.credential || auth.detail || null,
      });
    }

    const test = await connector.selfTest();
    await this.#recordMetric(tenantId, connectorId, { kind: 'selfTest', ok: test.ok === true, latencyMs: valueOfLatency(test) });

    if (test.ok !== true) {
      // Autenticado mas o selfTest falhou: DEGRADED (token presente, fonte não respondeu).
      await this.#emit(tenantId, connectorId, CONNECTOR_STATES.DEGRADED);
      return this.#report(connectorId, CONNECTOR_STATES.DEGRADED, {
        authenticated: true,
        selfTest: measured(false, 'ConnectorRuntime.selfTest()', { error: test.error || null }),
      });
    }

    // authenticate ok + selfTest ok = a fonte respondeu autenticada AGORA. Só aqui CONNECTED.
    await this.#emit(tenantId, connectorId, CONNECTOR_STATES.CONNECTED);
    return this.#report(connectorId, CONNECTOR_STATES.CONNECTED, {
      authenticated: true,
      selfTest: measured(true, 'ConnectorRuntime.selfTest()'),
      observed: test.observed || null,
      latencyMs: test.latencyMs || null,
    });
  }

  // Estado de todos os conectores registrados, derivado. Conectores previstos mas não
  // registrados NÃO aparecem aqui como CONNECTED — eles simplesmente não estão na lista, e
  // o painel os mostra como PLANNED a partir de uma lista separada de capacidades.
  async statusAll(tenantId, actorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const out = [];
    for (const id of this.connectors.keys()) {
      out.push(await this.status(tenantId, actorId, id));
    }
    return { connectors: out, total: measured(out.length, 'runtime:registered connectors') };
  }

  async health(tenantId, actorId, connectorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    return this.#get(connectorId).health();
  }

  // selfTest explícito (endpoint POST). Grava a métrica e devolve o resultado medido.
  async selfTest(tenantId, actorId, connectorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    const connector = this.#get(connectorId);
    const test = await connector.selfTest();
    await this.#recordMetric(tenantId, connectorId, { kind: 'selfTest', ok: test.ok === true, latencyMs: valueOfLatency(test) });
    return test;
  }

  #report(connectorId, state, evidence) {
    return {
      connectorId,
      // O estado é derivado nesta chamada. A fonte é a medição, declarada.
      state: measured(state, 'derived:authenticate + selfTest'),
      evidence,
      derivedAt: new Date().toISOString(),
    };
  }

  async #recordMetric(tenantId, connectorId, detail) {
    if (!this.store) return;
    const row = {
      id: uuid(),
      tenantId: tenantId || null,
      connectorId,
      kind: detail.kind,
      ok: detail.ok === true,
      latencyMs: Number.isFinite(detail.latencyMs) ? detail.latencyMs : null,
      recordedAt: new Date().toISOString(),
    };
    await this.store.update((state) => {
      state.connectorMetrics = state.connectorMetrics || [];
      state.connectorMetrics.push(row);
      return state;
    });
  }

  async #emit(tenantId, connectorId, state) {
    if (this.store) {
      await this.store.update((s) => {
        s.connectorEvents = s.connectorEvents || [];
        s.connectorEvents.push({ id: uuid(), tenantId: tenantId || null, connectorId, state, at: new Date().toISOString() });
        return s;
      });
    }
    if (this.bus?.emit) await this.bus.emit('connector.state.changed', { tenantId, connectorId, state });
  }
}

// Latência pode vir como número puro ou como envelope measured(); extrai o número para a
// métrica sem quebrar se vier de qualquer das formas.
function valueOfLatency(test) {
  const l = test && test.latencyMs;
  if (l == null) return null;
  if (typeof l === 'number') return l;
  if (typeof l === 'object' && typeof l.value === 'number') return l.value;
  return null;
}

module.exports = { ConnectorRuntime };
