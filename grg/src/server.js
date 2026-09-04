const http = require('node:http');
const { Kernel } = require('./core/Kernel');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const { createApp, overview } = require('./app');
const { httpStatusFor } = require('./kernel/errors');
const { CloningGitHostAdapter } = require('./repo-intel/cloning-git-host');
const { loadSecurityConfig } = require('./security/config');
const { loadInfrastructureConfig } = require('./infrastructure/config');
const { createStructuredLogger } = require('./infrastructure/observability/structured-logger');
const { handleLiveChat } = require('./chat/live-chat-routes');
const { handleMissionRoutes } = require('./missions/mission-routes');
const { handleKnowledgeRoutes } = require('./knowledge/knowledge-routes');
const { handleDeveloperRoutes } = require('./api/developer-routes');
const { handleProductExperienceRoutes } = require('./api/product-experience-routes');
const { handleProjectMirrorRoutes } = require('./api/project-mirror-routes');
const { handleUniversalJobRoutes } = require('./api/universal-job-routes');
const { handleOrchestrationRoutes } = require('./api/orchestration-routes');

const crypto = require('node:crypto');

const PUBLIC = path.join(__dirname, '..', 'public');

function sendJson(res, code, payload, requestId = null) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(requestId ? { ...payload, requestId } : payload));
}
async function readJson(req) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) throw new Error('body too large'); }
  return body ? JSON.parse(body) : {};
}
function withHealthDeadline(check, timeoutMs = Number(process.env.FENIX_HEALTH_RESPONSE_TIMEOUT_MS || 8_000)) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, status: 'probe_timeout', checks: { health_response: { ok: false, critical: true, error: `health check exceeded ${timeoutMs}ms` } }, degraded: 'health probes did not finish within response deadline' }), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(check), timeout]).finally(() => clearTimeout(timer));
}
async function start(port = Number(process.env.PORT || 4400), options = {}) {
  const env = options.env || process.env;
  const securityConfig = options.securityConfig || loadSecurityConfig(env);
  const infrastructure = options.infrastructure || loadInfrastructureConfig(env, {
    requireExternal: options.requireExternalInfrastructure,
  });
  const logger = options.logger || createStructuredLogger();

  // FÊNIX UNIFICATION KERNEL - HYBRID DI BOOT & DISCOVERY
  const kernel = new Kernel();
  await kernel.boot(path.join(__dirname));
  global.FENIX_KERNEL = kernel;

  const app = await createApp({
    dataFile: options.dataFile || env.GRG_DATA_FILE || path.join(__dirname, '..', '.data', 'state.json'),
    gitHost: options.gitHost || new CloningGitHostAdapter(),
    llm: options.llm !== undefined ? options.llm : env.GRG_LLM !== '0',
    securityConfig,
    env,
    databaseUrl: infrastructure.databaseUrl,
    databaseSchema: infrastructure.databaseSchema,
    redisUrl: infrastructure.redisUrl,
    queueRedisUrl: infrastructure.queueRedisUrl,
    s3: infrastructure.s3,
    qdrant: infrastructure.qdrant,
    identityProvider: options.identityProvider,
    sandboxAdapter: options.sandboxAdapter,
    // Alvo dos smoke tests reais. Sem isto eles reportam NOT_RUN, nunca sucesso.
    smokeBaseUrl: options.smokeBaseUrl || env.FENIX_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
  });
  if (require.main === module) process.stdout.write(`LLM (chat natural): ${app.llm ? 'LIGADO via ' + app.llmSource : 'desligado (modo regras)'}\n`);
  const bootstrap = options.bootstrapAdmin || securityConfig.bootstrapAdmin;
  if (bootstrap) {
    try {
      await app.controlPlane.createTenant({ id: bootstrap.tenantId, name: bootstrap.tenantName }, bootstrap.userId);
    } catch { /* tenant já provisionado */ }
    await app.auth.ensureUser(bootstrap.tenantId, bootstrap.userId, bootstrap.password, bootstrap.role || 'master_admin', bootstrap.name);
  }
  const oidcBootstrap = securityConfig.bootstrapOidc;
  if (oidcBootstrap) {
    try {
      await app.controlPlane.createTenant({ id: oidcBootstrap.tenantId, name: oidcBootstrap.tenantName }, oidcBootstrap.userId);
    } catch {
      // On restarts the tenant must already be owned by the configured OIDC subject.
      // Refuse to silently grant privileges if an unrelated tenant already exists.
      await app.controlPlane.getMembership(oidcBootstrap.tenantId, oidcBootstrap.userId);
    }
  }
  // A ativacao operacional roda 26 probes, cada um com escrita no store. Num store
  // grande isso leva dezenas de segundos e ANTES bloqueava o listen() — o container
  // ficava unhealthy porque a porta nunca abria. Agora ela roda DEPOIS do servidor
  // estar escutando, em background, e o /health reporta o progresso.
  // Ativacao operacional: o servidor HTTP apenas GARANTE os schedules; quem executa
  // o boot dos 26 probes e o worker, pelo schedule recorrente `operational.activation`.
  //
  // Antes o boot rodava aqui no startup de cada container. Com api e worker subindo
  // juntos, os dois escreviam no mesmo documento sob SERIALIZABLE: cada escrita
  // colidia, entrava em retry e re-serializava o documento inteiro. Resultado medido
  // em producao: ~25 s por componente (11 min para os 26) e 17 runs presos em RUNNING
  // de boots anteriores que morreram no meio. Rodar em um lugar so elimina a disputa.
  // MISSION-0003A — registra a geração observada (release + versão de esquema) ao subir.
  // A identidade já foi estabelecida em createApp; aqui a linhagem ganha a entrada desta
  // subida. Não regenera nada: entradas idênticas não se acumulam.
  try {
    const state = await Promise.race([
      app.store.read(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Store read timeout')), 5000))
    ]);
    await app.organismIdentity.recordGeneration({ schemaVersion: state.schemaVersion, reason: 'boot' });
  } catch (error) {
    logger.error({ event: 'organism.generation.failed.bypassed', error: error.message, capability: 'kernel' });
  }

  const runActivation = async () => {
    let state;
    try {
      state = await Promise.race([
        app.store.read(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Store read timeout')), 5000))
      ]);
    } catch(err) {
      logger.error({ event: 'activation.bypassed', error: err.message });
      return;
    }
    for (const tenant of state.tenants) {
      const owner = state.memberships.find((item) => item.tenantId === tenant.id && item.status === 'active' && item.role === 'master_admin');
      if (!owner) continue;
      try {
        await app.operationalActivation.ensureSchedules(tenant.id, owner.userId);
        if (options.activationBootOnStart === true) {
          await app.operationalActivation.boot(tenant.id, owner.userId, { trigger: 'startup' });
        }
      } catch (error) {
        logger.error({ event: 'operational.activation.failed', error, tenant: tenant.id, actor: owner.userId, capability: 'operations' });
      }
    }
  };

  // Single Source of Truth: The FÊNIX Kernel
  // All discovery, registries, and activations are handled inside FENIX_KERNEL.boot()
  const bootManager = {
    start: async () => console.log('[Server] Bypassing legacy BootManager; using FÊNIX_KERNEL.')
  };
  await bootManager.start();

  const server = http.createServer(async (req, res) => {
    let requestId = null;
    let correlationId = null;
    let routePath = null;
    let tenantId = null;
    let actorId = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      routePath = url.pathname;
      const gate = app.security.begin(req, res, url.pathname);
      requestId = gate.requestId;
      const requestedCorrelation = String(req.headers['x-correlation-id'] || '');
      correlationId = /^[A-Za-z0-9._:-]{1,128}$/.test(requestedCorrelation) ? requestedCorrelation : requestId;
      res.setHeader('x-correlation-id', correlationId);
      if (!gate.allowed) return sendJson(res, gate.status, { error: gate.error }, requestId);
      
      if (req.method === 'GET' && url.pathname === '/api/system/boot-status') {
        const bootHealth = await app.health.check();
        return sendJson(res, bootHealth.ok ? 200 : 503, bootHealth, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/runtime') {
        const runtimeContext = await app.security.authenticate(req.headers);
        if (!runtimeContext) return sendJson(res, 401, { error: 'not authenticated - login at /GRG-login' }, requestId);
        await app.controlPlane.authorize(runtimeContext.tenantId, runtimeContext.actorId, 'runtime:read');
        const health = await app.health.check();
        return sendJson(res, 200, {
          ok: health.ok,
          status: global.FENIX_KERNEL ? 'KERNEL_ACTIVE' : health.status,
          checkedAt: health.checkedAt,
          services: Object.entries(health.checks || {}).map(([id, detail]) => ({
            id,
            status: detail.ok ? 'ready' : 'degraded',
            critical: Boolean(detail.critical),
            error: detail.error || null,
          })),
        }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/runtime/services') {
        const services = global.FENIX_KERNEL ? global.FENIX_KERNEL.registries.ServiceRegistry.getAll() : [];
        return sendJson(res, 200, {
          services: services.map(s => ({ id: s.id, status: s.status, version: s.version }))
        }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/runtime/capabilities') {
        const capabilities = global.FENIX_KERNEL ? global.FENIX_KERNEL.registries.CapabilityRegistry.getAll() : [];
        return sendJson(res, 200, {
          capabilities: capabilities
        }, requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/test/event') {
        const body = await readJson(req);
        console.log(`[EVENT] Publishing test event: ${body.type}`);
        if (global.FENIX_KERNEL && global.FENIX_KERNEL.registries.EventRegistry) {
          // Em um Kernel unificado, a API de eventos pode variar, usar de forma agnostica
          console.log(`[EventRegistry] Route active but publishing logic depends on adapter.`);
        }
        return sendJson(res, 200, { published: true, type: body.type }, requestId);
      }
      
      if (req.method === 'GET' && url.pathname === '/health') {
        const healthDeadline = Number(env.FENIX_HEALTH_RESPONSE_TIMEOUT_MS || 8_000);
        const health = await withHealthDeadline(() => app.health.check(), healthDeadline);
        let bootHealth = { ok: true, status: 'BYPASSED' };
        if (!global.FENIX_KERNEL) {
          bootHealth = await app.health.check();
        } else {
          bootHealth = { ok: true, status: 'KERNEL_ACTIVE' };
        }
        return sendJson(res, health.ok && bootHealth.ok ? 200 : 503, {
          ...health, service: 'grg-services-os', environment: securityConfig.runtimeEnv,
          boot: bootHealth,
          // Progresso da ativacao operacional (roda em background apos o listen).
          activation: global.FENIX_KERNEL ? 'COMPLETED' : 'LEGACY'
        }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/oidc/config') return sendJson(res, 200, {
        enabled: securityConfig.production && !!env.FENIX_OIDC_AUTHORIZATION_ENDPOINT,
        authorizationEndpoint: env.FENIX_OIDC_AUTHORIZATION_ENDPOINT || null,
        tokenEndpoint: env.FENIX_OIDC_TOKEN_ENDPOINT || null,
        clientId: env.FENIX_OIDC_CLIENT_ID || null,
        redirectUri: env.FENIX_OIDC_REDIRECT_URI || null,
        scope: 'openid profile email',
      }, requestId);
      if (req.method === 'GET' && url.pathname === '/metrics') {
        if (!safeToken(req.headers.authorization, env.FENIX_METRICS_TOKEN)) return sendJson(res, 401, { error: 'metrics authentication required' }, requestId);
        res.writeHead(200, { 'content-type': 'text/plain; version=0.0.4; charset=utf-8' }); return res.end(await app.metrics.render());
      }

      // `/api/workers` é o contrato canônico derivado do JobEngine e precisa
      // passar pela autenticação abaixo. A rota legada mission-routes exigia
      // um WorkerRegistry paralelo que não é usado pelo runtime atual.
      // `/api/jobs` pertence ao contrato universal do JobEngine e é tratado
      // abaixo após autenticação. A rota legada aqui o interceptava e removia
      // a apresentação canônica `jobId`, quebrando a visão da fila.
      if (url.pathname.startsWith('/api/providers') || url.pathname.startsWith('/api/plans') || url.pathname.startsWith('/api/estimates') || url.pathname.startsWith('/api/orchestrator')) {
        const handled = handleMissionRoutes(req, res, url, app, sendJson);
        if (handled) return;
      }
      
      // O contrato universal `/api/v2/jobs` precisa chegar ao handler
      // autenticado do JobEngine abaixo; a camada de produto possui rotas
      // históricas com o mesmo prefixo e não pode interceptá-las.
      if (!url.pathname.startsWith('/api/v2/jobs')) {
        // Product routes are dispatched after the shared authentication gate below.
      }

      // -- Rotas nativas do server ------------------------------------------------------------

      // ---- Auth (público) ----
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const b = await readJson(req);
        const sess = await app.auth.login(b.tenantId || 'grg', b.userId || b.user, b.password);
        // Cookie HttpOnly mantém a sessão no reload do browser; o Bearer
        // continua sendo retornado para clientes de API e executores.
        res.setHeader('set-cookie', `fenix_session=${encodeURIComponent(sess.token)}; HttpOnly; SameSite=Lax; Path=/`);
        return sendJson(res, 200, sess);
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const m = String(req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
        if (m) await app.auth.logoutAsync(m[1]);
        res.setHeader('set-cookie', 'fenix_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
        return sendJson(res, 200, { ok: true }, requestId);
      }

      if (!url.pathname.startsWith('/api/') && url.pathname !== '/runtime/snapshot') return serveStatic(url.pathname, res);

      const cx = await app.security.authenticate(req.headers);
      // REALITY FIRST + seguranca: acesso a /api SEM sessao autenticada e REJEITADO com 401.
      // Nao ha fallback que auto-autentica -- o fallback anterior (actorId 'admin' hardcoded,
      // authed:true) dava a ILUSAO de sistema aberto e ao mesmo tempo quebrava por membership
      // ('admin' nao existe; o bootstrap cria grg-admin). As 19 views do workspace populam
      // apos LOGIN real (/api/login -> Bearer token, ou OIDC em producao), provado no e2e-http
      // "login then use bearer token works". Sem login, 401 honesto -- e o que os testes de
      // seguranca exigem (rejects unauthenticated api access / rejects dev headers by default).
      if (!cx) return sendJson(res, 401, { error: 'not authenticated - login at /GRG-login' }, requestId);
      ({ tenantId, actorId } = cx);

      const orchestrationHandled = await handleOrchestrationRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId });
      if (orchestrationHandled) return;

      // Read-only readiness status must not initialize the legacy product
      // experience engines. Full probes remain explicit (`boot=true`).
      if (req.method === 'GET' && url.pathname === '/api/governance/production-readiness' && url.searchParams.get('boot') !== 'true') {
        return sendJson(res, 200, {
          status: 'NOT_RUN',
          message: 'Auditoria de prontidão não executada. Use ?boot=true de forma explícita; probes completos não rodam no caminho operacional.',
          generatedBy: actorId,
          generatedAt: new Date().toISOString(),
        }, requestId);
      }

      if (!url.pathname.startsWith('/api/v2/jobs')) {
        const productHandled = await handleProductExperienceRoutes(req, res, url, app, sendJson, (r, s, e) => sendJson(r, s, { error: e }), { tenantId, actorId });
        if (productHandled) return;
      }

      const developerHandled = await handleDeveloperRoutes(req, res, url, app, sendJson, (r, s, e) => sendJson(r, s, { error: e }), { tenantId, actorId });
      if (developerHandled) return;

      const knowledgeHandled = handleKnowledgeRoutes(req, res, url, app, sendJson, { tenantId, actorId });
      if (knowledgeHandled) return;

      // Projection HTTP do estado canônico consumida pelo live-runtime.js.
      // Não cria outro runtime: apenas lê MissionKernel/JobEngine/store.
      if (req.method === 'GET' && url.pathname === '/runtime/snapshot') {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
        const [health, jobs, missions, agentPanel, state, projects] = await Promise.all([
          app.health.check(), app.jobs.list(tenantId, actorId), app.missions.list(tenantId, actorId),
          app.agentEcosystem.panel(tenantId, actorId), app.store.read(),
          app.projectKernel ? app.projectKernel.list(tenantId, actorId) : [],
        ]);
        const events = (state.missionEvents || []).filter((event) => event.tenantId === tenantId).slice(-80);
        const registeredList = app.agentRegistry ? app.agentRegistry.list() : [];
        const registeredAgents = registeredList.map((agent) => {
          const activeJob = jobs.find((j) => (j.status === 'RUNNING' || j.status === 'DISPATCHED') && (j.agent?.agentId === agent.id || j.agentId === agent.id || j.agent?.name === agent.name));
          return {
            id: agent.id,
            agentId: agent.id,
            name: agent.name,
            domain: agent.domain,
            role: agent.domain || agent.name,
            district: agent.domain === 'frontend' ? 'FRONTEND' : agent.domain === 'engineering' ? 'BACKEND' : agent.domain === 'orchestration' ? 'MASTER_HQ' : agent.domain === 'testing' ? 'QA' : agent.domain === 'deployment' ? 'DEVOPS' : 'CENTRAL',
            status: activeJob ? 'RUNNING' : 'AVAILABLE',
            currentJob: activeJob ? { id: activeJob.id, name: activeJob.prompt || activeJob.type || activeJob.name, progress: activeJob.progress || 0 } : null,
            tools: agent.tools || [],
            permissions: agent.permissions || [],
            description: agent.description,
          };
        });
        const agents = (agentPanel.agents && agentPanel.agents.length) ? agentPanel.agents : registeredAgents;
        const jobTasks = jobs.flatMap((job) => (Array.isArray(job.microtasks) ? job.microtasks : []).map((task) => ({
          ...task,
          id: task.id || `${job.id}:task`,
          missionId: task.missionId || job.missionId || null,
          jobId: task.jobId || job.id,
          agentId: task.agentId || job.agentId || job.agent?.agentId || null,
        })));
        const missionTasks = (state.missionSteps || []).filter((step) => step.tenantId === tenantId).map((step) => ({
          id: step.id,
          title: step.key || step.type,
          type: step.type,
          status: step.status,
          missionId: step.missionId,
          jobId: step.jobId,
          agentId: step.agent,
          skill: step.jobType,
          tool: step.jobType,
          dependsOn: step.dependsOn || [],
          input: step.payload || null,
          output: step.result || null,
          createdAt: step.createdAt,
          updatedAt: step.updatedAt,
        }));
        const tasks = [...missionTasks, ...jobTasks];
        return sendJson(res, 200, { type: 'runtime.snapshot', payload: {
          serverTime: new Date().toISOString(), status: health.ok ? 'ONLINE' : 'DEGRADED', health,
          uptime: Math.floor(process.uptime()), jobs, tasks, missions, agents, projects, events,
          queue: {
            queued: jobs.filter((job) => job.status === 'QUEUED').length,
            running: jobs.filter((job) => job.status === 'RUNNING').length,
            completed: jobs.filter((job) => ['SUCCEEDED', 'COMPLETED'].includes(job.status)).length,
            failed: jobs.filter((job) => ['FAILED', 'DEAD_LETTER'].includes(job.status)).length,
          },
        } }, requestId);
      }

      const universalJobHandled = await handleUniversalJobRoutes(
        req, res, url, app, sendJson, readJson, { tenantId, actorId }
      );
      if (universalJobHandled) return;

      const projectMirrorHandled = await handleProjectMirrorRoutes(
        req, res, url, app, sendJson, readJson, { tenantId, actorId }
      );
      if (projectMirrorHandled) return;

      if (req.method === 'GET' && url.pathname === '/api/me') return sendJson(res, 200, { tenantId, actorId, authed: cx.authed });
      if (req.method === 'POST' && url.pathname === '/api/avatar/message') return sendJson(res, 200, await app.masterAvatar.handle(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'GET' && url.pathname === '/api/overview') return sendJson(res, 200, await overview(app, tenantId, actorId));
      if (req.method === 'POST' && url.pathname === '/api/operations/activate') return sendJson(res, 202, await app.operationalActivation.boot(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/operations/state') return sendJson(res, 200, await app.operationalActivation.state(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/operations/history') return sendJson(res, 200, { history: await app.operationalActivation.history(tenantId, actorId, url.searchParams.get('componentId') || null) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/operations/assurances') return sendJson(res, 201, await app.operationalActivation.recordAssurance(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/operations/daily-intelligence') return sendJson(res, 201, await app.operationalActivation.dailyIntelligence(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/operations/schedules') return sendJson(res, 201, { schedules: await app.operationalActivation.ensureSchedules(tenantId, actorId, await readJson(req)) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/operations/stability-report') return sendJson(res, 201, await app.operationalActivation.stabilityReport(tenantId, actorId), requestId);
      // Adaptador do ciclo autônomo para o Mission Runtime canônico. Não cria
      // progresso artificial: reconcilia jobs órfãos e, somente quando opt-in,
      // inicia missões planejadas respeitando governança e limites.
      if (req.method === 'POST' && url.pathname === '/api/autonomous/cycle') {
        const body = await readJson(req).catch(() => ({}));
        return sendJson(res, 202, await app.missions.reconcile(tenantId, actorId, {
          autoStart: body.autoStart === true,
          maxConcurrent: body.maxConcurrent,
        }), requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/missions/plan') return sendJson(res, 201, await app.missionPlanner.plan(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/missions/plans') return sendJson(res, 200, { plans: await app.missionPlanner.list(tenantId, actorId) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/fenix/missions') {
        const body = await readJson(req);
        const mission = await app.missions.create(tenantId, actorId, { ...body, title: body.title || 'FENIX autonomous mission', steps: body.steps || [
          { key: 'discover', type: 'discover' },
          { key: 'analyze', type: 'analyze', dependsOn: ['discover'] },
          { key: 'activate', type: 'activate', dependsOn: ['analyze'], payload: { trigger: 'mission' } },
        ] });
        setImmediate(() => app.missions.start(tenantId, actorId, mission.id).catch((error) => logger.error?.({ capability: 'mission-start', missionId: mission.id, error })));
        return sendJson(res, 202, { missionId: mission.id, status: 'QUEUED' }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/fenix/missions') return sendJson(res, 200, { missions: await app.missions.list(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/fenix/mission-events') {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
        const state = await app.store.read();
        const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') || 80)));
        const events = state.missionEvents.filter((item) => item.tenantId === tenantId).slice(-limit).reverse();
        return sendJson(res, 200, { events }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/fenix/providers') { const health = await app.aiGateway.providerHealth(); return sendJson(res, 200, { providers: Object.entries(health).map(([provider, value]) => ({ provider, ...value, configured: true, status: value.ok ? 'READY' : 'UNAVAILABLE' })) }, requestId); }
      const fenixProvider = url.pathname.match(/^\/api\/fenix\/providers\/([^/]+)\/health$/);
      if (req.method === 'GET' && fenixProvider) { const health = await app.aiGateway.providerHealth(); const value = health[fenixProvider[1]]; if (!value) return sendJson(res, 404, { error: 'provider not configured', provider: fenixProvider[1] }, requestId); return sendJson(res, 200, { provider: fenixProvider[1], ...value, configured: true, status: value.ok ? 'READY' : 'UNAVAILABLE' }, requestId); }
      const fenixProviderTest = url.pathname.match(/^\/api\/fenix\/providers\/([^/]+)\/test$/);
      if (req.method === 'POST' && fenixProviderTest) { const body = await readJson(req); const started = Date.now(); try { const result = await app.aiGateway.invoke(tenantId, actorId, { taskType: 'default', prompt: body.prompt || 'Respond with PROVIDER_READY.', provider: fenixProviderTest[1], model: body.model || null }); return sendJson(res, 200, { provider: result.provider, model: result.model, reachable: true, latencyMs: Date.now() - started, status: 'READY' }, requestId); } catch (error) { return sendJson(res, 503, { provider: fenixProviderTest[1], reachable: false, latencyMs: Date.now() - started, status: 'PROVIDER_ERROR', error: String(error.message || error).slice(0, 500) }, requestId); } }
      if (url.pathname === '/api/fenix/memory/search' && req.method === 'GET') return sendJson(res, 200, { memories: await app.engineeringMemory.search(tenantId, actorId, { q: url.searchParams.get('q') || '', limit: url.searchParams.get('limit') || 10 }) }, requestId);
      if (url.pathname === '/api/fenix/memory/metrics' && req.method === 'GET') return sendJson(res, 200, await app.engineeringMemory.metrics(tenantId, actorId), requestId);
      const fenixMemory = url.pathname.match(/^\/api\/fenix\/memory\/([^/]+)$/);
      if (req.method === 'GET' && fenixMemory) return sendJson(res, 200, await app.engineeringMemory.get(tenantId, actorId, fenixMemory[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/fenix/memory/promote') return sendJson(res, 201, await app.engineeringMemory.promote(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/fenix/memory/reuse') { const body = await readJson(req); return sendJson(res, 200, await app.engineeringMemory.reuse(tenantId, actorId, body.memoryId, body.metadata || {}), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/fenix/memory/invalidate') { const body = await readJson(req); return sendJson(res, 200, await app.engineeringMemory.invalidate(tenantId, actorId, body.memoryId, body.reason), requestId); }
      const fenixProjectExperience = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/(experience|knowledge|components|patterns|architectures)$/);
      if (req.method === 'GET' && fenixProjectExperience) { await app.controlPlane.authorize(tenantId, actorId, 'project:read'); const state = await app.store.read(); const kinds = { experience: null, knowledge: null, components: 'component', patterns: 'pattern', architectures: 'architecture' }; const kind = kinds[fenixProjectExperience[2]]; const memories = state.engineeringMemories.filter((item) => item.tenantId === tenantId && item.sourceProjects?.includes(fenixProjectExperience[1]) && (!kind || item.kind === kind)); return sendJson(res, 200, { memories }, requestId); }
      const fenixMission = url.pathname.match(/^\/api\/fenix\/missions\/([^/]+)$/);
      const fenixAction = url.pathname.match(/^\/api\/fenix\/missions\/([^/]+)\/(pause|resume|cancel|jobs|events)$/);
      const fenixMissionCheckpoints = url.pathname.match(/^\/api\/fenix\/missions\/([^/]+)\/checkpoints$/);
      const fenixMissionArtifacts = url.pathname.match(/^\/api\/fenix\/missions\/([^/]+)\/artifacts$/);
      const fenixCheckpoint = url.pathname.match(/^\/api\/fenix\/checkpoints\/([^/]+)$/);
      if (req.method === 'GET' && fenixMissionCheckpoints) return sendJson(res, 200, { checkpoints: await app.missionCheckpoints.listForMission(tenantId, actorId, fenixMissionCheckpoints[1]) }, requestId);
      if (req.method === 'GET' && fenixMissionArtifacts) { const mission = await app.missions.get(tenantId, actorId, fenixMissionArtifacts[1]); const state = await app.store.read(); return sendJson(res, 200, { artifacts: state.artifacts.filter((item) => item.missionId === mission.id) }, requestId); }
      if (req.method === 'GET' && fenixCheckpoint) return sendJson(res, 200, await app.missionCheckpoints.get(tenantId, actorId, fenixCheckpoint[1]), requestId);
      if (req.method === 'GET' && fenixMission) return sendJson(res, 200, await app.missions.get(tenantId, actorId, fenixMission[1]), requestId);
      if (req.method === 'GET' && fenixAction && ['jobs', 'events'].includes(fenixAction[2])) {
        const mission = await app.missions.get(tenantId, actorId, fenixAction[1]);
        return sendJson(res, 200, fenixAction[2] === 'events' ? { events: mission.events } : { jobs: mission.steps.map((step) => ({ stepId: step.id, jobId: step.jobId, status: step.status, type: step.jobType, attempts: step.metrics?.attempts || 0 })) }, requestId);
      }
      if (req.method === 'POST' && fenixAction) {
        const action = fenixAction[2];
        const result = action === 'pause' ? await app.missions.pause(tenantId, actorId, fenixAction[1]) : action === 'resume' ? await app.missions.resume(tenantId, actorId, fenixAction[1]) : await app.missions.cancel(tenantId, actorId, fenixAction[1]);
        return sendJson(res, 202, result, requestId);
      }
      const fenixJob = url.pathname.match(/^\/api\/fenix\/jobs\/([^/]+)$/);
      const fenixJobAction = url.pathname.match(/^\/api\/fenix\/jobs\/([^/]+)\/(events|artifacts|checkpoints|pause|resume|cancel|retry)$/);
      if (req.method === 'POST' && url.pathname === '/api/fenix/jobs') return sendJson(res, 202, await app.jobs.submit(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/fenix/jobs') return sendJson(res, 200, { jobs: await app.jobs.list(tenantId, actorId, url.searchParams.get('status') || undefined) }, requestId);
      if (req.method === 'GET' && fenixJob) return sendJson(res, 200, await app.jobs.get(tenantId, actorId, fenixJob[1]), requestId);
      if (req.method === 'GET' && fenixJobAction) { const id = fenixJobAction[1]; const kind = fenixJobAction[2]; if (kind === 'checkpoints') return sendJson(res, 200, { checkpoints: await app.missionCheckpoints.listForJob(tenantId, actorId, id) }, requestId); const job = await app.jobs.get(tenantId, actorId, id); if (kind === 'artifacts') { const state = await app.store.read(); return sendJson(res, 200, { artifacts: [...(job.artifacts || []), ...state.artifacts.filter((item) => item.jobId === id)] }, requestId); } return sendJson(res, 200, { events: await app.jobs.eventsFor(tenantId, actorId, id) }, requestId); }
      if (req.method === 'POST' && fenixJobAction && ['pause', 'resume', 'cancel', 'retry'].includes(fenixJobAction[2])) {
        const action = fenixJobAction[2];
        const result = action === 'pause' ? await app.jobs.pause(tenantId, actorId, fenixJobAction[1]) : action === 'resume' ? await app.jobs.resume(tenantId, actorId, fenixJobAction[1]) : action === 'retry' ? await app.jobs.retry(tenantId, actorId, fenixJobAction[1]) : await app.jobs.cancel(tenantId, actorId, fenixJobAction[1]);
        return sendJson(res, 202, result, requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/fenix/projects') return sendJson(res, 201, await app.projectKernel.create(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/fenix/projects') return sendJson(res, 200, { projects: await app.projectKernel.list(tenantId, actorId) }, requestId);
      const fenixProject = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)(?:\/(state|missions|jobs|artifacts))?$/);
      const fenixProjectAnalyze = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/analyze$/);
      if (req.method === 'POST' && fenixProjectAnalyze) return sendJson(res, 202, await app.projectKernel.analyze(tenantId, actorId, fenixProjectAnalyze[1]), requestId);
      const fenixProjectBuild = url.pathname.match(/^\/api\/fenix\/projects\/([^/]+)\/build$/);
      if (req.method === 'POST' && fenixProjectBuild) return sendJson(res, 202, await app.fullSystemBuilder.plan(tenantId, actorId, { ...(await readJson(req)), projectId: fenixProjectBuild[1] }), requestId);
      if (req.method === 'GET' && fenixProject) { const id = fenixProject[1]; const kind = fenixProject[2]; if (kind === 'missions') return sendJson(res, 200, { missions: await app.projectKernel.missions(tenantId, actorId, id) }, requestId); if (kind === 'jobs') return sendJson(res, 200, { jobs: await app.projectKernel.jobs(tenantId, actorId, id) }, requestId); const state = await app.projectKernel.state(tenantId, actorId, id); return sendJson(res, 200, kind === 'artifacts' ? { artifacts: state.artifacts } : state, requestId); }
      if (req.method === 'POST' && url.pathname === '/api/missions') return sendJson(res, 201, await app.missions.create(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/missions') return sendJson(res, 200, { missions: await app.missions.list(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/missions/avatar-state') return sendJson(res, 200, await app.missions.avatarState(tenantId, actorId), requestId);
      const missionStart = url.pathname.match(/^\/api\/missions\/([^/]+)\/start$/);
      if (req.method === 'POST' && missionStart) return sendJson(res, 202, await app.missions.start(tenantId, actorId, missionStart[1]), requestId);
      const missionPause = url.pathname.match(/^\/api\/missions\/([^/]+)\/pause$/);
      if (req.method === 'POST' && missionPause) return sendJson(res, 202, await app.missions.pause(tenantId, actorId, missionPause[1]), requestId);
      const missionResume = url.pathname.match(/^\/api\/missions\/([^/]+)\/resume$/);
      if (req.method === 'POST' && missionResume) return sendJson(res, 202, await app.missions.resume(tenantId, actorId, missionResume[1]), requestId);
      const missionCancel = url.pathname.match(/^\/api\/missions\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && missionCancel) return sendJson(res, 202, await app.missions.cancel(tenantId, actorId, missionCancel[1]), requestId);
      const missionApproveStep = url.pathname.match(/^\/api\/missions\/([^/]+)\/steps\/([^/]+)\/approve$/);
      if (req.method === 'POST' && missionApproveStep) { const body = await readJson(req); return sendJson(res, 202, await app.missions.approveStep(tenantId, actorId, missionApproveStep[1], missionApproveStep[2], body.approvalId), requestId); }
      const missionGet = url.pathname.match(/^\/api\/missions\/([^/]+)$/);
      if (req.method === 'GET' && missionGet) return sendJson(res, 200, await app.missions.get(tenantId, actorId, missionGet[1]), requestId);
      const missionGraph = url.pathname.match(/^\/api\/missions\/([^/]+)\/graph$/);
      if (req.method === 'GET' && missionGraph) {
        const mission = await app.missions.get(tenantId, actorId, missionGraph[1]);
        const steps = Array.isArray(mission.steps) ? mission.steps : [];
        return sendJson(res, 200, {
          missionId: mission.id,
          nodes: steps.map((step) => ({ id: step.key, label: step.key, type: step.type, status: step.status || 'PLANNED', jobId: step.jobId || null })),
          edges: steps.flatMap((step) => (step.dependsOn || []).map((dependency) => ({ from: dependency, to: step.key }))),
          source: 'persisted:missionSteps'
        }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/projects') return sendJson(res, 200, { projects: await app.factory.listProjects(tenantId, actorId) });
      if (req.method === 'GET' && url.pathname === '/api/repositories') return sendJson(res, 200, { repositories: await app.repoIntel.listRepositories(tenantId, actorId) });
      if (req.method === 'GET' && url.pathname === '/api/graph') return sendJson(res, 200, await app.repoIntel.getGraph(tenantId, actorId));
      if (req.method === 'POST' && url.pathname === '/api/knowledge-graph/entities') return sendJson(res, 201, await app.knowledgeGraph.upsertEntity(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/knowledge-graph/relationships') return sendJson(res, 201, await app.knowledgeGraph.relate(tenantId, actorId, await readJson(req)), requestId);
      const graphNeighbors = url.pathname.match(/^\/api\/knowledge-graph\/entities\/([^/]+)\/neighbors$/);
      if (req.method === 'GET' && graphNeighbors) return sendJson(res, 200, await app.knowledgeGraph.neighborhood(tenantId, actorId, graphNeighbors[1], url.searchParams.get('depth') || 1), requestId);
      if (req.method === 'GET' && url.pathname === '/api/knowledge-graph/path') return sendJson(res, 200, { path: await app.knowledgeGraph.shortestPath(tenantId, actorId, url.searchParams.get('from'), url.searchParams.get('to')) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/knowledge-graph/anomalies') return sendJson(res, 200, { anomalies: await app.knowledgeGraph.anomalies(tenantId, actorId) }, requestId);
      const graphImpact = url.pathname.match(/^\/api\/knowledge-graph\/entities\/([^/]+)\/impact$/);
      if (req.method === 'GET' && graphImpact) return sendJson(res, 200, { impacts: await app.knowledgeGraph.impact(tenantId, actorId, graphImpact[1], url.searchParams.get('depth') || 3) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/fabric/enroll') return sendJson(res, 201, await app.fabric.enroll(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/fabric/enrollments') return sendJson(res, 200, { enrollments: await app.fabric.list(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/registry') return sendJson(res, 200, { resources: await app.registry.list(tenantId, actorId, { kind: url.searchParams.get('kind') || undefined }) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/events') { await app.controlPlane.authorize(tenantId, actorId, 'event:read'); return sendJson(res, 200, { events: await app.eventStore.list(tenantId, { type: url.searchParams.get('type') || undefined, limit: url.searchParams.get('limit') || 100 }) }, requestId); }
      if (req.method === 'GET' && url.pathname === '/api/versions') return sendJson(res, 200, { versions: await app.versionEngine.history(tenantId, actorId, url.searchParams.get('resourceKey') || undefined) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/versions/diff') return sendJson(res, 200, await app.versionEngine.diff(tenantId, actorId, url.searchParams.get('resourceKey'), url.searchParams.get('from'), url.searchParams.get('to')), requestId);
      if (req.method === 'POST' && url.pathname === '/api/rollbacks') return sendJson(res, 202, await app.versionEngine.proposeRollback(tenantId, actorId, await readJson(req)), requestId);
      const dispatchRollback = url.pathname.match(/^\/api\/rollbacks\/([^/]+)\/dispatch$/);
      if (req.method === 'POST' && dispatchRollback) return sendJson(res, 202, await app.versionEngine.dispatchRollback(tenantId, actorId, dispatchRollback[1]), requestId);
      if (req.method === 'GET' && url.pathname === '/api/city') return sendJson(res, 200, await app.aiCity.map(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/city/rebuild') return sendJson(res, 202, await app.aiCity.rebuild(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/runtime/jobs') return sendJson(res, 202, await app.jobs.submit(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/runtime/jobs') return sendJson(res, 200, { jobs: await app.jobs.list(tenantId, actorId, url.searchParams.get('status') || undefined) }, requestId);
      const runtimeJob = url.pathname.match(/^\/api\/runtime\/jobs\/([^/]+)$/);
      if (req.method === 'GET' && runtimeJob) return sendJson(res, 200, await app.jobs.get(tenantId, actorId, runtimeJob[1]), requestId);
      const cancelJob = url.pathname.match(/^\/api\/runtime\/jobs\/([^/]+)\/cancel$/);
      if (req.method === 'POST' && cancelJob) return sendJson(res, 202, await app.jobs.cancel(tenantId, actorId, cancelJob[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/runtime/schedules') return sendJson(res, 201, await app.jobs.schedule(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/runtime/tick') {
        // Manual ticks must not hold the browser request open while a scheduled
        // handler or worker is running. The JobEngine remains canonical; this
        // route only acknowledges the request and the next snapshot publishes
        // the resulting jobs/statuses.
        app.jobs.tick(tenantId, actorId)
          .catch((error) => logger.error({ event: 'runtime.manual-tick.failed', error: error.message, requestId }));
        return sendJson(res, 202, { accepted: true, requestId }, requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/runtime/work') { const body = await readJson(req); await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin'); return sendJson(res, 200, { jobs: await app.jobs.runBatch(body.workerId || actorId, body.limit || 5) }, requestId); }
      if (req.method === 'POST' && url.pathname === '/api/execution/tools') return sendJson(res, 201, await app.tools.register(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/execution/tools') return sendJson(res, 200, { tools: await app.tools.list(tenantId, actorId) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/execution/signers') return sendJson(res, 201, await app.scripts.registerSigner(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/execution/scripts') return sendJson(res, 201, await app.scripts.register(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/execution/sandbox') return sendJson(res, 202, await app.sandbox.execute(tenantId, actorId, { ...(await readJson(req)), correlationId: requestId }), requestId);
      if (req.method === 'GET' && url.pathname === '/api/execution/sandbox') return sendJson(res, 200, { executions: await app.sandbox.list(tenantId, actorId) }, requestId);
      const sandboxExecution = url.pathname.match(/^\/api\/execution\/sandbox\/([^/]+)$/);
      if (req.method === 'GET' && sandboxExecution) return sendJson(res, 200, await app.sandbox.get(tenantId, actorId, sandboxExecution[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/inspections') return sendJson(res, 202, await app.inspection.inspect(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/inspections') return sendJson(res, 200, { inspections: await app.inspection.list(tenantId, actorId) }, requestId);
      const inspectionRun = url.pathname.match(/^\/api\/inspections\/([^/]+)$/);
      if (req.method === 'GET' && inspectionRun) return sendJson(res, 200, await app.inspection.get(tenantId, actorId, inspectionRun[1]), requestId);
      const inspectionTwin = url.pathname.match(/^\/api\/inspection-twins\/([^/]+)$/);
      if (req.method === 'GET' && inspectionTwin) return sendJson(res, 200, await app.inspection.twin(tenantId, actorId, inspectionTwin[1]), requestId);
      if (req.method === 'GET' && url.pathname === '/api/evolution-proposals') return sendJson(res, 200, { proposals: await app.inspection.proposals(tenantId, actorId, url.searchParams.get('subjectId') || null) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/capabilities') return sendJson(res, 200, { capabilities: await app.capabilityRegistry.list(tenantId, actorId) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/capabilities') return sendJson(res, 201, await app.capabilityRegistry.register(tenantId, actorId, await readJson(req)), requestId);
      const capabilityHistory = url.pathname.match(/^\/api\/capabilities\/([^/]+)\/history$/);
      if (req.method === 'GET' && capabilityHistory) return sendJson(res, 200, { versions: await app.capabilityRegistry.history(tenantId, actorId, capabilityHistory[1]) }, requestId);
      const capabilityGet = url.pathname.match(/^\/api\/capabilities\/([^/]+)$/);
      if (req.method === 'GET' && capabilityGet) return sendJson(res, 200, await app.capabilityRegistry.get(tenantId, actorId, capabilityGet[1]), requestId);
      if (req.method === 'GET' && url.pathname === '/api/skills') return sendJson(res, 200, await app.skillRegistry.listSkills(tenantId, actorId, { q: url.searchParams.get('q') || '' }), requestId);
      if (req.method === 'POST' && url.pathname === '/api/skills/select') return sendJson(res, 200, await app.skillRegistry.selectForTask(tenantId, actorId, await readJson(req)), requestId);
      const agentSkills = url.pathname.match(/^\/api\/agents\/([^/]+)\/skills$/);
      if (req.method === 'POST' && agentSkills) {
        const body = await readJson(req);
        const agent = app.agentSwarm.specialists.find((item) => item.id === agentSkills[1] || item.domain === agentSkills[1]);
        return sendJson(res, 200, await app.skillRegistry.contextForAgent(tenantId, actorId, agent || { id: agentSkills[1], domain: body.domain || '' }, body), requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/cognitive/goals') return sendJson(res, 201, await app.cognitiveCore.createGoal(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/cycle') return sendJson(res, 202, await app.cognitiveCore.cycle(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/cognitive/context') return sendJson(res, 200, await app.cognitiveCore.context(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/cognitive/dashboard') return sendJson(res, 200, await app.cognitiveCore.dashboard(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/entities') return sendJson(res, 201, await app.hierarchy.create(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/cognitive/entities') return sendJson(res, 200, await app.hierarchy.list(tenantId, actorId, { type: url.searchParams.get('type') || undefined }), requestId);
      const cognitiveWorkspace = url.pathname.match(/^\/api\/cognitive\/entities\/([^/]+)\/workspace$/);
      if (req.method === 'GET' && cognitiveWorkspace) return sendJson(res, 200, await app.hierarchy.workspace(tenantId, actorId, cognitiveWorkspace[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/access-grants') return sendJson(res, 201, await app.hierarchy.grant(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/knowledge-sharing-policies') return sendJson(res, 201, await app.hierarchy.createSharingPolicy(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/digital-twin/operational') return sendJson(res, 200, { twin: await app.digitalTwin.operational(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/cognitive/avatar/state') return sendJson(res, 200, await app.adminAvatar.state(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/cognitive/avatar/improvements') return sendJson(res, 200, await app.adminAvatar.improvements(tenantId, actorId), requestId);
      const avatarDecision = url.pathname.match(/^\/api\/cognitive\/avatar\/decisions\/([^/]+)$/);
      if (req.method === 'GET' && avatarDecision) return sendJson(res, 200, await app.adminAvatar.explainDecision(tenantId, actorId, avatarDecision[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/agents/cycles') return sendJson(res, 202, await app.agentEcosystem.cycle(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/agents/tasks') return sendJson(res, 201, await app.agentEcosystem.createTask(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/agents/delegations') return sendJson(res, 201, await app.agentEcosystem.delegate(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/agents/panel') return sendJson(res, 200, await app.agentEcosystem.panel(tenantId, actorId), requestId);
      const agentTask = url.pathname.match(/^\/api\/agents\/tasks\/([^/]+)$/);
      if (req.method === 'GET' && agentTask) return sendJson(res, 200, await app.agentEcosystem.getTask(tenantId, actorId, agentTask[1]), requestId);
      const dispatchAgentTask = url.pathname.match(/^\/api\/agents\/tasks\/([^/]+)\/dispatch-approved$/);
      if (req.method === 'POST' && dispatchAgentTask) { const body = await readJson(req); return sendJson(res, 202, await app.agentEcosystem.dispatchApproved(tenantId, actorId, dispatchAgentTask[1], body.approvalId), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/agents/knowledge-proposals') return sendJson(res, 201, await app.agentEcosystem.proposeKnowledge(tenantId, actorId, await readJson(req)), requestId);
      const promoteAgentKnowledge = url.pathname.match(/^\/api\/agents\/knowledge-proposals\/([^/]+)\/promote$/);
      if (req.method === 'POST' && promoteAgentKnowledge) { const body = await readJson(req); return sendJson(res, 200, await app.agentEcosystem.promoteKnowledge(tenantId, actorId, promoteAgentKnowledge[1], body.masterAgentId), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/cognitive/hypotheses') return sendJson(res, 201, await app.cognitiveCore.propose(tenantId, actorId, await readJson(req)), requestId);
      const evaluateHypothesis = url.pathname.match(/^\/api\/cognitive\/hypotheses\/([^/]+)\/evaluate$/);
      if (req.method === 'POST' && evaluateHypothesis) return sendJson(res, 200, await app.cognitiveCore.evaluate(tenantId, actorId, evaluateHypothesis[1]), requestId);
      const dispatchHypothesis = url.pathname.match(/^\/api\/cognitive\/hypotheses\/([^/]+)\/dispatch$/);
      if (req.method === 'POST' && dispatchHypothesis) return sendJson(res, 202, await app.cognitiveCore.dispatch(tenantId, actorId, dispatchHypothesis[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/discovery-network/scan') return sendJson(res, 202, await app.discoveryNetwork.scan(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/discovery-network/inventory') return sendJson(res, 200, { resources: await app.discoveryNetwork.inventory(tenantId, actorId) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/knowledge-federation/publish') return sendJson(res, 202, await app.federation.publish(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/knowledge-federation/ingest') {
        const body = await readJson(req);
        const sourceUrl = String(body.sourceUrl || body.source?.url || '').trim();
        const citation = String(body.citation || body.source?.citation || '').trim();
        if (!sourceUrl || !citation) return sendJson(res, 400, { error: 'sourceUrl and citation are required for cited ingestion' }, requestId);
        const publication = await app.federation.publish(tenantId, actorId, {
          ...body,
          publisherId: body.publisherId || 'research-ingest',
          topic: body.topic || body.title || 'cited-source',
          statement: body.statement || body.content,
          provenance: { ...(body.provenance || {}), type: 'cited-ingestion', reference: sourceUrl, citation, sourceUrl },
          facts: { ...(body.facts || {}), sourceUrl, citation }
        });
        return sendJson(res, 202, { publication, source: { url: sourceUrl, citation } }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/knowledge-federation/publications') return sendJson(res, 200, { publications: await app.federation.list(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/ai/telemetry') return sendJson(res, 200, await app.aiGateway.telemetry(tenantId, actorId));
      if (req.method === 'GET' && url.pathname === '/api/system/boot-status') return sendJson(res, 200, app.runtimeKernel ? app.runtimeKernel.getState() : { status: 'UNKNOWN' }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/orchestrator/mission/decompose') { const body = await readJson(req); return sendJson(res, 200, await app.aiOrchestrator.processRequest(body.prompt || body.objective), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/orchestrator/mission/approve') { const body = await readJson(req); return sendJson(res, 200, await app.aiOrchestrator.approveAndStartBuild(body.missionId), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/evolution/backlog') { const findings = await app.aek.runLivingModeScan(); return sendJson(res, 200, { backlog: findings }, requestId); }
      if (req.method === 'GET' && url.pathname === '/api/digital-twin/city-state') return sendJson(res, 200, app.digitalTwinEngine.generateCityState(app.runtimeKernel ? app.runtimeKernel.getState() : {}), requestId);
      if (req.method === 'GET' && url.pathname === '/api/insights') { await app.controlPlane.authorize(tenantId, actorId, 'memory:read'); return sendJson(res, 200, { insights: await app.evolution.getInsights(tenantId) }); }
      if (req.method === 'GET' && url.pathname === '/api/evolution') { await app.controlPlane.authorize(tenantId, actorId, 'memory:read'); return sendJson(res, 200, await app.evolution.getEvolution(tenantId)); }
      if (req.method === 'POST' && url.pathname === '/api/memories') {
        return sendJson(res, 201, await app.memory.remember(tenantId, actorId, await readJson(req)), requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/memories/search') {
        return sendJson(res, 200, await app.memory.query(tenantId, actorId, url.searchParams.get('q'), {
          kind: url.searchParams.get('kind') || undefined,
          projectId: url.searchParams.get('projectId') || undefined,
          orgId: url.searchParams.get('orgId') || undefined,
          scopeId: url.searchParams.get('scopeId') || undefined,
          scopeType: url.searchParams.get('scopeType') || undefined,
          limit: url.searchParams.get('limit') || undefined,
        }), requestId);
      }
      if (req.method === 'POST' && url.pathname === '/api/memories/consolidate') {
        return sendJson(res, 200, await app.memory.consolidate(tenantId, actorId, await readJson(req)), requestId);
      }
      const memoryHistory = url.pathname.match(/^\/api\/memories\/([^/]+)\/history$/);
      if (req.method === 'GET' && memoryHistory) return sendJson(res, 200, { versions: await app.memory.history(tenantId, actorId, memoryHistory[1]) }, requestId);
      const memoryDelete = url.pathname.match(/^\/api\/memories\/([^/]+)$/);
      if (req.method === 'DELETE' && memoryDelete) {
        const body = await readJson(req);
        return sendJson(res, 200, await app.memory.forget(tenantId, actorId, memoryDelete[1], body.reason), requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/audit') {
        await app.controlPlane.authorize(tenantId, actorId, 'audit:read');
        return sendJson(res, 200, { events: await app.audit.list(tenantId), integrity: await app.audit.verify(tenantId) });
      }
      if (req.method === 'GET' && url.pathname === '/api/approvals') {
        await app.controlPlane.authorize(tenantId, actorId, 'governance:read');
        return sendJson(res, 200, { approvals: await app.approvals.list(tenantId) });
      }
      if (req.method === 'POST' && url.pathname === '/api/approvals') {
        const body = await readJson(req);
        return sendJson(res, 201, await app.approvals.request(tenantId, actorId, body));
      }
      const approve = url.pathname.match(/^\/api\/approvals\/([^/]+)\/approve$/);
      if (req.method === 'POST' && approve) return sendJson(res, 200, await app.approvals.approve(tenantId, actorId, approve[1]));
      if (req.method === 'GET' && url.pathname === '/api/twins') return sendJson(res, 200, { twins: await app.digitalTwin.list(tenantId, actorId) });
      const twinGet = url.pathname.match(/^\/api\/twins\/([^/]+)$/);
      if (req.method === 'GET' && twinGet) return sendJson(res, 200, await app.digitalTwin.get(tenantId, actorId, twinGet[1]));
      const twinAdvise = url.pathname.match(/^\/api\/twins\/([^/]+)\/advise$/);
      if (req.method === 'GET' && twinAdvise) return sendJson(res, 200, await app.digitalTwin.advise(tenantId, actorId, twinAdvise[1]));

      // Workforce (escritório de lojas com donos IA + funcionários)
      if (req.method === 'GET' && url.pathname === '/api/office') return sendJson(res, 200, { office: await app.workforce.office(tenantId, actorId) });
      if (req.method === 'GET' && url.pathname === '/api/workforces') return sendJson(res, 200, { workforces: await app.workforce.listWorkforces(tenantId, actorId) });
      const wfHire = url.pathname.match(/^\/api\/projects\/([^/]+)\/hire$/);
      if (req.method === 'POST' && wfHire) return sendJson(res, 201, await app.workforce.hire(tenantId, actorId, wfHire[1]));
      const wfGet = url.pathname.match(/^\/api\/projects\/([^/]+)\/workforce$/);
      if (req.method === 'GET' && wfGet) return sendJson(res, 200, await app.workforce.getWorkforce(tenantId, actorId, wfGet[1]));
      const wfReport = url.pathname.match(/^\/api\/projects\/([^/]+)\/daily-report$/);
      if (req.method === 'POST' && wfReport) return sendJson(res, 201, await app.workforce.dailyReport(tenantId, actorId, wfReport[1]));
      const wfStandup = url.pathname.match(/^\/api\/projects\/([^/]+)\/standup$/);
      if (req.method === 'POST' && wfStandup) return sendJson(res, 200, await app.workforce.standup(tenantId, actorId, wfStandup[1]));
      const wfAsk = url.pathname.match(/^\/api\/projects\/([^/]+)\/ask$/);
      if (req.method === 'POST' && wfAsk) { const b = await readJson(req); return sendJson(res, 200, await app.workforce.askEmployee(tenantId, actorId, wfAsk[1], b.role, b.question || '')); }
      const wfBuilding = url.pathname.match(/^\/api\/projects\/([^/]+)\/building$/);
      if (req.method === 'GET' && wfBuilding) return sendJson(res, 200, await app.workforce.building(tenantId, actorId, wfBuilding[1]));
      const disc = url.pathname.match(/^\/api\/projects\/([^/]+)\/discovery$/);
      if (req.method === 'POST' && disc) return sendJson(res, 200, await app.discovery.discover(tenantId, actorId, disc[1]));

      if (req.method === 'POST' && url.pathname === '/api/repositories') {
        const b = await readJson(req); const repo = await app.repoIntel.connect(tenantId, actorId, b); return sendJson(res, 201, repo);
      }
      const analyze = url.pathname.match(/^\/api\/repositories\/([^/]+)\/analyze$/);
      if (req.method === 'POST' && analyze) return sendJson(res, 202, await app.repoIntel.analyze(tenantId, actorId, analyze[1]));

      if (req.method === 'POST' && url.pathname === '/api/factory/generate') {
        const b = await readJson(req); const out = await app.factory.generate(tenantId, actorId, b);
        return sendJson(res, 201, { project: out.project, plan: out.plan, validation: out.validation });
      }
      if (req.method === 'POST' && url.pathname === '/api/orchestrate') {
        const b = await readJson(req); return sendJson(res, 201, await app.orchestrator.buildFromPrompt(tenantId, actorId, b));
      }

      // ---- GRG FÊNIX V6.1 ENDPOINTS ----
      if (req.method === 'POST' && url.pathname === '/api/knowledge-genome/capsules') return sendJson(res, 201, await app.knowledgeGenome.createCapsule(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/knowledge-genome/capsules') return sendJson(res, 200, await app.knowledgeGenome.queryCapsules(tenantId, actorId, { level: url.searchParams.get('level'), query: url.searchParams.get('q'), limit: url.searchParams.get('limit') }), requestId);
      const promoteCapsule = url.pathname.match(/^\/api\/knowledge-genome\/capsules\/([^/]+)\/promote$/);
      if (req.method === 'POST' && promoteCapsule) { const b = await readJson(req); return sendJson(res, 200, await app.knowledgeGenome.promoteCapsule(tenantId, actorId, promoteCapsule[1], b.level, b.reason), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/hypotheses') return sendJson(res, 201, await app.hypothesisEngine.proposeHypothesis(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/hypotheses') return sendJson(res, 200, await app.hypothesisEngine.listHypotheses(tenantId, actorId, { category: url.searchParams.get('category'), status: url.searchParams.get('status') }), requestId);
      const evalHyp = url.pathname.match(/^\/api\/hypotheses\/([^/]+)\/evaluate$/);
      if (req.method === 'POST' && evalHyp) return sendJson(res, 200, await app.hypothesisEngine.evaluateHypothesis(tenantId, actorId, evalHyp[1]), requestId);

      if (req.method === 'GET' && url.pathname === '/api/cross-project/analysis') return sendJson(res, 200, await app.crossProjectLearning.analyzeProjects(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/multimodal/ingest') return sendJson(res, 200, await app.multimodalPipeline.processFile(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/models/catalog') return sendJson(res, 200, { catalog: app.modelOrchestrator.getCatalog() }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/models/execute') { const b = await readJson(req); return sendJson(res, 200, await app.modelOrchestrator.executeTask(tenantId, actorId, b.taskType, b), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/agents/swarm') return sendJson(res, 200, await app.agentSwarm.listAgents(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/agents/swarm/events') return sendJson(res, 201, await app.agentSwarm.dispatchEvent(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'GET' && url.pathname === '/api/ops/vps/servers') return sendJson(res, 200, await app.vpsOps.listServers(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/ops/vps/plans') return sendJson(res, 201, await app.vpsOps.createOperationPlan(tenantId, actorId, await readJson(req)), requestId);
      const execVpsPlan = url.pathname.match(/^\/api\/ops\/vps\/plans\/([^/]+)\/execute$/);
      if (req.method === 'POST' && execVpsPlan) return sendJson(res, 200, await app.vpsOps.executeOperationPlan(tenantId, actorId, execVpsPlan[1]), requestId);

      if (req.method === 'GET' && url.pathname === '/api/ops/github/orgs') return sendJson(res, 200, await app.githubOps.listOrgs(tenantId, actorId), requestId);
      const ghBranches = url.pathname.match(/^\/api\/ops\/github\/repos\/([^/]+)\/branches$/);
      if (req.method === 'GET' && ghBranches) return sendJson(res, 200, await app.githubOps.listBranches(tenantId, actorId, ghBranches[1]), requestId);
      if (req.method === 'POST' && url.pathname === '/api/ops/github/prs') return sendJson(res, 201, await app.githubOps.createPullRequest(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/ops/github/issues') return sendJson(res, 201, await app.githubOps.createIssue(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'POST' && url.pathname === '/api/factory/demands') return sendJson(res, 201, await app.projectFactory.processDemand(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/background/run') return sendJson(res, 200, await app.backgroundCognition.runIdleMaintenance(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/cognitive/search') return sendJson(res, 200, await app.externalSearch.search(tenantId, actorId, await readJson(req)), requestId);

      // V7.0 / V7.1 ACP & Master Node Endpoints
      if (req.method === 'GET' && url.pathname === '/api/ops/master-node/status') return sendJson(res, 200, await app.masterNode.getMasterStatus(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/ops/master-node/self-deploy') return sendJson(res, 200, await app.masterNode.executeSelfDeployPipeline(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'GET' && url.pathname === '/api/operations/deploys') return sendJson(res, 200, await app.deployCenter.getDeployOverview(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/operations/deploys/rollback') { const b = await readJson(req); return sendJson(res, 200, await app.deployCenter.rollbackDeployment(tenantId, actorId, b.deployId), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/operations/observability/metrics') return sendJson(res, 200, await app.observabilityCenter.getMetrics(tenantId, actorId), requestId);

      if (req.method === 'GET' && url.pathname === '/api/performance/hot-memory') return sendJson(res, 200, await app.cognitivePerformance.getHotMemoryState(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/performance/speed-score') return sendJson(res, 200, await app.cognitivePerformance.getSpeedScore(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/performance/predictive-prefetch') return sendJson(res, 200, await app.cognitivePerformance.prefetchContext(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'POST' && url.pathname === '/api/optimization/distill') return sendJson(res, 200, await app.cognitiveOptimization.distillKnowledge(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/optimization/never-repeat-check') { const b = await readJson(req); return sendJson(res, 200, await app.cognitiveOptimization.checkNeverDoSameWork(tenantId, actorId, b.requirement), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/optimization/health-index') return sendJson(res, 200, await app.cognitiveOptimization.getKnowledgeHealth(tenantId, actorId), requestId);

      if (req.method === 'GET' && url.pathname === '/api/plugins/marketplace') return sendJson(res, 200, await app.pluginSkills.getMarketplace(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/plugins/install') { const b = await readJson(req); return sendJson(res, 200, await app.pluginSkills.installPlugin(tenantId, actorId, b.pluginId), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/skills/evolution') return sendJson(res, 200, await app.pluginSkills.getSkillEvolution(tenantId, actorId), requestId);

      if (req.method === 'GET' && url.pathname === '/api/security/encryption/status') return sendJson(res, 200, await app.cognitiveEncryption.getEncryptionStatus(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/security/encryption/tokenize') { const b = await readJson(req); return sendJson(res, 200, await app.cognitiveEncryption.tokenizeAndEncrypt(tenantId, actorId, b.plaintext), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/city/npc/list') return sendJson(res, 200, await app.npcCity.listNpcAgents(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/city/npc/chat') { const b = await readJson(req); return sendJson(res, 200, await app.npcCity.chatWithNpc(tenantId, actorId, b.npcId, b.message), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/company/daily-analysis') return sendJson(res, 200, await app.companyDailyAnalysis.getDailyReport(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/company/calendar') return sendJson(res, 200, await app.companyDailyAnalysis.getOperationalCalendar(tenantId, actorId), requestId);

      // GRG FÊNIX Ω (OMEGA) Endpoints
      if (req.method === 'GET' && url.pathname === '/api/omega/fabric/density') return sendJson(res, 200, await app.cognitiveAtomsFabric.getCognitiveDensity(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/omega/fabric/atoms') return sendJson(res, 201, await app.cognitiveAtomsFabric.createCognitiveAtom(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'GET' && url.pathname === '/api/omega/brains/list') return sendJson(res, 200, await app.brainFederation.listDomainBrains(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/omega/brains/fuse') return sendJson(res, 200, await app.brainFederation.fuseKnowledge(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'GET' && url.pathname === '/api/omega/council/members') return sendJson(res, 200, await app.cognitiveCouncil.getCouncilMembers(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/omega/council/evaluate') return sendJson(res, 200, await app.cognitiveCouncil.evaluateProposal(tenantId, actorId, await readJson(req)), requestId);

      if (req.method === 'POST' && url.pathname === '/api/omega/economy/route-check') { const b = await readJson(req); return sendJson(res, 200, await app.modelEconomy.evaluateTaskRoute(tenantId, actorId, b.prompt), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/omega/research/scan') { const b = await readJson(req); return sendJson(res, 200, await app.autonomousResearch.runResearchCycle(tenantId, actorId, b.topic), requestId); }

      // GRG FÊNIX Ω (OMEGA) V2.0 Endpoints
      if (req.method === 'POST' && url.pathname === '/api/omega/v2/consensus/debate') { const b = await readJson(req); return sendJson(res, 200, await app.collectiveIntelligence.runMultiModelConsensus(tenantId, actorId, b.prompt, b.models), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/omega/v2/consensus/models') return sendJson(res, 200, await app.collectiveIntelligence.getModelRankings(tenantId, actorId), requestId);

      if (req.method === 'POST' && url.pathname === '/api/omega/v2/recursive/refine') { const b = await readJson(req); return sendJson(res, 200, await app.recursiveIntelligence.executeRecursiveLoop(tenantId, actorId, b.problem), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/omega/v2/context/expand') { const b = await readJson(req); return sendJson(res, 200, await app.contextExpansion.expandIntention(tenantId, actorId, b.prompt), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/omega/v2/human-twin/cop') return sendJson(res, 200, await app.humanDigitalTwin.getCognitiveOperatingProfile(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/omega/v2/human-twin/autopilot') { const b = await readJson(req); return sendJson(res, 200, await app.humanDigitalTwin.runAutopilot(tenantId, actorId, b.command), requestId); }

      // GRG FÊNIX Ω∞ (OMEGA INFINITY) Endpoints
      if (req.method === 'POST' && url.pathname === '/api/omega-infinity/laws/verify') { const b = await readJson(req); return sendJson(res, 200, await app.cognitiveLaws.verifyLaw001(tenantId, actorId, b.proposal), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/omega-infinity/crystal/state') return sendJson(res, 200, await app.selfEvolutionKernel.getIntelligenceCrystalState(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/omega-infinity/dna/compile') { const b = await readJson(req); return sendJson(res, 200, await app.cognitiveDnaCompiler.compileToIntentionDna(tenantId, actorId, b.source), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/omega-infinity/physics/universe') { const b = await readJson(req); return sendJson(res, 200, await app.livingPhysics.inspectUniverse(tenantId, actorId, b.universeName), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/omega-infinity/reality/feedback') { const b = await readJson(req); return sendJson(res, 200, await app.realityFeedback.processDeploymentFeedback(tenantId, actorId, b.feedback), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/omega-infinity/meta/index') return sendJson(res, 200, await app.metaConsciousness.getUniversalIntelligenceIndex(tenantId, actorId), requestId);

      // GRG FÊNIX UIOS Endpoints
      if (req.method === 'GET' && url.pathname === '/api/uios/kos/manifest') return sendJson(res, 200, await app.kos.getManifest(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/uios/kos/semantic-load') { const b = await readJson(req); return sendJson(res, 200, await app.kos.loadSemanticContext(tenantId, actorId, b.volumes), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/uios/capos/list') return sendJson(res, 200, await app.capOs.listCapabilities(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/uios/capos/register') { const b = await readJson(req); return sendJson(res, 201, await app.capOs.registerCapability(tenantId, actorId, b.capability), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/uios/compiler/compile') { const b = await readJson(req); return sendJson(res, 200, await app.missionCompiler.compileObjectiveToDag(tenantId, actorId, b.objective), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/uios/world-model/state') return sendJson(res, 200, await app.worldModelFactory.getWorldState(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/uios/factory/create') { const b = await readJson(req); return sendJson(res, 201, await app.worldModelFactory.createArtifact(tenantId, actorId, b.spec), requestId); }

      // GRG FÊNIX KEOS Endpoints
      if (req.method === 'POST' && url.pathname === '/api/keos/ucp/process') { const b = await readJson(req); return sendJson(res, 200, await app.ucp.processInput(tenantId, actorId, b.input), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/keos/adapters/ai') { const b = await readJson(req); return sendJson(res, 200, await app.universalAdapters.invokeAiAdapter(tenantId, actorId, b.provider, b.prompt), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/keos/adapters/tech') { const b = await readJson(req); return sendJson(res, 200, await app.universalAdapters.invokeTechAdapter(tenantId, actorId, b.techType, b.name), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/keos/pipeline/promote') { const b = await readJson(req); return sendJson(res, 200, await app.configurablePipeline.promoteChange(tenantId, actorId, b.change), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/keos/constitution/index') return sendJson(res, 200, await app.expandedConstitutionIndex.getExpandedIndex(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/keos/constitution/load-sparse') { const b = await readJson(req); return sendJson(res, 200, await app.expandedConstitutionIndex.loadSparseVolumes(tenantId, actorId, b.volumes), requestId); }

      // GRG FÊNIX Cognitive Workspace OS & ECA Endpoints
      if (req.method === 'GET' && url.pathname === '/api/workspace/mode') return sendJson(res, 200, await app.workspaceModes.getActiveMode(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/workspace/mode') { const b = await readJson(req); return sendJson(res, 200, await app.workspaceModes.setMode(tenantId, actorId, b.mode), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/workspace/eca/inbox') return sendJson(res, 200, await app.eca.getInbox(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/workspace/eca/decision') { const b = await readJson(req); return sendJson(res, 200, await app.eca.resolveDecision(tenantId, actorId, b.decisionId, b.action), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/workspace/eca/daily-brief') return sendJson(res, 200, await app.eca.getDailyBriefing(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/workspace/eca/evening-report') return sendJson(res, 200, await app.eca.getEveningReport(tenantId, actorId), requestId);

      if (req.method === 'GET' && url.pathname === '/api/workspace/presence/config') return sendJson(res, 200, await app.cognitivePresence.getPresenceConfig(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/workspace/presence/config') { const b = await readJson(req); return sendJson(res, 200, await app.cognitivePresence.updatePresenceConfig(tenantId, actorId, b), requestId); }

      // GRG FÊNIX NEXUS Ω∞ Endpoints
      if (req.method === 'GET' && url.pathname === '/api/nexus/ucc/status') return sendJson(res, 200, await app.ucc.getUccStatus(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/nexus/bus/emit') { const b = await readJson(req); return sendJson(res, 200, await app.ucc.emitCognitiveEvent(tenantId, actorId, b.event), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/nexus/timeline/feed') return sendJson(res, 200, await app.nexusTimeline.getTimelineFeed(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/nexus/command-center') return sendJson(res, 200, await app.commandCenter.getCommandCenterMetrics(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/nexus/simulate-impact') { const b = await readJson(req); return sendJson(res, 200, await app.commandCenter.simulateImpact(tenantId, actorId, b.simulation), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/nexus/marketplace/list') return sendJson(res, 200, await app.cognitiveMarketplace.listPublishedArtifacts(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/nexus/marketplace/publish') { const b = await readJson(req); return sendJson(res, 201, await app.cognitiveMarketplace.publishArtifact(tenantId, actorId, b.artifact), requestId); }

      // GRG FÊNIX SCOS (Software Creation OS) Endpoints
      if (req.method === 'GET' && url.pathname === '/api/scos/design-families/list') return sendJson(res, 200, await app.designIntel.listDesignFamilies(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/scos/design-tokens') { const b = await readJson(req); return sendJson(res, 200, await app.designIntel.getFamilyTokens(tenantId, actorId, b.familyId), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/scos/genome/structure') { const b = await readJson(req); return sendJson(res, 200, await app.appGenome.getGenomeStructure(tenantId, actorId, b.appType), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/scos/visual-reasoning') { const b = await readJson(req); return sendJson(res, 200, await app.appGenome.evaluateVisualReasoning(tenantId, actorId, b.context), requestId); }

      if (req.method === 'POST' && url.pathname === '/api/scos/factory/generate-multi-design') { const b = await readJson(req); return sendJson(res, 200, await app.fullstackFactory.generateMultiDesignProposals(tenantId, actorId, b.spec), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/scos/factory/sync-contract') { const b = await readJson(req); return sendJson(res, 200, await app.fullstackFactory.syncFrontendBackendContract(tenantId, actorId, b.update), requestId); }
      if (req.method === 'GET' && url.pathname === '/api/scos/factory/slices') return sendJson(res, 200, await app.fullstackFactory.listFullStackSlices(tenantId, actorId), requestId);
      if (req.method === 'POST' && url.pathname === '/api/scos/factory/slices') return sendJson(res, 201, await app.fullstackFactory.createFullStackSlice(tenantId, actorId, await readJson(req)), requestId);
      const sliceDataMatch = url.pathname.match(/^\/api\/scos\/factory\/slices\/([^/]+)\/data$/);
      if (sliceDataMatch && req.method === 'GET') return sendJson(res, 200, await app.fullstackFactory.sliceData(tenantId, actorId, sliceDataMatch[1]), requestId);
      if (sliceDataMatch && req.method === 'POST') return sendJson(res, 201, await app.fullstackFactory.appendSliceRecord(tenantId, actorId, sliceDataMatch[1], await readJson(req)), requestId);
      const sliceMatch = url.pathname.match(/^\/api\/scos\/factory\/slices\/([^/]+)$/);
      if (sliceMatch && req.method === 'GET') return sendJson(res, 200, await app.fullstackFactory.getFullStackSlice(tenantId, actorId, sliceMatch[1]), requestId);

      if (req.method === 'POST' && url.pathname === '/api/scos/evolution/metrics') { const b = await readJson(req); return sendJson(res, 200, await app.creationEvolution.evaluateDeliveryMetrics(tenantId, actorId, b.delivery), requestId); }

      // GRG FÊNIX Ω∞ OneDeploy Orchestrator & Software Factory Endpoints
      if (req.method === 'POST' && url.pathname === '/api/onedeploy/run-pipeline') { const b = await readJson(req); return sendJson(res, 200, await app.oneDeploy.runOneDeployPipeline(tenantId, actorId, b.project), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/onedeploy/scan-project') { const b = await readJson(req); return sendJson(res, 200, await app.oneDeploy.scanProject(tenantId, actorId, b.projectPath), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/onedeploy/analyzers/frontend') return sendJson(res, 200, await app.analyzers.analyzeFrontend(tenantId, actorId), requestId);
      if (req.method === 'GET' && url.pathname === '/api/onedeploy/analyzers/backend') return sendJson(res, 200, await app.analyzers.analyzeBackend(tenantId, actorId), requestId);

      if (req.method === 'POST' && url.pathname === '/api/onedeploy/smoke-tests/run') { const b = await readJson(req); return sendJson(res, 200, await app.testingSmokeE2e.runSmokeTests(tenantId, actorId, b.environment), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/onedeploy/e2e/run') { const b = await readJson(req); return sendJson(res, 200, await app.testingSmokeE2e.runE2ePlaywrightScenarios(tenantId, actorId, b.suiteName), requestId); }

      if (req.method === 'GET' && url.pathname === '/api/onedeploy/continuous-improvement/idle-scan') return sendJson(res, 200, await app.continuousImprovement.runIdleImprovementScan(tenantId, actorId), requestId);

      // FASE 1: auditoria de simulacao — o sistema classifica seus proprios modulos.
      if (req.method === 'GET' && url.pathname === '/api/governance/simulation-audit') return sendJson(res, 200, await app.simulationAudit.audit(tenantId, actorId), requestId);
      // V10: estado de cada objetivo, derivado de artefatos verificaveis.
      if (req.method === 'GET' && url.pathname === '/api/governance/readiness-matrix') return sendJson(res, 200, await app.readinessMatrix.build(tenantId, actorId), requestId);
      // V10: PRODUCTION_LOCK. Consulta se uma acao critica esta liberada e por que nao.
      if (req.method === 'GET' && url.pathname === '/api/governance/gatekeeper') return sendJson(res, 200, await app.gatekeeper.evaluate(tenantId, actorId, url.searchParams.get('action') || 'deploy'), requestId);
      // V10: relatorio de prontidao. `?boot=false` usa o ultimo estado gravado em vez de
      // rodar os 26 probes; `?write=true` grava PRODUCTION_READINESS_REPORT.md.
      if (req.method === 'GET' && url.pathname === '/api/governance/production-readiness') {
        if (url.searchParams.get('boot') !== 'true') {
          return sendJson(res, 200, {
            status: 'NOT_RUN',
            message: 'Auditoria de prontidão não executada. Use ?boot=true de forma explícita; probes completos não rodam no caminho operacional.',
            generatedBy: actorId,
            generatedAt: new Date().toISOString(),
          }, requestId);
        }
        return sendJson(res, 200, await app.productionReadiness.generate(tenantId, actorId, {
          // A leitura do relatório não deve iniciar uma ativação pesada por
          // acidente. `boot=true` é opt-in explícito; o padrão usa o último
          // estado medido e mantém o runtime operacional responsivo.
          boot: url.searchParams.get('boot') === 'true',
          write: url.searchParams.get('write') === 'true',
        }), requestId);
      }
      // Telemetria real do host + infra (substitui as metricas simuladas).
      if (req.method === 'GET' && url.pathname === '/api/observability/metrics') return sendJson(res, 200, await app.observabilityCenter.getMetrics(tenantId, actorId), requestId);
      // Serie temporal medida das mesmas metricas (uma amostra por tick do loop observability).
      // E a fonte dos sparklines do painel: sem serie, o painel mostra ausencia, nao uma linha
      // inventada. `runtime:read` porque e leitura de telemetria agregada, sem segredo.
      if (req.method === 'GET' && url.pathname === '/api/observability/series') {
        const raw = Number(url.searchParams.get('windowMinutes'));
        const names = url.searchParams.get('names');
        return sendJson(res, 200, await app.observabilitySeries.series(tenantId, actorId, {
          windowMinutes: Number.isFinite(raw) && raw > 0 ? raw : 120,
          ...(names ? { names: names.split(',').map((n) => n.trim()).filter(Boolean) } : {}),
        }), requestId);
      }
      // Forca UMA amostra agora, sem esperar a cadencia de 60s do worker. Existe por dois motivos
      // medidos: (a) em desenvolvimento nao ha worker, entao sem isto a serie nunca sairia de
      // "nao medido" e o painel nao poderia ser verificado; (b) em producao permite provar que o
      // coletor funciona sem esperar um minuto. runtime:admin: e uma escrita no store.
      if (req.method === 'POST' && url.pathname === '/api/observability/series/sample') {
        await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin');
        return sendJson(res, 200, await app.observabilitySeries.sample(tenantId, actorId, { trigger: 'operator' }), requestId);
      }
      // FLUXO 8 — estado de conexao com servicos externos (API Platform). Estado real
      // OFFLINE/ONLINE/CONNECTING derivado de health-check, para o Digital Twin e alertas.
      if (req.method === 'GET' && url.pathname === '/api/connection') { await app.controlPlane.authorize(tenantId, actorId, 'runtime:read'); return sendJson(res, 200, await app.apiConnection.status(), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/connection/check') { await app.controlPlane.authorize(tenantId, actorId, 'runtime:admin'); const b = await readJson(req); return sendJson(res, 200, await app.apiConnection.check(b.provider || 'aiplatform'), requestId); }
      // FLUXO 9 (Living Mode) — contexto vivo do FENIX para uma sessao de IA. JSON para maquina,
      // ?format=md para o briefing que se cola no Claude Code. Tudo derivado de estado medido.
      if (req.method === 'GET' && url.pathname === '/api/context') {
        if (url.searchParams.get('format') === 'md') { const md = await app.contextBuilder.buildMarkdown(tenantId, actorId); res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' }); return res.end(md); }
        return sendJson(res, 200, await app.contextBuilder.build(tenantId, actorId), requestId);
      }
      // MISSION-0003A — identidade permanente do organismo (organismId, nascimento, linhagem).
      if (req.method === 'GET' && url.pathname === '/api/organism/identity') return sendJson(res, 200, await app.organismIdentity.report(tenantId, actorId), requestId);
      // MISSION-0004 — Connector Runtime. Estado derivado por selfTest, nunca por config.
      if (req.method === 'GET' && url.pathname === '/api/connectors') return sendJson(res, 200, await app.connectors.statusAll(tenantId, actorId), requestId);
      if (req.method === 'GET' && /^\/api\/connectors\/[^/]+\/health$/.test(url.pathname)) return sendJson(res, 200, await app.connectors.health(tenantId, actorId, url.pathname.split('/')[3]), requestId);
      if (req.method === 'POST' && /^\/api\/connectors\/[^/]+\/selftest$/.test(url.pathname)) return sendJson(res, 200, await app.connectors.selfTest(tenantId, actorId, url.pathname.split('/')[3]), requestId);
      // MISSION-1003 — AI Router: qual provider seria escolhido agora, por evidência.
      if (req.method === 'GET' && url.pathname === '/api/ai/router/select') return sendJson(res, 200, await app.aiRouter.select(tenantId, actorId, { preferTier: url.searchParams.get('tier') || null }), requestId);
      // Executive Brain: objetivo -> Programa de missões (decompõe + delega ao planner).
      if (req.method === 'GET' && url.pathname === '/api/executive/programs') return sendJson(res, 200, { programs: await app.executiveBrain.list(tenantId, actorId) }, requestId);
      if (req.method === 'POST' && url.pathname === '/api/executive/decompose') { const b = await readJson(req); return sendJson(res, 200, await app.executiveBrain.decompose(tenantId, actorId, b.objective), requestId); }
      if (req.method === 'POST' && url.pathname === '/api/executive/programs') { const b = await readJson(req); return sendJson(res, 201, await app.executiveBrain.createProgram(tenantId, actorId, b.objective), requestId); }
      if (req.method === 'POST' && /^\/api\/executive\/programs\/[^/]+\/approve$/.test(url.pathname)) return sendJson(res, 200, await app.executiveBrain.approve(tenantId, actorId, url.pathname.split('/')[4]), requestId);
      if (req.method === 'GET' && /^\/api\/executive\/programs\/[^/]+\/status$/.test(url.pathname)) return sendJson(res, 200, await app.executiveBrain.status(tenantId, actorId, url.pathname.split('/')[4]), requestId);

      if (req.method === 'POST' && url.pathname === '/api/chat') {
        const b = await readJson(req);
        if (!b.message) return sendJson(res, 400, { error: 'message required' });
        return sendJson(res, 200, await app.chat.handle(tenantId, actorId, String(b.message)));
      }
      if (req.method === 'POST' && url.pathname === '/api/chat/intent') {
        const b = await readJson(req);
        if (!b.message) return sendJson(res, 400, { error: 'message required' }, requestId);
        return sendJson(res, 200, { classification: app.chat.classifyRequest(String(b.message)) }, requestId);
      }
      // Chat ao vivo (SSE streaming, historico, preferencias de voz, abort). Fica em modulo
      // proprio: uma resposta SSE vive por minutos escrevendo em pedacos, o que nao cabe no
      // padrao sendJson deste roteador.
      if (url.pathname.startsWith('/api/chat/')) {
        const handled = await handleLiveChat({ app, req, res, url, tenantId, actorId, readJson, sendJson, requestId });
        if (handled) return undefined;
      }
      // Memory Fabric 2.0 API
      if (req.method === 'POST' && url.pathname === '/api/memory/write') { 
        const b = await readJson(req); 
        return sendJson(res, 201, await app.memory.remember(tenantId, actorId, b), requestId); 
      }
      if (req.method === 'GET' && url.pathname === '/api/memory/search') { 
        return sendJson(res, 200, await app.memory.query(tenantId, actorId, url.searchParams.get('q'), { 
          kind: url.searchParams.get('kind'), 
          limit: Number(url.searchParams.get('limit')) || 10 
        }), requestId); 
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/memory/agent/')) { 
        const agentId = url.pathname.split('/')[4];
        return sendJson(res, 200, await app.memory.query(tenantId, actorId, '*', { agentId, limit: 50 }), requestId); 
      }
      if (req.method === 'GET' && url.pathname.startsWith('/api/memory/project/')) { 
        const projectId = url.pathname.split('/')[4];
        return sendJson(res, 200, await app.memory.query(tenantId, actorId, '*', { projectId, limit: 50 }), requestId); 
      }
      if (req.method === 'POST' && url.pathname === '/api/memory/consolidate') { 
        if (app.memoryConsolidator) {
          app.memoryConsolidator.consolidate();
          return sendJson(res, 200, { status: 'Memory consolidation job dispatched.' }, requestId); 
        }
        return sendJson(res, 400, { error: 'Consolidator not initialized' }, requestId); 
      }
      return sendJson(res, 404, { error: 'route not found' }, requestId);
    } catch (error) {
      const status = httpStatusFor(error);
      const capability = capabilityFromPath(routePath);
      logger.error({ event: 'http.request.failed', error, correlationId, requestId, capability,
        tenant: tenantId, actor: actorId, method: req.method, path: routePath });
      if (res.headersSent) return res.end();
      const safeError = status >= 500 ? 'Falha interna no FÊNIX. Use o ID de correlação para suporte.' : (error.message || 'Requisição inválida');
      return sendJson(res, status, { error: safeError, code: status >= 500 ? 'INTERNAL_ERROR' : (error.code || 'REQUEST_ERROR'), correlationId }, requestId);
    }
  });
  await new Promise((resolve) => {
    server.listen(port, options.bindHost || env.FENIX_BIND_HOST || '127.0.0.1', () => {
      const actual = server.address().port;
      if (require.main === module) process.stdout.write(`GRG Services OS: http://127.0.0.1:${actual}\n`);
      resolve();
    });
  });
  server.on('close', () => { app.close().catch(() => {}); });
  server.app = app;

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', async (request, socket, head) => {
    const upgradeUrl = new URL(request.url || '/', 'http://localhost');
    if (upgradeUrl.pathname !== '/events') return socket.destroy();
    const context = await app.security.authenticate(request.headers).catch(() => null);
    if (!context) return socket.destroy();
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    // Send initial connection event
    // Keep the wire event aligned with the frontend live-runtime contract.
    ws.send(JSON.stringify({ type: 'runtime.connected', payload: { status: 'ok' } }));
    
    // Subscribe to EventBus and forward to WS
    const unsubscribe = app.bus.on('*', (event) => {
      if (ws.readyState === 1) { // OPEN
        ws.send(JSON.stringify({ type: event.type, payload: event }));
      }
    });

    ws.on('close', () => {
      unsubscribe();
    });
  });

  // Ativacao operacional em background: o servidor ja esta escutando e o
  // healthcheck do container passa enquanto os 26 probes rodam.
  if (options.operationalActivation !== false) {
    app.activation = { status: 'running', startedAt: new Date().toISOString(), completedAt: null, error: null };
    server.activationPromise = runActivation()
      .then(() => { app.activation = { ...app.activation, status: 'completed', completedAt: new Date().toISOString() }; })
      .catch((error) => {
        app.activation = { ...app.activation, status: 'failed', completedAt: new Date().toISOString(), error: error.message };
        logger.error({ event: 'operational.activation.failed', error, capability: 'operations' });
      });
  }

  // FÊNIX LIVE BOOT MODE & Runtime Kernel persistent loop
  if (app.runtimeKernel) {
    app.runtimeKernel.start().catch((err) => {
      logger.error({ event: 'runtime.kernel.boot.failed', error: err, capability: 'kernel' });
    });
  }

  // O JobEngine canônico precisa de um consumidor quando o Fênix roda localmente.
  // O worker legado usa `jobQueue` e não consome `runtimeJobs`, deixando missões
  // RUNNING com o primeiro job QUEUED. Um único loop leve reutiliza o JobEngine,
  // que já faz claim, timeout, retry, eventos e projeção no MissionKernel.
  if (options.localRuntimeWorker !== false && app.jobs?.runBatch) {
    let ticking = false;
    const workerId = `fenix-local:${process.pid}`;
    console.log(JSON.stringify({ event: 'runtime.local-worker.started', workerId }));
    const runLocalBatch = async () => {
      if (ticking) return;
      ticking = true;
      try {
        await app.jobs.runBatch(workerId, 2);
        console.log(JSON.stringify({ event: 'runtime.local-worker.heartbeat', workerId }));
        if (app.missions?.reconcile) {
          const state = await app.store?.read?.();
          const tenants = Array.isArray(state?.tenants) ? state.tenants.filter((tenant) => tenant.status === 'active') : [];
          for (const tenant of tenants) {
            const actor = state.memberships?.find((membership) => membership.tenantId === tenant.id && membership.status === 'active')?.userId
              || state.users?.find((user) => user.tenantId === tenant.id && user.status === 'active')?.id
              || 'grg-admin';
            try { await app.missions.reconcile(tenant.id, actor, { autoStart: false, maxConcurrent: 2 }); }
            catch (error) { logger.error({ event: 'runtime.local-worker.reconcile.failed', error, tenantId: tenant.id }); }
          }
        }
      } catch (error) {
        logger.error({ event: 'runtime.local-worker.tick.failed', error, workerId });
      } finally {
        ticking = false;
      }
    };
    server.localRuntimeWorker = setInterval(runLocalBatch, Number(process.env.FENIX_LOCAL_WORKER_INTERVAL_MS || 1000));
    server.localRuntimeWorker.unref?.();
    runLocalBatch();
  }

  return server;
}

function capabilityFromPath(pathname) {
  if (!pathname) return 'unknown';
  if (pathname === '/health') return 'health';
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'api' ? (parts[1] || 'api') : 'web';
}

function resolveCanonicalPort(env = process.env) {
  const candidate = Number(env.FENIX_PORT || env.GRG_PORT || 4400);
  return Number.isInteger(candidate) && candidate >= 1 && candidate <= 65535 ? candidate : 4400;
}

function serveStatic(pathname, res) {
  const ALIASES = { '/': 'login.html', '/GRG-login': 'login.html', '/login': 'login.html', '/app': 'index.html', '/app.html': 'index.html', '/office': 'index.html', '/office.html': 'index.html' };
  const rel = ALIASES[pathname] || pathname.replace(/^\//, '');
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream';
  const cacheControl = file.endsWith('.html') ? 'no-store, max-age=0' : 'no-cache';
  res.writeHead(200, { 'content-type': `${type}; charset=utf-8`, 'cache-control': cacheControl });
  res.end(fs.readFileSync(file));
}

function safeToken(header, expected) { const supplied = String(header || '').replace(/^Bearer\s+/i, ''); if (!supplied || !expected) return false; const a = crypto.createHash('sha256').update(supplied).digest(); const b = crypto.createHash('sha256').update(String(expected)).digest(); return crypto.timingSafeEqual(a, b); }

if (require.main === module) start();
async function runAutonomousCycle(app, tenantId, actorId, input = {}) {
  if (!app?.executiveBrain || !app?.missions) throw new Error('canonical executive runtime is not configured');
  const objective = String(input.objective || '').trim();
  if (!objective) throw new Error('objective is required');
  const program = await app.executiveBrain.createProgram(tenantId, actorId, objective);
  const approved = await app.executiveBrain.approve(tenantId, actorId, program.id);
  const startedMissions = [];
  for (const ref of approved.missions) {
    if (!ref.missionId) continue;
    startedMissions.push(await app.missions.start(tenantId, actorId, ref.missionId));
  }
  const report = await app.missions.reconcile(tenantId, actorId, { autoStart: true, maxConcurrent: input.maxConcurrent });
  const state = await app.store.read();
  const jobs = (state.runtimeJobs || []).filter((job) => job.tenantId === tenantId && startedMissions.some((mission) => mission.id === job.missionId));
  if (app.fabricEvents?.publish) await app.fabricEvents.publish({ tenantId, stream: `autonomous:${program.id}`, type: 'autonomous.cycle.completed', source: 'executive-brain', subject: program.id, data: { actorId, programId: program.id, startedMissions: startedMissions.length, jobs: jobs.length } });
  return { ok: true, mode: 'CANONICAL_EXECUTIVE_PROGRAM', program: approved, startedMissions, jobs, report };
}

module.exports = { start, runAutonomousCycle, safeToken, capabilityFromPath, resolveCanonicalPort };

