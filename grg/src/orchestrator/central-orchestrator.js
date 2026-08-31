'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { ValidationError } = require('../kernel/errors');
const { scanProject } = require('../project-mirror/scanner');
const { OrchestrationRepository } = require('./orchestration-repository');

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);
const TERMINAL_JOBS = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER', 'ROLLED_BACK']);

class CentralOrchestrator {
  constructor({ eventBus, store, jobs, devPipeline, knowledgeEngine = null, workspaceRoot = process.cwd(), maxRepairAttempts = 3, projectScanner = scanProject, jobPollMs = 250, jobWaitMs = 310_000 }) {
    if (!jobs?.submit || !jobs?.run) throw new Error('central orchestrator requires JobEngine');
    if (!devPipeline?.rollback) throw new Error('central orchestrator requires SafeDevPipeline');
    this.bus = eventBus;
    this.jobs = jobs;
    this.devPipeline = devPipeline;
    this.knowledgeEngine = knowledgeEngine;
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.maxRepairAttempts = Math.max(1, Math.min(5, Number(maxRepairAttempts || 3)));
    this.projectScanner = projectScanner;
    this.jobPollMs = Math.max(10, Number(jobPollMs || 250));
    this.jobWaitMs = Math.max(1_000, Number(jobWaitMs || 310_000));
    this.repository = new OrchestrationRepository(store);
    this.inFlight = new Map();
  }

