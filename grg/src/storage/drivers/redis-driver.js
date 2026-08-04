/**
 * RedisDriver — usa o pacote 'redis' v6 (já em package.json).
 * Implementa interface get/set/delete/find como cache KV.
 * find() faz SCAN por padrão de chave prefixada com a collection.
 */
const { createClient } = require('redis');
const { StorageProvider } = require('../storage-provider');

class RedisDriver extends StorageProvider {
  constructor({ url }) {
    super({ name: 'Redis', type: 'cache' });
    this.url = url;
    this.client = null;
  }

  async connect() {
    this.client = createClient({ url: this.url });
    this.client.on('error', (err) => console.error('[RedisDriver] Client error:', err.message));
    await this.client.connect();
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    if (this.client) await this.client.quit();
    this.isConnected = false;
    return true;
  }

  _key(key, collection) {
    return `fenix:${collection}:${key}`;
  }

  async set(key, value, collection = 'default') {
    const serialized = JSON.stringify(value);
    await this.client.set(this._key(key, collection), serialized);
    return true;
  }

  async get(key, collection = 'default') {
    const raw = await this.client.get(this._key(key, collection));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  async delete(key, collection = 'default') {
    const count = await this.client.del(this._key(key, collection));
    return count > 0;
  }

  async find(query = {}, collection = 'default') {
    // SCAN para pegar todas as chaves da collection
    const pattern = `fenix:${collection}:*`;
    const keys = [];
    for await (const key of this.client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(key);
    }
    if (!keys.length) return [];

    const values = await this.client.mGet(keys);
    const results = [];
    keys.forEach((k, i) => {
      if (!values[i]) return;
      try {
        const record = JSON.parse(values[i]);
        const id = k.replace(`fenix:${collection}:`, '');
        let match = true;
        for (const [qk, qv] of Object.entries(query)) {
          if (record[qk] !== qv) { match = false; break; }
        }
        if (match) results.push({ id, ...record });
      } catch {}
    });
    return results;
  }
}

module.exports = { RedisDriver };
