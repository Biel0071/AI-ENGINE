const os = require('node:os');
const fs = require('node:fs');
const { measured, unknown, collect } = require('../kernel/measurement');

// Coleta metricas REAIS do host onde o processo roda. Nada aqui e inventado:
// tudo vem de os.*, process.* ou do filesystem. O que nao da para medir volta UNKNOWN.

// CPU real: os.cpus() e um contador acumulado desde o boot, entao uma leitura unica
// nao diz uso "agora". Tiramos duas amostras e comparamos o delta.
function sampleCpu() {
  return os.cpus().map((cpu) => {
    const times = cpu.times;
    const idle = times.idle;
    const total = times.user + times.nice + times.sys + times.irq + idle;
    return { idle, total };
  });
}

async function cpuUsagePercent(sampleMs = 200) {
  const first = sampleCpu();
  if (!first.length) return unknown('os.cpus() returned no cores');
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const second = sampleCpu();
  let idleDelta = 0; let totalDelta = 0;
  for (let i = 0; i < first.length && i < second.length; i += 1) {
    idleDelta += second[i].idle - first[i].idle;
    totalDelta += second[i].total - first[i].total;
  }
  if (totalDelta <= 0) return unknown('cpu tick delta was zero — sample window too short');
  const busy = 1 - idleDelta / totalDelta;
  return measured(Number((busy * 100).toFixed(2)), `os.cpus(delta ${sampleMs}ms)`, { cores: first.length });
}

function memory() {
  const total = os.totalmem();
  const free = os.freemem();
  if (!total) return { total: unknown('os.totalmem() unavailable'), used: unknown('os.totalmem() unavailable'), usagePercent: unknown('os.totalmem() unavailable') };
  const used = total - free;
  return {
    totalMb: measured(Math.round(total / 1024 / 1024), 'os.totalmem()'),
    usedMb: measured(Math.round(used / 1024 / 1024), 'os.totalmem()-os.freemem()'),
    usagePercent: measured(Number(((used / total) * 100).toFixed(2)), 'os.totalmem()-os.freemem()'),
    processRssMb: measured(Math.round(process.memoryUsage().rss / 1024 / 1024), 'process.memoryUsage().rss'),
  };
}

// Disco: fs.statfs so existe no Node >= 18.15. Em runtime mais antigo isso e
// legitimamente nao-mensuravel — e o relatorio diz isso, em vez de chutar 28.2%.
async function disk(pathToCheck = process.cwd()) {
  if (typeof fs.statfs !== 'function') {
    return unknown(
      `fs.statfs unavailable on ${process.version} (requires >= 18.15)`,
      'run FENIX on Node >= 18.15 to enable disk telemetry',
    );
  }
  return collect('fs.statfs()', async () => {
    const stat = await fs.promises.statfs(pathToCheck);
    const total = stat.blocks * stat.bsize;
    const available = stat.bavail * stat.bsize;
    if (!total) throw new Error('filesystem reported zero blocks');
    return {
      totalGb: Number((total / 1024 ** 3).toFixed(2)),
      availableGb: Number((available / 1024 ** 3).toFixed(2)),
      usagePercent: Number((((total - available) / total) * 100).toFixed(2)),
      path: pathToCheck,
    };
  }, { pending: 'disk telemetry per mount point' });
}

function load() {
  const [one, five, fifteen] = os.loadavg();
  // No Windows loadavg() retorna sempre [0,0,0] — nao e medicao, e placeholder do runtime.
  if (os.platform() === 'win32') {
    return unknown('os.loadavg() always returns 0 on win32', 'deploy on Linux VPS for load average');
  }
  return measured({ '1m': one, '5m': five, '15m': fifteen }, 'os.loadavg()', { cores: os.cpus().length });
}

function host() {
  return {
    platform: measured(os.platform(), 'os.platform()'),
    release: measured(os.release(), 'os.release()'),
    arch: measured(os.arch(), 'os.arch()'),
    hostname: measured(os.hostname(), 'os.hostname()'),
    nodeVersion: measured(process.version, 'process.version'),
    uptimeSeconds: measured(Math.round(os.uptime()), 'os.uptime()'),
    processUptimeSeconds: measured(Math.round(process.uptime()), 'process.uptime()'),
  };
}

async function collectHostMetrics({ cpuSampleMs = 200, diskPath = process.cwd() } = {}) {
  const [cpu, diskUsage] = await Promise.all([cpuUsagePercent(cpuSampleMs), disk(diskPath)]);
  return {
    cpu,
    memory: memory(),
    disk: diskUsage,
    loadAverage: load(),
    host: host(),
    collectedAt: new Date().toISOString(),
  };
}

module.exports = { collectHostMetrics, cpuUsagePercent, memory, disk, load, host };
