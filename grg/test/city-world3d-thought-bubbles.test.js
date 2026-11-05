const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = {
  THREE: {},
  window: { addEventListener() {} },
  document: { readyState: 'loading', addEventListener() {} }
};
vm.runInNewContext(source, context);

const createAgents = (count, position = { x: 0, y: 0.8, z: 0 }) => Array.from({ length: count }, (_, index) => ({
  id: `agent-${index}`,
  mesh: { position: { ...position } },
  thoughtBubble: { sprite: {} }
}));

test('thought bubble layout assigns unique slots to dense groups beyond six agents', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const agents = createAgents(12);
  const offsets = engine._computeThoughtBubbleOffsets(agents);
  const slots = agents.map((agent) => offsets.get(agent));

  assert.equal(slots.length, 12);
  assert.equal(new Set(slots.map(({ x, y }) => `${x}:${y}`)).size, 12);
  assert.deepEqual([...new Set(slots.map(({ x }) => x))].sort(), [-2.7, 0, 2.7]);
  assert.ok(Math.max(...slots.map(({ y }) => y)) > 4.0, 'larger groups should add vertical tiers instead of reusing slots');
});

test('thought bubble crowding ignores agents outside the local 3D radius', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const agents = createAgents(2);
  agents[1].mesh.position.x = 5;
  const offsets = engine._computeThoughtBubbleOffsets(agents);

  assert.deepEqual({ ...offsets.get(agents[0]) }, { x: 0, y: 2.45 });
  assert.deepEqual({ ...offsets.get(agents[1]) }, { x: 0, y: 2.45 });
});

test('hidden thought bubbles do not reserve visible slots', () => {
  const engine = Object.create(context.window.FenixWorld3DEngine.prototype);
  const agents = createAgents(3);
  agents[1].thoughtBubble.sprite.visible = false;
  const offsets = engine._computeThoughtBubbleOffsets(agents);

  assert.equal(offsets.has(agents[1]), false);
  assert.deepEqual({ ...offsets.get(agents[2]) }, { x: -2.7, y: 2.45 });
});
