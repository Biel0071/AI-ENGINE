'use strict';
/**
 * FÊNIX OS — Persistent Evolution Queue
 * =====================================
 * Fila persistente de propostas de evolução contínua 24/7.
 *
 * Características Arquiteturais:
 * 1. Persistência Dual:
 *    - Primário: StorageManager (PostgreSQL collection 'evolution_queue' ou SQLite)
 *    - Fallback: Local JSON Store em data/evolution-queue-store.json (sempre sobrevive a reboots)
 * 2. Deduplicação Criptográfica:
 *    - 'proposalFingerprint' = sha256(type + ':' + title.toLowerCase() + ':' + description.toLowerCase())
 *    - 'problemHash' = sha256 normalizado
 * 3. Priorização Granular:
 *    - P0: Critical / Crash / Security (Score 1000+)
 *    - P1: Architectural / Structural (Score 800+)
 *    - P2: Functional / Feature Broken (Score 600+)
 *    - P3: Data Inconsistency / Drift (Score 400+)
 *    - P4: UX / Visual (Score 200+)
 *    - P5: Performance / Optimization (Score 100+)
 *    - P6: Background Exploration (Score 50+)
 *    - P7: Experimental (Score 10+)
 * 4. Anti-Starvation:
 *    - Itens aguardando na fila aumentam de score proporcionalmente ao tempo de espera.
 * 5. Anti-Loop & Quarentena:
 *    - Propostas com >= 3 falhas idênticas entram em 'QUARANTINED'.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const VALID_QUEUE_STATES = [
  'PLANNED',
  'QUEUED',
  'IN_PROGRESS',
  'PAUSED',
  'SUCCEEDED',
  'FAILED',
  'ROLLED_BACK',
  'QUARANTINED',
  'CANCELLED'
];

const BASE_PRIORITY_SCORES = {
  P0: 1000,
  P1: 800,
  P2: 600,
  P3: 400,
  P4: 200,
  P5: 100,
  P6: 50,
  P7: 10
};

class PersistentEvolutionQueue extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} [options.storageManager] - StorageManager para persistência PostgreSQL/SQLite
   * @param {string} [options.storePath]      - Caminho do arquivo JSON de fallback
   * @param {object} [options.eventBus]        - Barramento de eventos
   * @param {object} [options.logger]          - Logger
   */
  constructor(options = {}) {
    super();
    this.storageManager = options.storageManager || null;
    this.storePath = options.storePath || path.join(__dirname, '..', '..', 'data', 'evolution-queue-store.json');
    this.eventBus = options.eventBus || null;
    this.logger = options.logger || console;
    this.collection = 'evolution_queue';

    this._items = new Map(); // id -> item
    this._fingerprints = new Map(); // fingerprint -> id
    this._failureCounts = new Map(); // fingerprint -> failureCount
    this._initialized = false;
  }

  computeFingerprint(data = {}) {
    const raw = [
      String(data.type || 'ARCHITECTURAL').toUpperCase().trim(),
      String(data.title || '').toLowerCase().trim(),
      String(data.description || '').toLowerCase().trim()
    ].join('::');
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);
  }

  computeProblemHash(str = '') {
    const normalized = String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  async init() {
    if (this._initialized) return this;

    // Garantir que diretório de dados exista
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Ignorar se falhar em ambiente somente leitura
    }

    // 1. Carregar do StorageManager se disponível
    let loaded = false;
    if (this.storageManager) {
      try {
        const relational = this.storageManager.getRelational?.();
        if (relational && typeof relational.find === 'function') {
          const records = await relational.find({}, this.collection);
          if (Array.isArray(records) && records.length > 0) {
            for (const item of records) {
              this._items.set(item.id, item);
              if (item.fingerprint) this._fingerprints.set(item.fingerprint, item.id);
            }
            loaded = true;
            this.logger.info?.(`[PersistentEvolutionQueue] Carregados ${records.length} itens do StorageManager.`);
          }
        }
      } catch (err) {
        this.logger.warn?.('[PersistentEvolutionQueue] Erro ao carregar do StorageManager:', err.message);
      }
    }

    // 2. Se não carregou do banco, tentar carregar do storePath local
    if (!loaded && fs.existsSync(this.storePath)) {
      try {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items)) {
          for (const item of parsed.items) {
            this._items.set(item.id, item);
            if (item.fingerprint) this._fingerprints.set(item.fingerprint, item.id);
          }
          this.logger.info?.(`[PersistentEvolutionQueue] Carregados ${parsed.items.length} itens do arquivo local.`);
        }
      } catch (err) {
        this.logger.warn?.('[PersistentEvolutionQueue] Erro ao carregar do arquivo local:', err.message);
      }
    }

    this._initialized = true;
    return this;
  }

  async _persist() {
    const items = Array.from(this._items.values());

    // 1. Salvar no arquivo local
    try {
      const data = {
        updatedAt: new Date().toISOString(),
        count: items.length,
        items
      };
      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      this.logger.warn?.('[PersistentEvolutionQueue] Erro ao persistir no arquivo local:', err.message);
    }

    // 2. Salvar no StorageManager se disponível
    if (this.storageManager) {
      try {
        const relational = this.storageManager.getRelational?.();
        if (relational && typeof relational.set === 'function') {
          for (const item of items) {
            await relational.set(item.id, item, this.collection);
          }
        }
      } catch (err) {
        this.logger.warn?.('[PersistentEvolutionQueue] Erro ao persistir no StorageManager:', err.message);
      }
    }
  }

  /**
   * Enfileira uma nova proposta de evolução ou deduplica caso já ativa.
   * @param {object} proposal
   * @returns {Promise<{ item: object, deduplicated: boolean }>}
   */
  async enqueue(proposal = {}) {
    await this.init();

    const title = String(proposal.title || 'Untitled Evolution').trim();
    const description = String(proposal.description || '').trim();
    const type = String(proposal.type || 'ARCHITECTURAL').toUpperCase().trim();
    const priority = String(proposal.priority || 'P2').toUpperCase().trim();
    const priorityKey = BASE_PRIORITY_SCORES[priority] !== undefined ? priority : 'P2';

    const fingerprint = proposal.fingerprint || this.computeFingerprint({ type, title, description });
    const problemHash = proposal.problemHash || this.computeProblemHash(proposal.problem || title);

    // 1. Deduplicação: se já existe proposta ativa com este fingerprint, retornar existente
    const existingId = this._fingerprints.get(fingerprint);
    if (existingId) {
      const existing = this._items.get(existingId);
      if (existing && ['PLANNED', 'QUEUED', 'IN_PROGRESS', 'PAUSED'].includes(existing.status)) {
        this.logger.info?.(`[PersistentEvolutionQueue] Deduplicada proposta ${existing.id} (fingerprint: ${fingerprint})`);
        return { item: existing, deduplicated: true };
      }
    }

    // 2. Checar quarentena por falhas consecutivas
    const failureCount = this._failureCounts.get(fingerprint) || 0;
    const isQuarantined = failureCount >= 3;

    const id = proposal.id || proposal.proposalId || `evo-item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const item = {
      id,
      proposalId: proposal.proposalId || id,
      title,
      description,
      type,
      priority: priorityKey,
      baseScore: BASE_PRIORITY_SCORES[priorityKey],
      fingerprint,
      problemHash,
      status: isQuarantined ? 'QUARANTINED' : (proposal.status || 'QUEUED'),
      failureCount,
      targetFiles: Array.isArray(proposal.targetFiles) ? proposal.targetFiles : [],
      payload: proposal.payload || {},
      enqueuedAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      sessionId: null,
      error: isQuarantined ? 'Quarantined due to repeated identical failures' : null
    };

    this._items.set(id, item);
    this._fingerprints.set(fingerprint, id);

    await this._persist();

    if (this.eventBus) {
      this.eventBus.emit('evolution:queue:enqueued', { item });
    }

    this.logger.info?.(`[PersistentEvolutionQueue] Enfileirado item ${id} [${priorityKey}] "${title}"`);
    return { item, deduplicated: false };
  }

  /**
   * Retorna o próximo item elegível da fila ordenado por score dinâmico (anti-starvation).
   * @returns {object|null}
   */
  getNext() {
    const candidates = [];
    const now = Date.now();

    for (const item of this._items.values()) {
      if (item.status === 'QUEUED' || item.status === 'PLANNED') {
        const waitingMinutes = Math.max(0, (now - new Date(item.enqueuedAt).getTime()) / 60000);
        // Anti-starvation: soma 2 pontos de score para cada minuto esperando
        const dynamicScore = item.baseScore + (waitingMinutes * 2);
        candidates.push({ item, dynamicScore });
      }
    }

    if (candidates.length === 0) return null;

    // Ordena pelo maior score dinâmico
    candidates.sort((a, b) => b.dynamicScore - a.dynamicScore);
    return candidates[0].item;
  }

  /**
   * Retira o próximo item elegível e marca como IN_PROGRESS.
   * @param {string} [sessionId]
   * @returns {Promise<object|null>}
   */
  async dequeue(sessionId = null) {
    await this.init();
    const item = this.getNext();
    if (!item) return null;

    item.status = 'IN_PROGRESS';
    item.startedAt = new Date().toISOString();
    item.updatedAt = item.startedAt;
    item.sessionId = sessionId || item.sessionId;

    await this._persist();

    if (this.eventBus) {
      this.eventBus.emit('evolution:queue:dequeued', { item, sessionId });
    }

    return item;
  }

  getById(id) {
    return this._items.get(id) || null;
  }

  /**
   * Atualiza o estado de um item na fila.
   * @param {string} id
   * @param {string} status
   * @param {object} [details]
   */
  async updateState(id, status, details = {}) {
    await this.init();
    const item = this._items.get(id);
    if (!item) {
      throw new Error(`Item com ID ${id} não encontrado na fila`);
    }

    if (!VALID_QUEUE_STATES.includes(status)) {
      throw new Error(`Estado inválido: ${status}. Válidos: ${VALID_QUEUE_STATES.join(', ')}`);
    }

    const previousStatus = item.status;
    item.status = status;
    item.updatedAt = new Date().toISOString();

    if (details.error) item.error = details.error;
    if (details.sessionId) item.sessionId = details.sessionId;
    if (details.result) item.result = details.result;

    if (status === 'SUCCEEDED' || status === 'FAILED' || status === 'ROLLED_BACK' || status === 'CANCELLED') {
      item.completedAt = new Date().toISOString();
    }

    // Gerenciamento de quarentena
    if (status === 'FAILED' || status === 'ROLLED_BACK') {
      const count = (this._failureCounts.get(item.fingerprint) || 0) + 1;
      this._failureCounts.set(item.fingerprint, count);
      item.failureCount = count;

      if (count >= 3) {
        item.status = 'QUARANTINED';
        item.error = `Quarantined: failed ${count} consecutive times`;
        this.logger.warn?.(`[PersistentEvolutionQueue] Item ${id} colocado em QUARANTINED.`);
      }
    } else if (status === 'SUCCEEDED') {
      this._failureCounts.delete(item.fingerprint);
      item.failureCount = 0;
    }

    await this._persist();

    if (this.eventBus) {
      this.eventBus.emit('evolution:queue:state_changed', { id, previousStatus, status, item });
    }

    return item;
  }

  /**
   * Lista itens com filtro opcional.
   * @param {object} [filter]
   * @returns {Array<object>}
   */
  list(filter = {}) {
    let result = Array.from(this._items.values());

    if (filter.status) {
      result = result.filter(item => item.status === filter.status);
    }
    if (filter.priority) {
      result = result.filter(item => item.priority === filter.priority);
    }
    if (filter.type) {
      result = result.filter(item => item.type === filter.type);
    }

    return result;
  }

  getSnapshot() {
    const all = Array.from(this._items.values());
    return {
      total: all.length,
      queued: all.filter(i => i.status === 'QUEUED' || i.status === 'PLANNED').length,
      inProgress: all.filter(i => i.status === 'IN_PROGRESS').length,
      succeeded: all.filter(i => i.status === 'SUCCEEDED').length,
      failed: all.filter(i => i.status === 'FAILED').length,
      rolledBack: all.filter(i => i.status === 'ROLLED_BACK').length,
      quarantined: all.filter(i => i.status === 'QUARANTINED').length,
      items: all
    };
  }

  async clear() {
    this._items.clear();
    this._fingerprints.clear();
    this._failureCounts.clear();
    await this._persist();
  }
}

module.exports = {
  PersistentEvolutionQueue,
  VALID_QUEUE_STATES,
  BASE_PRIORITY_SCORES
};
