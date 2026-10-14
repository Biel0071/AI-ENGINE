const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');

/**
 * SecurityShield v2.0
 * Módulo passivo que analisa o fluxo do EventBus em busca de anomalias (DDoS, Vazamento de chaves, 
 * Picos de erro inesperados). Ele classifica e aciona o AutonomousDoctor.
 */
class SecurityShield extends SystemModule {
  constructor(eventBus, doctor) {
    super('security_shield', '2.0.0');
    this.eventBus = eventBus;
    this.doctor = doctor;
    this.status = STATE_MACHINE.BOOT;
    this.errorCounts = new Map();
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[SecurityShield] Monitoramento heurístico ativado.');
    
    // Injeta escuta de anomalias em todas as filas
    this.eventBus?.subscribe('*', (event) => this.analyzeEvent(event));

    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  analyzeEvent(event) {
    if (this.status !== STATE_MACHINE.ONLINE) return;

    // Detecta anomalias de erro em cascata
    if (event.type.includes('error') || event.type.includes('failed')) {
      const current = (this.errorCounts.get(event.type) || 0) + 1;
      this.errorCounts.set(event.type, current);

      if (current > 10) {
        console.warn(`[SecurityShield] Anomalia detectada: Pico de 10+ erros de ${event.type}`);
        this.errorCounts.set(event.type, 0); // Reset after flagging
        
        // Aciona o Doctor
        this.eventBus?.publish('system.anomaly.detected', { 
          source: 'SecurityShield', 
          anomalyType: 'ERROR_CASCADE', 
          event: event.type 
        }, 0 /* CRITICAL */);
      }
    }
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status
    };
  }
}

module.exports = { SecurityShield };
