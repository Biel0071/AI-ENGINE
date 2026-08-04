/**
 * PostgreSQLDriver — usa o pacote 'pg' (já em package.json).
 * Implementa a mesma interface do InMemoryDriver: get/set/delete/find.
 * A tabela kv_store é auto-criada se não existir.
 */
const { Pool } = require('pg');
const { StorageProvider } = require('../storage-provider');

class PostgreSQLDriver extends StorageProvider {
  constructor({ url, schema = 'public' }) {
    super({ name: 'PostgreSQL', type: 'relational' });
    this.pool = new Pool({ connectionString: url });
    this.schema = schema;
  }

  async connect() {
    // Test connection
    const client = await this.pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${this.schema}.fenix_kv_store (
        id          TEXT        NOT NULL,
        collection  TEXT        NOT NULL,
        data        JSONB       NOT NULL DEFAULT '{}',
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id, collection)
      )
    `);
    client.release();
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    await this.pool.end();
    this.isConnected = false;
    return true;
  }

  async set(key, value, collection = 'default') {
    await this.pool.query(`
      INSERT INTO ${this.schema}.fenix_kv_store (id, collection, data, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id, collection) DO UPDATE
        SET data = EXCLUDED.data, updated_at = NOW()
    `, [String(key), collection, JSON.stringify(value)]);
    return true;
  }

  async get(key, collection = 'default') {
    const { rows } = await this.pool.query(
      `SELECT data FROM ${this.schema}.fenix_kv_store WHERE id=$1 AND collection=$2`,
      [String(key), collection]
    );
    return rows.length ? rows[0].data : null;
  }

  async delete(key, collection = 'default') {
    const { rowCount } = await this.pool.query(
      `DELETE FROM ${this.schema}.fenix_kv_store WHERE id=$1 AND collection=$2`,
      [String(key), collection]
    );
    return rowCount > 0;
  }

  async find(query = {}, collection = 'default') {
    const keys = Object.keys(query);
    let sql = `SELECT id, data FROM ${this.schema}.fenix_kv_store WHERE collection=$1`;
    const params = [collection];
    // Igualdade simples de campos JSONB
    keys.forEach((k, i) => {
      sql += ` AND data->>'${k}' = $${i + 2}`;
      params.push(String(query[k]));
    });
    const { rows } = await this.pool.query(sql, params);
    return rows.map(r => ({ id: r.id, ...r.data }));
  }
}

module.exports = { PostgreSQLDriver };
