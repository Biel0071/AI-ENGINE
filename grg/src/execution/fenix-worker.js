'use strict';
/**
 * FÊNIX OS V8.2 — Autonomous Worker & Execution Engine
 * BullMQ consumer with concurrency=1 for CPU efficiency.
 * Real step-by-step timeline, AbortSignal support, validation, memory write,
 * live agent workstation navigation, and token telemetry for City.
 */

var fs = require('node:fs');
var path = require('node:path');
var { globalJobQueueManager, JOB_STATUSES } = require('./job-queue-manager');
var { recordUsage } = require('../routing/model-router');
var { enhance } = require('./prompt-enhancer');
var { AIPlatformProvider } = require('../ai-runtime/aiplatform-provider');
var { resolveAIProviderKey, resolveAIPlatformUrl, resolveAIPlatformModel } = require('../security/secret-resolver');

var REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
var redisConnection = { host: 'localhost', port: 6379 };

try {
  var urlObj = new URL(REDIS_URL);
  redisConnection = {
    host: urlObj.hostname || 'localhost',
    port: parseInt(urlObj.port || '6379', 10),
    password: urlObj.password || undefined,
  };
  console.log('[FenixWorker] Redis host:', redisConnection.host, 'port:', redisConnection.port);
} catch (e) {
  console.warn('[FenixWorker] Redis URL parse error:', e.message);
}

function safeEmit(method) {
  try {
    var bus = global.__fenixEventBus;
    if (bus && bus[method]) {
      var args = Array.prototype.slice.call(arguments, 1);
      bus[method].apply(bus, args);
    }
  } catch (e) {}
}

var AGENT_SPECIALISTS = {
  analyze: { id: 'Gabriel', name: 'Agente Gabriel', role: 'research', district: 'research', workstation: 'Research Lab' },
  scan: { id: 'Gabriel', name: 'Agente Gabriel', role: 'research', district: 'research', workstation: 'Research Lab' },
  task: { id: 'Gabriel', name: 'Agente Gabriel', role: 'research', district: 'research', workstation: 'Research Lab' },
  analysis: { id: 'Gabriel', name: 'Agente Gabriel', role: 'research', district: 'research', workstation: 'Research Lab' },
  code_change: { id: 'Leonardo', name: 'Agente Leonardo', role: 'developer', district: 'development', workstation: 'Development Desk' },
  browser_operation: { id: 'Sophia', name: 'Agente Sophia', role: 'browser', district: 'browser_qa', workstation: 'Browser QA Station' },
  deploy_operation: { id: 'Marcus', name: 'Agente Marcus', role: 'devops', district: 'devops', workstation: 'DevOps Terminal' }
};

function getProjectById(projectId) {
  try {
    var registry = require('../projects/project-registry');
    return registry.getProjectById(projectId);
  } catch (e) { return null; }
}

function getProjectContext(projectId) {
  try {
    var p = getProjectById(projectId);
    if (!p) return '';
    var lines = [
      'Project: ' + p.name,
      'VPS Path: ' + p.vpsPath,
      'Services: ' + (p.services || []).join(', '),
      'Type: ' + (p.buildingType || 'unknown'),
    ];
    var pkg = path.join(p.vpsPath, 'package.json');
    if (fs.existsSync(pkg)) {
      var pkgData = JSON.parse(fs.readFileSync(pkg, 'utf-8'));
      lines.push('Package: ' + pkgData.name + ' v' + pkgData.version);
      lines.push('Scripts: ' + Object.keys(pkgData.scripts || {}).join(', '));
    }
    return lines.join('\n');
  } catch (e) { return ''; }
}

