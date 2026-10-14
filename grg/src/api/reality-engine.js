'use strict';

const os = require('node:os');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_SNAPSHOT_TTL_MS = 30_000;
let runtimeSnapshot = null;
let runtimeSnapshotPromise = null;

function createProvenance(value, source, sourceType, endpoint, confidence = null, status = 'UNVERIFIED') {
  return { value, source, sourceType, endpoint, timestamp: new Date().toISOString(), freshness: 'current request', confidence, status };
}

function errorWithCode(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function readDiskUsage() {
  const unavailable = { totalGb: null, usedGb: null, freeGb: null, usedPercent: null, status: 'UNAVAILABLE' };
  try {
    if (typeof fs.statfsSync !== 'function') return unavailable;
    const stats = fs.statfsSync(process.platform === 'win32' ? process.cwd() : '/');
    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bavail;
    if (!Number.isFinite(totalBytes) || totalBytes <= 0) return unavailable;
    const usedBytes = totalBytes - freeBytes;
    return {
      totalGb: Math.round(totalBytes / (1024 ** 3)),
      usedGb: Math.round(usedBytes / (1024 ** 3)),
      freeGb: Math.round(freeBytes / (1024 ** 3)),
      usedPercent: Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100))),
      status: 'MEASURED',
    };
  } catch {
    return unavailable;
  }
}

function cpuCounters() {
  return os.cpus().reduce((total, cpu) => {
    const times = cpu.times || {};
    const idle = Number(times.idle) || 0;
    const busy = Object.entries(times).reduce((sum, [key, value]) => sum + (key === 'idle' ? 0 : (Number(value) || 0)), 0);
    return { idle: total.idle + idle, total: total.total + idle + busy };
  }, { idle: 0, total: 0 });
}

async function measureCpuPercent(sampleMs = 120) {
  const first = cpuCounters();
  await new Promise((resolve) => setTimeout(resolve, sampleMs));
  const second = cpuCounters();
  const total = second.total - first.total;
  const idle = second.idle - first.idle;
  if (!Number.isFinite(total) || total <= 0 || idle < 0) return null;
  return Math.min(100, Math.max(0, Math.round(((total - idle) / total) * 100)));
}

class RealityEngine {
  constructor(app = null) { this.app = app; }

  async getRuntimeSnapshot() {
    if (runtimeSnapshot && runtimeSnapshot.expiresAt > Date.now()) return runtimeSnapshot.value;
    if (runtimeSnapshotPromise) return runtimeSnapshotPromise;

    runtimeSnapshotPromise = (async () => {
      const pm2 = this.getPm2ProcessesWithAvailability();
      const docker = this.getDockerContainersWithAvailability();
      const git = this.getGitState();
      const projects = await Promise.resolve(this.getProjects()).catch(() => []);
      const value = {
        disk: readDiskUsage(),
        pm2List: pm2.items,
        dockerList: docker.items,
        gitState: git,
        projects,
        sourceStatus: { pm2: pm2.status, docker: docker.status, git: git.status, projectRegistry: Array.isArray(projects) ? 'REGISTRY' : 'UNAVAILABLE' },
      };
      runtimeSnapshot = { value, expiresAt: Date.now() + RUNTIME_SNAPSHOT_TTL_MS };
      return value;
    })();
    try { return await runtimeSnapshotPromise; }
    finally { runtimeSnapshotPromise = null; }
  }

