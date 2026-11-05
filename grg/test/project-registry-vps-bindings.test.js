'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getProjectById } = require('../src/projects/project-registry');

test('VPS inventory assigns 3000 to Fênix, 1000 to ZapAI, 8000 to Gerar Ficha and keeps internal APIs distinct', () => {
  const fenix = getProjectById('fenix-os');
  const zapai = getProjectById('zapai-crm');
  const api = getProjectById('api-platform');
  const ficha = getProjectById('gerar-ficha');

  assert.equal(fenix.frontend.port, 3000);
  assert.equal(fenix.deployment.containerPort, undefined, 'Fênix backend is a host listener, not a 4400 container binding');
  assert.ok(fenix.deployment.bindings.some((binding) => binding.port === 3000 && binding.target.includes('frontend-gateway')));
  assert.equal(zapai.frontend.port, 1000);
  assert.equal(zapai.backend.port, 4025);
  assert.ok(zapai.deployment.bindings.some((binding) => binding.port === 1000 && binding.url.includes(':1000')));
  assert.equal(api.backend.port, 3001);
  assert.ok(api.deployment.bindings.some((binding) => binding.port === 8081 && binding.label.includes('Dashboard')));
  assert.equal(ficha.backend.port, 8000);
  assert.equal(ficha.backend.serviceManager, 'gerar-ficha.service');
  assert.ok(ficha.deployment.bindings.some((binding) => binding.port === 8000 && binding.url.endsWith('/docs')));
  assert.equal(ficha.health, 'http://localhost:8000/health', 'health URL is the route verified on the VPS host');

  for (const project of [fenix, zapai, api, ficha]) {
    for (const binding of project.deployment.bindings) {
      assert.notEqual(binding.status, 'HTTP_200', `${project.id}:${binding.port} must not expose a stale hard-coded PASS`);
      assert.equal(binding.observedAt, undefined, `${project.id}:${binding.port} has no live observation in this registry`);
    }
  }
});
