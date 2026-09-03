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
    app.queues?.status?.('fenix-runtime') || null,
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

  if (req.method === 'GET' && (url.pathname === '/api/jobs' || url.pathname === '/api/v2/jobs')) {
    const persisted = await app.jobs.list(tenantId, actorId, url.searchParams.get('status') || undefined);
    const bullmq = app.queues?.status ? await app.queues.status('fenix-runtime') : null;
    sendJson(res, 200, { jobs: persisted.map(presentJob), bullmq });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/workers') {
    const persisted = await app.jobs.workers(tenantId, actorId);
    const queueStatus = app.queues?.workersStatus ? await app.queues.workersStatus('fenix-runtime') : null;
    const connectedIds = new Set((queueStatus?.workers || []).map((worker) => worker.workerId).filter(Boolean));
    const localCutoff = Date.now() - 30_000;
    const canonical = persisted.map((worker) => ({
      ...worker,
      // The built-in worker consumes the canonical JobEngine directly and is
      // intentionally not a BullMQ client. Keep its fresh heartbeat ONLINE;
      // otherwise the Runtime screen falsely reports the live process offline
      // whenever the optional Redis/BullMQ queue is configured.
      status: queueStatus
        ? ((String(worker.workerId || '').startsWith('fenix-local:')
          && Date.parse(worker.lastSeenAt || worker.lastHeartbeat || '') >= localCutoff)
          || (connectedIds.has(worker.workerId) && worker.status === 'ONLINE') ? 'ONLINE' : 'OFFLINE')
        : worker.status,
    }));
    for (const remote of queueStatus?.workers || []) {
      if (!canonical.some((worker) => worker.workerId === remote.workerId)) canonical.push(remote);
    }
    sendJson(res, 200, { queue: 'fenix-runtime', configured: Boolean(queueStatus), connected: queueStatus?.connected || 0, workers: canonical });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/v2/system/status') {
    sendJson(res, 200, await systemStatus(app, tenantId, actorId));
    return true;
  }

  return false;
}

module.exports = { handleUniversalJobRoutes, presentJob, systemStatus };
