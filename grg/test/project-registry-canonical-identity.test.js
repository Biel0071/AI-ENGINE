'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PROJECTS, getProjectById } = require('../src/projects/project-registry');

test('Fênix OS and AI Engine Core resolve to one canonical project identity', () => {
  const canonical = getProjectById('fenix-os');
  const legacyId = getProjectById('ai-engine');
  const legacyName = getProjectById('AI Engine Core');
  assert.equal(canonical.id, 'fenix-os');
  assert.equal(legacyId.id, 'fenix-os');
  assert.equal(legacyName.id, 'fenix-os');
  assert.equal(canonical.repository, 'https://github.com/Biel0071/AI-ENGINE.git');
  assert.equal(PROJECTS.some((project) => project.id === 'ai-engine'), false);
  assert.equal(PROJECTS.filter((project) => project.id === 'fenix-os').length, 1);
  assert.ok(canonical.capabilities.includes('digital-twin'));
  assert.ok(canonical.aliases.includes('ai-engine'));
});
