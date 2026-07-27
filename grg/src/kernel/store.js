// Store port: a transactional key/collection state container.
// MemoryStore = adapter local (testes/dev). FileStore = persistência local.
// Adapter Postgres+RLS implementa a MESMA interface (read/update) sem tocar no domínio.
const fs = require('node:fs');
const path = require('node:path');

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

const EMPTY_STATE = () => ({
  schemaVersion: 4,
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
});

class MemoryStore {
  constructor(initial = null) {
    this.state = initial ? clone(initial) : EMPTY_STATE();
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
    this.queue = this.queue.then(async () => {
      const next = await mutator(clone(this.state));
      this.state = clone(next);
    });
    await this.queue;
    return clone(this.state);
  }
}

class FileStore extends MemoryStore {
  constructor(filePath) {
    super(null);
    this.filePath = path.resolve(filePath);
    if (fs.existsSync(this.filePath)) {
      this.state = { ...EMPTY_STATE(), ...JSON.parse(fs.readFileSync(this.filePath, 'utf8')) };
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
    this.queue = this.queue.then(async () => {
      const next = await mutator(clone(this.state));
      this.state = clone(next);
      this.persist();
    });
    await this.queue;
    return clone(this.state);
  }

  persist() {
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(this.state, null, 2)}\n`);
    fs.renameSync(tmp, this.filePath);
  }
}

module.exports = { MemoryStore, FileStore, EMPTY_STATE };
