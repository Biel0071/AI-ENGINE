'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { start } = require('../src/server');

test('Project Hub runs REA on the selected workspace, persists its evidence, and opens its Flow Graph', async (t) => {
  const workspace = await fs.mkdtemp(path.join(__dirname, '.tmp-rea-project-'));
  const dataFile = path.join(os.tmpdir(), `fenix-rea-${crypto.randomUUID()}.json`);
  const password = crypto.randomBytes(24).toString('base64url');
  let server;
  let browser;
  t.after(async () => {
    await browser?.close();
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    }
    await fs.rm(workspace, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    await fs.rm(dataFile, { force: true });
  });

  execFileSync('git', ['init', '-b', 'main'], { cwd: workspace, stdio: 'ignore' });
  await fs.mkdir(path.join(workspace, 'src'));
  await fs.mkdir(path.join(workspace, 'public'));
  await fs.writeFile(path.join(workspace, 'package.json'), JSON.stringify({ dependencies: { express: '^5.0.0' } }));
  await fs.writeFile(path.join(workspace, 'src', 'app.js'), "const app = require('express')();\napp.get('/api/rea-fixture', () => 'observed');\n");
  await fs.writeFile(path.join(workspace, 'public', 'index.html'), '<!doctype html><html><body><nav id="fixture-nav"><button id="hero-cta" data-nav="home" onclick="window.showView(\'home\')">Open dashboard</button><button data-nav="settings" onclick="window.showView(\'settings\')">Settings</button></nav><main id="view-home">Dashboard</main><main id="view-settings">Settings</main></body></html>');
  execFileSync('git', ['add', 'package.json', 'src/app.js', 'public/index.html'], { cwd: workspace, stdio: 'ignore' });
  execFileSync('git', ['-c', 'user.email=fenix@test.invalid', '-c', 'user.name=Fenix Test', 'commit', '-m', 'fixture'], { cwd: workspace, stdio: 'ignore' });

  server = await start(0, { dataFile, llm: false, localRuntimeWorker: false, bootstrapAdmin: { tenantId: 'grg', userId: 'rea-ui-admin', password, tenantName: 'REA UI Test', name: 'REA UI Admin', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const loginResponse = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'grg', userId: 'rea-ui-admin', password }) });
  const login = await loginResponse.json();
  const sessionCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
  const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
  const created = await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: 'rea-ui-fixture', name: 'REA UI Fixture', workspace }) });
  assert.equal(created.status, 201);
  // Project Mirror only serves files inside the server's explicit workspace root.
  // The temporary fixture is its sole project, so authorize that exact root here.
  server.app.fileSystemService.workspaceRoot = workspace;
  const fixturePreview = await fetch(`${base}/api/project-mirror/preview?path=${encodeURIComponent(workspace)}&file=${encodeURIComponent('public/index.html')}`, { headers: { cookie: sessionCookie } });
  const fixturePreviewHtml = await fixturePreview.text();
  assert.equal(fixturePreview.status, 200, `the authorized fixture preview should be served: ${fixturePreviewHtml}`);
  assert.match(fixturePreviewHtml, /id="hero-cta"/, 'Project Mirror should serve the real fixture HTML for same-origin inspection');
  const fixtureScreenResponse = await fetch(`${base}/api/project-mirror/screen/home?path=${encodeURIComponent(workspace)}`, { headers: { cookie: sessionCookie } });
  const fixtureScreen = await fixtureScreenResponse.json();
  assert.equal(fixtureScreenResponse.status, 200, `the fixture screen should be discoverable: ${JSON.stringify(fixtureScreen)}`);
  assert.equal(fixtureScreen.screen.previewTarget.file, 'public/index.html');

  const missing = await fetch(`${base}/api/v2/rea/analyze`, { method: 'POST', headers, body: JSON.stringify({ projectId: 'not-in-catalog' }) });
  assert.equal(missing.status, 404, 'unknown project IDs must not silently analyze the default Fênix project');
  server.app.reaIntelligence.evidenceCache.set('unpersisted-tenant-project', { ok: true, projectId: 'unpersisted-tenant-project', evidenceId: 'private-cache' });
  const unpersisted = await fetch(`${base}/api/v2/rea/evidence/unpersisted-tenant-project`, { headers });
  assert.equal(unpersisted.status, 404, 'global process cache must not substitute for tenant-scoped persisted project evidence');
  const direct = await fetch(`${base}/api/v2/rea/analyze`, { method: 'POST', headers, body: JSON.stringify({ projectId: 'rea-ui-fixture' }) }).then((response) => response.json());
  assert.equal(direct.projectId, 'rea-ui-fixture');
  assert.equal(path.resolve(direct.rootPath), path.resolve(workspace));
  assert.ok(direct.routes.some((route) => route.path === '/api/rea-fixture'));
  assert.equal(direct.persistence.status, 'PERSISTED');
  const restored = await fetch(`${base}/api/v2/rea/evidence/rea-ui-fixture`, { headers }).then((response) => response.json());
  assert.equal(restored.evidenceId, direct.evidenceId);
  assert.equal(restored.persistence.status, 'PERSISTED');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const [cookieName, cookieValue] = sessionCookie.split('=', 2);
  await context.addCookies([{ name: cookieName, value: cookieValue, domain: '127.0.0.1', path: '/' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, login.token);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${base}/index.html#projects`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-nav="projects"]').click();
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').waitFor({ state: 'visible' });
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').click();
  await page.locator('[data-workspace-tab="intelligence"]').click();
  await page.getByRole('button', { name: /Analisar com REA|Atualizar análise REA/ }).click();
  await page.locator('.flp-rea-evidence').getByText('PERSISTED', { exact: true }).waitFor({ state: 'visible' });
  await page.locator('[data-workspace-tab="screens"]').click();
  await page.locator('#flpDnaSearch').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('[data-dna-layout="list"]').click();
  assert.equal(await page.locator('.flp-dna-canvas').evaluate((board) => board.classList.contains('is-list')), true);
  await page.locator('#flpDnaSearch').fill('does-not-exist');
  await page.locator('.flp-dna-no-results').waitFor({ state: 'visible' });
  await page.locator('#flpDnaSearch').fill('home');
  await page.locator('.flp-dna-node:not([hidden])').waitFor({ state: 'visible' });
  await page.locator('#flpDnaCaptureFilter').selectOption('unmeasured');
  assert.match(await page.locator('.flp-dna-result-count').textContent(), /de \d+ tela\(s\)/);
  assert.match(await page.evaluate(() => localStorage.getItem('fenix_screen_dna_preferences:rea-ui-fixture')), /"layout":"list"/);
  await page.locator('[data-workspace-tab="overview"]').click();
  await page.locator('[data-workspace-tab="screens"]').click();
  await page.locator('#flpDnaSearch').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-dna-canvas').evaluate((board) => board.classList.contains('is-list')), true, 'layout preference should survive a tab change');
  assert.equal(await page.locator('#flpDnaCaptureFilter').inputValue(), 'unmeasured', 'capture filter should survive a tab change');
  await page.locator('[data-dna-layout="grid"]').click();
  await page.locator('[data-workspace-tab="intelligence"]').click();
  await page.evaluate(() => window.showView('ide'));
  await page.evaluate(async () => { await window.fenixSelectIdeProject('rea-ui-fixture'); await window.fenixSelectIdeFile('src/app.js'); });
  await page.locator('#fenixIdeCodeEditor').waitFor({ state: 'visible' });
  await page.evaluate(() => window.showView('project'));
  await page.waitForFunction(() => [...(document.getElementById('projectSwitcher')?.options || [])].some((option) => option.textContent.includes('·')));
  await page.evaluate((workspacePath) => {
    const select = document.getElementById('projectSwitcher');
    const option = new Option('REA UI FIXTURE · 1 TELA', 'rea-ui-fixture');
    option.dataset.path = workspacePath;
    select.add(option);
    select.value = 'rea-ui-fixture';
  }, workspace);
  await page.locator('#view-project.active').waitFor({ state: 'visible' });
  await page.evaluate(async () => { await window.showScreenDetail('home'); });
  await page.waitForFunction(() => Boolean(document.querySelector('#selectedScreenFrame')?.contentDocument?.querySelector('#hero-cta')), { timeout: 10000 }).catch(async (error) => {
    const preview = await page.evaluate(() => {
      const frame = document.querySelector('#selectedScreenFrame');
      return { src: frame?.src, readyState: frame?.contentDocument?.readyState, body: frame?.contentDocument?.body?.innerText, html: frame?.contentDocument?.body?.innerHTML?.slice(0, 500), panel: document.querySelector('#pmContent')?.textContent?.slice(0, 500) };
    });
    throw new Error(`${error.message}; preview iframe did not load fixture HTML: ${JSON.stringify(preview)}`);
  });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#selectedScreenFrame');
    const bounds = frame?.getBoundingClientRect();
    return Boolean(frame && bounds?.width > 200 && bounds?.height > 120 && getComputedStyle(frame).visibility === 'visible');
  });
  const previewBounds = await page.locator('#selectedScreenFrame').boundingBox();
  assert.ok(previewBounds && previewBounds.width > 200 && previewBounds.height > 120, 'the real project preview must have measurable visible geometry before interaction');
  await page.evaluate(() => document.querySelector('#selectedScreenFrame').contentDocument.querySelector('#hero-cta').click());
  assert.match(await page.locator('#selectedElementContext').textContent(), /#hero-cta\s+Open dashboard/,
    'clicking a real same-origin project preview should expose the selected element to the operator');
  const observedSelection = await page.evaluate(() => window.FenixVisualIDE.getSelectionContext('rea-ui-fixture'));
  assert.deepEqual(observedSelection, {
    projectId: 'rea-ui-fixture', screenId: 'home', route: '/app#home', workspacePath: workspace,
    element: { selector: '#hero-cta', tag: 'button', text: 'Open dashboard' },
  });
  assert.equal(await page.evaluate(() => window.FenixVisualIDE.getSelectionContext('another-project')), null,
    'a visual selection must not cross project boundaries');
  const annotationText = 'Aumentar o espaçamento deste botão sem alterar sua ação.';
  await page.locator('#screenAnnotationInput').fill(annotationText);
  await page.locator('#saveScreenAnnotationBtn').click();
  await page.getByText('Anotação vinculada ao projeto e à tela; nenhum arquivo foi alterado.').waitFor({ state: 'visible' });
  const annotationMemoryResponse = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } });
  assert.equal(annotationMemoryResponse.status, 200);
  const annotationMemoryResult = await annotationMemoryResponse.json();
  const savedAnnotation = annotationMemoryResult.results.map((item) => item.memory || item)
    .find((item) => item.stableKey?.startsWith('project-annotation:rea-ui-fixture:'));
  assert.ok(savedAnnotation, 'the selected preview annotation should persist in the existing project memory');
  const savedAnnotationData = JSON.parse(savedAnnotation.content);
  assert.equal(savedAnnotationData.projectId, 'rea-ui-fixture');
  assert.equal(savedAnnotationData.screenId, 'home');
  assert.equal(savedAnnotationData.element.selector, '#hero-cta');
  assert.equal(savedAnnotationData.note, annotationText);
  assert.equal(savedAnnotationData.provenance.status, 'OPERATOR_NOTE');
  assert.equal(Object.hasOwn(savedAnnotationData, 'workspacePath'), false, 'local workspace paths must not be copied into a visual note');
  const savedAnnotationId = savedAnnotationData.annotationId;
  await page.evaluate(() => window.showScreenDetail('home'));
  await page.locator('#screenAnnotationList').getByText(annotationText).waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(document.querySelector('#selectedScreenFrame')?.contentDocument?.querySelector('#hero-cta')));
  await page.evaluate(() => document.querySelector('#selectedScreenFrame').contentDocument.querySelector('#hero-cta').click());
  const projectPlanSelection = { projectId: observedSelection.projectId, screenId: observedSelection.screenId, route: observedSelection.route, element: observedSelection.element };
  const copilotModes = [];
  let planSelectionContext = null;
  await page.route('**/api/v2/workspace/copilot-assist', async (route) => {
    const payload = route.request().postDataJSON();
    copilotModes.push(payload.mode);
    if (payload.mode === 'PROJECT_PLAN') {
      assert.equal(payload.projectId, 'rea-ui-fixture');
      assert.equal(payload.filePath, undefined, 'a project-level design plan must not pretend a file is open');
      await route.fulfill({ json: { ok: true, mode: 'PROJECT_PLAN', analysis: 'Fato observado: o REA mapeou /api/rea-fixture.\nInferência: revisar a navegação do dashboard após validar as rotas.\nLacuna: capturas atuais não medidas.\nAceite: rotas e interações principais passam em 375 e 1280 px.', evidenceId: direct.evidenceId, referenceIds: [savedReferenceId, 'capture-qa-001'], provider: 'qa-provider', model: 'qa-project-plan', durationMs: 41, readOnly: true, createsJob: false, fileSha256: null } });
      return;
    }
    if (payload.mode === 'PLAN') {
      planSelectionContext = payload.selectionContext || null;
      await route.fulfill({ json: { ok: true, mode: 'PLAN', analysis: 'Fatos observados: rota /api/rea-fixture.\nPasso: ajustar src/app.js.\nAceite: manter a rota funcional.', evidenceId: direct.evidenceId, fileSha256: crypto.createHash('sha256').update(payload.code).digest('hex'), provider: 'qa-provider', model: 'qa-plan', durationMs: 25, readOnly: true, createsJob: false, patch: null } });
      return;
    }
    await route.fulfill({ json: { ok: true, mode: 'PROPOSE_EDIT', proposal: { path: payload.filePath, summary: 'Proposta baseada no plano', content: `${payload.code}\n// diff de QA\n`, baseHash: crypto.createHash('sha256').update(payload.code).digest('hex'), evidenceId: direct.evidenceId }, provider: 'qa-provider', model: 'qa-build', durationMs: 30, readOnly: true } });
  });
  await page.locator('#editSelectedScreenBtn').evaluate((button) => button.click());
  await page.locator('#fenixIdeProposalDialog').waitFor({ state: 'visible' });
  await page.locator('#view-ide.active').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalFile').textContent(), /rea-ui-fixture · public\/index\.html/);
  assert.match(await page.locator('#fenixIdeProposalPrompt').inputValue(), /#hero-cta.*Open dashboard/,
    'Edit Screen with AI should open the actual IDE proposal with the selected preview element in context');
  await page.locator('#fenixIdeProposalPlanButton').click();
  await page.getByText(/Aceite: manter a rota funcional/).waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalPlan').textContent(), /REA/);
  assert.match(await page.locator('#fenixIdeProposalPlan').textContent(), /qa-provider · qa-plan/);
  assert.deepEqual(planSelectionContext, projectPlanSelection, 'the plan request must carry project-scoped observation without leaking its filesystem root');
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const box = await page.locator('#fenixIdeProposalDialog > section').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width, `Plan dialog should fit viewport ${width}px`);
    assert.equal(await page.locator('#fenixIdeProposalBuildFromPlan').isVisible(), true, `Build action should remain available at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#fenixIdeProposalSavePlan').click();
  await page.getByText(/Plano salvo na memória deste projeto/).waitFor({ state: 'visible' });
  const planMemoryResult = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const savedPlan = planMemoryResult.results.map((item) => item.memory || item).find((item) => item.stableKey?.startsWith('rea-plan:rea-ui-fixture:'));
  assert.ok(savedPlan, 'operator-saved REA plan should persist in project memory');
  const savedPlanData = JSON.parse(savedPlan.content);
  assert.equal(savedPlanData.evidenceId, direct.evidenceId);
  assert.equal(savedPlanData.filePath, 'public/index.html');
  assert.deepEqual(savedPlanData.selectionContext, projectPlanSelection, 'saved project memory must retain preview provenance without a filesystem path');
  assert.equal(savedPlanData.fileSha256.startsWith(direct.applicationGraph.nodes.find((node) => node.path === 'public/index.html').sha256), true);
  await page.locator('#fenixIdeProposalBuildFromPlan').click();
  await page.locator('#fenixIdeProposalReview').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalSummary').textContent(), /qa-provider \/ qa-build/);
  assert.deepEqual(copilotModes, ['PLAN', 'PROPOSE_EDIT']);
  assert.equal(await fs.readFile(path.join(workspace, 'public/index.html'), 'utf8'), '<!doctype html><html><body><nav id="fixture-nav"><button id="hero-cta" data-nav="home" onclick="window.showView(\'home\')">Open dashboard</button><button data-nav="settings" onclick="window.showView(\'settings\')">Settings</button></nav><main id="view-home">Dashboard</main><main id="view-settings">Settings</main></body></html>', 'reviewing a plan and diff must not write the selected screen file');
  await page.locator('#fenixIdeProposalDiscard').click();
  await page.locator('#fenixIdeProposalDialog').waitFor({ state: 'hidden' });
  const savedDraftSource = await fs.readFile(path.join(workspace, 'src/app.js'), 'utf8');
  const savedDraftContent = `${savedDraftSource}\n// proposta persistida para revisão`;
  const savedDraftResponse = await fetch(`${base}/api/fenix/projects/rea-ui-fixture/drafts`, {
    method: 'POST', headers: { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ path: 'src/app.js', content: savedDraftContent, expectedHash: crypto.createHash('sha256').update(savedDraftSource).digest('hex'), summary: 'Revisão recuperável' })
  });
  assert.equal(savedDraftResponse.status, 201);
  await page.locator('#btnIdeProjectDrafts').click();
  await page.locator('#fenixIdeDraftListItems button').first().click();
  await page.locator('#fenixIdeProposalReview').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalDiff').textContent(), /proposta persistida para revisão/,
    'the IDE draft list should reopen the stored source diff without writing it');
  assert.equal(await fs.readFile(path.join(workspace, 'src/app.js'), 'utf8'), savedDraftSource,
    'reopening a saved draft must not modify its target file');
  await page.locator('#fenixIdeProposalDiscard').click();
  await page.locator('#fenixIdeProposalDialog').waitFor({ state: 'hidden' });
  await page.unroute('**/api/v2/workspace/copilot-assist');
  await page.evaluate(async () => {
    window.showView('ide');
    await window.fenixSelectIdeProject('rea-ui-fixture');
    await window.fenixSelectIdeFile('src/app.js');
  });
  await page.locator('#fenixIdeCodeEditor').waitFor({ state: 'visible' });
  const ideEditor = page.locator('#fenixIdeCodeEditor');
  const savedFile = await ideEditor.inputValue();
  const unsavedFile = `${savedFile}\n// rascunho local não salvo`;
  await ideEditor.fill(unsavedFile);
  await page.evaluate(() => window.showView('projects'));
  await page.getByRole('button', { name: 'Abrir src/app.js na IDE' }).waitFor({ state: 'visible' });
  await page.evaluate(() => { window.confirm = () => false; });
  const openObservedRoute = page.getByRole('button', { name: 'Abrir src/app.js na IDE' });
  await openObservedRoute.click();
  assert.match(page.url(), /#projects$/, 'canceling unsaved-work confirmation must leave the user on Projects');
  assert.equal(await ideEditor.inputValue(), unsavedFile, 'canceling must preserve the current editor buffer');
  await page.evaluate(() => { window.confirm = () => true; });
  await openObservedRoute.click();
  await page.waitForFunction(() => document.querySelector('#fenixIdeCurrentPath')?.textContent.includes('src/app.js'));
  assert.match(await page.locator('#fenixIdeCurrentPath').textContent(), /rea-ui-fixture > src\/app\.js/,
    'opening a REA route should preserve the project and select its observed source file in the IDE');
  assert.equal(await page.evaluate(() => localStorage.getItem('fenix_ide_project')), 'rea-ui-fixture');
  await page.locator('[data-nav="projects"]').click();
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').waitFor({ state: 'visible' });
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').click();
  await page.locator('[data-workspace-tab="intelligence"]').click();
  await page.getByText('Referências visuais e regras de interface', { exact: true }).waitFor({ state: 'visible' });
  const referenceCards = await page.locator('.flp-design-reference-card').evaluateAll((cards) => cards.map((card) => ({
    label: card.querySelector('a')?.textContent,
    href: card.querySelector('a')?.href,
    target: card.querySelector('a')?.target,
    rel: card.querySelector('a')?.rel,
    mode: card.querySelector('.flp-design-reference-mode')?.textContent
  })));
  assert.equal(referenceCards.length, 3, 'Project Hub should render each selected product reference');
  assert.ok(referenceCards.every((card) => card.target === '_blank' && card.rel.includes('noopener')));
  assert.ok(referenceCards.every((card) => /somente leitura/.test(card.mode)));
  const contract = await page.evaluate(() => window.FenixDesignReference.profile);
  assert.deepEqual(contract.referenceCatalog.map((source) => source.id), ['lovable-editor', 'miro-dashboard', 'google-stitch-canvas']);
  assert.deepEqual([...new Set(contract.capabilityMap.map((item) => item.product))].sort(), ['Lovable', 'Miro', 'Stitch']);
  assert.ok(contract.capabilityMap.some((item) => item.product === 'Stitch' && item.status === 'PARTIAL' && item.action === 'screens'));
  assert.ok(contract.capabilityMap.some((item) => item.product === 'Miro' && item.status === 'PARTIAL' && item.action === 'projects'));
  assert.ok(contract.capabilityMap.some((item) => item.product === 'Lovable' && item.status === 'PARTIAL' && item.action === 'ide'));
  assert.ok(contract.capabilityMap.some((item) => item.status === 'BACKLOG'), 'unimplemented integrations should be visible as backlog, not represented as active');
  assert.ok(contract.intake.some((item) => /critérios de aceite/.test(item)), 'design intake should collect complete project context');
  assert.ok(contract.interactionRules.some((item) => /44 CSS px/.test(item)), 'design contract should define touch target behavior');
  assert.ok(contract.deliverables.includes('Mapa de telas e rotas'), 'REA output should feed a screen and route inventory');
  await page.locator('#flpDesignSurface').selectOption('app');
  await page.locator('#flpDesignDirection').selectOption('hig-adaptive');
  await page.locator('#flpDesignGoal').fill('Criar um painel para acompanhar solicitações dos agentes.');
  assert.equal(await page.locator('#flpDesignGoal').inputValue(), 'Criar um painel para acompanhar solicitações dos agentes.');
  await page.locator('[data-design-source="google-stitch-canvas"]').check();
  await page.locator('[data-design-viewport="375"]').check();
  await page.locator('[data-design-viewport="768"]').uncheck();
  await page.locator('[data-design-viewport="1280"]').check();
  await page.locator('[data-design-viewport="1920"]').uncheck();
  await page.getByText('Ver entradas, regras de interação e entregáveis', { exact: true }).click();
  await page.getByText('Matriz de capacidades e adaptação no Fênix', { exact: true }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-reference-capability').count(), contract.capabilityMap.length);
  assert.equal(await page.locator('.flp-reference-capability [data-reference-action]').count(), 4, 'only existing Fênix destinations should be actionable');
  await page.getByText('Comportamento dos controles', { exact: true }).waitFor({ state: 'visible' });
  await page.getByText(/Ação primária tem verbo e resultado explícitos/).waitFor({ state: 'visible' });
  assert.equal(await page.locator('#flpDesignGoal').inputValue(), 'Criar um painel para acompanhar solicitações dos agentes.');
  await page.getByRole('button', { name: 'Aplicar fluxo de design ao projeto' }).click();
  await page.getByText(/Preferências deste projeto salvas na memória; padrões gerais salvos na memória visual universal/).waitFor({ state: 'visible' });
  const projectMemory = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const savedProjectProfile = projectMemory.results.map((item) => item.memory || item).find((item) => item.stableKey === 'design-reference-profile:rea-ui-fixture');
  assert.ok(savedProjectProfile);
  const savedPreferences = JSON.parse(savedProjectProfile.content).preferences;
  assert.equal(savedPreferences.designGoal, 'Criar um painel para acompanhar solicitações dos agentes.');
  assert.equal(savedPreferences.surface, 'app');
  assert.equal(savedPreferences.visualDirection, 'hig-adaptive');
  assert.deepEqual(savedPreferences.referenceSources, ['google-stitch-canvas']);
  assert.deepEqual(savedPreferences.targetViewports, [375, 1280]);
  await page.locator('#flpReferenceUrl').fill('https://user:secret@example.test/admin#session-fragment');
  await page.getByRole('button', { name: 'Analisar entrada e salvar no projeto' }).click();
  await page.getByText(/A URL não foi acessada; adicione captura ou conteúdo autorizado/).waitFor({ state: 'visible' });
  const referenceMemories = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const savedReference = referenceMemories.results.map((item) => item.memory || item).find((item) => item.stableKey?.startsWith('project-reference:rea-ui-fixture:'));
  assert.ok(savedReference, 'analyzed external reference must be stored in the selected project memory');
  assert.equal(JSON.parse(savedReference.content).spec.analysisStatus, 'NEEDS_CAPTURE');
  assert.equal(JSON.parse(savedReference.content).url, 'https://example.test/admin', 'reference storage must strip URL credentials and fragments');
  assert.doesNotMatch(savedReference.content, /secret|session-fragment/);
  const savedReferenceId = JSON.parse(savedReference.content).spec.referenceId;
  const visualFixture = {
    referenceSpec: {
      referenceId: 'capture-qa-001', type: 'SCREENSHOT', analysisStatus: 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION',
      imageAnalysis: { status: 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION', mimeType: 'image/png', imageBytes: 12, imageSha256: 'a'.repeat(64), provider: 'qa-vision', model: 'qa-vision-1', durationMs: 42 },
      knowledge: { functional: { coreCapabilities: [] }, visual: { status: 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION', observations: { layout: 'Barra lateral e painel de projetos', visibleText: ['Projetos'], visibleComponents: [{ label: 'Buscar projeto', category: 'input', apparentState: 'vazio' }], inferredInteractions: ['Filtrar projetos'], uncertainties: ['Estado após busca não visível'] } } },
      evidence: { limitations: ['Observação do modelo requer validação humana.'] }
    },
    analysis: { layout: 'Barra lateral e painel de projetos', visibleText: ['Projetos'], visibleComponents: [{ label: 'Buscar projeto', category: 'input', apparentState: 'vazio' }], inferredInteractions: ['Filtrar projetos'], uncertainties: ['Estado após busca não visível'] }
  };
  await page.route('**/api/v2/intent/analyze-reference-image', async (route) => {
    assert.equal(route.request().postDataJSON().projectId, 'rea-ui-fixture');
    await route.fulfill({ json: { ok: true, ...visualFixture } });
  });
  await page.locator('#flpReferenceImage').setInputFiles({ name: 'project-capture.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a00000000', 'hex') });
  await page.getByRole('button', { name: 'Analisar captura com modelo de visão' }).click();
  await page.getByText(/Observações de qa-vision \/ qa-vision-1 vinculadas/).waitFor({ state: 'visible' });
  await page.unroute('**/api/v2/intent/analyze-reference-image');
  const imageReferenceMemory = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const savedImageReference = imageReferenceMemory.results.map((item) => item.memory || item).find((item) => item.stableKey === 'project-reference:rea-ui-fixture:capture-qa-001');
  assert.ok(savedImageReference, 'image observations should persist in the selected project memory');
  const savedImageRecord = JSON.parse(savedImageReference.content);
  assert.equal(savedImageRecord.spec.imageAnalysis.imageSha256, 'a'.repeat(64));
  assert.doesNotMatch(savedImageReference.content, /iVBORw0KGgo/, 'raw image data must not be retained in project memory');
  await page.evaluate(() => window.FenixDesignReference.clear('rea-ui-fixture'));
  await page.route('**/api/memory/project/rea-ui-fixture', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  await page.locator('[data-workspace-tab="intelligence"]').click();
  await page.locator('#flpDesignGoal').fill('Rascunho novo, ainda não aplicado.');
  await page.waitForFunction(() => /Ativo na memória do projeto/.test(document.querySelector('.flp-design-reference > .flp-design-reference-status')?.textContent || ''));
  assert.equal(await page.locator('#flpDesignGoal').inputValue(), 'Rascunho novo, ainda não aplicado.',
    'late project memory hydration must not overwrite a newer unsaved operator draft');
  await page.unroute('**/api/memory/project/rea-ui-fixture');
  await page.locator('#flpDesignGoal').fill('Criar um painel para acompanhar solicitações dos agentes.');
  await page.getByRole('button', { name: 'Gerar DESIGN.md com REA' }).click();
  await page.waitForFunction((evidenceId) => {
    const status = [...document.querySelectorAll('.flp-design-reference-status')].at(-1)?.textContent || '';
    return status.includes('pronto para revisão') || status.includes('Não foi possível gerar');
  }, direct.evidenceId);
  const designDraftStatus = await page.locator('.flp-design-reference-status').last().textContent();
  assert.match(designDraftStatus, /pronto para revisão/, designDraftStatus);
  await page.locator('#fenixIdeProposalReview').waitFor({ state: 'visible' });
  const designDraftText = await page.locator('#fenixIdeProposalDiff').textContent();
  assert.match(designDraftText, /rea-ui-fixture|REA/);
  assert.match(designDraftText, new RegExp(direct.evidenceId));
  assert.equal(await fs.access(path.join(workspace, 'DESIGN.md')).then(() => true, () => false), false,
    'DESIGN.md preview must not write before explicit confirmation');
  await page.evaluate(() => { window.confirm = () => true; });
  await page.getByRole('button', { name: 'Confirmar e criar arquivo' }).click();
  await page.waitForFunction(() => document.querySelector('#fenixIdeCurrentPath')?.textContent.includes('DESIGN.md'));
  const generatedDesignDoc = await fs.readFile(path.join(workspace, 'DESIGN.md'), 'utf8');
  assert.match(generatedDesignDoc, new RegExp(direct.evidenceId));
  assert.match(generatedDesignDoc, /Criar um painel para acompanhar solicitações dos agentes/);
  await page.evaluate(() => { window.confirm = () => false; });
  await page.locator('[data-nav="projects"]').click();
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').waitFor({ state: 'visible' });
  await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').click();
  await page.locator('[data-workspace-tab="intelligence"]').click();
  const importBefore = await page.evaluate(() => window.FenixDesignReference.read('rea-ui-fixture', { refresh: true }));
  assert.equal(importBefore.importedDocument, undefined);
  assert.equal(await page.locator('[data-design-document-status="true"]').count(), 1, 'the selected project should mount one DESIGN.md import status');
  await page.getByRole('button', { name: 'Carregar DESIGN.md existente' }).click();
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-design-document-status="true"]')?.textContent || '';
    return status !== 'Gere um DESIGN.md rastreável com objetivo, referências e a última análise REA do workspace.';
  }, { timeout: 5000 });
  await page.waitForFunction(() => {
    const status = document.querySelector('[data-design-document-status="true"]')?.textContent || '';
    return status.includes('Revise os campos extraídos') || status.includes('Não foi possível carregar DESIGN.md');
  }, { timeout: 5000 }).catch(async (error) => {
    const state = await page.evaluate(() => ({
      statusCount: document.querySelectorAll('[data-design-document-status="true"]').length,
      statuses: [...document.querySelectorAll('[data-design-document-status="true"]')].map((node) => node.textContent),
      button: [...document.querySelectorAll('button')].find((node) => node.textContent.includes('Carregar DESIGN.md existente'))?.outerHTML
    }));
    throw new Error(`${error.message}; DESIGN.md import did not finish: ${JSON.stringify(state)}`);
  });
  assert.match(await page.locator('[data-design-document-status="true"]').textContent(), /Revise os campos extraídos/);
  await page.getByRole('button', { name: 'Confirmar importação no perfil do projeto' }).waitFor({ state: 'visible' });
  assert.equal(await page.locator('.flp-design-import-preview pre').textContent().then((text) => /Gerado pelo Fênix/.test(text)), true);
  assert.equal((await page.evaluate(() => window.FenixDesignReference.read('rea-ui-fixture', { refresh: true }))).importedDocument, undefined,
    'reading and previewing DESIGN.md must not persist imported preferences');
  await page.getByRole('button', { name: 'Confirmar importação no perfil do projeto' }).click();
  await page.getByText(/Preferências estruturadas importadas para este projeto/).waitFor({ state: 'visible' });
  const importedDesign = await page.evaluate(() => window.FenixDesignReference.read('rea-ui-fixture', { refresh: true }));
  assert.equal(importedDesign.importedDocument.status, 'IMPORTED_UNVERIFIED');
  assert.equal(importedDesign.importedDocument.path, 'DESIGN.md');
  assert.match(importedDesign.importedDocument.sha256, /^[a-f0-9]{64}$/);
  assert.equal(importedDesign.preferences.designGoal, 'Criar um painel para acompanhar solicitações dos agentes.');
  assert.equal(JSON.stringify(importedDesign).includes('## Regras de interação'), false,
    'only recognized fields and provenance, never the raw markdown, may enter project memory');
  await page.getByText('Ver entradas, regras de interação e entregáveis', { exact: true }).click();
  const universalMemory = await fetch(`${base}/api/memory/search?q=GRG%20SPACE%20visual%20design%20context&kind=global&limit=10`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  assert.ok(universalMemory.results.some((item) => item.memory?.stableKey === 'design-reference-profile:global'));
  const sharedProfile = await page.evaluate(() => window.FenixDesignReference.readGlobal({ refresh: true }));
  assert.equal(sharedProfile?.version, '2.1', 'universal design context should be reusable by every project');
  const designInputs = page.locator('.flp-design-inputs').first();
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await designInputs.scrollIntoViewIfNeeded();
    const geometry = await designInputs.evaluate((node) => {
      const parent = node.getBoundingClientRect();
      const controls = [...node.querySelectorAll('select,textarea,input[type="file"]')].map((control) => {
        const rect = control.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      });
      return { left: parent.left, right: parent.right, width: parent.width, controls };
    });
    assert.ok(geometry.width > 0, `design inputs must stay visible at ${width}px`);
    assert.ok(geometry.controls.every((control) => control.width > 0 && control.left >= geometry.left - 1 && control.right <= geometry.right + 1), `design controls must fit their panel at ${width}px`);
    if (width === 375) {
      const lastIntakeAction = page.locator('.flp-reference-intake .flp-button').last();
      await lastIntakeAction.scrollIntoViewIfNeeded();
      const intakeAction = await lastIntakeAction.boundingBox();
      assert.ok(intakeAction && intakeAction.y >= 0 && intakeAction.y + intakeAction.height <= 930, `mobile reference intake action must be reachable above the persistent bottom bar: ${JSON.stringify(intakeAction)}`);
    }
    await page.screenshot({ path: path.join(os.tmpdir(), `grg-design-inputs-${width}.png`), fullPage: false });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const projectCardGeometry = await page.locator('#flpCards .flp-card[data-project-id="rea-ui-fixture"]').evaluate((card) => {
    const open = card.querySelector('.flp-project-open');
    const content = card.querySelector('.flp-card-content');
    const foot = card.querySelector('.flp-card-foot');
    return {
      cardWidth: card.getBoundingClientRect().width,
      openWidth: open.getBoundingClientRect().width,
      contentWidth: content.getBoundingClientRect().width,
      footWidth: foot.getBoundingClientRect().width,
      writingMode: getComputedStyle(foot).writingMode
    };
  });
  assert.ok(projectCardGeometry.openWidth > 180 && projectCardGeometry.contentWidth > 100, `project card content must retain readable width: ${JSON.stringify(projectCardGeometry)}`);
  assert.equal(projectCardGeometry.writingMode, 'horizontal-tb', 'project counters must remain horizontal');
  await page.locator('[data-workspace-tab="screens"]').click();
  await page.locator('[data-workspace-tab="screens"].active').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Atualizar mapa de telas' }).waitFor({ state: 'visible' });
  const absorbedScreen = page.locator('.flp-dna-node').first();
  await absorbedScreen.waitFor({ state: 'visible' });
  const screenBranch = page.locator('.flp-dna-branch').first();
  await screenBranch.waitFor({ state: 'visible' });
  assert.ok(await screenBranch.locator('.flp-dna-node').count() > 0, 'observed screens should render inside their route/file branch');
  await page.locator('.flp-dna-project-logo').waitFor({ state: 'visible' });
  const absorbedScreenId = await absorbedScreen.getAttribute('data-screen-id');
  await absorbedScreen.getByRole('button', { name: 'Ver relações no Flow Graph' }).click();
  await page.locator('#fenixFlowGraphModal').waitFor({ state: 'visible' });
  const flowScreenId = `screen:rea-ui-fixture:${encodeURIComponent(absorbedScreenId).slice(0, 120)}`;
  await page.waitForFunction((screenId) => Boolean(window.FenixFlowGraph.findNode(screenId)), flowScreenId);
  await page.locator(`#fenixFlowGraphModal .ffg-node.selected[data-id="${flowScreenId}"]`).waitFor({ state: 'visible' });
  const flowEvidence = await page.evaluate(({ memoryId, referenceId, screenId, annotationId }) => ({
    project: window.FenixFlowGraph.findNode('project:rea-ui-fixture'),
    observedModule: window.FenixFlowGraph.findNode('module:src/app.js'),
    absorbedScreen: window.FenixFlowGraph.findNode(screenId),
    absorbedScreenEdges: window.FenixFlowGraph.findEdges?.('project:rea-ui-fixture', screenId) || [],
    absorbedNavigationEdges: window.FenixFlowGraph.findEdges?.('screen:rea-ui-fixture:view-home', 'screen:rea-ui-fixture:view-settings') || [],
    absorbedSourceEdges: window.FenixFlowGraph.findEdges?.(screenId, 'module:public/index.html') || [],
    designProfile: window.FenixFlowGraph.findNode('design-reference:rea-ui-fixture'),
    savedPlan: window.FenixFlowGraph.findNode(`plan:rea-ui-fixture:${memoryId}`),
    visualSelection: window.FenixFlowGraph.findNode(`visual-selection:rea-ui-fixture:${memoryId}`),
    visualSelectionScreenEdges: window.FenixFlowGraph.findEdges(
      `visual-selection:rea-ui-fixture:${memoryId}`,
      `screen:rea-ui-fixture:${encodeURIComponent('home')}`
    ),
    annotation: window.FenixFlowGraph.findNode(`project-annotation:rea-ui-fixture:${annotationId}`),
    annotationScreenEdge: window.FenixFlowGraph.findEdges(`project-annotation:rea-ui-fixture:${annotationId}`, screenId)
      .find((edge) => edge.type === 'DERIVED_FROM') || null,
    annotationProjectEdge: window.FenixFlowGraph.findEdges('project:rea-ui-fixture', `project-annotation:rea-ui-fixture:${annotationId}`)
      .find((edge) => edge.type === 'USES') || null,
    syntheticFrontend: window.FenixFlowGraph.findNode('module:frontend'),
    syntheticBuild: window.FenixFlowGraph.findNode('output:project_build'),
    lovableReference: window.FenixFlowGraph.findNode('reference:rea-ui-fixture:lovable-editor'),
    miroReference: window.FenixFlowGraph.findNode('reference:rea-ui-fixture:miro-dashboard'),
    stitchReference: window.FenixFlowGraph.findNode('reference:rea-ui-fixture:google-stitch-canvas'),
    stitchCapabilities: window.FenixDesignReference.profile.capabilityMap.filter((item) => item.product === 'Stitch').map((_, index) => window.FenixFlowGraph.findNode(`design-capability:rea-ui-fixture:google-stitch-canvas:${index}`)),
    stitchCapabilityEdges: window.FenixDesignReference.profile.capabilityMap.filter((item) => item.product === 'Stitch').map((_, index) => window.FenixFlowGraph.findEdges(`reference:rea-ui-fixture:google-stitch-canvas`, `design-capability:rea-ui-fixture:google-stitch-canvas:${index}`)),
    projectReference: window.FenixFlowGraph.findNode(`project-reference:rea-ui-fixture:${referenceId}`),
    imageReference: window.FenixFlowGraph.findNode('project-reference:rea-ui-fixture:capture-qa-001'),
    capturedComponent: window.FenixFlowGraph.findNode('reference-component:rea-ui-fixture:capture-qa-001:0')
  }), { memoryId: savedPlan.id, referenceId: savedReferenceId, screenId: flowScreenId, annotationId: savedAnnotationId });
  assert.equal(flowEvidence.project?.properties?.projectId, 'rea-ui-fixture');
  assert.ok(flowEvidence.observedModule, 'Flow Graph should contain the module observed by REA');
  assert.equal(flowEvidence.absorbedScreen?.type, 'SCREEN', 'absorbed Screen DNA should appear as a first-class Flow Graph node');
  assert.equal(flowEvidence.absorbedScreen?.properties?.source, 'STATIC_SOURCE_SCAN', 'screen node should preserve absorption provenance');
  assert.equal(flowEvidence.absorbedScreen?.properties?.captureStatus, 'NOT_CAPTURED', 'unmeasured screens must remain visibly unmeasured');
  assert.ok(flowEvidence.absorbedScreenEdges.some((edge) => edge.type === 'ROUTES_TO'), 'project should link to its absorbed screen with a routes-to edge');
  assert.ok(flowEvidence.absorbedNavigationEdges.some((edge) => edge.type === 'NAVIGATION' && edge.properties?.evidenceSource === 'STATIC_SOURCE' && edge.properties?.verificationStatus === 'NOT_VERIFIED' && edge.properties?.selector === '#fixture-nav [data-nav="settings"]'), 'source-backed screen transitions should retain their selector and unverified status');
  const routeEdge = flowEvidence.absorbedScreenEdges.find((edge) => edge.type === 'ROUTES_TO');
  assert.equal(routeEdge.active, null, 'an unmapped activity state must remain unmeasured');
  assert.equal(routeEdge.properties?.lastExecuted, null, 'the graph must not invent an execution time');
  assert.equal(routeEdge.properties?.executions, null, 'the graph must not invent execution counts');
  assert.ok(flowEvidence.absorbedSourceEdges.some((edge) => edge.type === 'DERIVED_FROM'), 'a screen should link to a REA source node only when its source path matches exactly');
  assert.equal(flowEvidence.savedPlan?.status, 'HASH_PREFIX_MATCH', 'Flow Graph should state that the available REA file hash is only a matching prefix');
  assert.equal(flowEvidence.savedPlan?.properties?.evidenceId, direct.evidenceId, 'saved plan must link back to its REA evidence');
  assert.equal(flowEvidence.visualSelection?.status, 'OBSERVED_CONTEXT');
  assert.ok(flowEvidence.visualSelectionScreenEdges.some((edge) => edge.type === 'DERIVED_FROM'), 'preview selection should link to its matching absorbed Screen DNA node');
  assert.equal(flowEvidence.annotation?.status, 'OPERATOR_NOTE');
  assert.equal(flowEvidence.annotation?.properties?.element?.selector, '#hero-cta');
  assert.equal(flowEvidence.annotation?.properties?.note, annotationText);
  assert.ok(flowEvidence.annotationScreenEdge || flowEvidence.annotationProjectEdge,
    'the annotation should link to its observed screen or, when no matching Screen DNA node exists, to its project');
  assert.equal(flowEvidence.visualSelection?.properties?.element?.selector, '#hero-cta');
  assert.equal(flowEvidence.visualSelection?.properties?.route, '/app#home');
  assert.equal(flowEvidence.designProfile?.status, 'CONFIGURED', 'Flow Graph should distinguish the chosen design profile from observed source facts');
  assert.equal(flowEvidence.designProfile?.properties?.profile?.preferences?.surface, 'app', 'Flow Graph should expose saved project choices with the profile');
  assert.equal(flowEvidence.syntheticFrontend ?? null, null, 'Flow Graph must not invent generic project modules');
  assert.equal(flowEvidence.syntheticBuild ?? null, null, 'Flow Graph must not claim a successful build without evidence');
  assert.equal(flowEvidence.lovableReference ?? null, null, 'unselected design references should not enter the project graph');
  assert.equal(flowEvidence.miroReference ?? null, null, 'unselected design references should not enter the project graph');
  assert.equal(flowEvidence.stitchReference?.properties?.sourceType, 'OFFICIAL_PRODUCT_SOURCE');
  assert.equal(flowEvidence.stitchCapabilities.length, contract.capabilityMap.filter((item) => item.product === 'Stitch').length,
    'selected official references should expose their audited capabilities as graph nodes');
  assert.ok(flowEvidence.stitchCapabilities.some((node) => node?.title === 'Canvas com telas conectadas e protótipo navegável'
    && node.status === 'PARTIAL' && /protótipo clicável ainda ausente/.test(node.metadata?.fenix)),
  'the Flow Graph should show what Fênix implements and what remains missing for each Stitch capability');
  assert.ok(flowEvidence.stitchCapabilityEdges.every((edges) => edges.some((edge) => edge.type === 'DERIVED_FROM')),
    'capability nodes should retain their edge back to the selected official reference');
  assert.equal(flowEvidence.projectReference?.status, 'NEEDS_CAPTURE', 'Flow Graph must show that a project reference still needs a capture');
  assert.equal(flowEvidence.imageReference?.status, 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION', 'visual reference must retain its unverified model status');
  assert.equal(flowEvidence.imageReference?.properties?.visualSummary, 'Barra lateral e painel de projetos');
  assert.equal(flowEvidence.imageReference?.properties?.capture?.model, 'qa-vision-1');
  assert.equal(flowEvidence.capturedComponent?.type, 'COMPONENT', 'captured components should be separately discoverable in the project graph');
  assert.equal(flowEvidence.capturedComponent?.status, 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION');
  assert.equal(flowEvidence.capturedComponent?.properties?.label, 'Buscar projeto');
  assert.deepEqual(flowEvidence.designProfile?.metadata?.preferences?.referenceSources, ['google-stitch-canvas']);
  await page.evaluate(async () => {
    window.FenixFlowGraph.close();
    await window.fenixOpenFlowGraph({
      context: 'PROJECT', entityId: 'project:another-project',
      absorptionReport: { projectId: 'rea-ui-fixture', screens: [{ screenId: 'must-not-leak', route: '/private' }] }
    });
  });
  await page.locator('#fenixFlowGraphModal').waitFor({ state: 'visible' });
  await page.waitForFunction(() => Boolean(window.FenixFlowGraph.findNode('project:another-project')));
  assert.equal(await page.evaluate(() => window.FenixFlowGraph.findNode('screen:another-project:must-not-leak') ?? null), null,
    'absorption data from one project must not leak into another project graph');
  await page.evaluate(async () => {
    window.FenixFlowGraph.close();
    window.showView('ide');
    await window.fenixSelectIdeProject('rea-ui-fixture');
  });
  await page.getByRole('button', { name: 'Abrir referências de design do projeto' }).click();
  await page.getByText(/Ativo na memória do projeto/).waitFor({ state: 'visible' });
  await page.evaluate(async () => { window.showView('ide'); await window.fenixSelectIdeProject('rea-ui-fixture'); });
  await page.getByRole('button', { name: 'Analisar projeto com REA' }).click();
  await page.locator('#view-projects .flp-rea-evidence').waitFor({ state: 'visible' });
  await page.getByText('REA · evidência e padrões do projeto').waitFor({ state: 'visible' });
  await page.locator('#view-projects .flp-design-reference').evaluate((section) => section.remove());
  const legacyPanel = await page.evaluate(() => window.FenixDesignReferencePanel.mountLegacyPanel());
  assert.equal(legacyPanel, true, 'the reference matrix should mount safely on the currently served legacy Project Hub layout');
  assert.equal(await page.locator('#view-projects .flp-reference-capability').count(), contract.capabilityMap.length);
  await page.evaluate(async () => { window.showView('ide'); await window.fenixSelectIdeProject('rea-ui-fixture'); });
  await page.locator('#btnIdeProjectPlan').click();
  await page.locator('#fenixIdeProposalDialog').waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalFile').textContent(), /Workspace inteiro.*REA \+ referências salvas/);
  await page.locator('#fenixIdeProposalPrompt').fill('Aplicar os padrões funcionais observados no Stitch, Miro e Lovable ao fluxo deste projeto.');
  await page.route('**/api/v2/workspace/copilot-assist', async (route) => {
    const payload = route.request().postDataJSON();
    assert.equal(payload.mode, 'PROJECT_PLAN');
    assert.equal(payload.projectId, 'rea-ui-fixture');
    await route.fulfill({ json: { ok: true, mode: 'PROJECT_PLAN', analysis: 'Fato observado: o REA mapeou /api/rea-fixture.\nInferência: revisar a navegação do dashboard após validar as rotas.\nLacuna: capturas atuais não medidas.\nAceite: rotas e interações principais passam em 375 e 1280 px.', evidenceId: direct.evidenceId, referenceIds: [savedReferenceId, 'capture-qa-001'], provider: 'qa-provider', model: 'qa-project-plan', durationMs: 41, readOnly: true, createsJob: false, fileSha256: null } });
  });
  await page.locator('#fenixIdeProposalPlanButton').click();
  await page.waitForFunction(() => !document.getElementById('fenixIdeProposalPlanButton')?.disabled, { timeout: 20000 });
  const projectPlanStatus = await page.locator('#fenixIdeProposalStatus').textContent();
  const projectPlanOutput = await page.locator('#fenixIdeProposalPlan').textContent();
  assert.match(projectPlanStatus, /Plano pronto/, `project plan request failed: ${projectPlanStatus}\n${projectPlanOutput}`);
  await page.getByText(/Plano pronto/).waitFor({ state: 'visible' });
  assert.match(await page.locator('#fenixIdeProposalPlan').textContent(), /Lacuna: capturas atuais não medidas/);
  assert.equal(await page.locator('#fenixIdeProposalBuildFromPlan').isVisible(), false, 'a project-wide plan must not expose a single-file build action');
  for (const [width, height] of [[375, 812], [768, 900], [1280, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const box = await page.locator('#fenixIdeProposalDialog > section').boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width, `Project plan dialog should fit viewport ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('#fenixIdeProposalSavePlan').click();
  await page.getByText(/Plano salvo na memória deste projeto/).waitFor({ state: 'visible' });
  const projectPlanMemory = await fetch(`${base}/api/memory/project/rea-ui-fixture`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const savedProjectPlan = projectPlanMemory.results.map((item) => item.memory || item).find((item) => item.stableKey?.startsWith('rea-plan:rea-ui-fixture:') && JSON.parse(item.content).scope === 'PROJECT');
  assert.ok(savedProjectPlan, 'project-level design plan should persist in the existing project memory');
  assert.deepEqual(JSON.parse(savedProjectPlan.content).referenceIds, [savedReferenceId, 'capture-qa-001']);
  let executionApproved = false;
  await page.route('**/api/dev/pipeline', async (route) => {
    const payload = route.request().postDataJSON();
    assert.equal(payload.projectId, 'rea-ui-fixture');
    assert.equal(Object.hasOwn(payload, 'projectPath'), false, 'workspace selection must be resolved by the API');
    assert.equal(payload.evidenceId, direct.evidenceId);
    assert.deepEqual(payload.referenceIds, [savedReferenceId, 'capture-qa-001']);
    await route.fulfill({ status: 202, json: { mission: { id: 'mission-rea-ui', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-build', status: 'AWAITING_APPROVAL', approvalId: 'approval-rea-ui' }] } } });
  });
  await page.route('**/api/missions/mission-rea-ui**', async (route) => {
    await route.fulfill({ json: executionApproved
      ? { id: 'mission-rea-ui', status: 'RUNNING', steps: [{ id: 'step-build', status: 'DISPATCHED', jobId: 'job-rea-ui' }] }
      : { id: 'mission-rea-ui', status: 'AWAITING_APPROVAL', steps: [{ id: 'step-build', status: 'AWAITING_APPROVAL', approvalId: 'approval-rea-ui' }] } });
  });
  await page.locator('#fenixIdeProposalExecutePlan').click();
  assert.equal(executionApproved, false, 'creating the mission must not enqueue its RED step');
  assert.equal(await page.locator('#fenixIdeProposalOpenApprovals').isVisible(), true);
  assert.match(await page.locator('#fenixIdeProposalStatus').textContent(), /mission-rea-ui.*AWAITING_APPROVAL/);
  assert.match(await page.locator('#fenixIdeProposalStatus').textContent(), /approval-rea-ui/);
  await page.locator('#fenixIdeProposalOpenApprovals').click();
  await page.locator('#view-operations').waitFor({ state: 'visible' });
  executionApproved = true; // Another authorized reviewer approves through the canonical queue.
  await page.evaluate(() => { window.showView('ide'); window.fenixOpenProjectPlan(); });
  await page.locator('#fenixIdeProposalDialog').waitFor({ state: 'visible' });
  await page.locator('#fenixIdeProposalRefreshExecution').click();
  assert.match(await page.locator('#fenixIdeProposalStatus').textContent(), /job-rea-ui/);
  const draftSource = await fs.readFile(path.join(workspace, 'src/app.js'), 'utf8');
  const draftResponse = await fetch(`${base}/api/fenix/projects/rea-ui-fixture/drafts`, {
    method: 'POST', headers: { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      path: 'src/app.js', content: `${draftSource}\n// proposta vinculada ao plano REA`,
      expectedHash: crypto.createHash('sha256').update(draftSource).digest('hex'),
      summary: 'Aplicar o padrão revisado', evidenceId: direct.evidenceId,
      sourcePlanMemoryId: savedProjectPlan.id, referenceIds: [savedReferenceId, 'capture-qa-001']
    })
  });
  assert.equal(draftResponse.status, 201);
  const savedDraft = await draftResponse.json();
  assert.equal(savedDraft.sourcePlanMemoryId, savedProjectPlan.id, 'persisted proposal should retain its source plan identity');
  const listedDrafts = await fetch(`${base}/api/fenix/projects/rea-ui-fixture/drafts`, { headers: { authorization: `Bearer ${login.token}` } }).then((response) => response.json());
  const listedDraft = listedDrafts.drafts.find((draft) => draft.draftId === savedDraft.draftId);
  assert.equal(listedDraft.evidenceId, direct.evidenceId);
  assert.equal(listedDraft.sourcePlanMemoryId, savedProjectPlan.id);
  assert.deepEqual(listedDraft.referenceIds, [savedReferenceId, 'capture-qa-001']);
  assert.equal(Object.hasOwn(listedDraft, 'content'), false, 'draft listing must expose provenance metadata without source code');
  assert.equal(Object.hasOwn(listedDraft, 'diff'), false, 'draft listing must not expose the diff body');
  await page.evaluate(async () => {
    window.fenixCloseEditProposal();
    await window.fenixOpenFlowGraph({ context: 'PROJECT', entityId: 'project:rea-ui-fixture' });
  });
  const projectPlanNodeId = `plan:rea-ui-fixture:${savedProjectPlan.id}`;
  await page.waitForFunction((id) => Boolean(window.FenixFlowGraph.findNode(id)), projectPlanNodeId);
  const projectPlanGraph = await page.evaluate(({ planId, referenceId, draftId, evidenceId }) => ({
    node: window.FenixFlowGraph.findNode(planId),
    referenceEdges: window.FenixFlowGraph.findEdges(planId, `project-reference:rea-ui-fixture:${referenceId}`),
    profileEdges: window.FenixFlowGraph.findEdges(planId, 'design-reference:rea-ui-fixture'),
    draft: window.FenixFlowGraph.findNode(draftId),
    draftEdges: window.FenixFlowGraph.findEdges(planId, draftId),
    evidence: window.FenixFlowGraph.findNode(`evidence:rea-ui-fixture:${evidenceId}`),
    planEvidenceEdges: window.FenixFlowGraph.findEdges(planId, `evidence:rea-ui-fixture:${evidenceId}`),
    draftReferenceEdges: window.FenixFlowGraph.findEdges(draftId, `project-reference:rea-ui-fixture:${referenceId}`),
    draftSourceEdges: window.FenixFlowGraph.findEdges(draftId, 'module:src/app.js'),
  }), { planId: projectPlanNodeId, referenceId: savedReferenceId, draftId: `draft:rea-ui-fixture:${savedDraft.draftId}`, evidenceId: direct.evidenceId });
  assert.equal(projectPlanGraph.node?.properties?.scope, 'PROJECT');
  assert.equal(projectPlanGraph.node?.status, 'PROJECT_PLAN');
  assert.ok(projectPlanGraph.referenceEdges.some((edge) => edge.type === 'READS'), 'project plan should connect to the reference that informed it');
  assert.ok(projectPlanGraph.profileEdges.some((edge) => edge.type === 'READS'), 'project plan should connect to the selected design profile');
  assert.equal(projectPlanGraph.evidence?.properties?.evidenceId, direct.evidenceId, 'Flow Graph should expose the persisted REA evidence record');
  assert.ok(projectPlanGraph.planEvidenceEdges.some((edge) => edge.type === 'READS'), 'project plan should link to the exact evidence record it used');
  assert.equal(projectPlanGraph.draft?.status, 'PENDING_REVIEW', 'Flow Graph should distinguish a saved proposal from an applied change');
  assert.equal(projectPlanGraph.draft?.properties?.evidenceId, direct.evidenceId);
  assert.equal(projectPlanGraph.draft?.properties?.baseHash, crypto.createHash('sha256').update(draftSource).digest('hex'));
  assert.ok(projectPlanGraph.draftEdges.some((edge) => edge.type === 'CREATES'), 'saved plan should link to the draft it produced');
  assert.ok(projectPlanGraph.draftReferenceEdges.some((edge) => edge.type === 'READS'), 'draft should link to its selected design reference');
  assert.ok(projectPlanGraph.draftSourceEdges.some((edge) => edge.type === 'DERIVED_FROM'), 'draft should point to the exact REA-observed source file without claiming it was applied');
  await page.evaluate(() => window.FenixFlowGraph.close());
  assert.deepEqual(pageErrors, []);
});
