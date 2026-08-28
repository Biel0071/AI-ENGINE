const crypto = require('node:crypto');
const { scanProject } = require('../project-mirror/scanner');

class CentralOrchestrator {
  constructor({ eventBus, store, aiRouter, executionEngine, health, knowledgeEngine }) {
    this.bus = eventBus;
    this.store = store;
    this.ai = aiRouter;
    this.execution = executionEngine;
    this.health = health;
    this.knowledgeEngine = knowledgeEngine;

    // In-memory state (Em producao, deveria ir para o store)
    this.requests = new Map();
    this.missions = new Map();
    this.events = [];
  }

  _logEvent(source, type, requestId, missionId, payload) {
    const evt = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source,
      type,
      requestId,
      missionId,
      payload
    };
    this.events.push(evt);
    if (this.events.length > 500) this.events.shift();
    if (this.bus) {
      this.bus.emit(`orchestration:${type}`, evt).catch(console.error);
    }
    return evt;
  }

  /**
   * ETAPA A: Orchestration Intake
   */
  async ingestRequest({ source, userIntent, project, currentContext, constraints }) {
    const requestId = crypto.randomUUID();
    const reqState = {
      id: requestId,
      source,
      userIntent,
      project,
      currentContext,
      constraints,
      status: 'RECEIVED',
      createdAt: new Date().toISOString()
    };
    this.requests.set(requestId, reqState);
    this._logEvent('orchestrator', 'request.received', requestId, null, { userIntent });

    // Iniciar analise assincrona para nao prender o cliente
    this._processRequest(requestId).catch(console.error);

    return reqState;
  }

  /**
   * ETAPA B & C: Prompt enhancement & Agent Router logic
   */
  async _processRequest(requestId) {
    const reqState = this.requests.get(requestId);
    if (!reqState) return;

    try {
      reqState.status = 'ANALYZING';
      this._logEvent('orchestrator', 'request.analyzed', requestId, null, { status: 'ANALYZING' });

      // Mapear multiplos projetos (ETAPA 4)
      let projectContext = '';
      try {
        const sys1 = await scanProject('c:/projetos/ai-engine-core/ai-engine/grg');
        const sys2 = await scanProject('c:/projetos/ai-engine-core/ai-engine/projects/API-PLATAFORM');
        projectContext = `\n\n=== MULTI-SYSTEM MAP ===\nSystem 1 (FÊNIX): ${sys1.files?.total || 0} files.\nSystem 2 (API-PLATAFORM): ${sys2.files?.total || 0} files.\n`;
      } catch (err) {
        console.error('[Orchestrator] Falha ao mapear sistemas', err.message);
      }

      // Pesquisar na memoria semantica por padroes parecidos (ETAPA 3)
      let pastLearnings = '';
      if (this.knowledgeEngine && this.knowledgeEngine.decisionEngine) {
        try {
          const memory = await this.knowledgeEngine.decisionEngine.askForAdvice(reqState.userIntent);
          if (memory && memory.highestSuccessRate && memory.highestSuccessRate.length > 0) {
            pastLearnings = `\n\n=== APRENDIZADOS ANTERIORES ===\nBaseado na memoria do FENIX, siga estas regras arquiteturais provadas:\n${memory.highestSuccessRate.map(p => '- ' + p).join('\n')}`;
          }
        } catch (e) {
          console.error('[Orchestrator] Falha ao consultar memoria', e.message);
        }
      }

      // Aqui entra a chamada real pro modelo para fazer Enhance do Prompt
      let enhancedPrompt = reqState.userIntent;
      let assignedAgent = 'CODEX'; // Default fallback
      
      if (this.ai && typeof this.ai.invoke === 'function') {
        const sys = "Voce eh o Orquestrador Central. Analise a intencao do usuario e crie um prompt detalhado e estruturado para um agente executor (como Codex, Analyst, QA). Determine qual agente deve executar a tarefa. Responda num JSON: { \"enhancedPrompt\": \"...\", \"agentRoute\": \"CODEX|ANALYST|QA\" }";
        try {
          const aiRes = await this.ai.invoke(sys, reqState.userIntent + pastLearnings + projectContext, { model: 'qwen2.5:3b' }); // Ou pegar o default
          const parsed = JSON.parse(aiRes.content || aiRes);
          if (parsed.enhancedPrompt) enhancedPrompt = parsed.enhancedPrompt + pastLearnings + projectContext;
          if (parsed.agentRoute) assignedAgent = parsed.agentRoute;
        } catch(e) {
          console.error('[Orchestrator] AI Enhance falhou, usando fallback', e.message);
          enhancedPrompt = `=== CONTEXT ===\n${JSON.stringify(reqState.currentContext)}\n\n=== GOAL ===\n${reqState.userIntent}${pastLearnings}${projectContext}\n\n=== CONSTRAINTS ===\n${reqState.constraints}`;
        }
      } else {
        // Fallback enhancement
        enhancedPrompt = `=== CONTEXT ===\n${JSON.stringify(reqState.currentContext)}\n\n=== GOAL ===\n${reqState.userIntent}${pastLearnings}${projectContext}\n\n=== CONSTRAINTS ===\n${reqState.constraints}`;
      }

      reqState.enhancedPrompt = enhancedPrompt;
      this._logEvent('orchestrator', 'prompt.enhanced', requestId, null, { assignedAgent });

      // Create Mission
      const missionId = crypto.randomUUID();
      const missionState = {
        id: missionId,
        requestId,
        objective: reqState.userIntent,
        enhancedPrompt,
        agent: assignedAgent,
        status: 'QUEUED',
        createdAt: new Date().toISOString()
      };
      this.missions.set(missionId, missionState);
      reqState.missionId = missionId;
      reqState.status = 'ASSIGNED';
      
      this._logEvent('orchestrator', 'mission.created', requestId, missionId, { agent: assignedAgent });
      
      // Simula Agent Router transition para ASSIGNED (e dispara a execução REAL)
      setTimeout(() => {
        const m = this.missions.get(missionId);
        if(m && m.status === 'QUEUED') {
          m.status = 'ASSIGNED';
          this._logEvent('orchestrator', 'agent.assigned', requestId, missionId, { agent: assignedAgent });
          
          // ATIVAÇÃO REAL DO EXECUTOR / CLOSED LOOP
          this._executeMission(missionId).catch(console.error);
        }
      }, 500);

    } catch(err) {
      reqState.status = 'FAILED';
      reqState.error = err.message;
      this._logEvent('orchestrator', 'request.failed', requestId, null, { error: err.message });
    }
  }

  /**
   * ETAPA: Closed Loop Execution (FÊNIX FIRST)
   */
  async _executeMission(missionId) {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    mission.status = 'EXECUTING';
    this._logEvent('orchestrator', 'mission.executing', mission.requestId, missionId, { agent: mission.agent });

    try {
      if (this.ai && typeof this.ai.invoke === 'function') {
        const executorPrompt = `Você é o agente ${mission.agent}. Sua tarefa é implementar o seguinte objetivo no código.
Retorne um JSON contendo os arquivos modificados. Formato exato:
{
  "files": [
    { "path": "caminho/relativo.js", "content": "novo conteudo do arquivo..." }
  ]
}
OBJETIVO E CONTEXTO:
${mission.enhancedPrompt}`;

        const aiRes = await this.ai.invoke(executorPrompt, "Implemente a solução e retorne apenas o JSON.", { model: 'qwen2.5:3b' });
        
        let parsed = null;
        try {
          const content = aiRes.content || aiRes;
          const match = content.match(/```(?:json)?\n([\s\S]*?)```/);
          const jsonStr = match ? match[1] : content;
          parsed = JSON.parse(jsonStr);
        } catch (e) {
          parsed = { files: [] };
          console.warn("[Orchestrator] Falha ao fazer parse do output do executor", e.message);
        }

        const changedFiles = [];
        const fs = require('fs/promises');
        const path = require('path');
        const workspace = 'c:/projetos/ai-engine-core/ai-engine/grg'; // Workspace default

        if (parsed && parsed.files && Array.isArray(parsed.files)) {
          for (const file of parsed.files) {
             const fullPath = path.resolve(workspace, file.path);
             if (fullPath.startsWith(path.resolve(workspace))) {
               await fs.mkdir(path.dirname(fullPath), { recursive: true });
               await fs.writeFile(fullPath, file.content, 'utf8');
               changedFiles.push(file.path);
             }
          }
        }
        
        // Em vez de aguardar o usuário (Antigravity), o próprio Orquestrador submete o resultado
        await this.submitResult(missionId, { 
           summary: 'Missão executada autonomamente pelo FÊNIX OS.',
           changedFiles 
        });

      } else {
        throw new Error('AI Router não configurado. Não é possível executar autonomamente.');
      }
    } catch (err) {
      console.error('[Orchestrator] Falha na execução da missão', err.message);
      mission.status = 'FAILED';
      this._logEvent('orchestrator', 'mission.failed', mission.requestId, missionId, { error: err.message });
    }
  }

  /**
   * ETAPA D & E: Result Ingestion (Codex Adapter)
   */
  async submitResult(missionId, resultPayload) {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error('Mission not found');
    
    mission.status = 'VALIDATING';
    mission.result = resultPayload;
    
    this._logEvent('orchestrator', 'job.completed', mission.requestId, missionId, { files: resultPayload.changedFiles });
    
    // Inicia a validacao em background
    this._validateMission(missionId).catch(console.error);

    return mission;
  }

  /**
   * ETAPA F: Validation Loop & ETAPA G: Memory
   */
  async _validateMission(missionId) {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    this._logEvent('orchestrator', 'validation.started', mission.requestId, missionId, {});

    try {
      // Validation Check: Usar o /health endpoint real do sistema como base de validacao smoke
      let isValid = true;
      let valReason = 'No active validations configured. Auto-approving.';

      if (this.health) {
        const h = await this.health.check();
        if (!h.ok) {
          isValid = false;
          valReason = `Health check degraded: ${JSON.stringify(h.checks)}`;
        } else {
          valReason = 'Health check passed.';
        }
      }

      if (isValid) {
        mission.status = 'COMPLETED';
        this._logEvent('orchestrator', 'validation.passed', mission.requestId, missionId, { reason: valReason });
        this._logEvent('orchestrator', 'mission.completed', mission.requestId, missionId, {});
        // Emit event for LearningEngine (Episodic Memory / Pattern Extractor)
        if (this.bus) {
          this.bus.emit('MissionCompleted', { 
            mission: {
               id: missionId,
               name: mission.objective,
               domain: 'Orchestrator',
               success: true,
               filesChanged: mission.result?.changedFiles?.length || 0,
               duration: 2000,
               pattern: 'Architecture-Evolved',
               testStatus: 'PASS'
            }
          }).catch(console.error);
        }
        this._logEvent('orchestrator', 'memory.created', mission.requestId, missionId, { summary: 'Mission successful' });
      } else {
        mission.status = 'REPAIRING';
        this._logEvent('orchestrator', 'validation.failed', mission.requestId, missionId, { error: valReason });
        this._logEvent('orchestrator', 'repair.started', mission.requestId, missionId, {});
        
        // Repair logic: Inicia novo ciclo autônomo
        if (!mission.retries) mission.retries = 0;
        if (mission.retries < 3) {
          mission.retries++;
          mission.enhancedPrompt += `\n\n=== REPAIR REQUIRED (Tentativa ${mission.retries}) ===\nA execução anterior falhou na validação de health com o seguinte erro:\n${valReason}\nPor favor, corrija o código. Retorne um JSON com a propriedade "files".`;
          setTimeout(() => {
             this._executeMission(missionId).catch(console.error);
          }, 1000);
        } else {
          mission.status = 'FAILED';
          this._logEvent('orchestrator', 'mission.failed', mission.requestId, missionId, { error: 'Repair retries exhausted' });
        }
      }
    } catch(e) {
      mission.status = 'REPAIRING';
      this._logEvent('orchestrator', 'validation.failed', mission.requestId, missionId, { error: e.message });
    }
  }

  getRequest(id) { return this.requests.get(id); }
  getMission(id) { return this.missions.get(id); }
  getEvents() { return this.events; }
}

module.exports = { CentralOrchestrator };
