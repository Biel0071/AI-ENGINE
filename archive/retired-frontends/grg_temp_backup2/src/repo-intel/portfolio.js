// PortfolioService: acopla TODOS os repositórios de um usuário/org GitHub de uma vez e mapeia
// cada um dentro do sistema (registro + análise real via clone). Fecha o pedido "acoplar todos
// os projetos do meu user e mapear".
const { NotFoundError } = require('../kernel/errors');

class PortfolioService {
  constructor({ controlPlane, repoIntel, github, digitalTwin, evolution }) {
    this.cp = controlPlane;
    this.repoIntel = repoIntel;
    this.github = github;
    this.digitalTwin = digitalTwin;
    this.evolution = evolution;
  }

  // Lista os repos do usuário sem acoplar (preview do que existe).
  async discover(username) {
    return this.github.listUserRepos(username);
  }

  // Acopla e mapeia todos. analyze=true clona+analisa cada repo não-vazio.
  async ingestUser(tenantId, actorId, username, { analyze = true, maxSizeKb = null, onProgress = null } = {}) {
    await this.cp.authorize(tenantId, actorId, 'repo:connect');
    const repos = await this.github.listUserRepos(username);
    const results = [];

    for (const meta of repos) {
      const entry = { name: meta.name, url: meta.url, language: meta.language, sizeKb: meta.sizeKb, private: meta.private, status: 'pending' };
      if (meta.empty) { entry.status = 'skipped-empty'; results.push(entry); if (onProgress) onProgress(entry); continue; }
      if (maxSizeKb && meta.sizeKb > maxSizeKb) { entry.status = 'skipped-too-large'; results.push(entry); if (onProgress) onProgress(entry); continue; }

      try {
        let repo;
        try {
          repo = await this.repoIntel.connect(tenantId, actorId, { url: meta.url, visibility: meta.private ? 'private' : 'public' });
        } catch (e) {
          if (/already connected/i.test(e.message)) {
            const list = await this.repoIntel.listRepositories(tenantId, actorId);
            repo = list.find((r) => r.url.toLowerCase() === meta.url.toLowerCase().replace(/\.git$/, ''));
          } else throw e;
        }
        entry.repoId = repo.id;
        entry.status = 'connected';

        if (analyze) {
          const { snapshot } = await this.repoIntel.analyze(tenantId, actorId, repo.id);
          entry.status = 'analyzed';
          entry.revision = snapshot.revision.slice(0, 8);
          entry.fileCount = snapshot.fileCount;
          entry.capabilities = snapshot.capabilities.map((c) => c.id);
          entry.health = snapshot.scores;
        }
      } catch (e) {
        entry.status = 'error';
        entry.error = e.message;
      }
      results.push(entry);
      if (onProgress) onProgress(entry);
    }

    return { username, total: repos.length, results };
  }
}

module.exports = { PortfolioService };
