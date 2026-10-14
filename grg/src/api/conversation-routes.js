'use strict';
const path = require('node:path');
/**
 * FÊNIX OS V8.2 — Conversation & Intelligent Dual-Lane Routes
 * Dispatches Fast Lane vs Job Lane requests, handles interactive model switching,
 * queue controls, and delivers real runtime model & token telemetry.
 */

var { classify, setConfirmationMode, getConfirmationMode, CONFIRMATION_MODES } = require('../routing/conversation-router');
var { setSelectorMode, getSelectorMode, getProviderStatus, getTokenReport, parseNaturalLanguageModelCommand } = require('../routing/model-router');
var { globalJobQueueManager } = require('../execution/job-queue-manager');
var { handle: handleFastLane } = require('../execution/fast-lane-engine');

async function openConversation(app, tenantId, actorId, body, projectId, message) {
  if (!app?.conversations || typeof app.conversations.open !== 'function' || typeof app.conversations.append !== 'function') {
    const error = new Error('conversation persistence is unavailable');
    error.code = 'CONVERSATION_STORE_UNAVAILABLE';
    throw error;
  }
  const conversation = await app.conversations.open(tenantId, actorId, {
    conversationId: body.conversationId || null,
    agentId: body.agentId || null,
    projectId: projectId || null,
    title: String(body.title || message || '').slice(0, 80) || null,
  });
  await app.conversations.append(tenantId, actorId, conversation.id, { role: 'user', content: message, source: 'text' });
  return conversation;
}

async function conversationPrompt(app, tenantId, actorId, conversationId, message) {
  if (typeof app.conversations.buildPrompt !== 'function') return message;
  const prompt = await app.conversations.buildPrompt(tenantId, actorId, conversationId, message, {
    system: 'Você é o assistente do Fênix OS. Responda em português, use apenas fatos presentes no contexto e não diga que uma ação foi concluída sem evidência do runtime.',
  });
  return (prompt.messages || []).map((item) => `${item.role}: ${item.content}`).join('\n\n');
}

function missionStepFor(classification) {
  switch (classification.classification) {
    case 'CODE_CHANGE': return 'dev-execute';
    case 'DEPLOY_OPERATION':
    case 'PROJECT_OPERATION':
    case 'MISSION':
    case 'TASK': return 'orchestrate';
    case 'BROWSER_OPERATION': return 'browser-qa';
    default: return 'inspect';
  }
}

async function resolveProjectWorkspace(app, tenantId, actorId, projectId) {
  if (!app?.projectKernel || typeof app.projectKernel.list !== 'function') {
    const error = new Error('project registry is unavailable');
    error.code = 'PROJECT_REGISTRY_UNAVAILABLE';
    throw error;
  }
  const projects = await app.projectKernel.list(tenantId, actorId);
  const project = projects.find((item) => String(item.id) === String(projectId));
  if (!project) {
    const error = new Error(`project is not available to this user: ${projectId}`);
    error.code = 'PROJECT_NOT_FOUND';
    throw error;
  }
  const configuredWorkspace = project.workspace || app.fileSystemService?.workspaceRoot || app.workspaceRoot;
  if (!configuredWorkspace || typeof configuredWorkspace !== 'string') {
    const error = new Error('project has no configured workspace');
    error.code = 'PROJECT_WORKSPACE_UNAVAILABLE';
    throw error;
  }
  const workspace = path.resolve(configuredWorkspace);
  const configuredRoots = [
    app.fileSystemService?.workspaceRoot,
    app.workspaceRoot,
    ...(Array.isArray(app.allowedProjectRoots) ? app.allowedProjectRoots : []),
    ...String(process.env.FENIX_ALLOWED_PROJECT_ROOTS || '').split(/[;,]/).filter(Boolean),
  ].filter((root) => typeof root === 'string' && root.trim());
  const roots = [...new Set((configuredRoots.length ? configuredRoots : [process.cwd()]).map((root) => path.resolve(root)))];
  const allowed = roots.some((root) => {
    const relative = path.relative(root, workspace);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  });
  if (!allowed) {
    const error = new Error('project workspace is outside configured project roots');
    error.code = 'PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT';
    throw error;
  }
  return { project, workspace };
}

