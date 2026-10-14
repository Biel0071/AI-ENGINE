'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const scene = require('../public/fenix-city-machine-scene');

test('city traffic follows the service lane and reflects at its endpoints', () => {
  const route = scene.LOGISTICS_TRAFFIC_ROUTE;
  assert.ok(route, 'the city must expose the route used by its moving vehicle');
  assert.equal(route.x, 22);
  assert.ok(route.startZ < route.endZ);

  const next = scene.advanceLaneTraffic({ z: route.startZ, direction: 1 }, 1);
  assert.equal(next.x, route.x);
  assert.ok(next.z >= route.startZ && next.z <= route.endZ);

  const turn = scene.advanceLaneTraffic({ z: route.endZ - 0.1, direction: 1 }, 1);
  assert.equal(turn.direction, -1);
  assert.ok(turn.z < route.endZ);
});

test('city building selections resolve known districts to their live registry ids', () => {
  assert.equal(scene.canonicalBuildingId({ type: 'district', id: 'command-center' }), 'bld-fenix-hq');
  assert.equal(scene.canonicalBuildingId({ type: 'company', companyId: 'api-platform' }), 'bld-api-platform');
  assert.equal(scene.canonicalBuildingId({ type: 'district', id: 'logistics' }), 'bld-deposito-mais');
  assert.equal(scene.canonicalBuildingId({ type: 'building', id: 'bld-ai-nexus' }), 'bld-ai-nexus');
  assert.equal(scene.canonicalBuildingId({ type: 'district', id: 'project-district' }), null);
});
