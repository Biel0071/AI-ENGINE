/**
 * FÊNIX WS BRIDGE — Conecta o EventBus interno ao WebSocket real
 * 
 * Resolve:
 * 1. app.bus vs app.eventBus inconsistency no JobWorker
 * 2. Heartbeat periódico a cada 10s
 * 3. Ring buffer de 1000 eventos para replay
 * 4. Snapshot completo do runtime ao conectar
 * 5. Filtro de secrets antes de enviar ao browser
 */
'use strict';

const RING_BUFFER_SIZE = 1000;
const HEARTBEAT_MS = 10_000;

// Campos que NUNCA podem ir para o browser
const SECRET_KEYS = /password|passwd|secret|token|api.?key|private.?key|credential|cookie|session/i;

function sanitize(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(i => sanitize(i, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
}

class FenixWSBridge {
  constructor({ bus, wss }) {
    this.bus = bus;       // app.bus (EventBus from kernel/event-bus.js)
    this.wss = wss;       // WebSocketServer instance
    this.clients = new Set();
    this.ringBuffer = []; // circular buffer of last N events
    this.eventSeq = 0;
    this.startedAt = Date.now();
    this._heartbeatTimer = null;
    this._busUnsub = null;
  }

  start() {
    // Subscribe to ALL events on the internal bus
    this._busUnsub = this.bus.on('*', (event) => {
      const enriched = {
        seq: ++this.eventSeq,
        type: event.type,
        payload: sanitize(event.payload),
        at: event.at || new Date().toISOString()
      };

      // Push to ring buffer (bounded)
      this.ringBuffer.push(enriched);
      if (this.ringBuffer.length > RING_BUFFER_SIZE) {
        this.ringBuffer.shift();
      }

      // Broadcast to all WS clients
      this._broadcast(enriched);
    });

    // Heartbeat every 10s
    this._heartbeatTimer = setInterval(() => {
      const hb = {
        seq: ++this.eventSeq,
        type: 'runtime.heartbeat',
        payload: {
          uptime: Math.floor((Date.now() - this.startedAt) / 1000),
          clients: this.clients.size,
          bufferedEvents: this.ringBuffer.length,
          at: new Date().toISOString()
        },
        at: new Date().toISOString()
      };
      this.ringBuffer.push(hb);
      if (this.ringBuffer.length > RING_BUFFER_SIZE) this.ringBuffer.shift();
      this._broadcast(hb);
    }, HEARTBEAT_MS);

    // Handle new WS connections
    this.wss.on('connection', (ws, req) => this._handleClient(ws, req));

    console.log('[FenixWSBridge] Started — listening on /events, heartbeat every', HEARTBEAT_MS, 'ms');
  }

  stop() {
    if (this._busUnsub) this._busUnsub();
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
  }

  _handleClient(ws, req) {
    this.clients.add(ws);
    console.log('[FenixWSBridge] Client connected. Total:', this.clients.size);

    // Send connection ack
    this._send(ws, {
      type: 'runtime.connected',
      payload: {
        serverTime: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startedAt) / 1000),
        lastSeq: this.eventSeq
      }
    });

    // Handle client messages (e.g. replay request)
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'replay' && typeof msg.since === 'number') {
          const missed = this.ringBuffer.filter(e => e.seq > msg.since);
          for (const evt of missed) {
            this._send(ws, evt);
          }
        } else if (msg.type === 'ping') {
          this._send(ws, { type: 'pong', payload: { seq: msg.seq } });
        }
      } catch (e) {
        // ignore malformed
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      console.log('[FenixWSBridge] Client disconnected. Total:', this.clients.size);
    });

    ws.on('error', (err) => {
      console.warn('[FenixWSBridge] WS error:', err.message);
      this.clients.delete(ws);
    });
  }

  _broadcast(event) {
    const payload = JSON.stringify(event);
    for (const ws of this.clients) {
      if (ws.readyState === 1) { // OPEN
        try { ws.send(payload); } catch (e) { /* ignore */ }
      }
    }
  }

  _send(ws, event) {
    if (ws.readyState === 1) {
      try { ws.send(JSON.stringify(event)); } catch (e) { /* ignore */ }
    }
  }

  /**
   * Build a snapshot of the current runtime state
   */
  async buildSnapshot(app) {
    const now = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startedAt) / 1000);

    let jobs = [];
    let queueStats = { running: 0, ready: 0, queued: 0, completed: 0, failed: 0, retrying: 0, repairing: 0, blocked: 0, waiting: 0, waitingDependency: 0 };
    try {
      if (app.jobQueue) {
        const allJobs = app.jobQueue.list ? app.jobQueue.list() : [];
        jobs = allJobs.slice(-50).map(j => ({
          id: j.id,
          type: j.type,
          status: j.status,
          projectId: j.projectId,
          client: j.client,
          parentId: j.parentId || null,
          dependencies: j.dependencies || [],
          agentId: j.agentId || j.workerId || null,
          skill: j.skill || null,
          model: j.model || null,
          createdAt: j.createdAt,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          failedAt: j.failedAt,
          missionId: j.missionId,
          filesChanged: j.filesChanged || [],
          tests: j.tests || null,
          browser: j.browser || null,
          visualQa: j.visualQa || null,
          visualState: j.result?.visualState || j.pipelineResult?.visualState || null,
          ragContext: j.ragContext || null,
          microtasks: j.microtasks || [],
          principalAgent: j.principalAgent || null,
          assignedAgentId: j.assignedAgentId || null,
          repairCount: j.repairCount || 0,
          repairJobIds: j.repairJobIds || [],
          targetJobId: j.targetJobId || null,
          error: j.error || null,
          logs: j.logs || []
        }));
        queueStats = app.jobQueue.metrics ? app.jobQueue.metrics() : queueStats;
      }
    } catch (e) { /* ignore */ }

    let runtimeJobs = [];
    try {
      if (app.store) {
        const state = await app.store.read();
        runtimeJobs = (state.runtimeJobs || [])
          .filter(j => j.status !== 'SUCCEEDED')
          .slice(-30)
          .map(j => ({
            id: j.id,
            type: j.type,
            status: j.status,
            tenantId: j.tenantId,
            createdAt: j.createdAt,
            workerId: j.workerId
          }));
      }
    } catch (e) { /* ignore */ }

    let workers = { active: 0, total: 0 };
    try {
      if (app.jobWorker) {
        workers = { active: app.jobWorker.activeJobs?.size || 0, total: app.jobWorker.maxConcurrent || 3 };
      }
    } catch (e) { /* ignore */ }

    let agents = [];
    try {
      if (app.agentEcosystem) {
        agents = (app.agentEcosystem.getActiveAgents?.() || []).map(a => ({
          id: a.id, status: a.status, role: a.role
        }));
      }
    } catch (e) { /* ignore */ }
    agents = mergeRuntimeAgents(agents, jobs, app.agentAvatarRegistry);

    let missions = [];
    try {
      if (app.jobQueue?.listMissions) {
        missions = app.jobQueue.listMissions().slice(0, 30).map((mission) => ({
          id: mission.id,
          missionId: mission.missionId || mission.id,
          status: mission.status,
          projectId: mission.projectId,
          client: mission.client,
          objective: mission.objective,
          intent: mission.intent?.kind || mission.intent,
          stats: mission.stats,
          definitionOfDone: mission.definitionOfDone,
          deliveryContract: mission.deliveryContract || null,
          delivery: mission.delivery || null,
          deliveryVerdict: mission.deliveryVerdict || null,
          principalAgent: mission.principalAgent || null,
          assignedAgentId: mission.assignedAgentId || null,
          modelRouting: mission.modelRouting || [],
          projectDna: mission.projectDna || null,
          rag: mission.rag ? {
            queries: mission.rag.queries || [],
            topScore: mission.rag.topScore || 0,
            results: (mission.rag.results || []).slice(0, 8).map((item) => ({ title: item.title, score: item.score, source: item.source }))
          } : null,
          createdAt: mission.createdAt,
          updatedAt: mission.updatedAt,
          completedAt: mission.completedAt,
          failedAt: mission.failedAt
        }));
      }
    } catch (e) { /* ignore */ }

    let projects = [];
    try {
      projects = app.projectRegistry?.list ? app.projectRegistry.list() : [];
    } catch (e) { /* ignore */ }

    const operationalTwin = buildOperationalTwin({
      projects,
      jobs,
      runtimeJobs,
      agents,
      missions,
      workers,
      status: 'ONLINE',
      events: this.ringBuffer.slice(-80)
    });

    let proceduralLearning = null;
    try {
      proceduralLearning = app.proceduralLearning?.summary ? app.proceduralLearning.summary() : null;
    } catch (e) { /* ignore */ }

    return {
      type: 'runtime.snapshot',
      payload: {
        serverTime: now,
        uptime,
        status: 'ONLINE',
        wsClients: this.clients.size,
        lastSeq: this.eventSeq,
        workers,
        queue: queueStats,
        jobs,
        runtimeJobs,
        agents,
        missions,
        projects: projects.map((project) => ({
          projectId: project.projectId,
          name: project.name,
          stack: project.stack,
          status: project.status,
          previewUrl: project.previewUrl || '',
          dna: project.dna ? {
            framework: project.dna.framework || null,
            language: project.dna.language || null,
            backend: project.dna.backend || null,
            frontend: project.dna.frontend || null,
            tests: Array.isArray(project.dna.tests) ? project.dna.tests.length : 0,
            git: project.dna.git || null
          } : null,
          operationalTwin: project.operationalTwin || null
        })),
        operationalTwin,
        proceduralLearning,
      }
    };
  }
}

