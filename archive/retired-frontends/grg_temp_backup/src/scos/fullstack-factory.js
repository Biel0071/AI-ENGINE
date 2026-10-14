const { uuid } = require('../kernel/ids');
const { ValidationError } = require('../kernel/errors');

class FullStackFactoryService {
  constructor({ store, bus, controlPlane, designIntel, appGenome, projectFactory, capabilityRegistry = null }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.designIntel = designIntel;
    this.appGenome = appGenome;
    this.projectFactory = projectFactory;
    this.capabilityRegistry = capabilityRegistry;
  }

  async generateMultiDesignProposals(tenantId, actorId, spec = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const appName = spec.name || 'Enterprise System';

    const proposals = [
      { id: 'proposal-enterprise', name: 'Enterprise Style', family: 'enterprise', primaryColor: '#0f62fe', description: 'Clean, dense, structured layout ideal for corporate operations.' },
      { id: 'proposal-minimal', name: 'Minimal Style', family: 'minimal', primaryColor: '#000000', description: 'Ultra-clean, high-focus layout inspired by Linear and Notion.' },
      { id: 'proposal-ai', name: 'AI Workspace Style', family: 'ai-workspace', primaryColor: '#10a37f', description: 'Dark-mode focused, prompt-driven workspace with artifact inspector.' },
      { id: 'proposal-luxury', name: 'Luxury Style', family: 'luxury', primaryColor: '#d4af37', description: 'High-contrast premium dark aesthetic with gold accents.' },
    ];

    return {
      tenantId,
      appName,
      proposalsCount: proposals.length,
      proposals,
      generatedAt: new Date().toISOString(),
    };
  }

  async syncFrontendBackendContract(tenantId, actorId, update = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    if (!update.contractName) throw new ValidationError('contractName is required for synchronization');

    const result = this.#buildContract(tenantId, update);

    if (this.bus?.emit) {
      await this.bus.emit('fullstack.contract.synced', { tenantId, syncId: result.id, contractName: result.contractName });
    }

    return result;
  }

