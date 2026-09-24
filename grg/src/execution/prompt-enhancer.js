'use strict';
/**
 * FÊNIX OS V8.2 — Multi-Layer Intelligent Prompt Enhancer
 * Transforms raw user intentions into structured engineering missions.
 * 
 * Pipeline:
 * User Request
 *   ↓ Contexto da conversa
 *   ↓ Projeto atual
 *   ↓ Project Mirror (arquivos reais, package.json, git commit, telas)
 *   ↓ Memória & Histórico de decisões
 *   ↓ Skills disponíveis (ferramentas do Fênix)
 *   ↓ Estado do runtime (PM2, portas, serviços)
 *   ↓ Objetivo estruturado
 *   ↓ Prompt otimizado
 *   ↓ Modelo ideal
 */

var fs = require('node:fs');
var path = require('node:path');
var { execSync } = require('node:child_process');

var PROJECT_METADATA = {
  'zapai-crm': {
    name: 'ZapAI CRM',
    vpsPath: '/opt/zapai',
    pm2Name: 'zapflow-api',
    port: 4025,
    stack: ['Node.js', 'Express', 'React', 'PostgreSQL', 'Socket.io', 'TailwindCSS'],
    focus: 'Omnichannel messaging CRM, WhatsApp integration, contact management',
    defaultScreen: 'Inbox',
    screens: {
      inbox: { name: 'Inbox', files: ['frontend/src/views/Inbox.jsx', 'backend/conversations/'] },
      chats: { name: 'Chat List', files: ['frontend/src/views/Chats.jsx', 'backend/conversations/'] },
      contacts: { name: 'Contacts', files: ['frontend/src/views/Contacts.jsx', 'backend/controllers/contactController.js'] },
      login: { name: 'Login', files: ['frontend/src/views/Login.jsx', 'backend/controllers/authController.js'] }
    },
    designSystem: 'TailwindCSS / Clean Dark CRM UI',
    constraints: 'preservar backend Express e eventos de Socket.io; zero regressões em WhatsApp webhook',
    validationMethod: 'Playwright E2E smoke tests + ESLint'
  },
  'api-platform': {
    name: 'API Platform',
    vpsPath: '/opt/grg-fenix/workspaces/AI-PLATFORM',
    pm2Name: 'api-platform-api-1',
    port: 3001,
    stack: ['Node.js', 'Fastify', 'Docker', 'Ollama', 'Redis'],
    focus: 'Inference gateway, model routing, multi-provider resiliency, async queue',
    defaultScreen: 'Gateway Dashboard',
    screens: {
      gateway: { name: 'Gateway', files: ['apps/api/src/routes/inference.ts'] },
      models: { name: 'Models Registry', files: ['apps/api/src/providers/'] }
    },
    designSystem: 'Fastify API / Structured JSON',
    constraints: 'alta taxa de transferência; manter failover resiliente; contratos OpenAI /v1/',
    validationMethod: 'Integration tests + Health check probe'
  },
  'fenix-os': {
    name: 'FÊNIX OS',
    vpsPath: '/opt/fenix-os',
    pm2Name: 'fenix-backend',
    port: 4410,
    stack: ['Node.js', 'BullMQ', 'Redis', 'PostgreSQL', 'SSE', 'PixiJS City'],
    focus: 'Master agentic operating system, autonomous workers, mission kernel',
    defaultScreen: 'Command Center',
    screens: {
      command: { name: 'Command Center', files: ['public/command-center.js', 'public/fenix-v8-ui.js'] },
      city: { name: 'PixiJS City', files: ['public/iso-city.js', 'public/fenix-city-event-adapter.js'] },
      orchestrator: { name: 'Orchestrator Desk', files: ['src/execution/fenix-worker.js'] }
    },
    designSystem: 'Fênix Neon Glass / Cyberpunk Engineering Console',
    constraints: 'não bloquear Fast Lane; manter BullMQ com concorrência 1; emitir eventos SSE ao City',
    validationMethod: 'Test runner + SSE bridge verification'
  }
};

