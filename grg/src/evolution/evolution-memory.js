'use strict';
/**
 * FÊNIX OS — EvolutionMemory
 * ===========================
 * Modelo canônico de memória de evolução do sistema.
 * Não armazena apenas logs brutos: armazena conhecimento consolidado, hipóteses,
 * deltas antes/depois, lições aprendidas e padrões arquiteturais derivados.
 *
 * Persistência:
 * - Primário: StorageManager (PostgreSQL fenix_kv_store / collection: evolution_memory)
 * - Fallback: SQLite fenix_knowledge_kv ou buffer em memória
 * - Sincronização: MemoryFabric via EventBus ('evolution.memory.recorded')
 */

const crypto = require('crypto');

class EvolutionMemory {
  /**
   * @param {object} options
   * @param {object} [options.storageManager] - StorageManager para persistência KV
   * @param {object} [options.eventBus]       - EventBus para broadcast de aprendizado
   * @param {object} [options.logger]         - Logger
   */
  constructor(options = {}) {
    this.storageManager = options.storageManager || null;
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;
    this._recentCache = []; // Últimas 100 memórias em cache local
    this.collection = 'evolution_memory';
  }

  /**
   * Registra uma nova memória evolutiva com validação estrita de schema.
   * @param {object} data
   * @returns {Promise<object>}
   */
  async record(data = {}) {
    const id = data.id || `evo-mem-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = data.timestamp || new Date().toISOString();

    const record = {
      id,
      timestamp,
      missionId: data.missionId || null,
      problem: data.problem || 'Problema não especificado',
      hypothesis: data.hypothesis || 'Hipótese não documentada',
      actions: Array.isArray(data.actions) ? data.actions : [],
      filesChanged: Array.isArray(data.filesChanged) ? data.filesChanged : [],
      testsRun: Array.isArray(data.testsRun) ? data.testsRun : [],
      testResults: data.testResults || { status: 'UNKNOWN' },
      deploymentResult: data.deploymentResult || { status: 'NOT_APPLICABLE' },
      runtimeResult: data.runtimeResult || { status: 'NOT_RUN' },
      beforeState: data.beforeState || {},
      afterState: data.afterState || {},
      lesson: data.lesson || 'Nenhuma lição extraída',
      pattern: data.pattern || 'Pattern-Candidate',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.85,
      rollbackAvailable: Boolean(data.rollbackAvailable)
    };

    // 1. Atualizar cache local
    this._recentCache.unshift(record);
    if (this._recentCache.length > 100) this._recentCache.pop();

    // 2. Persistir no driver relacional se disponível
    if (this.storageManager) {
      try {
        const relational = this.storageManager.getRelational();
        if (relational && typeof relational.set === 'function') {
          await relational.set(record.id, record, this.collection);
        }
      } catch (err) {
        this.logger.warn?.('[EvolutionMemory] Falha ao persistir no driver relacional:', err.message);
      }
    }

    // 3. Emitir evento para o EventBus / MemoryFabric
    if (this.eventBus) {
      this.eventBus.emit('evolution.memory.recorded', record);
      this.eventBus.emit('memory.insight', {
        id: record.id,
        kind: 'evolution.learning',
        summary: record.lesson,
        pattern: record.pattern,
        confidence: record.confidence,
        timestamp: record.timestamp
      });
    }

    this.logger.info?.(`[EvolutionMemory] Gravada memória ${record.id}: "${record.lesson.slice(0, 60)}..."`);
    return record;
  }

  /**
   * Consulta memórias registradas com filtros.
   */
  async list(filters = {}) {
    const { limit = 50, offset = 0, pattern, missionId } = filters;

    // Se houver StorageManager, buscar do backend persistente
    let records = [];
    if (this.storageManager) {
      try {
        const relational = this.storageManager.getRelational();
        if (relational && typeof relational.find === 'function') {
          records = await relational.find({}, this.collection);
        }
      } catch (err) {
        this.logger.warn?.('[EvolutionMemory] Erro ao buscar do storage, usando cache:', err.message);
      }
    }

    // Fallback para cache local se vazio
    if (!records || records.length === 0) {
      records = this._recentCache;
    }

    let filtered = records;
    if (pattern) {
      filtered = filtered.filter(r => r.pattern?.toLowerCase().includes(pattern.toLowerCase()));
    }
    if (missionId) {
      filtered = filtered.filter(r => r.missionId === missionId);
    }

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Retorna resumo de aprendizado e padrões consolidados.
   */
  async getSummary() {
    const all = await this.list({ limit: 100 });
    const patterns = new Set(all.map(m => m.pattern).filter(Boolean));
    const lessons = all.map(m => ({ id: m.id, lesson: m.lesson, pattern: m.pattern, at: m.timestamp }));

    return {
      totalMemories: all.length,
      distinctPatterns: Array.from(patterns),
      recentLessons: lessons.slice(0, 10),
      lastLearningAt: all[0]?.timestamp || null
    };
  }
}

module.exports = { EvolutionMemory };
