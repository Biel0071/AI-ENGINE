const test = require('node:test');
const assert = require('node:assert/strict');
const { CognitiveMemoryEngine } = require('../src/memory/cognitive-memory-engine');
const { AutonomousEvolutionKernel } = require('../src/evolution/autonomous-evolution-kernel');
const { CapabilityMarketplace } = require('../src/capabilities/capability-marketplace');
const { EventBus } = require('../src/kernel/event-bus');

test('Milestone 3 — CognitiveMemoryEngine manages 6 memory layers', async () => {
  const eventBus = new EventBus();
  const memory = new CognitiveMemoryEngine({ eventBus });

  memory.setWorkingMemory('activeProject', 'CRM');
  assert.equal(memory.getWorkingMemory('activeProject'), 'CRM');

  memory.recordMissionMemory('M-101', { status: 'COMPLETED' });
  const snapshot = memory.getMemorySnapshot();
  assert.equal(snapshot.workingMemoryCount, 1);
  assert.equal(snapshot.missionMemoryCount, 1);
});

test('Milestone 3 — AutonomousEvolutionKernel scans workspace in Living Mode', async () => {
  const eventBus = new EventBus();
  const aek = new AutonomousEvolutionKernel({ eventBus });

  const findings = await aek.runLivingModeScan();
  assert.equal(findings.length, 3);
  assert.equal(aek.getBacklog().length, 3);
});

test('Milestone 3 — CapabilityMarketplace lists reusable capabilities', async () => {
  const marketplace = new CapabilityMarketplace();
  const caps = marketplace.listCapabilities();
  assert.equal(caps.length, 3);
  assert.equal(marketplace.getCapability('cap.intent_decomposition').status, 'AVAILABLE');
});
