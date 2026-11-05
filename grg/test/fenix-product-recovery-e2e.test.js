'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const { chromium } = require('playwright');

const publicDir = path.resolve(__dirname, '..', 'public');
const screenshotsDir = path.resolve(__dirname, '..', '..', 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test('FÊNIX OS — Critical Product Recovery & Workspace Quality E2E Verification', async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  app.use(express.json());

  // Mount real Project Workspace & Studio 3D routes
  const { handleUniversal3DStudioRoutes } = require('../src/api/universal-3d-studio-routes');
  const { handleProjectWorkspaceRoutes } = require('../src/api/project-workspace-routes');

  const mockApp = {
    controlPlane: { authorize: async () => true },
    store: { read: async () => ({ projects: [] }), write: async () => {} }
  };

  app.use(async (req, res, next) => {
    const sendJson = (r, status, data) => r.status(status).json(data);
    const readJson = async (r) => r.body;
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

    if (req.url.startsWith('/api/v2/studio-3d')) {
      const handled = await handleUniversal3DStudioRoutes(req, res, url, {}, sendJson, readJson, { tenantId: 'tenant-fnx' });
      if (handled || res.headersSent) return;
    }

    if (req.url.startsWith('/api/fenix/projects/') || req.url.startsWith('/api/v2/projects/')) {
      try {
        const handled = await handleProjectWorkspaceRoutes(req, res, url, mockApp, sendJson, readJson, { tenantId: 'tenant-fnx', actorId: 'usr-admin' });
        if (handled || res.headersSent) return;
      } catch (err) {
        console.error('Test project workspace route error:', err);
      }
    }
    next();
  });

  // Projects catalog with fenix-os and zapai-crm
  app.get('/api/fenix/projects', (_req, res) => {
    res.json({
      ok: true,
      projects: [
        { id: 'fenix-os', name: 'Fênix Operating System HQ', workspace: 'active', status: 'ONLINE', framework: 'Vanilla JS' },
        { id: 'zapai-crm', name: 'ZapAI CRM', workspace: 'active', status: 'ONLINE', framework: 'React + Node.js' }
      ]
    });
  });

  app.get('/api/v2/auth/check', (_req, res) => {
    res.json({ authenticated: true, user: { id: 'usr-admin', role: 'admin' }, tenantId: 'tenant-fnx' });
  });

  app.get('/api/v2/visual-workspace/agents', (_req, res) => {
    res.json({ ok: true, agents: [] });
  });

  const server = app.listen(0);
  const port = server.address().port;

  let browser;
  t.after(async () => {
    if (browser) await browser.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--no-sandbox']
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 1: 18-STEP COMPLETE FUNCTIONAL LIFECYCLE (PHASE 8)
  // ══════════════════════════════════════════════════════════════════════════
  await t.test('18-Step Product Recovery Functional Lifecycle', async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

    // Step 1: Open Fênix OS
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Step 2: Open City & Verify City View
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
    });
    await page.waitForTimeout(600);
    const cityVisible = await page.locator('#view-city').isVisible();
    assert.ok(cityVisible, 'Step 2: #view-city must be visible in City View');
    const cityMounted = await page.evaluate(() => {
      const c = document.querySelector('#view-city canvas') || document.querySelector('.fenix-world-3d');
      return !!c;
    });
    assert.ok(cityMounted, 'Step 2: City rendering container must be mounted in DOM');

    // Step 3: Navigate to IDE
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('ide');
    });
    await page.waitForTimeout(600);
    const ideVisible = await page.locator('#view-ide').isVisible();
    assert.ok(ideVisible, 'Step 3: #view-ide must be visible');

    // Step 4: Load real project (fenix-os) and verify NO HTTP 404 in tree
    await page.waitForFunction(() => {
      const select = document.getElementById('fenixIdeProject');
      return select && select.options.length > 0;
    }, { timeout: 10000 });

    await page.evaluate(() => {
      const select = document.getElementById('fenixIdeProject');
      if (select) {
        select.value = 'fenix-os';
        select.dispatchEvent(new Event('change'));
      }
    });
    await page.waitForTimeout(1500);

    // Check tree loaded without 404
    const treeText = await page.locator('#fenixIdeLiveTree').innerText();
    assert.ok(!treeText.includes('404'), `Step 4: Tree must not contain 404. Got: ${treeText}`);
    assert.ok(!treeText.includes('Falha: HTTP'), `Step 4: Tree must not show failure. Got: ${treeText}`);

    // Step 5 & 6: File opened and Central Editor is NOT empty
    await page.waitForFunction(() => {
      const editor = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeSimpleEditor');
      const text = editor ? (editor.value || editor.innerText || '') : '';
      return text.length > 20;
    }, { timeout: 10000 });

    const editorContent = await page.evaluate(() => {
      const ed = document.getElementById('fenixIdeCodeEditor') || document.getElementById('fenixIdeSimpleEditor');
      return ed ? (ed.value || ed.innerText || '') : '';
    });
    assert.ok(editorContent.length > 20, 'Step 5/6: Central Editor must contain real file content');
    assert.ok(!editorContent.includes('Selecione um arquivo'), 'Step 5/6: Editor must not show placeholder "Selecione um arquivo"');

    // Capture screenshot of recovered IDE Explorer & Central Editor
    const shotIde = path.join(screenshotsDir, 'recovery_1920x1080_ide_explorer_editor.png');
    await page.screenshot({ path: shotIde });
    assert.ok(fs.existsSync(shotIde), 'IDE explorer screenshot must exist');

    // Step 7: Open Preview
    await page.evaluate(() => {
      if (typeof window.fenixSetIdeMode === 'function') {
        window.fenixSetIdeMode('preview');
      } else {
        const btn = document.getElementById('btnIdeModePreview');
        if (btn) btn.click();
      }
    });
    await page.waitForTimeout(400);
    const previewPaneVisible = await page.locator('#fenixIdePreviewPane').isVisible();
    assert.ok(previewPaneVisible, 'Step 7: Preview pane must be visible in preview mode');

    // Step 8: Open Terminal dock
    await page.evaluate(() => {
      if (typeof window.fenixToggleDockTray === 'function') window.fenixToggleDockTray();
    });
    await page.waitForTimeout(400);
    const dockHeight = await page.locator('#fenixIdeDockTray').evaluate(el => el.clientHeight);
    assert.ok(dockHeight >= 100, `Step 8: Dock height must expand (>100px). Got: ${dockHeight}px`);

    // Step 9: Switch to 3D Studio
    await page.evaluate(() => {
      if (typeof window.fenixSetStudioModality === 'function') window.fenixSetStudioModality('studio3d');
    });
    await page.waitForFunction(() => document.querySelector('#studio3dCanvasContainer canvas') !== null, { timeout: 15000 });
    const studio3dVisible = await page.locator('#fenixStudio3DView').isVisible();
    assert.ok(studio3dVisible, 'Step 9: #fenixStudio3DView must be visible');

    // Step 10: Create and remove a voxel block
    const initialVoxels = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
    await page.evaluate(() => window.FenixUniversal3DStudio.addVoxel(0, 10, 0, null, true));
    const voxelsAfterAdd = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
    assert.equal(voxelsAfterAdd, initialVoxels + 1, 'Step 10: Voxel count must increase by 1 after add');

    await page.evaluate(() => window.FenixUniversal3DStudio.removeVoxel(0, 10, 0, true));
    const voxelsAfterRemove = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
    assert.equal(voxelsAfterRemove, initialVoxels, 'Step 10: Voxel count must return to initial after remove');

    // Step 11: Switch to Mesh mode
    await page.evaluate(() => window.FenixUniversal3DStudio.setSubMode('mesh'));
    await page.waitForTimeout(500);
    const currentModeMesh = await page.evaluate(() => window.FenixUniversal3DStudio.currentMode || window.FenixUniversal3DStudio.subMode);
    assert.equal(currentModeMesh, 'mesh', 'Step 11: Current mode must be mesh');

    // Step 12: Switch to CAD mode
    await page.evaluate(() => window.FenixUniversal3DStudio.setSubMode('cad'));
    await page.waitForTimeout(500);
    const currentModeCAD = await page.evaluate(() => window.FenixUniversal3DStudio.currentMode || window.FenixUniversal3DStudio.subMode);
    assert.equal(currentModeCAD, 'cad', 'Step 12: Current mode must be cad');

    // Step 13: Mode cycling smoothly
    await page.evaluate(() => window.FenixUniversal3DStudio.setSubMode('voxel'));
    await page.waitForTimeout(400);
    const currentModeVoxel = await page.evaluate(() => window.FenixUniversal3DStudio.currentMode || window.FenixUniversal3DStudio.subMode);
    assert.equal(currentModeVoxel, 'voxel', 'Step 13: Mode must cycle back to voxel cleanly');

    // Step 14: Resize panels via Layout Manager
    await page.evaluate(() => {
      window.FenixWorkspaceLayoutManager.setLeftPanelWidth(300);
      window.FenixWorkspaceLayoutManager.setDockHeight(220);
    });
    await page.waitForTimeout(300);
    const leftWidth = await page.locator('#fenixIdeLeftPanel').evaluate(el => el.clientWidth);
    assert.ok(leftWidth >= 280, `Step 14: Left panel width must be resized (approx 300px). Got: ${leftWidth}px`);

    // Step 15: Minimize & restore (Studio Maximize & Inspector Toggle)
    await page.evaluate(() => window.FenixWorkspaceLayoutManager.toggleStudioMaximize());
    await page.waitForTimeout(400);
    const studioMaximized = await page.evaluate(() => window.FenixWorkspaceLayoutManager.state.studioMaximized);
    assert.ok(studioMaximized, 'Step 15: Studio must be maximized');

    // Check Studio canvas occupies wide viewport
    const canvasBboxMax = await page.locator('#studio3dCanvasContainer canvas').boundingBox();
    assert.ok(canvasBboxMax.width >= 1200, `Step 15: Maximized canvas width must be wide (>=1200px). Got: ${canvasBboxMax.width}px`);

    const shotMax = path.join(screenshotsDir, 'recovery_1920x1080_studio3d_maximized.png');
    await page.screenshot({ path: shotMax });
    assert.ok(fs.existsSync(shotMax), 'Maximized studio screenshot must exist');

    // Restore Studio and switch back to Web Studio modality
    await page.evaluate(() => window.FenixWorkspaceLayoutManager.toggleStudioMaximize());
    await page.waitForTimeout(300);

    // Verify returning from Studio 3D to Web Studio modality cleanly unhides Central Editor
    await page.evaluate(() => {
      window.fenixSetStudioModality('web');
    });
    await page.waitForTimeout(400);
    const editorAreaVisible = await page.locator('#fenixIdeEditorArea').isVisible();
    assert.ok(editorAreaVisible, 'Step 15b: Central Editor area must be visible after returning from Studio 3D to Web Studio');
    const editorAreaWidth = await page.locator('#fenixIdeEditorArea').evaluate(el => el.clientWidth);
    assert.ok(editorAreaWidth > 100, `Step 15b: Central Editor width must be positive (>100px). Got: ${editorAreaWidth}px`);

    // Verify all 7 presets exist in the preset dropdown
    const presetOptions = await page.evaluate(() => {
      const select = document.getElementById('fenixWorkspacePresetSelect');
      return select ? Array.from(select.options).map(o => o.value) : [];
    });
    const expectedPresets = ['development', '3d-modeling', 'cad-engineering', 'monitoring', 'city', 'compact', 'custom'];
    for (const exp of expectedPresets) {
      assert.ok(presetOptions.includes(exp), `Step 15c: Layout Preset select must contain '${exp}'`);
    }

    // Step 16: Verify layout persistence & restoreDefaults
    await page.evaluate(() => {
      window.FenixWorkspaceLayoutManager.saveCurrentToStorage();
    });
    const storedPrefs = await page.evaluate(() => localStorage.getItem('fenix_workspace_layout_prefs_v1'));
    assert.ok(storedPrefs !== null, 'Step 16: Layout preferences must be persisted in localStorage');

    // Test restoreDefaults resets preset dropdown
    await page.evaluate(() => window.FenixWorkspaceLayoutManager.restoreDefaults());
    const restoredPreset = await page.evaluate(() => document.getElementById('fenixWorkspacePresetSelect')?.value);
    assert.equal(restoredPreset, 'development', 'Step 16b: restoreDefaults must reset preset dropdown to development');

    // Step 17: Return to City
    await page.evaluate(() => {
      if (typeof window.showView === 'function') window.showView('city');
    });
    await page.waitForTimeout(600);
    const cityVisibleReturn = await page.locator('#view-city').isVisible();
    assert.ok(cityVisibleReturn, 'Step 17: City view must be visible after return');

    // Step 18: Confirm City view and layout integrity
    const cityBbox = await page.locator('#view-city').boundingBox();
    assert.ok(cityBbox.width > 500 && cityBbox.height > 400, 'Step 18: City view must have valid non-zero dimensions');

    const shotCity = path.join(screenshotsDir, 'recovery_city_integrity.png');
    await page.screenshot({ path: shotCity });
    assert.ok(fs.existsSync(shotCity), 'City integrity screenshot must exist');

    await page.close();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SUITE 2: MULTI-VIEWPORT & VISUAL METRICS (PHASE 8 & 9)
  // ══════════════════════════════════════════════════════════════════════════
  const viewports = [
    { name: '1920x1080', width: 1920, height: 1080, shot: 'recovery_1920x1080_studio3d_maximized.png', mode: 'voxel' },
    { name: '1600x900', width: 1600, height: 900, shot: 'recovery_1600x900_studio3d_cad.png', mode: 'cad' },
    { name: '1366x768', width: 1366, height: 768, shot: 'recovery_1366x768_studio3d_mesh.png', mode: 'mesh' },
    { name: '1024x768', width: 1024, height: 768, shot: 'recovery_1024x768_tablet_layout.png', mode: 'voxel' },
    { name: '390x844', width: 390, height: 844, shot: 'recovery_390x844_mobile_adaptive.png', mode: 'voxel' }
  ];

  for (const vp of viewports) {
    await t.test(`Visual & Spatial Verification across ${vp.name} (${vp.mode})`, async () => {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`http://127.0.0.1:${port}/index.html#ide`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(800);

      await page.waitForFunction(() => typeof THREE !== 'undefined' && typeof window.FenixUniversal3DStudio !== 'undefined' && typeof window.FenixWorkspaceLayoutManager !== 'undefined', { timeout: 15000 });

      await page.evaluate((mode) => {
        if (typeof window.showView === 'function') window.showView('ide');
        if (window.FenixWorkspaceLayoutManager?.applyLayout) window.FenixWorkspaceLayoutManager.applyLayout('3d-modeling');
        if (typeof window.fenixSetStudioModality === 'function') window.fenixSetStudioModality('studio3d');
        if (window.FenixUniversal3DStudio?.setSubMode) window.FenixUniversal3DStudio.setSubMode(mode);
      }, vp.mode);

      await page.waitForFunction(() => document.querySelector('#studio3dCanvasContainer canvas') !== null, { timeout: 15000 });
      await page.waitForTimeout(500);

      // Measure Phase 9 Visual Metrics
      const canvasBbox = await page.locator('#studio3dCanvasContainer canvas').boundingBox();
      assert.ok(canvasBbox !== null, `${vp.name}: Canvas bounding box must exist`);
      assert.ok(canvasBbox.width > 0, `${vp.name}: Canvas width must be positive`);
      assert.ok(canvasBbox.height > 0, `${vp.name}: Canvas height must be positive`);

      // In 3D modeling preset, studio viewport must be broad, NOT squeezed into 200px
      if (vp.width >= 1024) {
        const ratio = (canvasBbox.width / vp.width) * 100;
        assert.ok(ratio >= 50, `${vp.name}: Studio canvas ratio (${ratio.toFixed(1)}%) must occupy at least 50% of viewport width`);
      }

      // Check no horizontal overflow of the main body
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scrollWidth <= vp.width + 5, `${vp.name}: Page must not exhibit horizontal overflow (scrollWidth: ${scrollWidth}, vp: ${vp.width})`);

      const shotPath = path.join(screenshotsDir, vp.shot);
      await page.screenshot({ path: shotPath });
      assert.ok(fs.existsSync(shotPath), `${vp.name}: Screenshot ${vp.shot} must exist`);

      await page.close();
    });
  }
});
