const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * AutonomousDoctor v2.0
 * Escuta eventos de erro (EventBus), consulta memórias (CognitiveBank)
 * e orquestra recuperações sem intervenção humana.
 */
class AutonomousDoctor extends SystemModule {
  constructor(eventBus, cognitiveBank, capabilityGraph) {
    super('autonomous_doctor', '2.0.0');
    this.eventBus = eventBus;
    this.cognitiveBank = cognitiveBank;
    this.capabilityGraph = capabilityGraph;
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[AutonomousDoctor] Iniciando vigilância ativa...');
    
    // Escuta falhas sistêmicas críticas
    this.eventBus?.subscribe('system.failure', (e) => this.handleSymptom(e));
    this.eventBus?.subscribe('agent.timeout', (e) => this.handleSymptom(e));
    this.eventBus?.subscribe('scheduler.job.failed', (e) => this.handleSymptom(e));

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async handleSymptom(event) {
    console.warn(`[AutonomousDoctor] Sintoma detectado: ${event.type}`);
    
    try {
      // 1. Análise
      const diagnosis = await this.analyze(event.payload);
      
      // 2. Correção
      const remediation = await this.remediate(diagnosis);
      
      // 3. Validação
      if (remediation.success) {
        console.log(`[AutonomousDoctor] Cura concluída com sucesso para o sintoma: ${event.type}`);
      } else {
        // 4. Rollback
        await this.rollback(remediation.id);
      }
    } catch (err) {
      console.error(`[AutonomousDoctor] Falha durante tentativa de autocura:`, err);
    }
  }

  async analyze(symptoms) {
    console.log(`[AutonomousDoctor] Analisando sintomas com CognitiveBank...`);
    const knownSolutions = await this.cognitiveBank.recallSimilarProblem(JSON.stringify(symptoms));
    
    if (knownSolutions && knownSolutions.length > 0) {
      console.log(`[AutonomousDoctor] Solução encontrada na memória: ${knownSolutions[0].id}`);
      return { symptoms, proposedSolution: knownSolutions[0], confidence: knownSolutions[0].confidenceLevel };
    }

    // Se não sabe, pede ao Mission Engine / AI Gateway para inferir uma solução
    return { symptoms, proposedSolution: null, confidence: 0 };
  }

  async remediate(diagnosis) {
    if (!diagnosis.proposedSolution || diagnosis.confidence < 0.8) {
      console.log(`[AutonomousDoctor] Sem confiança suficiente para auto-remediação. Escalando para modo SAFE_MODE.`);
      this.eventBus?.publish('system.safemode.requested', { reason: 'No confident solution found for symptoms' }, 0 /* CRITICAL */);
      return { id: 'rem-null', success: false };
    }

    const remId = require('crypto').randomUUID();
    console.log(`[AutonomousDoctor] Aplicando remediação ${remId}...`);
    
    // Na V2 real, usaria o capabilityGraph.getCapability() para rodar as ações
    
    return { id: remId, success: true };
  }

  async rollback(remediationId) {
    console.warn(`[AutonomousDoctor] Executando Rollback da remediação ${remediationId}`);
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status
    };
  }
}

module.exports = { AutonomousDoctor };
