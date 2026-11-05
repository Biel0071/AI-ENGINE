'use strict';

/**
 * FÊNIX OS — Universal 3D Engineering & Creation Studio API Routes
 * Manages the Universal Asset Registry, Voxel, Pixel 3D, Mesh/Tripo,
 * Parametric CAD and deployment to the 3D City.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets-3d.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Canonical Seed Assets
const DEFAULT_ASSETS = [
  {
    id: 'asset-tripo-fenix-vanguard',
    name: 'Fênix Vanguard AI Mascot (Tripo)',
    category: 'mesh',
    author: 'Tripo AI / Fênix Core',
    format: 'glb',
    version: '1.0.0',
    description: 'Robotic futuristic mascot with glowing emerald eyes, dark obsidian armor, and mechanical wings.',
    stats: { vertices: 14200, faces: 28400, bones: 48, animations: 5 },
    tags: ['mascot', 'robot', 'tripo', 'rigged', 'cyberpunk'],
    materials: ['obsidian_carbon', 'neon_emerald_glow', 'brushed_titanium'],
    data: {
      type: 'mesh',
      meshType: 'biped_robot',
      hasRigging: true,
      animations: ['idle', 'walk', 'fly', 'salute', 'work'],
      colors: { primary: '#0B0F19', secondary: '#1E293B', accent: '#00F5A0', glow: '#00F5A0' }
    },
    deployedInCity: true,
    cityPlacement: { district: 'Central Core', coordinates: { x: 0, y: 0, z: 0 }, scale: 1.0 },
    createdAt: '2026-11-04T12:00:00.000Z'
  },
  {
    id: 'asset-voxel-cyber-house',
    name: 'Cyber Voxel Headquarters',
    category: 'voxel',
    author: 'Fênix Voxel Builder',
    format: 'voxel',
    version: '1.2.0',
    description: 'Modern 3-story modular house built block-by-block with glazed cyan windows and rooftop solar tiles.',
    stats: { voxels: 1248, dimensions: { width: 16, height: 24, depth: 16 } },
    tags: ['voxel', 'minecraft', 'building', 'architecture'],
    materials: ['dark_concrete', 'cyan_glass', 'glow_light', 'wood_oak'],
    data: {
      type: 'voxel',
      gridSize: 32,
      voxelCount: 1248,
      layers: 3
    },
    deployedInCity: true,
    cityPlacement: { district: 'Engineering', coordinates: { x: 45, y: 0, z: -20 }, scale: 0.8 },
    createdAt: '2026-11-04T14:30:00.000Z'
  },
  {
    id: 'asset-cad-spur-gear-m2-z30',
    name: 'Parametric Spur Gear (M2-Z30)',
    category: 'cad',
    author: 'Fênix Mechanical CAD',
    format: 'step',
    version: '2.0.0',
    description: 'Industrial grade involute spur gear with 30 teeth, module 2, 60mm pitch diameter and 12mm keyway bore.',
    stats: { teeth: 30, module: 2, pitchDiameterMm: 60, faceWidthMm: 15, boreDiameterMm: 12 },
    tags: ['cad', 'mechanical', 'gear', 'parametric', 'solidworks'],
    materials: ['structural_steel_4140', 'nitrided_surface'],
    data: {
      type: 'cad_gear',
      gearType: 'spur',
      parameters: { module: 2, teeth: 30, pressureAngleDeg: 20, faceWidth: 15, bore: 12, hubDiameter: 25 }
    },
    deployedInCity: false,
    createdAt: '2026-11-04T16:00:00.000Z'
  },
  {
    id: 'asset-pixel-habbo-workstation',
    name: 'Habbo Developer Workstation (Furni)',
    category: 'pixel3d',
    author: 'Fênix Pixel Engine',
    format: 'pixel3d',
    version: '1.0.0',
    description: 'Isometric 2.5D developer desk with dual curved monitors, streaming telemetry waveforms and 42U server cabinet.',
    stats: { tiles: { width: 2, depth: 2, height: 3 }, sprites: 8, directions: 4 },
    tags: ['pixel3d', 'habbo', 'furni', 'isometric', 'desk'],
    materials: ['matte_graphite', 'illuminated_screen', 'warm_led'],
    data: {
      type: 'pixel3d',
      facing: 'SE',
      interactive: true,
      seatsCount: 1
    },
    deployedInCity: true,
    cityPlacement: { district: 'Dev Loft', coordinates: { x: -30, y: 2, z: 15 }, scale: 1.0 },
    createdAt: '2026-11-04T18:15:00.000Z'
  }
];

function loadAssets() {
  if (!fs.existsSync(ASSETS_FILE)) {
    fs.writeFileSync(ASSETS_FILE, JSON.stringify(DEFAULT_ASSETS, null, 2), 'utf-8');
    return DEFAULT_ASSETS;
  }
  try {
    const raw = fs.readFileSync(ASSETS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ASSETS;
  } catch (_) {
    return DEFAULT_ASSETS;
  }
}

function saveAssets(assets) {
  try {
    fs.writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Universal3DStudio] Failed to write assets file:', err.message);
    return false;
  }
}

async function handleUniversal3DStudioRoutes(req, res, url, app, sendJson, readJson, identity) {
  const method = req.method;
  const pathname = url.pathname;

  try {
    // 1. List All 3D Assets (with optional ?category= filter)
    if (method === 'GET' && pathname === '/api/v2/studio-3d/assets') {
      const category = url.searchParams.get('category');
      const allAssets = loadAssets();
      const filtered = category ? allAssets.filter(a => a.category === category) : allAssets;
      return sendJson(res, 200, {
        ok: true,
        count: filtered.length,
        total: allAssets.length,
        assets: filtered
      });
    }

    // 2. Get Single Asset by ID
    if (method === 'GET' && pathname.startsWith('/api/v2/studio-3d/assets/')) {
      const id = pathname.replace('/api/v2/studio-3d/assets/', '');
      const allAssets = loadAssets();
      const asset = allAssets.find(a => a.id === id);
      if (!asset) {
        return sendJson(res, 404, { ok: false, error: `Asset '${id}' not found` });
      }
      return sendJson(res, 200, { ok: true, asset });
    }

    // 3. Save / Update 3D Asset
    if (method === 'POST' && pathname === '/api/v2/studio-3d/assets') {
      const payload = await readJson(req);
      if (!payload || !payload.name || !payload.category) {
        return sendJson(res, 400, { ok: false, error: 'Asset must provide name and category' });
      }

      const allAssets = loadAssets();
      const assetId = payload.id || `asset-${payload.category}-${Date.now()}`;
      const existingIdx = allAssets.findIndex(a => a.id === assetId);

      const updatedAsset = {
        id: assetId,
        name: payload.name,
        category: payload.category,
        author: payload.author || identity?.name || 'Fênix Operator',
        format: payload.format || (payload.category === 'voxel' ? 'voxel' : payload.category === 'cad' ? 'step' : 'glb'),
        version: payload.version || '1.0.0',
        description: payload.description || '',
        stats: payload.stats || {},
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        materials: Array.isArray(payload.materials) ? payload.materials : [],
        data: payload.data || {},
        deployedInCity: Boolean(payload.deployedInCity),
        cityPlacement: payload.cityPlacement || null,
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        allAssets[existingIdx] = { ...allAssets[existingIdx], ...updatedAsset };
      } else {
        updatedAsset.createdAt = new Date().toISOString();
        allAssets.unshift(updatedAsset);
      }

      saveAssets(allAssets);
      return sendJson(res, 200, { ok: true, asset: updatedAsset });
    }

    // 4. Delete Asset by ID
    if (method === 'DELETE' && pathname.startsWith('/api/v2/studio-3d/assets/')) {
      const id = pathname.replace('/api/v2/studio-3d/assets/', '');
      let allAssets = loadAssets();
      const before = allAssets.length;
      allAssets = allAssets.filter(a => a.id !== id);
      if (allAssets.length === before) {
        return sendJson(res, 404, { ok: false, error: `Asset '${id}' not found` });
      }
      saveAssets(allAssets);
      return sendJson(res, 200, { ok: true, deletedId: id });
    }

    // 5. Deploy Asset to City Grid
    if (method === 'POST' && pathname === '/api/v2/studio-3d/deploy-to-city') {
      const payload = await readJson(req);
      const assetId = payload?.assetId;
      if (!assetId) {
        return sendJson(res, 400, { ok: false, error: 'Missing assetId' });
      }

      const allAssets = loadAssets();
      const asset = allAssets.find(a => a.id === assetId);
      if (!asset) {
        return sendJson(res, 404, { ok: false, error: `Asset '${assetId}' not found` });
      }

      asset.deployedInCity = true;
      asset.cityPlacement = {
        district: payload.district || 'Central Core',
        coordinates: payload.coordinates || { x: 0, y: 0, z: 0 },
        scale: payload.scale || 1.0,
        rotationY: payload.rotationY || 0,
        deployedAt: new Date().toISOString()
      };

      saveAssets(allAssets);

      // Emit event on bus if available
      if (app?.bus?.emit) {
        app.bus.emit('city.asset.deployed', { assetId, placement: asset.cityPlacement });
      }

      return sendJson(res, 200, {
        ok: true,
        message: `Asset '${asset.name}' deployed to 3D City at ${asset.cityPlacement.district}`,
        asset
      });
    }

    // 6. AI Generation Engine Simulator (Procedural Voxel, CAD Gear, Pixel Avatar, Tripo Mesh)
    if (method === 'POST' && pathname === '/api/v2/studio-3d/generate') {
      const payload = await readJson(req);
      const prompt = payload?.prompt || 'modern house';
      const studioMode = payload?.mode || 'voxel'; // voxel | pixel3d | mesh | cad

      let generatedData = null;

      if (studioMode === 'voxel') {
        // Procedural Voxel generator based on prompt
        const voxels = [];
        const isHouse = /casa|house|prédio|building/i.test(prompt);
        const size = isHouse ? 12 : 8;
        const height = isHouse ? 10 : 8;
        
        for (let x = 0; x < size; x++) {
          for (let z = 0; z < size; z++) {
            // Floor
            voxels.push({ x: x - size / 2, y: 0, z: z - size / 2, color: '#334155', material: 'stone' });
            // Walls
            if (x === 0 || x === size - 1 || z === 0 || z === size - 1) {
              for (let y = 1; y < height; y++) {
                // Window gap
                const isWindow = (x === 0 || x === size - 1) && y >= 3 && y <= 5 && z >= 3 && z <= size - 4;
                if (!isWindow) {
                  voxels.push({ x: x - size / 2, y, z: z - size / 2, color: '#1E293B', material: 'dark_wall' });
                } else {
                  voxels.push({ x: x - size / 2, y, z: z - size / 2, color: '#00D9FF', material: 'cyan_glass' });
                }
              }
            }
            // Roof
            voxels.push({ x: x - size / 2, y: height, z: z - size / 2, color: '#00F5A0', material: 'solar_tile' });
          }
        }

        generatedData = {
          type: 'voxel',
          gridSize: 32,
          voxelsCount: voxels.length,
          voxels,
          metadata: { prompt, generatedBy: 'Fênix Voxel Procedural AI Engine' }
        };
      } else if (studioMode === 'cad') {
        // Parametric Gear Calculation
        const teeth = parseInt(payload?.parameters?.teeth, 10) || 30;
        const mod = parseFloat(payload?.parameters?.module) || 2;
        const pitchDiameter = mod * teeth;
        const outerDiameter = mod * (teeth + 2);
        const rootDiameter = mod * (teeth - 2.5);

        generatedData = {
          type: 'cad_gear',
          parameters: {
            teeth,
            module: mod,
            pitchDiameter,
            outerDiameter,
            rootDiameter,
            faceWidth: 15,
            bore: 12,
            pressureAngle: 20
          },
          metadata: { prompt, kinematics: 'Involute Spur Gear Standard ISO 53' }
        };
      } else if (studioMode === 'pixel3d') {
        // Isometric 2.5D Character / Furni
        generatedData = {
          type: 'pixel3d',
          category: /furni|móvel|mesa|desk/i.test(prompt) ? 'furni' : 'character',
          facing: 'SE',
          layers: ['head', 'torso', 'limbs', 'armor', 'wings'],
          palette: ['#0B0F19', '#00D9FF', '#00F5A0', '#F8FAFC']
        };
      } else {
        // Mesh / Tripo AI Spec
        generatedData = {
          type: 'mesh',
          provider: 'Tripo AI Gateway Adapter',
          meshFormat: 'glb',
          taskId: `tripo-task-${Date.now()}`,
          status: 'READY',
          modelUrl: '/assets/models/fenix-mascot-tripo.glb',
          materials: ['obsidian_carbon', 'neon_emerald_glow'],
          emissiveGlow: '#00F5A0'
        };
      }

      return sendJson(res, 200, {
        ok: true,
        mode: studioMode,
        prompt,
        result: generatedData
      });
    }

    return null; // Not handled by this sub-router
  } catch (err) {
    console.error('[Universal3DStudio] Error:', err);
    return sendJson(res, 500, { ok: false, error: err.message });
  }
}

module.exports = {
  handleUniversal3DStudioRoutes
};

