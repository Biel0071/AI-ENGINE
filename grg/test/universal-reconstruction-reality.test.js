'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { UniversalReconstructionEngine } = require('../src/reconstruction/universal-reconstruction-engine');

const engine = new UniversalReconstructionEngine();

test('reconstruction requires a real source', async () => {
  await assert.rejects(engine.reconstructSystem({}), { code: 'RECONSTRUCTION_SOURCE_REQUIRED', status: 400 });
});

test('reconstruction does not report generated jobs, tests, or twins without a connected pipeline', async () => {
  await assert.rejects(engine.reconstructSystem({ url: 'https://example.org' }), (error) => {
    assert.equal(error.code, 'RECONSTRUCTION_PIPELINE_UNAVAILABLE');
    assert.equal(error.status, 501);
    assert.match(error.message, /Nenhum projeto, job ou teste foi criado/);
    return true;
  });
});
