const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ScreenDiscoveryEngine } = require('../src/frontend-reality/screen-discovery-engine');

test('FÊNIX shell discovery maps the 14 real hash-routed views', async () => {
  const engine = new ScreenDiscoveryEngine();
  const result = await engine.scanProjectScreens('fenix_enterprise', path.join(__dirname, '..', 'public'));
  assert.equal(result.totalScreens, 14);
  assert.deepEqual(result.screens.map(screen => screen.screenId), [
    'screen_command', 'screen_ide', 'screen_project', 'screen_city', 'screen_projects',
    'screen_agents', 'screen_operations', 'screen_runtime', 'screen_memory', 'screen_knowledge',
    'screen_mcp', 'screen_browser', 'screen_observability', 'screen_terminal'
  ]);
  assert.ok(result.screens.every(screen => screen.status === 'DISCOVERED'));
});
