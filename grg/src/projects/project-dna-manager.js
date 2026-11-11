'use strict';
/**
 * FÊNIX OS — LIVING PROJECT DNA MANAGER
 * Manages the continuous evolution, architectural contracts, and relationship mesh
 * for all ecosystem projects.
 */

const fs = require('node:fs');
const path = require('node:path');

class ProjectDNAManager {
  constructor(options = {}) {
    this.storagePath = options.storagePath || path.join(__dirname, '..', '.data', 'project_dna.json');
    this.graphBrain = options.graphBrain || null;
    this.eventBus = options.eventBus || null;
    this.dnaMap = new Map(); // projectId -> ProjectDNA

    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.projects) {
          for (const [pId, dna] of Object.entries(data.projects)) {
            this.dnaMap.set(pId, dna);
          }
        }
      } else {
        this.seedInitialDNA();
      }
    } catch (e) {
      this.seedInitialDNA();
    }
  }

  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const projects = {};
      for (const [k, v] of this.dnaMap.entries()) {
        projects[k] = v;
      }
      fs.writeFileSync(this.storagePath, JSON.stringify({
        version: '2.0.0',
        updatedAt: new Date().toISOString(),
        projects,
      }, null, 2), 'utf8');
    } catch (e) {
      console.error('[ProjectDNAManager] Save error:', e.message);
    }
  }

  seedInitialDNA() {
    const fenixDna = {
      projectId: 'fenix-os',
      identity: 'FÊNIX HQ — Autonomous Engineering Operating System',
      purpose: 'Self-evolving operating system for autonomous agent orchestration, living memory, and real-time system visibility',
      architecture: 'Single-Shell SPA + Fastify Kernel + Redis Bus + BullMQ Workers + SQLite/Postgres',
      technologies: ['Node.js 20', 'Fastify', 'BullMQ', 'Redis 7.2', 'PixiJS 8', 'Playwright', 'SQLite'],
      modules: ['Kernel', 'Memory Fabric', 'Agent Swarm', 'Living City', 'Flow Graph', 'Project Intelligence Hub'],
      dependencies: ['zapai-crm', 'api-platform'],
      agents: ['agent-architect', 'agent-backend', 'agent-frontend', 'agent-qa', 'agent-devops'],
      capabilities: ['Context-Preserving-UI-Modification', 'Autonomous-Job-Execution', 'Dual-Lane-Routing', 'Live-Graph-Resolution'],
      decisions: [
        { id: 'ADR-001', title: 'Single-Shell Native Architecture', status: 'ACCEPTED', date: '2026-09-01' },
        { id: 'ADR-002', title: 'Zero Mock Policy for Runtime State', status: 'ACCEPTED', date: '2026-09-10' },
        { id: 'ADR-003', title: 'Fênix Reborn Memory 7-Level Ontology', status: 'ACCEPTED', date: '2026-09-19' }
      ],
      constraints: ['Zero Mocks', 'Preserve Single Source of Truth', 'Non-Destructive Memory Abstraction'],
      knownProblems: [],
      patterns: ['Dual-Lane Non-Blocking Concurrency', 'Event-Driven State Synchronization', 'Reborn Causal Provenance'],
      memories: [],
      currentState: { health: 'HEALTHY', activeFleet: 15, realityScore: 100 },
      evolutionHistory: [{ timestamp: new Date().toISOString(), event: 'Project DNA Initialized' }],
    };

    const zapaiDna = {
      projectId: 'zapai-crm',
      identity: 'ZapAI Tower — Omnichannel WhatsApp CRM',
      purpose: 'Multi-device WhatsApp customer relations management, automated campaign dispatches, and AI conversational routing',
      architecture: 'React 18 + Vite + Tailwind CSS + Express + Socket.IO + Baileys Multi-Device',
      technologies: ['React 18', 'TypeScript', 'Vite', 'Express', 'Socket.IO', 'Baileys', 'PostgreSQL'],
      modules: ['Inbox', 'Campaigns', 'Contacts', 'Automation Flows', 'Quick Responses', 'Session Broker'],
      dependencies: ['api-platform', 'fenix-os'],
      agents: ['agent-backend', 'agent-frontend', 'agent-qa'],
      capabilities: ['Multi-Device-Session-Healing', 'Campaign-Batch-Dispatch', 'Omnichannel-Inbox-Streaming'],
      decisions: [
        { id: 'ADR-Z01', title: 'Baileys Multi-Device Native Integration', status: 'ACCEPTED', date: '2026-08-15' }
      ],
      constraints: ['Preserve WhatsApp session heartbeat', 'Zero unhandled socket drops'],
      knownProblems: [],
      patterns: ['Exponential Backoff Socket Reconnection', 'Message Queued Dispatching'],
      memories: [],
      currentState: { health: 'HEALTHY', port: 4025, status: 'ONLINE' },
      evolutionHistory: [{ timestamp: new Date().toISOString(), event: 'Project DNA Initialized' }],
    };

    const apiPlatformDna = {
      projectId: 'api-platform',
      identity: 'AI Platform Tower — Multi-Provider Inference & Synthesis Core',
      purpose: 'High-throughput LLM gateway, embedding computation, BullMQ background worker queue, and token economics',
      architecture: 'Fastify + TypeScript + Prisma ORM + BullMQ + Docker',
      technologies: ['Node.js 22', 'Fastify', 'TypeScript', 'Prisma', 'BullMQ', 'Docker'],
      modules: ['Inference Gateway', 'Model Router', 'Vector Pipeline', 'Worker Farm'],
      dependencies: ['fenix-os'],
      agents: ['agent-backend', 'agent-database', 'agent-devops'],
      capabilities: ['Dynamic-Model-Fallback', 'Vector-Embedding-Batching', 'SLA-Bound-Inference'],
      decisions: [
        { id: 'ADR-P01', title: 'Qwen 2.5 3B Local Fast Inference Engine', status: 'ACCEPTED', date: '2026-08-20' }
      ],
      constraints: ['Keep SLA < 300ms for Fast Lane calls'],
      knownProblems: [],
      patterns: ['Multi-Model Circuit Breaker', 'Token Budget Optimizer'],
      memories: [],
      currentState: { health: 'HEALTHY', port: 8081, status: 'ONLINE' },
      evolutionHistory: [{ timestamp: new Date().toISOString(), event: 'Project DNA Initialized' }],
    };

    this.dnaMap.set('fenix-os', fenixDna);
    this.dnaMap.set('zapai-crm', zapaiDna);
    this.dnaMap.set('api-platform', apiPlatformDna);

    this.save();
    this.syncToGraphBrain();
  }

  syncToGraphBrain() {
    if (!this.graphBrain) return;
    for (const dna of this.dnaMap.values()) {
      try {
        const dnaNodeId = `dna:${dna.projectId}`;
        this.graphBrain.addNode(dnaNodeId, 'PROJECT_DNA', {
          identity: dna.identity,
          purpose: dna.purpose,
          architecture: dna.architecture,
          technologies: dna.technologies,
          capabilitiesCount: dna.capabilities.length,
        });
        this.graphBrain.addEdge(`project:${dna.projectId}`, 'HAS_DNA', dnaNodeId);

        // Sync dependencies
        for (const dep of dna.dependencies) {
          this.graphBrain.addEdge(`project:${dna.projectId}`, 'REQUIRES', `project:${dep}`);
        }
      } catch (e) {}
    }
  }

  getDNA(projectId) {
    return this.dnaMap.get(projectId) || null;
  }

  evolveDNA(projectId, update = {}) {
    const dna = this.dnaMap.get(projectId);
    if (!dna) return null;

    if (update.newPattern && !dna.patterns.includes(update.newPattern)) {
      dna.patterns.push(update.newPattern);
    }
    if (update.newCapability && !dna.capabilities.includes(update.newCapability)) {
      dna.capabilities.push(update.newCapability);
    }
    if (update.newDecision) {
      dna.decisions.push(update.newDecision);
    }
    if (update.memoryId && !dna.memories.includes(update.memoryId)) {
      dna.memories.push(update.memoryId);
    }
    if (update.currentState) {
      dna.currentState = { ...dna.currentState, ...update.currentState };
    }

    dna.evolutionHistory.push({
      timestamp: new Date().toISOString(),
      event: update.event || 'DNA Evolution Triggered by Living Memory',
      metadata: update.metadata || {},
    });

    this.save();
    this.syncToGraphBrain();

    if (this.eventBus) {
      this.eventBus.emit('project.dna.evolved', { projectId, timestamp: new Date().toISOString() });
    }

    return dna;
  }

  listAll() {
    return Array.from(this.dnaMap.values());
  }
}

let globalProjectDNAManager = null;
function getProjectDNAManager(options = {}) {
  if (!globalProjectDNAManager) {
    globalProjectDNAManager = new ProjectDNAManager(options);
  }
  return globalProjectDNAManager;
}

module.exports = {
  ProjectDNAManager,
  getProjectDNAManager,
};