  async ingestRequest(input = {}, identity = {}) {
    const userIntent = String(input.userIntent || '').trim();
    if (!userIntent) throw new ValidationError('orchestration request requires userIntent');
    const tenantId = String(identity.tenantId || input.tenantId || '').trim();
    const actorId = String(identity.actorId || input.actorId || '').trim();
    if (!tenantId || !actorId) throw new ValidationError('orchestration request requires tenantId and actorId');

    const requestId = crypto.randomUUID();
    const project = normalizeProject(input.project, this.workspaceRoot);
    const request = {
      id: requestId, tenantId, actorId, source: String(input.source || 'api'), userIntent,
      project, currentContext: input.currentContext || {}, constraints: normalizeConstraints(input.constraints),
      gates: Array.isArray(input.gates) ? input.gates : null,
      status: 'RECEIVED', missionId: null, createdAt: now(), updatedAt: now(),
    };
    await this.repository.createRequest(request);
    await this.#event('orchestrator', 'request.received', request, null, { userIntent, project: project.path });

    const work = this.#processRequest(requestId, tenantId).catch(async (error) => {
      await this.repository.updateRequest(requestId, { status: 'FAILED', error: errorInfo(error) }).catch(() => {});
      await this.#event('orchestrator', 'request.failed', request, null, { error: error.message }).catch(() => {});
    }).finally(() => this.inFlight.delete(requestId));
    this.inFlight.set(requestId, work);
    return request;
  }

  async waitForRequest(requestId) {
    if (this.inFlight.has(requestId)) await this.inFlight.get(requestId);
  }

  async #processRequest(requestId, tenantId) {
    let request = await this.repository.getRequest(tenantId, requestId);
    if (!request || request.status === 'CANCELLED') return;
    request = await this.repository.updateRequest(requestId, { status: 'ANALYZING' });
    await this.#event('orchestrator', 'request.analyzed', request, null, { status: 'ANALYZING' });

    const analysis = await this.#analyze(request);
    const missionId = crypto.randomUUID();
    const mission = {
      id: missionId, tenantId, actorId: request.actorId, requestId, objective: request.userIntent,
      specification: analysis.specification, project: request.project, agent: 'CODEX',
      tasks: buildTasks(), status: 'QUEUED', attempt: 0, maxAttempts: this.maxRepairAttempts,
      jobIds: [], activeJobId: null, result: null, validation: null, rollback: null,
      createdAt: now(), updatedAt: now(),
    };
    await this.repository.createMission(mission);
    await this.repository.updateRequest(requestId, { status: 'ASSIGNED', missionId });
    await this.#event('orchestrator', 'mission.created', request, mission, { agent: mission.agent, tasks: mission.tasks.length });
    await this.#executeMission(missionId, tenantId);
  }

  async #analyze(request) {
    let snapshot;
    try {
      const scan = await this.projectScanner(request.project.path);
      snapshot = { files: scan.files?.total || 0, stack: scan.stack || [], screens: scan.screens?.length || 0 };
    } catch (error) {
      snapshot = { error: error.message };
    }
    const specification = [
      'FENIX CENTRAL ORCHESTRATION SPECIFICATION',
      `Objective: ${request.userIntent}`,
      `Project: ${request.project.path}`,
      `Measured project snapshot: ${JSON.stringify(snapshot)}`,
      `Current context: ${JSON.stringify(request.currentContext)}`,
      `Constraints: ${request.constraints.join('; ') || 'minimal cumulative change'}`,
      'Required execution: generate a minimal patch in an isolated git worktree, run at least one real gate, retain the diff as evidence, and never claim success from health alone.',
      'If a gate fails, use the failure output as repair context and generate a corrected patch in a new isolated attempt.',
    ].join('\n');
    await this.#event('orchestrator', 'specification.generated', request, null, { snapshot });
    return { specification, snapshot };
  }

  async #executeMission(missionId, tenantId) {
    let mission = await this.repository.getMission(tenantId, missionId);
    if (!mission || TERMINAL.has(mission.status)) return mission;

    while (mission.attempt < mission.maxAttempts && !TERMINAL.has(mission.status)) {
      mission = await this.repository.getMission(tenantId, missionId);
      if (!mission || TERMINAL.has(mission.status)) return mission;
      const cancelledBeforeAttempt = await this.#abortIfRequestCancelled(mission);
      if (cancelledBeforeAttempt) return cancelledBeforeAttempt;
      const attempt = mission.attempt + 1;
      mission = await this.repository.updateMission(missionId, {
        status: attempt === 1 ? 'EXECUTING' : 'REPAIRING', attempt,
        tasks: setTaskStates(mission.tasks, { generate: 'RUNNING', 'apply-isolated': 'RUNNING' }),
      });
      const cancelledAfterTransition = await this.#abortIfRequestCancelled(mission);
      if (cancelledAfterTransition) return cancelledAfterTransition;
      await this.#event('orchestrator', attempt === 1 ? 'mission.executing' : 'repair.started', null, mission, { attempt });

      const repairContext = mission.validation?.failureReason
        ? `\n\nREPAIR CONTEXT FROM ATTEMPT ${attempt - 1}:\n${mission.validation.failureReason}`
        : '';
      const request = await this.repository.getRequest(tenantId, mission.requestId);
      const sourceHints = extractSourceHints(request);
      const job = await this.jobs.submit(mission.tenantId, mission.actorId, {
        type: 'development.execute', source: 'system', prompt: mission.specification + repairContext,
        workspace: mission.project.path, riskLevel: 'MEDIUM', maxAttempts: 1,
        policy: { allowRollback: true, requireApproval: false, allowedPaths: sourceHints },
        payload: {
          projectPath: mission.project.path,
          gates: request?.gates || undefined,
          context: mergeContextHints(request?.currentContext, sourceHints),
        },
        context: { orchestrationRequestId: mission.requestId, orchestrationMissionId: mission.id },
      });
      mission = await this.repository.updateMission(missionId, { activeJobId: job.id, jobIds: [...mission.jobIds, job.id] });
      await this.#event('orchestrator', 'job.submitted', null, mission, { jobId: job.id, attempt });

      const cancelledAfterSubmit = await this.#abortIfRequestCancelled(mission);
      if (cancelledAfterSubmit) {
        await this.jobs.cancel(mission.tenantId, mission.actorId, job.id).catch(() => {});
        return cancelledAfterSubmit;
      }

      const completedJob = await this.#runOrAwaitJob(mission, job);
      const latestMission = await this.repository.getMission(tenantId, missionId);
      const cancelledAfterRun = await this.#abortIfRequestCancelled(latestMission);
      if (cancelledAfterRun || latestMission?.status === 'CANCELLED') {
        const rollback = await this.#rollback(completedJob, latestMission);
        await this.repository.updateMission(missionId, { rollback, activeJobId: null });
        await this.#event('orchestrator', 'mission.cancelled', null, latestMission, { jobId: job.id, rollback });
        return cancelledAfterRun || latestMission;
      }
      const validation = validateJobEvidence(completedJob);
      await this.#event('orchestrator', 'validation.completed', null, mission, { jobId: job.id, ...validation });

      if (validation.passed) {
        const result = summarizeJob(completedJob);
        mission = await this.repository.updateMission(missionId, {
          status: 'COMPLETED', validation, result, activeJobId: null, completedAt: now(),
          tasks: mission.tasks.map((task) => ({ ...task, status: 'COMPLETED' })),
        });
        await this.repository.updateRequest(mission.requestId, { status: 'COMPLETED', completedAt: now() });
        await this.#event('orchestrator', 'mission.completed', null, mission, { jobId: job.id, validation });
        await this.#recordLearning(mission, completedJob, true);
        return mission;
      }

      const rollback = await this.#rollback(completedJob, mission);
      mission = await this.repository.updateMission(missionId, {
        validation, rollback, activeJobId: null,
        tasks: setTaskStates(mission.tasks, { generate: 'FAILED', 'apply-isolated': 'FAILED', test: 'FAILED', validate: 'FAILED' }),
      });
      await this.#event('orchestrator', 'validation.failed', null, mission, { jobId: job.id, reason: validation.failureReason, rollback });
      if (attempt >= mission.maxAttempts) {
        mission = await this.repository.updateMission(missionId, { status: 'FAILED', completedAt: now() });
        await this.repository.updateRequest(mission.requestId, { status: 'FAILED', error: { message: validation.failureReason }, completedAt: now() });
        await this.#event('orchestrator', 'mission.failed', null, mission, { reason: validation.failureReason });
        await this.#recordLearning(mission, completedJob, false);
        return mission;
      }
    }
    return mission;
  }

  async #abortIfRequestCancelled(mission) {
    if (!mission) return null;
    const request = await this.repository.getRequest(mission.tenantId, mission.requestId);
    if (request?.status !== 'CANCELLED') return null;
    if (mission.activeJobId && typeof this.jobs.cancel === 'function') {
      await this.jobs.cancel(mission.tenantId, mission.actorId, mission.activeJobId).catch(() => {});
    }
    return this.repository.updateMission(mission.id, {
      status: 'CANCELLED', activeJobId: null, completedAt: request.completedAt || now(),
    });
  }

  async #runOrAwaitJob(mission, job) {
    // In production submit() also publishes to BullMQ. The worker may claim the
    // job before this process does; run() then returns null by design. Await the
    // canonical JobEngine record instead of treating that healthy race as a
    // failed execution and launching a duplicate repair attempt.
    const direct = await this.jobs.run(mission.tenantId, job.id, `fenix-orchestrator:${mission.id}`);
    if (direct) return direct;
    const deadline = Date.now() + Math.max(this.jobWaitMs, Number(job.limits?.timeoutMs || 0) + 10_000);
    let current = null;
    while (Date.now() < deadline) {
      current = typeof this.jobs.getInternal === 'function'
        ? await this.jobs.getInternal(mission.tenantId, job.id)
        : await this.jobs.get(mission.tenantId, mission.actorId, job.id);
      if (current && TERMINAL_JOBS.has(current.status)) return current;
      await new Promise((resolve) => setTimeout(resolve, this.jobPollMs));
    }
    throw new Error(`timed out awaiting canonical job ${job.id}; last status=${current?.status || 'unknown'}`);
  }

  async #rollback(job, mission) {
    if (!job || !Array.isArray(job.artifacts) || !job.artifacts.some((item) => item.type === 'worktree')) return { status: 'NOT_REQUIRED', reason: 'attempt created no worktree' };
    try {
      const rolledBack = await this.jobs.rollbackJob(mission.tenantId, mission.actorId, job.id, (record) => this.devPipeline.rollback(record));
      return rolledBack.rollback || { status: 'COMPLETED' };
    } catch (error) {
      return { status: 'FAILED', error: errorInfo(error) };
    }
  }

  async #recordLearning(mission, job, success) {
    const payload = {
      mission: { id: mission.id, tenantId: mission.tenantId, actorId: mission.actorId, name: mission.objective, domain: 'CentralOrchestrator', success,
        filesChanged: job?.validation?.changedFiles?.length || 0, retries: Math.max(0, mission.attempt - 1),
        testStatus: success ? 'PASS' : 'FAIL', error: success ? null : mission.validation?.failureReason },
    };
    if (this.knowledgeEngine?.episodicMemory) await this.knowledgeEngine.episodicMemory.recordEpisode(mission.id, payload.mission).catch(() => {});
    if (this.bus?.emit) await this.bus.emit(success ? 'MissionCompleted' : 'MissionFailed', payload).catch(() => {});
    await this.#event('orchestrator', 'memory.recorded', null, mission, { success });
  }

  async submitResult(tenantId, missionId, resultPayload = {}) {
    const mission = await this.repository.getMission(tenantId, missionId);
    if (!mission) throw new ValidationError('mission not found');
    const validation = validateExternalEvidence(resultPayload);
    const status = validation.passed ? 'COMPLETED' : 'FAILED';
    const updated = await this.repository.updateMission(missionId, { status, result: resultPayload, validation, completedAt: now() });
    await this.repository.updateRequest(mission.requestId, { status, completedAt: now() });
    await this.#event('api', validation.passed ? 'mission.completed' : 'validation.failed', null, updated, validation);
    return updated;
  }

  async cancelRequest(tenantId, requestId) {
    const request = await this.repository.getRequest(tenantId, requestId);
    if (!request) return null;
    const updated = await this.repository.updateRequest(requestId, { status: 'CANCELLED', completedAt: now() });
    if (request.missionId) {
      const mission = await this.repository.getMission(tenantId, request.missionId);
      if (mission?.activeJobId && typeof this.jobs.cancel === 'function') {
        await this.jobs.cancel(tenantId, request.actorId, mission.activeJobId).catch(() => {});
      }
      await this.repository.updateMission(request.missionId, { status: 'CANCELLED', completedAt: now() });
    }
    await this.#event('api', 'request.cancelled', updated, request.missionId ? { id: request.missionId } : null, {});
    return updated;
  }

  getRequest(tenantId, id) { return this.repository.getRequest(tenantId, id); }
  getMission(tenantId, id) { return this.repository.getMission(tenantId, id); }
  listRequests(tenantId) { return this.repository.listRequests(tenantId); }
  listMissions(tenantId) { return this.repository.listMissions(tenantId); }
  getEvents(tenantId, requestId = null) { return this.repository.listEvents(tenantId, requestId); }

  async #event(source, type, request, mission, payload) {
    const event = { id: crypto.randomUUID(), tenantId: request?.tenantId || mission?.tenantId,
      occurredAt: now(), source, type, requestId: request?.id || mission?.requestId || null,
      missionId: mission?.id || null, payload: payload || {} };
    await this.repository.appendEvent(event);
    if (this.bus?.emit) await this.bus.emit(`orchestration:${type}`, event).catch(() => {});
    return event;
  }
}

