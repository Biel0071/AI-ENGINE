'use strict';
/**
 * FÊNIX OS V8.1 — Conversation Router
 * Classifies user messages into Fast Lane vs Job Lane.
 * Calculates complexity, token estimates, required capabilities, and confirmation policies.
 */

var CONFIRMATION_MODES = {
  ALWAYS: 'ALWAYS',
  SMART: 'SMART',
  NEVER: 'NEVER'
};

var globalConfirmationMode = process.env.JOB_CONFIRMATION_MODE || CONFIRMATION_MODES.SMART;

var CLASSIFICATIONS = {
  CHAT: 'CHAT',
  QUESTION: 'QUESTION',
  COMMAND: 'COMMAND',
  TASK: 'TASK',
  MISSION: 'MISSION',
  ANALYSIS: 'ANALYSIS',
  CODE_CHANGE: 'CODE_CHANGE',
  PROJECT_OPERATION: 'PROJECT_OPERATION',
  BROWSER_OPERATION: 'BROWSER_OPERATION',
  DEPLOY_OPERATION: 'DEPLOY_OPERATION'
};

function setConfirmationMode(mode) {
  var upper = String(mode || '').toUpperCase();
  if (CONFIRMATION_MODES[upper]) {
    globalConfirmationMode = upper;
    return globalConfirmationMode;
  }
  return globalConfirmationMode;
}

function getConfirmationMode() {
  return globalConfirmationMode;
}

function detectProject(text) {
  var lower = text.toLowerCase();
  if (lower.indexOf('api platform') >= 0 || lower.indexOf('api-platform') >= 0) return 'api-platform';
  if (lower.indexOf('zapai') >= 0 || lower.indexOf('zap-ai') >= 0 || lower.indexOf('zapflow') >= 0) return 'zapai-crm';
  if (lower.indexOf('fenix') >= 0 || lower.indexOf('fênix') >= 0) return 'fenix-os';
  return 'fenix-os';
}

