/**
 * InMemoryDriver — Relational KV Store backed entirely by in-process Map.
 * Funciona em containers read-only, sem dependencias nativas.
 * Em producao com DATABASE_URL, este driver NAO e usado (PostgreSQL assume).
 * Sem DATABASE_URL (dev local ou boot-strap inicial), garante que nada e null.
 */
const { StorageProvider } = require('../../storage-provider');

class InMemoryDriver extends StorageProvider {
  constructor(options = {}) {
    super({ name: 'InMemory', type: 'relational' });
    // { collection -> { id -> data } }
    this._store = new Map();
  }

  async connect() {
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    this.isConnected = false;
    return true;
  }

  _col(collection) {
    if (!this._store.has(collection)) {
      this._store.set(collection, new Map());
    }
    return this._store.get(collection);
  }

  async set(key, value, collection = 'default') {
    this._col(collection).set(String(key), value);
    return true;
  }

  async get(key, collection = 'default') {
    return this._col(collection).get(String(key)) ?? null;
  }

  async delete(key, collection = 'default') {
    return this._col(collection).delete(String(key));
  }

  /**
   * find(query, collection) — suporta filtro por igualdade nos campos do objeto.
   * Ex: find({ state: 'PENDING' }, 'missions') retorna todos com state === 'PENDING'.
   * find({}) retorna tudo.
   */
  async find(query = {}, collection = 'default') {
    const col = this._col(collection);
    const results = [];
    for (const [id, record] of col.entries()) {
      let match = true;
      for (const [k, v] of Object.entries(query)) {
        if (record[k] !== v) { match = false; break; }
      }
      if (match) results.push({ id, ...record });
    }
    return results;
  }
}

module.exports = { InMemoryDriver };
