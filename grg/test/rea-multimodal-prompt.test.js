'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { REA_MULTIMODAL_PROMPT, buildReaMultimodalPrompt } = require('../src/analysis/rea-multimodal-prompt');
const { handleReaMemoryIndexRoutes } = require('../src/api/rea-memory-index-routes');

test('REA multimodal prompt names evidence classes and forbids invented claims', () => {
  for (const label of ['OBSERVADO', 'MEDIDO', 'INFERIDO', 'AUSENTE', 'MOCK']) assert.ok(REA_MULTIMODAL_PROMPT.includes(label));
  assert.match(REA_MULTIMODAL_PROMPT, /Não invente falas/);
  assert.match(REA_MULTIMODAL_PROMPT, /timestamp/);
});

test('REA multimodal prompt builder labels video evidence and pending transcription explicitly', () => {
  const prompt = buildReaMultimodalPrompt({ video: {
    artifactId: 'video-test', media: { durationSeconds: 9, audio: null },
    keyframes: [{ requestedAtSeconds: 0, timestampEvidence: 'UNIFORM_SAMPLE_POSITION', status: 'EXTRACTED' }]
  } });
  assert.match(prompt, /"status": "PENDING"/);
  assert.match(prompt, /UNIFORM_SAMPLE_POSITION/);
  assert.match(prompt, /não é o timestamp exato/);
});

test('REA exposes a reusable multimodal prompt over its API route', async () => {
  let response;
  const handled = await handleReaMemoryIndexRoutes(
    { method: 'GET' }, {}, new URL('http://localhost/api/v2/rea/multimodal-prompt'),
    (_res, status, payload) => { response = { status, payload }; return true; },
    async () => ({}), {}, {}
  );
  assert.equal(handled, true);
  assert.equal(response.status, 200);
  assert.deepEqual(response.payload.evidenceContract, ['OBSERVADO', 'MEDIDO', 'INFERIDO', 'AUSENTE', 'MOCK']);
  assert.equal(response.payload.prompt, REA_MULTIMODAL_PROMPT);
});
