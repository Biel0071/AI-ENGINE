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

test('FÊNIX OS — Universal 3D Engineering & Creation Studio E2E Verification', async (t) => {
  const app = express();
  app.use(express.static(publicDir));
  app.use(express.json());

  // Mount Studio 3D API and Project Workspace routes via adapter
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

  // Authoritative endpoints for IDE / System state
  app.get('/api/fenix/projects', (_req, res) => {
    res.json({
      ok: true,
      projects: [
        { id: 'zapai-crm', name: 'ZapAI CRM', workspace: 'active', status: 'ONLINE', framework: 'React + Node.js' },
        { id: 'fenix-os', name: 'Fênix Operating System HQ', workspace: 'active', status: 'ONLINE', framework: 'Vanilla JS' }
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

  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(`http://127.0.0.1:${port}/index.html#ide`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  // Wait for Three.js and Studio Engine scripts to load
  await page.waitForFunction(() => typeof THREE !== 'undefined' && typeof window.FenixUniversal3DStudio !== 'undefined', { timeout: 15000 });

  // ── TEST 1: Navigate to IDE View and switch to 3D & CAD Studio ───────
  await page.evaluate(() => {
    if (typeof window.showView === 'function') {
      window.showView('ide');
    } else if (typeof window.navigateTo === 'function') {
      window.navigateTo('ide');
    } else {
      const v = document.getElementById('view-ide');
      if (v) v.style.display = 'flex';
    }
    window.fenixSetStudioModality('studio3d');
  });
  await page.waitForFunction(() => document.querySelector('#studio3dCanvasContainer canvas') !== null, { timeout: 15000 });

  const btn3DActive = await page.locator('#btnStudio3D').evaluate(el => el.classList.contains('active'));
  assert.ok(btn3DActive, 'btnStudio3D must have active class');

  const studioVisible = await page.locator('#fenixStudio3DView').isVisible();
  assert.ok(studioVisible, 'fenixStudio3DView must be visible');

  // ── TEST 2: Voxel Engine Add, Paint, Undo, Redo ─────────────────────
  const initialVoxelCount = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
  assert.ok(initialVoxelCount > 0, 'Default voxel building must have voxels rendered');

  await page.evaluate(() => window.FenixUniversal3DStudio.addVoxel(0, 10, 0, null, true));
  const countAfterAdd = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
  assert.equal(countAfterAdd, initialVoxelCount + 1, 'Voxel count must increase by 1 after addVoxel');

  await page.evaluate(() => window.FenixUniversal3DStudio.paintVoxel(0, 10, 0, { color: 0xF43F5E, name: 'Redstone' }, true));
  await page.evaluate(() => window.FenixUniversal3DStudio.undo());
  await page.evaluate(() => window.FenixUniversal3DStudio.redo());

  const shotVoxel = path.join(screenshotsDir, 'studio3d_voxel_builder.png');
  await page.screenshot({ path: shotVoxel });
  assert.ok(fs.existsSync(shotVoxel), 'Voxel builder screenshot must exist');

  // ── TEST 3: Voxel Character Factory (Head, Torso, Limbs, Wings) ──────
  await page.evaluate(() => window.FenixUniversal3DStudio.buildVoxelCharacter('walk'));
  const charVoxelCount = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
  assert.ok(charVoxelCount >= 30, 'Voxel character must compose head, torso, limbs and wings');

  const shotChar = path.join(screenshotsDir, 'studio3d_voxel_character.png');
  await page.screenshot({ path: shotChar });
  assert.ok(fs.existsSync(shotChar), 'Voxel character screenshot must exist');

  // ── TEST 4: Building Factory (Multi-Floor Voxel House & Roof) ────────
  await page.evaluate(() => window.FenixUniversal3DStudio.buildVoxelHouse(2));
  const houseVoxelCount = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
  assert.ok(houseVoxelCount >= 100, 'Voxel house must have walls, floors, windows and roof');

  const shotHouse = path.join(screenshotsDir, 'studio3d_voxel_house.png');
  await page.screenshot({ path: shotHouse });
  assert.ok(fs.existsSync(shotHouse), 'Voxel house screenshot must exist');

  // ── TEST 5: World Builder Terrain (Hills & River) ────────────────────
  await page.evaluate(() => window.FenixUniversal3DStudio.buildTerrain('hills'));
  const terrainVoxelCount = await page.evaluate(() => window.FenixUniversal3DStudio.voxels.size);
  assert.ok(terrainVoxelCount >= 100, 'Terrain must generate hills, stone layers, and river');

  const shotTerrain = path.join(screenshotsDir, 'studio3d_voxel_terrain.png');
  await page.screenshot({ path: shotTerrain });
  assert.ok(fs.existsSync(shotTerrain), 'Voxel terrain screenshot must exist');

  // ── TEST 6: Parametric CAD Spur Gear Generator ──────────────────────
  await page.evaluate(() => window.FenixUniversal3DStudio.setSubMode('cad'));
  await page.waitForTimeout(600);

  const cadTabVisible = await page.locator('#studioTabCad').isVisible();
  assert.ok(cadTabVisible, 'CAD properties tab must be visible in CAD mode');

  await page.locator('#studioCadTeeth').fill('24');
  await page.evaluate(() => window.FenixUniversal3DStudio.recalculateGear());
  await page.waitForTimeout(400);

  const gear1Exists = await page.evaluate(() => !!window.FenixUniversal3DStudio.gear1Mesh);
  const gear2Exists = await page.evaluate(() => !!window.FenixUniversal3DStudio.gear2Mesh);
  assert.ok(gear1Exists, 'Primary parametric spur gear mesh must be generated');
  assert.ok(gear2Exists, 'Mating kinematic gear mesh must be generated');

  await page.evaluate(() => window.FenixUniversal3DStudio.toggleKinematicSim());
  const kinActive = await page.evaluate(() => window.FenixUniversal3DStudio.kinematicSimActive);
  assert.ok(kinActive, 'Kinematic simulation must be active');

  const shotCad = path.join(screenshotsDir, 'studio3d_cad_gear.png');
  await page.screenshot({ path: shotCad });
  assert.ok(fs.existsSync(shotCad), 'CAD gear screenshot must exist');

  // ── TEST 7: Mesh & Tripo AI Avatar Loading ──────────────────────────
  await page.evaluate(() => window.FenixUniversal3DStudio.setSubMode('mesh'));
  await page.waitForTimeout(600);

  const meshModelExists = await page.evaluate(() => !!window.FenixUniversal3DStudio.meshModel);
  assert.ok(meshModelExists, 'Tripo AI Cyber Mascot mesh model must be mounted');

  await page.evaluate(() => window.FenixUniversal3DStudio.toggleWireframe());
  const isWireframe = await page.evaluate(() => window.FenixUniversal3DStudio.wireframeMode);
  assert.ok(isWireframe, 'Wireframe mode must be toggled on');

  const shotMesh = path.join(screenshotsDir, 'studio3d_mesh_mascot.png');
  await page.screenshot({ path: shotMesh });
  assert.ok(fs.existsSync(shotMesh), 'Mesh mascot screenshot must exist');

  // ── TEST 8: Asset Catalog & City Deployment ─────────────────────────
  await page.evaluate(() => window.FenixUniversal3DStudio.toggleAssetDrawer());
  await page.waitForTimeout(500);

  const drawerVisible = await page.locator('#studioAssetDrawer').isVisible();
  assert.ok(drawerVisible, 'Asset catalog drawer must be visible');

  const cardCount = await page.locator('#studioAssetGrid > div').count();
  assert.ok(cardCount >= 3, 'Must render initial catalog asset cards');

  const deployRes = await page.evaluate(async () => {
    const res = await fetch('/api/v2/studio-3d/deploy-to-city', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId: 'asset-cad-spur-gear-m2-z30',
        district: 'Dev Loft',
        coordinates: { x: 80, y: 0, z: 80 },
        scale: 1.2
      })
    });
    return res.json();
  });

  assert.ok(deployRes.ok, 'Deploy to city must return ok: true');
  assert.ok(deployRes.asset.deployedInCity, 'Deployed asset must have deployedInCity: true');
  assert.equal(deployRes.asset.cityPlacement.coordinates.x, 80, 'Position X must match deployment coordinates');

  const shotCatalog = path.join(screenshotsDir, 'studio3d_asset_catalog.png');
  await page.screenshot({ path: shotCatalog });
  assert.ok(fs.existsSync(shotCatalog), 'Asset catalog screenshot must exist');

  // ── TEST 9: Holographic Digital Twin Platform (Image 2 Parity) ──────
  await page.evaluate(() => {
    if (typeof window.showView === 'function') window.showView('city');
    window.FenixSpatialCity?.toggleHologramMode();
  });
  await page.waitForTimeout(600);

  const isHoloActive = await page.evaluate(() => document.getElementById('view-city')?.classList.contains('fenix-holographic-mode'));
  assert.ok(isHoloActive, 'view-city must have fenix-holographic-mode class');

  const holoOverlayExists = await page.locator('#fenixHoloHudOverlay').isVisible();
  assert.ok(holoOverlayExists, 'fenixHoloHudOverlay must be visible in holographic mode');

  const shotHolo = path.join(screenshotsDir, 'spatial_city_holographic_mode.png');
  await page.screenshot({ path: shotHolo });
  assert.ok(fs.existsSync(shotHolo), 'Holographic city mode screenshot must exist');

  await page.close();
});
