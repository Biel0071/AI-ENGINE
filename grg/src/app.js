// Composition root: monta todos os planos do GRG Services OS com adapters locais.
// Trocar um adapter (Postgres, LiteLLM, GitHub real, packagers reais) não muda este wiring.
const { MemoryStore, FileStore } = require('./kernel/store');
const { EventBus } = require('./kernel/event-bus');
const { ControlPlane } = require('./control-plane/control-plane');
const { RepositoryIntelligence } = require('./repo-intel/repository-intelligence');
const { LocalGitHostAdapter } = require('./repo-intel/ports');
const { AIGateway } = require('./ai-runtime/ai-gateway');
const { buildProvidersFromEnv, loadRoutes } = require('./ai-runtime/provider-registry');
const { SoftwareFactory } = require('./software-factory/software-factory');
const { Deployer } = require('./runtime/deployer');
const { ProductSuite } = require('./product/white-label');
const { AppFactory } = require('./app-factory/app-factory');
const { Orchestrator } = require('./orchestrator/orchestrator');
const { EvolutionEngine } = require('./evolution/evolution-engine');
const { DigitalTwinService } = require('./digital-twin/digital-twin');
const { ChatAgent } = require('./chat/chat-agent');
const { GitHubConnector } = require('./repo-intel/github-connector');
const { PortfolioService } = require('./repo-intel/portfolio');
const { loadSecurityConfig } = require('./security/config');
const { SecurityPlane } = require('./security/security-plane');
const { AuditTrail } = require('./governance/audit-trail');
const { PolicyEngine } = require('./governance/policy-engine');
const { ApprovalEngine } = require('./governance/approval-engine');
const { AuthService } = require('./auth/auth');
const { IdempotencyService } = require('./infrastructure/messaging/idempotency');
const { OutboxService } = require('./infrastructure/messaging/outbox');
const { InboxService } = require('./infrastructure/messaging/inbox');
const { HealthRegistry } = require('./infrastructure/monitoring/health-registry');
const { FileBackupService } = require('./infrastructure/backup/file-backup-service');
const { PostgresStore } = require('./infrastructure/database/postgres-store');
const { RedisCache } = require('./infrastructure/redis/redis-cache');
const { RedisRateLimiter } = require('./infrastructure/redis/redis-rate-limiter');
const { BullMQRuntime } = require('./infrastructure/queue/bullmq-runtime');
const { S3ObjectStore } = require('./infrastructure/storage/s3-object-store');
const { MemoryEngine } = require('./memory/memory-engine');
const { QdrantVectorStore } = require('./memory/qdrant-vector-store');
const { KnowledgeGraph } = require('./knowledge-graph/knowledge-graph');
const { EventStore } = require('./eventing/event-store');
const { FabricEventBus } = require('./eventing/fabric-event-bus');
const { ServiceRegistry } = require('./fabric/service-registry');
const { LocalIdentityProvider, WorkloadIdentityProvider } = require('./fabric/identity-provider');
const { FenixFabric } = require('./fabric/fenix-fabric');
const { FabricProjection } = require('./fabric/fabric-projection');
const { DiscoveryNetwork } = require('./discovery-network/discovery-network');
const { DockerCliProbe } = require('./discovery-network/docker-cli-probe');
const { DiscoveryProjection } = require('./discovery-network/discovery-projection');
const { KnowledgeFederation } = require('./federation/knowledge-federation');
const { FederationProjection } = require('./federation/federation-projection');
const { GlobalVersionEngine } = require('./versioning/global-version-engine');
const { AICityProjection } = require('./ai-city/ai-city-projection');
const { JobEngine } = require('./runtime/job-engine');
const { DockerDeployAdapter } = require('./runtime/docker-deploy-adapter');
const { CapabilityRegistry } = require('./capabilities/capability-registry');
const { CognitiveCore } = require('./cognitive/cognitive-core');
const { CognitiveLearningProjection } = require('./cognitive/learning-projection');
const { AdminAvatar } = require('./cognitive/admin-avatar');

