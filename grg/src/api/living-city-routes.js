const os = require('node:os');
const { globalBus } = require('../eventing/fenix-event-bus');
const { getWorldStateEngine } = require('../world-model/world-state-engine');
const { getWorldSimulationEngine } = require('../world-model/world-simulation-engine');
const { getWorldCommandEngine } = require('../world-model/world-command-engine');
const { getWorldIntentPlanner } = require('../world-model/world-intent-planner');

async function livingCityState(app, tenantId, actorId, { agentsOnly = false } = {}) {
  await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
  const worldEngine = getWorldStateEngine();

  const [state, jobs, missions, projects, workers] = await Promise.all([
    app.store.read(), app.jobs.list(tenantId, actorId),
    agentsOnly ? Promise.resolve([]) : app.missions.list(tenantId, actorId),
    agentsOnly ? Promise.resolve([]) : app.projectKernel.list(tenantId, actorId),
    agentsOnly ? Promise.resolve([]) : app.jobs.workers(tenantId, actorId),
  ]);
  const profiles = state.agentProfiles || [];

  // Merge canonical catalog with WorldStateEngine agents (Camila, André, Marcos, Silva, CEO, etc.)
  const worldAgentsList = Object.values(worldEngine.agents);
  const catalog = [
    ...worldAgentsList,
    ...(app.ceoAgent ? [app.ceoAgent.identity] : []),
    ...(app.agentRegistry?.list() || []),
    ...(state.agents || []).filter((agent) => agent.tenantId === tenantId),
    ...(state.cognitiveAgents || []).filter((agent) => agent.tenantId === tenantId),
  ];
  const seen = new Set();
  const agents = catalog.filter((agent) => {
    const id = String(agent.id || agent.agentId || '');
    if (!id || seen.has(id.toLowerCase())) return false;
    seen.add(id.toLowerCase()); return true;
  }).map((agent) => {
    const id = String(agent.id || agent.agentId);
    const profile = profiles.find((item) => String(item.id || '').toLowerCase() === id.toLowerCase());
    const currentJob = jobs.find((job) => job.status === 'RUNNING' && (job.agent?.agentId === id || job.agentId === id)) || agent.currentJob || null;
    const storedStatus = String(profile?.status || agent.status || 'AVAILABLE').toUpperCase();
    const status = currentJob ? 'WORKING' : (storedStatus === 'ACTIVE' ? 'AVAILABLE' : storedStatus);
    return {
      id, agentId: id, name: profile?.displayName || agent.name || id,
      displayName: profile?.displayName || agent.displayName || agent.name || id,
      role: profile?.role || agent.role || agent.domain || 'agent',
      company: agent.company || null,
      companyId: agent.companyId || null,
      department: agent.department || agent.district || 'OPERATIONS',
      district: profile?.district || agent.district || null,
      buildingId: agent.buildingId || null,
      floorNum: agent.floorNum || null,
      workstationId: agent.workstationId || agent.stationId || null,
      stationId: agent.workstationId || agent.stationId || null,
      coordinates: agent.coordinates || null,
      homeCoordinates: agent.homeCoordinates || null,
      targetCoordinates: agent.targetCoordinates || null,
      path: agent.path || [],
      facing: agent.facing || 'SE',
      speed: agent.speed || 0.04,
      status, state: agent.state || status,
      provider: currentJob?.agent?.provider || agent.provider || null,
      model: currentJob?.agent?.model || agent.model || 'qwen2.5:3b',
      currentJob: currentJob ? { id: currentJob.id, name: currentJob.name || currentJob.prompt || currentJob.type, progress: currentJob.progress } : null,
      currentTask: agent.currentTask || currentJob?.name || currentJob?.prompt || null,
      projectId: currentJob?.projectId || null,
      avatar: profile?.avatar || agent.avatar || null,
      skills: agent.skills || [],
      tools: agent.tools || [],
      memory: agent.memory || [],
      kind: (state.cognitiveAgents || []).some((item) => item.id === id && item.tenantId === tenantId) ? 'cognitive' : 'registered',
    };
  });

  // Synchronize all discovered agents into WorldStateEngine so their lifecycle & chat are immediately accessible
  for (const a of agents) {
    const aid = String(a.id || a.agentId).toLowerCase();
    if (!worldEngine.agents[aid]) {
      worldEngine.agents[aid] = {
        ...a,
        id: a.id || a.agentId,
        agentId: a.id || a.agentId,
        memory: a.memory || []
      };
    } else {
      Object.assign(worldEngine.agents[aid], a);
    }
  }

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

async function handleLivingCityRoutes(req, res, url, app, sendJson, readJsonOrIdentity, maybeIdentity) {
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

  const worldEngine = getWorldStateEngine();
  const simEngine = getWorldSimulationEngine();

  // Ensure simulation engine is running
  if (!simEngine.isRunning) {
    simEngine.start();
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
      const commandEngine = getWorldCommandEngine();
      const planner = getWorldIntentPlanner();

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
        plannedReport = planner.plan(body.prompt || body.intent, {
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
    const hierarchy = worldEngine.getCompanyHierarchy(companyId);
    if (!hierarchy) {
      sendJson(res, 404, { ok: false, error: `Empresa '${companyId}' não encontrada.` });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      source: 'WorldStateEngine/CompanyHierarchy',
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
      const replyData = await worldEngine.chatWithAgent(targetAgentId, userMessage);
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

      const replyData = await worldEngine.chatWithAgent(agentId, userMessage);
      sendJson(res, 200, replyData);
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // --- POST /api/v2/living-city/agent/:id/assign ---
  if (req.method === 'POST' && url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/assign$/)) {
    const match = url.pathname.match(/^\/api\/v2\/living-city\/agent\/([^/]+)\/assign$/);
    const agentId = decodeURIComponent(match[1]);
    try {
      const body = await readJson(req);
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

  // --- POST /api/v2/living-city/agent/message ---
  if (req.method === 'POST' && url.pathname === '/api/v2/living-city/agent/message') {
    try {
      const body = await readJson(req);
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
    if (!ag && worldEngine.agents[agentId]) {
      ag = worldEngine.agents[agentId];
    }
    if (!ag && worldEngine.findAgent) {
      ag = worldEngine.findAgent(agentId);
    }

    if (!ag) {
      sendJson(res, 404, { ok: false, error: `Agente '${agentId}' não encontrado para lifecycle.` });
      return true;
    }

    const bld = ag.buildingId ? (worldEngine.buildings[ag.buildingId] || null) : null;
    const currentTask = ag.currentTask || (ag.currentJob ? ag.currentJob.name : 'Standby operacional · Pronto para novas atribuições');
    const missionId = ag.missionId || (ag.currentJob ? ag.currentJob.id : null);

    const lifecycle = {
      whoAmI: {
        id: ag.id || ag.agentId,
        name: ag.name || ag.displayName,
        role: ag.role || 'Especialista Fênix',
        department: ag.department || 'OPERATIONS',
        company: ag.company || 'Fênix Enterprise',
        model: ag.model || 'qwen2.5:3b',
        avatar: ag.avatar || '🤖'
      },
      whereAmI: {
        buildingId: ag.buildingId || 'bld-api-platform',
        buildingName: bld ? bld.name : 'API Platform & Core Loft',
        district: ag.district || (bld ? bld.district : 'dev-district'),
        floorNum: typeof ag.floorNum === 'number' ? ag.floorNum : 0,
        workstationId: ag.workstationId || ag.stationId || null,
        coordinates: ag.coordinates || { x: 0, y: 0.8, z: 0 }
      },
      whatAmIDoing: {
        status: ag.status || 'AVAILABLE',
        state: ag.state || 'IDLE',
        currentTask,
        currentJob: ag.currentJob || null,
        facing: ag.facing || 'SE',
        speed: ag.speed || 2.2
      },
      whyAmIDoingThis: {
        missionId: missionId || 'none',
        objective: currentTask,
        parentGoal: missionId ? `Execução de missão operacional ${missionId}` : 'Observação e prontidão operacional',
        projectId: ag.projectId || 'fênix-core'
      },
      whatWillIDoNext: {
        nextAction: ag.status === 'WORKING' ? 'Concluir tarefas atribuídas e registrar evidências' : 'Aguardar despacho de novo job ou comando do operador',
        pipelineStep: ag.status === 'WORKING' ? 'IN_PROGRESS' : 'IDLE',
        upcomingTasks: []
      },
      whatIsMyMemory: {
        episodicCount: (ag.memory || []).length,
        recentEntries: (ag.memory || []).slice(-5)
      },
      whatAreMySkillsAndTools: {
        skills: ag.skills || ['task_execution', 'telemetry_monitoring', 'code_synthesis'],
        tools: ag.tools || ['api_call', 'read_file', 'write_file', 'run_command'],
        permissions: ['read', 'write', 'execute']
      },
      whatIsMyEnergyAndAttention: {
        energyPercent: typeof ag.energy === 'number' ? ag.energy : 100,
        attentionPercent: typeof ag.attention === 'number' ? ag.attention : 100,
        tokensProcessed: ag.tokens || 0,
        latency: ag.latency || '12ms'
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
    
    // First, check WorldStateEngine directly (handles Camila, CEO, André, Marcos, etc.)
    const worldAgent = worldEngine.findAgent(agentId);
    if (worldAgent) {
      sendJson(res, 200, {
        ok: true,
        source: 'WorldStateEngine/LivingAgentRuntime',
        agent: {
          ...worldAgent,
          location: worldAgent.district,
          state: worldAgent.state || worldAgent.status,
          emoji: worldAgent.avatar || '🤖',
          tokens: 0,
          latency: '14ms',
          episodicMemory: worldAgent.memory || [],
          lastAction: worldAgent.currentTask || (worldAgent.currentJob ? worldAgent.currentJob.name : 'Standby operacional'),
          nextAction: 'Pronto para execução contínua no runtime'
        }
      });
      return true;
    }

    const isCeo = agentId.toLowerCase() === 'agent.ceo' || agentId.toLowerCase() === 'ceo';
    if (isCeo && app.ceoAgent) {
      try {
        const company = app.companyBrain ? await app.companyBrain.getCompany(identity.tenantId) : null;
        const telemetry = app.companyBrain ? await app.companyBrain.getTelemetry(identity.tenantId, company?.id) : {};
        const hypotheses = typeof app.evolutionLab?.listHypotheses === 'function' ? app.evolutionLab.listHypotheses() : [];
        const experiments = typeof app.evolutionLab?.listExperiments === 'function' ? app.evolutionLab.listExperiments() : [];
        return sendJson(res, 200, {
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
      } catch (err) {
        return sendJson(res, 200, {
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
      }
    }

    try {
      const data = await livingCityState(app, identity.tenantId, identity.actorId);
      const ag = data.agents.find(a => String(a.id || a.agentId).toLowerCase() === agentId.toLowerCase());
      if (ag) {
        return sendJson(res, 200, {
          ok: true,
          source: 'JobEngine/ProjectKernel',
          agent: {
            id: ag.id,
            agentId: ag.id,
            name: ag.name,
            role: ag.role,
            department: ag.department || ag.district || 'TECHNOLOGY',
            company: ag.company || app.companyBrain?.company?.name || 'Fênix Enterprise',
            currentJob: ag.currentJob,
            model: ag.model || 'qwen2.5:3b',
            tools: ag.tools || ['file_read', 'git_inspect', 'command_exec', 'test_runner'],
            permissions: ['read', 'write', 'execute'],
            status: ag.status || 'AVAILABLE',
            state: ag.state || 'AVAILABLE',
            location: ag.district || 'dev-district',
            district: ag.district || 'dev-district',
            emoji: ag.avatar || '🤖',
            tokens: 0,
            latency: '—',
            memory: ag.memory || [],
            episodicMemory: ag.memory && ag.memory.length > 0 ? ag.memory : [
              { timestamp: new Date().toISOString(), content: `Agente sincronizado no distrito ${ag.district || 'dev-district'}` }
            ],
            lastAction: ag.currentTask || (ag.currentJob ? ag.currentJob.name : 'Standby aguardando atribuição no distrito'),
            nextAction: 'Pronto para execução de tarefas'
          }
        });
      }
    } catch (err) {
      // Proceed to 404
    }

    return sendJson(res, 404, { ok: false, error: `Agente '${agentId}' não encontrado` });
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

    return sendJson(res, 200, {
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

module.exports = { handleLivingCityRoutes, livingCityState };