const FLOOR_KEYS = {
  DEV_CONTEXT: 'projects',
  RAG_CONTEXT: 'rag-memory',
  ARCHITECTURE_REVIEW: 'software-factory',
  AGENT_DISPATCH: 'ai-agents',
  PROJECT_ANALYSIS: 'software-factory',
  BACKEND_IMPLEMENT: 'backend',
  FRONTEND_IMPLEMENT: 'frontend',
  INTEGRATION_CHECK: 'software-factory',
  QA_TESTS: 'qa-testing',
  VISUAL_QA: 'visual-engine',
  VISUAL_STATE: 'visual-engine',
  GIT_DIFF: 'devops-vps',
  MEMORY_WRITE: 'rag-memory',
  FINAL_REVIEW: 'observability',
  REPAIR_DIAGNOSTIC: 'observability',
  REPAIR_IMPLEMENT: 'software-factory'
};

function mergeRuntimeAgents(sourceAgents, jobs, avatarRegistry) {
  const realJobAgents = jobs
    .filter((job) => job.agentId || job.workerId || job.principalAgent?.id)
    .map((job) => {
      const id = job.agentId || job.workerId || job.principalAgent?.id;
      return {
        id,
        agentId: id,
        name: agentNameFor(job),
        role: roleForJob(job),
        specialization: specializationForJob(job),
        status: visualAgentStatus(job),
        model: modelLabel(job.model),
        skill: job.skill || null,
        projectId: job.projectId || null,
        workspace: null,
        missionId: job.missionId || null,
        jobId: job.id,
        currentJob: job.id,
        currentTask: job.type,
        microtasks: job.microtasks || [],
        performance: {
          progress: progressForJob(job),
          repairCount: job.repairCount || 0,
          filesChanged: job.filesChanged?.length || 0
        },
        floorKey: floorForJob(job),
        roomKey: roomForJob(job, floorForJob(job)),
        lastActivity: job.completedAt || job.failedAt || job.startedAt || job.createdAt || null,
        source: 'job-queue'
      };
    });
  const merged = [...(sourceAgents || []), ...realJobAgents]
    .filter((agent, index, arr) => {
      const id = agent.id || agent.agentId;
      return id && arr.findIndex((item) => (item.id || item.agentId) === id) === index;
    })
    .map((agent) => {
      const normalized = {
        ...agent,
        id: agent.id || agent.agentId,
        status: visualAgentStatus(agent),
        role: agent.role || 'Runtime Agent',
        specialization: agent.specialization || specializationForAgent(agent),
        floorKey: agent.floorKey || floorForAgent(agent),
        roomKey: agent.roomKey || roomForAgent(agent, agent.floorKey || floorForAgent(agent)),
        lastActivity: agent.lastActivity || agent.startedAt || null
      };
      return {
        ...normalized,
        avatar: avatarRegistry?.getOrCreate ? avatarRegistry.getOrCreate(normalized) : null
      };
    });
  return merged;
}

