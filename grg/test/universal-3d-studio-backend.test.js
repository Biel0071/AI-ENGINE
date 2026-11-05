'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { handleUniversal3DStudioRoutes } = require('../src/api/universal-3d-studio-routes');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
  return true;
}

function readJson(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (_) {
        resolve({});
      }
    });
  });
}

test('Universal 3D Studio Backend API — Asset Registry, Procedural Engines & City Deployment', async (t) => {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const handled = await handleUniversal3DStudioRoutes(req, res, url, {}, sendJson, readJson, { name: 'Test Operator' });
    if (!handled && !res.headersSent) {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  t.after(() => {
    server.close();
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  // 1. List assets
  const listRes = await fetch(`${baseUrl}/api/v2/studio-3d/assets`);
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.ok, true);
  assert.ok(listData.assets.length >= 4, 'Must have at least 4 default seed assets');

  // 2. Filter by category
  const voxelRes = await fetch(`${baseUrl}/api/v2/studio-3d/assets?category=voxel`);
  const voxelData = await voxelRes.json();
  assert.equal(voxelData.ok, true);
  assert.ok(voxelData.assets.every(a => a.category === 'voxel'));

  // 3. Create custom asset
  const customAssetPayload = {
    name: 'Medieval Watchtower',
    category: 'voxel',
    description: 'Voxel fortified watchtower with stone battlements',
    materials: ['grey_cobblestone', 'dark_oak'],
    stats: { voxels: 420 },
    data: { height: 18, radius: 4 }
  };
  const createRes = await fetch(`${baseUrl}/api/v2/studio-3d/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customAssetPayload)
  });
  assert.equal(createRes.status, 200);
  const createData = await createRes.json();
  assert.equal(createData.ok, true);
  assert.equal(createData.asset.name, 'Medieval Watchtower');
  const createdId = createData.asset.id;

  // 4. Retrieve created asset
  const getRes = await fetch(`${baseUrl}/api/v2/studio-3d/assets/${createdId}`);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.ok, true);
  assert.equal(getData.asset.id, createdId);

  // 5. Deploy to city grid
  const deployRes = await fetch(`${baseUrl}/api/v2/studio-3d/deploy-to-city`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetId: createdId,
      district: 'Engineering',
      coordinates: { x: 25, y: 0, z: -10 },
      scale: 1.2
    })
  });
  assert.equal(deployRes.status, 200);
  const deployData = await deployRes.json();
  assert.equal(deployData.ok, true);
  assert.equal(deployData.asset.deployedInCity, true);
  assert.equal(deployData.asset.cityPlacement.district, 'Engineering');

  // 6. Test AI Generation for Voxel
  const genVoxelRes = await fetch(`${baseUrl}/api/v2/studio-3d/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'voxel', prompt: 'casa moderna com janelas' })
  });
  assert.equal(genVoxelRes.status, 200);
  const genVoxelData = await genVoxelRes.json();
  assert.equal(genVoxelData.ok, true);
  assert.equal(genVoxelData.mode, 'voxel');
  assert.ok(genVoxelData.result.voxels.length > 50, 'Must generate procedural voxels');

  // 7. Test AI Generation for Parametric CAD Gear
  const genCadRes = await fetch(`${baseUrl}/api/v2/studio-3d/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'cad', prompt: 'engrenagem 40 dentes modulo 2.5', parameters: { teeth: 40, module: 2.5 } })
  });
  assert.equal(genCadRes.status, 200);
  const genCadData = await genCadRes.json();
  assert.equal(genCadData.ok, true);
  assert.equal(genCadData.result.parameters.teeth, 40);
  assert.equal(genCadData.result.parameters.pitchDiameter, 100);

  // 8. Delete created asset
  const delRes = await fetch(`${baseUrl}/api/v2/studio-3d/assets/${createdId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);
  const delData = await delRes.json();
  assert.equal(delData.ok, true);
  assert.equal(delData.deletedId, createdId);
});