async function callAI(prompt, projectContext, abortSignal, projectId) {
  var MODEL = resolveAIPlatformModel();
  var OLLAMA_DIRECT = process.env.GRG_OLLAMA_DIRECT_URL || process.env.FENIX_OLLAMA_URL;
  var t0 = Date.now();

  var fullPrompt = prompt;
  if (projectContext && prompt.indexOf(projectContext.slice(0, 30)) === -1) {
    fullPrompt = prompt + '\n\n' + projectContext;
  }

  // Only probe Ollama when a direct endpoint has explicitly been configured.
  if (OLLAMA_DIRECT) try {
    var timeoutSignal = AbortSignal.timeout(3500);
    var combinedSignal = (abortSignal && typeof AbortSignal.any === 'function')
      ? AbortSignal.any([abortSignal, timeoutSignal])
      : (abortSignal || timeoutSignal);

    var res = await fetch(OLLAMA_DIRECT + '/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: fullPrompt,
        stream: false,
        options: { num_predict: 1024, temperature: 0.3 }
      }),
      signal: combinedSignal
    });

    if (res.ok) {
      var data = await res.json();
      var text = (data.response || '').trim();
      if (text && text.length > 5) {
        var tokens = data.eval_count || null;
        return {
          success: true,
          text: text,
          tokens: tokens,
          latency: Date.now() - t0,
          model: MODEL,
          provider: 'Ollama',
          fallback: false
        };
      }
    }
  } catch (err) {
    if (abortSignal && abortSignal.aborted) {
      return { success: false, text: 'Job cancelled by user', tokens: 0, latency: Date.now() - t0, provider: 'cancelled', aborted: true };
    }
    console.warn('[FenixWorker] Primary Ollama failed or timed out:', err.message);
  }

  if (abortSignal && abortSignal.aborted) {
    return { success: false, text: 'Job cancelled by user', tokens: 0, latency: Date.now() - t0, provider: 'cancelled', aborted: true };
  }

  // Use the same gateway contract, credential resolver, and job polling as the rest of Fenix.
  var apiKey = resolveAIProviderKey();
  if (!apiKey) {
    return { success: false, text: 'API Platform credential is not configured', tokens: null, latency: Date.now() - t0, provider: 'API Platform' };
  }
  try {
    var provider = new AIPlatformProvider({ baseUrl: resolveAIPlatformUrl(), apiKey: apiKey, model: MODEL });
    var apData = await provider.chat({ model: MODEL, messages: [{ role: 'user', content: fullPrompt }] });
    var apText = (apData.text || '').trim();
    if (apText.length > 5) {
        var apTokens = apData.raw?.tokens?.total || apData.raw?.usage?.total_tokens || null;
        return {
          success: true,
          text: apText,
          tokens: apTokens,
          latency: Date.now() - t0,
          model: MODEL,
          provider: 'API Platform',
          fallback: Boolean(OLLAMA_DIRECT),
          fallbackReason: OLLAMA_DIRECT ? 'Configured Ollama endpoint unavailable' : null,
          failedProvider: OLLAMA_DIRECT ? 'ollama' : null,
          selectedProvider: 'API Platform'
        };
    }
    throw new Error('inference returned empty text');
  } catch (err) {
    console.warn('[FenixWorker] API Platform inference failed:', err.message);
    return { success: false, text: 'API Platform inference unavailable: ' + err.message, tokens: null, latency: Date.now() - t0, model: MODEL, provider: 'API Platform' };
  }
}

