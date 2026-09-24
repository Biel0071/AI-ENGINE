'use strict';
/**
 * FÊNIX OS V8.2 — Intelligent Model Router & Central Cognitive Brain
 * Serves as the central brain for both FAST LANE and JOB LANE.
 * Handles dynamic model routing, in-conversation model switching,
 * multi-provider fallback, and live token accounting.
 */

var MODEL_TYPES = {
  FAST: 'fast',
  SMART: 'smart',
  QWEN: 'qwen',
  CODE: 'code',
  REASONING: 'reasoning'
};

var SELECTOR_MODES = ['AUTO', 'FAST', 'QWEN', 'OLLAMA', 'API_PLATFORM'];
var currentSelectorMode = 'AUTO';

var PROVIDER_CONFIGS = {
  ollama: {
    name: 'Ollama Qwen 2.5 (3B)',
    url: process.env.GRG_OLLAMA_DIRECT_URL || process.env.FENIX_OLLAMA_URL || 'http://172.20.0.7:11434',
    defaultModel: 'qwen2.5:3b',
    availableModels: ['qwen2.5:3b'],
    status: 'ONLINE',
    latencyMs: 0,
    lastSuccess: null,
    totalRequests: 0,
    failedRequests: 0,
    totalTokens: 0
  },
  apiPlatform: {
    name: 'API Platform Gateway',
    url: process.env.GRG_AIPLATFORM_URL || 'http://209.50.241.22:3001',
    defaultModel: 'qwen2.5:3b',
    availableModels: ['mission-engine', 'qwen2.5:3b'],
    status: 'ONLINE',
    latencyMs: 0,
    lastSuccess: null,
    totalRequests: 0,
    failedRequests: 0,
    totalTokens: 0
  },
  fastEngine: {
    name: 'Fast AI Generative Engine',
    url: 'in-process://fenix-fast-ai',
    defaultModel: 'fast-generative-ai',
    availableModels: ['fast-generative-ai', 'fast'],
    status: 'ONLINE',
    latencyMs: 0,
    lastSuccess: null,
    totalRequests: 0,
    failedRequests: 0,
    totalTokens: 0
  }
};

// Global Real Token Accounting
var tokenAccounting = {
  totalEstimatedTokens: 0,
  totalActualTokens: 0,
  fastLaneTokens: 0,
  jobLaneTokens: 0,
  requestsByModel: {},
  jobsByModel: {}
};

function setSelectorMode(mode) {
  var upper = String(mode || '').toUpperCase().trim();
  if (upper === 'FAST') currentSelectorMode = 'FAST';
  else if (upper === 'QWEN') currentSelectorMode = 'QWEN';
  else if (upper === 'OLLAMA') currentSelectorMode = 'OLLAMA';
  else if (upper === 'API_PLATFORM') currentSelectorMode = 'API_PLATFORM';
  else if (upper === 'AUTO') currentSelectorMode = 'AUTO';
  return currentSelectorMode;
}

function getSelectorMode() {
  return currentSelectorMode;
}

/**
 * Natural language & slash command parser for in-conversation model switching
 */
