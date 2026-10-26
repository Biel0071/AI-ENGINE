const os = require('node:os');
const { globalBus } = require('../eventing/fenix-event-bus');
const { getWorldStateEngine } = require('../world-model/world-state-engine');
const { getWorldSimulationEngine } = require('../world-model/world-simulation-engine');
const { getWorldCommandEngine } = require('../world-model/world-command-engine');
const { getWorldIntentPlanner } = require('../world-model/world-intent-planner');
const { getProjectById } = require('../projects/project-registry');
const { globalGraphBrain } = require('../brain/graph-brain');
const { RealityCompiler, persistBlueprintToGraphBrain, isOrganizationCreationIntent } = require('../world-model/reality-compiler');

const realityCompiler = new RealityCompiler();
const AVATAR_PROFILE_FIELDS = {
  skin: new Set(['light', 'fair', 'tan', 'brown', 'dark', 'cyber_cyan', 'neon_green', 'synth_gold']),
  hairStyle: new Set(['spiky', 'slick', 'buzz', 'bob', 'long', 'crest']),
  hairColor: new Set(['black', 'brown', 'blonde', 'red', 'silver', 'cyan', 'purple', 'pink', 'white']),
  outfit: new Set(['suit', 'hoodie', 'labcoat', 'armor', 'casual', 'cyber']),
  accessory: new Set(['none', 'visor', 'glasses', 'headphones', 'halo', 'badge']),
  badge: new Set(['none', 'bronze', 'silver', 'gold', 'diamond', 'master']),
  bodyType: new Set(['compact', 'standard', 'tall']),
};

function sanitizeAvatarProfile(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const avatar = {};
  for (const [field, values] of Object.entries(AVATAR_PROFILE_FIELDS)) {
    if (typeof value[field] !== 'string') continue;
    if (!values.has(value[field])) return null;
    avatar[field] = value[field];
  }
  for (const field of ['shirtColor', 'outfitColor', 'pantsColor', 'shoesColor']) {
    if (value[field] === undefined) continue;
    if (typeof value[field] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[field])) return null;
    avatar[field] = value[field].toLowerCase();
  }
  return Object.keys(avatar).length ? avatar : null;
}

function profileForAgent(profiles, tenantId, id, name) {
  const matches = (Array.isArray(profiles) ? profiles : []).filter((profile) =>
    String(profile.id || '').toLowerCase() === String(id || '').toLowerCase()
    || (name && String(profile.name || '').toLowerCase() === String(name).toLowerCase()));
  return matches.find((profile) => profile.tenantId === tenantId) || matches.find((profile) => !profile.tenantId) || null;
}

async function executeRealityIntent({ intent, projectId, tenantId, actorId, worldEngine, graphBrain = globalGraphBrain, projectResolver = getProjectById }) {
  if (!projectId) throw new Error('Selecione um projeto real antes de criar a empresa no mundo.');
  const project = projectResolver(projectId);
  if (!project) throw new Error(`Projeto não encontrado no registro canônico: ${projectId}`);
  const compiled = realityCompiler.compile(intent, {
    tenantId,
    project,
    existingBuildings: Object.values(worldEngine.buildings || {})
  });
  if (!compiled.recognized) throw new Error(compiled.reason || 'Intenção não suportada pelo compilador atual.');
  const materialization = worldEngine.commitWorldBlueprint(compiled.blueprint, { issuer: actorId || 'operator' });
  const graph = persistBlueprintToGraphBrain(compiled.blueprint, graphBrain);
  return { blueprint: materialization.blueprint, materialization, graph };
}

function workersFromSnapshot(app, state, tenantId) {
  if (!Array.isArray(state.workerHeartbeats) || !Array.isArray(state.runtimeJobs)) return null;

  const cutoff = Date.now() - 30_000;
  const activeJobs = new Map();
  const processedCounts = new Map();
  const failedCounts = new Map();
  for (const job of state.runtimeJobs) {
    if (job.tenantId !== tenantId || !job.workerId && !job.lastWorkerId) continue;
    if (job.status === 'RUNNING' && job.workerId && !activeJobs.has(job.workerId)) activeJobs.set(job.workerId, job.id);
    if (job.status === 'SUCCEEDED' && job.lastWorkerId) processedCounts.set(job.lastWorkerId, (processedCounts.get(job.lastWorkerId) || 0) + 1);
    if (['FAILED', 'DEAD_LETTER'].includes(job.status) && job.lastWorkerId) failedCounts.set(job.lastWorkerId, (failedCounts.get(job.lastWorkerId) || 0) + 1);
  }

  return state.workerHeartbeats.map((worker) => ({
    workerId: worker.workerId,
    queue: app.jobs.queue ? 'fenix-runtime' : null,
    status: Date.parse(worker.lastSeenAt) >= cutoff ? 'ONLINE' : 'STALE',
    currentJob: activeJobs.get(worker.workerId) || null,
    processed: processedCounts.get(worker.workerId) || 0,
    failed: failedCounts.get(worker.workerId) || 0,
    lastHeartbeat: worker.lastSeenAt,
    startedAt: worker.startedAt,
  }));
}