function agentNameFor(job) {
  if (job.principalAgent?.id) return 'FENIX Principal';
  const role = roleForJob(job);
  return role.replace(/\b\w/g, (m) => m.toUpperCase());
}

function roleForJob(job) {
  const type = String(job.type || '').toUpperCase();
  if (type.includes('ARCHITECTURE')) return 'Architect Agent';
  if (type.includes('DISPATCH')) return 'Agent Dispatcher';
  if (type.includes('FRONTEND')) return 'Frontend Engineer';
  if (type.includes('BACKEND')) return 'Backend Engineer';
  if (type.includes('VISUAL')) return 'Visual QA';
  if (type.includes('QA')) return 'QA Engineer';
  if (type.includes('RAG')) return 'RAG Specialist';
  if (type.includes('MEMORY')) return 'Memory Specialist';
  if (type.includes('REPAIR')) return 'Repair Operator';
  if (type.includes('GIT')) return 'Release Reviewer';
  if (type.includes('FINAL')) return 'Final Reviewer';
  if (type.includes('DEV_CONTEXT')) return 'Architect Agent';
  return job.agentId || 'Runtime Agent';
}

function specializationForJob(job) {
  const type = String(job.type || '').toUpperCase();
  if (type.includes('VISUAL')) return 'browser and screenshot evidence';
  if (type.includes('FRONTEND')) return 'canonical frontend implementation';
  if (type.includes('BACKEND')) return 'runtime and API integration';
  if (type.includes('ARCHITECTURE')) return 'project architecture';
  if (type.includes('DISPATCH')) return 'mission orchestration';
  if (type.includes('QA')) return 'automated quality gates';
  if (type.includes('REPAIR')) return 'diagnostic and repair loop';
  if (type.includes('RAG')) return 'retrieval context';
  if (type.includes('MEMORY')) return 'structured mission memory';
  return 'runtime operations';
}

