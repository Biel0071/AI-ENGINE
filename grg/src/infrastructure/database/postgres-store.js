const { EMPTY_STATE } = require('../../kernel/store');
const { CURRENT_SCHEMA_VERSION, COLLECTIONS_BY_VERSION, migrateState } = require('../../kernel/state-migrations');
const { applyRetention, loadLimits } = require('../../kernel/retention');
const { withRetry } = require('../resilience/retry');

const STATE_COLLECTIONS = [...new Set(Object.values(COLLECTIONS_BY_VERSION).flat())];

// PostgreSQL JSONB already gives each query a detached object. Avoid the JSON stringify/parse
// deep clone in migrateState for the common current-schema case; older or incomplete documents
// still take the full migration and repair path.
function normalizePersistedState(document) {
  if (document && typeof document === 'object' && !Array.isArray(document)
    && Number(document.schemaVersion) === CURRENT_SCHEMA_VERSION
    && STATE_COLLECTIONS.every((collection) => Array.isArray(document[collection]))) {
    return document;
  }
  return migrateState(document).state;
}

function cloneReadSnapshot(state) {
  if (!state || typeof state !== 'object') return state;
  const copy = {};
  for (const [key, value] of Object.entries(state)) {
    if (Array.isArray(value)) {
      copy[key] = value.slice();
    } else if (value && typeof value === 'object') {
      copy[key] = { ...value };
    } else {
      copy[key] = value;
    }
  }
  return copy;
}

function safeIdentifier(value) {
  const identifier = String(value || 'fenix');
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error('invalid PostgreSQL schema identifier');
  return identifier;
}

class PostgresStore {
  constructor({ pool, schema = 'fenix', ownsPool = false, retention = true, retentionLimits = null, env = null }) {
    if (!pool) throw new Error('PostgresStore requires a pool');
    this.pool = pool;
    this.schema = safeIdentifier(schema);
    this.ownsPool = ownsPool;
    // MEDIDO em producao (2026-07-29): MemoryStore/FileStore podam a cada escrita
    // (kernel/store.js:174), mas o PostgresStore -- o unico store usado em producao -- NAO
    // tinha nenhuma retencao. O documento chegou a 6,38 MB (runtimeJobs 1,58 MB para 67 jobs,
    // auditEvents 1,58 MB para 1.269) e cada update() no-op passou a custar ~2 s, porque toda
    // escrita reserializa o documento inteiro sob SERIALIZABLE. Consequencia observada: o
    // worker (ciclo de 2 s) colidia em 7 de 7 ciclos com 40001 e a fila parou.
    // Os tetos sao os mesmos do FileStore, ja dimensionados por bytes em kernel/retention.js.
    this.retentionEnabled = retention !== false;
    this.retentionLimits = retentionLimits || loadLimits(env || process.env);
    this.lastPruned = {};
    // A process must not fill its PostgreSQL pool with writers waiting for the same
    // canonical row. Serializing locally leaves one API and one worker transaction at
    // most in contention, instead of a 20-connection lock convoy doing duplicate clones.
    this.writeQueue = Promise.resolve();
    this.pendingUpdates = [];
    this.flushScheduled = false;
    this.cacheTtlMs = Number(env?.FENIX_STORE_CACHE_TTL_MS || process.env.FENIX_STORE_CACHE_TTL_MS || 2500);
    this.cachedState = null;
    this.cachedAt = 0;
    this.cacheGeneration = 0;
    this.readPromise = null;
  }