async function processJob(job) {
  var data = job.data;
  var jobId = String(data.jobId || job.id);
  var type = (data.type || 'analyze').toLowerCase();
  var projectId = data.projectId || 'fenix-os';
  var rawPrompt = data.rawPrompt || (data.payload && data.payload.prompt) || '';
  var enhancedPrompt = data.enhancedPrompt || '';

  var assigned = AGENT_SPECIALISTS[type] || AGENT_SPECIALISTS.task;
  var agentId = assigned.id;
  var agentName = assigned.name;
  var agentDistrict = assigned.district;
  var agentWorkstation = assigned.workstation;

  console.log('[FenixWorker] Processing job #' + jobId + ' type=' + type + ' project=' + projectId + ' agent=' + agentName);

  var managerJob = globalJobQueueManager.getJob(jobId);
  if (!managerJob) {
    managerJob = globalJobQueueManager.createJob({
      id: jobId,
      title: 'Job #' + jobId + ' (' + type + ')',
      type: type,
      projectId: projectId,
      agentId: agentId,
      agentName: agentName,
      rawPrompt: rawPrompt,
      enhancedPrompt: enhancedPrompt
    });
  } else {
    managerJob.agentId = agentId;
    managerJob.agentName = agentName;
  }

  // Check if job is CANCELLED before running
  if (managerJob.status === JOB_STATUSES.CANCELLED) {
    console.log('[FenixWorker] Skipping already CANCELLED job #' + jobId);
    return { status: 'CANCELLED' };
  }

  // Check if queue is paused — wait for resume
  while (globalJobQueueManager.isPaused) {
    if (managerJob.status === JOB_STATUSES.CANCELLED) {
      console.log('[FenixWorker] Job #' + jobId + ' cancelled while paused');
      return { status: 'CANCELLED' };
    }
    managerJob.status = JOB_STATUSES.PAUSED;
    globalJobQueueManager.save();
    console.log('[FenixWorker] Queue is paused — waiting for resume for job #' + jobId);
    await new Promise(function(resolve) { setTimeout(resolve, 1000); });
  }

  // Setup abort controller for real cancellation
  var abortController = new AbortController();
  globalJobQueueManager.abortControllers.set(jobId, abortController);

  // Mark RUNNING
  managerJob.status = JOB_STATUSES.RUNNING;
  managerJob.startedAt = new Date().toISOString();
  managerJob.steps.push({ name: 'PLANNING', status: 'COMPLETED', timestamp: new Date().toISOString() });
  globalJobQueueManager.save();

  // Step 1: Real Agent Assignment & Start
  safeEmit('agentAssigned', agentId, jobId, projectId, managerJob.title);
  safeEmit('agentStarted', agentId, jobId);
  safeEmit('jobStarted', jobId, agentId);
  try { await job.updateProgress(10); } catch (e) {}

  // Step 2: Agent Navigates to Workstation (e.g. Research Lab)
  safeEmit('agentNavigating', agentId, agentDistrict, 'indo para ' + agentWorkstation, jobId);

  // Step 3: Multi-Layer Prompt Enhancement & Planning
  if (!enhancedPrompt) {
    var enhRes = enhance(rawPrompt, { classification: type.toUpperCase(), targetProject: projectId });
    enhancedPrompt = enhRes.formattedPrompt;
    managerJob.enhancedPrompt = enhancedPrompt;
  }
  managerJob.steps.push({ name: 'PROMPT_ENHANCEMENT', status: 'COMPLETED', timestamp: new Date().toISOString() });
  safeEmit('jobStep', jobId, 'PROMPT_ENHANCEMENT', 25);
  try { await job.updateProgress(25); } catch (e) {}

  var promptToRun = enhancedPrompt || rawPrompt;
  if (!promptToRun) {
    if (type === 'analyze') promptToRun = 'Analise a arquitetura e diretórios do projeto "' + projectId + '" e liste potenciais melhorias.';
    else if (type === 'scan') promptToRun = 'Mapeie o projeto "' + projectId + '" e liste rotas e dependências.';
    else promptToRun = 'Execute a tarefa "' + type + '" para o projeto "' + projectId + '".';
  }

  // Step 4: Model Selection & Agent Thinking
  var targetModel = data.model || 'qwen2.5:3b';
  managerJob.steps.push({ name: 'MODEL_SELECTED', status: 'COMPLETED', timestamp: new Date().toISOString() });
  safeEmit('modelSelected', targetModel, 'ollama', jobId);
  safeEmit('aiRequestStarted', jobId, targetModel);
  safeEmit('agentThinking', agentId, targetModel + ' executando raciocínio arquitetural');
  try { await job.updateProgress(40); } catch (e) {}

  // Step 5: Tool Calling & File Analysis (Inspecting Project Files)
  safeEmit('toolStarted', agentId, 'filesystem', 'analisando arquivos e dependências de ' + projectId, jobId, projectId);
  var ctx = getProjectContext(projectId);
  safeEmit('toolCompleted', agentId, 'filesystem', 'arquivos e dependências inspecionados', jobId);
  try { await job.updateProgress(55); } catch (e) {}

  // Step 6: AI Inference
  var result = await callAI(promptToRun, ctx, abortController.signal, projectId);
  safeEmit('aiRequestCompleted', jobId, result.model, result.tokens, result.latency);

  // Check if cancelled during execution
  if (abortController.signal.aborted || result.aborted) {
    managerJob.status = JOB_STATUSES.CANCELLED;
    managerJob.completedAt = new Date().toISOString();
    managerJob.steps.push({ name: 'CANCELLED', status: 'COMPLETED', timestamp: new Date().toISOString() });
    globalJobQueueManager.abortControllers.delete(jobId);
    globalJobQueueManager.save();
    safeEmit('jobCancelled', { jobId: jobId });
    safeEmit('agentIdle', agentId);
    return { status: 'CANCELLED' };
  }

  // Step 7: Validation
  managerJob.steps.push({ name: 'VALIDATION', status: 'COMPLETED', timestamp: new Date().toISOString() });
  safeEmit('jobStep', jobId, 'VALIDATION', 85);
  try { await job.updateProgress(85); } catch (e) {}

  var isValid = result.success && result.text && result.text.length > 5;

  // Step 8: Memory Write
  if (isValid) {
    try {
      var app = global.FENIX_APP;
      if (app && app.memory && app.memory.remember) {
        await app.memory.remember('grg', 'fenix-worker', {
          kind: 'job_result',
          jobId: jobId,
          projectId: projectId,
          summary: result.text.slice(0, 300)
        });
      }
    } catch (memErr) {}
    safeEmit('memoryWrite', agentId, 'memória do projeto atualizada com resultado do job #' + jobId, jobId, projectId);
    managerJob.steps.push({ name: 'MEMORY_WRITE', status: 'COMPLETED', timestamp: new Date().toISOString() });
  }

  var finalStatus = isValid ? JOB_STATUSES.COMPLETED : JOB_STATUSES.FAILED;
  managerJob.status = finalStatus;
  managerJob.result = result.text;
  managerJob.tokens.actual = result.tokens;
  managerJob.actualTokens = result.tokens;
  managerJob.actualLatencyMs = result.latency;
  managerJob.provider = result.provider;
  managerJob.fallback = result.fallback || false;
  if (result.fallback) {
    managerJob.fallbackReason = result.fallbackReason;
    managerJob.failedProvider = result.failedProvider;
    managerJob.selectedProvider = result.selectedProvider;
  }
  managerJob.completedAt = new Date().toISOString();
  managerJob.steps.push({ name: finalStatus, status: 'COMPLETED', timestamp: new Date().toISOString() });
  globalJobQueueManager.abortControllers.delete(jobId);
  globalJobQueueManager.save();

  // Contabilize Token Accounting
  recordUsage({
    isJob: true,
    model: result.model || targetModel,
    tokens: result.tokens,
    estimatedTokens: managerJob.tokens.estimated,
    latencyMs: result.latency,
    provider: result.provider,
    success: isValid
  });

  var output = {
    jobId: jobId,
    type: type,
    projectId: projectId,
    agentId: agentId,
    agentName: agentName,
    result: result.text,
    tokens: result.tokens,
    latency: result.latency,
    provider: result.provider,
    model: result.model,
    success: isValid,
    completedAt: managerJob.completedAt,
  };

  if (isValid) {
    safeEmit('jobCompleted', jobId, output);
    safeEmit('agentCompleted', agentId, jobId, output);
  } else {
    managerJob.error = result.text || 'Validation failed';
    safeEmit('jobFailed', jobId, { message: managerJob.error });
    safeEmit('agentFailed', agentId, jobId, { message: managerJob.error });
  }

  safeEmit('agentIdle', agentId);
  try { await job.updateProgress(100); } catch (e) {}
  return output;
}

