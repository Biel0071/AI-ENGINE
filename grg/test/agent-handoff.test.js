'use strict';

/**
 * Test: Agent Handoff & Capability Resolution (Fase 14)
 * Verifies dynamic capability discovery and safe task delegation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { CommunicationRouter } = require('../src/communication/communication-router');
const { PresenceManager } = require('../src/communication/presence-manager');
const { AgentCommunicationBus } = require('../src/communication/agent-communication-bus');
const { PRESENCE_STATUSES, COMMUNICATION_EVENTS } = require('../src/communication/communication-events');

test('HANDOFF 1: Resolves agent candidate by requested capability', () => {
  const router = new CommunicationRouter();
  const qaAgent = router.resolveAgentForCapability('qa');
  assert.equal(qaAgent, 'agent-qa');

  const secAgent = router.resolveAgentForCapability('security');
  assert.equal(secAgent, 'agent-security');

  const archAgent = router.resolveAgentForCapability('architecture');
  assert.equal(archAgent, 'agent-architect');
});

test('HANDOFF 2: Executes formal handoff transferring mission responsibility', () => {
  const bus = new AgentCommunicationBus();
  const presenceMgr = new PresenceManager({ bus });
  const router = new CommunicationRouter({ bus, presenceManager: presenceMgr });

  let handoffCaptured = null;
  bus.on(COMMUNICATION_EVENTS.AGENT_HANDOFF, (e) => { handoffCaptured = e.payload; });

  const handoff = router.executeHandoff({
    sourceAgent: 'agent-backend',
    targetAgent: 'agent-qa',
    missionId: 'm-handoff-demo',
    taskId: 'task-auth-tests',
    reason: 'Code complete. Verification needed.',
    artifacts: ['grg/src/api/auth.js'],
    expectedOutcome: 'All 5 auth tests pass'
  });

  assert.ok(handoff.handoffId);
  assert.equal(handoff.hopCount, 1);
  assert.equal(handoffCaptured.targetAgent, 'agent-qa');

  // Source becomes AVAILABLE, Target becomes WORKING
  assert.equal(presenceMgr.getAgentPresence('agent-backend').status, PRESENCE_STATUSES.AVAILABLE);
  const qaPres = presenceMgr.getAgentPresence('agent-qa');
  assert.equal(qaPres.status, PRESENCE_STATUSES.WORKING);
  assert.equal(qaPres.currentMissionId, 'm-handoff-demo');
});

test('HANDOFF 3: Prevents infinite delegation chains exceeding max hops', () => {
  const router = new CommunicationRouter({ maxHops: 3 });

  // 1st hop
  router.executeHandoff({ sourceAgent: 'a1', targetAgent: 'a2', missionId: 'm-loop' });
  // 2nd hop
  router.executeHandoff({ sourceAgent: 'a2', targetAgent: 'a3', missionId: 'm-loop' });
  // 3rd hop
  router.executeHandoff({ sourceAgent: 'a3', targetAgent: 'a4', missionId: 'm-loop' });

  // 4th hop should throw
  assert.throws(() => {
    router.executeHandoff({ sourceAgent: 'a4', targetAgent: 'a5', missionId: 'm-loop' });
  }, /maximum hop limit/i);
});