  async createFullStackSlice(tenantId, actorId, spec = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    const prompt = String(spec.prompt || spec.objective || spec.name || '').trim();
    if (!prompt) throw new ValidationError('prompt is required');

    const name = String(spec.name || titleFromPrompt(prompt)).trim();
    const contract = this.#buildContract(tenantId, {
      contractName: spec.contractName || `${name.replace(/[^A-Za-z0-9]+/g, '') || 'Generated'}Contract`,
      entity: spec.entity,
      fields: spec.fields,
      actions: spec.actions,
    });
    const id = uuid();
    const createdAt = new Date().toISOString();
    const artifact = {
      id,
      tenantId,
      kind: 'fullstack-slice',
      skillId: 'fullstack-slice-builder',
      name,
      prompt,
      status: 'READY_FOR_IMPLEMENTATION',
      contract,
      backend: {
        service: 'FullStackFactoryService',
        routes: [
          { method: 'GET', path: `/api/scos/factory/slices/${id}` },
          { method: 'GET', path: `/api/scos/factory/slices/${id}/data` },
          { method: 'POST', path: `/api/scos/factory/slices/${id}/data` },
        ],
      },
      frontend: {
        viewId: `slice-${slug(name)}`,
        componentName: `${pascal(name)}Workspace`,
        dataSource: `/api/scos/factory/slices/${id}/data`,
        controls: contract.actions.map((action) => ({ action, endpoint: `/api/scos/factory/slices/${id}/data` })),
      },
      tests: [
        `GET /api/scos/factory/slices/${id}`,
        `GET /api/scos/factory/slices/${id}/data`,
        `POST /api/scos/factory/slices/${id}/data`,
      ],
      records: [sampleRecord(contract)],
      createdAt,
      createdBy: actorId,
    };

    await this.#ensureCapability(tenantId, actorId);
    await this.store.update((state) => {
      state.artifacts = state.artifacts || [];
      state.artifacts.push(artifact);
      state.factoryDemands = state.factoryDemands || [];
      state.factoryDemands.push({
        id: uuid(),
        tenantId,
        projectName: name,
        demandPrompt: prompt,
        projectType: 'FULLSTACK_SLICE',
        architecture: { frontend: 'runtime-generated view contract', backend: 'stored API slice', database: 'FENIX state store' },
        questions: [],
        backlog: artifact.tests.map((task, index) => ({ step: index + 1, task })),
        missionId: null,
        artifactId: id,
        status: 'READY_TO_BUILD',
        createdAt,
      });
      return state;
    });

    if (this.bus?.emit) await this.bus.emit('fullstack.slice.created', { tenantId, actorId, artifactId: id, name });
    return artifact;
  }

  async listFullStackSlices(tenantId, actorId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    return { slices: this.#slices(state, tenantId), total: this.#slices(state, tenantId).length };
  }

  async getFullStackSlice(tenantId, actorId, sliceId) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    const slice = this.#slices(state, tenantId).find((item) => item.id === sliceId);
    if (!slice) throw new ValidationError(`fullstack slice not found: ${sliceId}`);
    return slice;
  }

  async sliceData(tenantId, actorId, sliceId) {
    const slice = await this.getFullStackSlice(tenantId, actorId, sliceId);
    return { sliceId, contract: slice.contract, records: slice.records || [] };
  }

  async appendSliceRecord(tenantId, actorId, sliceId, record = {}) {
    await this.cp.authorize(tenantId, actorId, 'project:write');
    let saved;
    await this.store.update((state) => {
      const slice = this.#slices(state, tenantId).find((item) => item.id === sliceId);
      if (!slice) throw new ValidationError(`fullstack slice not found: ${sliceId}`);
      const clean = {};
      for (const field of slice.contract.schema.fields) {
        clean[field.name] = record[field.name] ?? defaultValue(field);
      }
      saved = { id: uuid(), ...clean, createdAt: new Date().toISOString(), createdBy: actorId };
      slice.records = Array.isArray(slice.records) ? slice.records : [];
      slice.records.push(saved);
      return state;
    });
    if (this.bus?.emit) await this.bus.emit('fullstack.slice.record.created', { tenantId, actorId, sliceId, recordId: saved.id });
    return { sliceId, record: saved };
  }

  #buildContract(tenantId, update = {}) {
    const contractName = String(update.contractName || 'GeneratedFullStackContract');
    const entity = String(update.entity || contractName.replace(/Contract|Route/g, '') || 'Entity');
    const fields = normalizeFields(update.fields);
    const actions = normalizeActions(update.actions);
    const routeBase = `/api/generated/${slug(entity)}`;
    return {
      id: uuid(),
      tenantId,
      contractName,
      entity,
      schema: { name: entity, fields },
      routes: [
        { method: 'GET', path: routeBase, returns: `${entity}[]` },
        { method: 'POST', path: routeBase, accepts: entity, returns: entity },
      ],
      actions,
      syncedComponents: ['Frontend view contract', 'Runtime API routes', 'State-store schema', 'Validation contract', 'Smoke test list'],
      syncStatus: 'SYNCHRONIZED_GREEN',
      timestamp: new Date().toISOString(),
    };
  }

  async #ensureCapability(tenantId, actorId) {
    if (!this.capabilityRegistry) return null;
    try {
      await this.capabilityRegistry.get(tenantId, actorId, 'fullstack-slice-builder');
      return null;
    } catch {
      return this.capabilityRegistry.register(tenantId, actorId, {
        id: 'fullstack-slice-builder',
        name: 'Fullstack Slice Builder',
        description: 'Cria contrato, backend persistido, frontend contract e testes de uma fatia funcional no mesmo fluxo.',
        version: '1.0.0',
        owner: 'GRG FENIX',
        state: 'ACTIVE',
        permissions: ['project:write', 'project:read'],
        resources: ['state-store', 'http-api', 'skill-registry'],
        runtimeJobTypes: ['factory.generate'],
        documentation: ['skills/fullstack-slice-builder/SKILL.md'],
        tests: ['test/scos-software-creation-os.test.js'],
        dependencies: ['software-factory'],
      });
    }
  }

  #slices(state, tenantId) {
    return (state.artifacts || []).filter((item) => item.tenantId === tenantId && item.kind === 'fullstack-slice');
  }
}

function normalizeFields(input) {
  const fields = Array.isArray(input) ? input : [];
  const normalized = fields
    .map((field) => typeof field === 'string' ? { name: field, type: 'string', required: false } : field)
    .filter((field) => field && /^[A-Za-z][A-Za-z0-9_]{1,40}$/.test(String(field.name || '')))
    .map((field) => ({ name: String(field.name), type: String(field.type || 'string'), required: field.required !== false }));
  return normalized.length ? normalized : [
    { name: 'title', type: 'string', required: true },
    { name: 'status', type: 'enum:todo|doing|done', required: true },
    { name: 'owner', type: 'string', required: false },
  ];
}

function normalizeActions(input) {
  const actions = Array.isArray(input) ? input.map(String).filter(Boolean) : [];
  return actions.length ? actions : ['list', 'create', 'validate'];
}

function sampleRecord(contract) {
  const record = { id: uuid() };
  for (const field of contract.schema.fields) record[field.name] = defaultValue(field);
  record.createdAt = new Date().toISOString();
  return record;
}

function defaultValue(field) {
  if (String(field.type).startsWith('enum:')) return String(field.type).slice(5).split('|')[0] || 'todo';
  if (field.type === 'number') return 0;
  if (field.type === 'boolean') return false;
  return field.name === 'title' ? 'Primeiro registro funcional' : '';
}

function titleFromPrompt(prompt) {
  return String(prompt).split(/\s+/).slice(0, 5).join(' ') || 'Fullstack Slice';
}

function slug(value) {
  return String(value || 'slice').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'slice';
}

function pascal(value) {
  return slug(value).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('') || 'Slice';
}

module.exports = { FullStackFactoryService };
