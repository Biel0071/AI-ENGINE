'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PUBLIC = path.resolve(__dirname, '../public');
const ARTIFACT_DIR = path.resolve(
  process.env.USERPROFILE || 'C:\\Users\\Dell',
  '.gemini/antigravity/brain/7a8ad23c-1ef2-444e-80e2-30f2f87f38fe/api-platform-verification'
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname = url.pathname;
  if (pathname === '/' || pathname === '/login') pathname = '/login.html';
  if (pathname === '/app') pathname = '/index.html';

  if (pathname === '/api/login') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ token: 'test_token_ok', user: { id: 'grg-admin', role: 'admin' } }));
  }
  if (pathname === '/api/me' || pathname === '/api/runtime' || pathname === '/api/system/boot-status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, status: 'KERNEL_ACTIVE', token: 'test_token_ok' }));
  }

  // Projects list
  if (pathname === '/api/fenix/projects' || pathname === '/api/v2/projects') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      projects: [
        { id: 'api-platform', name: 'API Platform', description: 'Plataforma Corporativa de APIs', path: 'c:/projetos/ai-engine-core/ai-engine', branch: 'main' },
        { id: 'fenix-os', name: 'Fênix OS Core', description: 'Núcleo do Sistema Operacional', path: 'c:/projetos/ai-engine-core', branch: 'master' },
        { id: 'zapai-crm', name: 'ZapAI CRM', description: 'Plataforma de Mensageria', path: 'c:/projetos/zapai', branch: 'main' }
      ]
    }));
  }

  // Workspace Tree
  if (pathname.includes('/tree')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      tree: [
        {
          name: 'src',
          path: 'src',
          type: 'directory',
          children: [
            { name: 'server.js', path: 'src/server.js', type: 'file' },
            { name: 'routes.js', path: 'src/routes.js', type: 'file' },
            { name: 'config.js', path: 'src/config.js', type: 'file' }
          ]
        },
        {
          name: 'test',
          path: 'test',
          type: 'directory',
          children: [
            { name: 'server.test.js', path: 'test/server.test.js', type: 'file' }
          ]
        },
        { name: 'package.json', path: 'package.json', type: 'file' },
        { name: 'README.md', path: 'README.md', type: 'file' }
      ]
    }));
  }

  // Workspace File Content
  if (pathname.includes('/file')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      path: 'src/server.js',
      hash: 'sha256-v15-hash-4921',
      content: `// Fênix OS — API Platform Unified Server\nconst fastify = require('fastify')({ logger: true });\nconst { authenticate } = require('./auth');\n\n// Fast Lane Live Endpoint\nfastify.get('/api/health', async (req, reply) => {\n  return { status: 'ONLINE', uptime: process.uptime(), latencyMs: 4.2 };\n});\n\nfastify.post('/api/inference', async (req, reply) => {\n  const { prompt, model } = req.body;\n  return { reply: 'Fênix Kernel v15 ready.', tokens: 42 };\n});\n\nmodule.exports = fastify;`
    }));
  }

  // Workspace Run Tests
  if (pathname === '/api/v2/workspace/run-tests') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      passed: true,
      durationMs: 380,
      totalChecks: 43,
      passedChecks: 43,
      output: '[ArchitectureGuard] 5/5 PASSED\n[FrontendHonesty] 19/19 PASSED (Zero-Mock Invariants)\n[RuntimeSafety] 5/5 PASSED\n[ProjectMirror] 8/8 PASSED\n[WorkspaceUnifiedV15] 6/6 PASSED\n\nTOTAL: 43/43 CHECKS VERIFIED 100% GREEN'
    }));
  }

  // Workspace Git Status
  if (pathname.includes('/git')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      branch: 'main',
      head: 'b7c8d9e',
      modified: ['src/server.js', 'src/routes.js'],
      untracked: []
    }));
  }

  if (pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, data: [] }));
  }

  const filePath = path.join(PUBLIC, pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const PORT = 55562;

async function run() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  console.log(`[QA V15] Server listening on http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: '14_fenix_workspace_v15_1920x1080.png', width: 1920, height: 1080, mode: 'split' },
    { name: '15_fenix_workspace_v15_1440x900.png', width: 1440, height: 900, mode: 'split' },
    { name: '16_fenix_workspace_v15_1024x768.png', width: 1024, height: 768, mode: 'code' },
    { name: '17_fenix_workspace_v15_390x844.png', width: 390, height: 844, mode: 'code' }
  ];

  for (const vp of viewports) {
    console.log(`[QA V15] Capturing ${vp.width}x${vp.height} (${vp.mode}) -> ${vp.name}...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });

    await context.addInitScript(() => {
      try {
        localStorage.setItem('grg_token', 'test_token_ok');
        localStorage.setItem('fenix_token', 'test_token_ok');
        localStorage.setItem('grg_user', 'grg-admin');
        localStorage.setItem('grg_remember', '1');
        localStorage.setItem('fenix_sidebar_state', 'open');
        localStorage.setItem('fenix_sidebar_docked', 'true');
      } catch (_) {}
    });

    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/app#ide`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Setup interface
    await page.evaluate(async (targetMode) => {
      if (typeof window.showView === 'function') window.showView('ide');
      if (typeof window.loadIdeView === 'function') await window.loadIdeView();

      if (typeof window.fenixSelectIdeFile === 'function') {
        await window.fenixSelectIdeFile('src/server.js').catch(() => {});
      }

      if (typeof window.fenixSetIdeMode === 'function') {
        window.fenixSetIdeMode(targetMode);
      }

      // Ensure Mascot Copilot Sidebar is open & docked
      const sb = document.getElementById('fenix-right-sidebar');
      if (sb && !sb.classList.contains('open')) sb.classList.add('open');
      document.body.classList.add('has-right-sidebar-open', 'fsb-docked');

      // Update Copilot Context
      if (window.fenixCopilot) {
        window.fenixCopilot.updateContext({
          project: 'API-PLATFORM',
          file: 'src/server.js',
          mode: targetMode,
          agent: 'Alex (API Platform Lead)'
        });

        // Show diff proposal
        if (typeof window.fenixCopilot.showDiff === 'function') {
          window.fenixCopilot.showDiff(`@@ -6,4 +6,5 @@
 fastify.get('/api/health', async (req, reply) => {
+  // Fast Lane telemetry heartbeat probe
   return { status: 'ONLINE', uptime: process.uptime() };`);
        }
      }
    }, vp.mode);

    await page.waitForTimeout(2000);

    const outPath = path.join(ARTIFACT_DIR, vp.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`[QA V15] Successfully Saved ${vp.name} (${fs.statSync(outPath).size} bytes)`);

    await context.close();
  }

  await browser.close();
  await new Promise(r => server.close(r));
  console.log('[QA V15] All 4 captures completed cleanly.');
  process.exit(0);
}

run().catch(err => {
  console.error('[QA V15] Error during execution:', err);
  process.exit(1);
});
