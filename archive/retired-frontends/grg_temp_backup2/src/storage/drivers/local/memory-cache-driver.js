const { StorageProvider } = require('../../storage-provider');

class MemoryCacheDriver extends StorageProvider {
  constructor(options = {}) {
    super({ name: 'MemoryCache', type: 'keyvalue' });
    this.store = new Map();
  }

  async connect() {
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    this.store.clear();
    this.isConnected = false;
    return true;
  }

  async set(key, value, collection = 'default') {
    if (!this.store.has(collection)) {
      this.store.set(collection, new Map());
    }
    this.store.get(collection).set(key, value);
    return true;
  }

  async get(key, collection = 'default') {
    if (!this.store.has(collection)) return null;
    return this.store.get(collection).get(key) || null;
  }

  async delete(key, collection = 'default') {
    if (!this.store.has(collection)) return false;
    return this.store.get(collection).delete(key);
  }

  async find(query, collection = 'default') {
    if (!this.store.has(collection)) return [];
    
    // Very naive find for memory cache
    const results = [];
    for (const [id, data] of this.store.get(collection).entries()) {
      results.push({ id, ...data });
    }
    return results;
  }
}

module.exports = { MemoryCacheDriver };
