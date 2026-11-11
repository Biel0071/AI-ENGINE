const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { EMPTY_STATE } = require('../../kernel/store');
// Mesmo desenho do PostgresStore: leitura rasa e no maximo uma copia por lote de gravacoes.
// Antes cada gravacao copiava o documento inteiro 4-5 vezes (308 ms com 3,9 MB; 10 simultaneas = 5,4 s).
const { normalizePersistedState, cloneReadSnapshot } = require('./postgres-store');
const { applyRetention, loadLimits } = require('../../kernel/retention');

class SqliteStore {
  constructor(url, options = {}) {
    this.url = url;
    this.dbPath = url.replace('sqlite://', '');
    this.retentionEnabled = options.retention !== false;
    this.retentionLimits = options.retentionLimits || loadLimits(process.env);
    this.writeQueue = Promise.resolve();
    this.cachedState = null;
    this.cachedDoc = null; // texto JSON do ultimo estado gravado: fonte de copias profundas
    this.pendingUpdates = [];
    this.flushScheduled = false;
  }

  static async connect(options = {}) {
    const url = typeof options === 'string' ? options : options.connectionString;
    const store = new SqliteStore(url, options);
    await store.initialize();
    return store;
  }

  #prune(state) {
    if (!this.retentionEnabled) return state;
    this.lastPruned = applyRetention(state, this.retentionLimits);
    const pruneKeys = ['auditEvents', 'domainEvents', 'missionEvents', 'orchestrationEvents', 'executionTimeline', 'cityNodes', 'cityEdges', 'artifacts', 'deadLetters', 'sandboxExecutions', 'inspectionRuns', 'inspectionReports'];
    for (const k of pruneKeys) {
      if (Array.isArray(state[k]) && state[k].length > 30) state[k] = state[k].slice(-30);
    }
    if (Array.isArray(state.missions) && state.missions.length > 30) state.missions = state.missions.slice(-30);
    if (Array.isArray(state.missionSteps) && state.missionSteps.length > 60) state.missionSteps = state.missionSteps.slice(-60);
    if (Array.isArray(state.runtimeJobs) && state.runtimeJobs.length > 30) state.runtimeJobs = state.runtimeJobs.slice(-30);
    return state;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(this.dbPath);
      if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err);
        this.db.serialize(() => {
          this.db.run('PRAGMA journal_mode = WAL;');
          this.db.run('PRAGMA busy_timeout = 5000;');
          this.db.run(`
            CREATE TABLE IF NOT EXISTS kernel_state (
              state_key TEXT PRIMARY KEY,
              version INTEGER NOT NULL DEFAULT 0,
              document TEXT NOT NULL,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);
          this.db.run(`
            INSERT OR IGNORE INTO kernel_state (state_key, document)
            VALUES (?, ?)
          `, ['global', JSON.stringify(EMPTY_STATE())], (err) => {
            if (err) return reject(err);
            this.read().then(() => resolve(this)).catch(reject);
          });
        });
      });
    });
  }

  async read() {
    if (this.cachedState) return cloneReadSnapshot(this.cachedState);
    if (this.isClosed || !this.db) throw new Error('SQLite store is closed');
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT document FROM kernel_state WHERE state_key = ?`, ['global'], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('SQLite kernel state is not initialized'));
        this.cachedState = this.#prune(normalizePersistedState(JSON.parse(row.document)));
        this.cachedDoc = JSON.stringify(this.cachedState);
        resolve(cloneReadSnapshot(this.cachedState));
      });
    });
  }

  // Copia profunda e independente do estado atual (um JSON.parse do texto ja serializado).
  async #draft() {
    if (!this.cachedDoc) await this.read();
    return JSON.parse(this.cachedDoc);
  }

  async write(state) {
    const migrated = this.#prune(normalizePersistedState(state));
    const docStr = JSON.stringify(migrated);
    this.cachedState = migrated;
    this.cachedDoc = docStr;
    if (this.isClosed || !this.db) {
      return cloneReadSnapshot(migrated);
    }
    return new Promise((resolve, reject) => {
      if (this.isClosed || !this.db) return resolve(cloneReadSnapshot(migrated));
      this.db.run(`
        UPDATE kernel_state
        SET document = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE state_key = ?
      `, [docStr, 'global'], (err) => {
        if (err) {
          if (this.isClosed || !this.db) resolve(cloneReadSnapshot(migrated));
          else reject(err);
        } else {
          resolve(cloneReadSnapshot(migrated));
        }
      });
    });
  }

  async update(mutator) {
    if (this.isClosed) {
      if (this.cachedDoc) return mutator(JSON.parse(this.cachedDoc));
      throw new Error('SQLite store is closed');
    }
    return new Promise((resolve, reject) => {
      this.pendingUpdates.push({ mutator, resolve, reject });
      this.#scheduleFlush();
    });
  }

  // Agrupa as gravacoes pendentes: uma copia, todos os mutadores em sequencia, uma gravacao.
  // Se o lote falhar, refaz um a um para que so o mutador com erro seja rejeitado.
  #scheduleFlush() {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const task = this.writeQueue.then(async () => {
      try {
        await Promise.resolve();
        while (this.pendingUpdates.length > 0) {
          const batch = this.pendingUpdates.splice(0, this.pendingUpdates.length);
          if (this.isClosed) {
            for (const item of batch) item.reject(new Error('SQLite store is closed'));
            continue;
          }
          try {
            let draft = await this.#draft();
            for (const item of batch) draft = await item.mutator(draft);
            const saved = await this.write(draft);
            for (const item of batch) item.resolve(batch.length === 1 ? saved : cloneReadSnapshot(this.cachedState));
          } catch (batchError) {
            if (batch.length === 1) { batch[0].reject(batchError); continue; }
            for (const item of batch) {
              try {
                const draft = await item.mutator(await this.#draft());
                item.resolve(await this.write(draft));
              } catch (error) {
                item.reject(error);
              }
            }
          }
        }
      } finally {
        this.flushScheduled = false;
        if (this.pendingUpdates.length > 0) this.#scheduleFlush();
      }
    });
    this.writeQueue = task.catch(() => {});
  }

  async health() {
    if (this.isClosed || !this.db) return { ok: false, adapter: 'sqlite', closed: true };
    return new Promise((resolve) => {
      this.db.get('SELECT 1 AS ok', (err, row) => {
        resolve({ ok: !err && row?.ok === 1, adapter: 'sqlite' });
      });
    });
  }

  async close() {
    this.isClosed = true;
    try { await this.writeQueue; } catch {}
    return new Promise((resolve) => {
      if (!this.db) return resolve();
      const db = this.db;
      this.db = null;
      db.close(() => resolve());
    });
  }
}

module.exports = { SqliteStore };