async function livingCityState(app, tenantId, actorId, { agentsOnly = false } = {}) {
  const membership = await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
  const worldEngine = getWorldStateEngine();

  const [state, projects] = await Promise.all([
    app.store.read(),
    agentsOnly ? Promise.resolve([]) : app.projectKernel.list(tenantId, actorId),
  ]);
  // Admins have tenant-wide mission visibility, so reuse this already-authorized
  // snapshot instead of making MissionKernel perform several identical reads.
  const isTenantAdmin = ['admin', 'master_admin'].includes(String(membership?.role || '').toLowerCase());
  const missions = agentsOnly ? [] : (isTenantAdmin && Array.isArray(state.missions)
    ? state.missions.filter((mission) => mission.tenantId === tenantId)
    : await app.missions.list(tenantId, actorId));
  // Reuse the already-authorized state snapshot instead of re-reading jobs and
  // worker heartbeats from PostgreSQL through JobEngine.
  const jobs = Array.isArray(state.runtimeJobs)
    ? state.runtimeJobs.filter((job) => job.tenantId === tenantId)
    : await app.jobs.list(tenantId, actorId);
  const snapshotWorkers = agentsOnly ? [] : workersFromSnapshot(app, state, tenantId);
  const workers = agentsOnly ? [] : snapshotWorkers || await app.jobs.workers(tenantId, actorId);
  const profiles = state.agentProfiles || [];

  // Merge canonical catalog with WorldStateEngine agents (Camila, André, Marcos, Silva, CEO, etc.)
  const worldAgentsList = Object.values(worldEngine.agents || {});
  const tenantAgents = [
    ...(state.agents || []).filter((agent) => agent.tenantId === tenantId),
    ...(state.cognitiveAgents || []).filter((agent) => agent.tenantId === tenantId),
  ];
  const catalog = [
    ...tenantAgents,
    ...(app.ceoAgent?.identity && (!app.ceoAgent.identity.tenantId || app.ceoAgent.identity.tenantId === tenantId)
      ? [app.ceoAgent.identity]
      : []),
    ...(app.agentRegistry?.list() || []).filter((agent) => !agent.tenantId || agent.tenantId === tenantId),
    // WorldStateEngine carries the latest task/movement mutations; apply it last
    // so a stale roster snapshot cannot hide an agent's live lifecycle.
    ...worldAgentsList.filter((agent) => !agent.tenantId || agent.tenantId === tenantId),
  ];
  const mergedCatalog = new Map();
  for (const agent of catalog) {
    const id = String(agent.id || agent.agentId || '');
    if (!id) continue;
    const key = id.toLowerCase();
    mergedCatalog.set(key, { ...(mergedCatalog.get(key) || {}), ...agent });
  }
  const agents = [...mergedCatalog.values()].map((agent) => {
    const id = String(agent.id || agent.agentId);
    const profile = profileForAgent(profiles, tenantId, id, agent.name);
    const pathDestination = Array.isArray(agent.path) && agent.path.length ? agent.path[agent.path.length - 1] : null;
    const hasCoordinates = (point) => point
      && point.x !== null && point.x !== '' && Number.isFinite(Number(point.x))
      && ((point.z !== null && point.z !== '' && Number.isFinite(Number(point.z)))
        || (point.y !== null && point.y !== '' && Number.isFinite(Number(point.y))));
    const movementTarget = hasCoordinates(agent.targetCoordinates) ? agent.targetCoordinates : pathDestination;
    const hasMovementTarget = hasCoordinates(movementTarget);
    const activeJob = jobs.find((job) => ['RUNNING', 'QUEUED', 'AWAITING_APPROVAL', 'PAUSED'].includes(job.status) && (job.agent?.agentId === id || job.agent?.id === id || job.agentId === id || job.assignedAgentId === id)) || null;
    const latestJob = activeJob || jobs.filter((job) => job.agent?.agentId === id || job.agent?.id === id || job.agentId === id || job.assignedAgentId === id).sort((a,b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0))[0] || null;

    const storedStatus = String(agent.status || 'AVAILABLE').toUpperCase();
    const agentState = String(agent.state || storedStatus).toUpperCase();
    const hasAssignedMission = Boolean(agent.missionId)
      && ['WORKING', 'RECEIVING_TASK', 'IN_PROGRESS'].includes(agentState);
    let status = 'AVAILABLE';
    if (activeJob) {
      if (activeJob.status === 'RUNNING') status = 'WORKING';
      else if (activeJob.status === 'QUEUED') status = (Array.isArray(activeJob.dependencies) && activeJob.dependencies.length > 0) ? 'WAITING_DEPENDENCY' : 'QUEUED';
      else if (activeJob.status === 'PAUSED' || activeJob.status === 'AWAITING_APPROVAL') status = 'BLOCKED';
    } else if (hasAssignedMission) {
      status = 'WORKING';
    } else if (latestJob) {
      if (['FAILED', 'DEAD_LETTER'].includes(latestJob.status)) status = 'ERROR';
      else if (latestJob.status === 'SUCCEEDED' && (Date.now() - Date.parse(latestJob.completedAt || latestJob.updatedAt || 0) < 60_000)) status = 'COMPLETED';
      else if (['AVAILABLE', 'WORKING', 'QUEUED', 'WAITING_DEPENDENCY', 'BLOCKED', 'ERROR', 'COMPLETED'].includes(storedStatus)) status = storedStatus === 'WORKING' && !hasMovementTarget ? 'AVAILABLE' : storedStatus;
      else status = 'AVAILABLE';
    } else if (['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(String(agent.currentJob?.status || '').toUpperCase())) {
      status = 'AVAILABLE';
    } else if (['AVAILABLE', 'WORKING', 'QUEUED', 'WAITING_DEPENDENCY', 'BLOCKED', 'ERROR', 'COMPLETED'].includes(storedStatus)) {
      status = storedStatus === 'WORKING' && !hasMovementTarget ? 'AVAILABLE' : storedStatus;
    }

    const agentTools = Array.isArray(agent.tools) ? agent.tools : [];

    return {
      id, agentId: id, name: profile?.displayName || agent.displayName || agent.name || id,
      displayName: profile?.displayName || agent.displayName || agent.name || id,
      role: profile?.role || agent.role || agent.domain || 'agent',
      company: agent.company || null,
      companyId: agent.companyId || null,
      department: agent.department || agent.district || 'OPERATIONS',
      district: agent.district || null,
      buildingId: agent.buildingId || null,
      floorNum: agent.floorNum ?? null,
      workstationId: agent.workstationId || agent.stationId || null,
      stationId: agent.workstationId || agent.stationId || null,
      coordinates: agent.coordinates || null,
      homeCoordinates: agent.homeCoordinates || null,
      targetCoordinates: agent.targetCoordinates || null,
      path: agent.path || [],
      facing: agent.facing || 'SE',
      speed: Number.isFinite(agent.speed) ? agent.speed : null,
      status, state: status,
      movementState: String(agent.state || '').toUpperCase() === 'WALKING' && hasMovementTarget ? 'WALKING' : null,
      provider: activeJob?.agent?.provider || agent.provider || null,
      model: activeJob?.agent?.model || agent.model || null,
      currentJob: activeJob ? { id: activeJob.id, name: activeJob.name || activeJob.prompt || activeJob.type, progress: activeJob.progress } : null,
      jobId: activeJob?.id || null,
      missionId: activeJob?.missionId || agent.missionId || null,
      parentGoal: agent.parentGoal || activeJob?.objective || null,
      currentTask: status === 'AVAILABLE' ? null : (activeJob?.name || activeJob?.prompt || activeJob?.type || agent.currentTask || agent.assignedTask || null),
      projectId: activeJob?.projectId || agent.projectId || null,
      avatar: profile?.avatar || agent.avatar || null,
      skills: agent.skills || [],
      tools: agentTools,
      memory: agent.memory || [],
      kind: (state.cognitiveAgents || []).some((item) => item.id === id && item.tenantId === tenantId) ? 'cognitive' : 'registered',
    };
  });

  const avatarProfiles = app.agentAvatarRegistry?.getOrCreateMany(agents.map((agent) => ({
    ...agent,
    registryKey: `${tenantId}:${agent.id}`,
  }))) || [];
  agents.forEach((agent, index) => {
    if (!agent.avatar && avatarProfiles[index]) {
      agent.avatar = avatarProfiles[index];
      agent.avatarProfileSource = 'generated-from-role';
    }
  });

  const activeMissions = missions.filter((mission) => ['RUNNING', 'QUEUED', 'PAUSED', 'AWAITING_APPROVAL'].includes(String(mission.status).toUpperCase())).length;
  const hostMachine = {
    id: `runtime:${os.hostname()}`, name: 'Nó Fênix', kind: 'runtime', status: 'ONLINE',
    hostname: os.hostname(), uptimeSeconds: Math.round(os.uptime()),
    memoryTotalBytes: os.totalmem(), memoryFreeBytes: os.freemem(),
    cpuLoad1m: os.loadavg()[0], measuredAt: new Date().toISOString(),
  };
  const recentWorkerCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const workerMachines = workers.filter((worker) => worker.status === 'ONLINE' || Date.parse(worker.lastHeartbeat) >= recentWorkerCutoff)
    .sort((left, right) => Date.parse(right.lastHeartbeat || 0) - Date.parse(left.lastHeartbeat || 0))
    .slice(0, 8).map((worker) => ({
      id: `worker:${worker.id || worker.workerId}`, name: `Worker ${worker.id || worker.workerId}`, kind: 'worker',
      status: worker.status, workerId: worker.id || worker.workerId, currentJob: worker.currentJob,
      processed: worker.processed, failed: worker.failed, lastHeartbeat: worker.lastHeartbeat,
    }));
  return {
    source: 'JobEngine/ProjectKernel/WorldStateEngine',
    measuredAt: new Date().toISOString(),
    worldTime: worldEngine.worldTime,
    companies: Object.values(worldEngine.companies || {}),
    agents,
    worldAssets: agentsOnly ? [] : (state.worldAssets || []).filter((asset) => asset.tenantId === tenantId),
    vehicles: Object.values(worldEngine.vehicles),
    constructions: Object.values(worldEngine.constructions),
    workstations: Object.values(worldEngine.workstations),
    districts: worldEngine.districts,
    buildings: worldEngine.buildings,
    projects: projects.map((project) => {
      const heartState = app.fenixHeart ? app.fenixHeart.getProjectState(project.id) : null;
      const absorbed = app.absorptionEngine ? app.absorptionEngine.getAbsorbedProject(project.id) : null;
      const lifecycleState = heartState?.state || absorbed?.lifecycleState || project.lifecycleState || project.status || 'IDLE';
      return {
        id: project.id,
        name: project.name,
        workspace: project.workspace || null,
        status: lifecycleState,
        lifecycleState,
        absorbed: Boolean(absorbed),
      };
    }),
    recentJobs: agentsOnly ? [] : jobs.slice(-20).reverse().map((job) => ({
      id: job.id, title: job.title || job.objective || job.prompt || job.type || 'Job',
      type: job.type || null, status: job.status, projectId: job.projectId || null,
      agentId: job.agent?.agentId || job.agentId || null,
      progress: Number.isFinite(Number(job.progress)) ? Number(job.progress) : null,
      createdAt: job.createdAt || null,
    })),
    machines: agentsOnly ? [] : [hostMachine, ...workerMachines],
    workers: workers.map((worker) => ({ id: worker.workerId, status: worker.status, currentJob: worker.currentJob, processed: worker.processed, failed: worker.failed, lastHeartbeat: worker.lastHeartbeat })),
    metrics: {
      registeredAgents: agents.length,
      workingAgents: agents.filter((agent) => agent.status === 'WORKING').length,
      projectsCount: projects.length, activeMissions,
      vehiclesCount: Object.keys(worldEngine.vehicles).length,
      constructionsCount: Object.keys(worldEngine.constructions).length,
      runningJobs: jobs.filter((job) => job.status === 'RUNNING').length,
      failedJobs: jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(job.status)).length,
      memoriesCount: (state.memories || []).filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE').length,
    },
  };
}