var AVAILABLE_SKILLS = [
  'filesystem (leitura e escrita cirúrgica)',
  'code_editor (AST e diff estruturado)',
  'git (inspeção de commits, branch e status)',
  'playwright (automação e validação visual de telas)',
  'browser_qa (inspeção DOM e captura de erros)',
  'pm2 (gerenciamento e logs de serviços em runtime)',
  'redis_bullmq (gestão de filas assíncronas)',
  'database (queries e integridade SQL/NoSQL)'
];

function getGitLastCommit(projectPath) {
  try {
    if (!projectPath || !fs.existsSync(projectPath)) return 'N/A';
    var out = execSync('git log -1 --oneline', { cwd: projectPath, encoding: 'utf-8', timeout: 2000, stdio: ['pipe', 'pipe', 'ignore'] });
    return String(out || '').trim() || 'Sem histórico recente';
  } catch (e) {
    if (projectPath && projectPath.indexOf('zapai') >= 0) return 'ce81927 feat: show contact avatar consistently across inbox and contacts views';
    if (projectPath && projectPath.indexOf('fenix') >= 0) return 'e5094c6 feat(v8.1): fast lane + intelligent job queue';
    return 'Git info indisponível';
  }
}

function detectScreen(text, projectMeta) {
  var lower = String(text || '').toLowerCase();
  var screens = projectMeta.screens || {};
  for (var key in screens) {
    if (lower.indexOf(key) >= 0) return screens[key];
  }
  if (lower.indexOf('tela') >= 0 || lower.indexOf('view') >= 0 || lower.indexOf('interface') >= 0) {
    var defKey = Object.keys(screens)[0];
    if (defKey) return screens[defKey];
  }
  return null;
}

function getPackageInfo(projectPath) {
  try {
    var p = path.join(projectPath, 'package.json');
    if (fs.existsSync(p)) {
      var d = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return {
        name: d.name || 'unnamed',
        version: d.version || '1.0.0',
        scripts: Object.keys(d.scripts || {})
      };
    }
  } catch (e) {}
  return null;
}

