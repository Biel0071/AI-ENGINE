const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { AgentFactory, AgentTeam } = require('../src/workforce/agent-factory');
const { AGENT_STATES } = require('../src/workforce/agent-entity');
const { SelfCreatingSkillEngine, EVOLUTION_STAGES } = require('../src/skills/self-creating-skill-engine');
const { FenixMeshCluster, NODE_TYPES, NODE_STATUS } = require('../src/ops/fenix-mesh');
const { DeterministicEngine } = require('../src/kernel/deterministic-engine');

test('AUTONOMOUS AGENT OS CERTIFICATION: Multi-Agent Collaboration, Anti-Loop, Self-Creating Skill & Mesh Resilience', async () => {
  const rootDir = path.resolve(__dirname, '..');
  const engine = new DeterministicEngine({ rootDir });
  const factory = new AgentFactory();

  // 1. Agent Runtime & Multi-Agent Team Creation
  const engineer = factory.createEngineer('FENIX-ENGINEER-01');
  const qa = factory.createQA('FENIX-QA-01');
  assert.equal(engineer.id, 'FENIX-ENGINEER-01');
  assert.equal(qa.id, 'FENIX-QA-01');
  assert.equal(engineer.state, AGENT_STATES.READY);
  assert.equal(qa.state, AGENT_STATES.READY);

  const team = new AgentTeam({
    name: 'Alpha Engineering Squad',
    leader: engineer,
    members: [engineer, qa]
  });
  assert.equal(team.members.size, 2);

  // 2. Real Low-Risk Task Execution by FENIX-ENGINEER-01
  engineer.transitionTo(AGENT_STATES.RUNNING, 'Executing static AST analysis on kernel code');
  const fileToAnalyze = 'src/kernel/deterministic-engine.js';
  const fileContent = engine.fsRead(fileToAnalyze);
  const astMetrics = engine.astAnalyze(fileContent.content);
  assert.ok(astMetrics.metrics.functionCount > 5, 'AST extracted real functions');
  engineer.recordExecution(35, true);
  engineer.transitionTo(AGENT_STATES.COMPLETED, 'AST analysis completed');

  // 3. Delegation & Collaboration: Engineer sends task verification request to QA
  const delegationMsg = team.routeMessage({
    senderId: engineer.id,
    receiverId: qa.id,
    missionId: 'msn_audit_001',
    payload: {
      action: 'VERIFY_AST_AUDIT',
      targetFile: fileToAnalyze,
      fileHash: fileContent.hash,
      functionCount: astMetrics.metrics.functionCount
    }
  });
  assert.equal(qa.inbox.length, 1);
  assert.equal(qa.inbox[0].payload.fileHash, fileContent.hash);

  // 4. QA Validation & Evidence Generation
  qa.transitionTo(AGENT_STATES.RUNNING, 'Validating audit results');
  const receivedTask = qa.inbox.pop();
  assert.equal(receivedTask.sender, engineer.id);
  
  // QA independently verifies file and evidence
  const verifyRead = engine.fsRead(receivedTask.payload.targetFile);
  assert.equal(verifyRead.hash, receivedTask.payload.fileHash, 'File integrity verified by QA');
  
  const evidence = engine.createEvidence({
    claim: 'AST Code Analysis Independently Verified by QA',
    details: {
      auditor: qa.id,
      engineer: engineer.id,
      metrics: astMetrics.metrics
    },
    artifacts: [fileToAnalyze]
  });
  assert.ok(evidence.evidenceHash.length === 64);
  qa.recordDiscovery({ evidenceHash: evidence.evidenceHash, status: 'VERIFIED' });
  qa.recordExecution(20, true);
  qa.transitionTo(AGENT_STATES.COMPLETED, 'QA verification successful');

  // QA notifies engineer of approval
  team.routeMessage({
    senderId: qa.id,
    receiverId: engineer.id,
    missionId: 'msn_audit_001',
    payload: {
      action: 'AUDIT_APPROVED',
      evidenceId: evidence.evidenceId,
      evidenceHash: evidence.evidenceHash
    }
  });
  assert.equal(engineer.inbox.length, 1);
  assert.equal(engineer.inbox[0].payload.action, 'AUDIT_APPROVED');

  // 5. Anti-Loop Circuit Breaker: circular message test
  let circularLoopCaught = false;
  try {
    // Send a message that already has hop threshold reached
    team.routeMessage({
      senderId: engineer.id,
      receiverId: qa.id,
      missionId: 'msn_audit_001',
      payload: { content: 'ping pong', _hopCount: 10 },
      maxHops: 10
    });
  } catch (err) {
    if (err.message.includes('maximum hop threshold')) {
      circularLoopCaught = true;
    }
  }
  assert.equal(circularLoopCaught, true, 'Multi-agent router must abort circular loops');

  // 6. Self-Creating Skill Engine: Experience -> Sandbox -> Verification -> Promotion
  const skillEngine = new SelfCreatingSkillEngine();
  const proposal = skillEngine.proposeSkillFromExperience({
    proposerAgentId: engineer.id,
    name: 'ast_code_integrity_audit',
    domain: 'software_engineering',
    description: 'Deterministic AST inspection and integrity verification',
    experienceRecord: {
      missionId: 'msn_audit_001',
      fileAnalyzed: fileToAnalyze,
      hash: fileContent.hash
    },
    steps: [
      { id: '1', action: 'read source file' },
      { id: '2', action: 'compute sha256 checksum' },
      { id: '3', action: 'extract functions and classes via AST' }
    ],
    tools: ['deterministic-engine', 'ast-analyzer'],
    testSuite: [
      { name: 'verify non-empty AST output', expected: true },
      { name: 'verify sha256 consistency', expected: true }
    ]
  });

  assert.equal(proposal.stage, EVOLUTION_STAGES.PROPOSAL);
  assert.equal(proposal.auditTrail.length, 4);

  // Evaluate in Sandbox
  const sandboxEval = await skillEngine.runSandboxEvaluation(proposal.proposalId);
  assert.equal(sandboxEval.success, true);
  assert.equal(sandboxEval.stage, EVOLUTION_STAGES.PROMOTED);
  assert.ok(sandboxEval.skill.id.startsWith('skill_ast_code_integrity_audit'));

  const registeredSkill = skillEngine.getSkill(sandboxEval.skill.id);
  assert.ok(registeredSkill !== undefined);
  assert.equal(registeredSkill.verification.length, 2);
  assert.equal(registeredSkill.validatePreconditions().ok, true);

  // 7. Fenix Mesh Cluster Failover & State Migration
  const mesh = new FenixMeshCluster();
  mesh.assignMission('msn_mission_critical_007', 'node-pc-local');
  assert.equal(mesh.missionPlacement.get('msn_mission_critical_007'), 'node-pc-local');

  // Simulate unexpected PC shutdown / disconnect
  const migrationRes = mesh.handleNodeFailure('node-pc-local', 'Power failure on workstation');
  assert.equal(migrationRes.migratedCount, 1);
  assert.equal(migrationRes.targetNodeId, 'node-vps-primary');
  assert.equal(mesh.missionPlacement.get('msn_mission_critical_007'), 'node-vps-primary');

  // Simulate PC reconnection & sync
  const reconRes = mesh.syncNodeOnReconnection('node-pc-local');
  assert.equal(reconRes.status, 'RECONCILED');
  assert.equal(reconRes.activeAssignments.length, 1);
  assert.equal(reconRes.activeAssignments[0].currentNodeId, 'node-vps-primary');

  console.log('\n[AUTONOMOUS AGENT OS CERTIFICATION RESULTS]');
  console.log('--------------------------------------------------');
  console.log(' ✔ Multi-Agent Squad & State Transitions: PASS');
  console.log(' ✔ Engineer -> QA Delegation & Evidence:  PASS');
  console.log(' ✔ Anti-Loop Circuit Breaker:             PASS');
  console.log(' ✔ Self-Creating Skill Sandbox & Promo:   PASS');
  console.log(' ✔ Mesh Node Failover & Migration:        PASS');
  console.log('--------------------------------------------------');
  console.log(' ALL AUTONOMOUS AGENT OS CAPABILITIES VERIFIED 100%');
});
