const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'pixi-building-interior.js'), 'utf8');

test('interior maps canonical City IDs to their matching blueprint without a false default interior', () => {
  const context = {
    window: {},
    document: { addEventListener() {}, getElementById() {}, dispatchEvent() {} },
    CustomEvent: class CustomEvent {},
  };
  vm.runInNewContext(source, context);

  assert.equal(context.window.fenixResolveBuildingInterior('bld-fenix-hq').id, 'fenix-hq');
  assert.equal(context.window.fenixResolveBuildingInterior('bld-dev-loft').id, 'dev-loft');
  assert.equal(context.window.fenixResolveBuildingInterior('bld-deposito-mais').id, 'bld-deposito-mais');
  assert.equal(context.window.fenixResolveBuildingInterior('bld-api-platform'), null);
  assert.equal(context.window.fenixResolveBuildingInterior('unregistered'), null);
  assert.equal(context.window.fenixInteriorFloorCount('bld-fenix-hq'), 2);
  assert.equal(context.window.fenixInteriorFloorCount('bld-api-platform'), 0);
  assert.match(source, /reason: 'FLOOR_LAYOUT_NOT_MODELED'/);
});
