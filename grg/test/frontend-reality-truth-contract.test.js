'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { VisualRealityEngine } = require('../src/frontend-reality/visual-reality-engine');

test('static screen discovery reports inventory without claiming runtime verification', async () => {
  const engine = new VisualRealityEngine();
  const result = await engine.scanProject('fenix_enterprise');

  assert.ok(result.totalScreens > 0);
  assert.equal(result.overallHealthScore, null);
  assert.equal(result.zeroDeadButtonsPass, null);
  assert.equal(result.verificationStatus, 'NOT_VERIFIED');
  assert.ok(result.screens.every((screen) => screen.status === 'DISCOVERED'));
  assert.ok(result.screens.every((screen) => screen.healthScore === null));
  assert.ok(result.screens.every((screen) => screen.lastVerified === null));
  assert.equal(engine.userFlows.get('flow_dev_journey').status, 'NOT_RUN');
});

test('source routes do not manufacture working navigation edges or verified audits', async () => {
  const engine = new VisualRealityEngine();
  await engine.scanProject('fenix_enterprise');

  const graph = engine.navigationGraph.getGraph('fenix_enterprise');
  const audit = engine.orphanDetector.auditProject('fenix_enterprise');

  assert.ok(graph.totalNodes > 0);
  assert.equal(graph.totalEdges, 0);
  assert.equal(graph.verificationStatus, 'NOT_VERIFIED');
  assert.equal(audit.auditPass, null);
  assert.equal(audit.status, 'NOT_VERIFIED');
  assert.equal(audit.verifiedCount, 0);
  assert.equal(audit.zeroDeadButtonsEnforced, null);
});

test('click test does not fabricate execution, latency, or success rates', () => {
  const engine = new VisualRealityEngine();
  engine.discoveryEngine.screenRegistry.set('project-a', [{
    screenId: 'screen-home', title: 'Home', actions: [{ label: 'Save', handler: 'save()', operational: true }]
  }]);

  const result = engine.runClickEverythingTest('project-a');

  assert.equal(result.status, 'NOT_RUN_NO_RUNTIME');
  assert.equal(result.totalElementsTested, 0);
  assert.equal(result.successRate, null);
  assert.equal(result.elements.length, 1);
  assert.equal(result.elements[0].status, 'NOT_EXECUTED');
  assert.equal(result.elements[0].latencyMs, null);
});

test('unresolved correlation and repair report limits without inventing files or patches', async () => {
  const events = [];
  const engine = new VisualRealityEngine({ eventBus: { emit: (name, payload) => events.push({ name, payload }) } });

  const correlation = engine.correlateElement({ screenId: 'screen-city', elementLabel: 'Novo agente' });
  const repair = await engine.executeAutonomousRepair('fenix_enterprise', { description: 'Botão sem ação' });

  assert.equal(correlation.correlationStatus, 'NOT_RESOLVED');
  assert.equal(correlation.component, null);
  assert.equal(correlation.file, null);
  assert.equal(correlation.functionHandler, null);
  assert.equal(repair.status, 'BLOCKED');
  assert.equal(repair.patchApplied, null);
  assert.equal(repair.validation, null);
  assert.match(repair.reason, /executor|execução/i);
  assert.deepEqual(events, []);
});
