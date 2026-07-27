const { EMPTY_STATE } = require('../../kernel/store');
const { migrateState } = require('../../kernel/state-migrations');
const { withRetry } = require('../resilience/retry');

function safeIdentifier(value) {
  const identifier = String(value || 'fenix');
  if (!/^[a-z_][a-z0-9_]*$/.test(identifier)) throw new Error('invalid PostgreSQL schema identifier');
  return identifier;
}

class PostgresStore {
  constructor({ pool, schema = 'fenix', ownsPool = false }) {
    if (!pool) throw new Error('PostgresStore requires a pool');
    this.pool = pool;
    this.schema = safeIdentifier(schema);
    this.ownsPool = ownsPool;
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
    const store = new PostgresStore({ pool, schema: options.schema, ownsPool: true });
    await store.initialize();
    return store;
  }

  async initialize() {
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
  }

  async read() {
    const result = await this.pool.query(
      `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1`, ['global'],
    );
    if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
    return migrateState(result.rows[0].document).state;
  }

  async write(state) {
    const migrated = migrateState(state).state;
    await this.pool.query(
      `UPDATE ${this.schema}.kernel_state
       SET document = $2::jsonb, version = version + 1, updated_at = now()
       WHERE state_key = $1`,
      ['global', JSON.stringify(migrated)],
    );
    return structuredClone(migrated);
  }

  async update(mutator) {
    return withRetry(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        const result = await client.query(
          `SELECT document FROM ${this.schema}.kernel_state WHERE state_key = $1 FOR UPDATE`, ['global'],
        );
        if (!result.rows[0]) throw new Error('PostgreSQL kernel state is not initialized');
        const current = migrateState(result.rows[0].document).state;
        const next = migrateState(await mutator(structuredClone(current))).state;
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
      attempts: 3,
      baseDelayMs: 25,
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
