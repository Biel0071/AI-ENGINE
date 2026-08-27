const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { start } = require('../src/server');
const { PROJECT_AGENT_ROLES } = require('../src/cognitive/cognitive-hierarchy');

const ADMIN = { tenantId: 'grg', userId: 'test-admin', password: crypto.randomBytes(24).toString('base64url') };

function withServer(fn) {
  return async () => {
    const dataFile = path.join(os.tmpdir(), `grg-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const server = await start(0, {
      dataFile,
      llm: false,
      bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Test', name: 'Test Admin', role: 'master_admin' },
    });
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    try { await fn(base); }
    finally { server.close(); try { fs.unlinkSync(dataFile); } catch {} }
  };
}

async function authHeaders(base) {
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ADMIN),
  }).then((response) => response.json());
  assert.ok(login.token);
  return { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
}

test('health endpoint responds', withServer(async (base) => {
  const r = await fetch(`${base}/health`).then((x) => x.json());
  assert.equal(r.ok, true);
}));

test('publishes disabled OIDC browser configuration outside production', withServer(async (base) => {
  const config = await fetch(`${base}/api/oidc/config`).then((response) => response.json());
  assert.equal(config.enabled, false);
  assert.equal(config.scope, 'openid profile email');
}));

test('serves dashboard html', withServer(async (base) => {
  const login = await fetch(`${base}/`).then((x) => x.text());
  assert.match(login, /GRG SERVI|login/i); // raiz agora e a tela de login
  const appHtml = await fetch(`${base}/app`).then((x) => x.text());
  assert.match(appHtml, /F.NIX OS|Master Agentic IDE/i);
}));

test('rejects unauthenticated api access with 401', withServer(async (base) => {
  const r = await fetch(`${base}/api/overview`);
  assert.equal(r.status, 401);
}));

test('rejects every privileged router before specialized handlers run', withServer(async (base) => {
  const privateRoutes = [
    '/api/runtime',
    '/api/jobs',
    '/api/workers',
    '/api/knowledge',
    '/api/context',
    '/api/dev/fs?path=',
    '/api/v2/projects',
  ];
  for (const route of privateRoutes) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 401, `${route} must require an authenticated session`);
  }
}));

test('rejects development identity headers by default', withServer(async (base) => {
  const response = await fetch(`${base}/api/overview`, { headers: { 'x-tenant-id': 'grg', 'x-user-id': 'test-admin' } });
  assert.equal(response.status, 401);
}));

test('login then use bearer token works', withServer(async (base) => {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ADMIN) }).then((x) => x.json());
  assert.ok(login.token);
  const ov = await fetch(`${base}/api/overview`, { headers: { authorization: `Bearer ${login.token}` } });
  assert.equal(ov.status, 200);
}));

test('universal v2 job contract persists real state, events, queue view and cancellation', withServer(async (base) => {
  const headers = await authHeaders(base);
  const submittedResponse = await fetch(`${base}/api/v2/jobs`, {
    method: 'POST', headers,
    body: JSON.stringify({ type: 'discovery.scan', source: 'codex', sessionId: 'ide-session', prompt: 'inspect runtime', riskLevel: 'LOW' }),
  });
  assert.equal(submittedResponse.status, 202);
  const submitted = await submittedResponse.json();
  assert.ok(submitted.jobId);
  assert.equal(submitted.status, 'QUEUED');

  const job = await fetch(`${base}/api/v2/jobs/${submitted.jobId}`, { headers }).then((response) => response.json());
  assert.equal(job.jobId, submitted.jobId);
  assert.equal(job.source, 'codex');
  assert.equal(job.prompt, 'inspect runtime');

  const history = await fetch(`${base}/api/v2/jobs/${submitted.jobId}/events`, { headers }).then((response) => response.json());
  assert.ok(history.events.some((event) => event.type === 'runtime.job.queued'));

  const queueView = await fetch(`${base}/api/jobs`, { headers }).then((response) => response.json());
  assert.ok(queueView.jobs.some((item) => item.jobId === submitted.jobId));
  assert.equal(queueView.bullmq, null);

  const cancelledResponse = await fetch(`${base}/api/v2/jobs/${submitted.jobId}/cancel`, { method: 'POST', headers });
  assert.equal(cancelledResponse.status, 202);
  const cancelled = await cancelledResponse.json();
  assert.equal(cancelled.status, 'CANCELLED');

  const workers = await fetch(`${base}/api/workers`, { headers }).then((response) => response.json());
  assert.equal(workers.configured, false);
  assert.deepEqual(workers.workers, []);
}));

test('full HTTP flow: orchestrate then overview reflects it', withServer(async (base) => {
  const headers = await authHeaders(base);
  const orch = await fetch(`${base}/api/orchestrate`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'HttpApp', prompt: 'dashboard com analytics e login', target: 'node' }),
  }).then((x) => x.json());
  assert.ok(orch.projectId);
  assert.match(orch.previewUrl, /preview/);

  const ov = await fetch(`${base}/api/overview`, { headers }).then((x) => x.json());
  assert.ok(ov.metrics.projects >= 1);
  assert.ok(ov.metrics.deployments >= 1);
}));

test('adds security headers and request id', withServer(async (base) => {
  const response = await fetch(`${base}/health`);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('x-request-id'));
}));

test('runtime exceptions are sanitized for the browser and logged with full trace context', async () => {
  const dataFile = path.join(os.tmpdir(), `grg-error-${Date.now()}.json`);
  const events = [];
  const server = await start(0, {
    dataFile, llm: false, logger: { error: (event) => events.push(event) },
    bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Test', name: 'Test Admin', role: 'master_admin' },
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = await authHeaders(base);
    headers['x-correlation-id'] = 'corr-chat-test';
    server.app.chat.handle = async () => { throw new Error('internal provider secret'); };
    const response = await fetch(`${base}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'olá' }) });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.equal(body.code, 'INTERNAL_ERROR');
    assert.equal(body.correlationId, 'corr-chat-test');
    assert.doesNotMatch(JSON.stringify(body), /provider secret/);
    assert.equal(events[0].capability, 'chat');
    assert.equal(events[0].tenant, 'grg');
    assert.match(events[0].error.stack, /internal provider secret/);
  } finally {
    server.close(); try { fs.unlinkSync(dataFile); } catch {}
  }
});