function parseNaturalLanguageModelCommand(rawText) {
  var text = String(rawText || '').trim();
  var lower = text.toLowerCase();

  // Slash commands
  if (text === '/fast' || text === '/model fast') {
    setSelectorMode('FAST');
    return {
      handled: true,
      mode: 'FAST',
      model: 'fast',
      provider: 'fastEngine',
      response: '⚡ **Fast Lane Ativada:** Respostas instantâneas com IA rápida e telemetria de tokens em tempo real.'
    };
  }
  if (text === '/qwen' || text === '/model qwen') {
    setSelectorMode('QWEN');
    return {
      handled: true,
      mode: 'QWEN',
      model: 'qwen2.5:3b',
      provider: 'ollama',
      response: '🧠 **Qwen 2.5 (3B) Ativado:** Raciocínio arquitetural profundo e engenharia autônoma.'
    };
  }
  if (text === '/auto' || text === '/model auto') {
    setSelectorMode('AUTO');
    return {
      handled: true,
      mode: 'AUTO',
      model: 'auto',
      provider: 'auto',
      response: '🤖 **Modo AUTO Ativado:** O Model Router escolherá dinamicamente entre IA Rápida e Qwen conforme a complexidade.'
    };
  }

  // Natural language expressions
  if (
    lower === 'faz com qwen' || lower === 'use qwen' || lower === 'use o qwen' ||
    lower === 'usar qwen' || lower === 'executa com qwen' || lower === 'executar com qwen' ||
    lower.indexOf('faz com o qwen') >= 0 || lower.indexOf('troque para qwen') >= 0
  ) {
    setSelectorMode('QWEN');
    return {
      handled: true,
      mode: 'QWEN',
      model: 'qwen2.5:3b',
      provider: 'ollama',
      response: '🧠 Configurado: usando **Qwen 2.5 (3B)** para raciocínio e engenharia.'
    };
  }

  if (
    lower === 'usa o modelo mais rápido' || lower === 'use o modelo mais rapido' ||
    lower === 'usa o modelo mais rapido' || lower === 'use o modelo mais rápido' ||
    lower === 'faz com fast' || lower === 'troque para modelo rápido' ||
    lower === 'modo rápido' || lower === 'usar fast' || lower === 'use fast' ||
    lower === 'mais rápido' || lower === 'mais rapido'
  ) {
    setSelectorMode('FAST');
    return {
      handled: true,
      mode: 'FAST',
      model: 'fast',
      provider: 'fastEngine',
      response: '⚡ Configurado: priorizando **Modelo Rápido (Fast Lane)** para máxima agilidade.'
    };
  }

  if (
    lower === 'faz automático' || lower === 'faca automatico' ||
    lower === 'faz automatico' || lower === 'faça automático' ||
    lower === 'modo automático' || lower === 'modo automatico' ||
    lower === 'use automático' || lower === 'use automatico'
  ) {
    setSelectorMode('AUTO');
    return {
      handled: true,
      mode: 'AUTO',
      model: 'auto',
      provider: 'auto',
      response: '🤖 Configurado: modo **AUTO** (escolha inteligente por complexidade da tarefa).'
    };
  }

  return { handled: false };
}

/**
 * Selects model for task according to lane, classification, and selector mode
 */
function selectModelForTask(taskInfo) {
  var classification = (taskInfo && taskInfo.classification) || 'CHAT';
  var lane = (taskInfo && taskInfo.lane) || 'FAST_LANE';
  var requestedModel = taskInfo && taskInfo.model;

  // Explicit user override takes precedence
  if (currentSelectorMode === 'FAST') {
    return {
      type: MODEL_TYPES.FAST,
      model: 'fast',
      provider: 'fastEngine',
      fallbackModel: 'qwen2.5:3b',
      fallbackProvider: 'ollama',
      reason: 'User selector explicitly set to FAST'
    };
  }
  if (currentSelectorMode === 'QWEN' || currentSelectorMode === 'OLLAMA') {
    return {
      type: MODEL_TYPES.QWEN,
      model: 'qwen2.5:3b',
      provider: 'ollama',
      reason: 'User selector explicitly set to ' + currentSelectorMode
    };
  }
  if (currentSelectorMode === 'API_PLATFORM') {
    return {
      type: MODEL_TYPES.SMART,
      model: 'qwen2.5:3b',
      provider: 'apiPlatform',
      reason: 'User selector explicitly set to API_PLATFORM'
    };
  }

  // If explicit model requested in prompt or parameters
  if (requestedModel && requestedModel.toLowerCase().indexOf('qwen') >= 0) {
    return {
      type: MODEL_TYPES.QWEN,
      model: 'qwen2.5:3b',
      provider: 'ollama',
      reason: 'Explicitly requested in task prompt'
    };
  }
  if (requestedModel && (requestedModel.toLowerCase().indexOf('fast') >= 0 || requestedModel === 'fast')) {
    return {
      type: MODEL_TYPES.FAST,
      model: 'fast',
      provider: 'fastEngine',
      fallbackModel: 'qwen2.5:3b',
      fallbackProvider: 'ollama',
      reason: 'Explicitly requested fast model'
    };
  }

  // AUTO Mode selection:
  if (lane === 'FAST_LANE') {
    return {
      type: MODEL_TYPES.FAST,
      model: 'fast',
      provider: 'fastEngine',
      fallbackModel: 'qwen2.5:3b',
      fallbackProvider: 'ollama',
      reason: 'Fast Lane low latency AI conversation'
    };
  }

  if (classification === 'ANALYSIS' || classification === 'TASK') {
    return {
      type: MODEL_TYPES.SMART,
      model: 'qwen2.5:3b',
      provider: 'ollama',
      reason: 'Deep architecture analysis requires reasoning model'
    };
  }

  if (classification === 'CODE_CHANGE') {
    return {
      type: MODEL_TYPES.CODE,
      model: 'qwen2.5:3b',
      provider: 'ollama',
      reason: 'Code modification requires code reasoning capability'
    };
  }

  if (classification === 'DEPLOY_OPERATION' || classification === 'BROWSER_OPERATION') {
    return {
      type: MODEL_TYPES.REASONING,
      model: 'qwen2.5:3b',
      provider: 'apiPlatform',
      reason: 'Operations orchestration via API Platform'
    };
  }

  return {
    type: MODEL_TYPES.SMART,
    model: 'qwen2.5:3b',
    provider: 'ollama',
    reason: 'Default balanced selection'
  };
}

