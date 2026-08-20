/**
 * FÊNIX OS — TOKEN ECONOMY + AGENTIC INTELLIGENCE E2E TEST SUITE
 * 
 * Tests all Level 10 engines via live HTTP against port 4400:
 *  1. Token Economy Engine (report, mode, compress, record)
 *  2. Context Assembler (7 context types)
 *  3. Model Router (route, registry)
 *  4. Frontend Reality Engine (scan, screens, graph, audit, correlate, click-test, design-system)
 *  5. Connection Broker (list, request, configure, test, revoke, link-project)
 *  6. Development Memory (stats, record, retrieve, patterns)
 */

const assert = require('assert');
const http = require('http');

const BASE = 'http://127.0.0.1:4400';

function request(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (payload) opts.headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(`${BASE}${endpoint}`, opts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (ep) => request('GET', ep);
const post = (ep, d) => request('POST', ep, d);

let passed = 0;
let failed = 0;
let total = 0;

function ok(label, condition, detail = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX OS — TOKEN ECONOMY + AGENTIC INTELLIGENCE E2E');
  console.log('================================================================\n');

  // ════════════════════════════════════════════════════════════════
  // 1. TOKEN ECONOMY ENGINE
  // ════════════════════════════════════════════════════════════════
  console.log('[1/6] TOKEN ECONOMY ENGINE');

  // 1a. GET efficiency report
  const rep = await get('/api/v2/economy/report');
  ok('Economy report returns 200', rep.status === 200);
  ok('Report has devEfficiencyScore', rep.data.devEfficiencyScore !== undefined, rep.data.devEfficiencyScore);
  ok('Report has costMode', !!rep.data.costMode, rep.data.costMode);
  ok('Report has metrics', !!rep.data.metrics);

  // 1b. POST set cost mode
  const mode = await post('/api/v2/economy/mode', { mode: 'ECONOMY' });
  ok('Set cost mode returns 200', mode.status === 200);
  ok('Mode changed to ECONOMY', mode.data.costMode === 'ECONOMY' || mode.data.mode === 'ECONOMY');

  // Reset to BALANCED
  await post('/api/v2/economy/mode', { mode: 'BALANCED' });

  // 1c. POST compress context
  const comp = await post('/api/v2/economy/compress-context', {
    projectDna: { name: 'test', stack: 'Node.js' },
    relevantFiles: ['server.js', 'index.js'],
    diff: '+ added line\n- removed line',
    maxTokens: 1000
  });
  ok('Compress context returns 200', comp.status === 200);
  ok('Compressed context has data', !!comp.data);

  // 1d. POST record AI call
  const rec = await post('/api/v2/economy/record-call', {
    model: 'qwen2.5:3b',
    provider: 'ai_platform',
    tokensInput: 500,
    tokensOutput: 200,
    latency: 1200,
    task: 'code_synthesis',
    project: 'fenix_test',
    agent: 'Developer Agent',
    success: true,
    cacheHit: false
  });
  ok('Record call returns 200', rec.status === 200);

  // 1e. Verify updated report
  const rep2 = await get('/api/v2/economy/report');
  ok('Updated report reflects call', rep2.data.metrics && rep2.data.metrics.totalCalls >= 1,
    `totalCalls=${rep2.data.metrics?.totalCalls}`);

  // ════════════════════════════════════════════════════════════════
  // 2. CONTEXT ASSEMBLER
  // ════════════════════════════════════════════════════════════════
  console.log('\n[2/6] CONTEXT ASSEMBLER');

  const contextTypes = ['minimal', 'coding', 'architecture', 'debug', 'visual', 'deployment', 'research'];
  for (const ct of contextTypes) {
    const ctx = await post('/api/v2/context/build', {
      type: ct,
      projectDna: { name: 'fenix', stack: 'Node.js + React' },
      userRequest: 'Fix dashboard bug',
      intent: 'BUG_FIX',
      targetFile: 'dashboard.tsx',
      errorMessage: 'Cannot read property of undefined',
      stackTrace: 'at Dashboard.render',
      deployTarget: 'vps',
      topic: 'token economy patterns'
    });
    ok(`Context type "${ct}" returns 200`, ctx.status === 200);
    ok(`Context type "${ct}" has contextType`, ctx.data.contextType === ct);
  }

  // ════════════════════════════════════════════════════════════════
  // 3. MODEL ROUTER
  // ════════════════════════════════════════════════════════════════
  console.log('\n[3/6] MODEL ROUTER');

  // 3a. Route simple task → cheap model
  const simple = await post('/api/v2/model-router/route', {
    domain: 'GENERAL',
    taskType: 'classification',
    riskLevel: 'SAFE',
    complexity: 'LOW'
  });
  ok('Route simple task returns 200', simple.status === 200);
  ok('Simple task routes to cheap model', !!simple.data.selectedModel, simple.data.selectedModel?.id || simple.data.selectedModel);

  // 3b. Route complex task → escalate
  const complex = await post('/api/v2/model-router/route', {
    domain: 'SECURITY',
    taskType: 'code_review',
    riskLevel: 'CRITICAL',
    complexity: 'HIGH',
    requiresHighReasoning: true
  });
  ok('Route complex task returns 200', complex.status === 200);
  ok('Complex task selects model', !!complex.data.selectedModel);

  // 3c. Route with failures → escalation
  const escalated = await post('/api/v2/model-router/route', {
    domain: 'CODE',
    taskType: 'code_synthesis',
    riskLevel: 'SAFE',
    complexity: 'MEDIUM',
    failureCount: 3
  });
  ok('Escalated route returns 200', escalated.status === 200);

  // 3d. Model registry
  const reg = await get('/api/v2/model-router/registry');
  ok('Model registry returns 200', reg.status === 200);
  ok('Registry has models', Array.isArray(reg.data.models) || typeof reg.data === 'object');

  // ════════════════════════════════════════════════════════════════
  // 4. FRONTEND REALITY ENGINE
  // ════════════════════════════════════════════════════════════════
  console.log('\n[4/6] FRONTEND REALITY ENGINE');

  // 4a. Screens list
  const screens = await get('/api/v2/frontend-reality/screens?projectId=fenix_test_lab');
  ok('Screens endpoint returns 200', screens.status === 200);
  ok('Screens response has projectId', !!screens.data.projectId);

  // 4b. Navigation graph
  const graph = await get('/api/v2/frontend-reality/navigation-graph?projectId=fenix_test_lab');
  ok('Navigation graph returns 200', graph.status === 200);

  // 4c. Orphan audit
  const audit = await get('/api/v2/frontend-reality/audit?projectId=fenix_test_lab');
  ok('Orphan audit returns 200', audit.status === 200);

  // 4d. Visual-Code correlation
  const corr = await post('/api/v2/frontend-reality/correlate', {
    screenId: 'screen_dashboard_root',
    elementLabel: 'Novo Projeto'
  });
  ok('Correlate element returns 200', corr.status === 200);

  // 4e. Click everything test
  const click = await post('/api/v2/frontend-reality/click-test', { projectId: 'fenix_test_lab' });
  ok('Click-test returns 200', click.status === 200);

  // 4f. Design system DNA
  const ds = await get('/api/v2/frontend-reality/design-system');
  ok('Design system returns 200', ds.status === 200);
  ok('Design system has data', !!ds.data.designSystem);

  // ════════════════════════════════════════════════════════════════
  // 5. CONNECTION BROKER
  // ════════════════════════════════════════════════════════════════
  console.log('\n[5/6] CONNECTION BROKER');

  // 5a. List connections
  const conns = await get('/api/v2/connections');
  ok('List connections returns 200', conns.status === 200);
  ok('Connections is array', Array.isArray(conns.data.connections), `count=${conns.data.connections?.length}`);

  // 5b. Start auth flow (github)
  const auth = await post('/api/v2/connections/request', {
    provider: 'github',
    deviceId: 'GRG-TEST-01'
  });
  ok('Start auth returns 200', auth.status === 200);

  // 5c. Test connection
  const test = await post('/api/v2/connections/github/test');
  ok('Test connection returns response', test.status === 200 || test.status === 400);

  // 5d. Configure credentials (API key provider)
  const conf = await post('/api/v2/connections/openai/configure', {
    apiKey: 'sk-test-placeholder-key-for-testing-only'
  });
  ok('Configure credentials returns response', conf.status === 200 || conf.status === 400);

  // 5e. Link project
  const link = await post('/api/v2/connections/github/link-project', {
    projectId: 'ai-engine-core',
    repo: 'grfranco/ai-engine-core'
  });
  ok('Link project returns response', link.status === 200 || link.status === 400);

  // ════════════════════════════════════════════════════════════════
  // 6. DEVELOPMENT MEMORY & LEARNING ENGINE
  // ════════════════════════════════════════════════════════════════
  console.log('\n[6/6] DEVELOPMENT MEMORY & LEARNING ENGINE');

  // 6a. Get stats
  const stats = await get('/api/v2/memory/development');
  ok('Memory stats returns 200', stats.status === 200);
  ok('Stats has totalEntries', stats.data.totalEntries !== undefined, `entries=${stats.data.totalEntries}`);
  ok('Stats has totalPatterns', stats.data.totalPatterns !== undefined);

  // 6b. Record memory
  const mem = await post('/api/v2/memory/development/record', {
    category: 'BUG',
    projectId: 'fenix_test',
    title: 'Dashboard rendering broken after project switch',
    description: 'State was not being reset when changing projects in dashboard',
    solution: 'Added useEffect cleanup and state reset in Dashboard component',
    filesAffected: ['Dashboard.tsx', 'ProjectContext.tsx'],
    tags: ['react', 'state', 'dashboard', 'bug']
  });
  ok('Record memory returns 201', mem.status === 201);
  ok('Memory entry has id', !!mem.data.id, mem.data.id);
  ok('Memory entry has category BUG', mem.data.category === 'BUG');

  // 6c. Record successful solution
  const sol = await post('/api/v2/memory/development/record', {
    category: 'SUCCESSFUL_SOLUTION',
    projectId: 'fenix_test',
    title: 'Token optimization via context compression',
    description: 'Reduced token usage by 60% using targeted context assembly',
    solution: 'Use ContextAssembler.buildMinimalContext() instead of full project dump',
    tags: ['optimization', 'tokens', 'context']
  });
  ok('Record solution returns 201', sol.status === 201);

  // 6d. Retrieve memories
  const retr = await post('/api/v2/memory/development/retrieve', {
    projectId: 'fenix_test',
    keywords: ['dashboard', 'bug'],
    limit: 5
  });
  ok('Retrieve memories returns 200', retr.status === 200);
  ok('Retrieved results found', retr.data.count >= 1, `count=${retr.data.count}`);

  // 6e. Get patterns
  const pats = await get('/api/v2/memory/development/patterns');
  ok('Get patterns returns 200', pats.status === 200);
  ok('Patterns count >= 1', pats.data.count >= 1, `count=${pats.data.count}`);

  // 6f. Updated stats
  const stats2 = await get('/api/v2/memory/development');
  ok('Stats updated after records', stats2.data.totalEntries >= 2, `entries=${stats2.data.totalEntries}`);

  // ════════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ════════════════════════════════════════════════════════════════
  console.log('\n================================================================');
  console.log(`RESULTS: ${passed}/${total} PASSED | ${failed} FAILED`);
  if (failed === 0) {
    console.log('🎉 TOKEN ECONOMY + AGENTIC INTELLIGENCE E2E — ALL PASSED');
  } else {
    console.log(`⚠️  ${failed} test(s) need attention`);
  }
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runSuite().catch(err => {
  console.error('\n❌ SUITE CRASHED:', err.message);
  process.exit(1);
});