async function createApp(options = {}) {
  const store = options.store || (options.databaseUrl
    ? await PostgresStore.connect({
      connectionString: options.databaseUrl,
      schema: options.databaseSchema,
      ssl: options.databaseSsl,
    })
    : (options.dataFile ? new FileStore(options.dataFile) : new MemoryStore()));
  const bus = new EventBus();
  const eventStore = new EventStore({ store });
  const fabricEvents = new FabricEventBus({ eventStore, liveBus: bus });
  const controlPlane = await new ControlPlane({ store, bus }).initialize(options.master);
  const securityConfig = options.securityConfig || loadSecurityConfig(options.env || process.env);
  const audit = new AuditTrail({ store }).attach(bus);
  const policy = new PolicyEngine();
  const approvals = new ApprovalEngine({ store, bus, controlPlane, audit, policy });
  const gitHost = options.gitHost || new LocalGitHostAdapter();
  const runtimeEnv = options.env || process.env;
  const providers = options.providers || buildProvidersFromEnv(runtimeEnv, { fetchImpl: options.fetchImpl, production: securityConfig.production });
  const routes = options.routes || loadRoutes(runtimeEnv, { production: securityConfig.production });
  if (securityConfig.production) {
    const configured = Object.values(routes).flatMap((route) => [route, ...(Array.isArray(route.fallback) ? route.fallback : route.fallback ? [route.fallback] : [])]);
    if (configured.some((route) => route.provider === 'echo' || !providers[route.provider])) throw new Error('production AI routes require configured real providers');
  }

  const repoIntel = new RepositoryIntelligence({ store, bus, controlPlane, gitHost });
  const aiGateway = new AIGateway({
    store, bus, controlPlane, providers, routes,
    prices: options.aiPrices, rateLimiter: options.aiRateLimiter,
  });
  const path = require('node:path');
  const outputDir = options.outputDir || path.join(__dirname, '..', 'generated');
  const factory = new SoftwareFactory({ store, bus, controlPlane, aiGateway, outputDir });
  let deployProviders = options.deployProviders;
  if (!deployProviders && securityConfig.production && runtimeEnv.FENIX_DEPLOY_DRIVER === 'docker') deployProviders = { container: new DockerDeployAdapter({ generatedRoot: outputDir, publicBaseUrl: runtimeEnv.FENIX_DEPLOY_PUBLIC_BASE_URL || 'http://127.0.0.1', network: runtimeEnv.FENIX_DEPLOY_DOCKER_NETWORK || 'fenix-apps' }) };
  if (securityConfig.production && (!deployProviders || Object.values(deployProviders).some((adapter) => adapter.productionSafe !== true))) throw new Error('production requires explicitly production-safe deploy adapters');
  const defaultDeployTarget = securityConfig.production ? 'container' : 'node';
  const deployer = new Deployer({ store, bus, controlPlane, providers: deployProviders, approvalEngine: approvals, defaultTarget: defaultDeployTarget });
  const product = new ProductSuite({ store, bus, controlPlane });
  const packagers = options.packagers || (securityConfig.production ? {} : undefined);
  if (securityConfig.production && Object.values(packagers).some((adapter) => adapter.productionSafe !== true)) throw new Error('production requires explicitly production-safe packagers');
  const appFactory = new AppFactory({ store, bus, controlPlane, packagers });
  const orchestrator = new Orchestrator({ store, bus, controlPlane, factory, deployer, appFactory, product, defaultDeployTarget });

  // Loop de memória evolutiva: LIGADO por padrão. Aprende a cada evento de negócio.
  const evolution = new EvolutionEngine({ store, bus });
  if (options.evolution !== false) evolution.attach();

  // Digital Twin: modelo vivo por sistema. Auto-refresh quando um repo é (re)analisado.
  const digitalTwin = new DigitalTwinService({ store, bus, controlPlane });
  if (options.digitalTwin !== false) {
    bus.on('scan.completed', async (e) => {
      const { tenantId, repoId } = e.payload || {};
      if (tenantId && repoId) { try { await digitalTwin.refresh(tenantId, 'grg-admin', repoId); } catch { /* actor sem perm: ignora */ } }
    });
  }

  const github = options.github || new GitHubConnector();
  const portfolio = new PortfolioService({ controlPlane, repoIntel, github, digitalTwin, evolution });

  const auth = await new AuthService({
    store, bus, controlPlane, audit, ttlMs: securityConfig.sessionTtlMs,
  }).initialize();
  const security = new SecurityPlane({ auth, config: securityConfig });
  const idempotency = new IdempotencyService({ store });
  const outbox = new OutboxService({ store });
  const inbox = new InboxService({ store });
  const backup = new FileBackupService();
  const redis = options.redis || (options.redisUrl ? await RedisCache.connect({ url: options.redisUrl }) : null);
  if (!aiGateway.rateLimiter && redis) {
    aiGateway.rateLimiter = new RedisRateLimiter({
      client: redis.client,
      limit: Number(runtimeEnv.FENIX_AI_RATE_LIMIT || 60),
      windowMs: Number(runtimeEnv.FENIX_AI_RATE_WINDOW_MS || 60_000),
    });
  }
  const queues = options.queues || (options.queueRedisUrl ? BullMQRuntime.fromUrl(options.queueRedisUrl) : null);
  const objects = options.objects || (options.s3 ? S3ObjectStore.create(options.s3) : null);
  const vectorStore = options.vectorStore || (options.qdrant ? await new QdrantVectorStore(options.qdrant).initialize() : null);
  const memory = new MemoryEngine({ store, bus, controlPlane, vectorStore, cache: redis });
  const knowledgeGraph = new KnowledgeGraph({ store, bus, controlPlane });
  const registry = new ServiceRegistry({ store, controlPlane });
  const configuredIdentity = runtimeEnv.FENIX_IDENTITY_PROVIDER === 'spiffe' ? new WorkloadIdentityProvider({ trustDomain: runtimeEnv.FENIX_SPIFFE_TRUST_DOMAIN, credentialRef: runtimeEnv.FENIX_SPIFFE_CREDENTIAL_REF }) : null;
  if (securityConfig.runtimeEnv === 'production' && !options.identityProvider && !configuredIdentity) throw new Error('production requires an external Fabric identity provider (Vault/step-ca/SPIFFE)');
  const identityProvider = options.identityProvider || configuredIdentity || new LocalIdentityProvider();
  const fabric = new FenixFabric({ store, controlPlane, registry, events: fabricEvents, identityProvider });
  const fabricProjection = new FabricProjection({ events: fabricEvents, knowledgeGraph }).attach();
  const discoveryProbes = options.discoveryProbes || (runtimeEnv.FENIX_DISCOVERY_DOCKER === '1' ? [new DockerCliProbe()] : []);
  const discoveryProjection = new DiscoveryProjection({ events: fabricEvents, registry }).attach();
  const discoveryNetwork = new DiscoveryNetwork({ store, controlPlane, events: fabricEvents, probes: discoveryProbes });
  const federationProjection = new FederationProjection({ events: fabricEvents, memory, knowledgeGraph }).attach();
  const federation = new KnowledgeFederation({ store, controlPlane, events: fabricEvents });
  const versionEngine = new GlobalVersionEngine({ store, controlPlane, events: fabricEvents, approvals, bus }).attach();
  const aiCity = new AICityProjection({ store, controlPlane, events: fabricEvents, eventStore, bus }).attach();
  const jobs = new JobEngine({ store, controlPlane, events: fabricEvents, queue: queues });
  jobs.register('factory.generate', (payload, context) => factory.generate(context.tenantId, context.actorId, payload));
  jobs.register('project.orchestrate', (payload, context) => orchestrator.buildFromPrompt(context.tenantId, context.actorId, payload));
  jobs.register('discovery.scan', (payload, context) => discoveryNetwork.scan(context.tenantId, context.actorId, payload));
  const capabilityRegistry = new CapabilityRegistry({ store, controlPlane, registry, events: fabricEvents, bus }).attach();
  const cognitiveLearning = new CognitiveLearningProjection({ events: fabricEvents, memory, knowledgeGraph, actorResolver: async (tenantId, hypothesisId) => { const state = await store.read(); return state.cognitiveHypotheses.find((item) => item.tenantId === tenantId && item.id === hypothesisId)?.createdBy || 'grg-admin'; } }).attach();
  const cognitiveCore = new CognitiveCore({ store, controlPlane, eventStore, events: fabricEvents, policy, approvals, jobs, contextProviders: [{ name: 'platform', snapshot: async (tenantId) => { const state = await store.read(); const scoped = (items) => items.filter((item) => item.tenantId === tenantId); return { capabilities: scoped(state.capabilityDefinitions).map((item) => ({ id: item.capabilityId, version: item.version, health: item.health })), services: scoped(state.serviceRegistry).map((item) => ({ id: item.id, status: item.status, runtimeStatus: item.runtimeStatus || null })), runtime: { queued: scoped(state.runtimeJobs).filter((item) => item.status === 'QUEUED').length, running: scoped(state.runtimeJobs).filter((item) => item.status === 'RUNNING').length, deadLetters: scoped(state.deadLetters).length }, knowledge: { entities: scoped(state.knowledgeEntities).length }, memory: { active: scoped(state.memories).filter((item) => item.status === 'ACTIVE').length }, versions: scoped(state.resourceVersions).length }; } }] }).attach();
  const adminAvatar = new AdminAvatar({ store, controlPlane, cognitiveCore });
  jobs.register('cognitive.cycle', (payload, context) => cognitiveCore.cycle(context.tenantId, context.actorId, payload));
  const health = new HealthRegistry({ timeoutMs: options.healthTimeoutMs });
  health.register('state-store', async () => {
    if (typeof store.health === 'function') return store.health();
    const state = await store.read();
    return { ok: Number.isInteger(state.schemaVersion), schemaVersion: state.schemaVersion, adapter: options.dataFile ? 'file' : 'memory' };
  });
  health.register('security-plane', async () => ({ ok: !securityConfig.killSwitch, killSwitch: securityConfig.killSwitch }));
  if (redis) health.register('redis', () => redis.health());
  if (queues) health.register('queue', () => queues.health());
  if (objects) health.register('object-storage', () => objects.health());
  if (vectorStore) health.register('vector-store', () => vectorStore.health());
  health.register('ai-providers', async () => {
    const providersHealth = await aiGateway.providerHealth();
    const routeReady = aiGateway.candidates('default').some((item) => providersHealth[item.provider]?.ok);
    return { ok: routeReady, providers: providersHealth };
  }, { critical: false });

  const app = {
    store, bus, controlPlane, repoIntel, aiGateway, factory, deployer, product, appFactory,
    orchestrator, evolution, digitalTwin, github, portfolio, auth, security, securityConfig,
    audit, policy, approvals, idempotency, outbox, inbox, backup, health, redis, queues, objects,
    vectorStore, memory, knowledgeGraph, eventStore, fabricEvents, registry, fabric, fabricProjection,
    discoveryNetwork, discoveryProjection, federation, federationProjection, versionEngine, aiCity, jobs, capabilityRegistry, cognitiveLearning, cognitiveCore, adminAvatar,
  };

  app.close = async () => {
    await Promise.allSettled([
      queues?.close(), redis?.close(), objects?.close(), typeof store.close === 'function' ? store.close() : null,
    ].filter(Boolean));
  };

  // LLM para o chat entender/falar. Cadeia de fallback: AI Platform (VPS/gateway do usuário)
  // → Ollama local → modo regras. Opt-in: options.llm (instância) OU env GRG_LLM=1.
  let llm = options.llm && options.llm !== true ? options.llm : null;
  app.llmSource = llm ? 'injected' : 'none';
  if (!llm && (options.llm === true || process.env.GRG_LLM === '1')) {
    // 1) AI Platform Enterprise (a "API GRATIS" — gateway multi-provider na VPS ou local)
    if (process.env.GRG_AIPLATFORM_URL && process.env.GRG_AIPLATFORM_KEY) {
      try {
        const { AIPlatformProvider } = require('./ai-runtime/aiplatform-provider');
        const gw = new AIPlatformProvider({});
        if (await gw.available()) { llm = gw; app.llmSource = 'aiplatform:' + process.env.GRG_AIPLATFORM_URL; }
      } catch { /* gateway fora do ar: tenta Ollama */ }
    }
    // 2) Ollama local (fallback quando a VPS está fora do ar)
    if (!llm) {
      try {
        const { OllamaProvider } = require('./ai-runtime/ollama-provider');
        const candidate = new OllamaProvider({ model: options.ollamaModel || process.env.GRG_LLM_MODEL || 'qwen2.5:3b' });
        if (await candidate.available()) { llm = candidate; app.llmSource = 'ollama:' + candidate.model; }
      } catch { /* nada: modo regras */ }
    }
  }
  app.llm = llm;

  // Workforce: cada loja/projeto vira uma empresa virtual (dono IA + funcionários por capability).
  const { WorkforceService } = require('./workforce/workforce');
  app.workforce = new WorkforceService({ store, bus, controlPlane, digitalTwin, evolution, llm });

  // Discovery Engine: classifica capacidades de um repo vs o que a GRG já tem (gap analysis).
  const { DiscoveryEngine } = require('./discovery/discovery-engine');
  app.discovery = new DiscoveryEngine({ store, bus, controlPlane, repoIntel });

  app.chat = new ChatAgent({ app, llm });
  return app;
}

