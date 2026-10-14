// Store port: a transactional key/collection state container.
// MemoryStore = adapter local (testes/dev). FileStore = persistência local.
// Adapter Postgres+RLS implementa a MESMA interface (read/update) sem tocar no domínio.
const fs = require('node:fs');
const path = require('node:path');
const { CURRENT_SCHEMA_VERSION, migrateState } = require('./state-migrations');
const { applyRetention, loadLimits } = require('./retention');

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const EMPTY_STATE = () => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  tenants: [],
  orgs: [],
  customers: [],
  users: [],
  memberships: [],
  projects: [],
  repositories: [],
  snapshots: [],
  capabilities: [],
  memoryEvents: [],
  graphEdges: [],
  runs: [],
  deployments: [],
  aiCalls: [],
  aiCache: [],
  brands: [],
  domains: [],
  plans: [],
  licenses: [],
  moduleSets: [],
  designSystems: [],
  buildTargets: [],
  artifacts: [],
  marketplaceInstalls: [],
  subscriptions: [],
  invoices: [],
  insights: [],
  learningCycles: [],
  digitalTwins: [],
  workforces: [],
  employees: [],
  dailyReports: [],
  employeeTemplates: [],
  sessions: [],
  auditEvents: [],
  approvalRequests: [],
  idempotencyKeys: [],
  outbox: [],
  inbox: [],
  migrationHistory: [],
  memories: [],
  memoryVersions: [],
  knowledgeEntities: [],
  knowledgeRelationships: [],
  serviceRegistry: [],
  serviceVersions: [],
  domainEvents: [],
  fabricEnrollments: [],
  discoveryScans: [],
  discoveredResources: [],
  knowledgePublications: [],
  resourceVersions: [],
  changeSets: [],
  rollbackProposals: [],
  cityNodes: [],
  cityEdges: [],
  cityProjectionStates: [],
  runtimeJobs: [],
  runtimeSchedules: [],
  deadLetters: [],
  workerHeartbeats: [],
  capabilityDefinitions: [],
  capabilityVersions: [],
  capabilityLogs: [],
  cognitiveGoals: [],
  cognitiveObservations: [],
  cognitiveHypotheses: [],
  cognitiveDecisions: [],
  cognitiveValidations: [],
  cognitiveReflections: [],
  cognitiveCycles: [],
  cognitiveCursors: [],
  operationalTwins: [],
  cognitiveEntities: [],
  cognitiveWorkspaces: [],
  cognitiveAgents: [],
  cognitiveAccessGrants: [],
  knowledgeSharingPolicies: [],
  toolDefinitions: [],
  scriptSigners: [],
  scriptDefinitions: [],
  sandboxExecutions: [],
  executionTimeline: [],
  inspectionRuns: [],
  inspectionReports: [],
  inspectionTwins: [],
  evolutionProposals: [],
  agentCycles: [],
  agentTasks: [],
  agentSummaries: [],
  knowledgePromotionProposals: [],
  evolutionPatterns: [],
  operationalActivationRuns: [],
  operationalComponentStates: [],
  operationalComponentHistory: [],
  operationalInvestigations: [],
  operationalReadinessReports: [],
  dailyIntelligenceReports: [],
  operationalAssurances: [],
  missions: [],
  missionSteps: [],
  missionEvents: [],
  missionContextRefs: [],
  missionSummaries: [],
  missionCheckpoints: [],
  projectKernelStates: [],
  engineeringMemories: [],
  memoryReuseEvents: [],
  missionPlans: [],
  operationalStabilityReports: [],
  onedeployRuns: [],
  smokeRuns: [],
  realityFeedbacks: [],
  capOsRegistry: [],
  cognitiveEvents: [],
  cognitiveMarketplaceItems: [],
  cognitiveAtoms: [],
  presenceConfigs: [],
  githubOrgs: [],
  githubPullRequests: [],
  githubIssues: [],
  vpsServers: [],
  vpsOperationPlans: [],
  selfDeployPipelines: [],
  factoryDemands: [],
  councilSeats: [],
  councilDecisions: [],
  researchCycles: [],
  objectiveStates: [],
  gatekeeperDecisions: [],
  livingRuntimeTicks: [],
  livingRuntimeLeases: [],
  missionPlaybooks: [],
  missionBenchmarks: [],
  researchSourceCache: [],
  improvementScans: [],
  assistedModeWindows: [],
  organismIdentity: [],
  connectorRegistry: [],
  connectorMetrics: [],
  connectorEvents: [],
  aiRouterDecisions: [],
  programs: [],
  conversations: [],
  messages: [],
  chatPreferences: [],
  apiConnectionState: [],
  apiConnectionEvents: [],
  observabilitySamples: [],
  orchestrationRequests: [],
  orchestrationMissions: [],
  orchestrationEvents: [],
});

