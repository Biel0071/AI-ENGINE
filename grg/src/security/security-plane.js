const crypto = require('node:crypto');

class LocalRateLimiter {
  constructor({ windowMs = 60_000, defaultLimit = 300 } = {}) {
    this.windowMs = windowMs;
    this.defaultLimit = defaultLimit;
    this.buckets = new Map();
  }

  consume(key, limit = this.defaultLimit, now = Date.now()) {
    const current = this.buckets.get(key);
    if (!current || now >= current.resetAt) {
      const next = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(key, next);
      return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: next.resetAt };
    }
    current.count += 1;
    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetAt: current.resetAt,
    };
  }
}

class SecurityPlane {
  constructor({ auth, config, rateLimiter = null }) {
    this.auth = auth;
    this.config = config;
    this.rateLimiter = rateLimiter || new LocalRateLimiter({
      windowMs: config.rateWindowMs,
      defaultLimit: config.apiRateLimit,
    });
  }

  begin(req, res, pathname) {
    const requestId = crypto.randomUUID();
    const headers = {
      'x-request-id': requestId,
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'cache-control': pathname.startsWith('/api/') ? 'no-store' : 'no-cache',
    };
    for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);

    if (this.config.killSwitch && !['/health', '/api/logout'].includes(pathname)) {
      return { allowed: false, status: 503, requestId, error: 'FENIX kill switch is active' };
    }

    const address = req.socket && req.socket.remoteAddress || 'unknown';
    const isLogin = pathname === '/api/login';
    const limit = isLogin ? this.config.loginRateLimit : this.config.apiRateLimit;
    const rate = this.rateLimiter.consume(`${address}:${isLogin ? 'login' : 'api'}`, limit);
    res.setHeader('x-ratelimit-limit', String(limit));
    res.setHeader('x-ratelimit-remaining', String(rate.remaining));
    res.setHeader('x-ratelimit-reset', String(Math.ceil(rate.resetAt / 1000)));
    if (!rate.allowed) {
      res.setHeader('retry-after', String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))));
      return { allowed: false, status: 429, requestId, error: 'rate limit exceeded' };
    }
    return { allowed: true, requestId };
  }

  async authenticate(headers) {
    return this.auth.contextFromAsync(headers, { allowDevHeaders: this.config.allowDevHeaders });
  }
}

module.exports = { SecurityPlane, LocalRateLimiter };
