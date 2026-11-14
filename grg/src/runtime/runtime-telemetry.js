'use strict';
// Telemetria do runtime na VPS: só valores medidos agora, cada bloco com measuredAt e status.
// Falha de leitura vira UNAVAILABLE com o motivo — nunca um número inventado ou herdado.
// Do `pm2 jlist` só saem nome/estado/reinícios/memória/CPU: a saída bruta carrega variáveis de
// ambiente (segredos) e jamais é repassada.
const { execFile } = require('node:child_process');
const { readMeminfo } = require('./resource-guard');

const measured = (data) => ({ status: 'MEASURED', measuredAt: new Date().toISOString(), ...data });
const unavailable = (reason) => ({ status: 'UNAVAILABLE', measuredAt: new Date().toISOString(), reason: String(reason || 'unknown').slice(0, 200) });

function runPm2(execImpl = execFile) {
  return new Promise((resolve, reject) => {
    execImpl('pm2', ['jlist'], { timeout: 4000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (error, stdout) => (error ? reject(error) : resolve(String(stdout || ''))));
  });
}

async function pm2Processes(execImpl) {
  try {
    const list = JSON.parse(await runPm2(execImpl));
    return measured({ processes: list.map((p) => ({ name: p.name, status: p.pm2_env?.status || null, restarts: p.pm2_env?.restart_time ?? null, uptimeMs: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : null, memoryMb: p.monit?.memory != null ? Math.round(p.monit.memory / 1048576) : null, cpuPercent: p.monit?.cpu ?? null })) });
  } catch (error) { return unavailable(`pm2 jlist: ${error.message}`); }
}

async function timed(fn) { const t = Date.now(); const value = await fn(); return { value, latencyMs: Date.now() - t }; }

async function ollamaStatus(baseUrl, fetchImpl) {
  if (!baseUrl) return unavailable('no Ollama URL configured');
  const get = async (path) => { const res = await fetchImpl(`${baseUrl}${path}`, { signal: AbortSignal.timeout(3000) }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); };
  try {
    const { value: version, latencyMs } = await timed(() => get('/api/version'));
    const ps = await get('/api/ps').catch(() => null);
    return measured({ url: baseUrl, version: version?.version || null, latencyMs, loadedModels: Array.isArray(ps?.models) ? ps.models.map((m) => ({ name: m.name, sizeMb: Math.round(Number(m.size || 0) / 1048576), expiresAt: m.expires_at || null })) : null });
  } catch (error) { return unavailable(`ollama ${baseUrl}: ${error.message}`); }
}

function runtimeFromState(state, nowMs) {
  const jobs = state.runtimeJobs || [];
  const byStatus = {};
  for (const job of jobs) byStatus[job.status] = (byStatus[job.status] || 0) + 1;
  const workers = (state.workerHeartbeats || []).map((w) => ({ workerId: w.workerId, lastSeenAt: w.lastSeenAt, alive: Number.isFinite(Date.parse(w.lastSeenAt)) && nowMs - Date.parse(w.lastSeenAt) <= 30_000 }));
  const blocked = jobs.filter((j) => j.status === 'BLOCKED').map((j) => ({ jobId: j.id, type: j.type, missionId: j.missionId || null, blockedOn: j.blockedOn || null, blockedSince: j.blockedSince || null, retryAt: j.scheduledFor || null }));
  const recentErrors = jobs.filter((j) => j.error && ['FAILED', 'DEAD_LETTER', 'BLOCKED', 'QUEUED'].includes(j.status)).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))).slice(0, 5)
    .map((j) => ({ jobId: j.id, type: j.type, status: j.status, at: j.updatedAt || null, message: String(j.error.message || '').slice(0, 200) }));
  const deliveries = (state.missions || []).filter((m) => m.delivery && Number.isFinite(m.delivery.metrics?.totalDurationMs)).sort((a, b) => String(b.delivery.completedAt || '').localeCompare(String(a.delivery.completedAt || ''))).slice(0, 10);
  const latency = deliveries.length ? { samples: deliveries.length, lastMs: deliveries[0].delivery.metrics.totalDurationMs, avgMs: Math.round(deliveries.reduce((s, m) => s + m.delivery.metrics.totalDurationMs, 0) / deliveries.length), lastStatus: deliveries[0].delivery.deliveryStatus, lastAt: deliveries[0].delivery.completedAt || null } : null;
  return measured({ jobs: { total: jobs.length, byStatus }, blocked, workers, workersAlive: workers.filter((w) => w.alive).length, deadLetters: (state.deadLetters || []).length, recentErrors, codeDeliveryLatency: latency });
}

async function collectRuntimeTelemetry({ app, env = process.env, fetchImpl = globalThis.fetch, execImpl, meminfoReader = readMeminfo, now = Date.now } = {}) {
  const ollamaUrl = String(env.FENIX_CODER_OLLAMA_URL || env.FENIX_OLLAMA_URL || env.GRG_OLLAMA_DIRECT_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const meminfo = meminfoReader();
  let store; let state = null;
  try { const r = await timed(() => app.store.read()); state = r.value; store = measured({ readLatencyMs: r.latencyMs, driver: app.store.constructor?.name || null }); } catch (error) { store = unavailable(`store read: ${error.message}`); }
  let redis;
  const client = app.redis?.client;
  if (!client || typeof client.ping !== 'function') redis = unavailable('Redis not configured in this process');
  else { try { const r = await timed(() => client.ping()); redis = measured({ latencyMs: r.latencyMs, reply: String(r.value) }); } catch (error) { redis = unavailable(`redis ping: ${error.message}`); } }
  const [pm2, ollama] = await Promise.all([pm2Processes(execImpl), ollamaStatus(ollamaUrl, fetchImpl)]);
  return {
    memoryDetail: meminfo ? measured(meminfo) : unavailable('/proc/meminfo not readable on this host'),
    services: { pm2, store, redis, ollama },
    runtime: state ? runtimeFromState(state, now()) : unavailable('state not readable'),
  };
}

// Cache curto: o painel pode consultar a cada poucos segundos sem pesar na VPS.
function cachedRuntimeTelemetry(ttlMs = 5000) {
  let last = null; let at = 0; let inflight = null;
  return async (options) => {
    if (last && Date.now() - at < ttlMs) return { ...last, cache: { ageMs: Date.now() - at, ttlMs } };
    inflight ||= collectRuntimeTelemetry(options).then((value) => { last = value; at = Date.now(); return value; }).finally(() => { inflight = null; });
    const value = await inflight;
    return { ...value, cache: { ageMs: Date.now() - at, ttlMs } };
  };
}

module.exports = { collectRuntimeTelemetry, cachedRuntimeTelemetry, runtimeFromState };