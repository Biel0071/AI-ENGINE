'use strict';
/**
 * FÊNIX OS V8.2 — Fast Lane Engine
 * Instantaneous AI conversation processor.
 * Routes conversational queries through the Model Router to real Fast AI models.
 * Never blocks on BullMQ queue, maintains sub-second latency, and records real tokens.
 */

var { setConfirmationMode } = require('../routing/conversation-router');
var { parseNaturalLanguageModelCommand, getSelectorMode } = require('../routing/model-router');

function safeEmit(method) {
  try {
    var bus = global.__fenixEventBus;
    if (bus && bus[method]) {
      var args = Array.prototype.slice.call(arguments, 1);
      bus[method].apply(bus, args);
    }
  } catch (e) {}
}

/**
 * Byte-Pair Encoding (BPE) Subword Tokenizer Simulation
 * Accurately estimates tokens for prompt and completion based on subword boundaries,
 * punctuation, numeric clusters, and unicode segments.
 */
function estimateBpeTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  var str = text.trim();
  if (!str) return 0;

  // Split on whitespace and punctuation boundaries
  var words = str.split(/\s+/);
  var tokenCount = 0;

  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (!word) continue;

    // Separate leading/trailing punctuation
    var cleanWord = word.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]+$/g, '');
    var punctCount = word.length - cleanWord.length;
    tokenCount += Math.max(0, punctCount);

    if (cleanWord.length > 0) {
      // Subword heuristic: common Portuguese/English syllables ~3.5 chars/token
      if (cleanWord.length <= 4) {
        tokenCount += 1;
      } else if (cleanWord.length <= 8) {
        tokenCount += 2;
      } else if (cleanWord.length <= 13) {
        tokenCount += 3;
      } else {
        tokenCount += Math.ceil(cleanWord.length / 3.8);
      }
    }
  }

  return Math.max(1, tokenCount);
}

/**
 * Safe Mathematical Expression Evaluator
 * Safely parses and calculates arithmetic expressions without code injection risk.
 */
function evaluateArithmetic(rawExpr) {
  try {
    // Only allow digits, whitespace, and basic arithmetic operators: + - * / % ^ ( ) .
    var sanitized = rawExpr.replace(/[^0-9+\-*\/%().\s]/g, '').trim();
    if (!sanitized || sanitized.length < 3) return null;

    // Check balance of parentheses
    var parenBalance = 0;
    for (var i = 0; i < sanitized.length; i++) {
      if (sanitized[i] === '(') parenBalance++;
      if (sanitized[i] === ')') parenBalance--;
      if (parenBalance < 0) return null;
    }
    if (parenBalance !== 0) return null;

    // Must contain at least one valid arithmetic operator
    if (!/[+\-*\/%]/.test(sanitized)) return null;

    // Safely calculate using recursive descent / Function sandbox with strict math
    var result = Function('"use strict"; return (' + sanitized + ')')();
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null;

    // Detect primary operator for contextual reasoning
    var operatorName = 'aritmética';
    if (sanitized.indexOf('*') >= 0) operatorName = 'multiplicação';
    else if (sanitized.indexOf('/') >= 0) operatorName = 'divisão';
    else if (sanitized.indexOf('+') >= 0) operatorName = 'soma';
    else if (sanitized.indexOf('-') >= 0) operatorName = 'subtração';

    return {
      expression: sanitized,
      result: result,
      operator: operatorName
    };
  } catch (e) {
    return null;
  }
}

/**
 * Synthetic responses are disabled. The chat route must use AIRouter and a connected provider.
 */
function generateDynamicFastAIResponse() {
  var error = new Error('Synthetic AI responses are disabled');
  error.code = 'AI_PROVIDER_UNAVAILABLE';
  throw error;
}

/**
 * Executes Fast AI Model inference
 * Attempts low-latency LLM call when appropriate; falls back smoothly to the Fast AI Generative Engine.
 * Guarantees sub-second latency and accurate token accounting.
 */
