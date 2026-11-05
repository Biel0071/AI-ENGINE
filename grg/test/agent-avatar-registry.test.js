const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AgentAvatarRegistry } = require('../src/agents/agent-avatar-registry');

test('creates stable, role-derived profiles in one persisted batch', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-avatars-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'avatars.json');
  const registry = new AgentAvatarRegistry(file);
  const agents = [
    { id: 'agent-browser', name: 'Browser Agent', role: 'Browser Automation' },
    { id: 'agent-qa', name: 'QA Agent', role: 'QA Engineer' },
  ];

  const profiles = registry.getOrCreateMany(agents);

  assert.equal(profiles.length, 2);
  assert.equal(profiles[0].source, 'generated-from-role');
  assert.equal(profiles[0].appearance.accessory, 'browser-lens');
  assert.equal(profiles[1].appearance.accessory, 'scanner');
  assert.equal(profiles[0].personalityProfile.archetype, 'visual-engineer');
  assert.equal(profiles[1].personalityProfile.archetype, 'quality-scout');
  assert.equal(profiles[0].runtimeIdentity.id, 'agent-browser');

  const reloaded = new AgentAvatarRegistry(file).getOrCreateMany(agents);
  assert.deepEqual(reloaded, profiles);
});
