// Composition root: monta todos os planos do GRG Services OS com adapters locais.
// Trocar um adapter (Postgres, LiteLLM, GitHub real, packagers reais) não muda este wiring.
const { MemoryStore, FileStore } = require('./kernel/store');
const { EventBus } = require('./kernel/event-bus');
const { OrganismIdentityService } = require('./kernel/organism-identity');
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
const { SimulationAuditService } = require('./governance/simulation-audit');
const { ReadinessMatrixService } = require('./governance/readiness-matrix');
const { Gatekeeper } = require('./governance/gatekeeper');
const { ProductionReadinessService } = require('./governance/production-readiness');
const { AuthService } = require('./auth/auth');
const { OidcVerifier } = require('./auth/oidc-verifier');
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
const { PrometheusExporter } = require('./infrastructure/monitoring/prometheus-exporter');
const { AdminAvatar } = require('./cognitive/admin-avatar');
const { CognitiveHierarchy } = require('./cognitive/cognitive-hierarchy');
const { ToolRegistry } = require('./execution/tool-registry');
const { ScriptLibrary } = require('./execution/script-library');
const { DockerRootlessSandbox } = require('./execution/docker-rootless-sandbox');
const { SandboxExecutionEngine } = require('./execution/sandbox-execution-engine');
const { CognitiveInspectionEngine } = require('./inspection/cognitive-inspection-engine');
const { AutonomousAgentEcosystem } = require('./agents/autonomous-agent-ecosystem');
const { OperationalActivationService } = require('./operations/operational-activation');
const { createOperationalComponents } = require('./operations/operational-components');
const { MissionKernel } = require('./missions/mission-kernel');
const { MissionPlanner } = require('./missions/mission-planner');
const { MasterAvatar } = require('./cognitive/master-avatar');

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
  // MISSION-0003A — identidade permanente do organismo, ligada ao boot. `ensure()` cria na
  // primeira vez e devolve a mesma identidade sempre; a chamada acontece aqui (não em
  // startup do server) para que qualquer forma de subir o app estabeleça a identidade.
  const organismIdentity = new OrganismIdentityService({ store, bus, controlPlane, env: options.env || process.env });
  await organismIdentity.ensure();
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
  fabricEvents.subscribe('fabric.event', (event) => digitalTwin.projectOperationalEvent(event));

  const github = options.github || new GitHubConnector();
  const portfolio = new PortfolioService({ controlPlane, repoIntel, github, digitalTwin, evolution });

  const oidcVerifier = options.oidcVerifier || (securityConfig.production ? new OidcVerifier({ issuer: runtimeEnv.FENIX_OIDC_ISSUER, audience: runtimeEnv.FENIX_OIDC_AUDIENCE, jwksUri: runtimeEnv.FENIX_OIDC_JWKS_URI }) : null);
  const auth = await new AuthService({
    store, bus, controlPlane, audit, ttlMs: securityConfig.sessionTtlMs, externalVerifier: oidcVerifier, localLoginEnabled: !securityConfig.production,
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
  const objects = options.objects || (options.s3 ? await S3ObjectStore.create(options.s3).initialize() : null);
  const vectorStore = options.vectorStore || (options.qdrant ? await new QdrantVectorStore(options.qdrant).initialize() : null);
  const hierarchy = new CognitiveHierarchy({ store, controlPlane, bus });
  const memory = new MemoryEngine({ store, bus, controlPlane, hierarchy, vectorStore, cache: redis });
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
  const tools = new ToolRegistry({ store, controlPlane, bus });
  const scripts = new ScriptLibrary({ store, controlPlane, tools, bus });
  let sandboxAdapter = options.sandboxAdapter || null;
  if (!sandboxAdapter && runtimeEnv.FENIX_SANDBOX_DRIVER === 'docker-rootless') sandboxAdapter = new DockerRootlessSandbox({ workspaceRoot: runtimeEnv.FENIX_WORKSPACE_ROOT || path.join(outputDir, 'workspaces'), dockerHost: runtimeEnv.DOCKER_HOST, enforceRootless: true });
  if (securityConfig.production && sandboxAdapter && sandboxAdapter.productionSafe !== true) throw new Error('production requires an explicitly rootless production-safe sandbox adapter');
  const sandbox = new SandboxExecutionEngine({ store, controlPlane, tools, scripts, adapter: sandboxAdapter || { run: async () => { throw new Error('sandbox adapter is not configured'); } }, approvals, audit, events: fabricEvents, hierarchy });
  jobs.register('sandbox.execute', (payload, context) => sandbox.execute(context.tenantId, context.actorId, payload));
  const inspection = new CognitiveInspectionEngine({ store, controlPlane, sandbox, knowledgeGraph, memory, events: fabricEvents, hierarchy });
  jobs.register('inspection.run', (payload, context) => inspection.inspect(context.tenantId, context.actorId, payload));
  const capabilityRegistry = new CapabilityRegistry({ store, controlPlane, registry, events: fabricEvents, bus }).attach();
  const cognitiveLearning = new CognitiveLearningProjection({ events: fabricEvents, memory, knowledgeGraph, actorResolver: async (tenantId, hypothesisId) => { const state = await store.read(); return state.cognitiveHypotheses.find((item) => item.tenantId === tenantId && item.id === hypothesisId)?.createdBy || 'grg-admin'; } }).attach();
  const cognitiveCore = new CognitiveCore({ store, controlPlane, eventStore, events: fabricEvents, policy, approvals, jobs, contextProviders: [{ name: 'platform', snapshot: async (tenantId) => { const state = await store.read(); const scoped = (items) => items.filter((item) => item.tenantId === tenantId); return { capabilities: scoped(state.capabilityDefinitions).map((item) => ({ id: item.capabilityId, version: item.version, health: item.health })), services: scoped(state.serviceRegistry).map((item) => ({ id: item.id, status: item.status, runtimeStatus: item.runtimeStatus || null })), runtime: { queued: scoped(state.runtimeJobs).filter((item) => item.status === 'QUEUED').length, running: scoped(state.runtimeJobs).filter((item) => item.status === 'RUNNING').length, deadLetters: scoped(state.deadLetters).length }, knowledge: { entities: scoped(state.knowledgeEntities).length }, memory: { active: scoped(state.memories).filter((item) => item.status === 'ACTIVE').length }, versions: scoped(state.resourceVersions).length }; } }] }).attach();
  const adminAvatar = new AdminAvatar({ store, controlPlane, cognitiveCore });
  const agentEcosystem = new AutonomousAgentEcosystem({ store, controlPlane, hierarchy, jobs, approvals, federation, events: fabricEvents }).attach();
  jobs.register('agents.cycle', (payload, context) => agentEcosystem.cycle(context.tenantId, context.actorId, payload));
  jobs.register('cognitive.cycle', (payload, context) => cognitiveCore.cycle(context.tenantId, context.actorId, payload));
  const health = new HealthRegistry({ timeoutMs: options.healthTimeoutMs });
  const metrics = new PrometheusExporter({ store });
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
  const operationalContext = { store, health, aiGateway, redis, queues, objects, vectorStore, sandboxConfigured: Boolean(sandboxAdapter), sandboxProductionSafe: sandboxAdapter?.productionSafe === true, databaseConfigured: Boolean(options.databaseUrl), policy, metrics };
  const operationalActivation = new OperationalActivationService({ store, controlPlane, events: fabricEvents, jobs, production: securityConfig.production, components: async (tenantId) => createOperationalComponents(operationalContext, tenantId) });
  jobs.register('operational.activation', (payload, context) => operationalActivation.boot(context.tenantId, context.actorId, payload));
  jobs.register('operational.daily-intelligence', (payload, context) => operationalActivation.dailyIntelligence(context.tenantId, context.actorId, payload));
  const missions = new MissionKernel({ store, controlPlane, hierarchy, jobs, approvals, events: fabricEvents }).attach();
  const missionPlanner = new MissionPlanner({ store, controlPlane, hierarchy, missions, events: fabricEvents });

  const app = {
    store, bus, controlPlane, repoIntel, aiGateway, factory, deployer, product, appFactory,
    orchestrator, evolution, digitalTwin, github, portfolio, auth, security, securityConfig,
    audit, policy, approvals, idempotency, outbox, inbox, backup, health, redis, queues, objects,
    vectorStore, memory, hierarchy, knowledgeGraph, eventStore, fabricEvents, registry, fabric, fabricProjection,
    discoveryNetwork, discoveryProjection, federation, federationProjection, versionEngine, aiCity, jobs, tools, scripts, sandbox, inspection, capabilityRegistry, cognitiveLearning, cognitiveCore, adminAvatar, agentEcosystem, operationalActivation, missions, missionPlanner, metrics,
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

  // V6.1 Services
  const { KnowledgeGenomeEngine } = require('./memory/knowledge-genome');
  const { HypothesisEngine } = require('./cognitive/hypothesis-engine');
  const { CrossProjectLearning } = require('./cognitive/cross-project-learning');
  const { MultimodalPipeline } = require('./cognitive/multimodal-pipeline');
  const { ModelOrchestrator } = require('./ai-runtime/model-orchestrator');
  const { AgentSwarm } = require('./agents/agent-swarm');
  const { VpsOperationsService } = require('./ops/vps-operations');
  const { GitHubOperationsService } = require('./repo-intel/github-operations');
  const { ProjectFactoryService } = require('./software-factory/project-factory');
  const { BackgroundCognition } = require('./cognitive/background-cognition');
  const { ExternalSearchService } = require('./cognitive/external-search');

  // V7.0 / V7.1 ACP & Master Node Services
  const { MasterNodeService } = require('./ops/master-node');
  const { DeployCenterService } = require('./operations/deploy-center');
  const { ObservabilityCenterService } = require('./operations/observability-center');
  const { CognitivePerformanceEngine } = require('./performance/cognitive-performance-engine');
  const { CognitiveOptimizationEngine } = require('./cognitive/cognitive-optimization-engine');
  const { PluginSkillsEcosystem } = require('./plugins/plugin-skills-ecosystem');
  const { CognitiveEncryptionService } = require('./security/cognitive-encryption');
  const { NpcCityEngine } = require('./ai-city/npc-city-engine');
  const { CompanyDailyAnalysisService } = require('./operations/company-daily-analysis');

  // GRG FÊNIX Ω (OMEGA) Core Engines
  const { CognitiveAtomsFabric } = require('./omega/cognitive-atoms-fabric');
  const { BrainFederation } = require('./omega/brain-federation');
  const { CognitiveCouncil } = require('./omega/cognitive-council');
  const { ModelEconomyEngine } = require('./omega/model-economy-engine');
  const { AutonomousResearchEngine } = require('./omega/autonomous-research');

  // GRG FÊNIX Ω (OMEGA) V2.0 Engines
  const { CollectiveIntelligenceEngine } = require('./omega/collective-intelligence');
  const { RecursiveIntelligenceLoop } = require('./omega/recursive-intelligence');
  const { ContextExpansionEngine } = require('./omega/context-expansion-engine');
  const { HumanDigitalTwin } = require('./omega/human-digital-twin');

  // GRG FÊNIX Ω∞ (OMEGA INFINITY) Living Intelligence Kernel
  const { CognitiveLawsEngine } = require('./omega-infinity/cognitive-laws-engine');
  const { SelfEvolutionKernel } = require('./omega-infinity/self-evolution-kernel');
  const { CognitiveDnaCompiler } = require('./omega-infinity/cognitive-dna-compiler');
  const { LivingPhysicsEngine } = require('./omega-infinity/living-physics-engine');
  const { RealityFeedbackEngine } = require('./omega-infinity/reality-feedback-engine');
  const { MetaConsciousnessEngine } = require('./omega-infinity/meta-consciousness');

  // GRG FÊNIX UIOS (Universal Intelligence Operating System)
  const { KnowledgeOperatingSystem } = require('./uios/knowledge-operating-system');
  const { CapabilityOperatingSystem } = require('./uios/capability-operating-system');
  const { MissionCompiler } = require('./uios/mission-compiler');
  const { WorldModelFactory } = require('./uios/world-model-factory');

  // GRG FÊNIX KEOS (Knowledge Execution Operating System)
  const { UniversalCognitiveProtocol } = require('./keos/universal-cognitive-protocol');
  const { UniversalAdaptersEngine } = require('./keos/universal-adapters');
  const { ConfigurablePipelineService } = require('./keos/configurable-pipeline');
  const { ExpandedConstitutionIndex } = require('./keos/expanded-constitution-index');

  // GRG FÊNIX COGNITIVE WORKSPACE OS & ECA
  const { CognitiveWorkspaceModes } = require('./workspace/cognitive-workspace-modes');
  const { ExecutiveCognitiveAssistant } = require('./workspace/executive-cognitive-assistant');
  const { CognitivePresenceEngine } = require('./workspace/cognitive-presence-engine');

  // GRG FÊNIX NEXUS Ω∞ (Unified Cognitive Core)
  const { UnifiedCognitiveCore } = require('./nexus/unified-cognitive-core');
  const { ExecutiveTimelineService } = require('./nexus/executive-timeline');
  const { ExecutiveCommandCenterService } = require('./nexus/executive-command-center');
  const { CognitiveMarketplaceService } = require('./nexus/cognitive-marketplace');

  // GRG FÊNIX SCOS (Software Creation Operating System)
  const { DesignIntelligenceOS } = require('./scos/design-intelligence-os');
  const { ApplicationGenomeService } = require('./scos/application-genome');
  const { FullStackFactoryService } = require('./scos/fullstack-factory');
  const { CreationEvolutionEngine } = require('./scos/creation-evolution-engine');

  // GRG FÊNIX Ω∞ OneDeploy Orchestrator & Autonomous Software Factory
  const { OneDeployOrchestrator } = require('./onedeploy/onedeploy-orchestrator');
  const { ProjectAnalyzersService } = require('./onedeploy/analyzers');
  const { TestingSmokeE2eService } = require('./onedeploy/testing-smoke-e2e');
  const { ContinuousImprovementLoopService } = require('./onedeploy/continuous-improvement-loop');

  // GRG FÊNIX Ω∞ V11 — Living Core
  const { MissionArtifactsService } = require('./missions/mission-artifacts');
  const { ResearchSourceClient, createResearchSearchClient } = require('./research/source-client');

  app.knowledgeGenome = new KnowledgeGenomeEngine({ store, bus, controlPlane, hierarchy, vectorStore });
  app.hypothesisEngine = new HypothesisEngine({ store, bus, controlPlane, approvals, policy });
  app.crossProjectLearning = new CrossProjectLearning({ store, bus, controlPlane, digitalTwin });
  app.multimodalPipeline = new MultimodalPipeline({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome, digitalTwin });
  app.modelOrchestrator = new ModelOrchestrator({ aiGateway });
  app.agentSwarm = new AgentSwarm({ store, bus, controlPlane, fabricEvents });
  app.vpsOps = new VpsOperationsService({ store, bus, controlPlane, approvals });
  app.githubOps = new GitHubOperationsService({ store, bus, controlPlane, repoIntel, digitalTwin, github });
  app.projectFactory = new ProjectFactoryService({ store, bus, controlPlane, factory, missionPlanner, digitalTwin });
  app.backgroundCognition = new BackgroundCognition({ store, bus, controlPlane, memory, digitalTwin, hypothesisEngine: app.hypothesisEngine, knowledgeGenome: app.knowledgeGenome });
  // V11 — a unica saida para a internet aberta da plataforma: allowlist de dominios,
  // HTTPS+GET, sem redirect cross-host, cache com TTL e rate limit por host. DESLIGADO por
  // padrao (FENIX_RESEARCH_ENABLED): desligado, nenhuma requisicao sai da maquina.
  app.researchSource = new ResearchSourceClient({ store, env: runtimeEnv, fetchImpl: options.researchFetch });
  // searchClient recebia `null` e a busca externa devolvia NOT_IMPLEMENTED. Agora recebe o
  // adaptador sobre o MESMO cliente — mesma allowlist, mesmo cache, mesmo limite.
  app.externalSearch = new ExternalSearchService({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome, searchClient: createResearchSearchClient(app.researchSource) });

  app.masterNode = new MasterNodeService({ store, bus, controlPlane, approvals, sandbox, vpsOps: app.vpsOps, health });
  app.deployCenter = new DeployCenterService({ store, bus, controlPlane, deployer });
  app.observabilityCenter = new ObservabilityCenterService({ store, bus, controlPlane, metrics, health, aiGateway });
  app.cognitivePerformance = new CognitivePerformanceEngine({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome, digitalTwin });
  app.cognitiveOptimization = new CognitiveOptimizationEngine({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome, digitalTwin });
  app.pluginSkills = new PluginSkillsEcosystem({ store, bus, controlPlane, approvals });
  app.cognitiveEncryption = new CognitiveEncryptionService({ store, bus, controlPlane });
  app.npcCity = new NpcCityEngine({ store, bus, controlPlane, agentSwarm: app.agentSwarm, digitalTwin });
  app.companyDailyAnalysis = new CompanyDailyAnalysisService({ store, bus, controlPlane, digitalTwin, knowledgeGenome: app.knowledgeGenome, masterNode: app.masterNode, agentSwarm: app.agentSwarm });

  // OMEGA Attachments
  app.cognitiveAtomsFabric = new CognitiveAtomsFabric({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome });
  app.brainFederation = new BrainFederation({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome });
  app.cognitiveCouncil = new CognitiveCouncil({ store, bus, controlPlane, approvals, policy });
  app.modelEconomy = new ModelEconomyEngine({ store, bus, controlPlane, aiGateway, cognitivePerformance: app.cognitivePerformance, cognitiveOptimization: app.cognitiveOptimization });
  // sourceClient + missionPlanner: habilitado, a pesquisa consulta as fontes aprovadas e
  // abre um plano de AVALIACAO. Nada e instalado — adotar exige missao, sandbox e aprovacao.
  app.autonomousResearch = new AutonomousResearchEngine({ store, bus, controlPlane, sandbox, hypothesisEngine: app.hypothesisEngine, knowledgeGenome: app.knowledgeGenome, sourceClient: app.researchSource, missionPlanner });

  // OMEGA V2.0 Attachments
  app.collectiveIntelligence = new CollectiveIntelligenceEngine({ store, bus, controlPlane, modelOrchestrator: app.modelOrchestrator, knowledgeGenome: app.knowledgeGenome, aiGateway });
  app.recursiveIntelligence = new RecursiveIntelligenceLoop({ store, bus, controlPlane, collectiveIntelligence: app.collectiveIntelligence, knowledgeGenome: app.knowledgeGenome });
  app.contextExpansion = new ContextExpansionEngine({ store, bus, controlPlane, projectFactory: app.projectFactory, knowledgeGenome: app.knowledgeGenome });
  // missionPlanner: o autopilot compila o comando numa missao real, em vez de
  // devolver AUTOPILOT_DISPATCHED sem despachar nada.
  app.humanDigitalTwin = new HumanDigitalTwin({ store, bus, controlPlane, digitalTwin, missionKernel: missions, missionPlanner });

  // OMEGA INFINITY Attachments
  app.cognitiveLaws = new CognitiveLawsEngine({ store, bus, controlPlane });
  app.selfEvolutionKernel = new SelfEvolutionKernel({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome });
  app.cognitiveDnaCompiler = new CognitiveDnaCompiler({ store, bus, controlPlane });
  app.livingPhysics = new LivingPhysicsEngine({ store, bus, controlPlane });
  app.realityFeedback = new RealityFeedbackEngine({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome });
  app.metaConsciousness = new MetaConsciousnessEngine({ store, bus, controlPlane, cognitivePerformance: app.cognitivePerformance, cognitiveOptimization: app.cognitiveOptimization });
  // Regra 1: duplicidade e fragmentacao do conhecimento ja sao medidas pelo
  // SelfEvolutionKernel. O optimization engine reusa aquela medicao em vez de
  // recalcular — a injecao e feita aqui porque o kernel nasce depois dele.
  app.cognitiveOptimization.selfEvolution = app.selfEvolutionKernel;

  // UIOS Attachments
  app.kos = new KnowledgeOperatingSystem({ store, bus, controlPlane });
  app.capOs = new CapabilityOperatingSystem({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome });
  // O compilador delega ao MissionPlanner (compilacao real de objetivo em passos) e
  // consulta o indice real da constituicao via kos, em vez de fabricar um DAG fixo.
  app.missionCompiler = new MissionCompiler({ store, bus, controlPlane, projectFactory: app.projectFactory, knowledgeGenome: app.knowledgeGenome, missionPlanner, kos: app.kos });
  // health: o status do master node vem do HealthRegistry, nao de um literal.
  app.worldModelFactory = new WorldModelFactory({ store, bus, controlPlane, digitalTwin, health });

  // KEOS Attachments
  app.ucp = new UniversalCognitiveProtocol({ store, bus, controlPlane, knowledgeGenome: app.knowledgeGenome, cognitiveLaws: app.cognitiveLaws, knowledgeGraph });
  app.universalAdapters = new UniversalAdaptersEngine({ store, bus, controlPlane, aiGateway });
  app.configurablePipeline = new ConfigurablePipelineService({ store, bus, controlPlane, approvals });
  app.expandedConstitutionIndex = new ExpandedConstitutionIndex({ store, bus, controlPlane, kos: app.kos });

  // Workspace OS & ECA Attachments
  app.workspaceModes = new CognitiveWorkspaceModes({ store, bus, controlPlane });
  // approvals: a caixa de decisoes do executivo e a visao dos pedidos de aprovacao
  // REAIS, e resolver uma decisao aprova de verdade pelo engine (Regra 1).
  app.eca = new ExecutiveCognitiveAssistant({ store, bus, controlPlane, workspaceModes: app.workspaceModes, approvals });
  app.cognitivePresence = new CognitivePresenceEngine({ store, bus, controlPlane });

  // NEXUS Ω∞ Attachments
  app.ucc = new UnifiedCognitiveCore({ store, bus, controlPlane, kos: app.kos, capOs: app.capOs, missionCompiler: app.missionCompiler, workspaceModes: app.workspaceModes, realityFeedback: app.realityFeedback });
  app.nexusTimeline = new ExecutiveTimelineService({ store, bus, controlPlane });
  // health + aiGateway: o painel executivo conta do store e mede a saude real, em vez
  // de devolver doze metricas literais.
  app.commandCenter = new ExecutiveCommandCenterService({ store, bus, controlPlane, digitalTwin, health, aiGateway });
  app.cognitiveMarketplace = new CognitiveMarketplaceService({ store, bus, controlPlane, capOs: app.capOs });

  // SCOS Attachments
  app.designIntel = new DesignIntelligenceOS({ store, bus, controlPlane });
  app.appGenome = new ApplicationGenomeService({ store, bus, controlPlane, designIntel: app.designIntel });
  app.fullstackFactory = new FullStackFactoryService({ store, bus, controlPlane, designIntel: app.designIntel, appGenome: app.appGenome, projectFactory: app.projectFactory });
  app.creationEvolution = new CreationEvolutionEngine({ store, bus, controlPlane, capOs: app.capOs });

  // OneDeploy Orchestrator Attachments
  // FASE 1: auditoria automatica de simulacao (classifica os proprios modulos).
  app.simulationAudit = new SimulationAuditService({ store, bus, controlPlane });
  // V10: contrato de estado por objetivo e o cadeado de producao. O gatekeeper compoe
  // operationalActivation + readinessMatrix + auditTree — nao mede nada por conta propria.
  app.readinessMatrix = new ReadinessMatrixService({ store, bus, controlPlane });
  app.gatekeeper = new Gatekeeper({ store, bus, controlPlane, operationalActivation, readinessMatrix: app.readinessMatrix });
  // O deployer e construido antes (o gatekeeper depende de operationalActivation), por
  // isso a ligacao acontece aqui. Sem ela o PRODUCTION_LOCK nao alcanca o caminho real.
  deployer.gatekeeper = app.gatekeeper;
  app.productionReadiness = new ProductionReadinessService({
    store, bus, controlPlane, operationalActivation,
    readinessMatrix: app.readinessMatrix, gatekeeper: app.gatekeeper,
    simulationAudit: app.simulationAudit, observabilityCenter: app.observabilityCenter, aiGateway,
  });
  app.analyzers = new ProjectAnalyzersService({ store, bus, controlPlane });
  app.testingSmokeE2e = new TestingSmokeE2eService({ store, bus, controlPlane, observabilityCenter: app.observabilityCenter, baseUrl: options.smokeBaseUrl });
  // O pipeline executa os servicos reais: analyzers leem snapshots, testing bate HTTP.
  app.oneDeploy = new OneDeployOrchestrator({
    store, bus, controlPlane, masterNode: app.masterNode, deployCenter: app.deployCenter,
    analyzers: app.analyzers, testing: app.testingSmokeE2e,
  });
  // selfEvolution: duplicidade e fragmentacao de conhecimento ja sao medidas por hash
  // real de conteudo la. A varredura reusa aquela medicao em vez de recalcular (Regra 1).
  app.continuousImprovement = new ContinuousImprovementLoopService({ store, bus, controlPlane, analyzers: app.analyzers, capOs: app.capOs, selfEvolution: app.selfEvolutionKernel });

  // V11 — `mission.completed` era publicado e nao tinha assinante: o summary morria no
  // store. Este servico converte missao concluida em capsule + capability + playbook +
  // benchmark, e e o que faz o MissionPlanner reusar a sequencia que funcionou. Ligado
  // aqui porque depende do knowledgeGenome, que nasce depois do MissionKernel.
  app.missionArtifacts = new MissionArtifactsService({
    store, bus, events: fabricEvents, controlPlane,
    knowledgeGenome: app.knowledgeGenome, capabilityRegistry,
  }).attach();

  app.organismIdentity = organismIdentity;
  app.chat = new ChatAgent({ app, llm });
  app.masterAvatar = new MasterAvatar({ chat: app.chat, missionPlanner });
  app.npcCity.masterAvatar = app.masterAvatar;
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
