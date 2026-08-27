function loadInfrastructureConfig(env = process.env, options = {}) {
  const production = (env.FENIX_ENV || env.NODE_ENV) === 'production';
  const fs = require('fs');
  const readSecret = (path) => { try { return fs.readFileSync(path, 'utf8').trim(); } catch { return null; } };
  const pgPassword = readSecret('/run/secrets/postgres_password') || '';
  const redisPassword = readSecret('/run/secrets/redis_password') || '';
  const dbUrl = env.DATABASE_URL || (pgPassword ? `postgresql://${env.POSTGRES_USER || 'fenix'}:${pgPassword}@postgres:5432/${env.POSTGRES_DB || 'fenix'}?schema=${env.FENIX_DATABASE_SCHEMA || 'fenix'}` : null);
  const rdUrl = env.REDIS_URL || (redisPassword ? `redis://default:${redisPassword}@redis:6379` : null);

  const config = {
    databaseUrl: dbUrl,
    databaseSchema: env.FENIX_DATABASE_SCHEMA || 'fenix',
    redisUrl: rdUrl,
    queueRedisUrl: env.FENIX_QUEUE_REDIS_URL || rdUrl,
    qdrant: env.FENIX_QDRANT_URL ? {
      baseUrl: env.FENIX_QDRANT_URL,
      apiKey: env.FENIX_QDRANT_API_KEY || null,
      collection: env.FENIX_QDRANT_COLLECTION || 'fenix_memory',
      dimensions: Number(env.FENIX_QDRANT_DIMENSIONS || 64),
    } : null,
    s3: env.FENIX_S3_BUCKET ? {
      endpoint: env.FENIX_S3_ENDPOINT || undefined,
      region: env.FENIX_S3_REGION || 'us-east-1',
      bucket: env.FENIX_S3_BUCKET,
      accessKeyId: env.FENIX_S3_ACCESS_KEY_ID,
      secretAccessKey: env.FENIX_S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.FENIX_S3_FORCE_PATH_STYLE !== '0',
    } : null,
  };
  if ((options.requireExternal ?? production)) {
    const missing = [];
    if (!config.databaseUrl) missing.push('DATABASE_URL');
    if (!config.redisUrl) missing.push('REDIS_URL');
    if (!config.qdrant) missing.push('FENIX_QDRANT_URL');
    if (!config.s3?.bucket) missing.push('FENIX_S3_BUCKET');
    if (missing.length) console.warn(`[Config] Production infrastructure is incomplete: ${missing.join(', ')}. Gracefully degrading missing subsystems.`);
  }
  if (config.s3 && Boolean(config.s3.accessKeyId) !== Boolean(config.s3.secretAccessKey)) {
    throw new Error('S3 static credentials require both access key and secret key');
  }
  return config;
}

module.exports = { loadInfrastructureConfig };
