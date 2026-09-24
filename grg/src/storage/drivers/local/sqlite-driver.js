const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { StorageProvider } = require('../../storage-provider');

class SQLiteDriver extends StorageProvider {
  constructor(options = {}) {
    super({ name: 'SQLite', type: 'relational' });
    this.dbPath = options.dbPath || path.join(process.cwd(), '.data', 'knowledge.db');
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
        this.db.run('PRAGMA journal_mode = WAL;', (pragmaError) => {
          if (pragmaError) return reject(pragmaError);
          this.db.run('PRAGMA busy_timeout = 5000;', (timeoutError) => {
            if (timeoutError) return reject(timeoutError);
            this._initTables().then(resolve).catch(reject);
          });
        });
      });
    });
  }

  async _initTables() {
    const initSql = `
      CREATE TABLE IF NOT EXISTS fenix_knowledge_kv (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, collection)
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
      INSERT INTO fenix_knowledge_kv (id, collection, data, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id, collection) DO UPDATE SET data=excluded.data, updated_at=CURRENT_TIMESTAMP
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [key, collection, dataStr], function (err) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  async get(key, collection = 'default') {
    const sql = `SELECT data FROM fenix_knowledge_kv WHERE id = ? AND collection = ?`;
    return new Promise((resolve, reject) => {
      this.db.get(sql, [key, collection], (err, row) => {
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

  async delete(key, collection = 'default') {
    const sql = `DELETE FROM fenix_knowledge_kv WHERE id = ? AND collection = ?`;
    return new Promise((resolve, reject) => {
      this.db.run(sql, [key, collection], function (err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  async find(query, collection = 'default') {
    const sql = `SELECT id, data FROM fenix_knowledge_kv WHERE collection = ?`;
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
