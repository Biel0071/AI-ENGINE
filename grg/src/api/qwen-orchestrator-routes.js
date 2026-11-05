/**
 * FÊNIX OS — Qwen Coder & GitHub Project Orchestrator API Routes
 * Endpoints for Browser Bridge, Project Planning, Action Queue Governance, and Mascot Slash Commands.
 * Zero-Mock compliant: returns measured state or descriptive errors.
 */

'use strict';

const { QwenProjectOrchestrator } = require('../services/qwen-orchestrator/qwen-project-orchestrator');

// Singleton instance shared across requests
let globalOrchestrator = null;

function getOrchestrator(app) {
  if (!globalOrchestrator) {
    globalOrchestrator = new QwenProjectOrchestrator({
      githubConnector: app?.github
    });
  }
  return globalOrchestrator;
}

async function handleQwenOrchestratorRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId } = {}) {
  const path = url.pathname;
  if (!path.startsWith('/api/v2/qwen-orchestrator')) {
    return false;
  }

  const orchestrator = getOrchestrator(app);

  try {
    // 1. Status do Orquestrador, Browser e Fila
    if (req.method === 'GET' && path === '/api/v2/qwen-orchestrator/status') {
      const status = orchestrator.getStatus();
      sendJson(res, 200, { ok: true, ...status });
      return true;
    }

    // 2. Conectar / Iniciar Sessão de Navegador (CDP ou Playwright)
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/session/connect') {
      const body = await readJson(req).catch(() => ({}));
      const result = await orchestrator.browserBridge.connectOrLaunch({
        cdpUrl: body.cdpUrl,
        headless: body.headless
      });
      sendJson(res, result.ok ? 200 : 502, result);
      return true;
    }

    // 3. Desconectar Sessão de Navegador
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/session/disconnect') {
      const result = await orchestrator.browserBridge.close();
      sendJson(res, 200, result);
      return true;
    }

    // 4. Planejar Projeto e Gerar Fila de Prompts
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/project/plan') {
      const body = await readJson(req).catch(() => ({}));
      if (!body.name && !body.goal) {
        sendJson(res, 400, { ok: false, error: 'name ou goal é obrigatório para planejar o projeto.' });
        return true;
      }
      const result = await orchestrator.planProject({
        name: body.name || body.goal,
        goal: body.goal || body.name,
        repoName: body.repoName,
        category: body.category || 'fullstack',
        autonomyMode: body.autonomyMode
      });
      sendJson(res, 200, result);
      return true;
    }

    // 5. Listar Projetos Criados
    if (req.method === 'GET' && path === '/api/v2/qwen-orchestrator/projects') {
      sendJson(res, 200, { ok: true, projects: orchestrator.projects, activeProjectId: orchestrator.activeProjectId });
      return true;
    }

    // 6. Consultar Fila de Ações (Action Queue)
    if (req.method === 'GET' && path === '/api/v2/qwen-orchestrator/queue') {
      const projectId = url.searchParams.get('projectId');
      let items = orchestrator.actionQueue;
      if (projectId) {
        items = items.filter((i) => i.projectId === projectId);
      }
      sendJson(res, 200, {
        ok: true,
        mode: orchestrator.autonomyMode,
        total: items.length,
        items
      });
      return true;
    }

    // 7. Aprovar Ação Pendente
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/queue/approve') {
      const body = await readJson(req).catch(() => ({}));
      if (!body.actionId) {
        sendJson(res, 400, { ok: false, error: 'actionId é obrigatório' });
        return true;
      }
      const result = await orchestrator.approveAction(body.actionId);
      sendJson(res, result.ok ? 200 : 500, result);
      return true;
    }

    // 8. Rejeitar Ação
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/queue/reject') {
      const body = await readJson(req).catch(() => ({}));
      if (!body.actionId) {
        sendJson(res, 400, { ok: false, error: 'actionId é obrigatório' });
        return true;
      }
      const result = await orchestrator.rejectAction(body.actionId, body.reason);
      sendJson(res, 200, result);
      return true;
    }

    // 9. Executar Próximo Passo da Fila
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/queue/execute-next') {
      const result = await orchestrator.executeNextStep();
      sendJson(res, result.ok ? 200 : 400, result);
      return true;
    }

    // 10. Alterar Modo de Governança (request, padrao, turbo, acesso_total)
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/mode') {
      const body = await readJson(req).catch(() => ({}));
      if (!body.mode) {
        sendJson(res, 400, { ok: false, error: 'mode é obrigatório (request, padrao, turbo, acesso_total)' });
        return true;
      }
      const result = orchestrator.setMode(body.mode);
      sendJson(res, 200, result);
      return true;
    }

    // 11. Listar Repositórios e PRs do GitHub
    if (req.method === 'GET' && path === '/api/v2/qwen-orchestrator/repos') {
      if (!orchestrator.githubConnector.hasToken()) {
        sendJson(res, 200, {
          ok: true,
          connected: false,
          repositories: [],
          message: 'GitHub não conectado via token. Operações de repositório serão realizadas via browser bridge.'
        });
        return true;
      }
      try {
        const repos = await orchestrator.githubConnector.listUserRepos();
        sendJson(res, 200, { ok: true, connected: true, total: repos.length, repositories: repos });
      } catch (err) {
        sendJson(res, 500, { ok: false, error: err.message });
      }
      return true;
    }

    // 12. Execução de Slash Commands do Mascote (/goal, /plan, /browser, /boost, /learn...)
    if (req.method === 'POST' && path === '/api/v2/qwen-orchestrator/command') {
      const body = await readJson(req).catch(() => ({}));
      const command = String(body.command || '').trim();
      if (!command) {
        sendJson(res, 400, { ok: false, error: 'command é obrigatório' });
        return true;
      }
      const result = await orchestrator.handleCommand(command);
      sendJson(res, 200, { ok: true, ...result });
      return true;
    }

    // Rota desconhecida sob o prefixo /api/v2/qwen-orchestrator
    sendJson(res, 404, { ok: false, error: `Rota não encontrada: ${path}` });
    return true;
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
    return true;
  }
}

function resetOrchestrator() {
  if (globalOrchestrator) {
    globalOrchestrator.stop();
    globalOrchestrator = null;
  }
}

module.exports = { handleQwenOrchestratorRoutes, getOrchestrator, resetOrchestrator };
