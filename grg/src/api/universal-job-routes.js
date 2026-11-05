const fs = require('node:fs');
const path = require('node:path');
const { getWorldStateEngine } = require('../world-model/world-state-engine');
const { globalBus } = require('../eventing/fenix-event-bus');

const UNIVERSAL_FEED_FILE = path.join(__dirname, '../../memory/universal-ide-jobs.json');
let _universalIdeJobsCache = null;

function loadUniversalIdeJobs() {
  if (Array.isArray(_universalIdeJobsCache)) return _universalIdeJobsCache;
  try {
    if (fs.existsSync(UNIVERSAL_FEED_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(UNIVERSAL_FEED_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        _universalIdeJobsCache = parsed;
        return _universalIdeJobsCache;
      }
    }
  } catch (_) {}
  _universalIdeJobsCache = [];
  return _universalIdeJobsCache;
}

function saveUniversalIdeJobs(list) {
  _universalIdeJobsCache = Array.isArray(list) ? list.slice(0, 150) : [];
  try {
    const dir = path.dirname(UNIVERSAL_FEED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(UNIVERSAL_FEED_FILE, JSON.stringify(_universalIdeJobsCache, null, 2), 'utf8');
  } catch (_) {}
}

async function ingestUniversalIdeJob(body = {}, app = null, identity = {}) {
  const tenantId = identity.tenantId || 'grg';
  const actorId = identity.actorId || 'grg-admin';
  const source = String(body.source || body.ide || body.tool || body.client || 'universal-ide').trim();
  const projectId = String(body.projectId || body.companyId || body.workspace || 'fenix-os').trim();
  const rawPrompt = String(body.prompt || body.title || body.task || body.message || body.objective || body.action || 'Execução de diretiva operacional').trim();
  const cmdMatch = rawPrompt.match(/^(\/(?:fenix-global-engineering|goal|browser|plan|learn|boost|teamwork-preview|automation|grill-me))\b/i);
  const slashCommand = body.command
    ? String(body.command).trim()
    : (cmdMatch ? cmdMatch[1].toLowerCase() : '/goal');
  const type = String(body.type || (cmdMatch ? `workflow.${slashCommand.slice(1)}` : 'development.execute')).trim();
  const timestamp = new Date().toISOString();

  let worldDispatch = null;
  try {
    const worldEngine = getWorldStateEngine();
    if (worldEngine && typeof worldEngine.dispatchWorkflowCommand === 'function') {
      worldDispatch = worldEngine.dispatchWorkflowCommand(slashCommand, {
        companyId: projectId,
        projectId,
        objective: rawPrompt,
        issuer: source,
        spawnNewAgent: Boolean(body.spawnNewAgent),
      });
    }
  } catch (_) {}

  let queuedMission = null;
  try {
    const queue = app?.autonomousLoop?.missionQueue;
    if (queue && typeof queue.enqueue === 'function') {
      queuedMission = queue.enqueue({
        title: `[${source}] ${rawPrompt.slice(0, 110)}`,
        description: rawPrompt,
        type: body.missionType || 'FEATURE_EVOLUTION',
        priority: Number(body.priority) || 2,
        source: `universal-hub:${source}`,
        projectId,
        targetFiles: Array.isArray(body.targetFiles) ? body.targetFiles : [],
      });
    }
  } catch (_) {}

  let submittedJob = null;
  try {
    if (app?.jobs && typeof app.jobs.submit === 'function') {
      submittedJob = await app.jobs.submit(tenantId, actorId, {
        type,
        source,
        projectId,
        missionId: queuedMission?.id || body.missionId || null,
        agentId: worldDispatch?.agent?.id || body.agentId || null,
        payload: {
          ...(body.payload || {}),
          prompt: rawPrompt,
          projectId,
          action: body.action || slashCommand,
          command: slashCommand,
          source,
          agentId: worldDispatch?.agent?.id || null,
          missionId: queuedMission?.id || null,
        },
      });
    }
  } catch (_) {}

  const entryId = submittedJob?.id || `ujob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    id: entryId,
    jobId: entryId,
    missionId: queuedMission?.id || body.missionId || `ms-${entryId}`,
    projectId,
    companyName: worldDispatch?.companyName || projectId,
    agentId: worldDispatch?.agent?.id || body.agentId || 'agent-core-arch',
    agentName: worldDispatch?.agent?.name || worldDispatch?.agent?.displayName || 'Executor Autônomo',
    source,
    ide: source,
    type,
    command: slashCommand,
    action: body.action || slashCommand,
    title: rawPrompt.slice(0, 140),
    prompt: rawPrompt,
    status: submittedJob?.status || 'RUNNING',
    createdAt: submittedJob?.createdAt || timestamp,
    updatedAt: timestamp,
    tenantId,
    actorId,
  };

  const feed = loadUniversalIdeJobs();
  feed.unshift(entry);
  saveUniversalIdeJobs(feed);

  try {
    globalBus.emit('universal.job.ingested', entry);
  } catch (_) {}

  return {
    ok: true,
    ingested: true,
    jobId: entry.jobId,
    missionId: entry.missionId,
    projectId: entry.projectId,
    agentId: entry.agentId,
    agentName: entry.agentName,
    command: entry.command,
    source: entry.source,
    status: entry.status,
    createdAt: entry.createdAt,
    entry,
    worldDispatch: worldDispatch ? {
      companyId: worldDispatch.companyId,
      companyName: worldDispatch.companyName,
      agentId: worldDispatch.agent?.id || null,
      agentName: worldDispatch.agent?.name || null,
      task: worldDispatch.task,
      activeAgentsCount: worldDispatch.activeAgentsCount,
      totalAgentsCount: worldDispatch.totalAgentsCount,
      ratioLabel: `${worldDispatch.activeAgentsCount} / ${worldDispatch.totalAgentsCount}`,
    } : null,
  };
}

async function getUniversalIdeJobFeed(app = null, identity = {}) {
  const tenantId = identity.tenantId || 'grg';
  const actorId = identity.actorId || 'grg-admin';
  const feed = loadUniversalIdeJobs();
  let runtimeJobs = [];
  try {
    if (app?.jobs && typeof app.jobs.list === 'function') {
      runtimeJobs = await app.jobs.list(tenantId, actorId);
    }
  } catch (_) {}

  let autonomousMissions = [];
  try {
    if (app?.autonomousLoop?.missionQueue && typeof app.autonomousLoop.missionQueue.getAll === 'function') {
      autonomousMissions = app.autonomousLoop.missionQueue.getAll();
    }
  } catch (_) {}

  let worldAgents = { active: 0, total: 0, ratioLabel: '0 / 0' };
  try {
    const worldEngine = getWorldStateEngine();
    if (worldEngine && worldEngine.agents) {
      const all = Object.values(worldEngine.agents);
      const activeSet = new Set(['working', 'running', 'moving', 'walking', 'thinking', 'talking', 'active']);
      const active = all.filter((a) =>
        activeSet.has(String(a.state || '').toLowerCase()) || activeSet.has(String(a.status || '').toLowerCase())
      ).length;
      worldAgents = {
        active,
        total: all.length,
        ratioLabel: `${active} / ${all.length}`,
      };
    }
  } catch (_) {}

  return {
    ok: true,
    totalIngested: feed.length,
    runtimeJobsCount: runtimeJobs.length,
    autonomousMissionsCount: autonomousMissions.length,
    agentsSummary: worldAgents,
    supportedWorkflows: [
      '/fenix-global-engineering',
      '/goal',
      '/browser',
      '/plan',
      '/learn',
      '/boost',
      '/teamwork-preview',
      '/automation',
      '/grill-me',
    ],
    supportedIdes: [
      'Claude Code',
      'Antigravity',
      'Gemini CLI',
      'OpenAI Codex',
      'OpenCode',
      'Cursor',
      'Fênix Visual IDE',
      'project-decision-funnel',
      'mascot-chat',
    ],
    items: feed.slice(0, 60),
    autonomousMissions: autonomousMissions.slice(0, 30),
  };
}

function presentJob(job) {
  if (!job) return null;
  return {
    ...job,
    jobId: job.jobId || job.id,
  };
}

async function systemStatus(app, tenantId, actorId) {
  await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
  const [health, state, queue, workers] = await Promise.all([
    app.health.check(),
    app.store.read(),
    app.queues?.status?.('fenix-runtime', 0) || null,
    app.queues?.workersStatus?.('fenix-runtime') || null,
  ]);
  const scoped = (items) => (items || []).filter((item) => item.tenantId === tenantId);
  const countBy = (items, field) => items.reduce((acc, item) => { acc[item[field]] = (acc[item[field]] || 0) + 1; return acc; }, {});
  return {
    checkedAt: health.checkedAt,
    api: { ok: true, status: 'ready' },
    redis: health.checks.redis || { ok: false, configured: false },
    bullmq: queue ? { ok: health.checks.queue?.ok !== false, ...queue } : { ok: false, configured: false },
    postgres: health.checks['state-store'] || { ok: false },
    workers: workers || { queue: 'fenix-runtime', connected: 0, workers: [], configured: false },
    aiProviders: health.checks['ai-providers'] || { ok: false, configured: false },
    aiPlatform: health.checks['ai-providers']?.providers?.aiplatform || { ok: false, configured: false },
    missions: countBy(scoped(state.missions), 'status'),
    runtime: {
      status: health.status,
      jobs: countBy(scoped(state.runtimeJobs), 'status'),
      schedules: scoped(state.runtimeSchedules).filter((item) => item.enabled).length,
      deadLetters: scoped(state.deadLetters).length,
    },
  };
}

async function handleUniversalJobRoutes(req, res, url, app, sendJson, readJson, identity) {
  const { tenantId, actorId } = identity;

  if (['POST', 'GET'].includes(req.method) && url.pathname === '/api/v2/queue/status') {
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
    const jobs = await app.jobs.list(tenantId, actorId);
    const bullmq = app.queues?.status ? await app.queues.status('fenix-runtime', 10) : null;
    const count = (...statuses) => jobs.filter((job) => statuses.includes(String(job.status).toUpperCase())).length;
    sendJson(res, 200, {
      ok: true,
      source: 'JobEngine',
      bullmq,
      queue: {
        total: jobs.length,
        completed: count('COMPLETED', 'SUCCEEDED'),
        running: count('RUNNING'),
        waiting: count('QUEUED', 'WAITING', 'READY', 'RETRYING'),
        failed: count('FAILED', 'DEAD_LETTER'),
        cancelled: count('CANCELLED'),
        paused: count('PAUSED'),
      },
      jobs: jobs.map(presentJob),
    });
    return true;
  }

  const queueControl = url.pathname.match(/^\/api\/v2\/queue\/(pause|resume|clear-completed)$/);
  if (req.method === 'POST' && queueControl) {
    const action = queueControl[1];
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
    if (action === 'clear-completed') {
      sendJson(res, 501, { ok: false, error: 'PERSISTENT_JOB_PURGE_UNSUPPORTED', source: 'JobEngine' });
      return true;
    }
    if (!app.queues || typeof app.queues.queue !== 'function') {
      sendJson(res, 503, { ok: false, error: 'QUEUE_CONTROL_UNAVAILABLE', source: 'JobEngine' });
      return true;
    }
    const queue = app.queues.queue('fenix-runtime');
    await queue[action]();
    sendJson(res, 200, { ok: true, queue: 'fenix-runtime', source: 'BullMQ', status: action === 'pause' ? 'PAUSED' : 'RUNNING' });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v2/jobs') {
    const body = await readJson(req);
    const type = body.type || 'development.execute';
    const payload = { ...(body.payload || {}) };
    if (body.prompt !== undefined) payload.prompt = body.prompt;
    if (body.workspace !== undefined) payload.projectPath = body.workspace;
    const job = await app.jobs.submit(tenantId, actorId, { ...body, type, payload, source: body.source || 'api' });
    sendJson(res, 202, { jobId: job.id, status: job.status, createdAt: job.createdAt });
    return true;
  }

  // Controles operacionais do JobEngine canônico. O roteador legado não
  // intercepta /api/v2/jobs, portanto esses comandos pertencem aqui.
  const controlMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/(pause|resume|cancel|retry)$/);
  if (req.method === 'POST' && controlMatch) {
    const [, jobId, action] = controlMatch;
    const job = await app.jobs[action](tenantId, actorId, jobId);
    sendJson(res, 202, { jobId, status: job.status, job: presentJob(job) });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/v2/jobs/run-batch') {
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:execute');
    const body = await readJson(req);
    const limit = Math.min(10, Math.max(1, Number(body.limit || 3)));
    const workerId = `web-runtime:${actorId}`;
    const jobs = await app.jobs.runBatch(workerId, limit);
    sendJson(res, 200, { workerId, processed: jobs.length, jobs: jobs.map(presentJob) });
    return true;
  }

  const eventsMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/events$/);
  if (req.method === 'GET' && eventsMatch) {
    sendJson(res, 200, { jobId: eventsMatch[1], events: await app.jobs.eventsFor(tenantId, actorId, eventsMatch[1]) });
    return true;
  }

  const cancelMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/cancel$/);
  if (req.method === 'POST' && cancelMatch) {
    sendJson(res, 202, presentJob(await app.jobs.cancel(tenantId, actorId, cancelMatch[1])));
    return true;
  }

  const approveMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    sendJson(res, 202, presentJob(await app.jobs.approve(tenantId, actorId, approveMatch[1])));
    return true;
  }

  const rejectMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/reject$/);
  if (req.method === 'POST' && rejectMatch) {
    const body = await readJson(req);
    sendJson(res, 200, presentJob(await app.jobs.reject(tenantId, actorId, rejectMatch[1], body.reason)));
    return true;
  }

  const rollbackMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/rollback$/);
  if (req.method === 'POST' && rollbackMatch) {
    sendJson(res, 202, presentJob(await app.jobs.rollbackJob(tenantId, actorId, rollbackMatch[1], (job) => app.devPipeline.rollback(job))));
    return true;
  }

  const diffMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/diff$/);
  if (req.method === 'GET' && diffMatch) {
    const job = await app.jobs.get(tenantId, actorId, diffMatch[1]);
    sendJson(res, 200, { jobId: job.id, ...(await app.devPipeline.diff(job)) });
    return true;
  }

  const getMatch = url.pathname.match(/^\/api\/v2\/jobs\/([^/]+)$/);
  if (req.method === 'GET' && getMatch) {
    sendJson(res, 200, presentJob(await app.jobs.get(tenantId, actorId, getMatch[1])));
    return true;
  }

  if (req.method === 'GET' && ['/api/jobs', '/api/v2/jobs', '/api/v2/queue', '/api/v2/public/queue'].includes(url.pathname)) {
    const persisted = await app.jobs.list(tenantId, actorId, url.searchParams.get('status') || undefined);
    const bullmq = app.queues?.status ? await app.queues.status('fenix-runtime') : null;
    const count = (...statuses) => persisted.filter(job => statuses.includes(String(job.status).toUpperCase())).length;
    const limitParam = Number.parseInt(url.searchParams.get('limit') || '100', 10);
    const maxJobs = url.searchParams.get('full') === 'true' ? persisted.length : Math.max(10, Math.min(500, Number.isFinite(limitParam) ? limitParam : 100));
    const boundedJobs = persisted.length > maxJobs ? persisted.slice(0, maxJobs) : persisted;
    sendJson(res, 200, {
      ok: true,
      source: 'JobEngine',
      jobs: boundedJobs.map(presentJob),
      bullmq,
      queue: {
        total: persisted.length,
        completed: count('COMPLETED', 'SUCCEEDED'),
        running: count('RUNNING'),
        waiting: count('QUEUED', 'WAITING', 'READY', 'RETRYING'),
        failed: count('FAILED', 'DEAD_LETTER'),
        cancelled: count('CANCELLED'),
        paused: count('PAUSED')
      }
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/workers') {
    const persisted = await app.jobs.workers(tenantId, actorId);
    const queueStatus = app.queues?.workersStatus ? await app.queues.workersStatus('fenix-runtime') : null;
    const connectedIds = new Set((queueStatus?.workers || []).map((worker) => worker.workerId).filter(Boolean));
    const localCutoff = Date.now() - 30_000;
    const currentLocalPid = `fenix-local:${process.pid}`;
    const canonical = persisted.map((worker) => {
      const isCurrentLocal = worker.workerId === currentLocalPid
        || (String(worker.workerId || '').startsWith('fenix-local:')
          && Date.parse(worker.lastSeenAt || worker.lastHeartbeat || '') >= localCutoff);
      return {
        ...worker,
        status: queueStatus
          ? (isCurrentLocal || (connectedIds.has(worker.workerId) && worker.status === 'ONLINE') ? 'ONLINE' : 'OFFLINE')
          : (isCurrentLocal ? 'ONLINE' : worker.status),
      };
    });
    if (!canonical.some((w) => w.workerId === currentLocalPid)) {
      canonical.unshift({
        workerId: currentLocalPid,
        queue: queueStatus ? 'fenix-runtime' : null,
        status: 'ONLINE',
        currentJob: null,
        processed: 0,
        lastSeenAt: new Date().toISOString()
      });
    }
    for (const remote of queueStatus?.workers || []) {
      if (!canonical.some((worker) => worker.workerId === remote.workerId)) canonical.push(remote);
    }
    sendJson(res, 200, {
      queue: 'fenix-runtime',
      configured: Boolean(queueStatus),
      connected: queueStatus?.connected || canonical.filter((w) => w.status === 'ONLINE').length,
      workers: canonical
    });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v2/system/status') {
    sendJson(res, 200, await systemStatus(app, tenantId, actorId));
    return true;
  }

  if (req.method === 'POST' && (url.pathname === '/api/v2/universal-jobs/ingest' || url.pathname === '/api/v2/universal-jobs')) {
    if (app?.controlPlane?.authorize) {
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
    }
    const body = await readJson(req).catch(() => ({}));
    const result = await ingestUniversalIdeJob(body, app, { tenantId, actorId });
    sendJson(res, 201, result);
    return true;
  }

  if (req.method === 'GET' && (url.pathname === '/api/v2/universal-jobs/feed' || url.pathname === '/api/v2/universal-jobs')) {
    if (app?.controlPlane?.authorize) {
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
    }
    const feed = await getUniversalIdeJobFeed(app, { tenantId, actorId });
    sendJson(res, 200, feed);
    return true;
  }

  return false;
}

module.exports = {
  handleUniversalJobRoutes,
  presentJob,
  systemStatus,
  ingestUniversalIdeJob,
  getUniversalIdeJobFeed,
  loadUniversalIdeJobs,
};
