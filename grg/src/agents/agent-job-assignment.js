const { AgentRegistry } = require('./agent-registry');

class AgentJobAssignment {
  constructor({ store, registry = new AgentRegistry(), memory = null } = {}) { this.store = store; this.registry = registry; this.memory = memory; }
  async assign(input = {}) {
    const required = Array.isArray(input.requiredCapabilities) ? input.requiredCapabilities.map(String).map((item) => item.toLowerCase()) : [];
    const agent = this.registry.findForTask([input.type, input.prompt, required.join(' ')].filter(Boolean).join(' '), required[0] || null) || this.registry.get('Developer');
    if (!agent) return null;
    const state = await this.store.read(); const projectId = input.projectId || input.context?.projectId || null;
    const project = projectId ? state.projects.find((item) => item.id === projectId) || null : null;
    const missions = projectId ? state.missions.filter((item) => item.projectId === projectId).slice(-10) : [];
    const artifacts = projectId ? state.artifacts.filter((item) => item.projectId === projectId).slice(-20) : [];
    const memories = this.memory ? await this.memory.search(input.tenantId || project?.tenantId, input.actorId || project?.createdBy, { q: `${input.prompt || input.type || ''} ${required.join(' ')}`, limit: 5 }) : [];
    return { agentId: agent.id, name: agent.name, role: agent.domain || agent.name, capabilities: agent.tools || [], provider: agent.provider || 'configured-runtime', model: agent.model || null, status: agent.status || 'AVAILABLE', permissions: agent.permissions || [], context: { project, missionId: input.missionId || null, job: { type: input.type, prompt: input.prompt || null, requiredCapabilities: required }, previousMissions: missions, previousArtifacts: artifacts, relevantMemories: memories, workspace: project?.workspace || input.workspace || null, branch: project?.branch || input.branch || null, baseCommit: project?.baseCommit || null, currentCommit: project?.currentCommit || null } };
  }
}
module.exports = { AgentJobAssignment };
