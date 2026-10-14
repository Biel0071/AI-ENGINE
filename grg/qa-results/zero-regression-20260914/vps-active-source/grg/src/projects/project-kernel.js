const { uuid } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');

const MATURITY = ['IDEA', 'SPECIFIED', 'ARCHITECTED', 'SCAFFOLDED', 'FUNCTIONAL', 'INTEGRATED', 'TESTED', 'PRODUCTION_READY'];

class ProjectKernel {
  constructor({ store, controlPlane, events, gitRead = null }) { this.store = store; this.cp = controlPlane; this.events = events; this.gitRead = gitRead; }
  async create(tenantId, actorId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const name = String(input.name || '').trim(); if (!name) throw new ValidationError('project name is required');
    const project = { id: input.id || uuid(), tenantId, name, repository: input.repository || null, workspace: input.workspace || null, branch: input.branch || null, baseCommit: input.baseCommit || null, currentCommit: input.currentCommit || null, lifecycle: input.lifecycle || 'EVOLUTION', maturity: 'IDEA', architecture: null, requirements: [], decisions: [], technicalDebt: [], createdBy: actorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await this.store.update((state) => { if (state.projects.some((item) => item.tenantId === tenantId && item.id === project.id)) throw new ValidationError(`project already exists: ${project.id}`); state.projects.push(project); state.projectKernelStates.push({ projectId: project.id, tenantId, maturity: project.maturity, completedJobs: [], pendingJobs: [], failedJobs: [], artifacts: [], updatedAt: project.updatedAt }); return state; });
    if (this.events?.emit) await this.events.emit('project.kernel.created', { tenantId, projectId: project.id });
    return project;
  }
  async state(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const data = await this.store.read(); const project = data.projects.find((item) => item.tenantId === tenantId && item.id === projectId); if (!project) throw new NotFoundError(`project not found: ${projectId}`);
    const jobs = data.runtimeJobs.filter((item) => item.tenantId === tenantId && item.projectId === projectId); const missions = data.missions.filter((item) => item.tenantId === tenantId && item.projectId === projectId); const artifacts = data.artifacts.filter((item) => item.tenantId === tenantId && item.projectId === projectId);
    const derived = { ...project, progress: { totalJobs: jobs.length, completed: jobs.filter((j) => j.status === 'SUCCEEDED').length, running: jobs.filter((j) => j.status === 'RUNNING').length, queued: jobs.filter((j) => ['QUEUED', 'AWAITING_APPROVAL'].includes(j.status)).length, failed: jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length, blocked: jobs.filter((j) => j.status === 'BLOCKED').length }, missions: missions.map((m) => ({ id: m.id, status: m.status, progress: m.progress })), artifacts: artifacts.map((a) => ({ id: a.id, type: a.type, name: a.name, createdAt: a.createdAt })), kernelState: data.projectKernelStates.find((item) => item.projectId === projectId) || null };
    return derived;
  }
  async list(tenantId, actorId) { await this.cp.authorize(tenantId, actorId, 'project:read'); const state = await this.store.read(); return state.projects.filter((item) => item.tenantId === tenantId); }
  async analyze(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const data = await this.store.read(); const project = data.projects.find((item) => item.tenantId === tenantId && item.id === projectId); if (!project) throw new NotFoundError(`project not found: ${projectId}`);
    if (!project.workspace || !this.gitRead) throw new ValidationError('project workspace and Git READ capability are required for analysis');
    const [status, branches, log, head] = await Promise.all([this.gitRead.execute('status', [], project.workspace), this.gitRead.execute('branches', [], project.workspace), this.gitRead.execute('log', [], project.workspace), this.gitRead.execute('rev-parse', [], project.workspace)]);
    const lines = [`# Project State: ${project.name}`, '', `Generated: ${new Date().toISOString()}`, `Lifecycle: ${project.lifecycle}`, `Branch: ${project.branch || 'detected from Git'}`, `HEAD: ${head.stdout.trim()}`, '', '## Working tree', '```text', status.stdout, '```', '', '## Branches', '```text', branches.stdout, '```', '', '## Recent history', '```text', log.stdout, '```', '', '## Evolution rule', '- Preserve working modules; create jobs only for measured gaps.', '- This analysis is read-only; no files or refs were modified.'].join('\n');
    const artifact = { id: uuid(), tenantId, projectId, type: 'FENIX_PROJECT_STATE', name: 'PROJECT_STATE.md', content: lines, createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((state) => { state.artifacts.push(artifact); const current = state.projects.find((item) => item.id === projectId); current.currentCommit = head.stdout.trim(); current.baseCommit ||= head.stdout.trim(); current.architecture = { source: 'git-read-analysis', branch: branches.stdout.trim().split(/\r?\n/).filter(Boolean).length, recentCommits: log.stdout.trim().split(/\r?\n/).filter(Boolean).length }; current.updatedAt = new Date().toISOString(); return state; });
    return { projectId, classification: project.lifecycle, head: head.stdout.trim(), artifact: { id: artifact.id, type: artifact.type, name: artifact.name }, evidence: { status: status.stdout, branches: branches.stdout, log: log.stdout } };
  }
  async missions(tenantId, actorId, projectId) { const state = await this.state(tenantId, actorId, projectId); return state.missions; }
  async jobs(tenantId, actorId, projectId) { const state = await this.state(tenantId, actorId, projectId); const raw = await this.store.read(); return raw.runtimeJobs.filter((item) => item.tenantId === tenantId && item.projectId === projectId); }
}
module.exports = { ProjectKernel, MATURITY };