// Visão consolidada do Painel Master.
async function overview(app, tenantId, actorId) {
  await app.controlPlane.authorize(tenantId, actorId, 'project:read');
  const s = await app.store.read();
  const t = (arr) => arr.filter((x) => x.tenantId === tenantId);
  return {
    tenant: s.tenants.find((x) => x.id === tenantId) || null,
    metrics: {
      orgs: t(s.orgs).length,
      customers: t(s.customers).length,
      projects: t(s.projects).length,
      repositories: t(s.repositories).length,
      capabilities: t(s.capabilities).length,
      snapshots: t(s.snapshots).length,
      deployments: t(s.deployments).length,
      artifacts: t(s.artifacts).length,
      memoryEvents: t(s.memoryEvents).length,
      memories: t(s.memories).filter((item) => item.status === 'ACTIVE').length,
      registeredResources: t(s.serviceRegistry).length,
      discoveredResources: t(s.discoveredResources).filter((item) => item.status === 'PRESENT').length,
      resourceVersions: t(s.resourceVersions).length,
      cityNodes: t(s.cityNodes).length,
      graphEdges: t(s.graphEdges).length,
      aiCalls: t(s.aiCalls).length,
      subscriptions: t(s.subscriptions).length,
    },
    recentMemory: t(s.memoryEvents).slice(-10).reverse(),
    recentDeployments: t(s.deployments).slice(-10).reverse(),
  };
}

module.exports = { createApp, overview };
