const os = require('node:os');
const { measured, unknown } = require('../kernel/measurement');

// Observabilidade HONESTA.
//
// MEDIDO EM PRODUCAO (2026-07-29): este era o modulo que MEDE a saude do sistema e tinha 13
// sinais falsos -- a ironia que o proprio auditor apontou. `getMetrics` devolvia cpuUsagePercent
// 14.5, ramUsageMb 3840, database `HEALTHY` com 12 conexoes, 48250 tokens, latencia 142ms,
// 4 workers ativos: TUDO escrito a mao, nada lido. Um painel de observabilidade que inventa a
// telemetria e pior que a ausencia dele -- o operador confia no numero e nao ve o incidente.
//
// Agora cada campo carrega proveniencia (measured/unknown):
//   - system  -> process.memoryUsage()/os: RAM e load REAIS deste processo/host.
//   - infra   -> health.check(): status DERIVADO dos probes reais; sem probe -> unknown.
//   - aiRuntime -> aiGateway.telemetry()/providerHealth(): tokens/custo/saude REAIS do store.
//   - workers -> store: contagem real de jobs por status, workers com heartbeat, dead-letters.
// O que nao e sondavel do processo (CPU% instantaneo preciso, disco) vira unknown com motivo.
class ObservabilityCenterService {
  constructor({ store, bus, controlPlane, metrics, health, aiGateway }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.metrics = metrics;
    this.health = health;
    this.aiGateway = aiGateway;
  }

  async getMetrics(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'runtime:admin');

    return {
      tenantId,
      system: await this.#system(),
      infrastructure: await this.#infrastructure(),
      aiRuntime: await this.#aiRuntime(tenantId, actorId),
      workers: await this.#workers(tenantId),
      timestamp: new Date().toISOString(),
    };
  }

  // Memoria e load do processo/host sao mediveis de dentro do Node. O uso de CPU% instantaneo
  // exige duas amostras de process.cpuUsage() ao longo do tempo -- nao e um valor unico honesto,
  // entao reportamos loadAverage (real no host) e deixamos o percentual como unknown.
  async #system() {
    const mem = process.memoryUsage();
    const rss = measured(Math.round(mem.rss / 1024 / 1024), 'process.memoryUsage');
    const heapUsed = measured(Math.round(mem.heapUsed / 1024 / 1024), 'process.memoryUsage');
    const totalMb = measured(Math.round(os.totalmem() / 1024 / 1024), 'os.totalmem');
    const load = os.loadavg();
    // loadavg e [0,0,0] no Windows -- e honesto reportar unknown ali em vez de fingir carga.
    const loadReal = load && load.some((v) => v > 0);
    return {
      processRssMb: rss,
      processHeapUsedMb: heapUsed,
      hostTotalMemMb: totalMb,
      hostLoadAvg1m: loadReal ? measured(Number(load[0].toFixed(2)), 'os.loadavg') : unknown('os.loadavg unavailable on this platform'),
      cpuUsagePercent: unknown('instantaneous CPU% requires timed cpuUsage() sampling; not measured per request', { action: 'expose a sampled gauge from the runtime loop' }),
      uptimeSeconds: measured(Math.round(process.uptime()), 'process.uptime'),
    };
  }

  // Status da infra vem dos PROBES reais registrados no HealthRegistry, nunca de 'HEALTHY' fixo.
  async #infrastructure() {
    if (!this.health || typeof this.health.check !== 'function') {
      return unknown('no health registry wired; infrastructure status cannot be probed');
    }
    const report = await this.health.check();
    // Cada probe real vira um estado derivado. `ok` verdadeiro do probe -> measured; ausencia de
    // probe para um recurso -> ele simplesmente nao aparece, em vez de um selo verde inventado.
    const infra = { overall: measured(report.status, 'health-registry'), checkedAt: report.checkedAt };
    for (const [name, detail] of Object.entries(report.checks || {})) {
      infra[name] = measured({ ok: detail.ok, critical: detail.critical, ...(detail.error ? { error: detail.error } : {}) }, `health:${name}`);
    }
    return infra;
  }

  // Telemetria REAL do gateway de IA: chamadas, tokens e custo agregados do store, saude por
  // provider derivada de available()+breaker. Sem gateway, unknown -- nunca 48250 tokens fixos.
  async #aiRuntime(tenantId, actorId) {
    if (!this.aiGateway || typeof this.aiGateway.telemetry !== 'function') {
      return unknown('no ai gateway wired; ai runtime telemetry unavailable');
    }
    const tel = await this.aiGateway.telemetry(tenantId, actorId);
    const providerHealth = typeof this.aiGateway.providerHealth === 'function'
      ? await this.aiGateway.providerHealth()
      : null;
    return {
      calls: measured(tel.calls, 'ai-gateway.telemetry'),
      cacheHits: measured(tel.cacheHits, 'ai-gateway.telemetry'),
      totalTokensConsumed: measured(tel.totalTokens, 'ai-gateway.telemetry'),
      totalCostUsd: measured(tel.totalCostUsd, 'ai-gateway.telemetry'),
      budget: measured(tel.budget, 'ai-gateway.budget'),
      providers: providerHealth ? measured(providerHealth, 'ai-gateway.providerHealth') : unknown('provider health probe unavailable'),
    };
  }

  // Workers e fila vem da contagem REAL do store: jobs por status, heartbeats vivos, dead-letters.
  async #workers(tenantId) {
    const state = await this.store.read();
    const jobs = (state.runtimeJobs || []).filter((j) => j.tenantId === tenantId);
    const byStatus = {};
    for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    const heartbeats = (state.workerHeartbeats || []).filter((w) => w.tenantId === tenantId);
    const deadLetters = (state.deadLetters || []).filter((d) => d.tenantId === tenantId);
    return {
      knownWorkers: measured(heartbeats.length, 'store:workerHeartbeats'),
      jobsByStatus: measured(byStatus, 'store:runtimeJobs'),
      queueDepth: measured((byStatus.PENDING || 0) + (byStatus.RUNNING || 0), 'store:runtimeJobs'),
      deadLetters: measured(deadLetters.length, 'store:deadLetters'),
    };
  }
}

module.exports = { ObservabilityCenterService };
