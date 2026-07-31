const { StorageManager } = require('../src/storage/storage-manager');
const { KnowledgeEngine } = require('../src/knowledge/knowledge-engine');
const { EventEmitter } = require('node:events');

async function runE2E() {
  console.log('--- Booting Runtime ---');
  let sm = new StorageManager();
  await sm.boot();
  let bus = new EventEmitter();
  
  let engine = new KnowledgeEngine({ storageManager: sm, eventBus: bus });
  
  // 1. Create a running mission
  const mission1 = {
    id: 'm1_pending',
    name: 'Build CRUD API',
    state: 'RUNNING',
    domain: 'CRUD'
  };
  await engine.episodicMemory.recordEpisode(mission1.id, mission1);
  console.log('Saved running mission.');

  // 2. Restart Backend
  console.log('\n--- Simulating Restart ---');
  await sm.shutdown();

  sm = new StorageManager();
  await sm.boot();
  bus = new EventEmitter();
  engine = new KnowledgeEngine({ storageManager: sm, eventBus: bus });

  // 3. Recovery Phase
  console.log('\n--- Recovering Missions ---');
  const allMissions = await engine.missionStore.find({});
  const pending = allMissions.filter(m => m.state === 'PENDING' || m.state === 'RUNNING');
  console.log(`Recovered ${pending.length} missions.`);
  if (pending.length === 0) throw new Error('Recovery failed');

  // 4. Mission completes successfully
  const missionSuccess = {
    ...pending[0],
    state: 'COMPLETED',
    success: true,
    duration: 15000,
    cost: 0.12,
    errorCount: 0,
    retries: 0,
    tokensUsed: 10000,
    filesChanged: 5,
    testStatus: 'PASS',
    pattern: 'Express_CRUD',
    reason: 'Used Layered Architecture',
    recommended: true,
    confidence: 0.98
  };
  
  console.log('\n--- Emitting MissionCompleted ---');
  bus.emit('MissionCompleted', { mission: missionSuccess });
  await new Promise(r => setTimeout(r, 1000)); // Wait for async promotion

  // 5. Create new mission
  console.log('\n--- Querying Decision Engine for New Mission ---');
  const advice = await engine.decisionEngine.askForAdvice('Build CRUD API', { domain: 'CRUD' });
  console.log('Advice received:', JSON.stringify(advice, null, 2));

  if (advice.recommendedPattern !== 'Express_CRUD') {
    console.warn('Pattern was not promoted!');
  } else {
    console.log('E2E SUCCESS: Recovery and Decision Re-use works perfectly.');
  }

  await sm.shutdown();
}

runE2E().catch(console.error);