test('memory API records, retrieves, versions and forgets knowledge', withServer(async (base) => {
  const headers = await authHeaders(base);
  const create = await fetch(`${base}/api/memories`, {
    method: 'POST', headers,
    body: JSON.stringify({
      kind: 'semantic', title: 'API standard', content: 'All APIs use request IDs.',
      stableKey: 'standard:request-id', confidence: 0.95,
      provenance: { type: 'adr', reference: 'ADR-1', evidence: ['test:e2e'] },
    }),
  });
  assert.equal(create.status, 201);
  const memory = await create.json();
  const search = await fetch(`${base}/api/memories/search?q=request%20IDs`, { headers }).then((response) => response.json());
  assert.equal(search.results[0].memory.id, memory.id);
  const history = await fetch(`${base}/api/memories/${memory.id}/history`, { headers }).then((response) => response.json());
  assert.equal(history.versions.length, 1);
  const forgotten = await fetch(`${base}/api/memories/${memory.id}`, {
    method: 'DELETE', headers, body: JSON.stringify({ reason: 'obsolete' }),
  });
  assert.equal(forgotten.status, 200);
}));

test('federated cognitive API creates scoped workspaces and memory', withServer(async (base) => {
  const headers = await authHeaders(base);
  const companyResponse = await fetch(`${base}/api/cognitive/entities`, { method: 'POST', headers, body: JSON.stringify({ type: 'company', name: 'GRG Commerce' }) });
  assert.equal(companyResponse.status, 201);
  const company = await companyResponse.json();
  const projectResponse = await fetch(`${base}/api/cognitive/entities`, { method: 'POST', headers, body: JSON.stringify({ type: 'project', name: 'Commerce API', parentId: company.id }) });
  assert.equal(projectResponse.status, 201);
  const project = await projectResponse.json();
  const workspace = await fetch(`${base}/api/cognitive/entities/${project.id}/workspace`, { headers }).then((response) => response.json());
  assert.equal(workspace.agents.length, PROJECT_AGENT_ROLES.length);
  const memoryResponse = await fetch(`${base}/api/memories`, { method: 'POST', headers, body: JSON.stringify({ kind: 'project', scopeType: 'project', scopeId: project.id, content: 'Uses Redis and OAuth', provenance: { type: 'onboarding', reference: 'repo:commerce' } }) });
  assert.equal(memoryResponse.status, 201);
  const search = await fetch(`${base}/api/memories/search?q=Redis&scopeId=${project.id}&scopeType=project`, { headers }).then((response) => response.json());
  assert.equal(search.results.length, 1);
  const hierarchy = await fetch(`${base}/api/cognitive/entities`, { headers }).then((response) => response.json());
  assert.ok(hierarchy.entities.some((item) => item.id === project.id));
}));