function classify(message, userOpts) {
  var text = String(message || '').trim();
  var lower = text.toLowerCase();
  var mode = (userOpts && userOpts.confirmationMode) || globalConfirmationMode;

  // 1. Check for explicit slash commands or natural queue / system commands
  var isCommand = false;
  var isSlash = text.startsWith('/');
  var isQueueControl = (
    lower === 'retome' || lower === 'retomar' || lower === 'pause' || lower === 'pausar' ||
    lower.indexOf('pause a fila') >= 0 || lower.indexOf('pausar fila') >= 0 || lower.indexOf('pause queue') >= 0 ||
    lower.indexOf('retome a fila') >= 0 || lower.indexOf('retomar fila') >= 0 || lower.indexOf('resume queue') >= 0 ||
    lower.indexOf('mostre os jobs') >= 0 || lower.indexOf('mostre meus jobs') >= 0 || lower.indexOf('quais jobs') >= 0 ||
    lower.indexOf('listar jobs') >= 0 || lower.indexOf('qual job') >= 0 ||
    lower.indexOf('cancele o job') >= 0 || lower.indexOf('cancelar job') >= 0 ||
    lower.indexOf('confirme') === 0 || lower.indexOf('confirmar') === 0 ||
    lower.indexOf('faça automático') >= 0 || lower.indexOf('faca automatico') >= 0 ||
    lower.indexOf('não peça confirmação') >= 0 || lower.indexOf('nao peca confirmacao') >= 0 ||
    lower.indexOf('peça confirmação') >= 0 || lower.indexOf('peca confirmacao') >= 0 ||
    lower === 'use qwen' || lower === 'use o qwen' || lower.indexOf('troque para modelo rápido') >= 0 ||
    lower.indexOf('qual modelo') >= 0 ||
    lower.indexOf('me mostre os projetos') >= 0 || lower.indexOf('mostre os projetos') >= 0
  );

  var isProjectMutation = (
    lower.indexOf('crie um projeto') >= 0 || lower.indexOf('criar projeto') >= 0 ||
    lower.indexOf('novo projeto') >= 0 || lower.indexOf('registre o projeto') >= 0 ||
    lower.indexOf('clone o projeto') >= 0 || lower.indexOf('sincronize o projeto') >= 0
  );

  // 2. High-risk actions
  var isDeploy = (
    lower.indexOf('deploy') >= 0 ||
    lower.indexOf('publicar em produção') >= 0 ||
    lower.indexOf('subir para prod') >= 0
  );

  var isBrowser = (
    lower.indexOf('abra o zapai') >= 0 ||
    lower.indexOf('veja a tela') >= 0 ||
    lower.indexOf('playwright') >= 0 ||
    lower.indexOf('screenshot') >= 0 ||
    lower.indexOf('navegue para') >= 0 ||
    lower.indexOf('teste e2e') >= 0 ||
    lower.indexOf('abrir navegador') >= 0
  );

  var isCodeChange = (
    lower.indexOf('corrija o bug') >= 0 ||
    lower.indexOf('corrija o problema') >= 0 ||
    lower.indexOf('corrigir') >= 0 ||
    lower.indexOf('mude o componente') >= 0 ||
    lower.indexOf('mude ') >= 0 ||
    lower.indexOf('mudar ') >= 0 ||
    lower.indexOf('altere o componente') >= 0 ||
    lower.indexOf('altere o código') >= 0 ||
    lower.indexOf('altere ') >= 0 ||
    lower.indexOf('alterar ') >= 0 ||
    lower.indexOf('atualize ') >= 0 ||
    lower.indexOf('modifique') >= 0 ||
    lower.indexOf('refatore') >= 0 ||
    lower.indexOf('crie um endpoint') >= 0 ||
    lower.indexOf('apague esse módulo') >= 0 ||
    lower.indexOf('delete') >= 0 ||
    lower.indexOf('git push') >= 0
  );

  var isDestructive = (
    lower.indexOf('apague') >= 0 ||
    lower.indexOf('delete') >= 0 ||
    lower.indexOf('remover') >= 0 ||
    lower.indexOf('drop database') >= 0 ||
    lower.indexOf('git push') >= 0 ||
    lower.indexOf('rm -rf') >= 0
  );

  var isAnalysis = (
    lower.indexOf('analise') >= 0 ||
    lower.indexOf('analisar') >= 0 ||
    lower.indexOf('scan') >= 0 ||
    lower.indexOf('audite') >= 0 ||
    lower.indexOf('auditar') >= 0 ||
    lower.indexOf('mapeie') >= 0 ||
    lower.indexOf('mapear') >= 0
  );

  var isMission = (
    lower.indexOf('melhore o ') >= 0 ||
    lower.indexOf('até ficar pronto') >= 0 ||
    lower.indexOf('missão') >= 0 ||
    lower.indexOf('mission') >= 0
  );

  var isTask = (
    lower.indexOf('coloque isso na fila') >= 0 ||
    lower.indexOf('crie uma tarefa') >= 0 ||
    lower.indexOf('execute a tarefa') >= 0 ||
    lower.indexOf('tarefa') >= 0 ||
    lower.indexOf('use qwen para') >= 0
  );

  var isChat = (
    lower === 'oi' || lower === 'olá' || lower === 'ola' ||
    lower === 'ola fenix' || lower === 'olá fênix' || lower === 'oi fenix' || lower === 'oi fênix' ||
    lower === 'bom dia' || lower === 'boa tarde' || lower === 'boa noite' ||
    lower === 'obrigado' || lower === 'valeu' || lower === 'tchau' ||
    lower === 'quem é você?' || lower === 'qual o seu nome?' ||
    lower === 'como vai?' || lower === 'tudo bem?'
  );

  var isQuestion = (
    lower.startsWith('como funciona') ||
    lower.startsWith('o que é') ||
    lower.startsWith('o que e') ||
    lower.startsWith('me explique') ||
    lower.startsWith('explique') ||
    lower.startsWith('por que') ||
    lower.startsWith('quanto é') ||
    lower.startsWith('quanto e') ||
    lower.indexOf('?') >= 0
  );

  // Model preference from text
  var preferredModel = null;
  if (lower.indexOf('qwen') >= 0) preferredModel = 'qwen2.5:3b';
  if (lower.indexOf('modelo rápido') >= 0 || lower.indexOf('fast') >= 0) preferredModel = 'fast';

  var classification = CLASSIFICATIONS.CHAT;
  var lane = 'FAST_LANE';
  var complexity = 'low';
  var estimatedTokens = 150;
  var estimatedTimeSec = 1;
  var requiredCapabilities = ['read'];
  var recommendedModel = preferredModel || 'fast';
  var requiresConfirmation = false;
  var targetProject = detectProject(text);

  if (isSlash || isQueueControl) {
    classification = CLASSIFICATIONS.COMMAND;
    lane = 'FAST_LANE';
    complexity = 'low';
    estimatedTokens = 100;
    estimatedTimeSec = 1;
    recommendedModel = 'fast';
    requiresConfirmation = false;
  } else if (isDeploy) {
    classification = CLASSIFICATIONS.DEPLOY_OPERATION;
    lane = 'JOB_LANE';
    complexity = 'high';
    estimatedTokens = 1200;
    estimatedTimeSec = 45;
    requiredCapabilities = ['deploy', 'execute', 'network'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    requiresConfirmation = true; // Always requires confirmation
  } else if (isDestructive) {
    classification = CLASSIFICATIONS.CODE_CHANGE;
    lane = 'JOB_LANE';
    complexity = 'high';
    estimatedTokens = 800;
    estimatedTimeSec = 20;
    requiredCapabilities = ['code:write', 'filesystem'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    requiresConfirmation = true; // Always requires confirmation
  } else if (isCodeChange) {
    classification = CLASSIFICATIONS.CODE_CHANGE;
    lane = 'JOB_LANE';
    complexity = 'medium';
    estimatedTokens = 900;
    estimatedTimeSec = 30;
    requiredCapabilities = ['code:write', 'git'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    // SMART mode: code changes require confirmation
    requiresConfirmation = (mode === CONFIRMATION_MODES.ALWAYS || mode === CONFIRMATION_MODES.SMART);
  } else if (isBrowser) {
    classification = CLASSIFICATIONS.BROWSER_OPERATION;
    lane = 'JOB_LANE';
    complexity = 'high';
    estimatedTokens = 1500;
    estimatedTimeSec = 40;
    requiredCapabilities = ['browser', 'playwright'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    requiresConfirmation = (mode === CONFIRMATION_MODES.ALWAYS);
  } else if (isMission) {
    classification = CLASSIFICATIONS.MISSION;
    lane = 'JOB_LANE';
    complexity = 'high';
    estimatedTokens = 2500;
    estimatedTimeSec = 60;
    requiredCapabilities = ['planning', 'code:write', 'analysis'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
  } else if (isProjectMutation) {
    classification = CLASSIFICATIONS.PROJECT_OPERATION;
    lane = 'JOB_LANE';
    complexity = 'medium';
    estimatedTokens = 500;
    estimatedTimeSec = 15;
    requiredCapabilities = ['project:manage', 'git', 'filesystem'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    requiresConfirmation = (mode === CONFIRMATION_MODES.ALWAYS || mode === CONFIRMATION_MODES.SMART);
  } else if (isAnalysis || isTask) {
    classification = isAnalysis ? CLASSIFICATIONS.ANALYSIS : CLASSIFICATIONS.TASK;
    lane = 'JOB_LANE';
    complexity = 'medium';
    estimatedTokens = 600;
    estimatedTimeSec = 15;
    requiredCapabilities = ['read', 'analysis'];
    recommendedModel = preferredModel || 'qwen2.5:3b';
    // Read-only analysis in SMART mode is AUTO QUEUE (requiresConfirmation = false)
    requiresConfirmation = (mode === CONFIRMATION_MODES.ALWAYS);
  } else if (isChat) {
    classification = CLASSIFICATIONS.CHAT;
    lane = 'FAST_LANE';
    complexity = 'low';
    estimatedTokens = 120;
    estimatedTimeSec = 1;
    recommendedModel = 'fast';
    requiresConfirmation = false;
  } else if (isQuestion) {
    classification = CLASSIFICATIONS.QUESTION;
    lane = 'FAST_LANE';
    complexity = 'low';
    estimatedTokens = 250;
    estimatedTimeSec = 2;
    recommendedModel = 'fast';
    requiresConfirmation = false;
  } else {
    // Default general conversation
    classification = CLASSIFICATIONS.CHAT;
    lane = 'FAST_LANE';
    complexity = 'low';
    estimatedTokens = 150;
    estimatedTimeSec = 1;
    recommendedModel = 'fast';
    requiresConfirmation = false;
  }

  // Safety rule: destructive and deploy NEVER bypass confirmation even if mode is NEVER
  if (mode === CONFIRMATION_MODES.NEVER) {
    if (isDeploy || isDestructive) {
      requiresConfirmation = true;
    } else {
      requiresConfirmation = false;
    }
  }

  return {
    rawMessage: text,
    classification: classification,
    lane: lane,
    targetProject: targetProject,
    complexity: complexity,
    estimated_tokens: estimatedTokens,
    estimated_time: estimatedTimeSec,
    required_capabilities: requiredCapabilities,
    recommended_model: recommendedModel,
    requires_confirmation: requiresConfirmation,
    confirmationMode: mode
  };
}

module.exports = {
  classify: classify,
  setConfirmationMode: setConfirmationMode,
  getConfirmationMode: getConfirmationMode,
  CONFIRMATION_MODES: CONFIRMATION_MODES,
  CLASSIFICATIONS: CLASSIFICATIONS
};
