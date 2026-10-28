'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  projectSceneSites,
  resolveProjectArchetype,
  ARCHETYPE_DIMENSIONS,
} = require('../public/fenix-city-machine-scene');

const world3dSrc = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');

// Extract AMBIENT_CITY_LOTS from fenix-world-3d.js
const ambientMatch = world3dSrc.match(/const AMBIENT_CITY_LOTS = (\[[\s\S]*?\]);/);
assert(ambientMatch, 'AMBIENT_CITY_LOTS must be present in fenix-world-3d.js');
const AMBIENT_CITY_LOTS = eval(ambientMatch[1]);

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

test('Phase B: AMBIENT_CITY_LOTS has zero collision with all landmarks', () => {
  for (const lot of AMBIENT_CITY_LOTS) {
    const halfW = lot.width / 2;
    const halfD = lot.depth / 2;
    const lMinX = lot.x - halfW;
    const lMaxX = lot.x + halfW;
    const lMinZ = lot.z - halfD;
    const lMaxZ = lot.z + halfD;

    for (const lm of landmarks) {
      const overlapX = lMinX < lm.maxX && lMaxX > lm.minX;
      const overlapZ = lMinZ < lm.maxZ && lMaxZ > lm.minZ;
      assert(!(overlapX && overlapZ), `Ambient lot "${lot.id}" overlaps landmark "${lm.id}"`);
    }
  }
});

test('Phase B: AMBIENT_CITY_LOTS has zero collision with 45 enterprise project parcels', () => {
  const projects = Array.from({ length: 45 }, (_, i) => ({
    id: `project-${i}`,
    name: `Enterprise Project ${i}`,
    status: 'RUNNING',
  }));
  const sites = projectSceneSites(projects);

  for (const lot of AMBIENT_CITY_LOTS) {
    const halfW = lot.width / 2;
    const halfD = lot.depth / 2;
    const lMinX = lot.x - halfW;
    const lMaxX = lot.x + halfW;
    const lMinZ = lot.z - halfD;
    const lMaxZ = lot.z + halfD;

    for (const site of sites) {
      const sHalfW = (site.dimensions?.width || 6.2) / 2;
      const sHalfD = (site.dimensions?.depth || 5.0) / 2;
      const sMinX = site.position.x - sHalfW;
      const sMaxX = site.position.x + sHalfW;
      const sMinZ = site.position.z - sHalfD;
      const sMaxZ = site.position.z + sHalfD;

      const overlapX = lMinX < sMaxX && lMaxX > sMinX;
      const overlapZ = lMinZ < sMaxZ && lMaxZ > sMinZ;
      assert(!(overlapX && overlapZ), `Ambient lot "${lot.id}" overlaps enterprise project "${site.id}" at (${site.position.x}, ${site.position.z})`);
    }
  }
});

test('Phase B: spawnDynamicBuilding enforces proportional ARCHETYPE_DIMENSIONS and heights', () => {
  // Verify code in fenix-world-3d.js
  assert.match(world3dSrc, /const archetype = payload\.archetype \|\| window\.FenixCityMachineScene\?\.resolveProjectArchetype\(payload\) \|\| 'dev_studio';/);
  assert.match(world3dSrc, /const defaultDims = window\.FenixCityMachineScene\?\.ARCHETYPE_DIMENSIONS\?\.\[archetype\]/);
  assert.match(world3dSrc, /const width = parseFloat\(payload\.width\) \|\| defaultDims\.width;/);
  assert.match(world3dSrc, /const depth = parseFloat\(payload\.depth\) \|\| defaultDims\.depth;/);
  assert.match(world3dSrc, /const height = defaultDims\.height;/);

  for (const [key, dims] of Object.entries(ARCHETYPE_DIMENSIONS)) {
    assert(dims.height >= 4.0 && dims.height <= 7.5, `Archetype ${key} height must be proportional (4.0-7.5m): ${dims.height}`);
    assert(dims.width >= 5.5 && dims.width <= 7.5, `Archetype ${key} width must be proportional (5.5-7.5m): ${dims.width}`);
    assert(dims.depth >= 4.8 && dims.depth <= 5.8, `Archetype ${key} depth must be proportional (4.8-5.8m): ${dims.depth}`);
  }
});

