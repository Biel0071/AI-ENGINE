const { SystemModule } = require('../kernel/module');
const { STATE_MACHINE } = require('../kernel/states');
const crypto = require('crypto');

/**
 * CognitiveBank (Memory Bank v2.0)
 * Evolução da memória para armazenamento profundo de Problemas -> Soluções -> Eficiência.
 * Interage com o Qdrant (via IStorage) para vetorização.
 */
class CognitiveBank extends SystemModule {
  constructor(vectorStorage, eventBus) {
    super('cognitive_bank', '2.0.0');
    this.storage = vectorStorage;
    this.eventBus = eventBus;
    this.status = STATE_MACHINE.BOOT;
  }

  async start() {
    this.status = STATE_MACHINE.READY;
    console.log('[CognitiveBank] Acordando bancos de memória profunda...');
    
    // Teste de conexão com o Storage
    if (this.storage && typeof this.storage.connect === 'function') {
        await this.storage.connect();
    }
    
    this.status = STATE_MACHINE.ONLINE;
    this.startTime = Date.now();
  }

  async stop() {
    this.status = STATE_MACHINE.SHUTDOWN;
    if (this.storage && typeof this.storage.disconnect === 'function') {
        await this.storage.disconnect();
    }
  }

  /**
   * Arquiva o resultado de uma missão para aprendizado futuro.
   */
  async archiveMissionResult(mission) {
    const memoryRecord = {
      memoryId: crypto.randomUUID(),
      type: 'MISSION_RESULT',
      problem: {
        description: mission.goal,
        constraints: mission.constraints
      },
      solution: {
        plan: mission.plan
      },
      metrics: {
        success: mission.status === 'COMPLETED',
        validationScore: mission.validation ? mission.validation.score : 0
      },
      timestamp: new Date().toISOString()
    };

    // Aqui vetorizamos o `mission.goal` e salvamos no Qdrant para similaridade
    if (this.storage) {
        // memoryRecord.vectorRef = await this.storage.embedAndStore(memoryRecord);
    }
    
    this.eventBus?.publish('memory.archived', { memoryId: memoryRecord.memoryId }, 4 /* BACKGROUND */);
    return memoryRecord.memoryId;
  }

  /**
   * Busca memorias parecidas com um novo problema para atalhar a Missão.
   */
  async recallSimilarProblem(problemDescription) {
    if (!this.storage) return [];
    
    console.log(`[CognitiveBank] Buscando memórias para: "${problemDescription}"`);
    // return await this.storage.searchSimilarity(problemDescription, { limit: 3 });
    return [];
  }

  async health() {
    return {
      ok: this.status === STATE_MACHINE.ONLINE,
      status: this.status,
      details: {
        storageConnected: !!this.storage
      }
    };
  }
}

module.exports = { CognitiveBank };
