const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-flow-graph.js'), 'utf8');
const edgeBuilder = source.slice(source.indexOf('const addEdge ='), source.indexOf('// Helper to register canonical screens'));
const inspector = source.slice(source.indexOf('    inspectEdge(edge, source, target) {'), source.indexOf('    closeInspector()'));

test('Flow Graph leaves missing execution fields unmeasured instead of fabricating defaults', () => {
  assert.match(edgeBuilder, /active:\s*typeof properties\.active === 'boolean' \? properties\.active : null/);
  assert.doesNotMatch(edgeBuilder, /\|\|\s*'default'|\|\|\s*'Fênix Kernel'|\|\|\s*'Tempo real'|executions:\s*properties\.executions\s*\|\|\s*'1'/);
  assert.match(inspector, /Não medido|Não registrado/);
  assert.doesNotMatch(inspector, /default\.event|Fênix Core|Recente|props\.executions\s*\|\|\s*'1'/);
  assert.doesNotMatch(inspector, /foi estabelecida pelo/);
});

test('Flow Graph resolves preview selections only to an unambiguous absorbed screen in the same project', () => {
  const resolverSource = source.match(/function resolveAbsorbedSelectionScreenId\(selection, projectId, screens, screenNodes\) \{[\s\S]*?\n  \}/)?.[0];
  assert.ok(resolverSource, 'Flow Graph should expose a small pure resolver for project-scoped selection linkage');
  const resolveScreenId = vm.runInNewContext(`(${resolverSource})`);
  const screens = [
    { screenId: 'home', route: '/app#home' },
    { screenId: 'settings', route: '/app#settings' },
  ];
  const screenNodes = new Map([['home', 'screen:fixture:home'], ['settings', 'screen:fixture:settings']]);

  assert.equal(resolveScreenId({ projectId: 'fixture', screenId: 'home' }, 'fixture', screens, screenNodes), 'screen:fixture:home');
  assert.equal(resolveScreenId({ projectId: 'fixture', screenId: 'old-home-id', route: '/app#settings' }, 'fixture', screens, screenNodes), 'screen:fixture:settings',
    'an exact route can recover a renamed Screen DNA id');
  assert.equal(resolveScreenId({ projectId: 'another-project', screenId: 'home' }, 'fixture', screens, screenNodes), null,
    'selection evidence from another project must never cross-link');
  assert.equal(resolveScreenId({ projectId: 'fixture', route: '/duplicate' }, 'fixture', [
    { screenId: 'one', route: '/duplicate' }, { screenId: 'two', route: '/duplicate' },
  ], new Map([['one', 'screen:fixture:one'], ['two', 'screen:fixture:two']])), null,
  'ambiguous routes must remain unlinked');
});
