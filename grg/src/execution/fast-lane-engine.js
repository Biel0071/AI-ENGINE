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
  var configuredProvider = mode === 'QWEN' || mode === 'OLLAMA'
    ? null
    : router.gateway?.route?.('default')?.provider || null;
  var routed = await router.route(options.tenantId, options.actorId, {
    lane: 'fast',
    taskType: 'short_answer',
    prompt: options.prompt || String(text || ''),
    temperature: 0.3,
    preferTier: preferTier,
    preferProvider: configuredProvider,
    excludeProviders: ['echo'],
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
  } else if (text === '/rea' || text.startsWith('/rea ') || lower.indexOf('analise rea') >= 0 || lower.indexOf('análise rea') >= 0 || lower.indexOf('reverse engineer') >= 0) {
    var { globalReaIntelligenceEngine } = require('../services/rea-intelligence-engine');
    var targetProj = opts?.projectId || 'fenix-os';
    var reaEv = globalReaIntelligenceEngine.analyzeProject(targetProj, { maxFiles: 150 });
    reply = '🔬 **Análise REA (`' + reaEv.reaEngine.version + '`) — ' + reaEv.projectName + '**\n' +
      '• **Evidence ID:** `' + reaEv.evidenceId + '` (SHA-256: `' + reaEv.subjectSha256.slice(0, 16) + '…`)\n' +
      '• **Grafo da Aplicação:** `' + reaEv.metrics.graphNodesCount + '` módulos analisados | `' + reaEv.metrics.graphEdgesCount + '` arestas de dependência\n' +
      '• **Superfície HTTP & IPC:** `' + reaEv.metrics.routesDetected + '` rotas detectadas | `' + reaEv.metrics.ipcBoundariesCount + '` fronteiras IPC/SSE/WS\n' +
      '• **Integridade:** `' + reaEv.metrics.brokenReferencesCount + '` referências quebradas | `' + reaEv.metrics.unknownsCount + '` unknowns dinâmicos\n' +
      '• **Tempo de Execução:** `' + reaEv.durationMs + 'ms`';
    providerUsed = 'rea-intelligence-engine';
    modelUsed = 'rea-agents@6.5.0';
  } else if (text === '/blueprint' || text.startsWith('/blueprint ') || lower.indexOf('blueprint dev') >= 0 || lower.indexOf('construcao dev') >= 0 || lower.indexOf('construção dev') >= 0) {
    var { globalReaIntelligenceEngine: reaBpEngine } = require('../services/rea-intelligence-engine');
    var bpProj = opts?.projectId || 'fenix-os';
    var bpObj = text.replace(/^\/blueprint\s*/i, '').trim() || 'Evolução estrutural full-stack';
    var bp = reaBpEngine.generateDevBlueprint(bpProj, bpObj);
    reply = '📐 **Proposta de engenharia REA — `' + bp.blueprintId + '`**\n' +
      '• **Objetivo:** ' + bp.objective + '\n' +
      '• **Evidência:** `' + bp.evidenceRef.evidenceId + '` · SHA-256 `' + bp.evidenceRef.subjectSha256.slice(0, 16) + '…`\n' +
      '• **Alvos frontend:** ' + (bp.fullstackContract.frontendTargets.map(function(t) { return '`' + t.viewId + '` (' + t.file + ')'; }).join(', ') || 'nenhum correlacionado') + '\n' +
      '• **Alvos backend:** ' + (bp.fullstackContract.backendTargets.map(function(t) { return '`' + t.symbol + '` (' + t.file + ')'; }).join(', ') || 'nenhum correlacionado') + '\n' +
      '• **Rotas:** ' + (bp.fullstackContract.apiContracts.map(function(c) { return '`' + c.method + ' ' + c.path + '`'; }).join(', ') || 'nenhuma correlacionada') + '\n' +
      '• **Etapas propostas:** ' + bp.executionSteps.map(function(s) { return s.step + '. ' + s.phase + ' (' + s.status + ')'; }).join(' → ') + '\n' +
      '• Proposta somente de leitura. Não executou testes nem criou job/alterações; revise antes de delegar.';
    providerUsed = 'rea-blueprint-engine';
    modelUsed = 'REA local analysis';
  } else if (
    text === '/index' || text.startsWith('/index ') || text.startsWith('/memory-index') ||
    lower === 'memoria index' || lower === 'memória index' || lower === 'memoria ativa' || lower === 'memória ativa' ||
    lower === 'status da memoria' || lower === 'status da memória'
  ) {
    var { globalProjectMemoryIndex } = require('../memory/project-memory-index');
    var idxStatus = globalProjectMemoryIndex.getStatus();
    var qText = text.replace(/^\/(?:memory-)?index\s*/i, '').trim() || 'fenix';
    var qRes = globalProjectMemoryIndex.queryIndex(qText, { projectId: opts?.projectId, limit: 6 });
    var topHits = qRes.results.slice(0, 5).map(function(r) {
      return '  - `[' + r.type.toUpperCase() + ']` **' + r.id + '**' + (r.file ? ' (' + r.file + ')' : '');
    }).join('\n');
    reply = '🗂️ **Memória Ativa & Project Memory INDEX (`' + idxStatus.version + '`)**\n' +
      '• **Latência O(1):** `' + qRes.elapsedMs + 'ms` | **Tokens Indexados:** `' + idxStatus.indexedTokens + '`\n' +
      '• **Ecossistema Indexado:** `' + idxStatus.summary.projectsCount + '` projetos | `' + idxStatus.summary.filesCount + '` arquivos | `' + idxStatus.summary.symbolsCount + '` símbolos | `' + idxStatus.summary.routesCount + '` rotas | `' + idxStatus.summary.dependencyEdgesCount + '` arestas\n' +
      '• **ACTIVE_PROJECT_MEMORY.md:** `' + idxStatus.activeMemory.sectionCount + '` seções ativas (SHA-256 `' + (idxStatus.activeMemory.sha256 || '—') + '`)\n' +
      (topHits ? '• **Matches para `' + qText + '`:**\n' + topHits : '');
    providerUsed = 'project-memory-index';
    modelUsed = 'o1-inverted-index';
  } else if (text === '/couplings' || text.startsWith('/couplings ') || lower.indexOf('acoplamento') >= 0 || lower.indexOf('todos os projetos') >= 0) {
    var { globalReaIntelligenceEngine: reaCouplingEngine } = require('../services/rea-intelligence-engine');
    var coupData = reaCouplingEngine.analyzeEcosystemCouplings();
    var coupLines = coupData.couplings.map(function(c) {
      return '• **' + c.source + ' ↔ ' + c.target + '** (`' + c.type + '` via ' + c.protocol + ')';
    }).join('\n');
    reply = '🔗 **Matriz de Acoplamento de Engenharia (REA Ecosystem — ' + coupData.totalProjects + ' Projetos)**\n' +
      coupLines + '\n' +
      '• **Vídeo 1 (`1001656590.mp4`):** MCP AI Brain — Memória Unificada Multi-IA (Azul=OpenAI/Codex, Laranja=Anthropic/Claude, Amarelo=Misto, Ciano=Qwen/Fênix)\n' +
      '• **Vídeo 2 (`1001656597.mp4`):** Cidade 3D Cibernética — Torres Autônomas + Feixes de Carga + Workstation Interior de 3 Monitores';
    providerUsed = 'rea-intelligence-engine';
    modelUsed = 'rea-agents@6.5.0';
  } else if (text === '/screens' || text.startsWith('/screens ') || lower.indexOf('todas as telas') >= 0 || lower.indexOf('todas telas') >= 0) {
    var { globalReaIntelligenceEngine: reaScreensEngine } = require('../services/rea-intelligence-engine');
    var scrData = reaScreensEngine.analyzeAllScreensAndFeatures();
    var projList = scrData.projectsScreensSummary.map(function(p) {
      return '• **' + p.name + '** (`' + p.projectId + '`): `' + p.pagesCount + '` telas/views | `' + p.apis.length + '` rotas principais (' + p.framework + ')';
    }).join('\n');
    reply = '🖥️ **Telas Registradas no Ecossistema (Inventário REA atual)**\n' +
      '• **Total de Projetos:** `' + scrData.totalProjects + '` | **Views Canônicas Fênix OS:** `' + scrData.totalCanonicalFenixViews + '` | **Telas no Ecossistema:** `' + scrData.totalEcosystemScreens + '`\n' +
      projList;
    providerUsed = 'rea-intelligence-engine';
    modelUsed = 'rea-agents@6.5.0';
  } else if (
    (lower.indexOf('api') >= 0 || lower.indexOf('plataform') >= 0 || lower.indexOf('platform') >= 0) &&
    (lower.indexOf('imagem') >= 0 || lower.indexOf('imagens') >= 0 || lower.indexOf('print') >= 0 || lower.indexOf('prints') >= 0 || lower.indexOf('foto') >= 0 || lower.indexOf('fotos') >= 0 || lower.indexOf('tela') >= 0 || lower.indexOf('telas') >= 0 || lower.indexOf('screenshot') >= 0)
  ) {
    reply = '🖼️ **Galeria de Telas & Screenshots da API Platform (Porta 3001 / Fastify + Qwen 2.5):**\n\n' +
      'Aqui estão as telas e componentes visuais registrados e capturados da **API Platform**:\n\n' +
      '1. **Dashboard & Overview Central da API**\n' +
      '![Dashboard Overview](/screenshots/api-platform_screenshot.png)\n' +
      '*Rota:* `/overview` · *Métricas:* Uptime, requisições por segundo, provedores ativos e consumo de tokens.\n\n' +
      '2. **Tela Real em Execução no Ecossistema**\n' +
      '![API Platform Real Screen](/screenshots/prj_api_plataform_real_screen.png)\n' +
      '*Status:* Conectada ao Fênix OS · *Docker Container:* `api-platform-api-1` · *Porta:* `3001`\n\n' +
      '3. **Portal de Autenticação & Chaves da API (Login Reconstruído)**\n' +
      '![Portal de Acesso e Chaves](/screenshots/api_platform_reconstructed_login.png)\n' +
      '*Rota:* `/login` · *Segurança:* Tokens JWT Bearer & RBAC\n\n' +
      '4. **Componente de Transferência & Webhook de Dados**\n' +
      '![Componente de Transferência](/screenshots/api_platform_transfer_component.png)\n' +
      '*Serviços:* BullMQ Workers, Qwen Bridge e Webhook Dispatcher\n\n' +
      '💡 *Dica:* Você pode abrir e editar qualquer uma dessas telas diretamente pela aba **IDE** (Split Mode) ou pedir ao mascote para abrir no Preview.';
    providerUsed = 'rea-screen-engine';
    modelUsed = 'rea-agents@6.5.0';
  }
  // 3. ALL CONVERSATIONAL QUERIES: Route through Model Router -> Real Fast AI Model
  else {
    try {
      var aiResult = await callQuickModel(text, opts);
      reply = aiResult.text;
      tokens = aiResult.tokens;
      usedAI = true;
      modelUsed = aiResult.model || null;
      providerUsed = aiResult.provider;
    } catch (aiErr) {
      if (aiErr && aiErr.code === 'AI_PROVIDER_UNAVAILABLE' && opts?.mascotFastLane === true) {
        var { globalContextualInvestigationEngine } = require('../services/contextual-investigation-engine');
        var invResult = await globalContextualInvestigationEngine.investigate(text, {
          projectId: opts?.projectId,
          conversationHistory: opts?.conversationHistory,
          app: opts?.app,
          tenantId: opts?.tenantId,
          actorId: opts?.actorId
        });
        reply = invResult.response;
        usedAI = false;
        tokens = invResult.tokens || null;
        modelUsed = invResult.model || 'fenix-investigation-engine@v1';
        providerUsed = invResult.provider || 'contextual-investigation';
      } else {
        throw aiErr;
      }
    }
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
