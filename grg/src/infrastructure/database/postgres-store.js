const { EMPTY_STATE } = require('../../kernel/store');
const { migrateState } = require('../../kernel/state-migrations');
const { applyRetention, loadLimits } = require('../../kernel/retention');
const { withRetry } = require('../resilience/retry');

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
      max: Number(options.maxConnections || 10),
      idleTimeoutMillis: Number(options.idleTimeoutMs || 30_000),
      connectionTimeoutMillis: Number(options.connectionTimeoutMs || 5_000),
      ssl: options.ssl,
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
    const result = await this.pool.query(
      `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1`, ['global'],
    );
    if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
    return migrateState(result.rows[0].document).state;
  }

  async read() {
    const result = await this.pool.query(
      `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1`, ['global'],
    );
    if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
    return migrateState(result.rows[0].document).state;
  }

  async write(state) {
    const migrated = this.#prune(migrateState(state).state);
    await this.pool.query(
      `UPDATE ${this.schema}.kernel_state
       SET document = $2::jsonb, version = version + 1, updated_at = now()
       WHERE state_key = $1`,
      ['global', JSON.stringify(migrated)],
    );
    return structuredClone(migrated);
  }

  async update(mutator) {
    const task = this.writeQueue.then(() => this.#updateTransaction(mutator));
    this.writeQueue = task.catch(() => {});
    return task;
  }

  async #updateTransaction(mutator) {
    return withRetry(async () => {
      const client = await this.pool.connect();
      try {
        // The canonical state is one row and SELECT ... FOR UPDATE already gives every
        // writer exclusive, ordered access to it. SERIALIZABLE added transaction-wide
        // snapshot conflicts on top of that row lock, so concurrent API/worker writers
        // repeatedly failed with 40001 after doing the expensive JSON serialization.
        // READ COMMITTED waits for the preceding writer and then reads its committed row,
        // preserving mutation order without false serialization failures.
        await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
        const result = await client.query(
          `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1 FOR UPDATE`, ['global'],
        );
        if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
        const current = migrateState(result.rows[0].document).state;
        const next = this.#prune(migrateState(await mutator(structuredClone(current))).state);
        await client.query(
          `UPDATE ${this.schema}.kernel_state
           SET document = $2::jsonb, version = version + 1, updated_at = now()
           WHERE state_key = $1`,
          ['global', JSON.stringify(next)],
        );
        await client.query('COMMIT');
        return structuredClone(next);
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* connection may already be closed */ }
        throw error;
      } finally {
        client.release();
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
      retryable: (error) => error?.code === '40001' || error?.code === '40P01',
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

module.exports = { PostgresStore, safeIdentifier };
