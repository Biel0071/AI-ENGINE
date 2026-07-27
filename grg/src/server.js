const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, overview } = require('./app');
const { httpStatusFor } = require('./kernel/errors');
const { CloningGitHostAdapter } = require('./repo-intel/cloning-git-host');
const { loadSecurityConfig } = require('./security/config');
const { loadInfrastructureConfig } = require('./infrastructure/config');

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
  });
  if (require.main === module) process.stdout.write(`LLM (chat natural): ${app.llm ? 'LIGADO via ' + app.llmSource : 'desligado (modo regras)'}\n`);
  const bootstrap = options.bootstrapAdmin || securityConfig.bootstrapAdmin;
  if (bootstrap) {
    try {
      await app.controlPlane.createTenant({ id: bootstrap.tenantId, name: bootstrap.tenantName }, bootstrap.userId);
    } catch { /* tenant já provisionado */ }
    await app.auth.ensureUser(bootstrap.tenantId, bootstrap.userId, bootstrap.password, bootstrap.role || 'master_admin', bootstrap.name);
  }

  const server = http.createServer(async (req, res) => {
    let requestId = null;
    try {
      const url = new URL(req.url, 'http://localhost');
      const gate = app.security.begin(req, res, url.pathname);
      requestId = gate.requestId;
      if (!gate.allowed) return sendJson(res, gate.status, { error: gate.error }, requestId);
      if (req.method === 'GET' && url.pathname === '/health') {
        const health = await app.health.check();
        return sendJson(res, health.ok ? 200 : 503, {
          ...health, service: 'grg-services-os', environment: securityConfig.runtimeEnv,
        }, requestId);
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
      const { tenantId, actorId } = cx;

      if (req.method === 'GET' && url.pathname === '/api/me') return sendJson(res, 200, { tenantId, actorId, authed: cx.authed });

      if (req.method === 'GET' && url.pathname === '/api/overview') return sendJson(res, 200, await overview(app, tenantId, actorId));
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
      if (req.method === 'POST' && url.pathname === '/api/chat') {
        const b = await readJson(req);
        if (!b.message) return sendJson(res, 400, { error: 'message required' });
        return sendJson(res, 200, await app.chat.handle(tenantId, actorId, String(b.message)));
      }
      return sendJson(res, 404, { error: 'route not found' }, requestId);
    } catch (error) {
      return sendJson(res, httpStatusFor(error), { error: error.message || 'error' }, requestId);
    }
  });
  await new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      if (require.main === module) process.stdout.write(`GRG Services OS: http://127.0.0.1:${actual}\n`);
      resolve();
    });
  });
  server.on('close', () => { app.close().catch(() => {}); });
  server.app = app;
  return server;
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

if (require.main === module) start();
module.exports = { start };