function specializationForAgent(agent) {
  const text = `${agent.role || ''} ${agent.id || ''}`.toLowerCase();
  if (/front|visual|browser/.test(text)) return 'visual development';
  if (/back|api|database/.test(text)) return 'systems engineering';
  if (/qa|test/.test(text)) return 'quality validation';
  if (/rag|memory|knowledge/.test(text)) return 'knowledge operations';
  return 'runtime operations';
}

function visualAgentStatus(item) {
  const raw = String(item.status || item.state || '').toUpperCase();
  const type = String(item.type || item.currentTask || '').toUpperCase();
  if (/COMPLETED|SUCCEEDED/.test(raw)) return 'COMPLETED';
  if (/BLOCKED|FAILED|ERROR/.test(raw)) return raw.includes('FAILED') ? 'BLOCKED' : raw;
  if (/REPAIRING/.test(raw) || (/REPAIR/.test(type) && /RUNNING|WORKING|ACTIVE|QUEUED|WAITING|PENDING/.test(raw))) return 'REPAIRING';
  if (/WAITING|QUEUED|PENDING/.test(raw)) return 'WAITING';
  if (/VISUAL|BROWSER/.test(type) && /RUNNING|WORKING|ACTIVE/.test(raw)) return 'BROWSER';
  if (/QA|TEST/.test(type) && /RUNNING|WORKING|ACTIVE/.test(raw)) return 'TESTING';
  if (/RUNNING|WORKING|ACTIVE/.test(raw)) return 'WORKING';
  return raw || 'IDLE';
}

function progressForJob(job) {
  const status = visualAgentStatus(job);
  if (status === 'COMPLETED') return 100;
  if (status === 'WAITING') return 0;
  if (status === 'BLOCKED') return 100;
  const tasks = job.microtasks || [];
  if (tasks.length) return Math.round((tasks.filter((task) => task.status === 'COMPLETED').length / tasks.length) * 100);
  if (/WORKING|TESTING|BROWSER|REPAIRING/.test(status)) return 50;
  return null;
}

function modelLabel(model) {
  if (!model) return null;
  if (typeof model === 'string') return model;
  return [model.provider, model.modelId || model.model, model.tier].filter(Boolean).join(':');
}