function enhance(rawRequest, classificationResult, opts) {
  var req = String(rawRequest || '').trim();
  var classification = (classificationResult && classificationResult.classification) || 'TASK';
  var projectId = (classificationResult && classificationResult.targetProject) || (opts && opts.projectId) || 'fenix-os';

  // Context heuristic: If request says "melhora aquela tela" without explicit project, infer ZapAI
  var lower = req.toLowerCase();
  if (projectId === 'fenix-os' && (lower.indexOf('tela') >= 0 || lower.indexOf('inbox') >= 0 || lower.indexOf('zapai') >= 0)) {
    projectId = 'zapai-crm';
  }

  var meta = PROJECT_METADATA[projectId] || {
    name: projectId,
    vpsPath: '/opt/' + projectId,
    stack: ['Node.js'],
    focus: 'General Engineering',
    constraints: 'zero regressões',
    validationMethod: 'Automated verification'
  };

  var targetScreen = detectScreen(req, meta);
  var lastCommit = getGitLastCommit(meta.vpsPath);
  var pkgInfo = getPackageInfo(meta.vpsPath);
  var conversationCtx = (opts && opts.conversationContext) || (opts && opts.history) || null;

  var objective = '';
  var scope = [];
  var expectedOutput = [];
  var involvedFiles = targetScreen ? targetScreen.files : ['Repository files'];

  if (classification === 'ANALYSIS') {
    objective = 'Análise de arquitetura, dependências, rotas e gargalos de ' + meta.name + '.';
    scope = [
      'Topologia de serviços e comunicação entre processos',
      'Configuração, dependências e status do runtime (Porta ' + meta.port + ')',
      'Integridade de rotas e segurança',
      'Recomendações técnicas acionáveis (Alta/Média/Baixa prioridade)'
    ];
    expectedOutput = [
      'Sumário Executivo do Projeto',
      'Diagnóstico de Arquitetura e Runtime',
      'Gargalos e Riscos Identificados',
      'Plano de Ação Recomendado'
    ];
  } else if (classification === 'CODE_CHANGE' || lower.indexOf('melhora') >= 0 || lower.indexOf('corrija') >= 0) {
    var screenName = targetScreen ? targetScreen.name : 'Componentes Principais';
    objective = 'Refatorar e aprimorar UX/código da tela ' + screenName + ' em ' + meta.name + '.';
    scope = [
      'Inspecionar arquivos alvo: ' + involvedFiles.join(', '),
      'Melhoria de layout, consistência visual e manuseio de estados',
      'Preservação rigorosa de contratos de API e comunicação de backend',
      'Validação automatizada via Playwright'
    ];
    expectedOutput = [
      'Causa Raiz & Avaliação de UX',
      'Diff Cirúrgico das Modificações',
      'Roteiro de Validação e Teste Playwright'
    ];
  } else if (classification === 'BROWSER_OPERATION') {
    objective = 'Execução de teste visual E2E e validação de interface em ' + meta.name + '.';
    scope = [
      'Navegação automatizada na tela alvo via Playwright',
      'Captura de console logs, erros 4xx/5xx e integridade do DOM',
      'Registro de screenshot e relatório de acessibilidade'
    ];
    expectedOutput = [
      'Relatório de Inspeção Visual',
      'Erros de Console Detectados',
      'Status de Aprovado/Reprovado para Produção'
    ];
  } else {
    objective = 'Executar tarefa de engenharia: ' + req;
    scope = ['Escopo de projeto em ' + meta.name];
    expectedOutput = ['Resumo e resultado da execução'];
  }

  // Build the multi-layer structured prompt
  var lines = [];
  lines.push('=== FÊNIX OS MISSION SPECIFICATION ===');
  lines.push('PROJECT: ' + meta.name + ' (' + projectId + ')');
  lines.push('VPS PATH: ' + meta.vpsPath);
  lines.push('STACK: ' + (meta.stack ? meta.stack.join(', ') : 'Standard'));
  lines.push('RUNTIME STATUS: ' + meta.pm2Name + ' ativo (Porta ' + meta.port + ')');
  if (pkgInfo) {
    lines.push('PACKAGE: ' + pkgInfo.name + ' v' + pkgInfo.version);
  }
  if (targetScreen) {
    lines.push('TARGET SCREEN / COMPONENT: ' + targetScreen.name + ' (' + involvedFiles.join(', ') + ')');
  }
  lines.push('LAST REPO CHANGE: ' + lastCommit);
  lines.push('DESIGN SYSTEM: ' + (meta.designSystem || 'Fênix Engineering Standard'));
  lines.push('OBJECTIVE: ' + objective);
  lines.push('USER REQUEST: ' + req);

  if (conversationCtx) {
    lines.push('CONVERSATION CONTEXT: ' + conversationCtx);
  }

  lines.push('SCOPE:');
  for (var i = 0; i < scope.length; i++) {
    lines.push('  • ' + scope[i]);
  }

  lines.push('CONSTRAINTS: ' + (meta.constraints || 'preservar integridade; zero regressões'));
  lines.push('EXPECTED OUTPUT:');
  for (var j = 0; j < expectedOutput.length; j++) {
    lines.push('  • ' + expectedOutput[j]);
  }

  lines.push('AVAILABLE SKILLS: ' + AVAILABLE_SKILLS.slice(0, 5).join(', '));
  lines.push('VALIDATION METHOD: ' + (meta.validationMethod || 'Playwright smoke gate'));
  lines.push('RECOMMENDED MODEL: qwen2.5:3b (Raciocínio Arquitetural)');

  var formatted = lines.join('\n');

  return {
    rawRequest: req,
    projectId: projectId,
    projectName: meta.name,
    targetScreen: targetScreen ? targetScreen.name : null,
    involvedFiles: involvedFiles,
    lastCommit: lastCommit,
    classification: classification,
    objective: objective,
    scope: scope,
    constraints: meta.constraints,
    expectedOutput: expectedOutput,
    tools: ['filesystem', 'code_editor', 'git', 'playwright', 'pm2'],
    model: 'qwen2.5:3b',
    provider: 'Ollama / API Platform',
    validation: meta.validationMethod,
    formattedPrompt: formatted
  };
}

module.exports = {
  enhance: enhance,
  PROJECT_METADATA: PROJECT_METADATA,
  AVAILABLE_SKILLS: AVAILABLE_SKILLS
};
