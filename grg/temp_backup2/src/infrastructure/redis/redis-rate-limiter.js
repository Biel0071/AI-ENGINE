const { RateLimitError } = require('../../kernel/errors');

const SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

class RedisRateLimiter {
  constructor({ client, limit = 60, windowMs = 60_000, prefix = 'fenix:rate' }) {
    if (!client) throw new Error('RedisRateLimiter requires a client');
    this.client = client;
    this.limit = Number(limit);
    this.windowMs = Number(windowMs);
    this.prefix = prefix;
  }

  async consume(tenantId, scope) {
    if (!tenantId || !scope || String(tenantId).includes(':') || String(scope).includes(':')) {
      throw new Error('invalid rate-limit key segment');
    }
    const key = `${this.prefix}:${tenantId}:${scope}`;
    const [count, ttl] = await this.client.eval(SCRIPT, { keys: [key], arguments: [String(this.windowMs)] });
    if (Number(count) > this.limit) {
      const error = new RateLimitError(`rate limit exceeded for ${scope}`);
      error.retryAfterMs = Math.max(0, Number(ttl));
      throw error;
    }
    return { allowed: true, remaining: Math.max(0, this.limit - Number(count)), resetAfterMs: Number(ttl) };
  }
}

module.exports = { RedisRateLimiter, SCRIPT };
