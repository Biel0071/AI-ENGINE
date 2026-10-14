'use strict';

async function handleProductApiRoutes(req, res, url, app, sendJson, readJson, identity) {
  const { tenantId, actorId } = identity;
  const method = req.method;
  const pathname = url.pathname;

  // GET /api/dashboard
  if (method === 'GET' && pathname === '/api/dashboard') {
    const state = await app.store.read();
    const scoped = (items) => (items || []).filter((item) => item.tenantId === tenantId);
    const missions = scoped(state.missions);
    const jobs = scoped(state.runtimeJobs);
    
    const activeMissions = missions.filter(m => !['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(m.status)).length;
    const completedMissions = missions.filter(m => m.status === 'SUCCEEDED').length;
    const failedMissions = missions.filter(m => m.status === 'FAILED').length;
    
    const agents = app.agentRegistry ? app.agentRegistry.agents : new Map();
    const activeAgents = Array.from(agents.values()).filter(a => a.status === 'WORKING' || a.status === 'ONLINE').length;
    
    const experiments = scoped(state.evolutionExperiments || []);
    
    return sendJson(res, 200, {
      activeMissions,
      runningJobs: jobs.filter(j => j.status === 'RUNNING').length,
      activeAgents,
      completedMissions,
      failedMissions,
      experiments: experiments.length,
      generations: state.evolutionGenerations ? scoped(state.evolutionGenerations).length : 0,
      promotedAgents: scoped(state.promotedAgents || []).length,
      eliteAgents: scoped(state.eliteAgents || []).length,
      systemHealth: (await app.health.check()).status,
      queueStatus: 'ONLINE'
    });
  }

  // POST /api/command (Command Center)
  if (method === 'POST' && pathname === '/api/command') {
    const body = await readJson(req);
    const command = body.command || body.prompt || '';
    if (!command.trim()) return sendJson(res, 400, { error: 'Command required' });
    
    // Roteia para o MissionPlanner
    const result = await app.missionPlanner.plan(tenantId, actorId, { 
      objective: command, 
      context: { workspacePath: '/' },
      autoStart: true 
    });
    const mission = result.mission || result.plan;
    return sendJson(res, 201, {
      ok: true,
      missionId: mission.id,
      status: mission.status,
      reply: `Missão #${mission.id} iniciada com sucesso: "${command}". Status: ${mission.status}.`,
      message: `Missão #${mission.id} (${mission.status})`
    });
  }

  // GET /api/missions
  if (method === 'GET' && pathname === '/api/missions') {
    const missions = await app.missions.list(tenantId, actorId);
    return sendJson(res, 200, { missions });
  }

  // POST /api/missions
  if (method === 'POST' && pathname === '/api/missions') {
    const body = await readJson(req);
    const goal = body.goal || body.objective;
    if (!goal) return sendJson(res, 400, { error: 'Goal required' });
    const result = await app.missionPlanner.plan(tenantId, actorId, {
      objective: goal,
      title: body.title,
      mode: body.mode || 'AUTO',
      context: body.context || { workspacePath: '/' },
      autoStart: true
    });
    if (result.questions && result.questions.length > 0) {
      return sendJson(res, 400, { error: 'Missing inputs', questions: result.questions });
    }
    return sendJson(res, 201, result.mission || result.plan);
  }

  // Mission Events (Handled first to prevent parameterized ID route collision)
  if (method === 'GET' && pathname === '/api/missions/events') {
    const state = await app.store.read();
    const events = state.missionEvents || [];
    return sendJson(res, 200, { ok: true, events, count: events.length, source: 'measured' });
  }

  const missionEventsMatch = pathname.match(/^\/api\/missions\/([^/]+)\/events$/);
  if (method === 'GET' && missionEventsMatch) {
    const targetId = missionEventsMatch[1];
    const state = await app.store.read();
    const events = targetId === 'events' ? (state.missionEvents || []) : (state.missionEvents || []).filter(item => item.missionId === targetId);
    return sendJson(res, 200, { ok: true, missionId: targetId, events, count: events.length, source: 'measured' });
  }

  // Missions parameter routes
  const reservedMissionEndpoints = new Set(['events', 'plans', 'avatar-state', 'reconcile', 'plan', 'recent', 'stats']);
  const missionIdMatch = pathname.match(/^\/api\/missions\/([^/]+)$/);
  if (method === 'GET' && missionIdMatch && !reservedMissionEndpoints.has(missionIdMatch[1])) {
    try {
      const mission = await app.missions.get(tenantId, actorId, missionIdMatch[1]);
      if (!mission) {
        return sendJson(res, 200, { ok: false, error: 'Mission not found', mission: null });
      }
      return sendJson(res, 200, mission);
    } catch(e) {
      return sendJson(res, 200, { ok: false, error: 'Mission not found', mission: null });
    }
  }

  const missionCancelMatch = pathname.match(/^\/api\/missions\/([^/]+)\/cancel$/);
  if (method === 'POST' && missionCancelMatch) {
    try {
      await app.store.update((state) => {
         const m = state.missions.find(x => x.id === missionCancelMatch[1]);
         if (m) { m.status = 'CANCELLED'; m.updatedAt = new Date().toISOString(); }
         return state;
      });
      return sendJson(res, 200, { ok: true });
    } catch(e) {
      return sendJson(res, 500, { error: e.message });
    }
  }

  // Agents
  if (method === 'GET' && pathname === '/api/agents') {
    const agentsMap = app.agentRegistry ? app.agentRegistry.agents : new Map();
    const agents = Array.from(agentsMap.values()).map(a => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      metrics: typeof a.metrics === 'function' ? a.metrics() : {}
    }));
    return sendJson(res, 200, { agents });
  }

  const agentIdMatch = pathname.match(/^\/api\/agents\/([^/]+)$/);
  const reservedAgentEndpoints = new Set(['panel', 'swarm', 'cycles', 'tasks', 'delegations', 'knowledge-proposals']);
  if (method === 'GET' && agentIdMatch && !reservedAgentEndpoints.has(agentIdMatch[1])) {
    const agent = app.agentRegistry ? Array.from(app.agentRegistry.agents.values()).find(a => a.id === agentIdMatch[1]) : null;
    if (!agent) return sendJson(res, 404, { error: 'Agent not found' });
    return sendJson(res, 200, {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      metrics: typeof agent.metrics === 'function' ? agent.metrics() : {}
    });
  }

  const agentGenomeMatch = pathname.match(/^\/api\/agents\/([^/]+)\/genome$/);
  if (method === 'GET' && agentGenomeMatch) {
    const agent = app.agentRegistry ? Array.from(app.agentRegistry.agents.values()).find(a => a.id === agentGenomeMatch[1]) : null;
    if (!agent) return sendJson(res, 404, { error: 'Agent not found' });
    return sendJson(res, 200, { genome: agent.genome || {} });
  }

  const agentHistoryMatch = pathname.match(/^\/api\/agents\/([^/]+)\/history$/);
  if (method === 'GET' && agentHistoryMatch) {
    const state = await app.store.read();
    const history = (state.runtimeJobs || []).filter(j => j.agentId === agentHistoryMatch[1]);
    return sendJson(res, 200, { history });
  }

  // Evolution Lab
  if (method === 'GET' && pathname === '/api/evolution') {
    const state = await app.store.read();
    return sendJson(res, 200, {
      status: 'ACTIVE',
      generations: (state.evolutionGenerations || []).length,
      experiments: (state.evolutionExperiments || []).length
    });
  }

  if (method === 'GET' && pathname === '/api/evolution/generations') {
    const state = await app.store.read();
    return sendJson(res, 200, { generations: state.evolutionGenerations || [] });
  }

  if (method === 'GET' && pathname === '/api/experiments') {
    const state = await app.store.read();
    return sendJson(res, 200, { experiments: state.evolutionExperiments || [] });
  }

  const expMatch = pathname.match(/^\/api\/experiments\/([^/]+)$/);
  if (method === 'GET' && expMatch) {
    const state = await app.store.read();
    const exp = (state.evolutionExperiments || []).find(e => e.id === expMatch[1]);
    if (!exp) return sendJson(res, 404, { error: 'Experiment not found' });
    return sendJson(res, 200, exp);
  }

  // World Model
  if (method === 'GET' && pathname === '/api/world-model') {
    const state = await app.store.read();
    const scoped = (items) => (items || []).filter((item) => item.tenantId === tenantId);
    return sendJson(res, 200, {
      projects: scoped(state.projects).length,
      missions: scoped(state.missions).length,
      jobs: scoped(state.runtimeJobs).length,
      agents: app.agentRegistry ? app.agentRegistry.agents.size : 0,
      patterns: scoped(state.patterns || []).length
    });
  }

  return false;
}

module.exports = { handleProductApiRoutes };
