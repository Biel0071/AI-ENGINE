const { Pool } = require('pg');
const fs = require('node:fs/promises');
const path = require('node:path');
const { StorageAdapter } = require('./storage-adapter');

class PostgresStore extends StorageAdapter {
  constructor(options = {}) {
    super();
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.schemaPath = options.schemaPath || path.resolve(__dirname, '../../database/001_control_plane.sql');
    this.pool = options.pool || null;
    this.initialized = false;
  }

  getPool() {
    if (!this.pool) {
      if (!this.connectionString) {
        throw new Error('PostgresStore requires connectionString or process.env.DATABASE_URL');
      }
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
    return this.pool;
  }

  async initialize() {
    if (this.initialized) return;
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      if (this.schemaPath) {
        try {
          const sql = await fs.readFile(this.schemaPath, 'utf8');
          await client.query(sql);
        } catch (err) {
          // Schema may already exist or table created
          if (!err.message.includes('already exists')) {
            // Log but don't crash if already initialized
          }
        }
      }
      // Ensure state KV table exists for full-state compatibility
      await client.query(`
        CREATE TABLE IF NOT EXISTS fenix_state_store (
          key TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      this.initialized = true;
    } finally {
      client.release();
    }
  }

  async read() {
    await this.initialize();
    const pool = this.getPool();
    const res = await pool.query(`SELECT state FROM fenix_state_store WHERE key = 'root' LIMIT 1`);
    if (res.rows.length > 0) {
      return res.rows[0].state;
    }
    return {
      schemaVersion: 2,
      tenants: [],
      projects: [],
      runs: [],
      deployments: [],
      graphNodes: [],
      graphEdges: [],
      users: [],
      memberships: [],
      memoryEvents: [],
      capabilities: [],
      operatorAuditLogs: [],
      acepMissions: [],
      doiSessions: [],
      lcrHistory: [],
    };
  }

  async write(state) {
    await this.initialize();
    const pool = this.getPool();
    await pool.query(
      `INSERT INTO fenix_state_store (key, state, updated_at)
       VALUES ('root', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET state = $1, updated_at = NOW()`,
      [JSON.stringify(state)]
    );
    return JSON.parse(JSON.stringify(state));
  }

  async update(mutator) {
    await this.initialize();
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(`SELECT state FROM fenix_state_store WHERE key = 'root' FOR UPDATE`);
      let current = res.rows.length > 0 ? res.rows[0].state : {
        schemaVersion: 2,
        tenants: [],
        projects: [],
        runs: [],
        deployments: [],
        graphNodes: [],
        graphEdges: [],
        users: [],
        memberships: [],
        memoryEvents: [],
        capabilities: [],
        operatorAuditLogs: [],
        acepMissions: [],
        doiSessions: [],
        lcrHistory: [],
      };
      const next = await mutator(JSON.parse(JSON.stringify(current)));
      await client.query(
        `INSERT INTO fenix_state_store (key, state, updated_at)
         VALUES ('root', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET state = $1, updated_at = NOW()`,
        [JSON.stringify(next)]
      );
      await client.query('COMMIT');
      return JSON.parse(JSON.stringify(next));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async find(collection, filter = {}) {
    const state = await this.read();
    const list = Array.isArray(state[collection]) ? state[collection] : [];
    if (typeof filter === 'function') {
      return list.filter(filter);
    }
    return list.filter((item) => {
      for (const [key, value] of Object.entries(filter)) {
        if (item[key] !== value) return false;
      }
      return true;
    });
  }

  async insert(collection, item) {
    await this.update((state) => {
      state[collection] ||= [];
      state[collection].push(item);
      return state;
    });
    return item;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }
}

module.exports = { PostgresStore };
