'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ReferenceAcquisitionEngine } = require('../src/intent/reference-acquisition');
const { DesignCritic } = require('../src/intent/design-critic');

test('a URL alone does not fabricate observed reference capabilities or design tokens', async () => {
  const reference = await new ReferenceAcquisitionEngine().ingestReference({
    url: 'https://example.com/saas-dashboard',
    type: 'URL_WEBSITE'
  });

  assert.equal(reference.analysisStatus, 'NEEDS_CAPTURE');
  assert.deepEqual(reference.knowledge.functional.coreCapabilities, []);
  assert.equal(reference.knowledge.visual.status, 'NOT_MEASURED');
  assert.equal(reference.knowledge.visual.colorPalette, null);
  assert.equal(reference.knowledge.interaction.status, 'NOT_OBSERVED');
  assert.equal(reference.knowledge.architectural.status, 'NOT_INSPECTED');
});

test('design critique remains unmeasured without viewport evidence and accepts cited measurements', () => {
  const critic = new DesignCritic();
  const unmeasured = critic.critiqueFrontend({ capabilities: ['UI'] });
  assert.equal(unmeasured.status, 'NOT_MEASURED');
  assert.equal(unmeasured.checks.responsiveness.status, 'NOT_MEASURED');
  assert.equal(unmeasured.passedCount, 0);

  const measured = critic.critiqueFrontend({ capabilities: ['UI'] }, {
    responsiveness: { status: 'PASS', evidence: 'playwright:run-42:viewport-375' }
  });
  assert.equal(measured.status, 'PARTIALLY_MEASURED');
  assert.equal(measured.checks.responsiveness.status, 'PASS');
  assert.equal(measured.passedCount, 1);
});

test('intent plans are not reported as executed or learned before real dispatch and validation', async () => {
  let recorded = false;
  let emitted = false;
  const engine = new (require('../src/intent/intent-engine').IntentEngine)({
    compiler: { compile: async () => ({
      id: 'intent-test', normalizedIntent: 'CREATE_AGENT', confidenceScore: 1,
      questions: [], implementationPlan: [{ stepIndex: 1, action: 'create agent', actor: 'AgentFactory' }]
    }) },
    taskMemory: { recordTaskOutcome: async () => { recorded = true; } },
    eventBus: { emit: async () => { emitted = true; } }
  });

  const result = await engine.processRequest('Crie um agente.');

  assert.equal(result.status, 'AWAITING_APPROVAL');
  assert.equal(result.executionReport, null);
  assert.equal(result.testResults, null);
  assert.equal(result.recordedOutcome, undefined);
  assert.equal(recorded, false);
  assert.equal(emitted, false);
});
