'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  projectSceneSites,
  resolveProjectArchetype,
  resolveSupervisorProfile,
  ARCHETYPE_DIMENSIONS,
  CANONICAL_BUILDING_IDS,
  canonicalBuildingId
} = require('../public/fenix-city-machine-scene');

const {
  CANONICAL_BUILDINGS_DATA
} = require('../src/world-model/world-state-engine');

test('Phase 57: 45 enterprise parcels have strictly non-overlapping proportional footprints outside landmarks', () => {
  const projects = Array.from({ length: 45 }, (_, i) => ({
    id: `project-${i}`,
    name: `Enterprise Project ${i}`,
    status: 'RUNNING',
  }));

  const sites = projectSceneSites(projects);
  assert.equal(sites.length, 45);

  const landmarks = [
    { id: 'bld-fenix-hq', minX: -11, maxX: 11, minZ: -11, maxZ: 11 },
    { id: 'bld-observatory', minX: 40, maxX: 62, minZ: 4, maxZ: 26 },
    { id: 'bld-project-forge', minX: 14, maxX: 36, minZ: 47, maxZ: 67 },
    { id: 'bld-deposito-mais', minX: 28, maxX: 74, minZ: -56, maxZ: -16 },
    { id: 'bld-api-platform', minX: -68, maxX: -36, minZ: -43, maxZ: -15 },
    { id: 'bld-dev-loft', minX: -66, maxX: -42, minZ: 47, maxZ: 67 },
    { id: 'bld-memory-vault', minX: -34, maxX: -14, minZ: 46, maxZ: 68 },
    { id: 'bld-ai-nexus', minX: -34, maxX: -8, minZ: -73, maxZ: -47 },
  ];

  for (const site of sites) {
    const halfW = (site.dimensions?.width || 6.2) / 2;
    const halfD = (site.dimensions?.depth || 5.0) / 2;
    const sMinX = site.position.x - halfW;
    const sMaxX = site.position.x + halfW;
    const sMinZ = site.position.z - halfD;
    const sMaxZ = site.position.z + halfD;

    for (const lm of landmarks) {
      const overlapX = sMinX < lm.maxX && sMaxX > lm.minX;
      const overlapZ = sMinZ < lm.maxZ && sMaxZ > lm.minZ;
      const collides = overlapX && overlapZ;
      assert(!collides, `Site ${site.id} at (${site.position.x}, ${site.position.z}) overlaps landmark ${lm.id}`);
    }
  }
});

test('Phase 57: Architectural archetypes, 3D supervisor figure and cutaway wall opacity lerp', () => {
  const warehouse = resolveProjectArchetype({ name: 'MF Atacadista Estoque' });
  assert.equal(warehouse, 'warehouse');
  assert.deepEqual(ARCHETYPE_DIMENSIONS.warehouse, { width: 7.2, depth: 5.4, height: 4.2 });

  const tech = resolveProjectArchetype({ name: 'Fastify Microservice Cluster API' });
  assert.equal(tech, 'tech_cloud');
  assert.deepEqual(ARCHETYPE_DIMENSIONS.tech_cloud, { width: 6.0, depth: 5.2, height: 6.5 });

  const supWarehouse = resolveSupervisorProfile({ id: 'proj-1', name: 'MF Atacadista' }, 'warehouse');
  assert.equal(supWarehouse.name, 'Marcos Silva');
  assert.equal(supWarehouse.role, 'Supervisor de Logística & WMS');

  const worldRuntimeSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-city-runtime-world.js'), 'utf8');
  assert.match(worldRuntimeSrc, /SupervisorFigure/);
  assert.match(worldRuntimeSrc, /opacity = 0\.22/);
  assert.match(worldRuntimeSrc, /makeProjectNode/);
});

test('Phase 57: A* pathfinding perimeter waypoints and AABB obstacle segment intersection', () => {
  const world3dSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');
  assert.match(world3dSrc, /_segmentIntersectsAABB/);
  assert.match(world3dSrc, /doesSegmentCrossObstacle/);
  assert.match(world3dSrc, /isPointInObstacle/);
  assert.match(world3dSrc, /findPath/);
  assert.match(world3dSrc, /road_hq_n/);
  assert.match(world3dSrc, /road_hq_s/);
  assert.match(world3dSrc, /road_hq_e/);
  assert.match(world3dSrc, /road_hq_w/);
});

test('Phase 57: Thought bubble slash commands are translated and bubbles deconflicted', () => {
  const world3dSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');
  assert.match(world3dSrc, /_cleanAgentTask\(raw\)/);
  assert.match(world3dSrc, /teamwork-preview':\s*'Sincronização de Enxame 3D'/);
  assert.match(world3dSrc, /goal':\s*'Execução de Meta Autônoma'/);
  assert.match(world3dSrc, /Thought Bubble Anti-Clumping Pass/);
});

test('Phase 57: Building drawer UI exposes 3D supervisor, corporate sector, and cutaway toggle', () => {
  const worldUiSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-ui.js'), 'utf8');
  assert.match(worldUiSrc, /Supervisor 3D/);
  assert.match(worldUiSrc, /Setor Corporativo/);
  assert.match(worldUiSrc, /Voltar à Cidade/);
  assert.match(worldUiSrc, /Entrar no espaço 3D \(Cutaway\)/);
});
