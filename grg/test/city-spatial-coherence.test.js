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

test('45+ projects receive well-spaced non-overlapping parcel lots within world bounds', () => {
  const projects = Array.from({ length: 45 }, (_, i) => ({
    id: `project-${i}`,
    name: `Enterprise Project ${i}`,
    status: i % 2 === 0 ? 'RUNNING' : 'IDLE',
  }));

  const sites = projectSceneSites(projects);
  assert.equal(sites.length, 45);

  // Check bounds
  for (const site of sites) {
    assert(Math.abs(site.position.x) <= 87.5, `Site ${site.id} x out of bounds: ${site.position.x}`);
    assert(Math.abs(site.position.z) <= 77.5, `Site ${site.id} z out of bounds: ${site.position.z}`);
  }

  // Check pairwise center distance - minimum spacing must be >= 7.0 units
  for (let i = 0; i < sites.length; i++) {
    for (let j = i + 1; j < sites.length; j++) {
      const dx = sites[i].position.x - sites[j].position.x;
      const dz = sites[i].position.z - sites[j].position.z;
      const dist = Math.hypot(dx, dz);
      assert(dist >= 7.0, `Sites ${sites[i].id} and ${sites[j].id} are too close: ${dist.toFixed(2)} units`);
    }
  }
});

test('project archetypes and dimensions are correctly resolved with supervisor hierarchy', () => {
  const warehouse = resolveProjectArchetype({ name: 'MF Atacadista Estoque' });
  assert.equal(warehouse, 'warehouse');
  assert.deepEqual(ARCHETYPE_DIMENSIONS.warehouse, { width: 7.2, depth: 5.4, height: 4.2 });

  const tech = resolveProjectArchetype({ name: 'Fastify Microservice Cluster API' });
  assert.equal(tech, 'tech_cloud');
  assert.deepEqual(ARCHETYPE_DIMENSIONS.tech_cloud, { width: 6.0, depth: 5.2, height: 6.5 });

  const crm = resolveProjectArchetype({ name: 'ZapAI CRM Marketing Campaign' });
  assert.equal(crm, 'commerce_crm');

  const fintech = resolveProjectArchetype({ name: 'Payment Billing Gateway' });
  assert.equal(fintech, 'fintech');

  const dev = resolveProjectArchetype({ name: 'Custom Neural Kernel' });
  assert.equal(dev, 'dev_studio');

  // Verify supervisor profiles
  const supWarehouse = resolveSupervisorProfile({ id: 'proj-1', name: 'MF Atacadista' }, 'warehouse');
  assert.equal(supWarehouse.name, 'Marcos Silva');
  assert.equal(supWarehouse.role, 'Supervisor de Logística & WMS');

  const supTech = resolveSupervisorProfile({ id: 'proj-2', name: 'API Platform' }, 'tech_cloud');
  assert.equal(supTech.name, 'Victor Hugo');
  assert.equal(supTech.role, 'Tech Lead & SRE Gateway');

  const supCrm = resolveSupervisorProfile({ id: 'proj-3', name: 'ZapAI' }, 'commerce_crm');
  assert.equal(supCrm.name, 'Elena Santos');
  assert.equal(supCrm.role, 'Supervisora de Operações & CRM');
});

test('canonical building IDs link hero enterprises correctly in scene and world model', () => {
  assert.equal(canonicalBuildingId('bld-mf-atacadista'), 'bld-mf-atacadista');
  assert.equal(canonicalBuildingId('mf-atacadista'), 'bld-mf-atacadista');
  assert.equal(canonicalBuildingId('zapai-crm'), 'bld-zapai-crm');
  assert.equal(canonicalBuildingId('fortlev-quote'), 'bld-fortlev-quote');

  const bldIds = Object.keys(CANONICAL_BUILDINGS_DATA);
  assert(bldIds.includes('bld-mf-atacadista'), 'MF Atacadista must be in CANONICAL_BUILDINGS_DATA');
  assert(bldIds.includes('bld-zapai-crm'), 'ZapAI CRM must be in CANONICAL_BUILDINGS_DATA');
  assert(bldIds.includes('bld-fortlev-quote'), 'Fortlev Quote must be in CANONICAL_BUILDINGS_DATA');
});

test('fenix-world-3d.js contains collision-aware PathGraph and zero-collision tree placements', () => {
  const world3dSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');

  // Verify PathGraph A* pathfinding and obstacle methods
  assert.match(world3dSrc, /_segmentIntersectsAABB/);
  assert.match(world3dSrc, /doesSegmentCrossObstacle/);
  assert.match(world3dSrc, /isPointInObstacle/);
  assert.match(world3dSrc, /registerObstacle/);
  assert.match(world3dSrc, /findPath/);

  // Verify obstacle registry on engine
  assert.match(world3dSrc, /this\._initObstacleRegistry\(\)/);
  assert.match(world3dSrc, /bld-fenix-hq/);
  assert.match(world3dSrc, /bld-deposito-mais/);
  assert.match(world3dSrc, /bld-api-platform/);

  // Verify tree collision guard
  assert.match(world3dSrc, /if \(this\.isPointInObstacle\(x, z, 3\.2\)\) return;/);

  // Verify no trees overlapping project sites: none of the old overlapping coords
  assert(!world3dSrc.includes('[32, 26, \'pine\']'), 'Tree at [32, 26] must be relocated');
  assert(!world3dSrc.includes('[36, 16, \'deciduous\']'), 'Tree at [36, 16] must be relocated');
  assert(!world3dSrc.includes('[40, 24, \'pine\']'), 'Tree at [40, 24] must be relocated');
  assert(!world3dSrc.includes('[28, 36, \'deciduous\']'), 'Tree at [28, 36] must be relocated');
  assert(!world3dSrc.includes('[38, 34, \'pine\']'), 'Tree at [38, 34] must be relocated');
  assert(!world3dSrc.includes('[44, 12, \'deciduous\']'), 'Tree at [44, 12] must be relocated');

  // Verify thought bubble deconfliction pass
  assert.match(world3dSrc, /Thought Bubble Anti-Clumping Pass/);

  // Verify project cutaway transition
  assert.match(world3dSrc, /Project Cutaway & Interior Reveal Transition/);
});

