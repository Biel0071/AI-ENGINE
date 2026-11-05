'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

test('Project Hub opens a local catalog project and its Screen DNA panel without starting it', async (t) => {
  const app = express();
  app.get('/projects-fixture', (_req, res) => res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/project-hub-live.css"><link rel="stylesheet" href="/fenix-hig-system.css"><main id="view-projects"></main><script src="/project-hub-live.js"></script>'));
  app.use(express.static(path.resolve(__dirname, '..', 'public')));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  let browser;
  t.after(async () => {
    await browser?.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({ headless: true, executablePath: process.env.FENIX_QA_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(5000);
  const errors = [];
  const requestedPaths = [];
  await page.addInitScript(() => {
    window.__ideCalls = [];
    window.showView = (view) => window.__ideCalls.push({ view });
    window.fenixSelectIdeProject = async (projectId) => window.__ideCalls.push({ projectId });
    window.fenixSelectIdeFile = async (filePath) => window.__ideCalls.push({ filePath });
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    requestedPaths.push(url.pathname);
    if (url.pathname.endsWith('/logo')) {
      await route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/8ioAAAAASUVORK5CYII=', 'base64') });
      return;
    }
    let body = {};
    if (url.pathname === '/api/fenix/projects') body = { projects: [
      { id: 'registered', name: 'Project Kernel', workspace: 'C:/workspace/registered', status: 'ACTIVE', vpsPath: '/opt/fenix-os', productionPath: '/opt/fenix-os/grg', frontend: { framework: 'Vanilla', path: '/opt/fenix-os/public', port: 3000, entry: 'index.html' }, backend: { runtime: 'Node.js', path: '/opt/fenix-os/grg/src', port: 4410, pm2Name: 'fenix-backend' }, deployment: { bindings: [{ label: 'Acesso público', address: '209.50.241.22', port: 443, target: 'OpenResty → frontend-gateway:3000', url: 'https://209.50.241.22/app', status: 'HTTP_200', observedAt: '2026-10-21T14:31:25Z' }, { label: 'Acesso direto', address: '209.50.241.22', port: 3000, target: 'frontend-gateway', url: 'http://209.50.241.22:3000/app', status: 'HTTP_200', observedAt: '2026-10-21T14:31:25Z' }] } },
      { id: 'crm-local-vps', name: 'CRM Local (VPS)', aliases: ['crm'], workspace: '/opt/crm-local', frontend: { port: 1000 }, backend: { port: 4025 }, deployment: { bindings: [{ label: 'Frontend VPS', address: '209.50.241.22', port: 1000, target: 'OpenResty → CRM', url: 'https://209.50.241.22:1000/', status: 'HTTP_200', observedAt: '2026-10-21T14:31:25Z' }] } },
      { id: 'local-crm', catalogId: 'crm', name: 'CRM Local', workspace: 'C:/projetos/crm', source: 'LOCAL_PROJECT_CATALOG', workspaceAvailable: true, catalogGroup: 'CRM', versionRole: 'Principal', projectVersion: '1.4.2', mode: 'web', localPort: 8180, apiPort: 4200, localUrl: 'http://127.0.0.1:8180', healthUrl: 'http://127.0.0.1:4200/health', remoteUrl: 'https://example.test/crm', logoUrl: '/api/fenix/projects/local-crm/logo' },
      { id: 'local-crm-qa', catalogId: 'crm-qa', name: 'CRM Local QA', workspace: 'C:/projetos/crm-qa', source: 'LOCAL_PROJECT_CATALOG', workspaceAvailable: true, catalogGroup: 'CRM', versionRole: 'Cópia/variante', projectVersion: '1.4.3-rc.1', localPort: 8183 },
    ] };
    if (url.pathname === '/api/v2/company/projects/local-crm/absorption') body = { projectId: 'local-crm', screens: [{ screenId: 'crm-dashboard', name: 'CRM Dashboard', route: '/dashboard', sourceFile: 'src/pages/Dashboard.tsx', captureStatus: 'NOT_CAPTURED', source: 'PROJECT_ABSORPTION' }] };
    if (url.pathname.endsWith('/state')) body = url.pathname.includes('/local-crm/') ? {} : { progress: { totalJobs: 0, running: 0, failed: 0 }, artifacts: [], missions: [] };
    if (url.pathname.endsWith('/git')) body = { branch: 'main', clean: true };
    if (url.pathname.endsWith('/git/connection')) body = { connected: false };
    if (url.pathname.endsWith('/tree')) body = { tree: [
      { name: 'src', path: 'src', type: 'directory', children: [{ name: 'app.js', path: 'src/app.js', type: 'file' }] },
      { name: 'index.html', path: 'index.html', type: 'file' },
    ] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto(`http://127.0.0.1:${server.address().port}/projects-fixture#projects`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'MEUS PROJETOS' }).waitFor();
  await page.getByRole('button', { name: /Project Kernel/ }).click();
  assert.match(await page.locator('#flpCards').innerText(), /VPS: 443 · UI: 3000 · API: 4410/);
  const registeredDetail = page.locator('#flpDetail');
  await registeredDetail.getByText('Não medido', { exact: true }).first().waitFor();
  assert.equal(await registeredDetail.getByText('100% (Operacional)', { exact: true }).count(), 0, 'registered status does not masquerade as a health measurement');
  await registeredDetail.getByText('Runtime cadastrado', { exact: true }).click();
  await registeredDetail.getByText('UI: 3000 · API: 4410', { exact: true }).waitFor();
  await registeredDetail.getByText(/PM2: fenix-backend/).waitFor();
  await registeredDetail.getByText('Portas cadastradas · listener e health não verificados', { exact: true }).waitFor();
  await registeredDetail.getByText('Portas e rotas mapeadas na VPS', { exact: true }).waitFor();
  await registeredDetail.getByText('Registro histórico: HTTP_200 · 2026-10-21T14:31:25Z', { exact: true }).first().waitFor();
  assert.equal(await registeredDetail.getByRole('link', { name: 'http://209.50.241.22:3000/app' }).getAttribute('href'), 'http://209.50.241.22:3000/app');
  const bindingEvidenceDirectory = path.resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-21');
  fs.mkdirSync(bindingEvidenceDirectory, { recursive: true });
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const bindingLayout = await page.locator('.flp-vps-binding-list').evaluate((node) => ({
      width: node.clientWidth,
      scrollWidth: node.scrollWidth,
      cardsFit: [...node.children].every((card) => {
        const bounds = card.getBoundingClientRect();
        const parent = node.getBoundingClientRect();
        return bounds.left >= parent.left - 1 && bounds.right <= parent.right + 1;
      }),
    }));
    assert.ok(bindingLayout.scrollWidth <= bindingLayout.width + 1 && bindingLayout.cardsFit, `VPS binding map overflows at ${width}px: ${JSON.stringify(bindingLayout)}`);
    await page.screenshot({ path: path.join(bindingEvidenceDirectory, `project-vps-bindings-${width}-after.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'MEUS PROJETOS' }).click();
  await page.locator('.flp-card[data-project-id="local-crm"]').waitFor();
  assert.equal(await page.locator('.flp-body').getAttribute('data-project-source'), 'local');
  assert.deepEqual(await page.locator('.flp-metrics > div > span').allTextContents(), ['Projetos no catálogo local', 'Pastas disponíveis', 'URLs locais configuradas', 'Logos cadastrados']);
  const localGalleryLayout = await page.locator('#flpCards').evaluate((node) => getComputedStyle(node).display);
  assert.equal(localGalleryLayout, 'grid', 'local catalog is presented as a visual launcher grid');
  await page.getByText('main', { exact: true }).waitFor();
  await page.getByText('Portas e versões do projeto', { exact: true }).click();
  await page.locator('#flpDetail').getByText('PC local · UI: 8180 · PC local · API: 4200', { exact: true }).waitFor();
  await page.locator('#flpDetail').getByText('1.4.2', { exact: true }).waitFor();
  await page.locator('#flpDetail').getByText('Portas configuradas no host do catálogo · disponibilidade não verificada', { exact: true }).waitFor();
  assert.ok(requestedPaths.includes('/api/fenix/projects/local-crm/git'), 'the selected local workspace receives a read-only Git inspection');
  const evidenceDirectory = path.resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-21');
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const recoveryControls = await page.locator('.flp-project-recovery-controls').evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      return { clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, buttonsFit: [...node.querySelectorAll('button')].every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      }) };
    });
    assert.ok(recoveryControls.scrollWidth <= recoveryControls.clientWidth + 1 && recoveryControls.buttonsFit, `project recovery controls overflow at ${width}px: ${JSON.stringify(recoveryControls)}`);
    const runtimeLayout = await page.evaluate(() => {
      const grid = document.querySelector('.flp-project-runtime-grid');
      const detail = document.querySelector('#flpDetail');
      const gridRect = grid.getBoundingClientRect();
      const itemsFit = [...grid.children].every((item) => {
        const rect = item.getBoundingClientRect();
        return rect.left >= gridRect.left - 1 && rect.right <= gridRect.right + 1;
      });
      return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, detailWidth: detail.scrollWidth, detailClient: detail.clientWidth, itemsFit };
    });
    assert.ok(runtimeLayout.documentWidth <= width + 1, `runtime panel overflows the page at ${width}px: ${JSON.stringify(runtimeLayout)}`);
    assert.ok(runtimeLayout.detailWidth <= runtimeLayout.detailClient + 1, `runtime panel overflows detail at ${width}px: ${JSON.stringify(runtimeLayout)}`);
    assert.equal(runtimeLayout.itemsFit, true, `runtime facts escape their grid at ${width}px`);
    await page.screenshot({ path: path.join(evidenceDirectory, `project-runtime-${width}-after.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const localCard = page.locator('.flp-card[data-project-id="local-crm"]');
  await localCard.getByText('Pasta disponível · selecione para abrir', { exact: true }).waitFor();
  await localCard.locator('.flp-card-logo img').waitFor({ state: 'visible' });
  assert.match(await localCard.locator('.flp-card-logo img').getAttribute('src'), /\/api\/fenix\/projects\/local-crm\/logo$/);
  assert.equal(await localCard.locator('.flp-card-version').innerText(), 'v1.4.2');
  assert.equal(await localCard.getByText(/0 job\(s\).*0 tela\(s\) DNA/).count(), 0, 'the card does not imply zero measured jobs/screens while project state has no counters');
  const workspaceNavigation = page.locator('.flp-ws-nav');
  const workspaceNavigationLayout = await workspaceNavigation.evaluate((node) => ({ height: node.clientHeight, contentHeight: node.scrollHeight, overflowX: getComputedStyle(node).overflowX }));
  assert.ok(workspaceNavigationLayout.contentHeight <= 58, `workspace tabs wrap into multiple rows: ${JSON.stringify(workspaceNavigationLayout)}`);
  assert.equal(workspaceNavigationLayout.overflowX, 'auto');
  assert.equal(await page.locator('.flp-facts .flp-fact').filter({ hasText: 'Grupo' }).count(), 1, 'the catalog group appears once in project facts');
  const localFacts = page.locator('.flp-facts .flp-fact');
  assert.equal(await localFacts.count(), 6, 'the summary shows catalog fields, unmeasured health, and measured Screen DNA');
  const projectFamily = page.getByRole('region', { name: 'Projetos da família CRM' });
  await projectFamily.getByRole('button', { name: /CRM Local QA.*Cópia\/variante/ }).waitFor();
  const vpsCounterpart = page.getByRole('region', { name: 'Projeto correspondente na VPS' });
  await vpsCounterpart.getByText('CRM Local (VPS)', { exact: true }).waitFor();
  await vpsCounterpart.getByText('209.50.241.22:1000 → OpenResty → CRM', { exact: true }).waitFor();
  assert.match((await localFacts.allTextContents()).join(' '), /Status\s*Workspace disponível/);
  assert.match((await localFacts.allTextContents()).join(' '), /Health\s*Não medido/);
  assert.match((await localFacts.allTextContents()).join(' '), /Telas \(Screen DNA\)\s*5 tela\(s\)/);
  assert.equal(await page.locator('.flp-job-counts').count(), 0, 'unknown execution counters are not rendered as zero');
  await page.getByText('Métricas de execução ainda não mapeadas.', { exact: true }).waitFor();
  await page.getByText('Estado dos artefatos ainda não mapeado.', { exact: true }).waitFor();
  const unmapped = page.locator('.flp-unmapped-facts');
  assert.equal(await unmapped.locator('summary').innerText(), 'Dados ainda não mapeados (9)');
  assert.equal(await unmapped.getAttribute('open'), null);
  assert.equal(await unmapped.locator('.flp-unmapped-fact').count(), 9);
  const actionMenu = page.locator('.flp-project-actions-menu');
  assert.equal(await actionMenu.getAttribute('open'), null);
  assert.equal(await page.getByRole('button', { name: 'Abrir Workspace', exact: true }).isVisible(), true);
  assert.equal(await page.getByRole('button', { name: 'Screen DNA', exact: true }).isVisible(), true);
  await page.getByRole('button', { name: 'Abrir Workspace', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.__ideCalls.slice(-2)), [{ view: 'ide' }, { projectId: 'local-crm' }]);
  await page.setViewportSize({ width: 375, height: 812 });
  await workspaceNavigation.getByRole('button', { name: 'Arquivos', exact: true }).click();
  await page.getByText('2 arquivos visíveis · listagem limitada a 3 níveis por segurança', { exact: true }).waitFor();
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const activeTabBounds = await page.locator('.flp-ws-tab.active').evaluate((node) => {
      const tab = node.getBoundingClientRect();
      const nav = node.parentElement.getBoundingClientRect();
      return { left: tab.left, right: tab.right, navLeft: nav.left, navRight: nav.right };
    });
    assert.ok(activeTabBounds.left >= activeTabBounds.navLeft - 1 && activeTabBounds.right <= activeTabBounds.navRight + 1, `active workspace tab is clipped at ${width}px: ${JSON.stringify(activeTabBounds)}`);
    const treeLayout = await page.locator('.flp-file-browser-tree').evaluate((node) => ({ width: node.clientWidth, scrollWidth: node.scrollWidth }));
    assert.ok(treeLayout.scrollWidth <= treeLayout.width + 1, `file tree overflows at ${width}px: ${JSON.stringify(treeLayout)}`);
    const pageLayout = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    assert.ok(pageLayout.document <= pageLayout.viewport + 1, `project screen overflows at ${width}px: ${JSON.stringify(pageLayout)}`);
    const detailLayout = await page.locator('.flp-detail').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert.ok(detailLayout.scroll <= detailLayout.client + 1, `project detail overflows at ${width}px: ${JSON.stringify(detailLayout)}`);
    await page.screenshot({ path: path.join(evidenceDirectory, `projects-local-file-tree-${width}-after.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'app.js', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.__ideCalls.slice(-3)), [
    { view: 'ide' }, { projectId: 'local-crm' }, { filePath: 'src/app.js' },
  ]);
  await actionMenu.locator('summary').click();
  assert.equal(await page.getByRole('button', { name: 'Mapear Sistema', exact: true }).isVisible(), true);
  await actionMenu.locator('summary').click();
  const evidencePath = path.resolve(__dirname, '..', 'docs', 'visual-evidence', '2026-10-21', 'projects-local-card-clarity-1280-after.png');
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  await page.screenshot({ path: evidencePath, fullPage: true });
  await unmapped.locator('summary').click();
  assert.equal(await unmapped.getByText('Health · Ainda não mapeado', { exact: true }).count(), 0);
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator('.flp-detail').evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth }));
    assert.ok(layout.scroll <= layout.client + 1, `local project detail overflows at ${width}px: ${JSON.stringify(layout)}`);
    const lastTab = workspaceNavigation.locator('.flp-ws-tab').last();
    await workspaceNavigation.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    const lastTabVisible = await lastTab.evaluate((node) => {
      const tab = node.getBoundingClientRect();
      const nav = node.parentElement.getBoundingClientRect();
      return tab.left >= nav.left - 1 && tab.right <= nav.right + 1;
    });
    assert.equal(lastTabVisible, true, `last workspace tab is not reachable at ${width}px`);
    await workspaceNavigation.evaluate((node) => { node.scrollLeft = 0; });
    if (width <= 768) {
      await actionMenu.locator('summary').click();
      const menuFitsViewport = await page.locator('.flp-project-actions-panel').evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth;
      });
      assert.equal(menuFitsViewport, true, `project actions menu escapes the viewport at ${width}px`);
      await actionMenu.locator('summary').click();
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const dna = page.getByRole('button', { name: 'Screen DNA', exact: true });
  assert.equal(await dna.isEnabled(), true);
  await dna.click();
  await page.getByRole('region', { name: 'Telas observadas do projeto CRM Local' }).getByText('CRM Dashboard', { exact: true }).waitFor();
  assert.ok(requestedPaths.includes('/api/v2/company/projects/local-crm/absorption'), 'Screen DNA opens the selected local project using its saved screen map');
  await projectFamily.getByRole('button', { name: /CRM Local QA.*Cópia\/variante/ }).click();
  await page.locator('#flpDetail h2').getByText('CRM Local QA', { exact: true }).waitFor();
  await page.locator('.flp-card[data-project-id="local-crm"]').click();
  await vpsCounterpart.getByRole('button', { name: 'Abrir ficha VPS' }).click();
  await page.locator('#flpDetail h2').getByText('CRM Local (VPS)', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'PROJETOS FÊNIX' }).click();
  await page.locator('.flp-card[data-project-id="registered"]').click();
  await page.locator('h2').getByText('Project Kernel').waitFor();
  assert.deepEqual(errors, []);
});