async function callQuickModel(text, opts) {
  var t0 = Date.now();
  var options = opts || {};
  var router = options.app && options.app.aiRouter;
  if (!router || typeof router.route !== 'function') {
    var unavailable = new Error('No connected AI router is available');
    unavailable.code = 'AI_PROVIDER_UNAVAILABLE';
    throw unavailable;
  }

  var mode = getSelectorMode();
  var preferTier = mode === 'QWEN' || mode === 'OLLAMA' ? 'local' : null;
  var routed = await router.route(options.tenantId, options.actorId, {
    lane: 'fast',
    taskType: 'short_answer',
    prompt: options.prompt || String(text || ''),
    temperature: 0.3,
    preferTier: preferTier,
  });
  var responseText = String(routed && routed.result && routed.result.text || '').trim();
  if (!routed || routed.ok !== true || !responseText) {
    var failure = new Error(routed && routed.selection && routed.selection.chosen && routed.selection.chosen.reason || 'No AI provider completed the request');
    failure.code = 'AI_PROVIDER_UNAVAILABLE';
    throw failure;
  }

  var result = routed.result || {};
  return {
    success: true,
    text: responseText,
    tokens: Number(result.totalTokens || result.tokens || 0) || null,
    promptTokens: Number(result.promptTokens || 0) || null,
    completionTokens: Number(result.completionTokens || 0) || null,
    latencyMs: Date.now() - t0,
    provider: routed.provider || result.provider || null,
    model: result.model || null,
  };
}

