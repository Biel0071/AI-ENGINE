/**
 * FÊNIX OS — Agent Registry
 * Manages registration, lookup, metadata, and capability resolution for specialized agents.
 */

const { FENIX_AGENTS, AGENT_SPECIFICATIONS } = require('./agent-definitions');

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.bootDefaults();
  }

  bootDefaults() {
    for (const [key, spec] of Object.entries(AGENT_SPECIFICATIONS)) {
      this.register(key, {
        id: key,
        ...spec,
        createdAt: new Date().toISOString()
      });
    }
  }

  register(agentId, spec) {
    if (!agentId) throw new Error('agentId is required');
    if (!spec.name) throw new Error('spec.name is required');
    this.agents.set(agentId, {
      ...spec,
      id: agentId,
      updatedAt: new Date().toISOString()
    });
    return this.agents.get(agentId);
  }

  get(agentId) {
    return this.agents.get(agentId) || null;
  }

  list() {
    return Array.from(this.agents.values());
  }

  findByDomain(domain) {
    return Array.from(this.agents.values()).filter(a => a.domain === domain);
  }

  findForTask(objective = '', domain = null) {
    const text = objective.toLowerCase();
    if (domain) {
      const match = this.findByDomain(domain);
      if (match.length > 0) return match[0];
    }

    if (text.includes('css') || text.includes('component') || text.includes('react') || text.includes('frontend') || text.includes('interface')) {
      return this.get(FENIX_AGENTS.FRONTEND);
    }
    if (text.includes('api') || text.includes('controller') || text.includes('backend') || text.includes('route') || text.includes('service')) {
      return this.get(FENIX_AGENTS.BACKEND);
    }
    if (text.includes('banco') || text.includes('database') || text.includes('prisma') || text.includes('migration') || text.includes('sql')) {
      return this.get(FENIX_AGENTS.DATABASE);
    }
    if (text.includes('erro') || text.includes('bug') || text.includes('debug') || text.includes('falha') || text.includes('crash')) {
      return this.get(FENIX_AGENTS.DEBUG);
    }
    if (text.includes('teste') || text.includes('test') || text.includes('assert') || text.includes('smoke') || text.includes('e2e')) {
      return this.get(FENIX_AGENTS.TESTING);
    }
    if (text.includes('deploy') || text.includes('docker') || text.includes('vps') || text.includes('porta') || text.includes('container')) {
      return this.get(FENIX_AGENTS.DEPLOYMENT);
    }
    if (text.includes('git') || text.includes('commit') || text.includes('branch')) {
      return this.get(FENIX_AGENTS.GIT);
    }
    if (text.includes('github') || text.includes('pull request') || text.includes('pr') || text.includes('issue')) {
      return this.get(FENIX_AGENTS.GITHUB);
    }
    if (text.includes('visual') || text.includes('layout') || text.includes('cor') || text.includes('design') || text.includes('alinhamento')) {
      return this.get(FENIX_AGENTS.VISUAL);
    }

    return this.get(FENIX_AGENTS.DEVELOPER);
  }
}

module.exports = { AgentRegistry };
