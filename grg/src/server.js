const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, overview } = require('./app');
const { httpStatusFor } = require('./kernel/errors');
const { CloningGitHostAdapter } = require('./repo-intel/cloning-git-host');
const { loadSecurityConfig } = require('./security/config');
const { loadInfrastructureConfig } = require('./infrastructure/config');
const { createStructuredLogger } = require('./infrastructure/observability/structured-logger');
const { handleLiveChat } = require('./chat/live-chat-routes');
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
async function start(port = Number(process.env.PORT || 4400), options = {}) {
  const env = options.env || process.env;
  const securityConfig = options.securityConfig || loadSecurityConfig(env);
  const infrastructure = options.infrastructure || loadInfrastructureConfig(env, {
    requireExternal: options.requireExternalInfrastructure,
  });
  const logger = options.logger || createStructuredLogger();
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
    const state = await app.store.read();
    await app.organismIdentity.recordGeneration({ schemaVersion: state.schemaVersion, reason: 'boot' });
  } catch (error) {
    logger.error({ event: 'organism.generation.failed', error, capability: 'kernel' });
  }

  const runActivation = async () => {
    const state = await app.store.read();
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
      if (req.method === 'GET' && url.pathname === '/health') {
        const health = await app.health.check();
        return sendJson(res, health.ok ? 200 : 503, {
          ...health, service: 'grg-services-os', environment: securityConfig.runtimeEnv,
          // Progresso da ativacao operacional (roda em background apos o listen).
          activation: app.activation || { status: 'disabled' },
        }, requestId);
      }
      if (req.method === 'GET' && url.pathname === '/api/oidc/config') return sendJson(res, 200, {
        enabled: securityConfig.production,
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

      // ---- Auth (público) ----
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const b = await readJson(req);
        const sess = await app.auth.login(b.tenantId || 'grg', b.userId || b.user, b.password);
        return sendJson(res, 200, sess);
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        const m = String(req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
        if (m) await app.auth.logoutAsync(m[1]);
        return sendJson(res, 200, { ok: true }, requestId);
      }

      if (!url.pathname.startsWith('/api/')) return serveStatic(url.pathname, res);

      const cx = await app.security.authenticate(req.headers);
      if (!cx) return sendJson(res, 401, { error: 'not authenticated - login at /GRG-login' }, requestId);
      ({ tenantId, actorId } = cx);

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
      if (req.method === 'POST' && url.pathname === '/api/missions/plan') return sendJson(res, 201, await app.missionPlanner.plan(tenantId, actorId, await readJson(req)), requestId);
      if (req.method === 'GET' && url.pathname === '/api/missions/plans') return sendJson(res, 200, { plans: await app.missionPlanner.list(tenantId, actorId) }, requestId);
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
      if (req.method === 'POST' && url.pathname === '/api/runtime/tick') return sendJson(res, 202, { jobs: await app.jobs.tick(tenantId, actorId) }, requestId);
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
      if (req.method === 'GET' && url.pathname === '/api/knowledge-federation/publications') return sendJson(res, 200, { publications: await app.federation.list(tenantId, actorId) }, requestId);
      if (req.method === 'GET' && url.pathname === '/api/ai/telemetry') return sendJson(res, 200, await app.aiGateway.telemetry(tenantId, actorId));
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
        return sendJson(res, 200, await app.productionReadiness.generate(tenantId, actorId, {
          boot: url.searchParams.get('boot') !== 'false',
          write: url.searchParams.get('write') === 'true',
        }), requestId);
      }
      // Telemetria real do host + infra (substitui as metricas simuladas).
      if (req.method === 'GET' && url.pathname === '/api/observability/metrics') return sendJson(res, 200, await app.observabilityCenter.getMetrics(tenantId, actorId), requestId);
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
      // Chat ao vivo (SSE streaming, historico, preferencias de voz, abort). Fica em modulo
      // proprio: uma resposta SSE vive por minutos escrevendo em pedacos, o que nao cabe no
      // padrao sendJson deste roteador.
      if (url.pathname.startsWith('/api/chat/')) {
        const handled = await handleLiveChat({ app, req, res, url, tenantId, actorId, readJson, sendJson, requestId });
        if (handled) return undefined;
      }
      return sendJson(res, 404, { error: 'route not found' }, requestId);
    } catch (error) {
      const status = httpStatusFor(error);
      const capability = capabilityFromPath(routePath);
      logger.error({ event: 'http.request.failed', error, correlationId, requestId, capability,
        tenant: tenantId, actor: actorId, method: req.method, path: routePath });
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
  return server;
}

function capabilityFromPath(pathname) {
  if (!pathname) return 'unknown';
  if (pathname === '/health') return 'health';
  const parts = pathname.split('/').filter(Boolean);
  return parts[0] === 'api' ? (parts[1] || 'api') : 'web';
}

function serveStatic(pathname, res) {
  const ALIASES = { '/': 'login.html', '/GRG-login': 'login.html', '/login': 'login.html', '/app': 'index.html', '/office': 'office.html' };
  const rel = ALIASES[pathname] || pathname.replace(/^\//, '');
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream';
  res.writeHead(200, { 'content-type': `${type}; charset=utf-8` });
  res.end(fs.readFileSync(file));
}

function safeToken(header, expected) { const supplied = String(header || '').replace(/^Bearer\s+/i, ''); if (!supplied || !expected) return false; const a = crypto.createHash('sha256').update(supplied).digest(); const b = crypto.createHash('sha256').update(String(expected)).digest(); return crypto.timingSafeEqual(a, b); }

if (require.main === module) start();
module.exports = { start, safeToken, capabilityFromPath };
