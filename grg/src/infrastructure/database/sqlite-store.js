const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { EMPTY_STATE } = require('../../kernel/store');
const { migrateState } = require('../../kernel/state-migrations');
const { applyRetention, loadLimits } = require('../../kernel/retention');

class SqliteStore {
  constructor(url, options = {}) {
    this.url = url;
    this.dbPath = url.replace('sqlite://', '');
    this.retentionEnabled = options.retention !== false;
    this.retentionLimits = options.retentionLimits || loadLimits(process.env);
    this.writeQueue = Promise.resolve();
    this.cachedState = null;
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
    if (this.cachedState) return structuredClone(this.cachedState);
    if (this.isClosed || !this.db) throw new Error('SQLite store is closed');
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT document FROM kernel_state WHERE state_key = ?`, ['global'], (err, row) => {
        if (err) return reject(err);
        if (!row) return reject(new Error('SQLite kernel state is not initialized'));
        this.cachedState = this.#prune(migrateState(JSON.parse(row.document)).state);
        resolve(structuredClone(this.cachedState));
      });
    });
  }

  async write(state) {
    const migrated = this.#prune(migrateState(state).state);
    this.cachedState = migrated;
    if (this.isClosed || !this.db) {
      return structuredClone(migrated);
    }
    const docStr = JSON.stringify(migrated);
    return new Promise((resolve, reject) => {
      if (this.isClosed || !this.db) return resolve(structuredClone(migrated));
      this.db.run(`
        UPDATE kernel_state
        SET document = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE state_key = ?
      `, [docStr, 'global'], (err) => {
        if (err) {
          if (this.isClosed || !this.db) resolve(structuredClone(migrated));
          else reject(err);
        } else {
          resolve(structuredClone(migrated));
        }
      });
    });
  }

  async update(mutator) {
    if (this.isClosed) {
      if (this.cachedState) return mutator(structuredClone(this.cachedState));
      throw new Error('SQLite store is closed');
    }
    const task = this.writeQueue.then(async () => {
      if (this.isClosed) {
        if (this.cachedState) return mutator(structuredClone(this.cachedState));
        return null;
      }
      const current = await this.read();
      const next = await mutator(structuredClone(current));
      return await this.write(next);
    });
    this.writeQueue = task.catch(() => {});
    return task;
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
