function loadInfrastructureConfig(env = process.env, options = {}) {
  const production = (env.FENIX_ENV || env.NODE_ENV) === 'production';
  const config = {
    databaseUrl: env.DATABASE_URL || null,
    databaseSchema: env.FENIX_DATABASE_SCHEMA || 'fenix',
    redisUrl: env.REDIS_URL || null,
    queueRedisUrl: env.FENIX_QUEUE_REDIS_URL || env.REDIS_URL || null,
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
    if (missing.length) throw new Error(`production infrastructure is incomplete: ${missing.join(', ')}`);
  }
  if (config.s3 && Boolean(config.s3.accessKeyId) !== Boolean(config.s3.secretAccessKey)) {
    throw new Error('S3 static credentials require both access key and secret key');
  }
  return config;
}

module.exports = { loadInfrastructureConfig };