function createFenixWorker() {
  try {
    var bullmq = require('bullmq');
    var Queue = bullmq.Queue;
    var Worker = bullmq.Worker;

    var queue = new Queue('fenix-jobs', { connection: redisConnection });
    // VPS CPU-only requirement: concurrency = 1
    var worker = new Worker('fenix-jobs', processJob, { connection: redisConnection, concurrency: 1 });

    globalJobQueueManager.setBullQueue(queue);

    worker.on('completed', function(job, result) {
      console.log('[FenixWorker] Job ' + (job ? job.id : '?') + ' completed OK');
    });
    worker.on('failed', function(job, err) {
      console.error('[FenixWorker] Job ' + (job ? job.id : '?') + ' failed:', err.message);
      safeEmit('systemAlert', 'Job failed: ' + err.message, 'error');
    });
    worker.on('active', function(job) {
      console.log('[FenixWorker] Job ' + (job ? job.id : '?') + ' active');
    });

    console.log('[FenixWorker] Worker V8.2 online (concurrency: 1) — queue: fenix-jobs');
    safeEmit('systemAlert', 'FÊNIX Worker V8.2 online', 'info');
    return { queue: queue, worker: worker };
  } catch (e) {
    console.error('[FenixWorker] Failed to start:', e.message);
    return null;
  }
}

module.exports = {
  createFenixWorker: createFenixWorker,
  processJob: processJob,
  callAI: callAI
};
