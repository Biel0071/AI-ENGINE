const test = require('node:test');
const assert = require('node:assert/strict');
const { handleLivingCityRoutes } = require('../src/api/living-city-routes');

async function requestBuilding(buildingId, buildings) {
  let statusCode;
  let payload;
  const res = {
    writeHead(code) { statusCode = code; },
    end(body) { payload = JSON.parse(body); },
  };
  const handled = await handleLivingCityRoutes(
    { method: 'GET' },
    res,
    new URL(`http://localhost/api/v2/living-city/building/${encodeURIComponent(buildingId)}`),
    {},
    (_res, code, body) => {
      statusCode = code;
      payload = body;
    },
    { tenantId: 'tenant-test', actorId: 'operator-test' },
    undefined,
    {
      worldEngine: { findBuilding: (id) => buildings[id] || null },
      simulationEngine: { isRunning: true },
    },
  );
  return { handled, statusCode, payload };
}

test('unknown building is unavailable instead of being reported healthy', async () => {
  const result = await requestBuilding('unknown-building', {});

  assert.equal(result.handled, true);
  assert.equal(result.statusCode, 404);
  assert.deepEqual(result.payload, {
    ok: false,
    error: 'BUILDING_NOT_FOUND',
    buildingId: 'unknown-building',
    source: 'WorldStateEngine',
  });
});

test('known building returns the canonical entity without inventing health', async () => {
  const building = { id: 'bld-fenix-hq', name: 'QG Fênix', district: 'command-center' };
  const result = await requestBuilding('bld-fenix-hq', { 'bld-fenix-hq': building });

  assert.equal(result.handled, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.source, 'WorldStateEngine/LivingBuildingState');
  assert.deepEqual(result.payload.building, building);
  assert.equal('health' in result.payload.building, false);
});
