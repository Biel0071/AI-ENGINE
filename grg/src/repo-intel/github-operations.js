const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

class GitHubOperationsService {
  constructor({ store, bus, controlPlane, repoIntel, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.repoIntel = repoIntel;
    this.digitalTwin = digitalTwin;
  }

  async listOrgs(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    const state = await this.store.read();
    const orgs = (state.githubOrgs || [
      { id: 'org-grg', name: 'GRG-Services', repositoriesCount: 4, memberCount: 12, status: 'CONNECTED' },
    ]);
    return { orgs, total: orgs.length };
  }

  async listBranches(tenantId, actorId, repoId) {
    await this.cp.authorize(tenantId, actorId, 'repo:read');
    return {
      repoId,
      branches: [
        { name: 'main', isDefault: true, protected: true, lastCommit: 'a1b2c3d' },
        { name: 'develop', isDefault: false, protected: false, lastCommit: 'e5f6g7h' },
        { name: 'feature/v6-genesis', isDefault: false, protected: false, lastCommit: '9i8h7g6' },
      ],
    };
  }

  async createPullRequest(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'repo:write');
    if (!input.repoId || !input.title || !input.head || !input.base) {
      throw new ValidationError('Pull Request requires repoId, title, head and base branch');
    }

    const pr = {
      id: uuid(),
      tenantId,
      repoId: String(input.repoId),
      number: Math.floor(Math.random() * 900) + 100,
      title: String(input.title),
      body: String(input.body || ''),
      head: String(input.head),
      base: String(input.base),
      state: 'OPEN',
      author: actorId,
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.githubPullRequests = state.githubPullRequests || [];
      state.githubPullRequests.push(pr);
      return state;
    });

    if (this.bus?.emit) {
      await this.bus.emit('github.pr.created', { tenantId, prId: pr.id, repoId: pr.repoId, number: pr.number });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'github.pr.created', data: { prId: pr.id, repoId: pr.repoId, number: pr.number } });
    }

    return pr;
  }

  async createIssue(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'repo:write');
    if (!input.repoId || !input.title) {
      throw new ValidationError('Issue requires repoId and title');
    }

    const issue = {
      id: uuid(),
      tenantId,
      repoId: String(input.repoId),
      number: Math.floor(Math.random() * 900) + 1,
      title: String(input.title),
      body: String(input.body || ''),
      labels: Array.isArray(input.labels) ? input.labels : ['enhancement'],
      state: 'OPEN',
      author: actorId,
      createdAt: new Date().toISOString(),
    };

    await this.store.update((state) => {
      state.githubIssues = state.githubIssues || [];
      state.githubIssues.push(issue);
      return state;
    });

    return issue;
  }
}

module.exports = { GitHubOperationsService };
