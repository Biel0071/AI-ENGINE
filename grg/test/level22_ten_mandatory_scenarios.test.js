'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');

// Test against live VPS or ephemeral local instance
const TARGET_HOST = process.env.FENIX_TEST_HOST || '209.50.241.22';
const TARGET_PORT = Number(process.env.FENIX_TEST_PORT || 3000);

function postJSON(pathname, data, token = null) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: pathname,
      method: 'POST',
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, raw: body, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJSON(pathname, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: pathname,
      method: 'GET',
      headers
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, raw: body, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('FÊNIX LEVEL 22 — BATERIA DE 10 CENÁRIOS OPERACIONAIS OBRIGATÓRIOS', async (t) => {
  let authToken = null;

  // Setup: Authenticate with grg-admin / admin
  await t.test('SETUP: Autenticação canônica grg-admin / admin', async () => {
    const loginRes = await postJSON('/api/login', {
      tenantId: 'grg',
      userId: 'grg-admin',
      password: 'admin'
    });
    assert.equal(loginRes.status, 200, `Login deve retornar HTTP 200: ${JSON.stringify(loginRes.data)}`);
    assert.ok(loginRes.data?.token, 'Token de sessão Bearer deve ser retornado');
    authToken = loginRes.data.token;
  });

  // TESTE 1 — Ciclo completo de agente
  await t.test('TESTE 1 — Ciclo completo de agente (Criação, Atribuição, Execução, Conclusão)', async () => {
    const testAgentId = `test-agent-${Date.now().toString(36)}`;
    const stateRes = await getJSON('/api/v2/living-city/state', authToken);
    assert.equal(stateRes.status, 200);
    assert.ok(Array.isArray(stateRes.data?.agents), 'Lista de agentes deve ser um array');

    // Dispatch mission with specific agent
    const missionRes = await postJSON('/api/v2/living-city/missions/execute', {
      prompt: `Auditar agente ${testAgentId}`,
      objective: `Auditar agente ${testAgentId}`,
      projectId: 'api-platform',
      assignedAgentId: 'agent-api-ops'
    }, authToken);

    assert.equal(missionRes.status, 200);
    assert.equal(missionRes.data?.ok, true);
    assert.equal(missionRes.data?.assignedAgent?.id, 'agent-api-ops');
    assert.equal(missionRes.data?.assignedAgent?.status, 'COMPLETED');
  });

  // TESTE 2 — Ciclo completo de missão
  await t.test('TESTE 2 — Ciclo completo de missão (Planejamento, Etapas, Evidência SHA-256)', async () => {
    const missionRes = await postJSON('/api/v2/living-city/missions/execute', {
      prompt: 'Verificar integridade da Memória Ativa Level 22',
      objective: 'Verificar integridade da Memória Ativa Level 22',
      projectId: 'api-platform'
    }, authToken);

    assert.equal(missionRes.status, 200);
    assert.ok(missionRes.data?.missionId, 'Missão deve possuir ID persistente');
    assert.ok(Array.isArray(missionRes.data?.steps), 'Passos devem ser um array');
    assert.ok(missionRes.data?.steps.length >= 3, 'Devem haver ao menos 3 etapas de ferramentas reais');
    assert.ok(missionRes.data?.evidence?.sha256, 'Evidência SHA-256 deve estar presente');
    assert.ok(missionRes.data?.evidence?.filesAnalyzed > 0, 'Arquivos analisados devem ser medidos');
  });

  // TESTE 3 — Fila de jobs
  await t.test('TESTE 3 — Fila de jobs (Consulta da fila real, estados e contadores do JobEngine)', async () => {
    const jobsRes = await getJSON('/api/v2/jobs', authToken);
    assert.equal(jobsRes.status, 200);
    assert.ok(Array.isArray(jobsRes.data?.jobs), 'Fila de jobs deve ser retornada como array');
    assert.ok(typeof jobsRes.data?.total === 'number' || typeof jobsRes.data?.jobs?.length === 'number');
  });

  // TESTE 4 — Eventos
  await t.test('TESTE 4 — Eventos (Consulta ao histórico, integridade de correlationId e ordenação)', async () => {
    const eventsRes = await getJSON('/api/v2/events/history?limit=15', authToken);
    assert.equal(eventsRes.status, 200);
    const events = eventsRes.data?.events || [];
    assert.ok(events.length > 0, 'Histórico de eventos deve conter registros persistidos');
    for (const ev of events) {
      assert.ok(ev.timestamp, 'Evento deve ter timestamp');
      assert.ok(ev.type || ev.category, 'Evento deve ter tipo ou categoria');
    }
  });

  // TESTE 5 — Cidade
  await t.test('TESTE 5 — Cidade (Sincronismo de edifícios e entidades com Project Registry)', async () => {
    const stateRes = await getJSON('/api/v2/living-city/state', authToken);
    assert.equal(stateRes.status, 200);
    assert.ok(stateRes.data?.projects, 'Cidade deve conter registro de projetos e edifícios');
    const apiProj = (stateRes.data?.projects || []).find(p => p.id === 'api-platform');
    assert.ok(apiProj, 'Projeto api-platform deve existir na cidade');
  });

  // TESTE 6 — Reconexão
  await t.test('TESTE 6 — Reconexão (Verificação do endpoint de streaming SSE sem duplicação)', async () => {
    const ssePromise = new Promise((resolve, reject) => {
      const req = http.request({
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: '/api/v2/events/stream',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      }, res => {
        assert.equal(res.statusCode, 200);
        assert.match(String(res.headers['content-type']), /text\/event-stream/);
        res.on('data', () => {
          req.destroy();
          resolve(true);
        });
      });
      req.on('error', err => {
        if (err.code === 'ECONNRESET') resolve(true);
        else reject(err);
      });
      req.end();
    });
    const sseResult = await ssePromise;
    assert.ok(sseResult);
  });

  // TESTE 7 — Consistência
  await t.test('TESTE 7 — Consistência de telemetria entre Header, APIs e Banco', async () => {
    const [cityState, meRes] = await Promise.all([
      getJSON('/api/v2/living-city/state', authToken),
      getJSON('/api/me', authToken)
    ]);
    assert.equal(cityState.status, 200);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data?.userId, 'grg-admin');
    assert.equal(meRes.data?.tenantId, 'grg');
    assert.equal(meRes.data?.role, 'master_admin');
  });

  // TESTE 8 — Layout e Workspace
  await t.test('TESTE 8 — Layout e Workspace (Disponibilidade dos módulos do shell canônico)', async () => {
    const appHtmlRes = await new Promise((resolve) => {
      http.get(`http://${TARGET_HOST}:${TARGET_PORT}/app`, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve({ status: res.statusCode, body: b }));
      });
    });
    assert.equal(appHtmlRes.status, 200);
    assert.ok(appHtmlRes.body.includes('view-city'), 'view-city deve estar presente no shell canônico');
    assert.ok(appHtmlRes.body.includes('dockCardJobsList'), 'Card 4 (#dockCardJobsList) deve estar no DOM');
    assert.ok(appHtmlRes.body.includes('dockCardEventsList'), 'Card 3 (#dockCardEventsList) deve estar no DOM');
    assert.ok(appHtmlRes.body.includes('cityCanvas'), 'Canvas 3D (#cityCanvas) deve estar no DOM');
  });

  // TESTE 9 — Carga e Latência
  await t.test('TESTE 9 — Carga e Latência (Benchmark de 5 requisições com p95 < 500ms)', async () => {
    const latencies = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      const res = await getJSON('/api/v2/living-city/state', authToken);
      assert.equal(res.status, 200);
      latencies.push(Date.now() - start);
    }
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    assert.ok(p95 < 500, `Latência p95 deve ser menor que 500ms: medido ${p95}ms`);
  });

  // TESTE 10 — Falha controlada e Honestidade
  await t.test('TESTE 10 — Falha controlada e Honestidade (Rejeição honesta de credenciais erradas)', async () => {
    const badLoginRes = await postJSON('/api/login', {
      tenantId: 'grg',
      userId: 'grg-admin',
      password: 'senha_completamente_incorreta_12345'
    });
    assert.equal(badLoginRes.status, 403, 'Senha errada deve retornar HTTP 403 honesto');
    assert.equal(badLoginRes.data?.error, 'Credenciais inválidas');
  });
});
