'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ArchitectureDetector } = require('../src/reconstruction/architecture-detector');

test('architecture detection leaves every dimension unknown without evidence', () => {
  const result = new ArchitectureDetector().detectArchitecture();

  assert.equal(result.epistemicSummary.totalObserved, 0);
  assert.ok(Object.values(result.classification).every((item) => item.status === 'UNKNOWN'));
  assert.ok(Object.values(result.classification).every((item) => item.value === null));
  assert.match(result.summary, /nenhum dado arquitetural observado/i);
});

test('architecture detection reports declared packages without claiming active framework or services', () => {
  const result = new ArchitectureDetector().detectArchitecture({
    packageManifest: {
      dependencies: { react: '^19.0.0', express: '^5.0.0', bullmq: '^5.0.0', pg: '^8.0.0', vite: '^6.0.0' },
      devDependencies: { typescript: '^5.0.0' }
    },
    routes: ['/dashboard'],
    apis: [{ method: 'GET', url: 'https://example.test/api/status', type: 'xhr' }]
  }, ['package.json', 'server.js']);

  assert.equal(result.classification.frontendFramework.status, 'OBSERVED');
  assert.equal(result.classification.frontendFramework.value, 'React dependency declared');
  assert.equal(result.classification.backendFramework.status, 'OBSERVED');
  assert.equal(result.classification.backendFramework.value, 'Express dependency declared');
  assert.equal(result.classification.services.status, 'UNKNOWN');
  assert.equal(result.classification.database.status, 'UNKNOWN');
  assert.equal(result.classification.apiStyle.value, 'HTTP API requests observed; response format unknown');
  assert.equal(result.classification.routing.value, 'Routes observed (1)');
  assert.ok(Object.values(result.classification).filter((item) => item.status === 'OBSERVED').every((item) => item.evidence?.source));
});

test('file names and CSS classes alone do not prove architecture or authentication', () => {
  const result = new ArchitectureDetector().detectArchitecture({
    elements: [{ className: 'react-card' }]
  }, ['package.json', 'server.js', 'src/auth.js', 'src/react-admin.js']);

  assert.equal(result.classification.frontendFramework.status, 'UNKNOWN');
  assert.equal(result.classification.backendFramework.status, 'UNKNOWN');
  assert.equal(result.classification.authentication.status, 'UNKNOWN');
  assert.equal(result.classification.database.status, 'UNKNOWN');
  assert.equal(result.epistemicSummary.totalObserved, 0);
});
