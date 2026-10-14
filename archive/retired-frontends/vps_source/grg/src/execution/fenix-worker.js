'use strict';
/**
 * FÊNIX OS V8 — Autonomous Worker
 * BullMQ consumer — calls Qwen via API Platform, emits SSE events.
 */

var fs = require('node:fs');
var path = require('node:path');

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

function getProjectById(projectId) {
  try {
    var registry = require('../projects/project-registry');
    return registry.getProjectById(projectId);
  } catch (e) { return null; }
}

async function callAI(prompt, projectContext) {
  var AIPLATFORM_URL = process.env.GRG_AIPLATFORM_URL || 'http://localhost:3001';
  var AIPLATFORM_KEY = process.env.GRG_AIPLATFORM_KEY || '';
  var MODEL = process.env.GRG_AIPLATFORM_MODEL || process.env.FENIX_AI_DEFAULT_MODEL || 'qwen2.5:3b';
  var DEFAULT_PROVIDER = process.env.FENIX_AI_DEFAULT_PROVIDER || 'ollama';
  var fullPrompt = projectContext ? ('PROJECT CONTEXT:\n' + projectContext + '\n\nTASK:\n' + prompt) : prompt;
  var t0 = Date.now();

  var OLLAMA_DIRECT = process.env.GRG_OLLAMA_DIRECT_URL || process.env.FENIX_OLLAMA_URL || 'http://172.20.0.7:11434';
  // Try Ollama first if it's the default provider, then fallback to API Platform
  var endpoints = DEFAULT_PROVIDER === 'ollama'
    ? ['/api/generate', '/api/v1/chat/completions', '/v1/chat/completions']
    : ['/api/v1/chat/completions', '/v1/chat/completions', '/api/generate'];
  for (var i = 0; i < endpoints.length; i++) {
    var ep = endpoints[i];
    try {
      var isOllama = ep === '/api/generate';
      var body = isOllama
        ? JSON.stringify({ model: MODEL, prompt: fullPrompt, stream: false, options: { num_ctx: 512, num_predict: 80, temperature: 0.7 } })
        : JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: fullPrompt }], max_tokens: 1000, stream: false });
      var headers = { 'Content-Type': 'application/json' };
      if (!isOllama && AIPLATFORM_KEY) {
        headers['Authorization'] = 'Bearer ' + AIPLATFORM_KEY;
        headers['x-api-key'] = AIPLATFORM_KEY;
      }
      var baseUrl = isOllama ? OLLAMA_DIRECT : AIPLATFORM_URL;
      var res = await fetch(baseUrl + ep, {
        method: 'POST',
        headers: headers,
        body: body,
        signal: AbortSignal.timeout(isOllama ? 180000 : 15000),
      });
      if (res.ok) {
        var data = await res.json();
        var text = '';
        if (isOllama) {
          text = data.response || '';
        } else {
          text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            || (data.result && data.result.text)
            || data.text || '';
        }
        var tokens = (data.usage && data.usage.total_tokens) || data.eval_count || Math.ceil(fullPrompt.length / 4);
        safeEmit('qwenRequest', MODEL, tokens, Date.now() - t0);
        return { success: true, text: text, tokens: tokens, latency: Date.now() - t0, model: MODEL, provider: isOllama ? 'Ollama' : 'API Platform' };
      }
    } catch (e) {
      console.warn('[FenixWorker] Endpoint ' + ep + ' failed:', e.message);
    }
  }

  return { success: false, text: '[AI provider unavailable — job logged]', tokens: 0, latency: Date.now() - t0, provider: 'none' };
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

async function processJob(job) {
  var data = job.data;
  var type = data.type || 'analyze';
  var projectId = data.projectId || 'fenix-os';
  var payload = data.payload || {};
  var agentId = data.agentId || 'fenix-agent-1';

  console.log('[FenixWorker] Processing job ' + job.id + ' type=' + type + ' project=' + projectId);

  safeEmit('agentAssigned', agentId, job.id, projectId);
  safeEmit('jobStarted', job.id, agentId);

  try { await job.updateProgress(10); } catch (e) {}

  var prompt = '';
  if (type === 'analyze') prompt = 'Analise o projeto "' + projectId + '". ' + (payload.query || 'Forneça uma visão geral da estrutura, arquivos principais e propósito do projeto em Português.');
  else if (type === 'scan') prompt = 'Mapeie o projeto "' + projectId + '". Liste os principais diretórios, arquivos, rotas e serviços em Português.';
  else if (type === 'explain') prompt = 'Explique como "' + projectId + '" funciona. Foque em: ' + (payload.focus || 'arquitetura e fluxos principais') + '.';
  else prompt = payload.prompt || ('Processe o job "' + type + '" para o projeto "' + projectId + '" em Português.');

  safeEmit('agentThinking', agentId, prompt);
  try { await job.updateProgress(30); } catch (e) {}

  var ctx = getProjectContext(projectId);
  var result = await callAI(prompt, ctx);

  try { await job.updateProgress(90); } catch (e) {}

  var output = {
    jobId: job.id,
    type: type,
    projectId: projectId,
    agentId: agentId,
    prompt: prompt.slice(0, 200),
    result: result.text,
    tokens: result.tokens,
    latency: result.latency,
    provider: result.provider,
    model: result.model,
    success: result.success,
    completedAt: new Date().toISOString(),
  };

  if (result.success) {
    safeEmit('agentCompleted', agentId, job.id, output);
    safeEmit('jobCompleted', job.id, output);
  } else {
    safeEmit('agentFailed', agentId, job.id, { message: result.text });
    safeEmit('jobFailed', job.id, { message: result.text });
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
    var worker = new Worker('fenix-jobs', processJob, { connection: redisConnection, concurrency: 2 });

    worker.on('completed', function(job, result) {
      console.log('[FenixWorker] Job ' + job.id + ' completed OK');
    });
    worker.on('failed', function(job, err) {
      console.error('[FenixWorker] Job ' + (job ? job.id : '?') + ' failed:', err.message);
      safeEmit('systemAlert', 'Job failed: ' + err.message, 'error');
    });
    worker.on('active', function(job) {
      console.log('[FenixWorker] Job ' + job.id + ' active type=' + (job.data && job.data.type));
    });

    console.log('[FenixWorker] Worker V8 online — queue: fenix-jobs');
    safeEmit('systemAlert', 'FÊNIX Worker V8 online', 'info');
    return { queue: queue, worker: worker };
  } catch (e) {
    console.error('[FenixWorker] Failed to start:', e.message);
    return null;
  }
}

async function enqueueJob(type, projectId, payload, priority) {
  var bullmq = require('bullmq');
  var Queue = bullmq.Queue;
  var queue = new Queue('fenix-jobs', { connection: redisConnection });
  var job = await queue.add('fenix-job', {
    type: type,
    projectId: projectId,
    payload: payload || {},
    agentId: 'fenix-agent-1',
  }, {
    priority: priority || 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
  safeEmit('jobQueued', { id: job.id, type: type, projectId: projectId, priority: priority || 5 });
  console.log('[FenixWorker] Enqueued job ' + job.id);
  return { jobId: job.id, status: 'QUEUED' };
}

module.exports = { createFenixWorker: createFenixWorker, callAI: callAI, processJob: processJob, enqueueJob: enqueueJob };
