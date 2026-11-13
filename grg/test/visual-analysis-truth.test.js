'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SystemAbsorptionEngine } = require('../src/absorption/system-absorption-engine');
const { MultimodalPipeline } = require('../src/cognitive/multimodal-pipeline');

test('visual absorption is blocked instead of inventing a design or fidelity score', async () => {
  const engine = new SystemAbsorptionEngine();
  const report = await engine.absorbVisualSpec({
    specName: 'Reference dashboard',
    imagePath: '/references/dashboard.png',
  });

  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.code, 'VISION_ANALYSIS_UNAVAILABLE');
  assert.equal(report.designTokens, null);
  assert.deepEqual(report.detectedElements, []);
  assert.equal(report.totalElements, 0);
  assert.equal(report.fidelityScore, null);
  assert.ok(report.unknowns.length > 0);
});

test('multimodal media metadata does not claim OCR, frame extraction, or transcription', () => {
  const pipeline = new MultimodalPipeline({});
  const result = pipeline.extractData('VIDEO', 'screen-recording.mp4', Buffer.from([0, 1, 2]));

  assert.equal(result.meta.analysisStatus, 'BLOCKED');
  assert.equal(result.meta.ocrProcessed, false);
  assert.equal(result.meta.frameExtraction, 'NOT_RUN');
  assert.equal(result.meta.transcription, 'NOT_RUN');
  assert.equal(Object.hasOwn(result.meta, 'mediaFrame'), false);
});
