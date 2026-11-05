const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'public', 'operations-live.js');

function loadHelpers({ api, fetch, token = '', safeFetchJson }) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const exportForTest = source.replace(
    '  window.loadLiveOperations = load;',
    '  window.__operationsLiveHelpers = { getJson, postJson, escapeHtml };\n  window.loadLiveOperations = load;'
  );
  assert.notEqual(exportForTest, source, 'operations-live helper export point must exist');

  const window = {
    FENIX: { api },
    safeFetchJson,
    localStorage: { getItem: (key) => key === 'grg_token' ? token : null },
  };
  const view = { dataset: { liveOperations: 'true' }, classList: { contains: () => false } };
  vm.runInNewContext(exportForTest, {
    window,
    document: { getElementById: () => view },
    fetch,
    AbortSignal,
  }, { filename: sourcePath });
  return window.__operationsLiveHelpers;
}

test('operations encode untrusted job and provider text before inserting HTML', () => {
  const helpers = loadHelpers({ fetch: async () => ({ ok: true, json: async () => ({}) }) });
  assert.equal(helpers.escapeHtml('<img src=x onerror=alert(1)> & "job"'), '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;job&quot;');

  const source = fs.readFileSync(sourcePath, 'utf8');
  const start = source.indexOf('    const tokens = Number(job.tokens');
  const end = source.indexOf('    copyBtn.onclick =', start);
  assert.ok(start >= 0 && end > start, 'job inspector output block must exist');
  const inspector = source.slice(start, end);
  for (const expression of [
    'escapeHtml(job.type', 'escapeHtml(job.projectId', 'escapeHtml(job.agentName',
    'escapeHtml(job.createdAt', 'escapeHtml(job.updatedAt', 'escapeHtml(typeof (job.error',
    'escapeHtml(job.progress', 'escapeHtml(JSON.stringify(job.payload',
    'escapeHtml(typeof (job.output', 'escapeHtml(typeof l ===',
  ]) assert.ok(inspector.includes(expression), `job inspector must encode ${expression} before HTML insertion`);
});

test('operations use the canonical authenticated JSON client when available', async () => {
  const safeFetchCalls = [];
  let fetchCalls = 0;
  const helpers = loadHelpers({
    api: async () => { throw new Error('stale bearer client must not be used'); },
    safeFetchJson: async (...args) => {
      safeFetchCalls.push(args);
      return { ok: true, status: 200, data: { jobs: [{ id: 'real-job' }] } };
    },
    fetch: async () => { fetchCalls++; throw new Error('raw fetch should not be used'); },
  });

  const response = await helpers.getJson('/api/v2/jobs');

  assert.deepEqual(response, { jobs: [{ id: 'real-job' }] });
  assert.equal(fetchCalls, 0);
  assert.equal(safeFetchCalls.length, 1);
  assert.equal(safeFetchCalls[0][0], '/api/v2/jobs');
  assert.equal(safeFetchCalls[0][1].credentials, 'same-origin');
  assert.equal(safeFetchCalls[0][2], 60000);
});

test('operations GET requests prefer the same-origin session cookie', async () => {
  const calls = [];
  let apiCalls = 0;
  const helpers = loadHelpers({
    api: async () => { apiCalls++; throw new Error('stale bearer client must not be used'); },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ jobs: [] }) }; },
  });

  const response = await helpers.getJson('/api/v2/jobs');

  assert.deepEqual(response, { jobs: [] });
  assert.equal(calls.length, 1);
  assert.equal(apiCalls, 0);
  assert.equal(calls[0].url, '/api/v2/jobs');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test('operations POST requests prefer the same-origin session cookie', async () => {
  const calls = [];
  let apiCalls = 0;
  const helpers = loadHelpers({
    api: async () => { apiCalls++; throw new Error('stale bearer client must not be used'); },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ accepted: true }) }; },
  });
  const body = { feature: 'real-runtime' };

  const response = await helpers.postJson('/api/v2/engineering/reciprocity/verify', body);

  assert.deepEqual(response, { accepted: true });
  assert.equal(calls.length, 1);
  assert.equal(apiCalls, 0);
  assert.equal(calls[0].url, '/api/v2/engineering/reciprocity/verify');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, JSON.stringify(body));
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test('operations retry with the existing bearer only when the cookie is rejected', async () => {
  const calls = [];
  const helpers = loadHelpers({
    api: async () => { throw new Error('canonical helper should not be used'); },
    token: 'existing-session-token',
    fetch: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? { ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) }
        : { ok: true, json: async () => ({ jobs: [] }) };
    },
  });

  await helpers.getJson('/api/v2/jobs');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer existing-session-token');
});

test('operations also retry the canonical JSON client with bearer only after cookie rejection', async () => {
  const calls = [];
  const helpers = loadHelpers({
    token: 'existing-session-token',
    safeFetchJson: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1
        ? { ok: false, status: 401, error: 'Unauthorized' }
        : { ok: true, status: 200, data: { jobs: [] } };
    },
    fetch: async () => { throw new Error('raw fetch should not be used'); },
  });

  assert.deepEqual(await helpers.getJson('/api/v2/jobs'), { jobs: [] });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer existing-session-token');
});