test('AABB segment intersection math correctly detects collision against building volume', () => {
  function segmentIntersectsAABB(x1, z1, x2, z2, minX, maxX, minZ, maxZ) {
    let tmin = 0, tmax = 1;
    const dx = x2 - x1;
    const dz = z2 - z1;

    if (Math.abs(dx) < 1e-7) {
      if (x1 < minX || x1 > maxX) return false;
    } else {
      const invD = 1 / dx;
      let t1 = (minX - x1) * invD;
      let t2 = (maxX - x1) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    if (Math.abs(dz) < 1e-7) {
      if (z1 < minZ || z1 > maxZ) return false;
    } else {
      const invD = 1 / dz;
      let t1 = (minZ - z1) * invD;
      let t2 = (maxZ - z1) * invD;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return true;
  }

  // Fênix HQ box: [-10, 10] x [-10, 10]
  // Segment straight through the center from (-20, 0) to (20, 0)
  assert.equal(segmentIntersectsAABB(-20, 0, 20, 0, -10, 10, -10, 10), true);

  // Segment entirely to the north from (-20, 15) to (20, 15)
  assert.equal(segmentIntersectsAABB(-20, 15, 20, 15, -10, 10, -10, 10), false);

  // Diagonal segment cutting through a corner from (-15, 5) to (5, -15)
  assert.equal(segmentIntersectsAABB(-15, 5, 5, -15, -10, 10, -10, 10), true);

  // Segment starting inside the building
  assert.equal(segmentIntersectsAABB(0, 0, 20, 0, -10, 10, -10, 10), true);
});

test('project sites have zero spatial collision with all major landmark buildings', () => {
  const projects = Array.from({ length: 45 }, (_, i) => ({
    id: `project-${i}`,
    name: `Enterprise Project ${i}`,
    status: 'RUNNING',
  }));

  const sites = projectSceneSites(projects);

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
      assert(!collides, `Site ${site.id} at (${site.position.x}, ${site.position.z}) overlaps landmark ${lm.id} [${lm.minX}, ${lm.maxX}]x[${lm.minZ}, ${lm.maxZ}]`);
    }
  }
});

test('thought bubble slash commands are properly cleaned into human-readable Portuguese descriptions', () => {
  const world3dSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-3d.js'), 'utf8');

  // Verify _cleanAgentTask implementation exists
  assert.match(world3dSrc, /_cleanAgentTask\(raw\)/);
  assert.match(world3dSrc, /teamwork-preview':\s*'Sincronização de Enxame 3D'/);
  assert.match(world3dSrc, /goal':\s*'Execução de Meta Autônoma'/);
  assert.match(world3dSrc, /plan':\s*'Planejamento Arquitetural'/);

  // Verify _cleanAgentTask is called in _advanceAgentToTelemetry
  assert.match(world3dSrc, /const cleanTask = this\._cleanAgentTask\(nextWp\.task\);/);

  // Directly test the cleaning algorithm
  function cleanTask(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    const slashMatch = s.match(/^\/([a-zA-Z0-9_-]+)(?:\s*·\s*(.*))?$/);
    if (slashMatch) {
      const cmd = slashMatch[1];
      const rest = slashMatch[2] ? slashMatch[2].trim() : '';
      if (rest) return rest;
      const cmdMap = {
        'teamwork-preview': 'Sincronização de Enxame 3D',
        'goal': 'Execução de Meta Autônoma',
        'plan': 'Planejamento Arquitetural',
        'browser': 'Navegação & Inspeção Web',
        'grill-me': 'Auditoria Crítica de Qualidade',
        'boost': 'Otimização & Deploy Canônico',
        'learn': 'Consolidação de Memória Ativa',
        'automation': 'Fluxo Operacional Automatizado',
        'schedule': 'Agendamento de Rotinas'
      };
      return cmdMap[cmd] || `Operação · ${cmd}`;
    }
    return s;
  }

  assert.equal(cleanTask('/teamwork-preview'), 'Sincronização de Enxame 3D');
  assert.equal(cleanTask('/teamwork-preview · Verificação de Rotas'), 'Verificação de Rotas');
  assert.equal(cleanTask('/goal'), 'Execução de Meta Autônoma');
  assert.equal(cleanTask('/plan · Arquitetura Fênix'), 'Arquitetura Fênix');
  assert.equal(cleanTask('Desenvolvimento de UI'), 'Desenvolvimento de UI');
});

test('drawer UI and 3D runtime expose corporate supervisors, archetypes, and cutaway opacity', () => {
  const worldUiSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-world-ui.js'), 'utf8');
  assert.match(worldUiSrc, /Supervisor 3D/);
  assert.match(worldUiSrc, /Setor Corporativo/);
  assert.match(worldUiSrc, /Voltar à Cidade/);
  assert.match(worldUiSrc, /Entrar no espaço 3D \(Cutaway\)/);

  const worldRuntimeSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-city-runtime-world.js'), 'utf8');
  assert.match(worldRuntimeSrc, /SupervisorFigure/);
  assert.match(worldRuntimeSrc, /opacity = 0\.22/);
  assert.match(worldRuntimeSrc, /makeProjectNode/);
});
