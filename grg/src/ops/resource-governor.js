'use strict';
/**
 * FÊNIX OS — Resource Governor
 * ============================
 * Regulador de recursos computacionais e semáforo de concorrência.
 *
 * Invariantes de Produção:
 * 1. Concorrência de Evolução = 1 estrito (nunca executar 2 loops simultâneos).
 * 2. Concorrência de Ollama / LLM = 1 estrito (evita esgotar RAM/VRAM na VPS).
 * 3. Limite de Heap: Throttles se heapUsed exceder maxHeapMb (default 512MB).
 * 4. Limite de Memória Livre: Throttles se freeMem do sistema for < minFreeMemMb (default 250MB).
 * 5. Telemetria honesta: Zero mocks, tudo medido em tempo real.
 */

const os = require('os');
const { EventEmitter } = require('events');

class ResourceGovernor extends EventEmitter {
  /**
   * @param {object} options
   * @param {number} [options.maxHeapMb]          - Limite de heap do Node.js (default 512 MB)
   * @param {number} [options.minFreeMemMb]       - Mínimo de RAM livre do sistema (default 250 MB)
   * @param {number} [options.maxCpuPercent]      - Limite de CPU (default 85%)
   * @param {number} [options.maxConcurrent]      - Concorrência de missões (default 1)
   * @param {number} [options.ollamaConcurrency]  - Concorrência de chamadas LLM (default 1)
   * @param {object} [options.logger]             - Logger
   */
  constructor(options = {}) {
    super();
    this.maxHeapMb = options.maxHeapMb || Number(process.env.FENIX_GOVERNOR_MAX_HEAP_MB || 512);
    this.minFreeMemMb = options.minFreeMemMb || Number(process.env.FENIX_GOVERNOR_MIN_FREE_RAM_MB || 250);
    this.maxCpuPercent = options.maxCpuPercent || Number(process.env.FENIX_GOVERNOR_MAX_CPU_PERCENT || 85);
    this.maxConcurrent = options.maxConcurrent || 1;
    this.ollamaConcurrency = options.ollamaConcurrency || 1;
    this.logger = options.logger || console;

    this._activeEvolutions = 0;
    this._activeOllamaCalls = 0;
    this._ollamaWaitQueue = [];
    this._throttled = false;
  }

  getSystemMetrics() {
    const mem = process.memoryUsage();
    const heapUsedMb = Math.round(mem.heapUsed / (1024 * 1024));
    const heapTotalMb = Math.round(mem.heapTotal / (1024 * 1024));
    const rssMb = Math.round(mem.rss / (1024 * 1024));
    const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const loadAvg = os.loadavg();

    return {
      heapUsedMb,
      heapTotalMb,
      rssMb,
      freeMemMb,
      totalMemMb,
      loadAvg,
      activeEvolutions: this._activeEvolutions,
      activeOllamaCalls: this._activeOllamaCalls,
      ollamaQueueLength: this._ollamaWaitQueue.length
    };
  }

  /**
   * Checa se o sistema tem recursos suficientes para iniciar uma nova evolução.
   * @returns {{ allowed: boolean, reason?: string, metrics: object }}
   */
  canExecute() {
    const metrics = this.getSystemMetrics();

    // 1. Checa concorrência de evolução
    if (this._activeEvolutions >= this.maxConcurrent) {
      return {
        allowed: false,
        reason: `Concorrência máxima atingida (${this._activeEvolutions}/${this.maxConcurrent})`,
        metrics
      };
    }

    // 2. Checa limite de heap do Node
    if (metrics.heapUsedMb > this.maxHeapMb) {
      this._throttled = true;
      return {
        allowed: false,
        reason: `Heap do processo muito alto (${metrics.heapUsedMb}MB > ${this.maxHeapMb}MB limit)`,
        metrics
      };
    }

    // 3. Checa memória livre do SO
    if (metrics.freeMemMb < this.minFreeMemMb) {
      this._throttled = true;
      return {
        allowed: false,
        reason: `Memória RAM livre do sistema insuficiente (${metrics.freeMemMb}MB < ${this.minFreeMemMb}MB limit)`,
        metrics
      };
    }

    this._throttled = false;
    return {
      allowed: true,
      metrics
    };
  }

  /**
   * Adquire um slot para execução de evolução.
   * @returns {boolean}
   */
  acquireEvolutionSlot() {
    const check = this.canExecute();
    if (!check.allowed) {
      this.logger.warn?.(`[ResourceGovernor] Execução barrada: ${check.reason}`);
      return false;
    }
    this._activeEvolutions++;
    this.emit('evolution:slot_acquired', { active: this._activeEvolutions });
    return true;
  }

  /**
   * Libera um slot de execução de evolução.
   */
  releaseEvolutionSlot() {
    if (this._activeEvolutions > 0) {
      this._activeEvolutions--;
      this.emit('evolution:slot_released', { active: this._activeEvolutions });
    }
  }

  /**
   * Semáforo de concorrência para chamadas LLM/Ollama.
   * @returns {Promise<void>}
   */
  async acquireOllamaSlot() {
    if (this._activeOllamaCalls < this.ollamaConcurrency) {
      this._activeOllamaCalls++;
      return;
    }

    return new Promise((resolve) => {
      this._ollamaWaitQueue.push(resolve);
    });
  }

  /**
   * Libera um slot de Ollama e acorda o próximo na fila.
   */
  releaseOllamaSlot() {
    if (this._ollamaWaitQueue.length > 0) {
      const nextResolve = this._ollamaWaitQueue.shift();
      nextResolve();
    } else if (this._activeOllamaCalls > 0) {
      this._activeOllamaCalls--;
    }
  }

  isThrottled() {
    return this._throttled;
  }
}

module.exports = {
  ResourceGovernor
};
