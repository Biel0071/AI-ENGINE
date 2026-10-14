const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');

test('Inspector City action focuses the selected real agent in World3D', () => {
  const focusesSelectedAgent = /window\.fenixFocusAgentInCity\s*=\s*function\(\)\s*\{[\s\S]*?const agentId\s*=\s*document\.getElementById\(['"]agentInspId['"]\)\?\.textContent\?\.trim\(\);[\s\S]*?window\.showView\(['"]city['"]\);[\s\S]*?const world\s*=\s*window\.fenixWorld3D\s*\|\|\s*window\.fenixWorldEngine3D;[\s\S]*?world\?\.syncRealData\?\.\(\);[\s\S]*?world\?\.focusAgent\?\.\(agentId\);/;
  assert.ok(focusesSelectedAgent.test(source), 'Ver na Cidade must sync the live world and focus the inspector agent, not only pan the 2D district map');
});
