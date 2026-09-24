'use strict';
/**
 * FÊNIX OS V8.2 — Conversation & Intelligent Dual-Lane Routes
 * Dispatches Fast Lane vs Job Lane requests, handles interactive model switching,
 * queue controls, and delivers real runtime model & token telemetry.
 */

var { classify, setConfirmationMode, getConfirmationMode, CONFIRMATION_MODES } = require('../routing/conversation-router');
var { enhance } = require('../execution/prompt-enhancer');
var { selectModelForTask, setSelectorMode, getSelectorMode, getProviderStatus, getTokenReport, parseNaturalLanguageModelCommand } = require('../routing/model-router');
var { globalJobQueueManager, JOB_STATUSES } = require('../execution/job-queue-manager');
var { handle: handleFastLane } = require('../execution/fast-lane-engine');

function getProjectContext(projectId) {
  try {
    var registry = require('../projects/project-registry');
    var p = registry.getProjectById(projectId);
    if (!p) return '';
    return 'Project: ' + p.name + ' (' + p.vpsPath + ') | Services: ' + (p.services || []).join(', ');
  } catch (e) {
    return '';
  }
}

async function handleConversationRoutes(req, res, url, sendJson, readJson, identity) {
  var pathname = url.pathname;
  var method = req.method;
  var actorId = (identity && identity.actorId) || 'grg-admin';

  // 1. POST /api/v2/conversation — Main Dual-Lane Entrypoint
  if (method === 'POST' && pathname === '/api/v2/conversation') {
    var body = await readJson(req).catch(function() { return {}; });
    var rawMessage = String(body.message || '').trim();
    if (!rawMessage) {
      sendJson(res, 400, { ok: false, error: 'message is required' });
      return true;
    }

    var lower = rawMessage.toLowerCase();

    // 1.1 Natural Language Model Switching Command
    var nlModel = parseNaturalLanguageModelCommand(rawMessage);
    if (nlModel.handled) {
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: nlModel.response,
        currentMode: getSelectorMode(),
        isCommand: true,
        tokens: Math.ceil((rawMessage.length + nlModel.response.length) / 4),
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 1.2 Natural Language Confirmation Policy Switching
    if (lower.indexOf('não precisa confirmar') >= 0 || lower.indexOf('nao precisa confirmar') >= 0 || lower.indexOf('sem confirmação') >= 0) {
      setConfirmationMode(CONFIRMATION_MODES.NEVER);
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🔓 Política de confirmação configurada para `NEVER`: tarefas permitidas serão enfileiradas automaticamente.',
        confirmationMode: getConfirmationMode(),
        timestamp: new Date().toISOString()
      });
      return true;
    }
    if (lower.indexOf('me pergunta antes de alterar') >= 0 || lower.indexOf('sempre confirme') >= 0 || lower.indexOf('peça confirmação') >= 0) {
      setConfirmationMode(CONFIRMATION_MODES.ALWAYS);
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🔒 Política de confirmação configurada para `ALWAYS`: qualquer tarefa exigirá aprovação prévia.',
        confirmationMode: getConfirmationMode(),
        timestamp: new Date().toISOString()
      });
      return true;
    }
    if (lower.indexOf('confirmação inteligente') >= 0 || lower.indexOf('modo smart') >= 0) {
      setConfirmationMode(CONFIRMATION_MODES.SMART);
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🧠 Política de confirmação configurada para `SMART`: leitura e análises entram na fila automaticamente; alterações de código exigem confirmação.',
        confirmationMode: getConfirmationMode(),
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 1.3 Natural Language Queue Confirmations
    if (lower === 'coloca na fila' || lower === 'colocar na fila' || lower === 'enfileirar' || lower === 'pode executar' || lower === 'confirme' || lower === 'confirmar' || lower === 'sim') {
      var pending = globalJobQueueManager.listJobs({ status: 'PENDING_CONFIRMATION' })[0];
      if (pending) {
        await globalJobQueueManager.confirmJob(pending.id, actorId);
        sendJson(res, 200, {
          ok: true,
          lane: 'JOB_LANE',
          response: '▶ **Job #' + pending.id + '** (' + pending.title + ') confirmado e enviado para o worker BullMQ!\n\n[⚡ FAST] [🧠 QWEN] [🤖 AUTO]',
          job: pending,
          actions: ['/fast', '/qwen', '/auto'],
          timestamp: new Date().toISOString()
        });
        return true;
      }
    }

    // 1.3.1 Natural Language Project Awareness (V8.3)
    if (lower.indexOf('mostra meus projetos') >= 0 || lower.indexOf('quais projetos existem') >= 0 || lower.indexOf('listar projetos') >= 0 || lower === 'projetos') {
      var registry = require('../projects/project-registry');
      var allP = await registry.getAllProjects();
      var pList = allP.map(function(p) {
        return '• **' + (p.name || p.id) + '** (' + p.id + ') — [' + (p.status || 'ONLINE') + ']\n  ' + (p.description || '') + '\n  Branch: `' + (p.branch || 'main') + '` | Stack: ' + (p.frontend ? p.frontend.framework : 'N/A');
      }).join('\n\n');
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🏢 **Ecossistema de Projetos Gerenciados pelo FÊNIX:**\n\n' + pList,
        projects: allP,
        tokens: 150,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('abre o zapai') >= 0 || lower.indexOf('mostra o zapai') >= 0 || lower.indexOf('status do zapai') >= 0 || lower === 'zapai') {
      var registry = require('../projects/project-registry');
      var pageReg = require('../projects/page-registry');
      var zapai = registry.getProjectById('zapai-crm');
      var zapPages = pageReg.getAllPages('zapai-crm');
      var zapResp = '📱 **ZapAI CRM — Status Operacional:**\n' +
        '• Status: `ONLINE` (PM2 id 0: zapflow-api na porta 4025)\n' +
        '• Repositório: `Biel0071/ZAPAI-FINAL` (branch: `' + (zapai.branch || 'main') + '`)\n' +
        '• Frontend: React 18 + Vite + TypeScript + Tailwind CSS (' + zapPages.length + ' telas registradas)\n' +
        '• Telas principais: `/inbox`, `/dashboard`, `/contacts`, `/campaigns`, `/connections`, `/flows`\n' +
        '• Testes: Playwright UI suite (`hardening-stress.spec.ts`)';
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: zapResp,
        project: zapai,
        pages: zapPages,
        tokens: 120,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('abre o api platform') >= 0 || lower.indexOf('mostra o api platform') >= 0 || lower === 'api platform') {
      var registry = require('../projects/project-registry');
      var ap = registry.getProjectById('api-platform');
      var apResp = '🤖 **API Platform — Status Operacional:**\n' +
        '• Status: `ONLINE` (Docker container `api-platform-api-1` na porta 3001)\n' +
        '• Dashboard: Porta 8081 (`api-platform-dashboard-1`)\n' +
        '• Repositório: `Biel0071/API-PLATAFORM` (branch: `' + (ap.branch || 'main') + '`)\n' +
        '• Stack: Fastify + TypeScript + Prisma ORM + BullMQ\n' +
        '• Provedores: Qwen 2.5 (3B), Ollama, BullMQ Image Workers';
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: apResp,
        project: ap,
        tokens: 110,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('mostra todas as telas') >= 0 || lower.indexOf('quais telas existem') >= 0 || lower.indexOf('mostra as telas') >= 0 || lower === 'telas') {
      var pageReg = require('../projects/page-registry');
      var allPages = pageReg.getAllPages();
      var pagesByProj = {};
      allPages.forEach(function(p) {
        pagesByProj[p.project] = pagesByProj[p.project] || [];
        pagesByProj[p.project].push('`' + p.route + '` (' + p.title + ')');
      });
      var pageTxt = Object.keys(pagesByProj).map(function(proj) {
        return '**' + proj.toUpperCase() + '**:\n' + pagesByProj[proj].join('\n');
      }).join('\n\n');
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🖥️ **Telas Mapeadas no Page Registry Universal:**\n\n' + pageTxt,
        total: allPages.length,
        tokens: 180,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('o que você aprendeu') >= 0 || lower.indexOf('o que voce aprendeu') >= 0 || lower.indexOf('aprendizados') >= 0 || lower === 'conhecimento') {
      var { globalGraphBrain } = require('../brain/graph-brain');
      var patterns = globalGraphBrain.findPatterns();
      var patTxt = patterns.map(function(p) {
        return '• **' + (p.properties.title || p.id) + '**\n  ' + (p.properties.solution || p.properties.principle || '');
      }).join('\n\n');
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🧠 **Graph Brain — Padrões e Aprendizados Consolidados:**\n\n' + (patTxt || 'Nenhum padrão registrado ainda.'),
        patterns: patterns,
        tokens: 130,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('componentes podem ser reutilizados') >= 0 || lower.indexOf('reutilizar componentes') >= 0 || lower.indexOf('reutiliza aquela') >= 0) {
      var compReg = require('../projects/component-registry');
      var comps = compReg.COMPONENTS;
      var cTxt = comps.map(function(c) {
        return '• **' + c.name + '** [' + c.category + '] (Origem: ' + c.project + ')\n  Stack: ' + c.stack + '\n  Comportamento: ' + c.behavior;
      }).join('\n\n');
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: '🧩 **Component Registry — Catálogo de Reutilização Cross-Project:**\n\n' + cTxt,
        components: comps,
        tokens: 160,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 1.4 Handle Slash Commands
    if (rawMessage.startsWith('/')) {
      var parts = rawMessage.slice(1).split(/\s+/);
      var cmd = parts[0].toLowerCase();
      var arg = parts[1] ? parts[1].toLowerCase() : '';

      if (cmd === 'fast') {
        setSelectorMode('FAST');
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '⚡ Modo FAST ativado. Priorizando velocidade máxima com IA rápida.' });
        return true;
      }
      if (cmd === 'auto') {
        setSelectorMode('AUTO');
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '🤖 Modo AUTO ativado. O Fênix escolherá o modelo conforme a complexidade.' });
        return true;
      }
      if (cmd === 'qwen') {
        setSelectorMode('QWEN');
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '🧠 Modo QWEN ativado para raciocínio profundo e engenharia.' });
        return true;
      }
      if (cmd === 'model') {
        if (arg) setSelectorMode(arg);
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: 'Modelo configurado para: `' + getSelectorMode() + '`.' });
        return true;
      }
      if (cmd === 'confirm') {
        if (arg === 'always') setConfirmationMode(CONFIRMATION_MODES.ALWAYS);
        else if (arg === 'never') setConfirmationMode(CONFIRMATION_MODES.NEVER);
        else if (arg === 'smart') setConfirmationMode(CONFIRMATION_MODES.SMART);
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: 'Política de confirmação: `' + getConfirmationMode() + '`.' });
        return true;
      }
      if (cmd === 'queue') {
        if (arg === 'pause' || arg === 'off') {
          await globalJobQueueManager.pauseQueue();
          sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '⏸ Fila de jobs pausada.' });
          return true;
        }
        if (arg === 'resume' || arg === 'on') {
          await globalJobQueueManager.resumeQueue();
          sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '▶ Fila de jobs retomada.' });
          return true;
        }
        var qStatus = globalJobQueueManager.getQueueStatus();
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '⚙ Status da Fila: ' + JSON.stringify(qStatus) });
        return true;
      }
      if (cmd === 'jobs') {
        var jList = globalJobQueueManager.listJobs().slice(0, 5);
        var txt = jList.length ? jList.map(function(j) { return '#' + j.id + ' [' + j.status + '] ' + j.title; }).join('\n') : 'Fila vazia.';
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '📋 Jobs:\n' + txt });
        return true;
      }
      if (cmd === 'job') {
        if (arg === 'retry' && parts[2]) {
          try {
            var ret = await globalJobQueueManager.retryJob(parts[2]);
            sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '🔄 Job #' + ret.id + ' recolocado na fila.' });
          } catch (e) {
            sendJson(res, 200, { ok: false, lane: 'FAST_LANE', response: '❌ Erro ao retentar job: ' + e.message });
          }
          return true;
        }
        if (arg === 'cancel' && parts[2]) {
          try {
            var canc = await globalJobQueueManager.cancelJob(parts[2]);
            sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '🛑 Job #' + canc.id + ' cancelado.' });
          } catch (e) {
            sendJson(res, 200, { ok: false, lane: 'FAST_LANE', response: '❌ Erro ao cancelar job: ' + e.message });
          }
          return true;
        }
        var targetId = arg || parts[1];
        if (targetId) {
          var sJob = globalJobQueueManager.getJob(targetId);
          if (sJob) {
            sendJson(res, 200, {
              ok: true,
              lane: 'FAST_LANE',
              response: '📋 **Job #' + sJob.id + '** [' + sJob.status + ']\n• Título: ' + sJob.title + '\n• Projeto: ' + sJob.projectId + '\n• Modelo: ' + sJob.model + '\n• Tokens: Est ~' + (sJob.tokens ? sJob.tokens.estimated : 0) + ' | Real: ' + (sJob.tokens ? sJob.tokens.actual : 0) + (sJob.result ? '\n• Resultado: ' + sJob.result.slice(0, 150) + '...' : '')
            });
          } else {
            sendJson(res, 200, { ok: false, lane: 'FAST_LANE', response: 'Job #' + targetId + ' não encontrado.' });
          }
          return true;
        }
      }
      if (cmd === 'tokens') {
        var tk = getTokenReport();
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: '📊 Tokens: Total ' + tk.totalActualTokens + ' (Fast: ' + tk.fastLaneTokens + ' | Jobs: ' + tk.jobLaneTokens + ')' });
        return true;
      }
      if (cmd === 'models' || cmd === 'providers') {
        var pv = getProviderStatus();
        sendJson(res, 200, { ok: true, lane: 'FAST_LANE', response: 'Providers:\n' + pv.map(function(p) { return p.name + ': ' + p.status + ' (' + p.model + ')'; }).join('\n') });
        return true;
      }
    }

    // Step 1: Classify message
    var classification = classify(rawMessage, { confirmationMode: body.confirmationMode || getConfirmationMode() });

    // Step 2: Route according to Lane
    if (classification.lane === 'FAST_LANE') {
      var fastResult = await handleFastLane(rawMessage, classification, { actorId: actorId });
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: fastResult.response,
        classification: classification,
        latencyMs: fastResult.latencyMs,
        tokens: fastResult.tokens,
        model: fastResult.model,
        provider: fastResult.provider,
        usedAI: fastResult.usedAI,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // Step 3: JOB LANE Execution Flow with Multi-Layer Enhanced Prompt
    var enhanced = enhance(rawMessage, classification, {
      conversationContext: body.conversationContext || null,
      projectId: classification.targetProject
    });
    var selectedModel = selectModelForTask(classification);

    var jobTitle = enhanced.objective.length > 50 ? enhanced.objective.slice(0, 47) + '...' : enhanced.objective;
    if (classification.classification === 'ANALYSIS') {
      jobTitle = 'Analisar ' + enhanced.projectName;
    } else if (classification.classification === 'CODE_CHANGE') {
      jobTitle = 'Alterar código em ' + enhanced.projectName;
    }

    var requiresConf = classification.requires_confirmation;

    var newJob = globalJobQueueManager.createJob({
      title: jobTitle,
      type: classification.classification.toLowerCase(),
      projectId: enhanced.projectId,
      agentId: 'Gabriel',
      agentName: 'Agente Gabriel',
      model: selectedModel.model,
      provider: selectedModel.provider,
      priority: body.priority || 'NORMAL',
      estimatedTokens: classification.estimated_tokens,
      estimatedTimeSec: classification.estimated_time,
      requiresConfirmation: requiresConf,
      rawPrompt: rawMessage,
      enhancedPrompt: enhanced.formattedPrompt,
      objective: enhanced.objective,
      scope: enhanced.scope
    });

    var responseText = '';
    var interactiveActions = ['/fast', '/qwen', '/auto'];

    if (requiresConf) {
      interactiveActions.push('/confirm');
      responseText = 'Posso fazer pela Fast Lane ou criar um Job.\n\n' +
        'Preparei a tarefa:\n' +
        '**' + jobTitle + '**\n\n' +
        '• **Projeto:** ' + enhanced.projectName + '\n' +
        '• **Modelo:** ' + selectedModel.model + ' (' + selectedModel.provider + ')\n' +
        '• **Estimativa:** ~' + classification.estimated_tokens + ' tokens (~' + classification.estimated_time + 's)\n' +
        '• **Status:** `PENDING_CONFIRMATION`\n\n' +
        '[⚡ FAST] [🧠 QWEN] [🤖 AUTO]\n' +
        '[▶ COLOCAR NA FILA]';
    } else {
      responseText = 'Entendi. Preparei a missão de **' + jobTitle + '** e coloquei na fila BullMQ (Job #' + newJob.id + ').\n' +
        'O Agente especialista foi designado e iniciará o processamento em background sem bloquear o chat.\n\n' +
        '[⚡ FAST] [🧠 QWEN] [🤖 AUTO]';
    }

    sendJson(res, 200, {
      ok: true,
      lane: 'JOB_LANE',
      response: responseText,
      job: newJob,
      confirmationRequired: requiresConf,
      classification: classification,
      selectedModel: selectedModel,
      enhancedPrompt: enhanced.formattedPrompt,
      actions: interactiveActions,
      interactive: true,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // 2. Queue control endpoints
  if (method === 'POST' && pathname === '/api/v2/queue/pause') {
    var pRes = await globalJobQueueManager.pauseQueue();
    sendJson(res, 200, pRes);
    return true;
  }
  if (method === 'POST' && pathname === '/api/v2/queue/resume') {
    var rRes = await globalJobQueueManager.resumeQueue();
    sendJson(res, 200, rRes);
    return true;
  }
  if (method === 'GET' && pathname === '/api/v2/queue/status') {
    sendJson(res, 200, globalJobQueueManager.getQueueStatus());
    return true;
  }
  if (method === 'POST' && pathname === '/api/v2/queue/clear-completed') {
    sendJson(res, 200, globalJobQueueManager.clearCompleted());
    return true;
  }

  // 3. Job action endpoints
  var confirmMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/confirm$/);
  if (method === 'POST' && confirmMatch) {
    var targetJobId = confirmMatch[1];
    try {
      var confJob = await globalJobQueueManager.confirmJob(targetJobId, actorId);
      sendJson(res, 200, { ok: true, job: confJob });
    } catch (e) {
      sendJson(res, 404, { ok: false, error: e.message });
    }
    return true;
  }

  var cancelMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/cancel$/);
  if (method === 'POST' && cancelMatch) {
    var cancelTargetId = cancelMatch[1];
    try {
      var cancJob = await globalJobQueueManager.cancelJob(cancelTargetId);
      sendJson(res, 200, { ok: true, job: cancJob });
    } catch (e) {
      sendJson(res, 404, { ok: false, error: e.message });
    }
    return true;
  }

  var retryMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/retry$/);
  if (method === 'POST' && retryMatch) {
    var retryTargetId = retryMatch[1];
    try {
      var retJob = await globalJobQueueManager.retryJob(retryTargetId);
      sendJson(res, 200, { ok: true, job: retJob });
    } catch (e) {
      sendJson(res, 404, { ok: false, error: e.message });
    }
    return true;
  }

  // Model update endpoint: POST /api/v2/jobs/:id/model
  var modelMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/model$/);
  if (method === 'POST' && modelMatch) {
    var mTargetId = modelMatch[1];
    var mBody = await readJson(req).catch(function() { return {}; });
    var newModel = mBody.model;
    var newProv = mBody.provider;
    if (!newModel) {
      sendJson(res, 400, { ok: false, error: 'model is required' });
      return true;
    }
    try {
      var updated = globalJobQueueManager.updateJobModel(mTargetId, newModel, newProv);
      sendJson(res, 200, { ok: true, job: updated });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
    }
    return true;
  }

  // 4. Job inspect endpoints
  var singleJobMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)$/);
  if (method === 'GET' && singleJobMatch) {
    var sJobId = singleJobMatch[1];
    var sJob = globalJobQueueManager.getJob(sJobId);
    if (sJob) {
      sendJson(res, 200, { ok: true, job: sJob });
    } else {
      sendJson(res, 404, { ok: false, error: 'Job not found' });
    }
    return true;
  }

  // 5. POST & GET /api/v2/jobs — Create and List jobs
  if (method === 'POST' && pathname === '/api/v2/jobs') {
    var cBody = await readJson(req).catch(function() { return {}; });
    var createdJob = globalJobQueueManager.createJob({
      title: cBody.title || ('Job #' + (cBody.type || 'task')),
      type: cBody.type || 'task',
      projectId: cBody.projectId || 'fenix-os',
      agentId: cBody.agentId || 'Gabriel',
      agentName: cBody.agentName || 'Agente Gabriel',
      model: cBody.model || 'qwen2.5:3b',
      provider: cBody.provider || 'API Platform',
      priority: cBody.priority || 'NORMAL',
      estimatedTokens: cBody.estimatedTokens || 600,
      estimatedTimeSec: cBody.estimatedTimeSec || 20,
      requiresConfirmation: Boolean(cBody.requiresConfirmation),
      rawPrompt: cBody.prompt || cBody.rawPrompt || '',
      enhancedPrompt: cBody.enhancedPrompt || '',
      objective: cBody.objective || '',
      scope: cBody.scope || []
    });
    sendJson(res, 201, { ok: true, job: createdJob });
    return true;
  }

  if (method === 'GET' && pathname === '/api/v2/jobs') {
    var statusFilter = url.searchParams.get('status') || undefined;
    var projectFilter = url.searchParams.get('projectId') || undefined;
    var jobsList = globalJobQueueManager.listJobs({ status: statusFilter, projectId: projectFilter });
    var queueStatus = globalJobQueueManager.getQueueStatus();
    sendJson(res, 200, { ok: true, jobs: jobsList, queue: queueStatus });
    return true;
  }

  // 6. Telemetry & Models endpoints
  if (method === 'GET' && pathname === '/api/v2/models') {
    sendJson(res, 200, {
      ok: true,
      currentMode: getSelectorMode(),
      availableModes: ['AUTO', 'FAST', 'QWEN', 'OLLAMA', 'API_PLATFORM'],
      models: [
        { id: 'qwen2.5:3b', name: 'Qwen 2.5 (3B)', provider: 'ollama', role: 'Reasoning & Architecture' },
        { id: 'fast', name: 'Fast AI Model', provider: 'fastEngine', role: 'Instant Chat & Fast Lane' }
      ]
    });
    return true;
  }

  if (method === 'GET' && pathname === '/api/v2/providers') {
    sendJson(res, 200, { ok: true, providers: getProviderStatus() });
    return true;
  }

  if (method === 'GET' && pathname === '/api/v2/tokens') {
    sendJson(res, 200, { ok: true, tokens: getTokenReport() });
    return true;
  }

  return false;
}

module.exports = {
  handleConversationRoutes: handleConversationRoutes
};
