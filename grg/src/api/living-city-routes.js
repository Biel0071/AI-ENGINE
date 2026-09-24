async function livingCityState(app, tenantId, actorId) {
  await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
  const [state, jobs, missions, projects] = await Promise.all([
    app.store.read(), app.jobs.list(tenantId, actorId), app.missions.list(tenantId, actorId), app.projectKernel.list(tenantId, actorId),
  ]);
  const profiles = state.agentProfiles || [];
  const catalog = [
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
    const currentJob = jobs.find((job) => job.status === 'RUNNING' && (job.agent?.agentId === id || job.agentId === id));
    const storedStatus = String(profile?.status || agent.status || 'AVAILABLE').toUpperCase();
    const status = currentJob ? 'WORKING' : (storedStatus === 'ACTIVE' ? 'AVAILABLE' : storedStatus);
    return {
      id, agentId: id, name: profile?.displayName || agent.name || id,
      role: profile?.role || agent.role || agent.domain || 'agent',
      district: profile?.district || agent.district || null,
      status, state: status, provider: currentJob?.agent?.provider || agent.provider || null,
      model: currentJob?.agent?.model || agent.model || null,
      currentJob: currentJob ? { id: currentJob.id, name: currentJob.prompt || currentJob.type, progress: currentJob.progress } : null,
      currentTask: currentJob?.prompt || null,
      projectId: currentJob?.projectId || null,
      avatar: profile?.avatar || agent.avatar || null,
      kind: (state.cognitiveAgents || []).some((item) => item.id === id && item.tenantId === tenantId) ? 'cognitive' : 'registered',
    };
  });
  const activeMissions = missions.filter((mission) => ['RUNNING', 'QUEUED', 'PAUSED', 'AWAITING_APPROVAL'].includes(String(mission.status).toUpperCase())).length;
  return {
    source: 'JobEngine/ProjectKernel', measuredAt: new Date().toISOString(), agents,
    projects: projects.map((project) => ({ id: project.id, name: project.name, workspace: project.workspace || null })),
    metrics: {
      registeredAgents: agents.length,
      workingAgents: agents.filter((agent) => agent.status === 'WORKING').length,
      projectsCount: projects.length, activeMissions,
      runningJobs: jobs.filter((job) => job.status === 'RUNNING').length,
      failedJobs: jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(job.status)).length,
      memoriesCount: (state.memories || []).filter((item) => item.tenantId === tenantId && item.status === 'ACTIVE').length,
    },
  };
}

async function handleLivingCityRoutes(req, res, url, app, sendJson, identity) {
  if (req.method !== 'GET' || !['/api/v2/living-city/agents', '/api/v2/living-city/state'].includes(url.pathname)) return false;
  const data = await livingCityState(app, identity.tenantId, identity.actorId);
  sendJson(res, 200, url.pathname.endsWith('/agents') ? { source: data.source, measuredAt: data.measuredAt, count: data.agents.length, agents: data.agents } : data);
  return true;
}

module.exports = { handleLivingCityRoutes, livingCityState };
