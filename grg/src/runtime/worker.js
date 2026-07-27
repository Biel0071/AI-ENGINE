const { createApp } = require('../app');
const { loadInfrastructureConfig } = require('../infrastructure/config');
const { loadSecurityConfig } = require('../security/config');
const { RedisLease } = require('./redis-lease');

async function startWorker(options = {}) {
  const env = options.env || process.env; const securityConfig = loadSecurityConfig(env); const infra = loadInfrastructureConfig(env, { requireExternal: securityConfig.production });
  const app = await createApp({ ...infra, securityConfig, env });
  if (!app.redis) throw new Error('runtime worker requires Redis');
  const lease = new RedisLease({ client: app.redis.client, ttlMs: Number(env.FENIX_LEADER_LEASE_MS || 15_000), ownerId: env.FENIX_WORKER_ID });
  const intervalMs = Number(env.FENIX_WORKER_POLL_MS || 2_000); let stopping = false; let running = false;
  const cycle = async () => {
    const leader = lease.held ? await lease.renew() : await lease.acquire();
    if (leader) { const state = await app.store.read(); const dueTenants = [...new Set(state.runtimeSchedules.filter((item) => item.enabled).map((item) => item.tenantId))]; for (const tenantId of dueTenants) { const actor = state.runtimeSchedules.find((item) => item.tenantId === tenantId)?.createdBy; if (actor) await app.jobs.tick(tenantId, actor); } }
    await app.jobs.recoverStale(Number(env.FENIX_STALE_JOB_MS || 60_000)); await app.jobs.runBatch(lease.ownerId, Number(env.FENIX_WORKER_BATCH || 10));
  };
  const guardedCycle = async () => { if (running) return; running = true; try { await cycle(); } finally { running = false; } };
  const timer = setInterval(() => guardedCycle().catch((error) => process.stderr.write(`${JSON.stringify({ level: 'error', component: 'runtime-worker', message: error.message })}\n`)), intervalMs); timer.unref();
  const stop = async () => { if (stopping) return; stopping = true; clearInterval(timer); if (lease.held) await lease.release(); await app.close(); };
  return { app, lease, cycle: guardedCycle, stop };
}

if (require.main === module) { startWorker().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; }); }
module.exports = { startWorker };
