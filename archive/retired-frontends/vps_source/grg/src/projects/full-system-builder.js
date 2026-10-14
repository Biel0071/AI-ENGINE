const { uuid } = require('../kernel/ids');

class FullSystemBuilder {
  constructor({ store, controlPlane, missions }) { this.store = store; this.cp = controlPlane; this.missions = missions; }
  async plan(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const state = await this.store.read(); const project = state.projects.find((item) => item.tenantId === tenantId && item.id === input.projectId);
    if (!project) throw new Error(`project not found: ${input.projectId}`);
    const objective = String(input.objective || '').trim(); if (!objective) throw new Error('builder objective is required');
    const modules = Array.isArray(input.modules) && input.modules.length ? input.modules : ['architecture', 'database', 'backend', 'frontend', 'integration', 'tests', 'documentation'];
    const plan = { projectId: project.id, objective, classification: project.lifecycle || 'EVOLUTION', modules: modules.map((name, index) => ({ key: String(name).toLowerCase().replace(/[^a-z0-9-]/g, '-'), requiredCapabilities: [String(name).toLowerCase()], dependsOn: index ? [String(modules[index - 1]).toLowerCase().replace(/[^a-z0-9-]/g, '-')] : [] })), definitionOfDone: ['implementation', 'integration', 'validation', 'tests', 'documentation'] };
    const architecture = { id: uuid(), tenantId, projectId: project.id, type: 'FENIX_ARCHITECTURE_PLAN', name: 'ARCHITECTURE.md', content: `# Architecture\n\nObjective: ${objective}\n\nModules: ${modules.join(', ')}\n\nNo implementation is considered complete without tests and validation.`, createdBy: actorId, createdAt: new Date().toISOString() };
    const projectPlan = { id: uuid(), tenantId, projectId: project.id, type: 'FENIX_PROJECT_PLAN', name: 'PROJECT_PLAN.md', content: `# Project Plan\n\n${modules.map((module, index) => `${index + 1}. ${module}`).join('\n')}`, createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((next) => { next.artifacts.push(architecture, projectPlan); return next; });
    const autonomous = input.mode === 'autonomous' && input.allowCodeChanges === true;
    const steps = plan.modules.map((module) => ({ key: module.key, type: 'implement', dependsOn: module.dependsOn, validation: { testsPassed: true, risk: 'low', impactKnown: true }, payload: { projectId: project.id, requiredCapabilities: module.requiredCapabilities, objective, mode: input.mode || 'plan', allowCodeChanges: autonomous, operations: [], tests: [], runTests: true, validationPassed: false, policyAllows: autonomous, commit: autonomous } }));
    const mission = await this.missions.create(tenantId, actorId, { projectId: project.id, title: `Build: ${objective.slice(0, 150)}`, objective, steps });
    if (autonomous) {
      setImmediate(() => this.missions.start(tenantId, actorId, mission.id).catch(() => {}));
      return { project, plan, artifacts: [architecture, projectPlan].map(({ id, type, name }) => ({ id, type, name })), missionId: mission.id, status: 'QUEUED_AUTONOMOUS_EXECUTION' };
    }
    return { project, plan, artifacts: [architecture, projectPlan].map(({ id, type, name }) => ({ id, type, name })), missionId: mission.id, status: 'PLANNED_REQUIRES_AUTONOMOUS_AUTHORIZATION' };
  }
}
module.exports = { FullSystemBuilder };
