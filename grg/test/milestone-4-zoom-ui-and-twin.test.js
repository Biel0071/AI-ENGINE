const test = require('node:test');
const assert = require('node:assert/strict');
const { DigitalTwinEngine } = require('../src/digital-twin/digital-twin-engine');
const { EventBus } = require('../src/kernel/event-bus');

test('Milestone 4 — DigitalTwinEngine generates city buildings and active NPCs', async () => {
  const eventBus = new EventBus();
  const twin = new DigitalTwinEngine({ eventBus });

  const cityState = twin.generateCityState({ heartbeatCount: 5 }, [{ id: 'ag.ceo' }]);
  assert.equal(cityState.buildingsCount, 10);
  assert.equal(cityState.activeNpcCount, 8);
  assert.equal(cityState.buildings[0].name, 'API Platform');
  assert.equal(cityState.npcs[0].name, 'AI CEO Brain');
});