function normalizeProject(project, workspaceRoot) {
  const candidate = typeof project === 'string' ? project : project?.path;
  const resolved = path.resolve(candidate || workspaceRoot);
  return { id: typeof project === 'object' && project?.id ? String(project.id) : path.basename(resolved), path: resolved };
}

function normalizeConstraints(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 30);
  return value ? [String(value)] : [];
}

function extractSourceHints(request = {}) {
  const candidates = [request.userIntent, ...(request.constraints || [])];
  const found = [];
  const pattern = /(?:^|[\s`'"(])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+\.(?:js|cjs|mjs|ts|tsx|jsx|json|css|html|py|go|rs|java|md))(?:$|[\s`'"),:;])/gi;
  for (const text of candidates) {
    for (const match of String(text || '').matchAll(pattern)) found.push(match[1].replace(/^\.\//, ''));
  }
  return [...new Set(found)].slice(0, 20);
}

function mergeContextHints(currentContext, sourceHints) {
  const context = currentContext && typeof currentContext === 'object' ? structuredClone(currentContext) : {};
  const existing = Array.isArray(context.sourceFiles) ? context.sourceFiles.map(String) : [];
  context.sourceFiles = [...new Set([...existing, ...sourceHints])];
  context.allowedPaths = [...new Set([...(Array.isArray(context.allowedPaths) ? context.allowedPaths.map(String) : []), ...sourceHints])];
  return context;
}

function buildTasks() {
  return [
    { id: 'analyze', owner: 'FENIX', status: 'COMPLETED' },
    { id: 'specify', owner: 'FENIX', status: 'COMPLETED' },
    { id: 'generate', owner: 'CODEX', status: 'QUEUED' },
    { id: 'apply-isolated', owner: 'CODEX', status: 'QUEUED' },
    { id: 'test', owner: 'FENIX', status: 'QUEUED' },
    { id: 'validate', owner: 'FENIX', status: 'QUEUED' },
    { id: 'learn', owner: 'FENIX', status: 'QUEUED' },
  ];
}

function setTaskStates(tasks, states) {
  return tasks.map((task) => states[task.id] ? { ...task, status: states[task.id] } : task);
}

function validateJobEvidence(job) {
  if (!job) return { passed: false, failureReason: 'JobEngine did not return an execution record' };
  const tests = Array.isArray(job.tests) ? job.tests : [];
  const failed = tests.filter((item) => item.status !== 'PASS');
  const changedFiles = Array.isArray(job.validation?.changedFiles) ? job.validation.changedFiles : [];
  const passed = job.status === 'SUCCEEDED' && job.validation?.passed === true && tests.length > 0 && failed.length === 0 && changedFiles.length > 0;
  return { passed, jobStatus: job.status, gatesRun: tests.length, failedGates: failed.map((item) => item.name), changedFiles,
    failureReason: passed ? null : `behavioral evidence incomplete: status=${job.status}, validation=${job.validation?.passed === true}, gates=${tests.length}, failed=${failed.map((item) => item.name).join(',') || 'none'}, changedFiles=${changedFiles.length}` };
}

function validateExternalEvidence(payload) {
  const tests = Array.isArray(payload.tests) ? payload.tests : [];
  const changedFiles = Array.isArray(payload.changedFiles) ? payload.changedFiles : [];
  const failed = tests.filter((item) => item.status !== 'PASS');
  const passed = changedFiles.length > 0 && tests.length > 0 && failed.length === 0 && payload.validation?.passed === true;
  return { passed, gatesRun: tests.length, failedGates: failed.map((item) => item.name), changedFiles,
    failureReason: passed ? null : 'external result requires changedFiles, passing tests, and validation.passed=true' };
}

function summarizeJob(job) {
  return { jobId: job.id, status: job.status, artifacts: job.artifacts || [], tests: job.tests || [], validation: job.validation, result: job.result || null };
}

function errorInfo(error) { return { name: error?.name || 'Error', message: String(error?.message || error).slice(0, 2000) }; }
function now() { return new Date().toISOString(); }

module.exports = { CentralOrchestrator, validateJobEvidence, validateExternalEvidence, buildTasks };
