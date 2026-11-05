'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getProjectById } = require('../src/projects/project-registry');

test('Fênix and ZapAI registry health checks use their measured public health endpoints', () => {
  assert.equal(getProjectById('fenix-os').health, 'http://localhost:4410/health');
  assert.equal(getProjectById('zapai-crm').health, 'http://localhost:4025/health');
});
