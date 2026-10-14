const { DevMissionPlanner } = require('../execution/dev-mission-planner');

async function handleCloudRoutes(req, res, url, app, sendJson, sendError, context = {}) {
  // DEV CLOUD MULTI-CLIENT API
  if (!url.pathname.startsWith('/api/dev/projects')
    && !url.pathname.startsWith('/api/dev/tasks')
    && !url.pathname.startsWith('/api/dev/jobs')
    && !url.pathname.startsWith('/api/dev/missions')
    && !url.pathname.startsWith('/api/dev/orchestration')
    && url.pathname !== '/api/v2/agentic/execute') {
    return false;
  }

  const { projectRegistry, jobQueue } = app; // Assuming these are attached to app
  const method = req.method;

  // --- PROJECTS ---
  if (method === 'GET' && url.pathname === '/api/dev/projects') {
    sendJson(res, 200, { projects: projectRegistry ? projectRegistry.list() : [] });
    return true;
  }

  if (method === 'POST' && url.pathname === '/api/dev/projects') {
    const body = await readBody(req);
    const project = projectRegistry.register(body);
    sendJson(res, 201, { project });
    return true;
  }

  const projMatch = url.pathname.match(/^\/api\/dev\/projects\/([^/]+)$/);
  if (projMatch) {
    const pid = projMatch[1];
    if (method === 'GET') {
      const p = projectRegistry.get(pid);
      p ? sendJson(res, 200, { project: p }) : sendJson(res, 404, { error: 'Project not found' });
      return true;
    }
  }

  
    // --- JOBS ---
    if (method === 'GET' && url.pathname === '/api/dev/jobs') {
      if (jobQueue) {
        sendJson(res, 200, { jobs: jobQueue.list ? jobQueue.list(Object.fromEntries(url.searchParams.entries())) : Array.from(jobQueue.jobs.values()) || [] });
      } else {
        sendJson(res, 500, { error: 'JobQueue not configured' });
      }
      return true;
    }
    if (method === 'GET' && url.pathname === '/api/dev/orchestration/diagnostics') {
      const jobs = jobQueue?.list ? jobQueue.list() : [];
      const metrics = jobQueue?.metrics ? jobQueue.metrics() : {};
      const missingProjects = jobs
        .filter((job) => job.projectId && projectRegistry && !projectRegistry.get(job.projectId))
        .map((job) => ({ jobId: job.id, missionId: job.missionId, projectId: job.projectId, type: job.type, status: job.status, error: job.error || null }));
      const waiting = jobs
        .filter((job) => job.status === 'WAITING_DEPENDENCY')
        .map((job) => ({ jobId: job.id, type: job.type, waitingFor: job.waitingFor || job.dependencies || [] }));
      sendJson(res, 200, {
        workers: app.jobWorker ? { active: app.jobWorker.activeJobs?.size || 0, max: app.jobWorker.maxConcurrent || 0, locks: Array.from(app.jobWorker.locks || []) } : null,
        metrics,
        diagnosis: {
          coarseLockResolved: true,
          currentBlockers: {
            missingProjects,
            waitingDependency: waiting,
            failedJobs: jobs.filter((job) => job.status === 'FAILED').map((job) => ({ jobId: job.id, type: job.type, projectId: job.projectId, error: job.error || null }))
          }
        }
      });
      return true;
    }
    if (method === 'GET' && url.pathname === '/api/dev/missions') {
      sendJson(res, 200, { missions: jobQueue ? jobQueue.listMissions(Object.fromEntries(url.searchParams.entries())) : [] });
      return true;
    }
    const missionMatch = url.pathname.match(/^\/api\/dev\/missions\/([^/]+)$/);
    if (method === 'GET' && missionMatch) {
      const mission = jobQueue?.getMission(missionMatch[1]);
      if (!mission) sendJson(res, 404, { error: 'Mission not found' });
      else sendJson(res, 200, { mission, jobs: jobQueue.list({ missionId: mission.id }) });
      return true;
    }
    const jobActionMatch = url.pathname.match(/^\/api\/dev\/jobs\/([^/]+)\/(cancel|pause|resume|retry|prioritize)$/);
    if (method === 'POST' && jobActionMatch) {
      if (!jobQueue) {
        sendJson(res, 500, { error: 'JobQueue not configured' });
        return true;
      }
      const [, jobId, action] = jobActionMatch;
      const body = await readBody(req).catch(() => ({}));
      const job = action === 'cancel' ? jobQueue.cancel(jobId, body.reason)
        : action === 'pause' ? jobQueue.pause(jobId, body.reason)
        : action === 'resume' ? jobQueue.resume(jobId)
        : action === 'prioritize' ? jobQueue.update(jobId, { priority: Number(body.priority || 100), userPriority: body.userPriority || 'CRITICAL', prioritizedAt: new Date().toISOString() })
        : jobQueue.retry(jobId);
      if (!job) sendJson(res, 404, { error: 'Job not found' });
      else {
        const bus = app.bus || app.eventBus;
        const eventName = action === 'pause' ? 'job.paused' : action === 'resume' ? 'job.resumed' : action === 'cancel' ? 'job.cancelled' : 'job.retried';
        if (bus?.emit) await bus.emit(eventName, { jobId, action, projectId: job.projectId, missionId: job.missionId });
        sendJson(res, 200, { message: action, job });
      }
      return true;
    }
    const retryFailedMatch = url.pathname.match(/^\/api\/dev\/missions\/([^/]+)\/retry-failed$/);
    if (method === 'POST' && retryFailedMatch) {
      const missionId = retryFailedMatch[1];
      const retried = (jobQueue?.list({ missionId }) || [])
        .filter((job) => ['FAILED', 'CANCELLED', 'REPAIRING'].includes(job.status))
        .map((job) => jobQueue.retry(job.id))
        .filter(Boolean);
      sendJson(res, 200, { missionId, retried: retried.map((job) => ({ id: job.id, status: job.status, type: job.type })) });
      return true;
    }

    // --- TASKS ---
  if (method === 'POST' && (url.pathname === '/api/dev/tasks' || url.pathname === '/api/v2/agentic/execute')) {
    const body = await readBody(req);
    const { prompt, projectId, client } = body;
    
    if (!prompt) {
      sendJson(res, 400, { error: 'Prompt is required' });
      return true;
    }
    
    let project = null;
    if (projectId && projectRegistry) {
      project = projectRegistry.get(projectId);
    }

    // --- COMMAND ROUTER ---
      if (prompt.startsWith('/LEARN')) {
         console.log(`[CommandRouter] Executing /LEARN on ${projectId}`);
         const ptnLib = app.patternLibrary || require('../memory/pattern-library').PatternLibrary;
         const library = new ptnLib();
         const patterns = library.extractPatterns({ projectName: project ? project.name : 'Unknown', files: ['admin.js', 'sidebar.css'] });
         sendJson(res, 200, { message: 'Learned patterns', patterns });
         return true;
      }
      if (prompt.startsWith('/PATTERNS')) {
         console.log(`[CommandRouter] Executing /PATTERNS`);
         sendJson(res, 200, { message: 'Pattern Library', patterns: [] });
         return true;
      }
      if (prompt.startsWith('/ISOLATE')) {
         if (project) {
            project.dna = project.dna || {};
            project.dna.isolationPolicy = { doNotCopy: ['visual identity', 'branding'] };
         }
         sendJson(res, 200, { message: 'Project isolated visually', dna: project.dna });
         return true;
      }
      if (prompt.startsWith('/NEW-DESIGN')) {
         console.log(`[CommandRouter] Executing /NEW-DESIGN`);
         // Trigger a massive Full Dev loop conceptually
      }

    if (!jobQueue) {
      sendJson(res, 500, { error: 'JobQueue not configured' });
      return true;
    }

    const { missionRecord, jobs } = await queueDevMission(app, { body, prompt, project, projectId, client });

    sendJson(res, 201, {
      message: 'Task received. Real dev mission DAG queued.',
      missionId: missionRecord.id,
      enhancedPrompt: jobs[0]?.enhancedPrompt || { originalPrompt: prompt, objective: prompt, plan: [] },
      mission: missionRecord,
      jobs
    });
    return true;
  }

  // --- JOBS ---
  const jobMatch = url.pathname.match(/^\/api\/dev\/jobs\/([^/]+)$/);
  if (jobMatch) {
    const jid = jobMatch[1];
    if (method === 'GET') {
      const j = jobQueue ? jobQueue.get(jid) : null;
      j ? sendJson(res, 200, { job: j }) : sendJson(res, 404, { error: 'Job not found' });
      return true;
    }
  }

  return false;
}

