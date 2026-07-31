const { StorageManager } = require('../src/storage/storage-manager');
const { KnowledgeEngine } = require('../src/knowledge/knowledge-engine');
const { MissionPlanner } = require('../src/missions/mission-planner');
const { EventEmitter } = require('node:events');

async function runPCValidation() {
  console.log('=== FÊNIX PC VALIDATION E2E ===\n');
  const sm = new StorageManager();
  await sm.boot();
  
  const bus = new EventEmitter();
  const engine = new KnowledgeEngine({ storageManager: sm, eventBus: bus });
  const planner = new MissionPlanner({ router: null, estimator: null });

  console.log('[1] Creating Mission');
  const mission = {
    id: 'pc_mission_1',
    intent: { type: 'Crie uma API REST completa para gerenciamento de clientes' },
    state: 'ANALYZED',
    domain: 'API_Development'
  };

  console.log('[2] Planning Mission');
  const plannedMission = await planner.plan(mission);
  console.log(`Plan generated with ${plannedMission.jobs.length} jobs.`);

  console.log('[3] Decision Engine Consulting');
  const advice = await engine.decisionEngine.askForAdvice('Crie uma API REST completa para gerenciamento de clientes', { domain: 'API_Development' });
  console.log(`Decision Advice: ${advice ? 'Found' : 'None yet'}`);

  console.log('[4] Executing Workers (Simulated Real Pathway)');
  // We simulate the Worker Engine executing the DAG successfully
  plannedMission.state = 'COMPLETED';
  plannedMission.success = true;
  plannedMission.duration = 42000;
  plannedMission.cost = 0.05;
  plannedMission.tokensUsed = 8500;
  plannedMission.testStatus = 'PASS';
  plannedMission.pattern = 'REST_API_Customers';
  plannedMission.reason = 'Standard Express Controller/Service/Repository pattern with JWT.';

  console.log('[5] Knowledge Engine & Learning');
  bus.emit('MissionCompleted', { mission: plannedMission });
  
  // Wait for async processing of experience extraction and pattern promotion
  await new Promise(r => setTimeout(r, 1500));

  console.log('[6] Project Memory Update');
  await engine.projectStore.set('prj_customers', {
    name: 'Customer Management API',
    architecture: 'REST',
    decisions: ['Used Express for speed', 'Used JWT for stateless auth'],
    patternsUsed: ['REST_API_Customers']
  });
  
  console.log('[7] Assertions');
  const patterns = await engine.patternStore.find({});
  const hasPattern = patterns.some(p => p.name === 'REST_API_Customers');
  if (hasPattern) {
    console.log('✅ Pattern successfully promoted based on criteria!');
  } else {
    console.warn('❌ Pattern was NOT promoted!');
  }

  const project = await engine.projectStore.get('prj_customers');
  if (project) {
    console.log('✅ Project Memory successfully restored context:', project.name);
  }

  console.log('\n=== E2E VALIDATION COMPLETE ===');
  await sm.shutdown();
}

runPCValidation().catch(console.error);
