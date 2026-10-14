const { Pool } = require('pg');
const { createClient } = require('redis');

async function main() {
  const databaseUrl = process.env.FENIX_TEST_DATABASE_URL || process.env.DATABASE_URL;
  const redisUrl = process.env.FENIX_TEST_REDIS_URL || process.env.REDIS_URL;
  if (!databaseUrl || !redisUrl) {
    throw new Error('Set FENIX_TEST_DATABASE_URL and FENIX_TEST_REDIS_URL in a protected environment.');
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 5000 });
  const redis = createClient({ url: redisUrl, socket: { connectTimeout: 5000 } });
  try {
    const result = await pool.query('SELECT current_timestamp AS now');
    console.log('PostgreSQL reachable:', Boolean(result.rows[0]?.now));
    await redis.connect();
    console.log('Redis reachable:', (await redis.ping()) === 'PONG');
  } finally {
    if (redis.isOpen) await redis.quit();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Persistence check failed:', error.message);
  process.exitCode = 1;
});