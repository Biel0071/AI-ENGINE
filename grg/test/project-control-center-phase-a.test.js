'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '../public');

test('Project Control Center (Phase A) - Backend Routes and UI Capabilities', async (t) => {
  // 1. Setup a test TCP port for live service-status verification
  const testTcpServer = net.createServer((socket) => {
    socket.on('error', () => {});
    socket.write('OK');
    socket.end();
  });
  testTcpServer.on('error', () => {});
  await new Promise((resolve) => testTcpServer.listen(0, '127.0.0.1', resolve));
  const livePort = testTcpServer.address().port;

  // 2. Setup Express backend with REAL production project workspace routes
  const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  let appState = {
    projects: [
      {
        id: 'proj-local-active',
        name: 'Sistema Local Ativo',
        catalogId: 'local-active',
        source: 'LOCAL_PROJECT_CATALOG',
        workspace: path.resolve(__dirname, '..'),
        workspaceAvailable: true,
        catalogGroup: 'Fênix & Core',
        versionRole: 'Principal',
        localPort: livePort,
        apiPort: 4410,
        localUrl: `http://127.0.0.1:${livePort}`
      },
      {
        id: 'proj-vps-remote',
        name: 'CRM Nuvem Linux',
        catalogId: 'crm-vps',
        source: 'LOCAL_PROJECT_CATALOG',
        workspace: '/opt/fenix-os/crm',
        workspaceAvailable: false,
        catalogGroup: 'CRM & WhatsApp',
        versionRole: 'Principal',
        repository: 'https://github.com/fenix-org/crm-vps.git',
        remoteUrl: 'https://crm.fenix.cloud',
        localPort: 8080
      }
    ]
  };

  const fakeApp = {
    store: {
      read: async () => JSON.parse(JSON.stringify(appState)),
      write: async (s) => { appState = s; }
    },
    controlPlane: {
      authorize: async () => true
    },
    audit: {
      record: async () => {}
    }
  };

  // Mount real project workspace routes (zero-mock production code)
  app.use(async (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const sendJson = (response, status, payload) => {
      response.status(status).json(payload);
    };
    const readJson = async () => req.body;
    try {
      const handled = await handleProjectWorkspaceRoutes(
        req, res, url, fakeApp, sendJson, readJson, { tenantId: 'grg', actorId: 'test-user' }
      );
      if (handled) return;
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
    next();
  });

  app.get('/api/fenix/projects', (_req, res) => {
    res.json({ projects: appState.projects });
  });

  app.get('/api/fenix/projects/:id/state', (_req, res) => {
    res.json({ progress: { totalJobs: 0, running: 0, completed: 0, failed: 0 } });
  });

  app.get('/api/fenix/projects/:id/git', (_req, res) => res.json({ branch: 'main', clean: true }));
  app.get('/api/fenix/projects/:id/git/connection', (_req, res) => res.json({ supported: false }));
  app.get('/api/fenix/projects/:id/tree', (_req, res) => res.json({ tree: [] }));

  app.get('/api/v2/projects/catalog-status', (_req, res) => {
    res.json({
      projects: {
        'local-active': { online: true, port: livePort, latencyMs: 3 },
        'proj-local-active': { online: true, port: livePort, latencyMs: 3 }
      }
    });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const serverPort = server.address().port;

  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    testTcpServer.closeAllConnections?.();
    await new Promise((resolve) => testTcpServer.close(resolve));
  });

  // Launch Playwright
  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(8000);

  // 3. Navigate to Project Hub
  await page.goto(`http://127.0.0.1:${serverPort}/index.html#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('#flpCards .flp-card').first().waitFor();

  // Test 1: Cards rendered with Origin and Access pills
  const cards = page.locator('#flpCards .flp-card');
  assert.equal(await cards.count(), 2, 'Two projects rendered in catalog');

  const cardTitles = await page.locator('.flp-card-title').allTextContents();
  assert.ok(cardTitles.includes('Sistema Local Ativo'));
  assert.ok(cardTitles.includes('CRM Nuvem Linux'));

  // Test 2: Unavailable path display and Path Recovery Card
  const remoteCard = page.locator('.flp-card[data-project-id="proj-vps-remote"]');
  await remoteCard.click();

  // Switch to files tab
  const filesTab = page.locator('button[data-workspace-tab="files"]');
  await filesTab.click();

  // Verify honest absence string preserved
  await page.locator('text=O caminho deste projeto não está disponível neste computador.').waitFor();

  // Verify Path Recovery card exists
  const recoveryCard = page.locator('.flp-path-recovery-card');
  assert.equal(await recoveryCard.count(), 1, 'Path recovery card rendered for unavailable project');
  assert.match(await recoveryCard.innerText(), /Central de Descoberta & Recuperação de Workspace/);
  assert.match(await recoveryCard.innerText(), /VPS remota Linux/);
  assert.match(await recoveryCard.innerText(), /Repositório Git Disponível/);

  // Test 3: Bind Local Folder interaction
  const tempDir = fs.mkdtempSync(path.join(path.resolve(__dirname, '..'), 'test-bind-'));
  try {
    const bindInput = recoveryCard.locator('input[type="text"]');
    await bindInput.fill(tempDir);
    const bindBtn = recoveryCard.getByRole('button', { name: /Vincular Pasta/ });
    await bindBtn.click();

    // Verify workspace becomes available
    await page.waitForFunction(() => {
      const summary = document.querySelector('.flp-file-browser-head small');
      return summary && !summary.textContent.includes('/opt/fenix-os/crm');
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // Test 4: Ports & Services Tab
  await page.locator('.flp-card[data-project-id="proj-local-active"]').click();
  const portsTab = page.locator('#flpDetail button[data-workspace-tab="ports"]');
  await portsTab.waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await portsTab.click();

  // Verify ports manager panel renders
  const portsPanel = page.locator('.flp-ports-manager-panel');
  await portsPanel.waitFor();
  assert.match(await portsPanel.innerText(), /Gerenciador de Portas, URLs & Serviços/);

  // Verify port cards and table
  assert.match(await portsPanel.innerText(), new RegExp(`:${livePort}`));
  const portsTable = portsPanel.locator('.flp-ports-table');
  assert.equal(await portsTable.count(), 1, 'Ports table rendered');

  // Test 5: Scan Ports button triggers real service-status probe
  const scanBtn = portsPanel.getByRole('button', { name: /Retestar Portas Agora/ });
  await scanBtn.click();
  await page.waitForFunction(() => {
    return document.querySelector('.flp-ports-manager-panel')?.textContent.includes('ONLINE');
  });

  // Test 6: Layout Uncrowding, Toggles & List/Grid Mode
  const fullGridBtn = page.locator('#flpFullLauncherGridBtn');
  await fullGridBtn.click();
  assert.equal(await page.locator('.flp-body').getAttribute('data-full-launcher'), 'true');

  // Toggle detail focus
  await fullGridBtn.click(); // revert full launcher
  const focusBtn = page.getByRole('button', { name: /Foco/ });
  await focusBtn.click();
  assert.equal(await page.locator('.flp-body').getAttribute('data-detail-focus'), 'true');

  // Restore two-column view
  const restoreBtn = page.getByRole('button', { name: /Ver Grade/ });
  await restoreBtn.click();
  assert.equal(await page.locator('.flp-body').getAttribute('data-detail-focus'), 'false');

  // Toggle List layout vs Grid layout
  const listLayoutBtn = page.locator('button[data-project-layout="list"]');
  await listLayoutBtn.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-layout'), 'list');

  const gridLayoutBtn = page.locator('button[data-project-layout="grid"]');
  await gridLayoutBtn.click();
  assert.equal(await page.locator('#flpCards').getAttribute('data-layout'), 'grid');

  // Test 7: Navigation Scopes filtering
  const localScopeBtn = page.locator('button[data-project-scope="local"]');
  await localScopeBtn.click();
  assert.equal(await page.locator('#flpCards .flp-card').count(), 1, 'Local scope filters to 1 project');
  assert.match(await page.locator('#flpCards .flp-card').innerText(), /Sistema Local Ativo/);

  const remoteScopeBtn = page.locator('button[data-project-scope="remote"]');
  await remoteScopeBtn.click();
  assert.equal(await page.locator('#flpCards .flp-card').count(), 1, 'Remote scope filters to 1 project');
  assert.match(await page.locator('#flpCards .flp-card').innerText(), /CRM Nuvem Linux/);

  const allScopeBtn = page.locator('button[data-project-scope="all"]');
  await allScopeBtn.click();
  assert.equal(await page.locator('#flpCards .flp-card').count(), 2, 'All scope restores both projects');

  // Test 8: Zero horizontal overflow at 1440px and 1920px
  for (const width of [1440, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= width + 1, `Zero horizontal overflow at ${width}px (measured ${scrollWidth})`);
  }
});
