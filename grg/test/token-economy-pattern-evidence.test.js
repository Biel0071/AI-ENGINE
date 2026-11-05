'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PatternLibrary } = require('../src/memory/pattern-library');
const { TokenEconomyEngine } = require('../src/ai/token-economy-engine');

test('token cascade does not treat candidate patterns as reusable solutions', async () => {
  const library = new PatternLibrary();
  library.registerPattern({
    type: 'CANDIDATE_LAYOUT', category: 'UI', concept: 'Workspace preview layout',
  });
  const engine = new TokenEconomyEngine();
  const result = await engine.queryCascade({
    task: 'workspace preview layout',
    prompt: 'Inspect a workspace preview layout',
    patternLibrary: library,
  });

  assert.equal(result.patternHit, false);
  assert.notEqual(result.source, 'PATTERN_LIBRARY');
});

test('token cascade can reuse a pattern only after verified evidence is attached', async () => {
  const library = new PatternLibrary();
  library.registerPattern({
    type: 'VERIFIED_LAYOUT', category: 'UI', concept: 'Workspace preview layout',
    status: 'PROVEN', confidence: 'HIGH',
    evidence: { validationStatus: 'VERIFIED', testIds: ['layout-e2e'], validatedAt: '2026-10-22T12:00:00.000Z' },
  });
  const engine = new TokenEconomyEngine();
  const result = await engine.queryCascade({
    task: 'workspace preview layout',
    prompt: 'Use the verified workspace preview pattern',
    patternLibrary: library,
  });

  assert.equal(result.patternHit, true);
  assert.equal(result.source, 'PATTERN_LIBRARY');
});
