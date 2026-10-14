class RedisCache {
  constructor({ client, prefix = 'fenix' }) {
    if (!client) throw new Error('RedisCache requires a client');
    this.client = client;
    this.prefix = prefix;
  }

  static async connect({ url, prefix, socket } = {}) {
    const { createClient } = require('redis');
    const client = createClient({ url, socket });
    client.on('error', () => { /* health probe reports connectivity without crashing the process */ });
    await client.connect();
    return new RedisCache({ client, prefix });
  }

  key(tenantId, namespace, id) {
    for (const value of [tenantId, namespace, id]) {
      if (!value || String(value).includes(':')) throw new Error('Redis key segments must be non-empty and cannot contain colon');
    }
    return `${this.prefix}:${tenantId}:${namespace}:${id}`;
  }

  async get(tenantId, namespace, id) {
    const value = await this.client.get(this.key(tenantId, namespace, id));
    return value === null ? null : JSON.parse(value);
  }

  async set(tenantId, namespace, id, value, ttlSeconds = null) {
    const key = this.key(tenantId, namespace, id);
    const serialized = JSON.stringify(value);
    if (ttlSeconds) await this.client.set(key, serialized, { EX: Number(ttlSeconds) });
    else await this.client.set(key, serialized);
    return value;
  }

  async delete(tenantId, namespace, id) {
    return this.client.del(this.key(tenantId, namespace, id));
  }

  async health() {
    return { ok: (await this.client.ping()) === 'PONG', adapter: 'redis' };
  }

  async close() {
    if (this.client.isOpen) await this.client.close();
  }
}

module.exports = { RedisCache };
