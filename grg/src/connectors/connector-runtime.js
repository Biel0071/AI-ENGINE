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
    this.statusCache = new Map();
    this.statusInFlight = new Map();
    this.statusCacheTtlMs = Number(process.env.FENIX_CONNECTOR_STATUS_TTL_MS || 5000);
    this.#pendingMetrics = [];
    this.#pendingEvents = [];
    this.#flushTimer = null;
  }

  #pendingMetrics;
  #pendingEvents;
  #flushTimer;

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

    const useCache = Boolean((this.store?.pool || this.store?.filePath) && this.statusCacheTtlMs > 0);
    if (useCache) {
      const cached = this.statusCache.get(connectorId);
      if (cached && (Date.now() - cached.at < this.statusCacheTtlMs)) {
        return cached.report;
      }
      const inFlight = this.statusInFlight.get(connectorId);
      if (inFlight) return inFlight;
    }

    const derivePromise = this.#deriveStatus(tenantId, connectorId, connector);
    if (useCache) {
      this.statusInFlight.set(connectorId, derivePromise);
    }
    try {
      const report = await derivePromise;
      if (useCache) {
        this.statusCache.set(connectorId, { at: Date.now(), report });
      }
      return report;
    } finally {
      if (useCache && this.statusInFlight.get(connectorId) === derivePromise) {
        this.statusInFlight.delete(connectorId);
      }
    }
  }

  async #deriveStatus(tenantId, connectorId, connector) {
    const withTimeout = (p, ms, label = 'selfTest') => {
      let timer;
      return Promise.race([
        p,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
      ]).finally(() => clearTimeout(timer));
    };

    const auth = await withTimeout(connector.authenticate(), 2200, 'authenticate').catch((err) => ({
      ok: false,
      detail: String(err.message || err),
    }));
    if (!auth.ok) {
      // Sem credencial provada: CONFIGURED (registrado, mas não autenticado). Nunca CONNECTED.
      await this.#recordOutcome(tenantId, connectorId, { kind: 'status', ok: false, state: CONNECTOR_STATES.CONFIGURED }, null);
      return this.#report(connectorId, CONNECTOR_STATES.CONFIGURED, {
        authenticated: false,
        // Adaptadores diferentes nomeiam a evidência de forma diferente (github: `credential`;
        // ai-provider: `detail`). Aceitar ambos evita perder a evidência no report.
        detail: auth.credential || auth.detail || null,
      });
    }

    const test = await withTimeout(connector.selfTest(), 2200, 'selfTest').catch((err) => ({ ok: false, latencyMs: 2200, error: String(err.message || err) }));

    if (test.ok !== true) {
      // Autenticado mas o selfTest falhou: DEGRADED (token presente, fonte não respondeu).
      await this.#recordOutcome(
        tenantId,
        connectorId,
        { kind: 'selfTest', ok: false, latencyMs: valueOfLatency(test) },
        CONNECTOR_STATES.DEGRADED,
      );
      return this.#report(connectorId, CONNECTOR_STATES.DEGRADED, {
        authenticated: true,
        selfTest: measured(false, 'ConnectorRuntime.selfTest()', { error: test.error || null }),
      });
    }

    // authenticate ok + selfTest ok = a fonte respondeu autenticada AGORA. Só aqui CONNECTED.
    await this.#recordOutcome(
      tenantId,
      connectorId,
      { kind: 'selfTest', ok: true, latencyMs: valueOfLatency(test) },
      CONNECTOR_STATES.CONNECTED,
    );
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
    const ids = Array.from(this.connectors.keys());
    const withTimeout = (p, ms) => {
      let timer;
      return Promise.race([
        p,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`status timed out after ${ms}ms`)), ms);
        }),
      ]).finally(() => clearTimeout(timer));
    };
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        try {
          return await withTimeout(this.status(tenantId, actorId, id), 2500);
        } catch (error) {
          return this.#report(id, CONNECTOR_STATES.DEGRADED, {
            authenticated: false,
            error: String(error.message || error).slice(0, 300),
          });
        }
      })
    );
    const out = results.map((r, i) => r.status === 'fulfilled' ? r.value : this.#report(ids[i], CONNECTOR_STATES.DEGRADED, {
      authenticated: false,
      error: String(r.reason?.message || r.reason).slice(0, 300),
    }));
    return { connectors: out, total: measured(out.length, 'runtime:registered connectors') };
  }

  async health(tenantId, actorId, connectorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    return this.#get(connectorId).health();
  }

  // selfTest explícito (endpoint POST). Grava a métrica e devolve o resultado medido.
  async selfTest(tenantId, actorId, connectorId) {
    if (this.cp) await this.cp.authorize(tenantId, actorId, 'runtime:read');
    this.statusCache.delete(connectorId);
    const connector = this.#get(connectorId);
    const test = await connector.selfTest();
    await this.#recordOutcome(tenantId, connectorId, { kind: 'selfTest', ok: test.ok === true, latencyMs: valueOfLatency(test) }, null, { sync: true });
    return test;
  }

  #report(connectorId, state, evidence) {
    const conn = this.connectors.get(connectorId);
    const target = conn?.provider?.baseUrl || conn?.provider?.endpoint || (connectorId === 'github' ? 'https://api.github.com' : (connectorId === 'ai:echo' ? 'internal://echo-adapter' : null));
    return {
      connectorId,
      target,
      // O estado é derivado nesta chamada. A fonte é a medição, declarada.
      state: measured(state, 'derived:authenticate + selfTest'),
      evidence,
      derivedAt: new Date().toISOString(),
    };
  }

  async #recordOutcome(tenantId, connectorId, detail, emittedState = null, { sync = false } = {}) {
    const nowIso = new Date().toISOString();
    const metricRow = detail ? {
      id: uuid(),
      tenantId: tenantId || null,
      connectorId,
      kind: detail.kind,
      ok: detail.ok === true,
      latencyMs: Number.isFinite(detail.latencyMs) ? detail.latencyMs : null,
      recordedAt: nowIso,
    } : null;
    const eventRow = emittedState ? {
      id: uuid(),
      tenantId: tenantId || null,
      connectorId,
      state: emittedState,
      at: nowIso,
    } : null;

    if (this.store) {
      if (this.store.pool && !sync) {
        if (metricRow) this.#pendingMetrics.push(metricRow);
        if (eventRow) this.#pendingEvents.push(eventRow);
        if (!this.#flushTimer) {
          this.#flushTimer = setTimeout(() => {
            this.#flushTimer = null;
            const metricsBatch = this.#pendingMetrics.splice(0, this.#pendingMetrics.length);
            const eventsBatch = this.#pendingEvents.splice(0, this.#pendingEvents.length);
            if (!metricsBatch.length && !eventsBatch.length) return;
            this.store.update((state) => {
              if (metricsBatch.length) {
                state.connectorMetrics = state.connectorMetrics || [];
                state.connectorMetrics.push(...metricsBatch);
              }
              if (eventsBatch.length) {
                state.connectorEvents = state.connectorEvents || [];
                state.connectorEvents.push(...eventsBatch);
              }
              return state;
            }).catch(() => {});
          }, 50);
          if (typeof this.#flushTimer.unref === 'function') this.#flushTimer.unref();
        }
      } else {
        await this.store.update((state) => {
          if (metricRow) {
            state.connectorMetrics = state.connectorMetrics || [];
            state.connectorMetrics.push(metricRow);
          }
          if (eventRow) {
            state.connectorEvents = state.connectorEvents || [];
            state.connectorEvents.push(eventRow);
          }
          return state;
        });
      }
    }
    if (emittedState && this.bus?.emit) {
      await this.bus.emit('connector.state.changed', { tenantId, connectorId, state: emittedState });
    }
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
