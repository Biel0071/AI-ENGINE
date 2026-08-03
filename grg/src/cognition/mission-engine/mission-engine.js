const { SystemModule } = require('../../kernel/module');
const crypto = require('crypto');

/**
 * MissionEngine v2.0
 * Motor de execução autônomo e REAL.
 * Utiliza o AIGateway para "pensar" os planos e o CapabilityGraph para "agir".
 */
class MissionEngine extends SystemModule {
  constructor(aiGateway, capabilityGraph, eventBus) {
    super('mission_engine', '2.0.0');
    this.aiGateway = aiGateway;
    this.capabilityGraph = capabilityGraph;
    this.eventBus = eventBus;
    this.activeMissions = new Map();
  }

  async submit(goalText, constraints = {}) {
    const missionId = crypto.randomUUID();
    const mission = {
      id: missionId,
      goal: goalText,
      constraints,
      status: 'PLANNING',
      createdAt: Date.now()
    };
    
    this.activeMissions.set(missionId, mission);
    this.eventBus?.publish('mission.submitted', { missionId, goal: goalText });

    // Processamento Assíncrono da Missão
    this._processMission(mission).catch(err => {
      console.error(`[MissionEngine] Falha fatal na missão ${missionId}`, err);
    });

    return missionId;
  }

  async _processMission(mission) {
    try {
      // 1. Planejamento com LLM Real
      console.log(`[MissionEngine] Planejando missão: "${mission.goal}"...`);
      const availableCaps = this.capabilityGraph ? this.capabilityGraph.listCapabilities() : [];
      
      const systemContext = {
        role: "Autonomous Planner",
        availableTools: availableCaps,
        instructions: "Return ONLY a JSON array of steps. Each step must have { action: 'ToolName', params: { key: value }, reason: 'why' }."
      };

      const planResponse = await this.aiGateway.routeAndExecute({
        taskType: 'architecture', 
        prompt: `Create an execution plan for this goal: ${mission.goal}`,
        model: 'llama3' // default fallback
      }, systemContext);

      // Tenta fazer parse do plano (se o modelo não obedeceu perfeitamente ao JSON, usamos um fallback genérico)
      let plan;
      try {
        const jsonMatch = planResponse.text.match(/\[.*\]/s);
        plan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(planResponse.text);
      } catch (e) {
        console.warn(`[MissionEngine] LLM não retornou JSON perfeito. Extraindo plano cru.`);
        plan = [{ action: 'Analyze', reason: planResponse.text }];
      }

      mission.plan = plan;
      mission.status = 'EXECUTING';
      this.eventBus?.publish('mission.planned', { missionId: mission.id, plan: mission.plan });

      // 2. Execução (Chamando as Capabilities Reais)
      const executionLog = [];
      for (const step of plan) {
        console.log(`[MissionEngine] Executando passo: ${step.action} - ${step.reason}`);
        if (this.capabilityGraph && this.capabilityGraph.hasCapability(step.action)) {
          const cap = this.capabilityGraph.getCapability(step.action);
          const result = await cap.execute(step.params || {});
          executionLog.push({ step, result });
        } else {
          executionLog.push({ step, result: 'Capability not found or simulated execution.' });
        }
      }
      
      mission.executionResult = executionLog;
      mission.status = 'COMPLETED';
      this.eventBus?.publish('mission.executed', { missionId: mission.id, result: mission.executionResult });
      this.eventBus?.publish('mission.completed', { missionId: mission.id, finalStatus: mission.status });

      console.log(`[MissionEngine] Missão ${mission.id} concluída com sucesso!`);

    } catch (err) {
      mission.status = 'ERROR';
      mission.error = err.message;
      this.eventBus?.publish('mission.error', { missionId: mission.id, error: err.message }, 0 /* CRITICAL */);
      console.error(`[MissionEngine] Erro durante a missão: ${err.message}`);
    }
  }

  async getMissionState(missionId) {
    return this.activeMissions.get(missionId) || null;
  }
}

module.exports = { MissionEngine };