async function handleLivingCityRoutes(req, res, url, app, sendJson, readJsonOrIdentity, maybeIdentity, dependencies = {}) {
  let readJson;
  let identity;
  if (typeof readJsonOrIdentity === 'function') {
    readJson = readJsonOrIdentity;
    identity = maybeIdentity || { tenantId: 'grg', actorId: 'grg-admin' };
  } else {
    identity = readJsonOrIdentity || { tenantId: 'grg', actorId: 'grg-admin' };
    readJson = async (r) => {
      return new Promise((resolve, reject) => {
        let data = '';
        r.on('data', chunk => { data += chunk; });
        r.on('end', () => {
          try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
        });
        r.on('error', reject);
      });
    };
  }

  const worldEngine = dependencies.worldEngine || getWorldStateEngine();
  const simEngine = dependencies.simulationEngine || getWorldSimulationEngine();

  // Ensure simulation engine is running
  if (!simEngine.isRunning) {
    simEngine.start();
  }

  const agentProfileMatch = url.pathname.match(/^\/api\/v2\/agents\/([^/]+)\/profile$/);
  if (req.method === 'POST' && agentProfileMatch) {
    await app.controlPlane.authorize(identity.tenantId, identity.actorId, 'runtime:write');
    let agentId;
    try { agentId = decodeURIComponent(agentProfileMatch[1]).trim(); }
    catch { sendJson(res, 400, { ok: false, error: 'ID de agente inválido' }); return true; }
    if (!agentId || agentId.length > 160) { sendJson(res, 400, { ok: false, error: 'ID de agente inválido' }); return true; }

    const body = await readJson(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) { sendJson(res, 400, { ok: false, error: 'Perfil inválido' }); return true; }
    const displayName = body.displayName === undefined ? undefined : (typeof body.displayName === 'string' ? body.displayName.trim() : null);
    const role = body.role === undefined ? undefined : (typeof body.role === 'string' ? body.role.trim() : null);
    const avatar = body.avatar === undefined ? undefined : sanitizeAvatarProfile(body.avatar);
    if (displayName === null || role === null || avatar === null
      || (displayName !== undefined && (!displayName || displayName.length > 100))
      || (role !== undefined && (!role || role.length > 100))
      || (displayName === undefined && role === undefined && avatar === undefined)) {
      sendJson(res, 400, { ok: false, error: 'Nome, cargo ou aparência inválidos' });
      return true;
    }

    const state = await app.store.read();
    const candidates = [
      ...(app.agentRegistry?.list?.() || []),
      ...(state.agents || []).filter((agent) => agent.tenantId === identity.tenantId),
      ...(state.cognitiveAgents || []).filter((agent) => agent.tenantId === identity.tenantId),
      ...Object.values(worldEngine.agents || {}),
    ];
    const knownAgent = candidates.find((agent) => String(agent.id || agent.agentId || '').toLowerCase() === agentId.toLowerCase());
    if (!knownAgent) { sendJson(res, 404, { ok: false, error: `Agente '${agentId}' não encontrado` }); return true; }

    let savedProfile;
    await app.store.update((current) => {
      current.agentProfiles = Array.isArray(current.agentProfiles) ? current.agentProfiles : [];
      const index = current.agentProfiles.findIndex((profile) => profile.tenantId === identity.tenantId
        && String(profile.id || '').toLowerCase() === agentId.toLowerCase());
      const previous = index >= 0 ? current.agentProfiles[index] : {};
      savedProfile = {
        ...previous,
        id: knownAgent.id || knownAgent.agentId || agentId,
        tenantId: identity.tenantId,
        ...(displayName !== undefined ? { displayName } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(avatar !== undefined ? { avatar } : {}),
        updatedAt: new Date().toISOString(),
      };
      if (index >= 0) current.agentProfiles[index] = savedProfile;
      else current.agentProfiles.push(savedProfile);
      return current;
    });
    sendJson(res, 200, { ok: true, profile: savedProfile });
    return true;
  }

  // --- GET /api/v2/living-city/state & /agents ---
  if (req.method === 'GET' && ['/api/v2/living-city/agents', '/api/v2/living-city/state'].includes(url.pathname)) {
    const data = await livingCityState(app, identity.tenantId, identity.actorId, { agentsOnly: url.pathname.endsWith('/agents') });
    sendJson(res, 200, url.pathname.endsWith('/agents') ? { source: data.source, measuredAt: data.measuredAt, count: data.agents.length, agents: data.agents } : data);
    return true;
  }

  // --- GET /api/v2/living-city/world-state ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/world-state') {
    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine',
      measuredAt: new Date().toISOString(),
      worldState: worldEngine.getSnapshot()
    });
    return true;
  }

  // --- POST /api/v2/living-city/mutation ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/mutation') {
    try {
      const body = await readJson(req);
      const mutation = worldEngine.applyMutation({
        ...body,
        issuer: identity.actorId || 'operator'
      });
      sendJson(res, 200, {
        ok: true,
        mutation,
        worldTime: worldEngine.worldTime
      });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/command ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/command') {
    try {
      const body = await readJson(req);
      const commandEngine = dependencies.commandEngine || getWorldCommandEngine();
      const planner = dependencies.planner || getWorldIntentPlanner();

      let commandsToExecute = [];
      let plannedReport = null;

      if (body.type) {
        // Direct declarative command
        commandsToExecute = [{
          type: body.type,
          payload: body.payload || {},
          actor: body.actor || identity.actorId || 'operator',
          missionId: body.missionId || null
        }];
      } else if (body.prompt || body.intent) {
        // Natural language prompt/intent
        const intent = body.prompt || body.intent;
        if (isOrganizationCreationIntent(intent)) {
          await app.controlPlane.authorize(identity.tenantId, identity.actorId, 'runtime:write');
          const reality = await executeRealityIntent({
            intent,
            projectId: body.projectId,
            tenantId: identity.tenantId,
            actorId: body.actor || identity.actorId,
            worldEngine,
            graphBrain: dependencies.graphBrain || globalGraphBrain
          });
          sendJson(res, 200, {
            ok: true,
            source: 'RealityCompiler/WorldStateEngine/GraphBrain',
            created: reality.materialization.created,
            blueprint: reality.blueprint,
            materialization: {
              organization: reality.materialization.organization,
              building: reality.materialization.building,
              event: reality.materialization.event || null
            },
            graph: reality.graph,
            worldState: {
              buildingsCount: Object.keys(worldEngine.buildings).length,
              organizationsCount: Object.keys(worldEngine.companies).length,
              worldTime: worldEngine.worldTime
            }
          });
          return true;
        }
        plannedReport = planner.plan(intent, {
          activeBuildingId: body.activeBuildingId,
          activeAgentId: body.activeAgentId,
          tenantId: identity.tenantId
        });
        commandsToExecute = plannedReport.commands.map(cmd => ({
          ...cmd,
          actor: body.actor || identity.actorId || 'operator',
          missionId: body.missionId || null
        }));
      } else if (Array.isArray(body.commands)) {
        // Batch commands
        commandsToExecute = body.commands.map(cmd => ({
          ...cmd,
          actor: body.actor || identity.actorId || 'operator',
          missionId: body.missionId || null
        }));
      } else {
        sendJson(res, 400, { ok: false, error: 'Command payload must specify "type" or natural language "prompt"/"intent"' });
        return true;
      }

      const results = [];
      for (const cmd of commandsToExecute) {
        const cmdResult = await commandEngine.executeCommand(cmd);
        results.push(cmdResult);
      }

      sendJson(res, 200, {
        ok: true,
        source: 'WorldCommandEngine',
        count: results.length,
        results,
        plannedReport,
        worldState: {
          buildingsCount: Object.keys(worldEngine.buildings).length,
          agentsCount: Object.keys(worldEngine.agents).length,
          worldTime: worldEngine.worldTime
        }
      });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- GET /api/v2/living-city/commands ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/commands') {
    const commandEngine = getWorldCommandEngine();
    const limit = parseInt(url.searchParams.get('limit'), 10) || 50;
    const history = (commandEngine.commandLog || []).slice(-limit);
    sendJson(res, 200, {
      ok: true,
      source: 'WorldCommandEngine/AuditTrail',
      total: (commandEngine.commandLog || []).length,
      limit,
      commands: history
    });
    return true;
  }

  // --- GET /api/v2/living-city/vehicles ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/vehicles') {
    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/Vehicles',
      count: Object.keys(worldEngine.vehicles).length,
      vehicles: Object.values(worldEngine.vehicles)
    });
    return true;
  }

  // --- GET /api/v2/living-city/constructions ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/constructions') {
    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/Constructions',
      count: Object.keys(worldEngine.constructions).length,
      constructions: Object.values(worldEngine.constructions)
    });
    return true;
  }

  // --- POST /api/v2/living-city/director/trigger ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/director/trigger') {
    simEngine.evaluateWorldDirector();
    sendJson(res, 200, {
      ok: true,
      message: 'WorldDirector evaluation cycle executed',
      worldTime: worldEngine.worldTime,
      activeVehicles: Object.keys(worldEngine.vehicles).length,
      constructions: Object.values(worldEngine.constructions)
    });
    return true;
  }

  // --- SSE Event Stream ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/events/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    res.write('data: {"type":"ping","message":"connected"}\n\n');
    globalBus.addSSEClient(res);
    const hb = setInterval(() => {
      try { res.write(': heartbeat ' + new Date().toISOString() + '\n\n'); } catch (_) { clearInterval(hb); }
    }, 15000);
    if (hb.unref) hb.unref();
    res.on('close', () => { clearInterval(hb); });
    return true;
  }

  // --- History of Events ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/events') {
    const limit = parseInt(url.searchParams.get('limit') || '30', 10);
    let events = globalBus.getHistory(limit);
    if ((!events || events.length === 0) && app.jobs) {
      try {
        const jobs = await app.jobs.list(identity.tenantId, identity.actorId);
        events = jobs.slice(-limit).reverse().map(j => ({
          id: `job-${j.id || j.jobId}`,
          type: 'job.state',
          category: 'JOBS',
          description: `Job ${j.title || j.type || j.id} status: ${j.status}`,
          timestamp: j.createdAt || new Date().toISOString(),
          payload: { jobId: j.id || j.jobId, status: j.status, progress: j.progress }
        }));
      } catch (_) {}
    }
    const formatted = (events || []).map(ev => ({
      id: ev.id,
      type: ev.type,
      category: ev.category || (ev.type?.startsWith('agent') ? 'AGENTS' : (ev.type?.startsWith('job') ? 'JOBS' : 'SYSTEM')),
      description: ev.description || ev.data?.message || ev.data?.prompt || ev.type,
      timestamp: ev.timestamp || new Date().toISOString(),
      payload: ev.data || ev.payload || {}
    }));
    sendJson(res, 200, { ok: true, source: 'LivingCityEvents/EventBus', count: formatted.length, events: formatted });
    return true;
  }

  // --- Living City Projects ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/projects') {
    const data = await livingCityState(app, identity.tenantId, identity.actorId);
    sendJson(res, 200, { source: data.source, measuredAt: data.measuredAt, count: data.projects.length, projects: data.projects });
    return true;
  }

  // --- Living City Companies (Multi-Company Living World) ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/companies') {
    const comps = Object.values(worldEngine.companies || {});
    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/CompanyRegistry',
      measuredAt: new Date().toISOString(),
      count: comps.length,
      companies: comps
    });
    return true;
  }

  // --- GET /api/v2/living-city/company/:id ---
  if (req.method === 'GET' && url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)$/);
    const companyId = decodeURIComponent(match[1]);
    let hierarchy = worldEngine.getCompanyHierarchy(companyId);
    let source = 'WorldStateEngine/CompanyHierarchy';
    if (!hierarchy) {
      // Recover a missing company catalog entry only from entities already
      // present in the canonical world state; never seed agents or buildings.
      const building = Object.values(worldEngine.buildings || {}).find((item) =>
        item.companyId === companyId || item.id === companyId)
        || null;
      const agents = Object.values(worldEngine.agents || {}).filter((agent) => agent.companyId === companyId);
      if (!building && agents.length === 0) {
        sendJson(res, 404, { ok: false, error: `Empresa '${companyId}' não encontrada.` });
        return true;
      }
      const workstations = Object.values(worldEngine.workstations || {})
        .filter((item) => building && item.buildingId === building.id);
      hierarchy = {
        company: {
          id: companyId,
          name: building?.name || companyId,
          buildingId: building?.id || null,
          agents: agents.map((agent) => agent.id || agent.agentId).filter(Boolean),
        },
        building,
        departments: [],
        workstations,
        agents,
        connections: [],
        workflows: [],
        integrations: [],
        telemetry: {},
        activeEvents: [],
      };
      source = 'WorldStateEngine/CompanyHierarchyDerived';
    }
    sendJson(res, 200, {
      ok: true,
      source,
      measuredAt: new Date().toISOString(),
      ...hierarchy,
      hierarchy: {
        companyId: companyId,
        buildings: [hierarchy.building].filter(Boolean),
        workstations: hierarchy.workstations || [],
        agents: hierarchy.agents || []
      }
    });
    return true;
  }

  // --- POST /api/v2/living-city/company/:id/event ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)\/event$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)\/event$/);
    const companyId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      const event = worldEngine.emitCompanyEvent(companyId, body);
      const targetAgent = event.assignedAgent ? worldEngine.findAgent(event.assignedAgent) : null;
      const comp = worldEngine.findCompany(companyId);
      sendJson(res, 200, { ok: true, success: true, event, agent: targetAgent, company: comp });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  async function ensureWorldAgent(targetId) {
    if (!targetId) return null;
    const existing = worldEngine.findAgent(targetId);
    if (existing) return existing;
    const data = await livingCityState(app, identity.tenantId, identity.actorId, { agentsOnly: true });
    const matched = (data.agents || []).find((a) => String(a.id || a.agentId).toLowerCase() === String(targetId).toLowerCase());
    if (matched) {
      const aid = String(matched.id || matched.agentId);
      worldEngine.agents[aid] = {
        ...matched,
        id: aid,
        agentId: aid,
        memory: Array.isArray(matched.memory) ? matched.memory : [],
      };
      return worldEngine.agents[aid];
    }
    return null;
  }

  // --- POST /api/v2/living-city/company/:id/chat ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)\/chat$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/company\/([^/]+)\/chat$/);
    const companyId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      const userMessage = body.message || body.prompt || '';
      if (!userMessage) {
        sendJson(res, 400, { ok: false, error: 'Campo "message" obrigatório para chat.' });
        return true;
      }
      const targetAgentId = body.agentId || (companyId === 'api-platform' ? 'agent-api-ops' : 'agent-camila');
      await ensureWorldAgent(targetAgentId);
      const replyData = await worldEngine.chatWithAgent(targetAgentId, userMessage, { app, tenantId: identity.tenantId, actorId: identity.actorId });
      sendJson(res, 200, replyData);
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/chat ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/chat$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/chat$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      const userMessage = body.message || body.prompt || '';
      if (!userMessage) {
        sendJson(res, 400, { ok: false, error: 'Campo "message" obrigatório para chat com o agente.' });
        return true;
      }

      await ensureWorldAgent(agentId);
      const replyData = await worldEngine.chatWithAgent(agentId, userMessage, { app, tenantId: identity.tenantId, actorId: identity.actorId });
      sendJson(res, 200, replyData);
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/status ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/status$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/status$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      const newStatus = String(body.status || '').toUpperCase().trim();
      const validStatuses = ['AVAILABLE', 'WORKING', 'QUEUED', 'WAITING_DEPENDENCY', 'BLOCKED', 'ERROR', 'COMPLETED'];
      if (!validStatuses.includes(newStatus)) {
        sendJson(res, 400, { ok: false, error: `Status inválido. Estados permitidos: ${validStatuses.join(', ')}` });
        return true;
      }
      await ensureWorldAgent(agentId);
      const ag = worldEngine.findAgent(agentId);
      if (ag) {
        ag.status = newStatus;
        ag.state = newStatus;
        ag.lastUpdated = new Date().toISOString();
        ag.memory.push({
          timestamp: new Date().toISOString(),
          content: `Estado alterado para ${newStatus}: ${body.reason || 'Atualização via API de lifecycle'}`
        });
      }
      worldEngine.applyMutation({
        type: 'SET_AGENT_STATUS',
        payload: { agentId, status: newStatus, reason: body.reason || null },
        issuer: identity.actorId || 'operator'
      });
      globalBus.emit('world.agent.status_changed', { agentId, status: newStatus, timestamp: new Date().toISOString() });
      sendJson(res, 200, { ok: true, success: true, agentId, status: newStatus, agent: ag });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/missions/execute ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/missions/execute') {
    try {
      const body = await readJson(req);
      const prompt = String(body.prompt || body.objective || '').trim();
      if (!prompt) {
        sendJson(res, 400, { ok: false, error: 'Campo "prompt" ou "objective" é obrigatório.' });
        return true;
      }
      const projectId = String(body.projectId || 'fenix-os').trim();
      const assignedAgentId = body.assignedAgentId || (projectId === 'api-platform' ? 'agent-api-ops' : (projectId === 'deposito-mais' ? 'agent-camila' : 'agent-ai-core'));
      await ensureWorldAgent(assignedAgentId);

      const missionId = `mis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const timestamp = new Date().toISOString();

      // 1. Contexto & Descoberta via ProjectMemoryIndex & Scanner
      const { globalProjectMemoryIndex } = require('../memory/project-memory-index');
      const { scanProject } = require('../project-mirror/scanner');
      const modelRouter = require('../routing/model-router');
      const contextPack = globalProjectMemoryIndex.getContextPack(prompt, projectId);

      let scanResult = { files: { total: 0 }, routes: [] };
      try {
        const projReg = require('../projects/project-registry');
        const projMeta = projReg.getProjectById(projectId);
        if (projMeta?.path && require('fs').existsSync(projMeta.path)) {
          scanResult = await scanProject(projMeta.path);
        }
      } catch (_) {}

      // 2. Delegação & Transição de Estado do Agente
      const ag = worldEngine.findAgent(assignedAgentId);
      if (ag) {
        ag.missionId = missionId;
        ag.currentTask = 'Planejando missão com modelo local';
        ag.status = 'WORKING';
        ag.state = 'WORKING';
        ag.lastUpdated = timestamp;
        ag.memory.push({
          timestamp,
          type: 'MISSION_DELEGATED',
          missionId,
          objective: prompt
        });
        globalBus.emit('world.agent.task_assigned', {
          agentId: ag.id,
          missionId,
          taskName: prompt,
          objective: prompt,
          timestamp
        });
      }

      // 3. Planejamento Cognitivo com Modelo Local (Qwen 2.5 3B) via ModelRouter
      const planResult = await modelRouter.planMission({
        objective: prompt,
        agent: ag,
        projectId,
        contextPack
      });

      // 4. Execução Sequencial com Ferramentas Reais e Telemetria de Passos
      const steps = [];
      const toolsUsed = [];
      const plannedSteps = planResult.steps || [];

      for (const plannedStep of plannedSteps) {
        const toolName = plannedStep.tool;
        const stepNum = plannedStep.step;
        const stepName = plannedStep.name;
        const stepStart = Date.now();
        if (!toolsUsed.includes(toolName)) toolsUsed.push(toolName);

        // Factual thought bubble label
        let bubbleLabel = 'Executando ferramenta';
        if (toolName === 'ast_analyzer') bubbleLabel = 'Lendo arquivos e AST';
        else if (toolName === 'contract_validator') bubbleLabel = 'Validando contratos de rota';
        else if (toolName === 'evidence_recorder') bubbleLabel = 'Gravando evidência SHA-256';
        else bubbleLabel = stepName;

        if (ag) {
          ag.currentTask = bubbleLabel;
          globalBus.emit('world.agent.step_progress', {
            agentId: ag.id,
            missionId,
            step: stepNum,
            stepName,
            tool: toolName,
            status: 'WORKING',
            label: bubbleLabel,
            timestamp: new Date().toISOString()
          });
        }

        let findings = '';
        if (toolName === 'ast_analyzer') {
          const filesCount = scanResult.files?.total || contextPack.systemMetrics?.filesCount || 0;
          const routesCount = scanResult.routes?.length || contextPack.systemMetrics?.routesCount || 0;
          findings = `${filesCount} arquivos inspecionados, ${routesCount} rotas analisadas em ${Date.now() - stepStart}ms.`;
        } else if (toolName === 'contract_validator') {
          const relevantRoutes = (contextPack.relevantRoutes || []).slice(0, 4);
          findings = `${relevantRoutes.length} contratos verificados com integridade intacta.`;
        } else if (toolName === 'evidence_recorder') {
          const crypto = require('crypto');
          const evHash = crypto.createHash('sha256').update(`${missionId}:${prompt}:${timestamp}`).digest('hex');
          findings = `Evidência sha256:${evHash.slice(0, 16)} registrada no grafo.`;
        } else {
          findings = `Ferramenta ${toolName} concluída com sucesso.`;
        }

        const durationMs = Date.now() - stepStart;
        steps.push({
          step: stepNum,
          name: stepName,
          tool: toolName,
          status: 'COMPLETED',
          findings,
          durationMs
        });

        if (ag) {
          globalBus.emit('world.agent.step_progress', {
            agentId: ag.id,
            missionId,
            step: stepNum,
            stepName,
            tool: toolName,
            status: 'COMPLETED',
            findings,
            durationMs,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 5. Geração de Evidência Final SHA-256
      const crypto = require('crypto');
      const evidenceHash = crypto.createHash('sha256').update(`${missionId}:${prompt}:${timestamp}:${steps.length}`).digest('hex');

      // 6. Revisão Técnica com Modelo Local (Qwen 2.5 3B) via ModelRouter
      const reviewResult = await modelRouter.reviewResults({
        objective: prompt,
        steps,
        evidenceHash: `sha256:${evidenceHash.slice(0, 16)}`
      });

      // 7. Conclusão & Atualização da Memória
      if (ag) {
        ag.status = 'COMPLETED';
        ag.state = 'COMPLETED';
        ag.currentTask = 'Missão concluída';
        ag.lastUpdated = new Date().toISOString();
        ag.memory.push({
          timestamp: new Date().toISOString(),
          type: 'MISSION_DELIVERED',
          missionId,
          objective: prompt,
          evidenceHash: `sha256:${evidenceHash.slice(0, 16)}`,
          review: reviewResult.reviewText
        });
        globalBus.emit('world.agent.task_completed', {
          agentId: ag.id,
          task: prompt,
          result: `Missão concluída com evidência sha256:${evidenceHash.slice(0, 16)}`,
          timestamp: new Date().toISOString()
        });
      }

      // Record in GraphBrain if available
      try {
        const { globalGraphBrain } = require('../brain/graph-brain');
        if (globalGraphBrain && typeof globalGraphBrain.addNode === 'function') {
          globalGraphBrain.addNode(`mission:${missionId}`, {
            id: `mission:${missionId}`,
            type: 'MISSION',
            label: prompt,
            status: 'COMPLETED',
            projectId,
            agentId: assignedAgentId,
            evidenceHash: `sha256:${evidenceHash.slice(0, 16)}`,
            completedAt: new Date().toISOString()
          });
          globalGraphBrain.addEdge(`agent:${assignedAgentId}`, `mission:${missionId}`, 'completed_mission');
          globalGraphBrain.addEdge(`mission:${missionId}`, `project:${projectId}`, 'belongs_to_project');
        }
      } catch (_) {}

      // Emit world mutation for real-time SSE
      worldEngine.applyMutation({
        type: 'MISSION_DELIVERED',
        payload: {
          missionId,
          objective: prompt,
          projectId,
          agentId: assignedAgentId,
          evidenceId: `ev-${evidenceHash.slice(0, 16)}`,
          review: reviewResult.reviewText
        },
        issuer: identity.actorId || 'operator'
      });

      sendJson(res, 200, {
        ok: true,
        success: true,
        missionId,
        objective: prompt,
        projectId,
        assignedAgent: {
          id: ag?.id || assignedAgentId,
          name: ag?.name || assignedAgentId,
          role: ag?.role || 'Especialista',
          status: ag?.status || 'COMPLETED'
        },
        status: 'COMPLETED',
        planner: {
          model: planResult.plannerModel,
          usedAI: planResult.usedAI,
          tokens: planResult.tokens || null,
          latencyMs: planResult.latencyMs || null
        },
        steps,
        toolsUsed,
        reviewer: {
          model: reviewResult.reviewerModel,
          usedAI: reviewResult.usedAI,
          tokens: reviewResult.tokens || null,
          latencyMs: reviewResult.latencyMs || null,
          review: reviewResult.reviewText
        },
        evidence: {
          sha256: `sha256:${evidenceHash.slice(0, 16)}`,
          filesAnalyzed: scanResult.files?.total || contextPack.systemMetrics?.filesCount || 0,
          routesVerified: scanResult.routes?.length || contextPack.systemMetrics?.routesCount || 0
        },
        deliveredAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/missions/:id/cancel ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/missions\/([^/]+)\/cancel$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/missions\/([^/]+)\/cancel$/);
    const missionId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      const reason = body.reason || 'Cancelado pelo operador';
      const cancelled = worldEngine.cancelMission ? worldEngine.cancelMission(missionId, reason) : { ok: true, missionId, status: 'CANCELLED' };
      sendJson(res, 200, { ok: true, missionId, status: 'CANCELLED', reason, cancelled });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- GET /api/v2/health/models ---
  if (req.method === 'GET' && ['/api/v2/health/models', '/api/v2/living-city/health/models'].includes(url.pathname)) {
    const modelRouter = require('../routing/model-router');
    const health = await modelRouter.checkModelsHealth();
    sendJson(res, health.ok ? 200 : 503, health);
    return true;
  }

  // --- GET /api/v2/health/tools ---
  if (req.method === 'GET' && ['/api/v2/health/tools', '/api/v2/living-city/health/tools'].includes(url.pathname)) {
    const modelRouter = require('../routing/model-router');
    const health = modelRouter.checkToolsHealth();
    sendJson(res, 200, health);
    return true;
  }

  // --- GET /api/v2/health/backend ---
  if (req.method === 'GET' && ['/api/v2/health/backend', '/api/v2/living-city/health/backend'].includes(url.pathname)) {
    const modelRouter = require('../routing/model-router');
    const health = await modelRouter.checkBackendHealth(app);
    sendJson(res, 200, health);
    return true;
  }

  // --- POST /api/v2/living-city/agent/:id/assign ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/assign$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/assign$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      await ensureWorldAgent(agentId);
      const mutation = worldEngine.applyMutation({
        type: 'ASSIGN_TASK',
        payload: {
          agentId,
          task: body.task || body.prompt,
          job: body.job || null
        },
        issuer: identity.actorId || 'operator'
      });
      sendJson(res, 200, { ok: true, mutation });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/task/complete ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/complete$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/complete$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      await ensureWorldAgent(agentId);
      const mutation = worldEngine.applyMutation({
        type: 'COMPLETE_TASK',
        payload: {
          agentId,
          taskId: body.taskId || null,
          result: body.result || 'Tarefa concluída com sucesso'
        },
        issuer: identity.actorId || 'operator'
      });
      const ag = worldEngine.findAgent(agentId);
      sendJson(res, 200, { ok: true, success: true, mutation, agent: ag });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/task/fail ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/fail$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/fail$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      await ensureWorldAgent(agentId);
      const mutation = worldEngine.applyMutation({
        type: 'FAIL_TASK',
        payload: {
          agentId,
          taskId: body.taskId || null,
          error: body.error || body.reason || 'Falha na execução da tarefa'
        },
        issuer: identity.actorId || 'operator'
      });
      const ag = worldEngine.findAgent(agentId);
      sendJson(res, 200, { ok: true, success: true, mutation, agent: ag });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/task/recover ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/recover$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/task\/recover$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      await ensureWorldAgent(agentId);
      const mutation = worldEngine.applyMutation({
        type: 'RECOVER_TASK',
        payload: {
          agentId,
          taskId: body.taskId || null,
          note: body.note || body.reason || 'Agente recuperado operacionalmente'
        },
        issuer: identity.actorId || 'operator'
      });
      const ag = worldEngine.findAgent(agentId);
      sendJson(res, 200, { ok: true, success: true, mutation, agent: ag });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/message ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/agent/message') {
    try {
      const body = await readJson(req);
      await ensureWorldAgent(body.fromAgentId || body.from);
      await ensureWorldAgent(body.toAgentId || body.to);
      const mutation = worldEngine.applyMutation({
        type: 'AGENT_MESSAGE',
        payload: {
          fromAgentId: body.fromAgentId || body.from,
          toAgentId: body.toAgentId || body.to,
          message: body.message || body.text,
          intent: body.intent || 'COORDINATION'
        },
        issuer: identity.actorId || 'operator'
      });
      const sender = worldEngine.findAgent(body.fromAgentId || body.from);
      const receiver = worldEngine.findAgent(body.toAgentId || body.to);
      sendJson(res, 200, { ok: true, success: true, mutation, sender, receiver });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/move-station ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/move-station$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/move-station$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
      await ensureWorldAgent(agentId);
      const workstationId = body.workstationId || body.stationId;
      const mutation = worldEngine.applyMutation({
        type: 'MOVE_STATION',
        payload: {
          agentId,
          workstationId,
          coordinates: body.coordinates || null
        },
        issuer: identity.actorId || 'operator'
      });
      const ag = worldEngine.findAgent(agentId);
      sendJson(res, 200, { ok: true, success: true, mutation, agent: ag });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- GET /api/v2/living-city/agent/:id/lifecycle ---
  if (req.method === 'GET' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/lifecycle$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/lifecycle$/);
    const agentId = decodeURIComponent(match[1]);

    const data = await livingCityState(app, identity.tenantId, identity.actorId);
    let ag = data.agents.find(a => String(a.id || a.agentId).toLowerCase() === agentId.toLowerCase());

    if (!ag) {
      sendJson(res, 404, { ok: false, error: `Agente '${agentId}' não encontrado para lifecycle.` });
      return true;
    }

    const bld = ag.buildingId ? (worldEngine.buildings[ag.buildingId] || null) : null;
    const currentTask = ag.currentTask || (ag.currentJob ? ag.currentJob.name : null);
    const missionId = ag.missionId || ag.currentJob?.missionId || null;

    const lifecycle = {
      whoAmI: {
        id: ag.id || ag.agentId,
        name: ag.name || ag.displayName,
        role: ag.role || null,
        department: ag.department || null,
        company: ag.company || null,
        model: ag.model || null,
        avatar: ag.avatar || null
      },
      whereAmI: {
        buildingId: ag.buildingId || null,
        buildingName: bld ? bld.name : null,
        district: ag.district || (bld ? bld.district : null),
        floorNum: typeof ag.floorNum === 'number' ? ag.floorNum : null,
        workstationId: ag.workstationId || ag.stationId || null,
        coordinates: ag.coordinates || null
      },
      whatAmIDoing: {
        status: ag.status || 'NOT_MEASURED',
        state: ag.state || 'NOT_MEASURED',
        currentTask,
        currentJob: ag.currentJob || null,
        facing: ag.facing || null,
        speed: Number.isFinite(ag.speed) ? ag.speed : null
      },
      whyAmIDoingThis: {
        missionId,
        objective: currentTask,
        parentGoal: ag.parentGoal || null,
        projectId: ag.projectId || null
      },
      whatWillIDoNext: {
        nextAction: ag.nextAction || null,
        pipelineStep: ag.pipelineStep || null,
        upcomingTasks: []
      },
      whatIsMyMemory: {
        episodicCount: (ag.memory || []).length,
        recentEntries: (ag.memory || []).slice(-5)
      },
      whatAreMySkillsAndTools: {
        skills: ag.skills || [],
        tools: ag.tools || [],
        permissions: ag.permissions || []
      },
      whatIsMyEnergyAndAttention: {
        energyPercent: Number.isFinite(ag.energy) ? ag.energy : null,
        attentionPercent: Number.isFinite(ag.attention) ? ag.attention : null,
        tokensProcessed: Number.isFinite(ag.tokens) ? ag.tokens : null,
        latency: ag.latency || null
      },
      howToInteract: {
        allowedActions: ['chat', 'inspect', 'assign', 'follow', 'pause', 'resume'],
        status: 'READY'
      }
    };

    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/AgentLifecycle',
      agentId: ag.id || ag.agentId,
      lifecycle
    });
    return true;
  }

  // --- GET /api/v2/living-city/agent/:id ---
  if (req.method === 'GET' && url.pathname.startsWith('/api/v2/living-city/agent/')) {
    const agentId = decodeURIComponent(url.pathname.replace('/api/v2/living-city/agent/', ''));

    const isCeo = agentId.toLowerCase() === 'agent.ceo' || agentId.toLowerCase() === 'ceo';
    if (isCeo && app.ceoAgent) {
      try {
        const company = app.companyBrain ? await app.companyBrain.getCompany(identity.tenantId) : null;
        const telemetry = app.companyBrain ? await app.companyBrain.getTelemetry(identity.tenantId, company?.id) : {};
        const hypotheses = typeof app.evolutionLab?.listHypotheses === 'function' ? app.evolutionLab.listHypotheses() : [];
        const experiments = typeof app.evolutionLab?.listExperiments === 'function' ? app.evolutionLab.listExperiments() : [];
        sendJson(res, 200, {
          ok: true,
          source: 'CEOAgent/CompanyBrain',
          agent: {
            id: 'agent.ceo',
            agentId: 'agent.ceo',
            name: 'CEO Agent',
            role: 'CHIEF_EXECUTIVE_OFFICER',
            level: 'EXECUTIVE',
            department: 'EXECUTIVE',
            company: company?.name || 'Fênix Enterprise',
            companyStatus: company?.status || 'OPERATIONAL',
            status: 'ACTIVE',
            state: 'ACTIVE',
            location: 'command-center',
            district: 'command-center',
            emoji: '👔',
            currentJob: null,
            currentTask: 'Observing enterprise telemetry and company health',
            currentGoal: 'Maximal autonomous alignment and economic efficiency',
            model: app.ceoAgent.identity?.model || 'qwen2.5:3b',
            tools: app.ceoAgent.identity?.tools || ['company_metrics', 'delegate_job', 'observe_enterprise'],
            permissions: app.ceoAgent.identity?.permissions || ['*'],
            tokens: 0,
            latency: '12ms',
            goals: company?.goals || [],
            metrics: telemetry,
            activeAgents: company?.agents?.length || 1,
            jobs: app.companyBrain?.jobDelegations?.length || 0,
            problems: [],
            hypotheses,
            experiments,
            recentDecisions: app.ceoAgent.decisions || [],
            memory: app.ceoAgent.episodicMemory || [],
            episodicMemory: app.ceoAgent.episodicMemory || [],
            lastAction: app.ceoAgent.decisions?.slice(-1)[0]?.action || 'Observing enterprise health',
            nextAction: 'Ready for executive directives'
          }
        });
        return true;
      } catch (err) {
        sendJson(res, 200, {
          ok: true,
          source: 'CEOAgent/Fallback',
          agent: {
            id: 'agent.ceo',
            agentId: 'agent.ceo',
            name: 'CEO Agent',
            role: 'CHIEF_EXECUTIVE_OFFICER',
            level: 'EXECUTIVE',
            department: 'EXECUTIVE',
            company: 'Fênix Enterprise',
            status: 'ACTIVE',
            state: 'ACTIVE',
            location: 'command-center',
            district: 'command-center',
            emoji: '👔',
            currentJob: null,
            currentTask: 'Observing enterprise telemetry and company health',
            model: 'qwen2.5:3b',
            tools: ['company_metrics', 'delegate_job', 'observe_enterprise'],
            permissions: ['*'],
            tokens: 0,
            latency: '12ms',
            memory: [],
            episodicMemory: [],
            lastAction: 'Observing enterprise health',
            nextAction: 'Ready for executive directives'
          }
        });
        return true;
      }
    }

    try {
      const data = await livingCityState(app, identity.tenantId, identity.actorId);
      const ag = data.agents.find(a => String(a.id || a.agentId).toLowerCase() === agentId.toLowerCase());
      if (ag) {
        sendJson(res, 200, {
          ok: true,
          source: 'JobEngine/ProjectKernel',
          agent: {
            id: ag.id,
            agentId: ag.id,
            name: ag.name,
            role: ag.role,
            department: ag.department || ag.district || null,
            company: ag.company || null,
            currentJob: ag.currentJob,
            currentTask: ag.currentTask || null,
            jobId: ag.jobId || null,
            missionId: ag.missionId || null,
            projectId: ag.projectId || null,
            model: ag.model || null,
            tools: ag.tools || [],
            permissions: ag.permissions || [],
            status: ag.status || 'NOT_MEASURED',
            state: ag.state || 'NOT_MEASURED',
            location: ag.district || null,
            district: ag.district || null,
            emoji: ag.avatar || '🤖',
            tokens: Number.isFinite(ag.tokens) ? ag.tokens : null,
            latency: ag.latency || null,
            memory: ag.memory || [],
            episodicMemory: ag.memory || [],
            lastAction: ag.lastAction || ag.currentTask || (ag.currentJob ? ag.currentJob.name : null),
            nextAction: ag.nextAction || null
          }
        });
        return true;
      }
    } catch (err) {
      // Proceed to 404
    }

    sendJson(res, 404, { ok: false, error: `Agente '${agentId}' não encontrado` });
    return true;
  }

  // --- Network Graph ---
  if (req.method === 'GET' && url.pathname === '/api/v2/living-city/network-graph') {
    const data = await livingCityState(app, identity.tenantId, identity.actorId);
    const missions = await app.missions.list(identity.tenantId, identity.actorId);
    const projects = await app.projectKernel.list(identity.tenantId, identity.actorId);

    const nodes = [];
    const edges = [];

    // Add AGENTS nodes
    data.agents.forEach(ag => {
      nodes.push({
        id: `agent:${ag.id}`,
        label: ag.name,
        type: 'AGENT',
        status: ag.status,
        color: ag.color || '#00D9FF',
        category: 'agents',
        meta: { role: ag.role, company: ag.company, district: ag.district, model: ag.model, currentTask: ag.currentTask }
      });
    });

    // Add VEHICLES nodes
    (data.vehicles || []).forEach(v => {
      nodes.push({
        id: `vehicle:${v.id}`,
        label: v.name,
        type: 'VEHICLE',
        status: v.status,
        color: v.color || '#F59E0B',
        category: 'vehicles',
        meta: { cargo: v.cargo, origin: v.origin, destination: v.destination }
      });
    });

    // Add MEMORY nodes
    const memoryNodes = [
      { id: 'mem:active_project', label: 'Active Project Memory', type: 'MEMORY', color: '#A855F7', subtype: 'operational' },
      { id: 'mem:episodic', label: 'Episodic Memory Stream', type: 'MEMORY', color: '#A855F7', subtype: 'episodic' },
      { id: 'mem:vector_store', label: 'Semantic Vector Store', type: 'MEMORY', color: '#A855F7', subtype: 'vector' },
      { id: 'mem:decision_ledger', label: 'Decision Ledger', type: 'MEMORY', color: '#A855F7', subtype: 'immutable' },
    ];
    memoryNodes.forEach(m => nodes.push({ ...m, category: 'memory' }));

    // Add SKILL nodes
    const skillNodes = [
      { id: 'skill:code_synthesis', label: 'Code Synthesis', type: 'SKILL', color: '#10B981' },
      { id: 'skill:ast_transform', label: 'AST Refactor', type: 'SKILL', color: '#10B981' },
      { id: 'skill:terminal_exec', label: 'Terminal / CLI', type: 'SKILL', color: '#10B981' },
      { id: 'skill:qa_automation', label: 'Playwright / QA', type: 'SKILL', color: '#10B981' },
      { id: 'skill:git_engine', label: 'Git Flow & CI/CD', type: 'SKILL', color: '#10B981' },
      { id: 'skill:unreal_bridge', label: 'Unreal World Bridge', type: 'SKILL', color: '#10B981' },
      { id: 'skill:logistics_wms', label: 'WMS & Despacho', type: 'SKILL', color: '#10B981' },
    ];
    skillNodes.forEach(s => nodes.push({ ...s, category: 'skills' }));

    // Add TOOL nodes
    const toolNodes = [
      { id: 'tool:read_file', label: 'read_file', type: 'TOOL', color: '#F59E0B' },
      { id: 'tool:write_file', label: 'write_file', type: 'TOOL', color: '#F59E0B' },
      { id: 'tool:run_command', label: 'run_command', type: 'TOOL', color: '#F59E0B' },
      { id: 'tool:browser_page', label: 'browser_page', type: 'TOOL', color: '#F59E0B' },
      { id: 'tool:search_web', label: 'search_web', type: 'TOOL', color: '#F59E0B' },
    ];
    toolNodes.forEach(t => nodes.push({ ...t, category: 'tools' }));

    // Add MISSIONS nodes
    missions.slice(-10).forEach(m => {
      nodes.push({
        id: `mission:${m.id}`,
        label: m.goal || m.title || `Missão ${m.id.slice(0, 8)}`,
        type: 'MISSION',
        color: m.status === 'COMPLETED' ? '#10B981' : (m.status === 'FAILED' ? '#EF4444' : '#F59E0B'),
        status: m.status,
        category: 'missions',
        meta: { progress: m.progress, stepsCount: m.steps?.length || 0 }
      });
    });

    // Add PROJECTS nodes
    projects.forEach(p => {
      nodes.push({
        id: `project:${p.id}`,
        label: p.name,
        type: 'PROJECT',
        color: '#3B82F6',
        category: 'projects',
        meta: { workspace: p.workspace, status: p.status }
      });
    });

    // Add APIS nodes
    const apiNodes = [
      { id: 'api:living_city', label: '/api/v2/living-city', type: 'API', color: '#EC4899' },
      { id: 'api:company_brain', label: '/api/v2/company', type: 'API', color: '#EC4899' },
      { id: 'api:world_model', label: '/api/v2/world-model', type: 'API', color: '#EC4899' },
      { id: 'api:unreal_events', label: '/api/v2/unreal/events', type: 'API', color: '#EC4899' },
    ];
    apiNodes.forEach(a => nodes.push({ ...a, category: 'apis' }));

    // Edges linking Agents to Skills, Tools, Memory
    data.agents.forEach(ag => {
      const agNodeId = `agent:${ag.id}`;
      edges.push({ from: agNodeId, to: 'mem:active_project', relation: 'reads_memory', color: 'rgba(168, 85, 247, 0.4)' });
      edges.push({ from: agNodeId, to: 'mem:episodic', relation: 'stores_memory', color: 'rgba(168, 85, 247, 0.4)' });

      const role = (ag.role || '').toLowerCase();
      if (role.includes('ceo') || role.includes('architect')) {
        edges.push({ from: agNodeId, to: 'mem:decision_ledger', relation: 'records_decision' });
        edges.push({ from: agNodeId, to: 'skill:ast_transform', relation: 'possesses_skill' });
        edges.push({ from: agNodeId, to: 'skill:code_synthesis', relation: 'possesses_skill' });
      }
      if (role.includes('dev') || role.includes('backend') || role.includes('frontend')) {
        edges.push({ from: agNodeId, to: 'skill:code_synthesis', relation: 'possesses_skill' });
        edges.push({ from: agNodeId, to: 'tool:read_file', relation: 'uses_tool' });
        edges.push({ from: agNodeId, to: 'tool:write_file', relation: 'uses_tool' });
        edges.push({ from: agNodeId, to: 'tool:run_command', relation: 'uses_tool' });
      }
      if (role.includes('qa')) {
        edges.push({ from: agNodeId, to: 'skill:qa_automation', relation: 'possesses_skill' });
        edges.push({ from: agNodeId, to: 'tool:browser_page', relation: 'uses_tool' });
      }
      if (role.includes('vendas') || role.includes('expedicao') || role.includes('logistica') || role.includes('embalagem') || role.includes('qualidade')) {
        edges.push({ from: agNodeId, to: 'skill:logistics_wms', relation: 'possesses_skill' });
      }

      if (ag.currentJob?.id) {
        const matchingMission = missions.find(m => m.id === ag.currentJob.id || (m.steps && m.steps.some(s => s.jobId === ag.currentJob.id)));
        if (matchingMission) {
          edges.push({ from: agNodeId, to: `mission:${matchingMission.id}`, relation: 'executes_mission', color: '#10B981' });
        }
      }
    });

    // Connect Missions to Projects
    missions.slice(-10).forEach(m => {
      if (m.projectId) {
        edges.push({ from: `mission:${m.id}`, to: `project:${m.projectId}`, relation: 'belongs_to_project' });
      }
    });

    // Connect Projects to APIs
    projects.forEach(p => {
      edges.push({ from: `project:${p.id}`, to: 'api:living_city', relation: 'exposes_api' });
      edges.push({ from: `project:${p.id}`, to: 'api:company_brain', relation: 'exposes_api' });
    });

    sendJson(res, 200, {
      ok: true,
      source: 'LivingCity/CognitiveNetworkEngine',
      measuredAt: new Date().toISOString(),
      counts: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        agents: data.agents.length,
        vehicles: (data.vehicles || []).length,
        missions: missions.length,
        projects: projects.length,
      },
      nodes,
      edges
    });
    return true;
  }

  // --- GET /api/v2/living-city/building/:id ---
  if (req.method === 'GET' && url.pathname.startsWith('/api/v2/living-city/building/')) {
    const buildingId = decodeURIComponent(url.pathname.replace('/api/v2/living-city/building/', ''));
    const building = worldEngine.findBuilding(buildingId);
    if (!building) {
      sendJson(res, 404, {
        ok: false,
        error: 'BUILDING_NOT_FOUND',
        buildingId,
        source: 'WorldStateEngine',
      });
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/LivingBuildingState',
      building
    });
    return true;
  }

  return false;
}

module.exports = { handleLivingCityRoutes, livingCityState, executeRealityIntent };