test('trusted execution API accepts a signed manifest and returns its timeline', async () => {
  const dataFile = path.join(os.tmpdir(), `grg-sandbox-e2e-${Date.now()}.json`);
  const sandboxAdapter = { productionSafe: true, run: async ({ argv, tool }) => ({ exitCode: 0, stdout: argv.join(' '), stderr: '', sandbox: { driver: 'test', image: tool.image } }) };
  const server = await start(0, { dataFile, llm: false, sandboxAdapter, bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Test', name: 'Test Admin', role: 'master_admin' } });
  try {
    const base = `http://127.0.0.1:${server.address().port}`; const headers = await authHeaders(base);
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    const signer = await fetch(`${base}/api/execution/signers`, { method: 'POST', headers, body: JSON.stringify({ signerId: 'e2e-release', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) }) }); assert.equal(signer.status, 201);
    const image = `repo/node@sha256:${'c'.repeat(64)}`;
    const tool = await fetch(`${base}/api/execution/tools`, { method: 'POST', headers, body: JSON.stringify({ id: 'e2e-node', command: 'node', image, version: '24' }) }); assert.equal(tool.status, 201);
    const manifest = { id: 'e2e-health', version: '1.0.0', toolId: 'e2e-node', entrypoint: 'node', args: ['--version'], parameters: [], description: 'Health' };
    const { canonical } = require('../src/execution/script-library'); const signature = crypto.sign(null, Buffer.from(canonical(manifest)), privateKey).toString('base64');
    const script = await fetch(`${base}/api/execution/scripts`, { method: 'POST', headers, body: JSON.stringify({ signerId: 'e2e-release', manifest, signature }) }); assert.equal(script.status, 201);
    const executed = await fetch(`${base}/api/execution/sandbox`, { method: 'POST', headers, body: JSON.stringify({ scriptId: 'e2e-health' }) }); assert.equal(executed.status, 202);
    const result = await executed.json(); assert.equal(result.status, 'SUCCEEDED'); assert.equal(result.timeline.length, 2);
  } finally { server.close(); try { fs.unlinkSync(dataFile); } catch {} }
});

test('Fabric API enrolls a service and exposes registry plus durable event', withServer(async (base) => {
  const headers = await authHeaders(base);
  const enrolled = await fetch(`${base}/api/fabric/enroll`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'AI City', version: '1.0.0', systemType: 'ai-city', capabilities: ['city-map'], dependencies: ['postgres'] }),
  });
  assert.equal(enrolled.status, 201);
  const result = await enrolled.json();
  assert.match(result.credentials.privateKey, /PRIVATE KEY/);
  const registry = await fetch(`${base}/api/registry`, { headers }).then((response) => response.json());
  assert.ok(registry.resources.some((item) => item.name === 'AI City'));
  const events = await fetch(`${base}/api/events?type=fabric.service.registered`, { headers }).then((response) => response.json());
  assert.equal(events.events.length, 1);
  assert.equal(JSON.stringify(events).includes('PRIVATE KEY'), false);
}));