class MemoryStore {
  constructor(initial = null, options = {}) {
    this.state = initial ? migrateState(clone(initial)).state : EMPTY_STATE();
    this.queue = Promise.resolve();
    // Retencao: colecoes de historico sao podadas a cada escrita. Sem isto o
    // documento cresce sem limite e o custo de TODA escrita cresce com ele.
    this.retentionLimits = options.retentionLimits || loadLimits(options.env);
    this.retentionEnabled = options.retention !== false;
  }

  async read() {
    return this.state;
  }

  #prune(state) {
    if (!this.retentionEnabled) return state;
    this.lastPruned = applyRetention(state, this.retentionLimits);
    return state;
  }

  async write(state) {
    this.state = this.#prune(clone(state));
    return clone(this.state);
  }

  async update(mutator) {
    const task = this.queue.then(async () => {
      const next = await mutator(clone(this.state));
      this.state = this.#prune(clone(next));
    });
    this.queue = task.catch(() => {});
    await task;
    return clone(this.state);
  }
}

class FileStore extends MemoryStore {
  constructor(filePath, options = {}) {
    super(null, options);
    this.persistQueue = Promise.resolve();
    this.pendingPersist = null;
    this.persistRunning = false;
    this.filePath = path.resolve(filePath);
    if (fs.existsSync(this.filePath)) {
      let raw;
      try {
        raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (err) {
        // A crashed/concurrent writer must not prevent the kernel from booting.
        // Keep the damaged artifact for forensics and start from a valid state;
        // the next atomic persist will replace it with canonical JSON.
        const damaged = `${this.filePath}.corrupt-${Date.now()}-${process.pid}`;
        try { fs.renameSync(this.filePath, damaged); } catch {}
        console.error(`[FileStore] Invalid state file; quarantined as ${path.basename(damaged)}: ${err.message}`);
        raw = EMPTY_STATE();
      }
      const migrated = migrateState(raw);
      this.state = { ...EMPTY_STATE(), ...migrated.state };
      // Poda tambem na carga: um arquivo herdado de antes da retencao pode
      // chegar grande demais e travar o boot antes da primeira escrita.
      const prunedOnLoad = this.retentionEnabled ? applyRetention(this.state, this.retentionLimits) : {};
      if (migrated.applied.length || Object.keys(prunedOnLoad).length) this.persist();
    } else {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, `${JSON.stringify(this.state, null, 2)}\n`);
    }
  }

  async write(state) {
    const result = await super.write(state);
    await this.persist(result);
    return result;
  }

  async update(mutator) {
    const result = await super.update(mutator);
    await this.persist(result);
    return result;
  }

  // Escritas de missão/evento são frequentes. A versão anterior serializava e
  // renomeava sincronamente o estado inteiro em cada evento, bloqueando o
  // event loop e fazendo /health parecer indisponível durante uma missão.
  // Mantemos snapshots ordenados e atomicidade, mas deixamos I/O fora do loop.
  persist(snapshot = this.state) {
    // A state update can emit several events in one worker tick. Persisting a
    // full multi-megabyte snapshot for every event creates an unbounded queue:
    // HTTP/health still reads memory, while workers wait behind stale writes.
    // Keep only the newest snapshot while one atomic write is in flight.
    this.pendingPersist = clone(snapshot);
    if (!this.persistRunning) {
      this.persistRunning = true;
      this.persistQueue = this.#drainPersist();
    }
    return this.persistQueue;
  }

  async #drainPersist() {
    try {
      while (this.pendingPersist !== null) {
        const snapshot = this.pendingPersist;
        this.pendingPersist = null;
        await this.persistAsync(snapshot);
      }
    } finally {
      this.persistRunning = false;
    }
  }

  async persistAsync(snapshot) {
    // Never share a temporary path between test/server processes. Sharing it
    // allowed concurrent writers to interleave/truncate one another's JSON.
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
    await fs.promises.writeFile(tmp, `${JSON.stringify(snapshot, null, 2)}\n`);
    // Windows can briefly hold the destination while antivirus/indexing or a
    // just-finished reader releases it. A single EPERM used to leave the
    // mission state stuck in RUNNING even though the job had completed.
    let lastError;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        await fs.promises.rename(tmp, this.filePath);
        return;
      } catch (err) {
        lastError = err;
        if (!['EPERM', 'EBUSY', 'EACCES'].includes(err.code) || attempt === 7) break;
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    try { await fs.promises.unlink(tmp); } catch {}
    throw lastError;
  }
}

module.exports = { MemoryStore, FileStore, EMPTY_STATE };