function buildOperationalTwin({ projects, jobs, runtimeJobs, agents, missions, workers, status, events }) {
  const primary = projects.find((project) => project.projectId === 'fenix_self_phase3')
    || projects.find((project) => project.operationalTwin)
    || projects[0]
    || {};
  const configured = primary.operationalTwin || fallbackTwin(primary);
  const floors = configured.floors.map((floor) => enrichFloor(floor, { jobs, agents, missions, events }));
  const activeJobs = jobs.filter((job) => /RUNNING|WORKING|REPAIRING/.test(String(job.status || '').toUpperCase()));
  const failedJobs = jobs.filter((job) => /FAILED|BLOCKED/.test(String(job.status || '').toUpperCase()));
  return {
    name: configured.name || 'FENIX TOWER',
    projectId: primary.projectId || null,
    projectName: primary.name || 'FENIX',
    status,
    workers,
    totals: {
      floors: floors.length,
      rooms: floors.reduce((sum, floor) => sum + floor.rooms.length, 0),
      agents: agents.length,
      jobs: jobs.length + runtimeJobs.length,
      activeJobs: activeJobs.length,
      failedJobs: failedJobs.length,
      missions: missions.length,
      events: events.length
    },
    floors,
    projectMap: buildProjectMap(primary, jobs),
    generatedAt: new Date().toISOString(),
    source: 'runtime-snapshot'
  };
}

function enrichFloor(floor, { jobs, agents, missions, events }) {
  const floorJobs = jobs.filter((job) => floorForJob(job) === floor.key);
  const activeJobs = floorJobs.filter((job) => /RUNNING|WORKING|REPAIRING/.test(String(job.status || '').toUpperCase()));
  const failedJobs = floorJobs.filter((job) => /FAILED|BLOCKED/.test(String(job.status || '').toUpperCase()));
  const repairJobs = floorJobs.filter((job) => /REPAIR/.test(String(job.type || '')) || job.repairCount > 0);
  const floorAgents = agents.filter((agent) => floorForAgent(agent) === floor.key);
  const relatedEvents = events.filter((event) => {
    const payload = JSON.stringify(event.payload || {});
    return floorJobs.some((job) => payload.includes(job.id)) || payload.includes(floor.key);
  }).slice(-12);
  return {
    ...floor,
    status: failedJobs.length ? 'ALERT' : activeJobs.length ? 'WORKING' : floorJobs.length ? 'READY' : 'IDLE',
    manager: missions.length || floorJobs.length ? { id: `${floor.key}:manager`, role: 'MANAGER', source: 'MissionEngine', active: activeJobs.length > 0 } : null,
    supervisor: floorJobs.length ? { id: `${floor.key}:supervisor`, role: 'SUPERVISOR', source: 'JobWorker', active: activeJobs.length > 0 } : null,
    metrics: {
      jobs: floorJobs.length,
      activeJobs: activeJobs.length,
      failedJobs: failedJobs.length,
      repairs: repairJobs.length,
      agents: floorAgents.length,
      events: relatedEvents.length
    },
    rooms: (floor.rooms || []).map((room) => enrichRoom(room, floor.key, floorJobs, floorAgents, relatedEvents)),
    jobs: floorJobs.slice(-12),
    agents: floorAgents,
    events: relatedEvents
  };
}

function enrichRoom(room, floorKey, jobs, agents, events) {
  const roomJobs = jobs.filter((job) => roomForJob(job, floorKey) === room.key);
  const roomAgents = agents.filter((agent) => roomForAgent(agent, floorKey) === room.key);
  const failed = roomJobs.some((job) => /FAILED|BLOCKED/.test(String(job.status || '').toUpperCase()));
  const active = roomJobs.some((job) => /RUNNING|WORKING|REPAIRING/.test(String(job.status || '').toUpperCase()));
  return {
    ...room,
    status: failed ? 'ALERT' : active ? 'WORKING' : roomJobs.length ? 'READY' : 'IDLE',
    jobs: roomJobs.slice(-8),
    agents: roomAgents,
    events: events.slice(-6),
    metrics: { jobs: roomJobs.length, agents: roomAgents.length }
  };
}

function floorForJob(job) {
  return FLOOR_KEYS[job.type] || FLOOR_KEYS[job.legacyType] || 'software-factory';
}

