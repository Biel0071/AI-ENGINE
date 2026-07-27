const { ValidationError } = require('../kernel/errors');

function flag(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function positiveInt(value, fallback, name) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${name} must be a positive integer`);
  }
  return parsed;
}

function loadSecurityConfig(env = process.env) {
  const runtimeEnv = String(env.FENIX_ENV || env.NODE_ENV || 'development').toLowerCase();
  const production = runtimeEnv === 'production';
  const allowDevHeaders = flag(env.FENIX_ALLOW_DEV_HEADERS, false);
  const killSwitch = flag(env.FENIX_KILL_SWITCH, false);

  const bootstrapUser = String(env.FENIX_BOOTSTRAP_ADMIN_USER || '').trim();
  const bootstrapPassword = String(env.FENIX_BOOTSTRAP_ADMIN_PASSWORD || '');
  const bootstrapOidcSubject = String(env.FENIX_BOOTSTRAP_OIDC_SUBJECT || '').trim();
  if ((bootstrapUser && !bootstrapPassword) || (!bootstrapUser && bootstrapPassword)) {
    throw new ValidationError('bootstrap admin requires both user and password');
  }
  if (production && allowDevHeaders) {
    throw new ValidationError('development identity headers are forbidden in production');
  }
  if (production && bootstrapUser) {
    throw new ValidationError('bootstrap admin is forbidden in production');
  }

  return Object.freeze({
    runtimeEnv,
    production,
    allowDevHeaders,
    killSwitch,
    sessionTtlMs: positiveInt(env.FENIX_SESSION_TTL_MS, 12 * 60 * 60 * 1000, 'FENIX_SESSION_TTL_MS'),
    loginRateLimit: positiveInt(env.FENIX_LOGIN_RATE_LIMIT, 10, 'FENIX_LOGIN_RATE_LIMIT'),
    apiRateLimit: positiveInt(env.FENIX_API_RATE_LIMIT, 300, 'FENIX_API_RATE_LIMIT'),
    rateWindowMs: positiveInt(env.FENIX_RATE_WINDOW_MS, 60_000, 'FENIX_RATE_WINDOW_MS'),
    bootstrapAdmin: bootstrapUser ? {
      tenantId: String(env.FENIX_BOOTSTRAP_TENANT_ID || 'grg'),
      tenantName: String(env.FENIX_BOOTSTRAP_TENANT_NAME || 'GRG FÊNIX'),
      userId: bootstrapUser,
      password: bootstrapPassword,
      name: String(env.FENIX_BOOTSTRAP_ADMIN_NAME || bootstrapUser),
      role: 'master_admin',
    } : null,
    bootstrapOidc: bootstrapOidcSubject ? {
      tenantId: String(env.FENIX_BOOTSTRAP_TENANT_ID || 'grg'),
      tenantName: String(env.FENIX_BOOTSTRAP_TENANT_NAME || 'GRG FENIX'),
      userId: bootstrapOidcSubject,
    } : null,
  });
}

module.exports = { loadSecurityConfig, flag, positiveInt };
