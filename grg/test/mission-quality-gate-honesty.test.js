const test = require('node:test');
const assert = require('node:assert/strict');
const { QualityGate } = require('../src/missions/quality-gate');

function missionWithCompletedJob() {
  return {
    id: 'mission-test',
    state: 'VALIDATING',
    intent: { type: 'TEST' },
    jobs: [{ id: 'job-test', status: 'COMPLETED' }],
    transitionTo(state) { this.state = state; },
  };
}

test('quality gate fails closed when no evidence validators are configured', async () => {
  const mission = missionWithCompletedJob();
  const checks = await new QualityGate().validate(mission);

  assert.ok(Object.values(checks).every((passed) => passed === false));
  assert.equal(mission.failedValidation, true);
  assert.equal(mission.state, 'COMPLETED');
});

test('an AI audit saying passed does not substitute for objective validation evidence', async () => {
  const mission = missionWithCompletedJob();
  const gate = new QualityGate({ router: { isAvailable: () => true, execute: async () => ({ passed: true }) } });
  const checks = await gate.validate(mission);

  assert.ok(Object.values(checks).every((passed) => passed === false));
  assert.equal(mission.failedValidation, true);
});

test('quality gate records configured validators only when they provide evidence', async () => {
  const names = ['performance', 'security', 'coverage'];
  const validators = Object.fromEntries(names.map((name) => [name, async () => ({ passed: true, evidence: [`${name}-check`] })]));
  const mission = missionWithCompletedJob();
  const checks = await new QualityGate({ validators }).validate(mission);

  for (const name of names) assert.equal(checks[name], true);
  assert.equal(mission.failedValidation, true, 'unconfigured checks must keep the overall gate closed');
});

test('validator errors or empty evidence remain failures', async () => {
  const validators = {
    architecture: async () => { throw new Error('validator unavailable'); },
    performance: async () => ({ passed: true, evidence: [] }),
  };
  const mission = missionWithCompletedJob();
  const checks = await new QualityGate({ validators }).validate(mission);

  assert.equal(checks.architecture, false);
  assert.equal(checks.performance, false);
  assert.equal(mission.failedValidation, true);
});
