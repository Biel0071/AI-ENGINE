const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');
const { unknown } = require('../kernel/measurement');

// Operacoes GitHub HONESTAS.
//
// MEDIDO EM PRODUCAO (2026-07-29): este servico fabricava tudo -- `listOrgs` devolvia uma org
// `GRG-Services` com repositoriesCount 4/status CONNECTED escritos a mao; `listBranches`
// devolvia 3 branches fixas (commits a1b2c3d/e5f6g7h inventados) IGNORANDO o repoId e sem HTTP;
// `createPullRequest`/`createIssue` geravam `number: Math.random()` e gravavam um PR/issue FAKE
// no store, sem tocar o GitHub. `random-as-metric` + fabricacao pura. Um "PR criado" que nao
// existe no GitHub e o pior tipo de falso positivo.
//
// Regra: sem um connector real com token, o servico NAO finge operacao remota. `listOrgs`/
// `listBranches` leem o store real ou devolvem unknown; PR/issue sao registrados como LOCAIS
// (`origin: 'local-record'`) -- honestos sobre onde vivem -- e so viram operacao remota quando
// um connector real (`this.github`) com o metodo correspondente estiver conectado.
class GitHubOperationsService {
  constructor({ store, bus, controlPlane, repoIntel, digitalTwin, github = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.repoIntel = repoIntel;
    this.digitalTwin = digitalTwin;
    this.github = github;
  }

  async listOrgs(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    // Sem org fabricada: devolve o que foi registrado de verdade. Vazio e a verdade honesta.
    const orgs = (state.githubOrgs || []).filter((o) => !o.tenantId || o.tenantId === tenantId);
    return { orgs, total: orgs.length };
  }

  async listBranches(tenantId, actorId, repoId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    if (!repoId) throw new ValidationError('repoId is required to list branches');
    // Branches so podem vir de um connector real que consulta o GitHub. Sem ele, unknown com
    // motivo -- nunca 3 branches fixas com commits inventados que ignoram o repoId.
    if (!this.github || typeof this.github.listBranches !== 'function') {
      return { repoId, branches: unknown('no github connector wired; branches require a real GitHub query', { action: 'connect the GitHub connector with a token' }) };
    }
    const branches = await this.github.listBranches(repoId);
    return { repoId, branches };
  }

  async createPullRequest(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'repo:write');
    if (!input.repoId || !input.title || !input.head || !input.base) {
      throw new ValidationError('Pull Request requires repoId, title, head and base branch');
    }

    // Caminho real: connector com token abre o PR no GitHub de verdade (marco de auto-evolucao).
    if (this.github && typeof this.github.createPullRequest === 'function') {
      const remote = await this.github.createPullRequest({ repoId: input.repoId, title: input.title, body: input.body || '', head: input.head, base: input.base });
      const pr = { id: uuid(), tenantId, origin: 'github', repoId: String(input.repoId), number: remote.number, url: remote.url || null, title: String(input.title), head: String(input.head), base: String(input.base), state: remote.state || 'OPEN', author: actorId, createdAt: new Date().toISOString() };
      await this.store.update((state) => { state.githubPullRequests = state.githubPullRequests || []; state.githubPullRequests.push(pr); return state; });
      await this.#emit('github.pr.created', { tenantId, prId: pr.id, repoId: pr.repoId, number: pr.number, origin: 'github' });
      return pr;
    }

    // Sem connector: registra um PR LOCAL, sem numero aleatorio e explicitamente marcado como
    // nao-remoto. O `number` fica null (nao ha numero real do GitHub para atribuir).
    const pr = { id: uuid(), tenantId, origin: 'local-record', repoId: String(input.repoId), number: null, title: String(input.title), body: String(input.body || ''), head: String(input.head), base: String(input.base), state: 'OPEN_LOCAL', author: actorId, createdAt: new Date().toISOString(), note: 'recorded locally; no GitHub connector wired, so no remote PR was opened' };
    await this.store.update((state) => { state.githubPullRequests = state.githubPullRequests || []; state.githubPullRequests.push(pr); return state; });
    await this.#emit('github.pr.recorded', { tenantId, prId: pr.id, repoId: pr.repoId, origin: 'local-record' });
    return pr;
  }

  async createIssue(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'repo:write');
    if (!input.repoId || !input.title) {
      throw new ValidationError('Issue requires repoId and title');
    }

    if (this.github && typeof this.github.createIssue === 'function') {
      const remote = await this.github.createIssue({ repoId: input.repoId, title: input.title, body: input.body || '', labels: Array.isArray(input.labels) ? input.labels : [] });
      const issue = { id: uuid(), tenantId, origin: 'github', repoId: String(input.repoId), number: remote.number, url: remote.url || null, title: String(input.title), labels: remote.labels || [], state: remote.state || 'OPEN', author: actorId, createdAt: new Date().toISOString() };
      await this.store.update((state) => { state.githubIssues = state.githubIssues || []; state.githubIssues.push(issue); return state; });
      return issue;
    }

    const issue = { id: uuid(), tenantId, origin: 'local-record', repoId: String(input.repoId), number: null, title: String(input.title), body: String(input.body || ''), labels: Array.isArray(input.labels) ? input.labels : [], state: 'OPEN_LOCAL', author: actorId, createdAt: new Date().toISOString(), note: 'recorded locally; no GitHub connector wired, so no remote issue was opened' };
    await this.store.update((state) => { state.githubIssues = state.githubIssues || []; state.githubIssues.push(issue); return state; });
    return issue;
  }

  async #emit(type, data) {
    if (this.bus?.emit) await this.bus.emit(type, data);
    else if (this.bus?.publish) await this.bus.publish({ tenantId: data.tenantId, type, data });
  }
}

module.exports = { GitHubOperationsService };