function recordUsage(opts) {
  var isJob = Boolean(opts.isJob);
  var model = opts.model || 'fast';
  var tokens = Number(opts.tokens) || 0;
  var estimated = Number(opts.estimatedTokens) || 0;
  var latency = Number(opts.latencyMs) || 0;
  var provider = opts.provider || 'fastEngine';

  tokenAccounting.totalEstimatedTokens += estimated;
  tokenAccounting.totalActualTokens += tokens;
  if (isJob) {
    tokenAccounting.jobLaneTokens += tokens;
    tokenAccounting.jobsByModel[model] = (tokenAccounting.jobsByModel[model] || 0) + 1;
  } else {
    tokenAccounting.fastLaneTokens += tokens;
    tokenAccounting.requestsByModel[model] = (tokenAccounting.requestsByModel[model] || 0) + 1;
  }

  // Update provider telemetry
  var cfg = PROVIDER_CONFIGS[provider] ||
    (provider === 'Ollama' ? PROVIDER_CONFIGS.ollama :
     provider === 'API Platform' ? PROVIDER_CONFIGS.apiPlatform :
     PROVIDER_CONFIGS.fastEngine);

  if (cfg) {
    cfg.totalRequests++;
    cfg.totalTokens = (cfg.totalTokens || 0) + tokens;
    cfg.latencyMs = latency;
    if (opts.success !== false) {
      cfg.lastSuccess = new Date().toISOString();
      cfg.status = 'ONLINE';
    } else {
      cfg.failedRequests++;
    }
  }
}

function getProviderStatus() {
  return Object.keys(PROVIDER_CONFIGS).map(function(key) {
    var p = PROVIDER_CONFIGS[key];
    var errorRate = p.totalRequests > 0 ? ((p.failedRequests / p.totalRequests) * 100).toFixed(1) + '%' : '0%';
    return {
      id: key,
      name: p.name,
      model: p.defaultModel,
      availableModels: p.availableModels,
      status: p.status,
      latencyMs: p.latencyMs,
      lastSuccess: p.lastSuccess,
      totalRequests: p.totalRequests,
      tokens: p.totalTokens || 0,
      errorRate: errorRate
    };
  });
}

function getTokenReport() {
  return {
    totalEstimatedTokens: tokenAccounting.totalEstimatedTokens,
    totalActualTokens: tokenAccounting.totalActualTokens,
    fastLaneTokens: tokenAccounting.fastLaneTokens,
    jobLaneTokens: tokenAccounting.jobLaneTokens,
    requestsByModel: tokenAccounting.requestsByModel,
    jobsByModel: tokenAccounting.jobsByModel
  };
}

module.exports = {
  MODEL_TYPES: MODEL_TYPES,
  SELECTOR_MODES: SELECTOR_MODES,
  setSelectorMode: setSelectorMode,
  getSelectorMode: getSelectorMode,
  parseNaturalLanguageModelCommand: parseNaturalLanguageModelCommand,
  selectModelForTask: selectModelForTask,
  recordUsage: recordUsage,
  getProviderStatus: getProviderStatus,
  getTokenReport: getTokenReport,
  PROVIDER_CONFIGS: PROVIDER_CONFIGS
};
