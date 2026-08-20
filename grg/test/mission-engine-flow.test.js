const path = require('path');
const { ConversationGateway } = require('../src/chat/conversation-gateway');
const { IntentEngine } = require('../src/missions/intent-engine');
const { MissionPlanner } = require('../src/missions/mission-planner');
const { JobScheduler } = require('../src/missions/job-scheduler');
const { Estimator } = require('../src/missions/estimator');
const { QualityGate } = require('../src/missions/quality-gate');
const { CapabilityRegistry } = require('../src/ai-runtime/capability-registry');
const { AIRouter } = require('../src/ai-runtime/ai-router');
const { WorkerRegistry } = require('../src/missions/worker-registry');

// Mock EventBus for testing
class MockEventBus {
  emit(eventName, payload) {
    console.log(`[EventBus] ${eventName} ->`, payload);
  }
}

// Simple mock AI provider for Phase 2.5
class MockProvider {
  constructor(name) {
    this.name = name;
  }
  async generate(prompt) {
    if (prompt.includes('Classify')) return { text: 'ARCHITECTURE_REFACTOR' };
    if (prompt.includes('Audit')) return { text: JSON.stringify({ passed: true, reasons: [] }) };
    if (prompt.includes('Estimate')) return { text: JSON.stringify({ roi: 'HIGH', complexity: 'MEDIUM' }) };
    if (prompt.includes('Create a DAG')) {
      return {
        text: JSON.stringify({
          objective: 'ARCHITECTURE_REFACTOR',
          dependencies: [],
          risks: ['Mock Risk'],
          plan: [],
          validation: ['Mock Validation']
        })
      };
    }
    // Simulate some real worker LLM outputs
    if (prompt.includes('Execute job')) {
      return { text: `Successfully generated architecture for job` };
    }
    return { text: 'Mock LLM Response' };
  }
}

async function runTest() {
  console.log('[Test] Starting Mission Engine Phase 2.5 Flow (Real Workers)');
  
  const eventBus = new MockEventBus();

  // 1. Setup Capabilities
  const capabilityRegistry = new CapabilityRegistry();
  const mockClaude = new MockProvider('claude');
  const mockGemini = new MockProvider('gemini');
  // Registering capabilities used by the workers
  capabilityRegistry.registerProvider('claude-mock', mockClaude, ['architecture', 'reasoning', 'audit', 'planning', 'backend', 'crud', 'security', 'summaries']);
  capabilityRegistry.registerProvider('gemini-mock', mockGemini, ['classification', 'routing', 'ui', 'release']);
  
  const mockConnectors = {
    list: () => ['ai:claude', 'ai:gemini'],
    status: async () => ({ state: { value: 'CONNECTED' } }),
    connectors: new Map([
      ['ai:claude', { models: () => ['claude-3-5-sonnet'] }],
      ['ai:gemini', { models: () => ['gemini-2.0-flash'] }]
    ])
  };
  const mockGateway = {
    invoke: async (tenantId, actorId, req) => {
      const prompt = req.prompt || '';
      const res = await mockClaude.generate(prompt);
      return { ok: true, result: res };
    }
  };
  const router = new AIRouter({ connectors: mockConnectors, gateway: mockGateway });

  // 2. Setup Worker Registry (No Mock Workers)
  const workerRegistry = new WorkerRegistry({ eventBus, router });
  const workersDir = path.join(__dirname, '../src/missions/workers');
  
  console.log('[Test] Discovering Workers...');
  await workerRegistry.discoverAndRegister(workersDir);
  
  const registeredCount = workerRegistry.workers.size;
  console.log(`[Test] Registered ${registeredCount} workers.`);
  if (registeredCount < 10) {
    throw new Error(`Expected at least 10 workers, found ${registeredCount}`);
  }

  // Optional: Start health checks
  workerRegistry.startHealthCheck(1000);

  // 3. Setup Mission Engine components
  const intentEngine = new IntentEngine({ router });
  const estimator = new Estimator({ router });
  const missionPlanner = new MissionPlanner({ router, estimator });
  const jobScheduler = new JobScheduler({ workerRegistry });
  const qualityGate = new QualityGate({ router });

  // 4. Setup Gateway
  const gateway = new ConversationGateway({
    intentEngine,
    missionPlanner,
    jobScheduler,
    qualityGate
  });

  console.log('\n[Test] Simulated Message Received...');
  
  // 5. Run Flow
  const result = await gateway.processMessage({
    message: 'Can you refactor the backend API to use the new Mission schema?',
    tenantId: 'tenant-1',
    actorId: 'user-1',
    sessionId: 'session-123'
  });

  const mission = result.mission;
  
  console.log('\n--- Mission Flow Result ---');
  console.log('Intent:', mission.intent.type);
  console.log('Final State:', mission.state);
  console.log('Estimate Cost:', mission.estimate.price);
  console.log('Jobs Executed:', mission.jobs.filter(j => j.status === 'COMPLETED').length);
  
  // Check metrics on workers
  console.log('\n--- Worker Telemetry ---');
  const metrics = workerRegistry.getAllMetrics();
  for (const [name, data] of Object.entries(metrics)) {
    console.log(`${name}: ${data.jobsExecuted} jobs, Health: ${data.health}`);
  }

  // Assertions
  if (mission.state !== 'COMPLETED') throw new Error('Mission did not reach COMPLETED state');
  if (mission.intent.type !== 'ARCHITECTURE_REFACTOR') throw new Error('Intent classification failed');
  if (mission.jobs.length !== 9) throw new Error(`Expected 9 jobs in DAG, found ${mission.jobs.length}`);

  console.log('\n[Test] SUCCESS - Phase 2.5 Real Worker Flow Validated.');

  workerRegistry.stopAll();
}

runTest().catch(err => {
  console.error('[Test] FAILED:', err);
  process.exit(1);
});
