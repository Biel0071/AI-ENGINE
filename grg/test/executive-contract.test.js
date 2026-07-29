const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  PROGRAM_STATES, assertExecutiveContract, assertPlannerContract, assertProgram,
} = require('../src/executive/executive-contract');

// MISSION-1008 — contratos do Executive Brain. So valida FORMA; nenhuma execucao.
// O invariante que importa: o Brain orquestra, nunca executa IA.

test('executive contract requires all orchestration methods', () => {
  const incomplete = { decompose() {}, createProgram() {} };
  assert.throws(() => assertExecutiveContract(incomplete), /missing methods/);
});

test('executive contract FORBIDS direct AI execution (the core boundary)', () => {
  // Um "brain" completo, mas que expoe invoke() — furou o limite: deve ser rejeitado.
  const withExec = {};
  for (const m of ['decompose', 'createProgram', 'approve', 'prioritize', 'replan', 'detectBlocks', 'progress', 'costs', 'quality', 'requestApproval']) withExec[m] = () => {};
  withExec.invoke = () => {}; // <- proibido
  assert.throws(() => assertExecutiveContract(withExec), /must not execute AI directly/);
});

test('a fully-orchestration brain satisfies the contract', () => {
  const brain = {};
  for (const m of ['decompose', 'createProgram', 'approve', 'prioritize', 'replan', 'detectBlocks', 'progress', 'costs', 'quality', 'requestApproval']) brain[m] = () => {};
  assert.equal(assertExecutiveContract(brain), true);
});

test('planner contract requires the existing mission-planner shape (composition, not reimplementation)', () => {
  assert.throws(() => assertPlannerContract({}), /requires a mission planner/);
  assert.equal(assertPlannerContract({ plan: () => {} }), true);
});

test('program requires all fields, a valid derived state, and mission references', () => {
  assert.throws(() => assertProgram({ id: 'p1' }), /missing fields/);
  const ok = { id: 'p1', tenantId: 'grg', objective: 'dobrar faturamento', state: PROGRAM_STATES.DRAFT, missions: [], createdBy: 'grg-admin', createdAt: '2026-07-29T00:00:00Z' };
  assert.equal(assertProgram(ok), true);
  assert.throws(() => assertProgram({ ...ok, state: 'MADE_UP' }), /invalid program state/);
});