async function queueDevMission(app, { body, prompt, project, projectId, client }) {
  const { jobQueue } = app;
  const bus = app.bus || app.eventBus;
  const planner = app.devMissionPlanner || new DevMissionPlanner(app);
  app.devMissionPlanner = planner;
  const missionPlan = await planner.plan({
    prompt,
    project,
    projectId,
    client: client || 'unknown',
    visualCapture: body.visualCapture || null,
    assignedAgentId: body.assignedAgentId || body.targetAgentId || null
  });
  const jobs = missionPlan.jobs;
  const missionRecord = jobQueue.createMission({ ...missionPlan, jobs: jobs.map((job) => job.id) });
  jobQueue.enqueueMany(jobs);

  if (bus?.emit) {
    await bus.emit('mission.created', {
      missionId: missionRecord.id,
      projectId,
      client,
      objective: prompt,
      intent: missionRecord.intent?.kind,
      jobCount: jobs.length,
      definitionOfDone: missionRecord.definitionOfDone,
      principalAgent: missionRecord.principalAgent ? {
        id: missionRecord.principalAgent.id,
        mode: missionRecord.principalAgent.mode,
        authority: missionRecord.principalAgent.autonomyPolicy?.default
      } : null,
      deliveryContract: missionRecord.deliveryContract,
      createdAt: missionRecord.createdAt
    });
    for (const job of jobs) {
      await bus.emit('job.created', {
        jobId: job.id,
        type: job.type,
        projectId,
        missionId: job.missionId,
        agentId: job.agentId,
        skill: job.skill,
        model: job.model,
        dependencies: job.dependencies,
        createdAt: job.createdAt
      });
    }
  }

  return { missionRecord, jobs };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    req.on('error', reject);
  });
}

module.exports = { handleCloudRoutes };
