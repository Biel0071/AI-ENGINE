const crypto = require('node:crypto');

class RedisLease {
  constructor({ client, key = 'fenix:runtime:leader', ttlMs = 15_000, ownerId = crypto.randomUUID() }) {
    if (!client) throw new Error('RedisLease requires a Redis client');
    this.client = client; this.key = key; this.ttlMs = ttlMs; this.ownerId = ownerId; this.held = false;
  }
  async acquire() { this.held = (await this.client.set(this.key, this.ownerId, { NX: true, PX: this.ttlMs })) === 'OK'; return this.held; }
  async renew() { const result = await this.client.eval("if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('pexpire',KEYS[1],ARGV[2]) else return 0 end", { keys: [this.key], arguments: [this.ownerId, String(this.ttlMs)] }); this.held = Number(result) === 1; return this.held; }
  async release() { const result = await this.client.eval("if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end", { keys: [this.key], arguments: [this.ownerId] }); this.held = false; return Number(result) === 1; }
}

module.exports = { RedisLease };
