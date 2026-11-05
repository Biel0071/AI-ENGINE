const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const browserPath = process.env.FENIX_QA_CHROMIUM_PATH || [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find(candidate => fs.existsSync(candidate));

test('navigation QA records an initial load timeout and exits cleanly', { skip: !browserPath }, async () => {
  const timers = new Set();
  const server = http.createServer((_req, res) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<title>slow fixture</title>');
    }, 3000);
    timers.add(timer);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-navigation-qa-'));
  try {
    const childResult = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/frontend-navigation-qa.js', '--fast'], {
        cwd: root,
        env: {
          ...process.env,
          FENIX_QA_CHROMIUM_PATH: browserPath || '',
          FENIX_URL: `http://127.0.0.1:${server.address().port}/app`,
          FENIX_QA_NAV_TIMEOUT: '700',
          FENIX_QA_OUT: outputDir,
          FENIX_QA_USE_SESSION_FILE: '0',
          FENIX_TOKEN: '',
          FENIX_USER: '',
          FENIX_PASSWORD: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
      child.on('error', reject);
      child.on('exit', (code, signal) => resolve({ code, signal, stderr }));
      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error('navigation QA did not exit after the initial load timeout'));
      }, 15000);
      child.once('exit', () => clearTimeout(timeout));
    });

    assert.equal(childResult.code, 2, childResult.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(outputDir, 'frontend-navigation-qa.json'), 'utf8'));
    assert.equal(report.blocked.component, 'navigation');
    assert.equal(report.summary.navTotal, 0);
  } finally {
    for (const timer of timers) clearTimeout(timer);
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
});
