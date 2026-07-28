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
    return clone(this.state);
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
    this.filePath = path.resolve(filePath);
    if (fs.existsSync(this.filePath)) {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
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
    this.persist();
    return result;
  }

  async update(mutator) {
    const result = await super.update(mutator);
    this.persist();
    return result;
  }

  persist() {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`);
    fs.renameSync(tmp, this.filePath);
  }
}

module.exports = { MemoryStore, FileStore, EMPTY_STATE };
