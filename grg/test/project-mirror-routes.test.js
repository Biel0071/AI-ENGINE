'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { handleProjectMirrorRoutes, authorizeProjectPath } = require('../src/api/project-mirror-routes');

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-mirror-route-'));
  fs.mkdirSync(path.join(root, 'public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'mirror-route-test' }));
  fs.writeFileSync(path.join(root, 'public', 'index.html'), '<button data-view="command">COMMAND</button><div id="view-command"><button id="sendButton">Send</button></div>');
  return root;
}

async function request(url, root) {
  let output;
  const req = { method: 'GET' };
  const chunks = [];
  const res = {
    writeHead: (status, headers) => { output = { status, headers, body: null }; },
    end: (chunk) => { chunks.push(chunk); if (output) output.rawBody = Buffer.concat(chunks.map((item) => Buffer.isBuffer(item) ? item : Buffer.from(item || ''))); },
  };
  const app = { controlPlane: { authorize: async () => true } };
  const sendJson = (_res, status, body) => { output = { status, body }; };
  await handleProjectMirrorRoutes(req, res, new URL(`${url}${url.includes('?') ? '&' : '?'}path=${encodeURIComponent(root)}`, 'http://localhost'), app, sendJson, async () => ({}), { tenantId: 'grg', actorId: 'admin' });
  return output;
}

test('Project Mirror source endpoint returns real project-relative code and line', async () => {
  const root = project();
  try {
    const result = await request('/api/project-mirror/source?file=public%2Findex.html&line=1', root);
    assert.equal(result.status, 200);
    assert.equal(result.body.file, 'public/index.html');
    assert.match(result.body.content, /sendButton/);
    assert.equal(result.body.line, 1);
    const blocked = await request('/api/project-mirror/source?file=..%2Fsecret.txt', root);
    assert.equal(blocked.status, 400);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Project Mirror rejects projects outside the configured workspace root', () => {
  const workspaceRoot = path.join(os.tmpdir(), 'fenix-authorized-root');
  assert.equal(authorizeProjectPath(path.join(workspaceRoot, 'project'), { fileSystemService: { workspaceRoot } }), path.resolve(workspaceRoot, 'project'));
  assert.throws(() => authorizeProjectPath(path.join(os.tmpdir(), 'outside-project'), { fileSystemService: { workspaceRoot } }), /outside the authorized workspace/);
});

test('Project Mirror screen detail returns repository-aware sources and preview target', async () => {
  const root = project();
  try {
    const result = await request('/api/project-mirror/screen/command', root);
    assert.equal(result.status, 200);
    assert.equal(result.body.screen.previewTarget.path, '/app#command');
    assert.equal(result.body.screen.previewTarget.file, 'public/index.html');
    assert.equal(result.body.screen.sourceFiles[0].file, 'public/index.html');
    assert.ok(result.body.projectId);
    assert.ok(result.body.workspaceId);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Project Mirror preview serves real HTML and rewrites guarded project assets', async () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'public', 'app.js'), 'window.previewLoaded = true;');
  fs.writeFileSync(path.join(root, 'public', 'index.html'), '<script src="app.js"></script><button data-view="command">COMMAND</button>');
  try {
    const result = await request('/api/project-mirror/preview?file=public%2Findex.html', root);
    assert.equal(result.status, 200);
    assert.match(result.rawBody.toString('utf8'), /\/api\/project-mirror\/asset\?path=/);
    assert.match(result.rawBody.toString('utf8'), /file=public%2Fapp\.js/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
