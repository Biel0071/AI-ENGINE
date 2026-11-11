'use strict';
/**
 * AutonomousMissionRunner — SANDBOX v2
 * Proposta: prop-eef9043d-5933-461e-a976-56e5fc718970
 * Experimento: exp-20260917-014507
 *
 * MUDANÇAS vs v1:
 * 1. emitEvent() agora gera eventId único em CADA evento
 * 2. TOOL_FAILED emitido em falha (v1 emitia TOOL_COMPLETED com status FAILED)
 * 3. Conexão bidirecional: subscreve bus events de ToolRegistry (tool.started/completed/failed)
 * 4. runId propagado para ToolRegistry.execute() como context.runId
 * 5. BrainAgentEngine.remember() chamado via app.brainEngine (se disponível)
 * 6. Tarefa crítica com falha → MISSION_FAILED (não continua silenciosamente)
 * 7. Memória episódica referencia missionId + runId + eventId
 */

let _uuidCounter = 0;
function uuid() {
  _uuidCounter++;
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${_uuidCounter}`;
}

class AutonomousMissionRunner {
  constructor({ app, tenantId, actorId } = {}) {
    this.app = app;
    this.tenantId = tenantId || 'grg';
    this.actorId = actorId || 'grg-admin';
    this.runs = [];
    this.emittedEvents = [];
    this.insights = [];
    this.proposals = [];
    this._busUnsubs = [];

    // BIDIRECTIONAL: subscribe to ToolRegistry events from FenixEventBus
    if (this.app?.bus) {
      this._busUnsubs.push(
        this.app.bus.on('execution.tool.started', (ev) => {
          this._onToolBusEvent('BUS_TOOL_STARTED', ev);
        }),
        this.app.bus.on('execution.tool.completed', (ev) => {
          this._onToolBusEvent('BUS_TOOL_COMPLETED', ev);
        }),
        this.app.bus.on('execution.tool.failed', (ev) => {
          this._onToolBusEvent('BUS_TOOL_FAILED', ev);
        })
      );
    }

    // Load aiClient
    try {
      const { FenixIntelligenceClient } = require('../clients/fenix-intelligence-client');
      this.aiClient = new FenixIntelligenceClient({ app });
    } catch (e) {
      this.aiClient = null;
    }
  }

  /** Called whenever ToolRegistry emits to bus — bidirectional proof */
  _onToolBusEvent(label, ev) {
    this.emittedEvents.push({
      eventId: `busev-${uuid()}`,
      source: 'TOOL_REGISTRY_BUS',
      label,
      payload: ev.payload,
      at: ev.at
    });
  }

  /** Unsubscribe bus listeners after mission ends */
  _cleanup() {
    for (const unsub of this._busUnsubs) {
      if (typeof unsub === 'function') unsub();
    }
    this._busUnsubs = [];
  }

  /**
   * Emit a named event to FenixEventBus + record locally.
   * Returns the full event record with unique eventId.
   */
  async emitEvent(type, payload) {
    const eventId = `ev-${uuid()}`;
    const record = { eventId, type, payload, at: new Date().toISOString() };
    this.emittedEvents.push(record);
    if (this.app?.bus) {
      await this.app.bus.emit(type, { ...payload, eventId });
    }
    return record;
  }

  /**
   * runMission — full GOVERNED EVOLUTION cycle
   */
  async runMission({ title, userIntent } = {}) {
    const missionId = `mis-${uuid()}`;
    const startTime = Date.now();

    // 1. REGISTER autonomous tools
    if (this.app?.tools) {
      try {
        const { registerAutonomousTools } = require('../execution/autonomous-tools');
        await registerAutonomousTools(this.app.tools, this.tenantId);
      } catch (e) {
        console.warn('[Fênix] registerAutonomousTools warning:', e.message);
      }
    }

    // 2. MISSION_CREATED + MISSION_STARTED
    await this.emitEvent('MISSION_CREATED', { missionId, title, userIntent, status: 'CREATED' });
    await this.emitEvent('MISSION_STARTED', { missionId, status: 'IN_PROGRESS' });

    // 3. TASK DAG
    const tasks = [
      {
        taskId: `task-${uuid()}`,
        name: 'Análise do Repositório',
        agentId: 'agent-architect',
        toolId: 'tool-repo-analyzer',
        input: { rootPath: '/opt/fenix-os/grg/src' },
        critical: true
      },
      {
        taskId: `task-${uuid()}`,
        name: 'Inspeção de Capacidades',
        agentId: 'agent-capability',
        toolId: 'tool-capability-inspector',
        input: {},
        critical: true
      },
      {
        taskId: `task-${uuid()}`,
        name: 'Sonda de Runtime',
        agentId: 'agent-devops',
        toolId: 'tool-runtime-prober',
        input: {},
        critical: false
      },
      {
        taskId: `task-${uuid()}`,
        name: 'Análise de Gaps',
        agentId: 'agent-gap',
        toolId: 'tool-gap-analyzer',
        input: {},
        critical: true
      },
      {
        taskId: `task-${uuid()}`,
        name: 'Consolidação de Memória',
        agentId: 'agent-memory',
        toolId: 'tool-memory-recorder',
        input: {},
        critical: false
      }
    ];

    const taskResults = {};
    let missionFailed = false;
    let failureReason = null;

    // 4. EXECUTE tasks
    for (const task of tasks) {
      if (missionFailed) break;

      const runId = `run-${uuid()}`;

      await this.emitEvent('TASK_CREATED',   { missionId, taskId: task.taskId, name: task.name, agentId: task.agentId, status: 'PLANNED' });
      await this.emitEvent('TASK_ASSIGNED',  { missionId, taskId: task.taskId, agentId: task.agentId, status: 'ASSIGNED' });
      await this.emitEvent('TASK_STARTED',   { missionId, taskId: task.taskId, agentId: task.agentId, runId, status: 'IN_PROGRESS' });
      await this.emitEvent('TOOL_STARTED',   { missionId, taskId: task.taskId, agentId: task.agentId, toolId: task.toolId, runId });

      // Build input for dependent tasks
      let executionInput = task.input;
      if (task.toolId === 'tool-gap-analyzer') {
        executionInput = {
          repoAnalysis:   taskResults['tool-repo-analyzer'],
          capabilities:   taskResults['tool-capability-inspector'],
          runtime:        taskResults['tool-runtime-prober']
        };
      } else if (task.toolId === 'tool-memory-recorder') {
        const gapResult = taskResults['tool-gap-analyzer'];
        const repoResult = taskResults['tool-repo-analyzer'];
        executionInput = {
          agentId: 'agent-architect',
          memoryType: 'episodic',
          content: `Missão ${missionId}: Analisados ${repoResult?.totalModulesCount} módulos (${repoResult?.totalLinesOfCode} LOC). Próximo ponto: ${gapResult?.nextTechnicalConnectionPoint?.title}. runId rastreável.`,
          contextRefs: [
            { type: 'MISSION', ref: missionId },
            { type: 'REPO',    ref: '/opt/fenix-os/grg/src' }
          ]
        };
      }

      // EXECUTE via ToolRegistry — pass runId for traceability
      let execResult = null;
      let execStatus = 'SUCCEEDED';
      let execError  = null;
      const taskStart = Date.now();

      try {
        if (!this.app?.tools) throw new Error('ToolRegistry instance unavailable');
        const res = await this.app.tools.execute(
          this.tenantId,
          this.actorId,
          task.toolId,
          executionInput,
          { jobId: task.taskId, missionId, runId } // runId injected
        );
        execResult = res.result;
      } catch (err) {
        execStatus = 'FAILED';
        execError  = err.message;
        console.error(`[ToolRegistry FAIL] ${task.toolId}:`, err.message);
      }

      const durationMs = Date.now() - taskStart;
      taskResults[task.toolId] = execResult;

      this.runs.push({
        runId,
        taskId:      task.taskId,
        agentId:     task.agentId,
        toolId:      task.toolId,
        status:      execStatus,
        durationMs,
        startedAt:   new Date(taskStart).toISOString(),
        completedAt: new Date().toISOString(),
        error:       execError
      });

      if (execStatus === 'SUCCEEDED') {
        // FIX: TOOL_COMPLETED only on real success
        await this.emitEvent('TOOL_COMPLETED', {
          missionId, taskId: task.taskId, agentId: task.agentId,
          toolId: task.toolId, runId, status: 'SUCCEEDED', durationMs
        });
        await this.emitEvent('TASK_COMPLETED', {
          missionId, taskId: task.taskId, agentId: task.agentId,
          runId, status: 'COMPLETED', durationMs
        });

        // BrainEngine memory (bidirectional)
        if (this.app?.brainEngine) {
          try {
            this.app.brainEngine.remember(task.agentId, 'episodic',
              `Tool ${task.toolId} SUCCEEDED (runId=${runId}, durationMs=${durationMs})`);
            this.app.brainEngine.handleCityEvent('TASK_COMPLETED', task.agentId, { missionId, runId });
          } catch (_) {}
        }

      } else {
        // FIX: TOOL_FAILED on failure — NOT TOOL_COMPLETED
        await this.emitEvent('TOOL_FAILED', {
          missionId, taskId: task.taskId, agentId: task.agentId,
          toolId: task.toolId, runId, status: 'FAILED', durationMs, error: execError
        });
        await this.emitEvent('TASK_FAILED', {
          missionId, taskId: task.taskId, agentId: task.agentId,
          runId, status: 'FAILED', durationMs, error: execError
        });

        if (task.critical) {
          missionFailed = true;
          failureReason = `Critical task ${task.taskId} (${task.toolId}) failed: ${execError}`;
        }
      }
    }

    // 5. MISSION_FAILED path
    if (missionFailed) {
      await this.emitEvent('MISSION_FAILED', {
        missionId, status: 'FAILED', reason: failureReason,
        durationMs: Date.now() - startTime
      });
      this._cleanup();
      return {
        missionId, status: 'FAILED', reason: failureReason,
        runs: this.runs, events: this.emittedEvents, durationMs: Date.now() - startTime
      };
    }

    // 6. AI SYNTHESIS
    let aiRes = { text: null, provider: 'none', latencyMs: 0, status: 'skipped' };
    if (this.aiClient) {
      try {
        const repoResult = taskResults['tool-repo-analyzer'];
        const gapResult  = taskResults['tool-gap-analyzer'];
        const capResult  = taskResults['tool-capability-inspector'];
        const prompt = `Auditoria Fênix OS v2 — Bidirectional EventBus ativado:\n- Módulos: ${repoResult?.totalModulesCount}, LOC: ${repoResult?.totalLinesOfCode}.\n- Catálogo: ${capResult?.governedStepsCount} passos.\n- Próximo ponto: ${gapResult?.nextTechnicalConnectionPoint?.title}.\nInstrução: 2 frases diretas — diagnóstico e recomendação.`;
        aiRes = await this.aiClient.complete({ prompt, model: 'qwen2.5:0.5b', provider: 'ollama' });
      } catch (e) {
        aiRes = { text: `AI error: ${e.message}`, provider: 'none', latencyMs: 0, status: 'error' };
      }
    }

    // 7. OBSERVATION + INSIGHT + PROPOSAL
    const repoResult = taskResults['tool-repo-analyzer'];
    const gapResult  = taskResults['tool-gap-analyzer'];
    const capResult  = taskResults['tool-capability-inspector'];

    const obsEv = await this.emitEvent('OBSERVATION_CREATED', {
      missionId,
      source: 'REAL_EXECUTION_v2',
      evidence: {
        totalModules:     repoResult?.totalModulesCount,
        totalLOC:         repoResult?.totalLinesOfCode,
        pillars:          repoResult?.primaryPillarsFound,
        capabilities:     capResult?.governedStepsCount,
        aiProvider:       aiRes.provider,
        aiStatus:         aiRes.status,
        runsCompleted:    this.runs.filter(r => r.status === 'SUCCEEDED').length,
        bidirectionalBus: true
      }
    });

    const insight = {
      id:               `ins-${uuid()}`,
      missionId,
      obsEventId:       obsEv.eventId,
      title:            'Conexão Bidirecional FenixEventBus+ToolRegistry Activada',
      finding:          `Runner v2 subscreve eventos do ToolRegistry (BUS_TOOL_STARTED/COMPLETED/FAILED). Cada execução propaga runId rastreável. TOOL_FAILED agora distinguido de TOOL_COMPLETED.`,
      cognitiveAnalysis: aiRes.text || 'Sem síntese AI.',
      aiProviderUsed:    aiRes.provider,
      aiLatencyMs:       aiRes.latencyMs
    };
    this.insights.push(insight);
    await this.emitEvent('INSIGHT_CREATED', insight);

    const proposal = {
      id:          `prop-${uuid()}`,
      missionId,
      title:       gapResult?.nextTechnicalConnectionPoint?.title || 'Promoção para Produção',
      description: gapResult?.nextTechnicalConnectionPoint?.description,
      status:      'AWAITING_HUMAN_APPROVAL',
      safetyLevel: 'LEVEL_2_SANDBOX'
    };
    this.proposals.push(proposal);
    await this.emitEvent('PROPOSAL_CREATED', proposal);

    await this.emitEvent('MISSION_COMPLETED', {
      missionId, status: 'SUCCESS',
      durationMs:    Date.now() - startTime,
      tasksCompleted: tasks.length,
      eventsEmitted:  this.emittedEvents.length,
      runIds:         this.runs.map(r => r.runId)
    });

    this._cleanup();

    return {
      missionId,
      status: 'SUCCESS',
      title,
      tasks,
      runs:       this.runs,
      events:     this.emittedEvents,
      taskResults,
      aiSynthesis: aiRes,
      insight,
      proposal,
      durationMs: Date.now() - startTime
    };
  }
}

module.exports = { AutonomousMissionRunner };
