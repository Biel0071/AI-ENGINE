const { uuid } = require('../kernel/ids');
const { NotFoundError, ValidationError } = require('../kernel/errors');
const { GitReadCapability } = require('../repo-intel/git-read-capability');
const { ProjectUnderstandingScanner } = require('../repo-intel/project-understanding-scanner');
const { resolveProjectWorkspace, resolveProjectBranch } = require('./project-workspace-resolver');

const MATURITY = ['IDEA', 'SPECIFIED', 'ARCHITECTED', 'SCAFFOLDED', 'FUNCTIONAL', 'INTEGRATED', 'TESTED', 'PRODUCTION_READY'];

class ProjectKernel {
  constructor({ store, controlPlane, events, gitRead = null, scanner = new ProjectUnderstandingScanner(), systemTwinEngine = null, graphBrain = null }) { this.store = store; this.cp = controlPlane; this.events = events; this.gitRead = gitRead; this.scanner = scanner; this.systemTwinEngine = systemTwinEngine; this.graphBrain = graphBrain || systemTwinEngine?.graphBrain || null; }
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
    const data = await this.store.read();
    const { getProjectById } = require('./project-registry');
    const regProj = getProjectById(projectId);
    const localProject = require('./local-project-catalog').getLocalProjectById(projectId);
    let project = data.projects.find((item) => item.tenantId === tenantId && item.id === projectId);
    if (project) {
      const resolvedWorkspace = resolveProjectWorkspace(project, regProj);
      const workspace = resolvedWorkspace || regProj?.localPath || regProj?.vpsPath || null;
      const branch = resolveProjectBranch(project, regProj, workspace);
      const regStack = regProj
        ? [regProj.backend?.framework || regProj.backend?.runtime, regProj.frontend?.framework].filter(Boolean).join(' · ')
        : null;
      project = {
        ...(regProj || {}),
        ...project,
        workspace,
        workspaceAvailable: Boolean(resolvedWorkspace),
        branch,
        stack: project.stack || regStack || null,
        techStack: project.techStack || regProj?.tags || null,
        health: project.health || (regProj?.status === 'ONLINE' ? 'HEALTHY' : null),
        status: (project.status && project.status !== 'DISCOVERED') ? project.status : (regProj?.status || project.status || 'ONLINE'),
        agents: Array.isArray(project.agents) && project.agents.length ? project.agents : (regProj?.agents || null),
      };
    } else if (regProj) {
      const regStack = [regProj.backend?.framework || regProj.backend?.runtime, regProj.frontend?.framework].filter(Boolean).join(' · ');
      const resolvedWorkspace = resolveProjectWorkspace(null, regProj);
      project = {
        ...regProj,
        id: regProj.id || regProj.projectId,
        tenantId,
        name: regProj.name,
        workspace: resolvedWorkspace || regProj.localPath || regProj.vpsPath || null,
        workspaceAvailable: Boolean(resolvedWorkspace),
        branch: regProj.branch || 'main',
        stack: regStack || null,
        techStack: regProj.tags || null,
        health: regProj.status === 'ONLINE' ? 'HEALTHY' : null,
        lifecycle: 'EVOLUTION',
        maturity: 'FUNCTIONAL',
        status: regProj.status || 'ONLINE',
      };
    } else if (localProject) {
      project = { ...localProject, tenantId, branch: null, stack: null, techStack: null, health: null };
    }
    if (!project) throw new NotFoundError(`project not found: ${projectId}`);
    const absorbedMap = data.projectAbsorptions && typeof data.projectAbsorptions === 'object' ? data.projectAbsorptions : {};
    const jobs = data.runtimeJobs.filter((item) => item.tenantId === tenantId && item.projectId === projectId);
    const missions = data.missions.filter((item) => item.tenantId === tenantId && item.projectId === projectId);
    const artifacts = data.artifacts.filter((item) => item.tenantId === tenantId && item.projectId === projectId);
    const derived = {
      ...project,
      absorbed: Boolean(absorbedMap[project.id] || absorbedMap[projectId] || projectId === 'fenix-os'),
      progress: {
        totalJobs: jobs.length,
        completed: jobs.filter((j) => j.status === 'SUCCEEDED').length,
        running: jobs.filter((j) => j.status === 'RUNNING').length,
        queued: jobs.filter((j) => ['QUEUED', 'AWAITING_APPROVAL'].includes(j.status)).length,
        failed: jobs.filter((j) => ['FAILED', 'DEAD_LETTER'].includes(j.status)).length,
        blocked: jobs.filter((j) => j.status === 'BLOCKED').length,
      },
      missions: missions.map((m) => ({ id: m.id, status: m.status, progress: m.progress })),
      artifacts: artifacts.map((a) => ({ id: a.id, type: a.type, name: a.name, createdAt: a.createdAt })),
      kernelState: data.projectKernelStates.find((item) => item.projectId === projectId) || null,
    };
    return derived;
  }
  async list(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const absorbedMap = state.projectAbsorptions && typeof state.projectAbsorptions === 'object' ? state.projectAbsorptions : {};
    const stored = state.projects.filter((item) => item.tenantId === tenantId);
    if (stored.length > 0) {
      const { getProjectById } = require('./project-registry');
      const listed = stored.map((project) => {
        const registeredProject = getProjectById(project.id);
        const resolvedWorkspace = resolveProjectWorkspace(project, registeredProject);
        const workspace = resolvedWorkspace || registeredProject?.localPath || registeredProject?.vpsPath || null;
        const branch = resolveProjectBranch(project, registeredProject, workspace);
        const regStack = registeredProject
          ? [registeredProject.backend?.framework || registeredProject.backend?.runtime, registeredProject.frontend?.framework].filter(Boolean).join(' · ')
          : null;
        return {
          ...(registeredProject || {}),
          ...project,
          name: (project.name && project.name !== 'Projeto') ? project.name : (registeredProject?.name || project.name || project.id),
          workspace,
          workspaceAvailable: Boolean(resolvedWorkspace),
          branch,
          stack: project.stack || regStack || null,
          techStack: project.techStack || (registeredProject?.tags ? registeredProject.tags : null),
          health: project.health || (registeredProject?.status === 'ONLINE' ? 'HEALTHY' : null),
          status: (project.status && project.status !== 'DISCOVERED') ? project.status : (registeredProject?.status || project.status || 'ONLINE'),
          agents: Array.isArray(project.agents) && project.agents.length ? project.agents : (registeredProject?.agents || null),
          absorbed: Boolean(absorbedMap[project.id] || project.id === 'fenix-os'),
        };
      });
      return mergeLocalCatalog(listed, require('./local-project-catalog').getLocalProjects(), tenantId);
    }
    try {
      const { getAllProjects } = require('./project-registry');
      const reg = await getAllProjects();
      const listed = reg.map((p) => {
        const id = p.id || p.projectId;
        const regStack = [p.backend?.framework || p.backend?.runtime, p.frontend?.framework].filter(Boolean).join(' · ');
        const resolvedWorkspace = resolveProjectWorkspace(null, p);
        return {
          ...p,
          id,
          tenantId,
          name: p.name,
          displayName: p.displayName,
          repository: p.repository,
          workspace: resolvedWorkspace || p.localPath || p.vpsPath || null,
          workspaceAvailable: Boolean(resolvedWorkspace),
          branch: p.branch || 'main',
          stack: regStack || null,
          techStack: p.tags || null,
          health: p.status === 'ONLINE' ? 'HEALTHY' : null,
          lifecycle: 'EVOLUTION',
          maturity: 'FUNCTIONAL',
          status: p.status || 'ONLINE',
          absorbed: Boolean(absorbedMap[id] || id === 'fenix-os'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });
      return mergeLocalCatalog(listed, require('./local-project-catalog').getLocalProjects(), tenantId);
    } catch (_) {
      return [];
    }
  }
  async analyze(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const data = await this.store.read(); const storedProject = data.projects.find((item) => item.tenantId === tenantId && item.id === projectId); if (!storedProject) throw new NotFoundError(`project not found: ${projectId}`);
    const { getProjectById } = require('./project-registry');
    const project = { ...storedProject, workspace: resolveProjectWorkspace(storedProject, getProjectById(projectId)) };
    if (!project.workspace) throw new ValidationError('project workspace is required for analysis');
    const read = new GitReadCapability({ workspaceRoot: project.workspace });
    const [status, branches, log, head, perception] = await Promise.all([read.execute('status'), read.execute('branches'), read.execute('log'), read.execute('rev-parse'), this.scanner.scan(project.workspace)]);
    const lines = [`# Project State: ${project.name}`, '', `Generated: ${new Date().toISOString()}`, `Lifecycle: ${project.lifecycle}`, `Branch: ${project.branch || 'detected from Git'}`, `HEAD: ${head.stdout.trim()}`, '', '## Working tree', '```text', status.stdout, '```', '', '## Branches', '```text', branches.stdout, '```', '', '## Recent history', '```text', log.stdout, '```', '', '## Evolution rule', '- Preserve working modules; create jobs only for measured gaps.', '- This analysis is read-only; no files or refs were modified.'].join('\n');
    const artifact = { id: uuid(), tenantId, projectId, type: 'FENIX_PROJECT_STATE', name: 'PROJECT_STATE.md', content: lines, createdBy: actorId, createdAt: new Date().toISOString() };
    const integration = this.linkPerceptionToSystemModel({ tenantId, project, perception, head: head.stdout.trim(), branch: project.branch || branches.stdout.trim().split(/\r?\n/).find(Boolean) || null });
    const linkedPerception = { ...perception, integration };
    const perceptionArtifact = { id: uuid(), tenantId, projectId, type: 'FENIX_PROJECT_PERCEPTION_MAP', name: 'PROJECT_PERCEPTION.json', content: JSON.stringify(linkedPerception), createdBy: actorId, createdAt: new Date().toISOString() };
    await this.store.update((state) => { state.artifacts.push(artifact, perceptionArtifact); const current = state.projects.find((item) => item.id === projectId); current.currentCommit = head.stdout.trim(); current.baseCommit ||= head.stdout.trim(); current.architecture = { source: 'git-and-source-evidence', branchCount: branches.stdout.trim().split(/\r?\n/).filter(Boolean).length, recentCommitCount: log.stdout.trim().split(/\r?\n/).filter(Boolean).length, observedFileCount: perception.totalFiles, observedRouteCount: perception.routes.length, coverage: perception.coverage.status }; current.updatedAt = new Date().toISOString(); return state; });
    return { projectId, classification: project.lifecycle, head: head.stdout.trim(), artifact: { id: artifact.id, type: artifact.type, name: artifact.name }, perceptionArtifact: { id: perceptionArtifact.id, type: perceptionArtifact.type, name: perceptionArtifact.name }, perception: { status: perception.status, coverage: perception.coverage, files: perception.totalFiles, routes: perception.routes.length, components: perception.components.length, tests: perception.tests.length, testsStatus: 'NOT_RUN', scannedAt: perception.scannedAt }, integration, evidence: { status: status.stdout, branches: branches.stdout, log: log.stdout } };
  }
  linkPerceptionToSystemModel({ tenantId, project, perception, head, branch }) {
    if (!this.systemTwinEngine?.createOrUpdateTwin) return { status: 'NOT_CONFIGURED', systemTwin: { status: 'NOT_CONFIGURED' }, graphBrain: { status: 'NOT_CONFIGURED' } };
    const twinId = `twin_${twinIdPart(tenantId)}_${twinIdPart(project.id)}`;
    try {
      const twin = this.systemTwinEngine.createOrUpdateTwin({
        id: twinId,
        tenantId,
        projectId: project.id,
        name: project.name,
        description: 'Source-backed project map generated by the bounded Project Understanding Scanner.',
        sourceUrl: project.repository || null,
        status: perception.status,
        pages: [],
        components: perception.components.map((component) => ({
          id: graphEvidenceId('component', tenantId, project.id, component.path),
          name: component.name,
          path: component.path,
          evidence: component.evidence
        })),
        apis: perception.routes.map((route) => ({
          id: graphEvidenceId('api', tenantId, project.id, route.method, route.path, route.file),
          method: route.method,
          endpoint: route.path,
          file: route.file,
          evidence: route.evidence
        })),
        tests: perception.tests.map((item) => ({
          id: graphEvidenceId('test', tenantId, project.id, item.path),
          name: item.path,
          path: item.path,
          status: item.status,
          evidence: item.evidence
        })),
        dependencies: perception.dependencies.map((item) => ({
          id: graphEvidenceId('dependency', tenantId, project.id, item.name, item.manifest),
          name: item.name,
          version: item.version,
          manifest: item.manifest,
          evidence: `declared in ${item.section}`
        })),
        git: { head, branch, evidence: 'GitReadCapability' },
        perception: {
          source: 'ProjectUnderstandingScanner',
          status: perception.status,
          coverage: perception.coverage,
          counts: { files: perception.totalFiles, routes: perception.routes.length, components: perception.components.length, dependencies: perception.dependencies.length, tests: perception.tests.length, imports: perception.imports.length },
          evidence: perception.evidence,
          scannedAt: perception.scannedAt
        }
      });
      const graphStatus = twin.graphSync?.status || 'UNAVAILABLE';
      return {
        status: graphStatus === 'LINKED' ? 'LINKED' : 'PARTIAL',
        systemTwin: { id: twin.id, status: twin.status, updatedAt: twin.updatedAt },
        graphBrain: { status: graphStatus, projectNodeId: twin.graphSync?.projectNodeId || null, nodes: twin.graphSync?.nodes || 0, edges: twin.graphSync?.edges || 0, persisted: twin.graphSync?.persisted === true }
      };
    } catch (error) {
      return { status: 'PARTIAL', systemTwin: { status: 'FAILED' }, graphBrain: { status: 'FAILED' } };
    }
  }
  async analysis(tenantId, actorId, projectId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const data = await this.store.read();
    const artifact = data.artifacts.filter((item) => item.tenantId === tenantId && item.projectId === projectId && item.type === 'FENIX_PROJECT_PERCEPTION_MAP').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (!artifact) throw new NotFoundError(`project analysis not found: ${projectId}`);
    let report;
    try { report = JSON.parse(artifact.content); } catch { throw new ValidationError('persisted project analysis is invalid'); }
    return { projectId, artifact: { id: artifact.id, type: artifact.type, name: artifact.name, createdAt: artifact.createdAt }, integration: report.integration || { status: 'NOT_RECORDED' }, systemTwin: report.integration?.systemTwin || null, report };
  }
  async missions(tenantId, actorId, projectId) { const state = await this.state(tenantId, actorId, projectId); return state.missions; }
  async jobs(tenantId, actorId, projectId) { const state = await this.state(tenantId, actorId, projectId); const raw = await this.store.read(); return raw.runtimeJobs.filter((item) => item.tenantId === tenantId && item.projectId === projectId); }
}

function mergeLocalCatalog(projects, catalog, tenantId) {
  const result = projects.map((project) => ({ ...project }));
  const localOnly = [];
  for (const entry of catalog) {
    const variant = /c[oó]pia|variante/i.test(String(entry.versionRole || ''));
    const entryWorkspace = normalizeWorkspace(entry.workspace);
    const entryName = normalizeProjectName(entry.name);
    const matches = !variant && !entry.entryFile
      ? result.filter((project) => {
        if (project.id === entry.id) return true;
        const registryProject = Array.isArray(project.aliases) || Boolean(project.localPath || project.vpsPath);
        const projectName = normalizeProjectName(project.name);
        const relatedName = entryName === projectName || entryName.startsWith(`${projectName} `) || projectName.startsWith(`${entryName} `);
        return registryProject && entryWorkspace && entryWorkspace === normalizeWorkspace(project.workspace)
          && entryName && relatedName;
      })
      : [];
    const canonical = matches.length === 1 ? matches[0] : null;
    if (!canonical) {
      const id = `local-${entry.id}`;
      localOnly.push({ ...entry, id, projectId: id, catalogId: entry.id, tenantId });
      continue;
    }
    Object.assign(canonical, {
      localCatalogId: entry.id,
      localCatalogSource: entry.source || 'LOCAL_PROJECT_CATALOG',
      localCatalogPath: entry.listedPath || null,
      localCatalogGroup: entry.catalogGroup || null,
      localCatalogVersionRole: entry.versionRole || null,
      logoId: entry.logoId || canonical.logoId || null,
      logoUrl: entry.logoUrl || canonical.logoUrl || null,
      localPort: entry.localPort ?? canonical.localPort ?? null,
      apiPort: entry.apiPort ?? canonical.apiPort ?? null,
      localUrl: entry.localUrl || canonical.localUrl || null,
      healthUrl: entry.healthUrl || canonical.healthUrl || null,
      remoteUrl: entry.remoteUrl || canonical.remoteUrl || null,
      remoteHealthUrl: entry.remoteHealthUrl || canonical.remoteHealthUrl || null,
      projectVersion: entry.projectVersion || canonical.projectVersion || null,
      workspaceAvailable: Boolean(canonical.workspaceAvailable || entry.workspaceAvailable),
    });
  }
  return [...result, ...localOnly];
}
function normalizeWorkspace(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  return require('node:path').resolve(value).replace(/\\/g, '/').toLowerCase();
}
function normalizeProjectName(value) {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    : '';
}
function twinIdPart(value) {
  const raw = String(value || 'default');
  const readable = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'item';
  if (readable === raw) return readable;
  const digest = require('node:crypto').createHash('sha256').update(raw).digest('hex').slice(0, 10);
  return `${readable}_${digest}`;
}
function graphEvidenceId(type, tenantId, projectId, ...parts) {
  return `${type}:${[tenantId, projectId, ...parts].map((part) => encodeURIComponent(String(part ?? ''))).join(':')}`;
}
module.exports = { ProjectKernel, MATURITY, mergeLocalCatalog };
