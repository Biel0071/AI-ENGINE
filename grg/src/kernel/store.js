// Store port: a transactional key/collection state container.
// MemoryStore = adapter local (testes/dev). FileStore = persistência local.
// Adapter Postgres+RLS implementa a MESMA interface (read/update) sem tocar no domínio.
const fs = require('node:fs');
const path = require('node:path');
const { CURRENT_SCHEMA_VERSION, migrateState } = require('./state-migrations');

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
});

class MemoryStore {
  constructor(initial = null) {
    this.state = initial ? migrateState(clone(initial)).state : EMPTY_STATE();
    this.queue = Promise.resolve();
  }

  async read() {
    return clone(this.state);
  }

  async write(state) {
    this.state = clone(state);
    return clone(this.state);
  }

  async update(mutator) {
    const task = this.queue.then(async () => {
      const next = await mutator(clone(this.state));
      this.state = clone(next);
    });
    this.queue = task.catch(() => {});
    await task;
    return clone(this.state);
  }
}

class FileStore extends MemoryStore {
  constructor(filePath) {
    super(null);
    this.filePath = path.resolve(filePath);
    if (fs.existsSync(this.filePath)) {
      const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const migrated = migrateState(raw);
      this.state = { ...EMPTY_STATE(), ...migrated.state };
      if (migrated.applied.length) this.persist();
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
    const task = this.queue.then(async () => {
      const next = await mutator(clone(this.state));
      this.state = clone(next);
      this.persist();
    });
    this.queue = task.catch(() => {});
    await task;
    return clone(this.state);
  }

  persist() {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`);
    fs.renameSync(tmp, this.filePath);
  }
}

module.exports = { MemoryStore, FileStore, EMPTY_STATE };
