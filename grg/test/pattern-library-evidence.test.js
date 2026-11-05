'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PatternLibrary } = require('../src/memory/pattern-library');

test('new patterns remain candidates until evidence validates them', () => {
  const library = new PatternLibrary();
  const result = library.registerPattern({
    type: 'REFERENCE_LAYOUT',
    category: 'UI',
    concept: 'Workspace with contextual preview',
    evidence: { source: 'reference-session-1', method: 'DOM observation' },
  });

  assert.equal(result.pattern.status, 'CANDIDATE');
  assert.equal(result.pattern.confidence, 'UNASSESSED');
  assert.deepEqual(result.pattern.evidence, { source: 'reference-session-1', method: 'DOM observation' });
});

test('explicitly supplied confidence and lifecycle status stay backward compatible', () => {
  const library = new PatternLibrary();
  const result = library.registerPattern({
    type: 'VALIDATED_LAYOUT',
    category: 'UI',
    concept: 'A tested layout',
    status: 'PROVEN',
    confidence: 'HIGH',
    evidence: { validationStatus: 'VERIFIED', testIds: ['layout-e2e'], validatedAt: '2026-10-22T12:00:00.000Z' },
  });

  assert.equal(result.pattern.status, 'PROVEN');
  assert.equal(result.pattern.confidence, 'HIGH');
});

test('explicit PROVEN without verifiable validation evidence is downgraded', () => {
  const library = new PatternLibrary();
  const result = library.registerPattern({
    type: 'UNVERIFIED_LAYOUT',
    category: 'UI',
    concept: 'Looks good by inspection',
    status: 'PROVEN',
    confidence: 'HIGH',
    evidence: { source: 'model-observation' },
  });

  assert.equal(result.pattern.status, 'CANDIDATE');
  assert.equal(result.pattern.confidence, 'UNASSESSED');
});

test('a candidate is promoted only when the same pattern receives verified evidence', () => {
  const library = new PatternLibrary();
  const candidate = library.registerPattern({
    type: 'REUSABLE_LAYOUT', category: 'UI', concept: 'Workspace with preview',
  }).pattern;
  const promoted = library.registerPattern({
    type: 'REUSABLE_LAYOUT', category: 'UI', concept: 'Workspace with preview',
    status: 'PROVEN', confidence: 'HIGH',
    evidence: { validationStatus: 'VERIFIED', testIds: ['workspace-preview-e2e'], validatedAt: '2026-10-22T12:00:00.000Z' },
  }).pattern;

  assert.equal(promoted.id, candidate.id);
  assert.equal(promoted.status, 'PROVEN');
  assert.equal(promoted.evidence.testIds[0], 'workspace-preview-e2e');
});