  #prune(state) {
    if (!this.retentionEnabled) return state;
    this.lastPruned = applyRetention(state, this.retentionLimits);
    return state;
  }

  static async connect(options = {}) {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: options.connectionString,
      max: Number(options.maxConnections || process.env.FENIX_PG_MAX_POOL || 25),
      idleTimeoutMillis: Number(options.idleTimeoutMs || 30_000),
      connectionTimeoutMillis: Number(options.connectionTimeoutMs || process.env.FENIX_PG_TIMEOUT_MS || 20_000),
      ssl: options.ssl,
    });
    pool.on('error', (err) => {
      console.warn('[PostgresStore] Idle pool client error:', err?.message || err);
    });
    const store = new PostgresStore({
      pool,
      schema: options.schema,
      ownsPool: true,
      retention: options.retention,
      retentionLimits: options.retentionLimits,
      env: options.env,
    });
    await store.initialize();
    return store;
  }

  async initialize() {
    try {
      const schema = this.schema;
      await this.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
      await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.kernel_state (
        state_key text PRIMARY KEY,
        version bigint NOT NULL DEFAULT 0,
        document jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(
      `INSERT INTO ${schema}.kernel_state (state_key, document) VALUES ($1, $2::jsonb)
       ON CONFLICT (state_key) DO NOTHING`,
      ['global', JSON.stringify(EMPTY_STATE())],
    );
    return this;
    } catch (err) {
      console.warn('[PostgresStore] Failed to initialize store:', err.message);
    }
  }

  async get(key) {
    return this.read();
  }

  async read() {
    const now = Date.now();
    if (this.cachedState && (now - this.cachedAt < this.cacheTtlMs)) {
      return cloneReadSnapshot(this.cachedState);
    }
    const generation = this.cacheGeneration;
    const existingRead = this.readPromise;
    if (existingRead?.generation === generation) {
      return cloneReadSnapshot(await existingRead.promise);
    }

    const readPromise = (async () => {
      const result = await this.pool.query(
        `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1`, ['global'],
      );
      if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
      const state = normalizePersistedState(result.rows[0].document);
      if (generation === this.cacheGeneration) {
        this.cachedState = state;
        this.cachedAt = Date.now();
      }
      return state;
    })();
    this.readPromise = { generation, promise: readPromise };
    try {
      return cloneReadSnapshot(await readPromise);
    } finally {
      if (this.readPromise?.promise === readPromise) this.readPromise = null;
    }
  }

  async write(state) {
    const migrated = this.#prune(normalizePersistedState(state));
    await this.pool.query(
      `UPDATE ${this.schema}.kernel_state
       SET document = $2::jsonb, version = version + 1, updated_at = now()
       WHERE state_key = $1`,
      ['global', JSON.stringify(migrated)],
    );
    this.cacheGeneration += 1;
    this.cachedState = migrated;
    this.cachedAt = Date.now();
    return cloneReadSnapshot(migrated);
  }

  async update(mutator) {
    const caller = new Error().stack.split('\n')[2]?.trim() || 'unknown';
    return new Promise((resolve, reject) => {
      this.pendingUpdates.push({ mutator, resolve, reject, caller });
      this.#scheduleFlush();
    });
  }

  #scheduleFlush() {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    const task = this.writeQueue.then(async () => {
      try {
        await Promise.resolve();
        while (this.pendingUpdates.length > 0) {
          const batch = this.pendingUpdates.splice(0, this.pendingUpdates.length);
          if (batch.length === 1) {
            try {
              const res = await this.#updateTransaction(batch[0].mutator, batch[0].caller);
              batch[0].resolve(res);
            } catch (err) {
              batch[0].reject(err);
            }
          } else {
            try {
              const res = await this.#updateTransaction(async (current) => {
                let draft = current;
                for (const item of batch) {
                  draft = normalizePersistedState(await item.mutator(draft));
                }
                return draft;
              }, `${batch[0].caller} (+${batch.length - 1} batched)`);
              for (const item of batch) {
                item.resolve(cloneReadSnapshot(res));
              }
            } catch (batchErr) {
              // Fallback to individual transactions if a combined batch mutator fails
              for (const item of batch) {
                try {
                  const res = await this.#updateTransaction(item.mutator, item.caller);
                  item.resolve(res);
                } catch (err) {
                  item.reject(err);
                }
              }
            }
          }
        }
      } finally {
        this.flushScheduled = false;
        if (this.pendingUpdates.length > 0) {
          this.#scheduleFlush();
        }
      }
    });
    this.writeQueue = task.catch(() => {});
  }

  async #updateTransaction(mutator, callerOverride = null) {
    const caller = callerOverride || new Error().stack.split('\n')[3]?.trim() || 'unknown';
    const t0 = Date.now();
    return withRetry(async () => {
      const client = await this.pool.connect();
      let destroyClient = false;
      const onClientError = () => { destroyClient = true; };
      client.on?.('error', onClientError);
      try {
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
        await client.query('SET LOCAL statement_timeout = 15000');
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '15000'");
        const result = await client.query(
          `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1 FOR UPDATE`, ['global'],
        );
        if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
        const current = normalizePersistedState(result.rows[0].document);
        const mutated = await mutator(current);
        const next = this.#prune(normalizePersistedState(mutated));
        await client.query(
          `UPDATE ${this.schema}.kernel_state
           SET document = $2::jsonb, version = version + 1, updated_at = now()
           WHERE state_key = $1`,
          ['global', JSON.stringify(next)],
        );
        await client.query('COMMIT');
        this.cacheGeneration += 1;
        this.cachedState = next;
        this.cachedAt = Date.now();
        const duration = Date.now() - t0;
        if (duration > 300) {
          console.warn(`[PostgresStore] slow update (${duration}ms) by: ${caller}`);
        }
        return cloneReadSnapshot(next);
      } catch (error) {
        if (
          error?.code === '25P03' ||
          error?.code === '57P01' ||
          error?.code === '57014' ||
          /connection error|not queryable|terminating connection/i.test(error?.message || '')
        ) {
          destroyClient = true;
        }
        if (!destroyClient) {
          try { await client.query('ROLLBACK'); } catch { destroyClient = true; }
        }
        throw error;
      } finally {
        client.removeListener?.('error', onClientError);
        client.release(destroyClient);
      }
    }, {
      // MEDIDO em producao (2026-07-29, doc de 6.38 MB): um update() no-op leva ~2 s -- o
      // Keep retries for deadlocks and compatibility with existing databases/proxies even
      // though READ COMMITTED + the row lock removes the recurring 40001 contention path.
      attempts: Number(process.env.FENIX_STORE_RETRY_ATTEMPTS || 6),
      baseDelayMs: Number(process.env.FENIX_STORE_RETRY_BASE_MS || 250),
      maxDelayMs: Number(process.env.FENIX_STORE_RETRY_MAX_MS || 8_000),
      // jitter alto de proposito: dois escritores em loop de periodo fixo re-colidem em fase
      // se o atraso for deterministico.
      jitter: 0.5,
      retryable: (error) =>
        error?.code === '40001' ||
        error?.code === '40P01' ||
        error?.code === '25P03' ||
        error?.code === '57014' ||
        /connection error|not queryable|terminating connection/i.test(error?.message || ''),
    });
  }

  async health() {
    const result = await this.pool.query('SELECT 1 AS ok');
    return { ok: result.rows[0]?.ok === 1, adapter: 'postgresql' };
  }

  async close() {
    if (this.ownsPool) await this.pool.end();
  }
}

module.exports = { PostgresStore, safeIdentifier, normalizePersistedState, cloneReadSnapshot };
