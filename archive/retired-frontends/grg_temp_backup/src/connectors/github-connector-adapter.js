'use strict';

const { measured, unknown } = require('../kernel/measurement');
const { CONNECTOR_STATES } = require('./connector-contract');

// MISSION-0004 — ADAPTADOR DO GITHUB PARA O CONNECTOR RUNTIME.
//
// NÃO reimplementa HTTP. Compõe o `GitHubConnector` que já existe
// (src/repo-intel/github-connector.js, https nativo, verbos reais) e o veste com os doze
// métodos do contrato. Toda "prova de conexão" vem de uma chamada REAL à API — nunca de
// configuração. Sem token, cada método devolve o estado honesto (CONFIGURED / unknown),
// jamais CONNECTED.
//
// A distinção que sustenta a regra REALITY FIRST:
//   authenticate() responde "há credencial?" — presença, não sucesso.
//   selfTest()     responde "a credencial FUNCIONA?" — bate em /user/repos de verdade.
//   health()       deriva das duas. CONNECTED só quando selfTest passou medido.
const CAPABILITIES = Object.freeze(['repo:read', 'branch:read', 'pr:write', 'issue:write']);

class GitHubConnectorAdapter {
  // Recebe o GitHubConnector já construído (injeção permite um fake nos testes, provando o
  // caminho CONNECTED sem token real) e o store, para gravar métrica/evento.
  constructor({ github, store = null, id = 'github' } = {}) {
    if (!github) throw new Error('GitHubConnectorAdapter requires a GitHubConnector instance');
    this.id = id;
    this.github = github;
    this.store = store;
  }

  register() {
    return {
      id: this.id,
      kind: 'source-control',
      contract: 'github/v3',
      capabilities: CAPABILITIES,
    };
  }

  // REST não mantém socket vivo: "connect" é a transição de lifecycle que o runtime grava.
  // A prova de que dá para usar é o selfTest, não este método.
  async connect() { return { id: this.id, transitioned: true }; }
  async disconnect() { return { id: this.id, transitioned: true }; }

  // Presença de credencial. Mede, não fabrica: token ausente é uma resposta honesta.
  async authenticate() {
    const present = Boolean(this.github.token);
    return {
      ok: present,
      credential: present
        ? measured('present', 'GitHubConnector.token', { note: 'presence only; the value is never read or stored' })
        : unknown('no GITHUB_TOKEN configured', 'set GITHUB_TOKEN so the connector can authenticate against api.github.com'),
    };
  }

  // O escopo pedido está entre o que o conector sabe fazer? Autorização de forma; a
  // autorização real da credencial só se prova ao chamar a API (selfTest cobre isso).
  async authorize(scope) {
    const granted = !scope || CAPABILITIES.includes(scope);
    return { ok: granted, scope: scope || null, capabilities: CAPABILITIES };
  }

  // PROVA DE VIDA REAL. listUserRepos() sem username bate em /user/repos autenticado.
  // Sucesso = a credencial funciona AGORA. Falha (sem token, rede, rate limit) volta
  // medida, nunca como sucesso silencioso.
  async selfTest() {
    const started = Date.now();
    if (!this.github.token) {
      return { ok: false, reason: unknown('no credential to test', 'set GITHUB_TOKEN'), latencyMs: 0 };
    }
    try {
      const repos = await this.github.listUserRepos();
      const latencyMs = Date.now() - started;
      return {
        ok: true,
        latencyMs: measured(latencyMs, 'derived:selfTest duration'),
        observed: measured(Array.isArray(repos) ? repos.length : 0, 'GitHubConnector.listUserRepos()'),
      };
    } catch (error) {
      return { ok: false, latencyMs: Date.now() - started, error: String(error.message || error) };
    }
  }

  // Saúde DERIVADA. Nunca um literal 'HEALTHY'. Sem token → unknown (não sei, não "ruim").
  // Com token e selfTest ok → healthy medido. Com token e selfTest falhando → degraded.
  async health() {
    const auth = await this.authenticate();
    if (!auth.ok) {
      return { ok: false, state: CONNECTOR_STATES.CONFIGURED, detail: unknown('not authenticated', 'set GITHUB_TOKEN') };
    }
    const test = await this.selfTest();
    return test.ok
      ? { ok: true, state: CONNECTOR_STATES.CONNECTED, detail: measured('selfTest passed', 'GitHubConnectorAdapter.selfTest()') }
      : { ok: false, state: CONNECTOR_STATES.DEGRADED, detail: measured('selfTest failed', 'GitHubConnectorAdapter.selfTest()', { error: test.error || null }) };
  }

  capabilities() { return CAPABILITIES.slice(); }

  // Limites conhecidos da API do GitHub. Declarados como referência; o valor observado de
  // rate limit exigiria ler o header X-RateLimit, que o GitHubConnector ainda não expõe.
  limits() {
    return {
      declared: { requestsPerHourAuthenticated: 5000, requestsPerHourAnonymous: 60 },
      observed: unknown('rate-limit headers are not captured yet', 'read X-RateLimit-Remaining in GitHubConnector to observe the live limit'),
    };
  }

  events() { return ['connector.selftest', 'connector.state.changed']; }

  // Métricas do que JÁ aconteceu, lidas do store. Vazio → unknown, nunca zero fabricado.
  async metrics(tenantId) {
    if (!this.store) return { calls: unknown('no store wired to read connector metrics') };
    const state = await this.store.read();
    const rows = (state.connectorMetrics || []).filter((item) => item.connectorId === this.id && (!tenantId || item.tenantId === tenantId));
    if (!rows.length) {
      return { calls: unknown('no connector call has been recorded yet', 'run a selfTest or an operation to accumulate metrics') };
    }
    const failures = rows.filter((item) => item.ok === false).length;
    return {
      calls: measured(rows.length, 'store:connectorMetrics'),
      failures: measured(failures, 'derived:connectorMetrics.ok === false'),
      lastAt: measured(rows[rows.length - 1].recordedAt, 'store:connectorMetrics'),
    };
  }

  version() { return { api: 'github/v3', accept: 'application/vnd.github+json' }; }
}

module.exports = { GitHubConnectorAdapter, GITHUB_CAPABILITIES: CAPABILITIES };
