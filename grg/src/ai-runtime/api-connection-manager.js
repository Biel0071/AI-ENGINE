const { measured, unknown } = require('../kernel/measurement');

// API Connection Manager — a camada de conexao com servicos externos (a API Platform hoje).
//
// FLUXO 8 (ONLINE RUNTIME): o Gateway desacoplado (circuit-breaker/retry/cache/metrics) ja
// existe. O que faltava era o monitoramento CONTINUO de conexao com estado honesto: enquanto a
// API Platform esta indisponivel, o estado diz OFFLINE -- nunca resposta ficticia. Quando volta,
// e detectado automaticamente e as capacidades sao (re)descobertas.
//
// O estado NUNCA e escrito a mao: deriva de `provider.available()`, que faz INFERENCIA real
// (nao ping). Estados possiveis: OFFLINE (sem URL/chave, ou health falhou), CONNECTING (checando),
// ONLINE (health passou). Cada transicao vira evento no historico. A troca da API e so mudar
// GRG_AIPLATFORM_URL/KEY: o manager re-testa e re-descobre, sem mudanca estrutural.
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

class ApiConnectionManager {
  constructor({ store, bus, providers = {}, clock } = {}) {
    this.store = store;
    this.bus = bus;
    this.providers = providers;
    this.clock = clock || (() => Date.now());
  }

  // Faz o health-check REAL de um provider e atualiza o estado persistido. Nao inventa: se o
  // provider nao existe (sem URL/chave), o estado e OFFLINE com o motivo.
  async check(providerName) {
    const provider = this.providers[providerName];
    const now = this.clock();
    const startedAt = new Date(now).toISOString();

    let online = false;
    let reason = null;
    if (!provider || typeof provider.available !== 'function') {
      reason = 'provider not configured (missing URL/key or not registered)';
    } else {
      try {
        online = await provider.available();
        if (!online) reason = 'health check returned not-available (gateway up but no generation possible, or unreachable)';
      } catch (error) {
        online = false;
        reason = `health check threw: ${String(error.message || error).slice(0, 200)}`;
      }
    }

    return this.#record(providerName, online, reason, startedAt, now);
  }

  async #record(providerName, online, reason, startedAt, now) {
    let snapshot;
    await this.store.update((state) => {
      state.apiConnectionState = state.apiConnectionState || [];
      state.apiConnectionEvents = state.apiConnectionEvents || [];
      let entry = state.apiConnectionState.find((e) => e.provider === providerName);
      const previousStatus = entry ? entry.status : 'UNKNOWN';
      const status = online ? 'ONLINE' : 'OFFLINE';

      // Backoff exponencial da proxima tentativa enquanto OFFLINE; zera ao ficar ONLINE.
      const consecutiveFailures = online ? 0 : ((entry?.consecutiveFailures || 0) + 1);
      const backoff = online ? 0 : Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * (2 ** Math.min(consecutiveFailures - 1, 6)));
      const offlineSince = online ? null : (entry?.offlineSince || startedAt);

      const next = {
        provider: providerName,
        status,
        reason: online ? null : reason,
        lastCheckAt: startedAt,
        lastOnlineAt: online ? startedAt : (entry?.lastOnlineAt || null),
        offlineSince,
        offlineMs: (online || !offlineSince) ? 0 : (now - Date.parse(offlineSince)),
        nextAttemptAt: online ? null : new Date(now + backoff).toISOString(),
        consecutiveFailures,
      };
      if (entry) Object.assign(entry, next);
      else { entry = next; state.apiConnectionState.push(entry); }

      // Historico so registra TRANSICAO (mudou de estado), nao cada tick -- senao o evento afoga.
      if (previousStatus !== status) {
        state.apiConnectionEvents.push({ provider: providerName, from: previousStatus, to: status, reason: entry.reason, at: startedAt });
      }
      snapshot = { ...entry, transitioned: previousStatus !== status, previousStatus };
      return state;
    });

    if (snapshot.transitioned && this.bus?.emit) {
      await this.bus.emit('api.connection.changed', { provider: providerName, from: snapshot.previousStatus, to: snapshot.status, reason: snapshot.reason });
    }
    // Ao TRANSICIONAR para ONLINE, dispara descoberta de capacidades (nao bloqueia o check).
    if (snapshot.transitioned && snapshot.status === 'ONLINE') {
      await this.#discover(providerName).catch(() => {});
    }
    return snapshot;
  }

  // Handshake + capability discovery reais quando a conexao sobe. So registra o que o provider
  // REALMENTE expoe; sem endpoint de discovery, os campos ficam unknown, nunca inventados.
  async #discover(providerName) {
    const provider = this.providers[providerName];
    const capabilities = [];
    if (provider && Array.isArray(provider.models) && provider.models.length) capabilities.push({ kind: 'models', value: provider.models });
    await this.store.update((state) => {
      const entry = state.apiConnectionState.find((e) => e.provider === providerName);
      if (entry) { entry.capabilities = capabilities; entry.discoveredAt = new Date(this.clock()).toISOString(); }
      return state;
    });
    if (this.bus?.emit) await this.bus.emit('api.capabilities.discovered', { provider: providerName, capabilities: capabilities.length });
  }

  // Estado corrente de um provider (ou de todos). Sempre derivado do ultimo check real.
  async status(providerName = null) {
    const state = await this.store.read();
    const all = state.apiConnectionState || [];
    if (providerName) {
      const entry = all.find((e) => e.provider === providerName);
      return entry ? measured(entry, 'api-connection-manager') : unknown(`no connection state for ${providerName}; never checked`);
    }
    return { providers: all, total: all.length };
  }
}

module.exports = { ApiConnectionManager };