  getPm2ProcessesWithAvailability() {
    try {
      const raw = cp.execSync('pm2 jlist', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return { status: 'INVALID_RESPONSE', items: [] };
      return { status: 'MEASURED', items: list.map((process) => ({
        id: process.pm_id ?? null,
        name: process.name || null,
        pid: Number(process.pid) || null,
        status: process.pm2_env?.status === 'online' ? 'ONLINE' : 'OFFLINE',
        uptimeSeconds: process.pm2_env?.pm_uptime ? Math.max(0, Math.round((Date.now() - process.pm2_env.pm_uptime) / 1000)) : null,
        restarts: Number(process.pm2_env?.restart_time) || 0,
        memoryMb: Number.isFinite(Number(process.monit?.memory)) ? Math.round(Number(process.monit.memory) / (1024 ** 2)) : null,
        cpuPercent: Number.isFinite(Number(process.monit?.cpu)) ? Number(process.monit.cpu) : null,
      })) };
    } catch { return { status: 'UNAVAILABLE', items: [] }; }
  }

  getPm2Processes() { return this.getPm2ProcessesWithAvailability().items; }

  getDockerContainersWithAvailability() {
    try {
      const raw = cp.execSync('docker ps --format "{{json .}}"', { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8');
      const items = raw.trim().split('\n').filter(Boolean).map((line) => {
        const container = JSON.parse(line);
        const rawStatus = String(container.Status || '');
        const status = /unhealthy|restarting|exited|dead/i.test(rawStatus) ? 'DEGRADED' : (/healthy/i.test(rawStatus) ? 'HEALTHY' : (/\bUp\b/i.test(rawStatus) ? 'ONLINE' : 'UNKNOWN'));
        return { name: container.Names || null, status, rawStatus, ports: container.Ports || '', image: container.Image || null };
      });
      return { status: 'MEASURED', items };
    } catch { return { status: 'UNAVAILABLE', items: [] }; }
  }

  getDockerContainers() { return this.getDockerContainersWithAvailability().items; }

  getGitState() {
    const cwd = path.resolve(process.env.FENIX_GIT_ROOT || path.resolve(__dirname, '../../..'));
    try {
      const run = (command) => cp.execSync(command, { cwd, timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').trim();
      const branch = run('git rev-parse --abbrev-ref HEAD');
      const head = run('git rev-parse HEAD');
      const commitMsg = run('git log -1 --pretty=%B');
      const commitDate = run('git log -1 --pretty=%cI');
      const changes = run('git status --porcelain');
      return { status: 'MEASURED', branch, head: head.slice(0, 8), fullHead: head, commitMsg, commitDate, clean: !changes, dirtyCount: changes ? changes.split('\n').length : 0 };
    } catch { return { status: 'UNAVAILABLE', branch: null, head: null, fullHead: null, commitMsg: null, commitDate: null, clean: null, dirtyCount: null }; }
  }

  getQueueAndJobs() {
    try {
      const { globalJobQueueManager } = require('../execution/job-queue-manager');
      if (!globalJobQueueManager) return { available: false, queue: null, jobs: [] };
      const queue = globalJobQueueManager.getQueueStatus();
      const jobs = globalJobQueueManager.listJobs();
      return { available: true, queue, jobs: Array.isArray(jobs) ? jobs : [] };
    } catch { return { available: false, queue: null, jobs: [] }; }
  }

  getDynamicAgents() {
    try {
      const { globalDynamicWorkforce } = require('../reconstruction/dynamic-workforce');
      if (!globalDynamicWorkforce) return { available: false, executors: [], agents: [] };
      return { available: true, executors: globalDynamicWorkforce.getExecutors(), agents: globalDynamicWorkforce.getAllAgents() };
    } catch { return { available: false, executors: [], agents: [] }; }
  }

  getProjects() {
    try {
      const { getAllProjects } = require('../projects/project-registry');
      const projects = getAllProjects();
      return Array.isArray(projects) ? projects : [];
    } catch { return []; }
  }

  async getRealitySummary(context = {}) {
    const app = context.app || this.app;
    const tenantId = context.tenantId;
    const actorId = context.actorId;
    const cpus = os.cpus();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsage = process.memoryUsage();
    const hostUptime = os.uptime();
    const procUptime = process.uptime();
    const system = await this.getRuntimeSnapshot();
    let projects = system.projects;
    let projectStatus = system.sourceStatus?.projectRegistry || 'REGISTRY';
    if (app?.projectKernel && tenantId && actorId) {
      try { projects = await app.projectKernel.list(tenantId, actorId); projectStatus = 'MEASURED'; }
      catch { projects = []; projectStatus = 'UNAVAILABLE'; }
    }
    let jobs = [];
    let queue = null;
    let jobsStatus = 'UNAVAILABLE';
    if (app?.jobs && tenantId && actorId) {
      try { jobs = await app.jobs.list(tenantId, actorId); queue = { total: jobs.length }; jobsStatus = 'MEASURED'; }
      catch { jobsStatus = 'UNAVAILABLE'; }
    } else {
      const jobSnapshot = this.getQueueAndJobs();
      jobs = jobSnapshot.jobs;
      queue = jobSnapshot.queue;
      if (jobSnapshot.available) jobsStatus = 'MEASURED';
    }
    const agentSnapshot = this.getDynamicAgents();
    const executors = Array.isArray(agentSnapshot.executors) ? agentSnapshot.executors : [];
    const agents = Array.isArray(agentSnapshot.agents) ? agentSnapshot.agents : [];
    const cpuPercent = await measureCpuPercent();
    const activeInterfaces = Object.values(os.networkInterfaces()).flat().filter((address) => address && !address.internal).length;
    const hostDays = Math.floor(hostUptime / 86400);
    const hostHours = Math.floor((hostUptime % 86400) / 3600);
    const hostUptimeFormatted = `${hostDays}d ${hostHours}h`;
    const procUptimeFormatted = `${(procUptime / 3600).toFixed(1)}h`;
    const ramPercent = totalMem > 0 ? Math.round(((totalMem - freeMem) / totalMem) * 100) : null;
    const containerCount = system.sourceStatus?.docker === 'MEASURED' ? system.dockerList.length : null;
    const pm2Count = system.sourceStatus?.pm2 === 'MEASURED' ? system.pm2List.length : null;
    const completed = jobs.filter((job) => job.status === 'COMPLETED').length;
    const running = jobs.filter((job) => job.status === 'RUNNING').length;
    const queued = jobs.filter((job) => ['QUEUED', 'PENDING', 'AWAITING_APPROVAL'].includes(job.status)).length;
    const failed = jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(job.status)).length;
    const registeredAgents = agentSnapshot.available ? agents.length : null;

    return {
      ok: true,
      timestamp: new Date().toISOString(),
      realityScore: { score: null, status: 'NOT_EVALUATED', mockCount: null, deadButtons: null, brokenFlows: null, unconnectedApis: null, reason: 'A auditoria global de mocks e fluxos não foi executada.' },
      kpis: {
        agentsOnline: createProvenance(null, 'Agentes online requerem heartbeat de runtime', 'NOT_MEASURED', '/api/v2/living-city/state', null, 'NOT_MEASURED'),
        agentsRegistered: createProvenance(registeredAgents, 'DynamicWorkforce registry', 'REGISTRY', '/api/v2/system-reconstruction/executors', null, agentSnapshot.available ? 'REGISTERED' : 'UNAVAILABLE'),
        activeSystems: createProvenance({
          projects: Array.isArray(projects) && projectStatus !== 'UNAVAILABLE' ? projects.length : null,
          dockerContainers: containerCount,
          pm2Processes: pm2Count,
          display: `${projects?.length ?? '—'} Projetos • ${containerCount ?? '—'} Contêineres • ${pm2Count ?? '—'} Processos`,
        }, 'ProjectKernel + Docker CLI + PM2', 'LIVE_RUNTIME', '/api/v2/reality/summary', null, projectStatus === 'MEASURED' && system.sourceStatus?.docker === 'MEASURED' && system.sourceStatus?.pm2 === 'MEASURED' ? 'MEASURED' : 'PARTIAL'),
        tasksTotal: createProvenance(jobsStatus === 'MEASURED' ? { total: jobs.length, completed, queued, running, failed, retained: true } : null, 'JobEngine/BullMQ', 'QUEUE', '/api/v2/jobs', null, jobsStatus),
        uptime: createProvenance({ hostSeconds: hostUptime, hostFormatted: hostUptimeFormatted, processSeconds: Math.round(procUptime), processFormatted: procUptimeFormatted }, 'os.uptime() + process.uptime()', 'SYSTEM_KERNEL', '/api/v2/reality/summary', null, 'MEASURED'),
        performance: createProvenance({ cpuPercent, ramPercent, diskPercent: system.disk.usedPercent, display: `RAM ${ramPercent ?? '—'}% • CPU ${cpuPercent ?? '—'}%` }, 'OS counters + filesystem statistics', 'SYSTEM_KERNEL', '/api/v2/reality/summary', null, cpuPercent !== null && system.disk.usedPercent !== null ? 'MEASURED' : 'PARTIAL'),
      },
      recentJobs: jobs.slice(-10).reverse().map((job) => ({
        id: job.id || job.jobId || null,
        title: job.title || job.prompt || job.type || 'Job sem título',
        type: job.type || null,
        projectId: job.projectId || null,
        agentName: job.agent?.name || job.agent?.agentId || job.agentName || null,
        status: job.status || 'UNKNOWN',
        progress: Number.isFinite(Number(job.progress)) ? Number(job.progress) : null,
        actualLatencyMs: Number.isFinite(Number(job.actualLatencyMs)) ? Number(job.actualLatencyMs) : null,
        actualTokens: Number.isFinite(Number(job.actualTokens)) ? Number(job.actualTokens) : null,
        createdAt: job.createdAt || null,
        completedAt: job.completedAt || null,
      })),
      aiCityBuildings: [],
      dynamicWorkforce: { count: registeredAgents, executors, agents },
      hostTelemetry: {
        cpu: { cores: cpus.length, model: cpus[0]?.model || null, loadAverage: os.loadavg(), percent: cpuPercent },
        memory: {
          totalMb: Math.round(totalMem / (1024 ** 2)), freeMb: Math.round(freeMem / (1024 ** 2)),
          usedMb: Math.round((totalMem - freeMem) / (1024 ** 2)), usedPercent: ramPercent,
          processRssMb: Math.round(memUsage.rss / (1024 ** 2)), processHeapUsedMb: Math.round(memUsage.heapUsed / (1024 ** 2)),
        },
        disk: system.disk,
        network: { interfaceCount: activeInterfaces, throughputBps: null, status: 'UNAVAILABLE' },
        system: { uptimeSeconds: Math.round(hostUptime), uptimeFormatted: hostUptimeFormatted, platform: os.platform(), release: os.release() },
      },
      gitState: system.gitState,
      pm2Processes: system.pm2List,
      dockerContainers: system.dockerList,
      projects,
      sourceStatus: system.sourceStatus,
    };
  }
}

module.exports = { RealityEngine, createProvenance, readDiskUsage, measureCpuPercent };