function roomForJob(job, floorKey) {
  const type = String(job.type || '').toLowerCase();
  if (type.includes('visual')) return floorKey === 'visual-engine' ? 'visual-qa' : 'visual-state';
  if (type.includes('frontend')) return 'components';
  if (type.includes('backend')) return 'api';
  if (type.includes('qa')) return 'integration';
  if (type.includes('repair')) return 'repair';
  if (type.includes('memory')) return 'memory';
  if (type.includes('rag')) return 'rag';
  if (type.includes('git')) return 'git';
  return (job.key || type || 'work').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function floorForAgent(agent) {
  if (agent.floorKey) return agent.floorKey;
  const text = `${agent.role || ''} ${agent.id || ''}`.toLowerCase();
  if (/visual|browser/.test(text)) return 'visual-engine';
  if (/front|css|react/.test(text)) return 'frontend';
  if (/back|api|database/.test(text)) return 'backend';
  if (/qa|test/.test(text)) return 'qa-testing';
  if (/rag|memory|knowledge/.test(text)) return 'rag-memory';
  if (/devops|git|deploy|vps/.test(text)) return 'devops-vps';
  return 'ai-agents';
}

function roomForAgent(agent, floorKey) {
  if (agent.roomKey) return agent.roomKey;
  const text = `${agent.role || ''} ${agent.id || ''}`.toLowerCase();
  if (floorKey === 'frontend' && /css|style/.test(text)) return 'styling';
  if (floorKey === 'backend' && /auth/.test(text)) return 'auth';
  if (floorKey === 'visual-engine') return /fix|repair/.test(text) ? 'visual-fix' : 'visual-qa';
  return 'architect';
}

function buildProjectMap(project, jobs) {
  const dna = project.dna || {};
  const nodes = [
    dna.frontend && { id: 'frontend', label: 'Frontend', evidence: dna.frontend },
    dna.backend && { id: 'backend', label: 'Backend', evidence: dna.backend },
    dna.database && { id: 'database', label: 'Database', evidence: dna.database },
    dna.api && { id: 'api', label: 'API', evidence: dna.api },
    Array.isArray(dna.tests) && { id: 'tests', label: 'Tests', evidence: `${dna.tests.length} files` },
    project.previewUrl && { id: 'browser', label: 'Browser', evidence: project.previewUrl },
    jobs.some((job) => job.projectId === project.projectId) && { id: 'jobs', label: 'Jobs', evidence: `${jobs.filter((job) => job.projectId === project.projectId).length} jobs` }
  ].filter(Boolean);
  const has = (id) => nodes.some((node) => node.id === id);
  const edges = [
    has('frontend') && has('api') && { from: 'frontend', to: 'api', type: 'calls' },
    has('api') && has('backend') && { from: 'api', to: 'backend', type: 'served-by' },
    has('backend') && has('database') && { from: 'backend', to: 'database', type: 'persists' },
    has('tests') && has('frontend') && { from: 'tests', to: 'frontend', type: 'validates' },
    has('browser') && has('frontend') && { from: 'browser', to: 'frontend', type: 'renders' },
    has('jobs') && has('backend') && { from: 'jobs', to: 'backend', type: 'changes' }
  ].filter(Boolean);
  return { nodes, edges };
}

function fallbackTwin(project) {
  return {
    name: 'FENIX TOWER',
    floors: [
      { level: 0, key: 'control-room', label: 'RECEPCAO / CONTROL ROOM', rooms: [{ key: 'missions', label: 'MISSIONS' }, { key: 'events', label: 'EVENTS' }] },
      { level: 3, key: 'software-factory', label: 'SOFTWARE FACTORY', rooms: [{ key: 'architecture', label: 'ARCHITECTURE' }, { key: 'implementation', label: 'IMPLEMENTATION' }, { key: 'repair', label: 'REPAIR' }] },
      { level: 4, key: 'frontend', label: 'FRONTEND', rooms: [{ key: 'components', label: 'COMPONENTS' }, { key: 'styling', label: 'STYLING' }] },
      { level: 5, key: 'backend', label: 'BACKEND', rooms: [{ key: 'api', label: 'API' }, { key: 'services', label: 'SERVICES' }] },
      { level: 6, key: 'qa-testing', label: 'QA / TESTING', rooms: [{ key: 'integration', label: 'INTEGRATION' }, { key: 'browser', label: 'BROWSER' }] },
      { level: 7, key: 'visual-engine', label: 'VISUAL ENGINE', rooms: [{ key: 'visual-qa', label: 'VISUAL QA' }, { key: 'visual-fix', label: 'VISUAL FIX' }] }
    ],
    source: 'fallback'
  };
}

module.exports = { FenixWSBridge };
