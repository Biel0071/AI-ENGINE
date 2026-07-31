const { StorageManager } = require('../src/storage/storage-manager');
const { KnowledgeEngine } = require('../src/knowledge/knowledge-engine');
const { EventEmitter } = require('node:events');

async function testKnowledge() {
  const sm = new StorageManager();
  await sm.boot();
  console.log('Stats:', sm.getStats());

  const eventBus = new EventEmitter();
  const mockAIRouter = {
    routePrompt: async (prompt) => {
      return JSON.stringify({ reason: "The architecture decoupled state from processing well", pattern: "Decoupled Processing", recommended: true, avoid: false });
    }
  };

  const engine = new KnowledgeEngine({ storageManager: sm, eventBus, aiRouter: mockAIRouter });
  
  // Test Phase 3 Memory
  await engine.episodicMemory.recordEpisode('test1', { action: 'start' });
  const episode = await engine.episodicMemory.retrieveEpisode('test1');
  console.log('Episode:', episode);

  await engine.semanticMemory.memorize('vec1', 'Hello Semantic', { tags: ['test'] });
  const search = await engine.semanticMemory.search('hello');
  console.log('Search Result:', search);
  
  await engine.longTermMemory.learnFact('fact1', 'The sky is blue');
  const fact = await engine.longTermMemory.recall('fact1');
  console.log('Fact:', fact);
  
  // Test Phase 3.5 Learning & Decision Loop
  const fakeMission = {
    id: 'm1',
    name: 'Build CRM API',
    domain: 'CRM',
    success: true,
    duration: 65000,
    cost: 0.10,
    errorCount: 0,
    retries: 0,
    tokensUsed: 4000,
    provider: 'Qwen',
    worker: 'BackendWorker',
    filesChanged: 4,
    tags: ['architecture']
  };

  console.log('\n--- Emitting MissionCompleted ---');
  eventBus.emit('MissionCompleted', { mission: fakeMission });
  
  // Wait a bit for the async LLM reflection to complete
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n--- Querying Decision Engine ---');
  const advice = await engine.decisionEngine.askForAdvice('Build CRM API', { domain: 'CRM' });
  console.log('Advice:', JSON.stringify(advice, null, 2));

  await sm.shutdown();
}

testKnowledge().catch(console.error);
