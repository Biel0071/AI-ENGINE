const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

test('GRG FENIX V6.1 Operation Genesis End-to-End Integration Test', async () => {
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

  // 7. VPS Operations (contrato honesto: nao ha mais servidor FABRICADO. Um servidor so aparece
  // se foi REGISTRADO de verdade -- entao registramos um e provamos que ele aparece na lista.)
  const registered = await app.vpsOps.registerServer(tenantId, actorId, { hostname: 'vps-test-01', ip: '10.0.0.1' });
  assert.equal(registered.status, 'REGISTERED'); // nao 'ONLINE' fabricado
  assert.equal(registered.telemetry, null); // telemetria ausente ate um probe real medir
  const vpsServers = await app.vpsOps.listServers(tenantId, actorId);
  assert.ok(vpsServers.servers.length > 0);

  const vpsPlan = await app.vpsOps.createOperationPlan(tenantId, actorId, {
    action: 'RESTART_SERVICE',
    target: 'vps-primary',
  });
  assert.equal(vpsPlan.status, 'PLANNED');

  // Contrato honesto: sem executor real de VPS injetado, a operacao NAO finge sucesso. Antes
  // devolvia 'EXECUTED' + 'Operation completed successfully' sem executar nada (deploy ficticio).
  const vpsExecuted = await app.vpsOps.executeOperationPlan(tenantId, actorId, vpsPlan.id);
  assert.equal(vpsExecuted.plan.status, 'NOT_IMPLEMENTED');
  assert.equal(vpsExecuted.executed, false);
  assert.ok(vpsExecuted.reason);

  // 8. GitHub Operations (contrato honesto: sem org FABRICADA. Sem connector com token, a lista
  // e vazia de verdade, e um PR e registrado LOCALMENTE -- marcado como tal, com number null,
  // sem Math.random() -- em vez de fingir um PR remoto que nao existe no GitHub.)
  const ghOrgs = await app.githubOps.listOrgs(tenantId, actorId);
  assert.equal(ghOrgs.orgs.length, 0); // nenhuma org registrada => vazio honesto

  const ghPr = await app.githubOps.createPullRequest(tenantId, actorId, {
    repoId: 'repo-grg',
    title: 'Feat V6.1 Operation Genesis',
    head: 'feature/v6-genesis',
    base: 'main',
  });
  assert.equal(ghPr.origin, 'local-record'); // nao foi aberto no GitHub (sem connector)
  assert.equal(ghPr.state, 'OPEN_LOCAL');
  assert.equal(ghPr.number, null); // sem numero aleatorio inventado

  // 9. Project Factory Demands
  const demand = await app.projectFactory.processDemand(tenantId, actorId, {
    prompt: 'Criar um ERP completo com módulo de estoque e financeiro',
  });
  assert.equal(demand.projectType, 'ERP');

  // 10. Background Cognition
  const bgReport = await app.backgroundCognition.runIdleMaintenance(tenantId, actorId);
  assert.equal(bgReport.status, 'IDLE_MAINTENANCE_COMPLETED');

  // 11. External Search (contrato honesto: research desligado por padrao devolve `unknown`
  // com motivo, NUNCA resultados fabricados. A versao antiga esperava length>0 porque o
  // servico mentia com 2 achados fixos; agora o vazio honesto e o comportamento correto.)
  const searchResult = await app.externalSearch.search(tenantId, actorId, { q: 'Node.js Express Hexagonal' });
  assert.ok(['measured', 'unknown'].includes(searchResult.state));
  if (searchResult.state === 'unknown') assert.ok(searchResult.reason && searchResult.results.length === 0);

  // 12. Master Avatar State Machine
  const avatarState = app.masterAvatar.getState();
  assert.ok(avatarState.availableStates.includes('EXECUTANDO'));

  await app.close();
});