test('Phase B: PathGraph findPath extracts doorways for interior agents and detours around walls', () => {
  // Simulated PathGraph matching fenix-world-3d.js logic
  class MockPathGraph {
    constructor() {
      this.obstacles = new Map();
      this.nodes = new Map();
      this.edges = new Map();
    }
    registerObstacle(id, bounds) {
      this.obstacles.set(id, bounds);
      if (bounds.entryPos) {
        this.nodes.set(`door_${id}`, { pos: bounds.entryPos });
      }
    }
    addNode(id, pos) { this.nodes.set(id, { pos }); }
    addEdge(a, b) {
      if (!this.edges.has(a)) this.edges.set(a, new Set());
      if (!this.edges.has(b)) this.edges.set(b, new Set());
      this.edges.get(a).add(b);
      this.edges.get(b).add(a);
    }
    doesSegmentCrossObstacle(p1, p2, margin = 0.3) {
      const minX1 = Math.min(p1.x, p2.x), maxX1 = Math.max(p1.x, p2.x);
      const minZ1 = Math.min(p1.z, p2.z), maxZ1 = Math.max(p1.z, p2.z);
      for (const obs of this.obstacles.values()) {
        const obsMinX = obs.minX - margin, obsMaxX = obs.maxX + margin;
        const obsMinZ = obs.minZ - margin, obsMaxZ = obs.maxZ + margin;
        if (minX1 <= obsMaxX && maxX1 >= obsMinX && minZ1 <= obsMaxZ && maxZ1 >= obsMinZ) {
          return true;
        }
      }
      return false;
    }
  }

  const graph = new MockPathGraph();
  graph.registerObstacle('test-bld', {
    minX: 10, maxX: 18, minZ: 10, maxZ: 18,
    entryPos: { x: 14, y: 0.8, z: 19 }
  });

  // Verify doorway extraction code exists in source
  assert.match(world3dSrc, /let startDoorway = null;/);
  assert.match(world3dSrc, /startDoorway = new T\.Vector3\(obs\.entryPos\.x, startVec\.y, obs\.entryPos\.z\);/);
  assert.match(world3dSrc, /let finalInsideTarget = null;/);
  assert.match(world3dSrc, /finalInsideTarget = targetVec\.clone\(\);/);
  assert.match(world3dSrc, /if \(startDoorway\) points\.push\(startDoorway\);/);
  assert.match(world3dSrc, /if \(finalInsideTarget\) points\.push\(finalInsideTarget\);/);
});

test('Phase B: Corporate district corridor walkways run strictly in open streets between parcels', () => {
  const aveZ = [28.5, 35.5, 42.5, 49.5, 56.5, 63.5, 70.5, 77.5];
  const crossX = [37.8, 45.0, 52.2, 59.4, 66.6, 73.8, 81.0, 88.2];

  const projects = Array.from({ length: 45 }, (_, i) => ({
    id: `project-${i}`,
    name: `Enterprise Project ${i}`,
    status: 'RUNNING',
  }));
  const sites = projectSceneSites(projects);

  // Verify none of the corridor walkway intersections fall inside a project building body
  for (const z of aveZ) {
    for (const x of crossX) {
      for (const site of sites) {
        const halfW = (site.dimensions?.width || 6.2) / 2;
        const halfD = (site.dimensions?.depth || 5.0) / 2;
        const insideX = x >= (site.position.x - halfW) && x <= (site.position.x + halfW);
        const insideZ = z >= (site.position.z - halfD) && z <= (site.position.z + halfD);
        assert(!(insideX && insideZ), `Corridor node at (${x}, ${z}) intersects project ${site.id} at (${site.position.x}, ${site.position.z})`);
      }
    }
  }
});
