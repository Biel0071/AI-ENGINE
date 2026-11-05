const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

test('screen contract probe never sends action requests to endpoints that can mutate state', async () => {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, url: req.url });
    req.resume();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-screen-probe-'));
  const outputPath = path.join(outputDir, 'probe.json');
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/probe-screen-contracts.js'], {
        cwd: root,
        env: {
          ...process.env,
          FENIX_URL: `http://127.0.0.1:${server.address().port}`,
          FENIX_QA_TOKEN: '',
          FENIX_CONTRACT_PROBE_OUT: outputPath,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr || `probe exited ${code}`)));
    });
    void result;

    assert.ok(requests.length > 0, 'probe should exercise GET contracts against the local fixture');
    assert.ok(requests.every(request => request.method === 'GET'), `unexpected mutating request: ${JSON.stringify(requests.filter(request => request.method !== 'GET'))}`);
    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.ok(report.results.some(item => item.endpoint === '/api/dev/terminal'), 'action endpoint remains visible in the audit');
    assert.equal(report.results.find(item => item.endpoint === '/api/dev/terminal').category, 'not-probed-action');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
