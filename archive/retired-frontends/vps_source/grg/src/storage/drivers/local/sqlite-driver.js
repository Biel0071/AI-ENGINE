const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { StorageProvider } = require('../../storage-provider');

class SQLiteDriver extends StorageProvider {
  constructor(options = {}) {
    super({ name: 'SQLite', type: 'relational' });
    this.dbPath = options.dbPath || path.join(process.cwd(), '.data', 'fenix.db');
    this.db = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.isConnected = false;
          return reject(err);
        }
        this.isConnected = true;
        this._initTables().then(resolve).catch(reject);
      });
    });
  }

  async _initTables() {
    const initSql = `
      CREATE TABLE IF NOT EXISTS kv_store (
        id TEXT PRIMARY KEY,
        collection TEXT,
        data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    return new Promise((resolve, reject) => {
      this.db.run(initSql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disconnect() {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve();
      this.db.close((err) => {
        this.isConnected = false;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async set(key, value, collection = 'default') {
    const dataStr = typeof value === 'object' ? JSON.stringify(value) : value;
    const sql = `
      INSERT INTO kv_store (id, collection, data, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [key, collection, dataStr], function (err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  async get(key) {
    const sql = `SELECT data FROM kv_store WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.get(sql, [key], (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try {
          resolve(JSON.parse(row.data));
        } catch {
          resolve(row.data);
        }
      });
    });
  }

  async delete(key) {
    const sql = `DELETE FROM kv_store WHERE id = ?`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, [key], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  async find(query, collection = 'default') {
    // Basic prefix or all fetch for this generic KV fallback
    const sql = `SELECT id, data FROM kv_store WHERE collection = ?`;
    return new Promise((resolve, reject) => {
      this.db.all(sql, [collection], (err, rows) => {
        if (err) return reject(err);
        const results = rows.map(r => {
          try { return { id: r.id, ...JSON.parse(r.data) }; } 
          catch { return { id: r.id, data: r.data }; }
        });
        resolve(results);
      });
    });
  }
}

module.exports = { SQLiteDriver };