async function handleConversationRoutes(req, res, url, sendJson, readJson, identity, app) {
  if (!url) {
    try { url = new URL(req.url, 'http://127.0.0.1:4400'); } catch (_) { url = { pathname: req.url || '/' }; }
  }
  if (typeof sendJson !== 'function') {
    sendJson = function(res, code, data) {
      if (!res.headersSent) res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(data));
    };
  }
  if (typeof readJson !== 'function') {
    readJson = async function(req) {
      var body = '';
      for await (var chunk of req) body += chunk;
      return body ? JSON.parse(body) : {};
    };
  }
  var pathname = url.pathname;
  var method = req.method;
  var actorId = (identity && identity.actorId) || 'grg-admin';
  var tenantId = (identity && identity.tenantId) || 'grg';

  // 1. POST /api/v2/conversation — Main Dual-Lane Entrypoint
  if (method === 'POST' && pathname === '/api/v2/conversation') {
    var reqStart = Date.now();
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
        latencyMs: Date.now() - reqStart,
        actions: [
          { type: 'send_command', command: '/fast', label: '⚡ FAST' },
          { type: 'send_command', command: '/qwen', label: '🧠 QWEN' },
          { type: 'send_command', command: '/auto', label: '🤖 AUTO' }
        ],
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
        latencyMs: Date.now() - reqStart,
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
        latencyMs: Date.now() - reqStart,
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
        latencyMs: Date.now() - reqStart,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // Approval is tied to a specific persisted Mission step. Never approve the
    // first item in a process-global legacy queue based on an ambiguous “yes”.
    if (['coloca na fila', 'colocar na fila', 'enfileirar', 'pode executar'].includes(lower)) {
      const approval = body.missionId && body.stepId && body.approvalId;
      if (!approval || !app?.missions || typeof app.missions.approveStep !== 'function') {
        sendJson(res, 409, { ok: false, error: 'APPROVAL_CONTEXT_REQUIRED', message: 'A aprovação precisa apontar para a missão e etapa exibidas em Operações.' });
        return true;
      }
      const mission = await app.missions.approveStep(tenantId, actorId, body.missionId, body.stepId, body.approvalId);
      const step = mission.steps.find((item) => item.id === body.stepId);
      const job = step?.jobId && app.jobs?.get ? await app.jobs.get(tenantId, actorId, step.jobId) : null;
      sendJson(res, 202, {
        ok: true, lane: 'MISSION_LANE', missionId: mission.id, jobId: step?.jobId || null,
        status: mission.status, mission, job,
        response: step?.jobId ? `Aprovação registrada. Job ${step.jobId} está em ${job?.status || step.status}.` : 'Aprovação registrada; a etapa está sendo encaminhada pelo Mission Kernel.',
        actions: [{ type: 'switch_view', view: 'view-operations', label: 'Ver missão e execução' }],
      });
      return true;
    }

    // 1.3.1 Natural Language Project Awareness (V8.3)
    if (lower.indexOf('mostra meus projetos') >= 0 || lower.indexOf('quais projetos existem') >= 0 || lower.indexOf('listar projetos') >= 0 || lower === 'projetos') {
      if (!app?.projectKernel?.list) {
        sendJson(res, 503, { ok: false, error: 'PROJECT_REGISTRY_UNAVAILABLE' });
        return true;
      }
      const allP = await app.projectKernel.list(tenantId, actorId);
      const projects = allP.map((project) => ({
        id: project.id, name: project.name, branch: project.branch || null,
        lifecycle: project.lifecycle || null, maturity: project.maturity || null,
      }));
      const pList = projects.map((project) => `• **${project.name || project.id}** (${project.id}) · ${project.maturity || project.lifecycle || 'cadastrado'}${project.branch ? ` · branch ${project.branch}` : ''}`).join('\n');
      const conversation = await openConversation(app, tenantId, actorId, body, body.projectId || null, rawMessage);
      const response = projects.length ? `Projetos cadastrados no Project Kernel (${projects.length}):\n\n${pList}` : 'O Project Kernel não possui projetos cadastrados para esta organização.';
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: response, source: 'text' });
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response,
        conversationId: conversation.id,
        projects,
        latencyMs: Date.now() - reqStart,
        actions: [{ type: 'switch_view', view: 'view-projects', label: 'Abrir Projetos' }],
        tokens: null,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('abre o zapai') >= 0 || lower.indexOf('mostra o zapai') >= 0 || lower.indexOf('status do zapai') >= 0 || lower === 'zapai') {
      const projects = app?.projectKernel?.list ? await app.projectKernel.list(tenantId, actorId) : [];
      const zapai = projects.find((project) => project.id === 'zapai-crm') || null;
      const response = zapai
        ? `ZapAI CRM está cadastrado no Project Kernel${zapai.branch ? ` na branch ${zapai.branch}` : ''}. A saúde do serviço não foi medida por esta consulta.`
        : 'ZapAI CRM não está cadastrado no Project Kernel desta organização.';
      const conversation = await openConversation(app, tenantId, actorId, body, zapai?.id || null, rawMessage);
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: response, source: 'text' });
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response,
        conversationId: conversation.id,
        project: zapai ? { id: zapai.id, name: zapai.name, branch: zapai.branch || null, maturity: zapai.maturity || null } : null,
        latencyMs: Date.now() - reqStart,
        actions: [
          ...(zapai ? [{ type: 'open_ide_project', projectId: zapai.id, label: 'Abrir ZapAI no IDE' }] : []),
          { type: 'switch_view', view: 'view-projects', label: '📱 Ver Telas ZapAI' }
        ],
        tokens: null,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    if (lower.indexOf('abre o api platform') >= 0 || lower.indexOf('mostra o api platform') >= 0 || lower === 'api platform') {
      const projects = app?.projectKernel?.list ? await app.projectKernel.list(tenantId, actorId) : [];
      const ap = projects.find((project) => project.id === 'api-platform' || project.id === 'api-platform-live') || null;
      const response = ap
        ? `API Platform está cadastrado no Project Kernel${ap.branch ? ` na branch ${ap.branch}` : ''}. A saúde do serviço e dos provedores não foi medida por esta consulta.`
        : 'API Platform não está cadastrado no Project Kernel desta organização.';
      const conversation = await openConversation(app, tenantId, actorId, body, ap?.id || null, rawMessage);
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: response, source: 'text' });
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response,
        conversationId: conversation.id,
        project: ap ? { id: ap.id, name: ap.name, branch: ap.branch || null, maturity: ap.maturity || null } : null,
        latencyMs: Date.now() - reqStart,
        actions: [
          ...(ap ? [{ type: 'open_ide_project', projectId: ap.id, label: 'Abrir no IDE' }] : []),
          { type: 'switch_view', view: 'view-projects', label: '🤖 Detalhes do Projeto' }
        ],
        tokens: null,
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
        latencyMs: Date.now() - reqStart,
        actions: [
          { type: 'switch_view', view: 'view-projects', label: '🖥️ Central de Telas' }
        ],
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
        latencyMs: Date.now() - reqStart,
        actions: [
          { type: 'switch_view', view: 'view-knowledge', label: '🧠 Graph Brain' }
        ],
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
        latencyMs: Date.now() - reqStart,
        actions: [
          { type: 'switch_view', view: 'view-projects', label: '🧩 Componentes' }
        ],
        tokens: 160,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 1.4 Handle Slash Commands
    if (rawMessage.startsWith('/') && !/^\/(?:queue|jobs?|tokens|models|providers)(?:\s|$)/i.test(rawMessage)) {
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

    // Route a bounded read-only Fênix audit through the canonical Mission/Job/Tool path.
    // Mutating requests keep the existing approval workflow and never enter this branch.
    if (isReadOnlySystemAudit(rawMessage)) {
      if (!app?.auditRepositoryRoot || !app?.missionPlanner || !app?.missions || !app?.jobs || !app?.conversations || !app?.tools) {
        sendJson(res, 503, { ok: false, error: 'read-only audit pipeline is unavailable' });
        return true;
      }

      const projectId = String(body.projectId || classification.targetProject || 'fenix-os').slice(0, 128);
      let projectContext;
      try {
        projectContext = await resolveProjectWorkspace(app, tenantId, actorId, projectId);
      } catch (error) {
        const status = error.code === 'PROJECT_NOT_FOUND' ? 404 : error.code === 'PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT' ? 403 : 503;
        sendJson(res, status, { ok: false, error: error.code || 'PROJECT_WORKSPACE_UNAVAILABLE' });
        return true;
      }
      const conversation = await app.conversations.open(tenantId, actorId, {
        conversationId: body.conversationId || null,
        title: rawMessage.slice(0, 80),
        projectId,
      });
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'user', content: rawMessage, source: 'text' });

      const planning = await app.missionPlanner.plan(tenantId, actorId, {
        title: 'Auditoria somente leitura do Fênix',
        objective: rawMessage,
        mode: 'AUDIT',
        projectId,
        context: { root: '.', workspacePath: projectContext.workspace, conversationId: conversation.id },
        policy: { maxTokens: 0, maxCostUsd: 0 },
        autoStart: false,
      });
      if (!planning.mission) {
        sendJson(res, 503, { ok: false, error: 'planner did not materialize an audit mission', plan: planning.plan });
        return true;
      }

      const progressText = `Plano AUDIT somente leitura criado. Vou consultar o workspace via system.readonly.audit; missão ${planning.mission.id}.`;
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: progressText, source: 'text' });
      const mission = await app.missions.start(tenantId, actorId, planning.mission.id);
      const auditStep = mission.steps.find((step) => step.type === 'audit');
      const job = auditStep?.jobId ? await app.jobs.get(tenantId, actorId, auditStep.jobId) : null;

      sendJson(res, 202, {
        ok: true,
        lane: 'MISSION_LANE',
        response: progressText,
        conversationId: conversation.id,
        intent: { classification: classification.classification, risk: 'LOW', readOnly: true },
        plan: planning.plan,
        approval: { required: false, policy: 'GREEN_READ_ONLY' },
        mission,
        job,
        tool: { id: 'system.readonly.audit', status: job?.status || 'PENDING' },
        realtime: { stream: `mission:${mission.id}`, sse: true },
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    // Step 2: Route according to Lane
    if (classification.lane === 'FAST_LANE') {
      let conversation;
      try {
        conversation = await openConversation(app, tenantId, actorId, body, body.projectId || classification.targetProject, rawMessage);
      } catch (error) {
        sendJson(res, error.code === 'CONVERSATION_STORE_UNAVAILABLE' ? 503 : 403, { ok: false, error: error.code || 'CONVERSATION_PERSISTENCE_FAILED' });
        return true;
      }
      let fastResult;
      try {
        const prompt = await conversationPrompt(app, tenantId, actorId, conversation.id, rawMessage);
        fastResult = await handleFastLane(rawMessage, classification, { actorId, tenantId, app, prompt });
        await app.conversations.append(tenantId, actorId, conversation.id, {
          role: 'assistant', content: fastResult.response, source: 'text',
          tokens: fastResult.tokens || null, model: fastResult.model || null,
        });
      } catch (error) {
        if (error.code === 'AI_PROVIDER_UNAVAILABLE') {
          sendJson(res, 503, { ok: false, error: 'AI_PROVIDER_UNAVAILABLE', conversationId: conversation.id });
          return true;
        }
        if (['QUEUE_CONTROL_UNAVAILABLE', 'JOB_RUNTIME_UNAVAILABLE', 'PROVIDER_CATALOG_UNAVAILABLE', 'TOKEN_TELEMETRY_UNAVAILABLE'].includes(error.code)) {
          sendJson(res, 503, { ok: false, error: error.code, conversationId: conversation.id });
          return true;
        }
        throw error;
      }
      var fastActions = [
        { type: 'send_command', command: '/fast', label: '⚡ FAST' },
        { type: 'send_command', command: '/qwen', label: '🧠 QWEN' },
        { type: 'send_command', command: '/auto', label: '🤖 AUTO' }
      ];
      if (lower.indexOf('projeto') >= 0 || lower.indexOf('ide') >= 0) {
        fastActions.unshift({ type: 'switch_view', view: 'view-projects', label: '🏢 Projetos' });
        fastActions.unshift({ type: 'open_ide_project', projectId: 'api-platform-live', label: '📂 Abrir IDE' });
      } else if (lower.indexOf('cidade') >= 0 || lower.indexOf('city') >= 0) {
        fastActions.unshift({ type: 'switch_view', view: 'view-city', label: '🏙️ Cidade IA' });
      } else if (lower.indexOf('agente') >= 0) {
        fastActions.unshift({ type: 'switch_view', view: 'view-agents', label: '👥 Agentes' });
      }
      sendJson(res, 200, {
        ok: true,
        lane: 'FAST_LANE',
        response: fastResult.response,
        conversationId: conversation.id,
        classification: classification,
        latencyMs: fastResult.latencyMs || (Date.now() - reqStart),
        tokens: fastResult.tokens,
        model: fastResult.model,
        provider: fastResult.provider,
        usedAI: fastResult.usedAI,
        actions: fastActions,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // Step 3: Persist the conversation and dispatch through MissionKernel.
    if (!app?.missions || typeof app.missions.create !== 'function' || typeof app.missions.start !== 'function') {
      sendJson(res, 503, { ok: false, error: 'MISSION_RUNTIME_UNAVAILABLE' });
      return true;
    }
    const projectId = String(body.projectId || classification.targetProject || 'fenix-os').slice(0, 128);
    const conversation = await openConversation(app, tenantId, actorId, body, projectId, rawMessage);
    let projectContext;
    try {
      projectContext = await resolveProjectWorkspace(app, tenantId, actorId, projectId);
    } catch (error) {
      const status = error.code === 'PROJECT_NOT_FOUND' ? 404 : error.code === 'PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT' ? 403 : 503;
      sendJson(res, status, { ok: false, error: error.code || 'PROJECT_WORKSPACE_UNAVAILABLE', conversationId: conversation.id });
      return true;
    }

    const stepType = missionStepFor(classification);
    if (app.jobs?.handlers instanceof Map && !app.jobs.handlers.has(({ 'dev-execute': 'development.execute', orchestrate: 'project.orchestrate', 'browser-qa': 'frontend-reality.scan', inspect: 'inspection.run' })[stepType])) {
      sendJson(res, 503, { ok: false, error: 'MISSION_HANDLER_UNAVAILABLE', stepType, conversationId: conversation.id });
      return true;
    }
    const jobTitle = rawMessage.length > 200 ? `${rawMessage.slice(0, 197)}...` : rawMessage;
    let mission = null;
    let started = null;
    try {
      mission = await app.missions.create(tenantId, actorId, {
        title: jobTitle,
        objective: rawMessage,
        projectId,
        priority: body.priority === 'HIGH' ? 1 : 0,
        policy: { maxTokens: classification.estimated_tokens, maxCostUsd: null },
        contextRefs: [{ type: 'MEMORY', ref: `conversation:${conversation.id}` }],
        steps: [{
          key: 'execute', type: stepType,
          payload: {
            prompt: rawMessage,
            projectId,
            projectPath: projectContext.workspace,
            workspacePath: projectContext.workspace,
            context: { projectId, conversationId: conversation.id, requestSource: 'conversation' },
          },
        }],
      });
      started = await app.missions.start(tenantId, actorId, mission.id);
    } catch (_) {
      const latest = mission?.id && typeof app.missions.get === 'function'
        ? await app.missions.get(tenantId, actorId, mission.id).catch(() => mission)
        : mission;
      const failedStep = latest?.steps?.find((item) => item.key === 'execute') || latest?.steps?.[0] || null;
      const errorCode = mission ? 'MISSION_DISPATCH_FAILED' : 'MISSION_CREATE_FAILED';
      const failureText = mission
        ? `A missão ${mission.id} foi registrada, mas não foi iniciada. O runtime precisa ser verificado; a execução não foi marcada como concluída.`
        : 'Não foi possível registrar a missão no runtime. Nenhuma execução foi confirmada.';
      await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: failureText, source: 'text' }).catch(() => {});
      sendJson(res, 503, {
        ok: false, error: errorCode, response: failureText,
        conversationId: conversation.id, missionId: latest?.id || mission?.id || null,
        jobId: failedStep?.jobId || null, status: latest?.status || 'FAILED', mission: latest || null,
      });
      return true;
    }
    const step = (started.steps || []).find((item) => item.key === 'execute') || started.steps?.[0] || null;
    const jobId = step?.jobId || null;
    const job = jobId && typeof app.jobs?.get === 'function' ? await app.jobs.get(tenantId, actorId, jobId) : null;
    const state = started.status || step?.status || 'PLANNED';
    const responseText = state === 'AWAITING_APPROVAL' || step?.status === 'AWAITING_APPROVAL'
      ? `Missão ${started.id} registrada para ${projectContext.project.name}. A etapa aguarda aprovação; nenhum job de execução foi iniciado.`
      : jobId
        ? `Missão ${started.id} registrada para ${projectContext.project.name}. Job ${jobId} está em ${job?.status || step.status}.`
        : `Missão ${started.id} registrada para ${projectContext.project.name} com estado ${state}.`;
    await app.conversations.append(tenantId, actorId, conversation.id, { role: 'assistant', content: responseText, source: 'text' });
    sendJson(res, 202, {
      ok: true, lane: 'MISSION_LANE', response: responseText,
      conversationId: conversation.id, missionId: started.id, jobId,
      status: state, mission: started, job,
      approval: step?.approvalId ? { id: step.approvalId, stepId: step.id, required: true } : { required: false },
      classification,
      latencyMs: Date.now() - reqStart,
      actions: [
        { type: 'switch_view', view: 'view-operations', label: 'Ver missão e execução' },
        { type: 'switch_view', view: 'view-city', label: 'Acompanhar na Cidade' },
      ],
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // Queue routes are delegated to universal-job-routes, which reads and controls
  // the persistent JobEngine/BullMQ runtime rather than this legacy in-memory queue.

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

  var pauseMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/pause$/);
  if (method === 'POST' && pauseMatch) {
    var pauseTargetId = pauseMatch[1];
    try {
      var pJob = await globalJobQueueManager.pauseJob(pauseTargetId);
      sendJson(res, 200, { ok: true, job: pJob });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
    }
    return true;
  }

  var resumeMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/resume$/);
  if (method === 'POST' && resumeMatch) {
    var resumeTargetId = resumeMatch[1];
    try {
      var rJob = await globalJobQueueManager.resumeJob(resumeTargetId);
      sendJson(res, 200, { ok: true, job: rJob });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
    }
    return true;
  }

  var approveMatch = pathname.match(/^\/api\/v2\/jobs\/([^/]+)\/approve$/);
  if (method === 'POST' && approveMatch) {
    var approveTargetId = approveMatch[1];
    try {
      var appJob = await globalJobQueueManager.confirmJob(approveTargetId, actorId);
      sendJson(res, 200, { ok: true, job: appJob });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
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

  // 5.5 POST /api/v2/chat/inspect-file — Universal File Forensic & Reverse Analysis
  if (method === 'POST' && pathname === '/api/v2/chat/inspect-file') {
    var fBody = await readJson(req).catch(function() { return {}; });
    var fileName = String(fBody.name || 'arquivo_desconhecido');
    var fileSize = Number(fBody.size || 0);
    var sha256 = String(fBody.sha256 || '');
    var entropy = Number(fBody.entropy || 0);
    var format = String(fBody.format || 'UNKNOWN');
    var details = fBody.details || {};
    var strings = Array.isArray(fBody.strings) ? fBody.strings : [];

    var isHighEntropy = entropy >= 7.65;
    var isCompressed = entropy >= 6.80 && entropy < 7.65;

    var recommendations = [];
    if (isHighEntropy) {
      recommendations.push('Heurística de decriptografia: testar entropia de blocos de 16/32 bytes para identificar CBC/GCM.');
      recommendations.push('Verificar packers conhecidos (UPX, VMProtect, Themida) ou dados empacotados.');
    }
    if (format === 'ANDROID_APK') {
      recommendations.push('Desempacotar classes.dex para Smali ou bytecode Java.');
      recommendations.push('Auditar permissões perigosas em AndroidManifest.xml.');
    } else if (format === 'IOS_IPA') {
      recommendations.push('Extrair Info.plist e verificar entitlements de segurança.');
    } else if (format === 'PDF_DOCUMENT') {
      if (details.isEncrypted) {
        recommendations.push('Documento PDF com dicionário /Encrypt ativo (requer senha de abertura/permissão).');
      } else {
        recommendations.push('Documento PDF não criptografado. Metadados e streams acessíveis.');
      }
    } else if (format.startsWith('EXEC_')) {
      recommendations.push('Desmontar cabeçalhos de seções (.text, .data, .rodata) e tabela de símbolos.');
    }

    var result = {
      ok: true,
      analyzedAt: new Date().toISOString(),
      file: {
        name: fileName,
        size: fileSize,
        sha256: sha256,
        entropy: entropy,
        entropyVerdict: isHighEntropy ? 'ENCRYPTED_OR_PACKED' : (isCompressed ? 'COMPRESSED' : 'STRUCTURED_OR_PLAIN'),
        format: format,
        details: details,
        stringsExtracted: strings.length,
        recommendations: recommendations
      }
    };

    if (fBody.createJob) {
      var revJob = globalJobQueueManager.createJob({
        title: 'Engenharia Reversa: ' + fileName + ' (' + format + ')',
        type: 'reverse_engineering',
        projectId: fBody.projectId || 'fenix-os',
        agentId: 'Gabriel',
        agentName: 'Agente Gabriel (Security & Reverse Brain)',
        model: 'qwen2.5:3b',
        provider: 'API Platform',
        priority: 'HIGH',
        estimatedTokens: 1200,
        estimatedTimeSec: 45,
        rawPrompt: 'Realizar análise forense aprofundada, decriptografia heurística e extração de símbolos do arquivo ' + fileName + ' (SHA-256: ' + sha256 + ', Entropia: ' + entropy + ')',
        objective: 'Extrair IOCs, desempacotar estruturas e gerar relatório de engenharia reversa',
        scope: [fileName]
      });
      result.job = revJob;
    }

    sendJson(res, 200, result);
    return true;
  }

  // 6. Telemetry & Models endpoints
  if (method === 'GET' && pathname === '/api/v2/models') {
    if (!app?.controlPlane || !app?.aiRouter?.connectors) {
      sendJson(res, 503, { ok: false, error: 'AI_PROVIDER_CATALOG_UNAVAILABLE', currentMode: getSelectorMode(), models: [] });
      return true;
    }
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
    const runtime = app.aiRouter.connectors;
    const ids = runtime.list().filter((id) => id.startsWith('ai:'));
    const providers = await Promise.all(ids.map(async (id) => {
      const [health, connector] = await Promise.all([
        runtime.status(tenantId, actorId, id),
        Promise.resolve(runtime.connectors.get(id)),
      ]);
      const modelResult = typeof connector?.models === 'function' ? connector.models() : null;
      const models = modelResult?.state === 'measured' ? modelResult.value : (Array.isArray(modelResult) ? modelResult : []);
      const measuredState = health?.state?.state === 'measured' ? health.state.value : 'UNKNOWN';
      return { id: id.slice(3), state: measuredState, models: Array.isArray(models) ? models : [] };
    }));
    sendJson(res, 200, {
      ok: true,
      currentMode: getSelectorMode(),
      providers,
      models: providers.flatMap((provider) => provider.models.map((id) => ({ id, provider: provider.id, state: provider.state }))),
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

function isReadOnlySystemAudit(value) {
  const text = String(value || '').toLowerCase();
  const asksToInspect = /\b(?:analisa(?:r|e)?|an[aá]lise|audita(?:r)?|audite|auditoria|audit|inspecion(?:a|e|ar)|diagnostic(?:a|e|ar)|analyze|inspect|diagnose)\b/.test(text);
  const namesSystem = /\b(?:f[eê]nix|sistema|runtime|workspace|vps|reposit[oó]rio)\b/.test(text);
  const asksToMutate = /\b(?:corrige|corrigir|corrija|altera|alterar|altere|modifica|modificar|modifique|implementa|implementar|implemente|deploy|reinicia|reiniciar|reinicie|reboot|apaga|apagar|delete|deletar)\b/.test(text);
  return asksToInspect && namesSystem && !asksToMutate;
}

module.exports = {
  handleConversationRoutes: handleConversationRoutes,
  isReadOnlySystemAudit: isReadOnlySystemAudit,
};
