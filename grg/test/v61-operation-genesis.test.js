const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FÊNIX V6.1 Operation Genesis End-to-End Integration Test', async () => {
  const app = await createApp({ dataFile: null });

  const tenantId = 'grg';
  const actorId = 'grg-admin';

  await app.controlPlane.createTenant({ id: tenantId, name: 'GRG' }, actorId);

  // 1. Knowledge Genome & Capsule Promotion
  const capsule = await app.knowledgeGenome.createCapsule(tenantId, actorId, {
    title: 'Architecture Guideline',
    content: 'All services use ports and adapters pattern.',
    level: 'WORKING',
  });
  assert.equal(capsule.title, 'Architecture Guideline');
  assert.equal(capsule.level, 'WORKING');

  const promoted = await app.knowledgeGenome.promoteCapsule(tenantId, actorId, capsule.id, 'PROJECT', 'Volume threshold');
  assert.equal(promoted.level, 'PROJECT');

  // 2. Cognitive Hypotheses
  const hypothesis = await app.hypothesisEngine.proposeHypothesis(tenantId, actorId, {
    title: 'Optimize Database Connection Pool',
    description: 'Increase pool size to 20 for peak load.',
    category: 'PERFORMANCE',
  });
  assert.equal(hypothesis.category, 'PERFORMANCE');
  assert.equal(hypothesis.status, 'PROPOSED');

  const evalResult = await app.hypothesisEngine.evaluateHypothesis(tenantId, actorId, hypothesis.id);
  assert.ok(evalResult.hypothesis);

  // 3. Cross Project Learning
  const crossReport = await app.crossProjectLearning.analyzeProjects(tenantId, actorId);
  assert.ok(crossReport.analyzedAt);

  // 4. Multimodal Pipeline
  const ingest = await app.multimodalPipeline.processFile(tenantId, actorId, {
    filename: 'openapi.json',
    content: '{"openapi": "3.0.0", "paths": {"/api/v1/users": {"get": {}}}}',
  });
  assert.equal(ingest.category, 'API_SPEC');
  assert.ok(ingest.capsuleId);

  // 5. Model Orchestrator
  const route = app.modelOrchestrator.selectModel('CODE');
  assert.equal(route.task, 'CODE');
  assert.ok(route.model);

  const modelResult = await app.modelOrchestrator.executeTask(tenantId, actorId, 'CODE', { prompt: 'Write function' });
  assert.ok(modelResult.result);

  // 6. Agent Swarm
  const agentsList = await app.agentSwarm.listAgents(tenantId, actorId);
  assert.equal(agentsList.agents.length, 15);

  const swarmEvent = await app.agentSwarm.dispatchEvent(tenantId, actorId, {
    targetAgent: 'agent-architect',
    type: 'architecture.review',
    data: { repo: 'ai-engine-core' },
  });
  assert.equal(swarmEvent.targetAgent, 'agent-architect');

  // 7. VPS Operations
  const vpsServers = await app.vpsOps.listServers(tenantId, actorId);
  assert.ok(vpsServers.servers.length > 0);

  const vpsPlan = await app.vpsOps.createOperationPlan(tenantId, actorId, {
    action: 'RESTART_SERVICE',
    target: 'vps-primary',
  });
  assert.equal(vpsPlan.status, 'PLANNED');

  const vpsExecuted = await app.vpsOps.executeOperationPlan(tenantId, actorId, vpsPlan.id);
  assert.equal(vpsExecuted.plan.status, 'EXECUTED');

  // 8. GitHub Operations
  const ghOrgs = await app.githubOps.listOrgs(tenantId, actorId);
  assert.ok(ghOrgs.orgs.length > 0);

  const ghPr = await app.githubOps.createPullRequest(tenantId, actorId, {
    repoId: 'repo-grg',
    title: 'Feat V6.1 Operation Genesis',
    head: 'feature/v6-genesis',
    base: 'main',
  });
  assert.equal(ghPr.state, 'OPEN');

  // 9. Project Factory Demands
  const demand = await app.projectFactory.processDemand(tenantId, actorId, {
    prompt: 'Criar um ERP completo com módulo de estoque e financeiro',
  });
  assert.equal(demand.projectType, 'ERP');

  // 10. Background Cognition
  const bgReport = await app.backgroundCognition.runIdleMaintenance(tenantId, actorId);
  assert.equal(bgReport.status, 'IDLE_MAINTENANCE_COMPLETED');

  // 11. External Search
  const searchResult = await app.externalSearch.search(tenantId, actorId, { q: 'Node.js Express Hexagonal' });
  assert.ok(searchResult.results.length > 0);

  // 12. Master Avatar State Machine
  const avatarState = app.masterAvatar.getState();
  assert.ok(avatarState.availableStates.includes('EXECUTANDO'));

  await app.close();
});