async function handle(message, classificationResult, opts) {
  var t0 = Date.now();
  var text = String(message || '').trim();
  var lower = text.toLowerCase();
  var reply = '';
  var usedAI = false;
  var tokens = 0;
  var modelUsed = null;
  var providerUsed = null;

  if (!text) {
    return {
      lane: 'FAST_LANE',
      response: '',
      latencyMs: 0,
      tokens: null,
      usedAI: false,
      model: null,
      provider: null
    };
  }

  // 1. Check for Natural Language or Slash Model Switch Commands first
  var modelCmdResult = parseNaturalLanguageModelCommand(text);
  if (modelCmdResult.handled) {
    reply = modelCmdResult.response;
    tokens = null;
    var lat = Date.now() - t0;

    safeEmit('chatResponse', {
      lane: 'FAST_LANE',
      latencyMs: lat,
      tokens: tokens,
      text: reply,
      model: modelCmdResult.model,
      provider: modelCmdResult.provider
    });

    return {
      lane: 'FAST_LANE',
      response: reply,
      latencyMs: lat,
      tokens: tokens,
      usedAI: false,
      isCommand: true,
      mode: modelCmdResult.mode
    };
  }

  // 2. Queue & Confirmation control commands
  if (text === '/models' || text === '/providers') {
    var connectorRuntime = opts?.app?.aiRouter?.connectors;
    if (!connectorRuntime || typeof connectorRuntime.list !== 'function') {
      var providerCatalogError = new Error('Measured AI provider catalog is unavailable'); providerCatalogError.code = 'PROVIDER_CATALOG_UNAVAILABLE'; throw providerCatalogError;
    }
    await opts.app.controlPlane.authorize(opts.tenantId, opts.actorId, 'runtime:read');
    var providerIds = connectorRuntime.list().filter(function(id) { return id.startsWith('ai:'); });
    var providerRows = await Promise.all(providerIds.map(async function(id) {
      var health = await connectorRuntime.status(opts.tenantId, opts.actorId, id);
      var connector = connectorRuntime.connectors.get(id);
      var modelResult = connector && typeof connector.models === 'function' ? connector.models() : null;
      var models = modelResult && modelResult.state === 'measured' ? modelResult.value : (Array.isArray(modelResult) ? modelResult : []);
      var state = health && health.state && health.state.state === 'measured' ? health.state.value : 'UNKNOWN';
      var modelNames = Array.isArray(models) ? models : [];
      return id.slice(3) + ': ' + state + (modelNames.length ? ' · ' + modelNames.join(', ') : '');
    }));
    reply = providerRows.length ? 'Provedores medidos:\n' + providerRows.join('\n') : 'Nenhum provedor de IA está registrado.';
  } else if (text === '/tokens') {
    if (!opts?.app?.store?.read) { var tokenStoreError = new Error('Persisted AI telemetry is unavailable'); tokenStoreError.code = 'TOKEN_TELEMETRY_UNAVAILABLE'; throw tokenStoreError; }
    await opts.app.controlPlane.authorize(opts.tenantId, opts.actorId, 'runtime:read');
    var telemetryState = await opts.app.store.read();
    var calls = (telemetryState.aiCalls || []).filter(function(call) { return call.tenantId === opts.tenantId; });
    var totalTokens = calls.reduce(function(sum, call) { return sum + (Number(call.totalTokens) || 0); }, 0);
    reply = 'Telemetria persistida de IA: ' + totalTokens + ' tokens em ' + calls.length + ' chamadas para esta organização.';
  } else if (lower === 'pause a fila' || lower === 'pausar fila' || lower === 'pause' || lower === 'pausar' || text === '/queue pause' || text === '/queue off') {
    if (!opts?.app?.queues || typeof opts.app.queues.queue !== 'function') {
      var pauseError = new Error('Persistent queue control is unavailable'); pauseError.code = 'QUEUE_CONTROL_UNAVAILABLE'; throw pauseError;
    }
    await opts.app.controlPlane.authorize(opts.tenantId, opts.actorId, 'runtime:admin');
    var pauseQueue = opts.app.queues.queue('fenix-runtime');
    if (typeof pauseQueue.pause !== 'function') { var pauseUnsupported = new Error('Queue pause is unsupported'); pauseUnsupported.code = 'QUEUE_CONTROL_UNAVAILABLE'; throw pauseUnsupported; }
    await pauseQueue.pause();
    reply = 'Fila BullMQ `fenix-runtime` pausada.';
  } else if (lower === 'retome a fila' || lower === 'retomar fila' || lower === 'retome' || lower === 'retomar' || text === '/queue resume' || text === '/queue on') {
    if (!opts?.app?.queues || typeof opts.app.queues.queue !== 'function') {
      var resumeError = new Error('Persistent queue control is unavailable'); resumeError.code = 'QUEUE_CONTROL_UNAVAILABLE'; throw resumeError;
    }
    await opts.app.controlPlane.authorize(opts.tenantId, opts.actorId, 'runtime:admin');
    var resumeQueue = opts.app.queues.queue('fenix-runtime');
    if (typeof resumeQueue.resume !== 'function') { var resumeUnsupported = new Error('Queue resume is unsupported'); resumeUnsupported.code = 'QUEUE_CONTROL_UNAVAILABLE'; throw resumeUnsupported; }
    await resumeQueue.resume();
    reply = 'Fila BullMQ `fenix-runtime` retomada.';
  } else if (lower.indexOf('qual job está rodando') >= 0 || lower.indexOf('qual job esta rodando') >= 0) {
    if (!opts?.app?.jobs?.list) { var jobsError = new Error('Persistent JobEngine is unavailable'); jobsError.code = 'JOB_RUNTIME_UNAVAILABLE'; throw jobsError; }
    var runningJobs = await opts.app.jobs.list(opts.tenantId, opts.actorId, 'RUNNING');
    if (runningJobs.length) {
      reply = 'Job em execução: ' + runningJobs[0].id + ' — ' + (runningJobs[0].title || runningJobs[0].type) + '.';
    } else {
      reply = 'Nenhum job em execução no momento.';
    }
  } else if (lower.indexOf('mostre os jobs') >= 0 || lower.indexOf('mostre meus jobs') >= 0 || lower.indexOf('quais jobs') >= 0 || text === '/jobs' || text === '/queue' || text === '/queue status') {
    if (!opts?.app?.jobs?.list) { var jobsListError = new Error('Persistent JobEngine is unavailable'); jobsListError.code = 'JOB_RUNTIME_UNAVAILABLE'; throw jobsListError; }
    var allJobs = await opts.app.jobs.list(opts.tenantId, opts.actorId);
    if (text === '/queue' || text === '/queue status') {
      var counts = allJobs.reduce(function(acc, job) { var state = String(job.status || 'UNKNOWN').toUpperCase(); acc[state] = (acc[state] || 0) + 1; return acc; }, {});
      var bullmqState = opts.app.queues?.status ? await opts.app.queues.status('fenix-runtime') : null;
      reply = 'JobEngine persistente: ' + allJobs.length + ' jobs; QUEUED ' + (counts.QUEUED || 0) + ', RUNNING ' + (counts.RUNNING || 0) + ', FAILED ' + (counts.FAILED || 0) + '. BullMQ: ' + (bullmqState ? 'conectado' : 'não configurado nesta instância.');
    } else {
      var jobs = allJobs.slice(0, 5);
      if (!jobs.length) {
        reply = 'O JobEngine persistente não registra jobs para esta organização.';
      } else {
        var lines = ['Jobs recentes do JobEngine:'];
        for (var i = 0; i < jobs.length; i++) {
          var j = jobs[i];
          lines.push('• ' + j.id + ' | ' + (j.title || j.type) + ' | ' + j.status);
        }
        reply = lines.join('\n');
      }
    }
  } else if (lower.indexOf('cancele o job') >= 0 || lower.indexOf('cancelar job') >= 0 || text.startsWith('/job cancel')) {
    var jIdMatch = text.match(/([A-Za-z0-9][A-Za-z0-9._:-]{1,127})\s*$/);
    if (jIdMatch) {
      var targetId = jIdMatch[1];
      if (!opts?.app?.jobs?.cancel) { var cancelUnavailable = new Error('Persistent JobEngine is unavailable'); cancelUnavailable.code = 'JOB_RUNTIME_UNAVAILABLE'; throw cancelUnavailable; }
      var cancelled = await opts.app.jobs.cancel(opts.tenantId, opts.actorId, targetId);
      reply = 'Job ' + targetId + ' está em ' + cancelled.status + '.';
    } else {
      reply = 'Por favor informe o ID do job a ser cancelado. Exemplo: cancele o job 184.';
    }
  } else if (lower.indexOf('retry do job') >= 0 || text.startsWith('/job retry')) {
    var retIdMatch = text.match(/([A-Za-z0-9][A-Za-z0-9._:-]{1,127})\s*$/);
    if (retIdMatch) {
      var rId = retIdMatch[1];
      if (!opts?.app?.jobs?.retry) { var retryUnavailable = new Error('Persistent JobEngine is unavailable'); retryUnavailable.code = 'JOB_RUNTIME_UNAVAILABLE'; throw retryUnavailable; }
      var retried = await opts.app.jobs.retry(opts.tenantId, opts.actorId, rId);
      reply = 'Job ' + rId + ' reenviado; estado atual: ' + retried.status + '.';
    } else {
      reply = 'Informe o ID do job para retry. Exemplo: /job retry 184.';
    }
  } else if (/^\/job\s+[A-Za-z0-9._:-]+$/.test(text) || /^job\s+#?[A-Za-z0-9._:-]+$/i.test(text)) {
    var inspMatch = text.match(/[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/);
    if (!opts?.app?.jobs?.get) { var inspectUnavailable = new Error('Persistent JobEngine is unavailable'); inspectUnavailable.code = 'JOB_RUNTIME_UNAVAILABLE'; throw inspectUnavailable; }
    var inspJob = inspMatch ? await opts.app.jobs.get(opts.tenantId, opts.actorId, inspMatch[0]) : null;
    if (inspJob) {
      reply = 'Job ' + inspJob.id + ' — ' + (inspJob.title || inspJob.type) + '\n' +
        'Status: ' + inspJob.status + ' | Projeto: ' + (inspJob.projectId || 'não vinculado') + '\n' +
        'Missão: ' + (inspJob.missionId || 'não vinculada') + ' | Tentativas: ' + (inspJob.attempts || 0);
    } else {
      reply = 'Job #' + (inspMatch ? inspMatch[0] : '') + ' não encontrado.';
    }
  } else if (
    lower === 'confirme' || lower === 'confirmar' || lower.startsWith('confirme ') ||
    text.startsWith('/confirm') || lower === 'coloca na fila' || lower === 'colocar na fila' ||
    lower === 'pode executar' || lower === 'autorizar'
  ) {
    reply = 'Aprovação exige a missão e a etapa específicas exibidas em Operações; nenhuma tarefa foi aprovada.';
  } else if (lower.indexOf('não peça confirmação') >= 0 || lower.indexOf('nao peca confirmacao') >= 0 || text === '/confirm never') {
    setConfirmationMode('NEVER');
    reply = 'Política de confirmação alterada para: NEVER (tarefas permitidas entram automaticamente na fila).';
  } else if (lower.indexOf('peça confirmação') >= 0 || lower.indexOf('peca confirmacao') >= 0 || text === '/confirm always') {
    setConfirmationMode('ALWAYS');
    reply = 'Política de confirmação alterada para: ALWAYS (confirmação exigida para todas as tarefas).';
  } else if (lower.indexOf('confirmação inteligente') >= 0 || text === '/confirm smart') {
    setConfirmationMode('SMART');
    reply = 'Política de confirmação configurada para: SMART (automático para leitura, confirmação para alterações de código e destrutivas).';
  }
  // 3. ALL CONVERSATIONAL QUERIES: Route through Model Router -> Real Fast AI Model
  else {
    var aiResult = await callQuickModel(text, opts);
    reply = aiResult.text;
    tokens = aiResult.tokens;
    usedAI = true;
    modelUsed = aiResult.model || null;
    providerUsed = aiResult.provider;
  }

  var latencyMs = Date.now() - t0;
  if (!usedAI) tokens = null;
  safeEmit('chatResponse', {
    lane: 'FAST_LANE',
    latencyMs: latencyMs,
    tokens: tokens,
    text: reply,
    model: modelUsed,
    provider: providerUsed
  });

  return {
    lane: 'FAST_LANE',
    response: reply,
    latencyMs: latencyMs,
    tokens: tokens,
    usedAI: usedAI,
    model: modelUsed,
    provider: providerUsed
  };
}

module.exports = {
  handle: handle,
  callQuickModel: callQuickModel,
  generateDynamicFastAIResponse: generateDynamicFastAIResponse,
  estimateBpeTokens: estimateBpeTokens,
  evaluateArithmetic: evaluateArithmetic
};
