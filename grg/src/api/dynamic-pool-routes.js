'use strict';

/**
 * FÊNIX OS — DYNAMIC AGENT POOL & POPUP API ROUTES
 * ==================================================
 * REST endpoints for dynamic workforce scaling, task pop-ups,
 * and Human-in-the-Loop governance.
 */

const { globalDynamicPoolManager } = require('../agents/dynamic-pool-manager');
const { getWorldStateEngine } = require('../world-model/world-state-engine');

async function handleDynamicPoolRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId } = {}) {
  // 1. GET /api/v2/agents/pool - Retrieve pool telemetry and active agents
  if (req.method === 'GET' && url.pathname === '/api/v2/agents/pool') {
    try {
      const worldEngine = getWorldStateEngine();
      globalDynamicPoolManager.syncWithWorldState(worldEngine);

      const state = globalDynamicPoolManager.getPoolState();
      sendJson(res, 200, {
        ok: true,
        source: 'DynamicPoolManager',
        pool: state
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // 2. POST /api/v2/agents/pool/scale - Scale pool dynamically (10, 20, 50, 100, etc.)
  if (req.method === 'POST' && url.pathname === '/api/v2/agents/pool/scale') {
    try {
      const body = await readJson(req);
      if (body.autoScale !== undefined) {
        globalDynamicPoolManager.setAutoScale(body.autoScale);
      }
      
      const targetSize = body.targetSize !== undefined ? body.targetSize : body.size;
      let result = { ok: true, note: 'autoScale adjusted' };

      if (targetSize !== undefined) {
        result = globalDynamicPoolManager.scale(targetSize, {
          reason: body.reason || `manual_scale_by_${actorId || 'operator'}`
        });
        
        // Keep 3D World in sync
        const worldEngine = getWorldStateEngine();
        globalDynamicPoolManager.syncWithWorldState(worldEngine);
      }

      sendJson(res, 200, {
        ok: true,
        source: 'DynamicPoolManager',
        result,
        pool: globalDynamicPoolManager.getPoolState()
      });
      return true;
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
      return true;
    }
  }

  // 3. GET /api/v2/agents/popups - List active pop-up tasks
  if (req.method === 'GET' && url.pathname === '/api/v2/agents/popups') {
    try {
      const popups = Array.from(globalDynamicPoolManager.pendingPopups.values());
      sendJson(res, 200, {
        ok: true,
        source: 'DynamicPoolManager',
        count: popups.length,
        popups
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // 4. POST /api/v2/agents/tasks/:taskId/approve - Human-in-the-Loop task approval
  const approveMatch = url.pathname.match(/^\/api\/v2\/agents\/tasks\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    try {
      const taskId = decodeURIComponent(approveMatch[1]);
      const body = await readJson(req);
      const result = globalDynamicPoolManager.approveTask(taskId, {
        feedback: body.feedback,
        approvedBy: actorId || 'operator'
      });

      if (!result.ok) {
        sendJson(res, 404, result);
        return true;
      }

      sendJson(res, 200, {
        ok: true,
        source: 'DynamicPoolManager',
        taskId,
        message: 'Tarefa aprovada com sucesso. Agente disparado em execução.',
        result
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // 5. POST /api/v2/agents/tasks/:taskId/reject - Reject task
  const rejectMatch = url.pathname.match(/^\/api\/v2\/agents\/tasks\/([^/]+)\/reject$/);
  if (req.method === 'POST' && rejectMatch) {
    try {
      const taskId = decodeURIComponent(rejectMatch[1]);
      const body = await readJson(req);
      const result = globalDynamicPoolManager.rejectTask(taskId, {
        reason: body.reason || 'Rejeição manual',
        rejectedBy: actorId || 'operator'
      });

      if (!result.ok) {
        sendJson(res, 404, result);
        return true;
      }

      sendJson(res, 200, {
        ok: true,
        source: 'DynamicPoolManager',
        taskId,
        result
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // 6. POST /api/v2/agents/test-task - Quick test task trigger for live demo
  if (req.method === 'POST' && url.pathname === '/api/v2/agents/test-task') {
    try {
      const body = await readJson(req);
      const titles = [
        'Analisar e otimizar rotas de alta frequência',
        'Auditoria de segurança zero-trust no cofre relacional',
        'Reconstruir componentes visuais da HUD Cyberpunk',
        'Executar suite de regressão Playwright no 3D World',
        'Indexar novos embeddings neurais no Qdrant Vector DB',
        'Auto-escalonar pool de agentes para pico de missões'
      ];
      const roles = ['DEVELOPER', 'SECURITY', 'FRONTEND', 'QA', 'DATABASE', 'ORCHESTRATOR'];
      const randomIdx = Math.floor(Math.random() * titles.length);

      const title = body.title || titles[randomIdx];
      const role = body.role || roles[randomIdx];
      const objective = body.objective || `Execução cognitiva de alta fidelidade: ${title}`;

      const popup = globalDynamicPoolManager.createTaskPopup({
        title,
        objective,
        role,
        requiresApproval: body.requiresApproval !== undefined ? body.requiresApproval : true,
        payload: {
          generatedBy: 'test_trigger',
          priority: 'HIGH',
          timestamp: new Date().toISOString()
        }
      });

      sendJson(res, 201, {
        ok: true,
        source: 'DynamicPoolManager',
        message: 'Tarefa de teste criada e pop-up acionado!',
        popup
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  // 7. POST /api/v2/agents/parallel-dispatch - Dispatch batch of tasks for parallel agent execution
  if (req.method === 'POST' && url.pathname === '/api/v2/agents/parallel-dispatch') {
    try {
      const body = await readJson(req);
      const tasks = Array.isArray(body.tasks) ? body.tasks : [];
      if (tasks.length === 0) {
        sendJson(res, 400, { ok: false, error: 'Envie um array de tarefas no campo "tasks"' });
        return true;
      }

      const report = globalDynamicPoolManager.dispatchParallelTasks(tasks, {
        autoScaleIfOverloaded: body.autoScale !== undefined ? body.autoScale : true
      });

      // Keep 3D world in sync
      const worldEngine = getWorldStateEngine();
      globalDynamicPoolManager.syncWithWorldState(worldEngine);

      sendJson(res, 201, {
        ok: true,
        source: 'DynamicPoolManager',
        report
      });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
      return true;
    }
  }

  return false;
}

module.exports = {
  handleDynamicPoolRoutes
};
