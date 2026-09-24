const { AgentRegistry } = require('./agent-registry');
const { NotFoundError, ForbiddenError, ValidationError } = require('../kernel/errors');

class AgentJobAssignment {
  constructor({ store, registry = new AgentRegistry(), memory = null, hierarchy = null } = {}) { this.store = store; this.registry = registry; this.memory = memory; this.hierarchy = hierarchy; }
  async assign(input = {}) {
    const required = Array.isArray(input.requiredCapabilities) ? input.requiredCapabilities.map(String).map((item) => item.toLowerCase()) : [];
    const state = await this.store.read();
    let agent;
    if (input.agentId) {
      agent = state.cognitiveAgents.find((item) => item.id === input.agentId && item.tenantId === input.tenantId && item.status === 'ACTIVE') || this.registry.get(input.agentId);
      if (!agent) throw new NotFoundError(`agent not found: ${input.agentId}`);
      if (agent.entityId) {
        if (agent.coordinator || agent.executionAllowed === false) throw new ForbiddenError('agent cannot execute tasks');
        if (!this.hierarchy) throw new ValidationError('cognitive scope is unavailable');
        await this.hierarchy.authorizeScope(input.tenantId, input.actorId, agent.entityId, 'write');
      }
    } else {
      agent = this.registry.findForTask([input.type, input.prompt, required.join(' ')].filter(Boolean).join(' '), required[0] || null) || this.registry.get('Developer');
    }
    if (!agent) return null;
    const projectId = input.projectId || input.context?.projectId || null;
    const project = projectId ? state.projects.find((item) => item.id === projectId) || null : null;
    const missions = projectId ? state.missions.filter((item) => item.projectId === projectId).slice(-10) : [];
    const artifacts = projectId ? state.artifacts.filter((item) => item.projectId === projectId).slice(-20) : [];
    const memories = this.memory ? await this.memory.search(input.tenantId || project?.tenantId, input.actorId || project?.createdBy, { q: `${input.prompt || input.type || ''} ${required.join(' ')}`, limit: 5 }) : [];
    return { agentId: agent.id, name: agent.name || agent.role, role: agent.domain || agent.role || agent.name, entityId: agent.entityId || null, capabilities: agent.tools || [], provider: agent.provider || 'configured-runtime', model: agent.model || null, status: agent.entityId ? 'AVAILABLE' : (agent.status || 'AVAILABLE'), permissions: agent.permissions || [], context: { project, missionId: input.missionId || null, job: { type: input.type, prompt: input.prompt || null, requiredCapabilities: required }, previousMissions: missions, previousArtifacts: artifacts, relevantMemories: memories, workspace: project?.workspace || input.workspace || null, branch: project?.branch || input.branch || null, baseCommit: project?.baseCommit || null, currentCommit: project?.currentCommit || null } };
  }
}
module.exports = { AgentJobAssignment };
