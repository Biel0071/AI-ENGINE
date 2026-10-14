const { ValidationError } = require('../kernel/errors');

class CrossProjectLearning {
  constructor({ store, bus, controlPlane, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.digitalTwin = digitalTwin;
  }

  async analyzeProjects(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const projects = (state.projects || []).filter((p) => p.tenantId === tenantId);
    const repos = (state.repositories || []).filter((r) => r.tenantId === tenantId);
    const capabilities = (state.capabilities || []).filter((c) => c.tenantId === tenantId);

    const patterns = [];
    const suggestions = [];

    // Detect repeated stacks / authentication / APIs
    const stacks = {};
    for (const repo of repos) {
      const stack = repo.analysis?.stack || repo.stack || 'node';
      stacks[stack] = (stacks[stack] || 0) + 1;
    }

    for (const [stack, count] of Object.entries(stacks)) {
      if (count > 1) {
        patterns.push({
          type: 'DUPLICATE_STACK',
          description: `Found ${count} repositories using stack ${stack}`,
          count,
        });
        suggestions.push({
          title: `Standardize ${stack} Pipeline`,
          category: 'REUSE',
          confidence: 0.9,
          impact: 'High build efficiency & code reuse',
          projectsAffected: repos.filter((r) => (r.analysis?.stack || r.stack || 'node') === stack).map((r) => r.name),
        });
      }
    }

    // Detect shared capabilities
    if (capabilities.length > 0) {
      patterns.push({
        type: 'CAPABILITY_CATALOG',
        description: `${capabilities.length} reusable capabilities available in the ecosystem`,
        count: capabilities.length,
      });
    }

    const report = {
      tenantId,
      analyzedAt: new Date().toISOString(),
      projectCount: projects.length,
      repositoryCount: repos.length,
      patterns,
      suggestions,
    };

    if (this.bus?.emit) {
      await this.bus.emit('cross-project.analysis.completed', { tenantId, suggestionsCount: suggestions.length });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'cross-project.analysis.completed', data: { suggestionsCount: suggestions.length } });
    }

    return report;
  }
}

module.exports = { CrossProjectLearning };
