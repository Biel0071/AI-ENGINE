'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { globalProjectMemoryIndex } = require('../grg/src/memory/project-memory-index');
const { globalReaIntelligenceEngine } = require('../grg/src/services/rea-intelligence-engine');
const { handleProjectWorkspaceRoutes } = require('../grg/src/api/project-workspace-routes');

async function runPhase53UnitCertification() {
  console.log('================================================================');
  console.log('PHASE 53 — GLOBAL EVOLUTION (FASES 1–14) UNIT & API CERTIFICATION');
  console.log('================================================================');

  // 1. Fase 1: Global Ecosystem Inventory
  const inv = globalReaIntelligenceEngine.getGlobalEcosystemInventory();
  assert.equal(inv.ok, true);
  assert.ok(inv.capabilities.length >= 12, 'Must catalog at least 12 capabilities');
  for (const cap of inv.capabilities) {
    assert.equal(cap.certificationStage, 'CERTIFIED', `${cap.id} CERTIFIED`);
    for (const st of ['DISCOVERED', 'ANALYZED', 'IMPLEMENTED', 'TESTED', 'CERTIFIED']) {
      assert.ok(cap.stages.includes(st), `${cap.id} stage ${st}`);
    }
  }
  console.log(`   ✅ [Fase 1] Ecosystem Inventory certified (${inv.capabilities.length} capabilities, ${inv.projects.length} projects)`);

  // 2. Fase 2: REA Reference Systems Specs
  const specs = globalReaIntelligenceEngine.getReferenceSystemsSpecs();
  assert.equal(specs.ok, true);
  assert.equal(specs.referenceSystems.length, 5, 'Must include Stitch, Lovable, Miro, MCP Brain, Living City');
  console.log(`   ✅ [Fase 2] REA Reference Specs certified (${specs.referenceSystems.map((s) => s.id).join(', ')})`);

  // 3. Fase 3: Technology Evaluation Matrix
  const matrix = globalReaIntelligenceEngine.getTechnologyEvaluationMatrix();
  assert.equal(matrix.ok, true);
  assert.equal(matrix.categories.length, 8, 'Must cover categories A through H');
  console.log(`   ✅ [Fase 3] Technology Evaluation Matrix certified (${matrix.categories.length} categories A-H)`);

  // 4. Fase 6: Visual Pattern Library & Design Intelligence
  const vlib = globalReaIntelligenceEngine.getVisualPatternLibrary();
  assert.equal(vlib.ok, true);
  assert.ok(vlib.patterns.length >= 5);
  const vana = globalReaIntelligenceEngine.analyzeVisualDesign({ view: 'view-flowgraph', html: '<div style="color:var(--cyan)"></div>' });
  assert.equal(vana.ok, true);
  assert.equal(vana.dimensions.length, 5);
  console.log(`   ✅ [Fase 6] Visual Pattern Library (${vlib.patterns.length} patterns) & Design Analyzer certified`);

  // 5. Fase 8: Cognitive Memory & Incremental SHA-256 Fingerprinting
  const sync1 = globalProjectMemoryIndex.incrementalSync();
  assert.equal(sync1.ok, true);
  const sync2 = globalProjectMemoryIndex.incrementalSync();
  assert.equal(sync2.ok, true);
  assert.ok(sync2.stats.cacheHits >= 1, 'Second incremental sync must hit SHA-256 cache without re-reading unchanged files');
  const pv1 = globalProjectMemoryIndex.recordPatternVersion('pat-stitch-dag', { title: 'Stitch DAG', category: 'canvas', summary: 'v1' });
  assert.equal(pv1.version, 'v1.0');
  const pv1Dup = globalProjectMemoryIndex.recordPatternVersion('pat-stitch-dag', { title: 'Stitch DAG', category: 'canvas', summary: 'v1' });
  assert.equal(pv1Dup.updated, false);
  const pv2 = globalProjectMemoryIndex.recordPatternVersion('pat-stitch-dag', { title: 'Stitch DAG', category: 'canvas', summary: 'v2-updated' });
  assert.equal(pv2.version, 'v2.0');
  console.log(`   ✅ [Fase 8] Incremental SHA-256 Fingerprinting (cacheHits=${sync2.stats.cacheHits}) & Pattern Versioning (${pv1.version} -> ${pv2.version}) certified`);

  // 6. Fase 9: Multi-Agent DAG Orchestration, Anti-Loop & Checkpoints
  const orch1 = await globalReaIntelligenceEngine.orchestrateSystem('fenix-os', 'Certificar DAG Phase 53', { priority: 'high' });
  assert.equal(orch1.ok, true);
  assert.equal(orch1.deduplicated, false);
  assert.equal(orch1.dagSteps.length, 7, 'Must decompose into 7 specialized DAG steps');
  const orchDup = await globalReaIntelligenceEngine.orchestrateSystem('fenix-os', 'Certificar DAG Phase 53', { priority: 'high' });
  assert.equal(orchDup.deduplicated, true, 'Immediate identical orchestration must be deduplicated by anti-loop guard');
  const cpRes = globalReaIntelligenceEngine.createOrchestrationCheckpoint(orch1.orchestrationId, { note: 'Pre-Release Gate' });
  assert.equal(cpRes.ok, true);
  const appRes = globalReaIntelligenceEngine.approveOrchestration(orch1.orchestrationId, 'APPROVE', 'grg-admin');
  assert.equal(appRes.ok, true);
  const retryRes = globalReaIntelligenceEngine.retryOrchestration(orch1.orchestrationId, { stepKey: 'implement' });
  assert.equal(retryRes.ok, true);
  console.log(`   ✅ [Fase 9] Multi-Agent 7-Role DAG, Anti-Loop Deduplication, Checkpoint, Approval & Retry certified`);

  // 7. Fase 11: Security & Resilience Audit
  const sec = globalReaIntelligenceEngine.runSecurityAndResilienceAudit();
  assert.equal(sec.ok, true);
  assert.equal(sec.overallState, 'HARDENED');
  assert.equal(sec.checks.length, 6);
  console.log(`   ✅ [Fase 11] Security & Resilience Audit certified (${sec.overallState}, ${sec.checks.length}/6 checks enforced)`);

  // 8. Fase 5: Autonomous IDE Workspace Search, Save Checkpoint & Rollback
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-ide-phase53-'));
  const sampleFile = path.join(tmpDir, 'app.js');
  fs.writeFileSync(sampleFile, 'const phase53Marker = "INITIAL_V1";\nconsole.log(phase53Marker);\n', 'utf8');
  const stateObj = {
    projects: [{ id: 'test-proj', tenantId: 'grg', name: 'Test Proj', workspace: tmpDir }],
    projectWorkspaceDrafts: [],
    projectFileCheckpoints: [],
  };
  const mockApp = {
    controlPlane: { authorize: async () => true },
    store: {
      read: async () => stateObj,
      update: async (fn) => { fn(stateObj); return stateObj; },
    },
    audit: { record: async () => ({ id: 'aud-1' }) },
    memoryEngine: { remember: async () => ({ id: 'mem-1', version: 1 }) },
    fabricEvents: { publish: async () => ({ id: 'evt-1' }) },
  };
  const callRoute = async (method, urlStr, bodyObj = null) => {
    let status = 0;
    let payload = null;
    const req = { method };
    const res = {};
    const url = new URL(urlStr, 'http://localhost:4400');
    await handleProjectWorkspaceRoutes(
      req,
      res,
      url,
      mockApp,
      (_r, s, p) => { status = s; payload = p; },
      async () => bodyObj,
      { tenantId: 'grg', actorId: 'admin' }
    );
    return { status, payload };
  };

  // Search edge cases: 1-char query rejected, regex metacharacters safe
  const shortSearch = await callRoute('GET', 'http://localhost:4400/api/fenix/projects/test-proj/search?q=a');
  assert.equal(shortSearch.status, 200);
  assert.equal(shortSearch.payload.matchTotal, 0, '1-char search query must be rejected with 0 matches');
  const regexSearch = await callRoute('GET', 'http://localhost:4400/api/fenix/projects/test-proj/search?q=' + encodeURIComponent('.*+[('));
  assert.equal(regexSearch.status, 200);
  assert.equal(regexSearch.payload.ok, true);

  // Search valid
  const searchRes = await callRoute('GET', 'http://localhost:4400/api/fenix/projects/test-proj/search?q=phase53Marker');
  assert.equal(searchRes.status, 200);
  assert.equal(searchRes.payload.ok, true);
  assert.ok(searchRes.payload.matches.length >= 1);

  // Read initial hash
  const read1 = await callRoute('GET', 'http://localhost:4400/api/fenix/projects/test-proj/file?path=app.js');
  assert.equal(read1.status, 200);

  // Save modified content (creates checkpoint)
  const save1 = await callRoute('PUT', 'http://localhost:4400/api/fenix/projects/test-proj/file', {
    path: 'app.js',
    content: 'const phase53Marker = "UPDATED_V2";\n',
    expectedHash: read1.payload.hash,
  });
  assert.equal(save1.status, 200);
  assert.ok(save1.payload.checkpointId, 'Must record checkpointId on file modification');

  // List checkpoints
  const cpList = await callRoute('GET', 'http://localhost:4400/api/fenix/projects/test-proj/checkpoints');
  assert.equal(cpList.status, 200);
  assert.equal(cpList.payload.checkpoints.length, 1);

  // Rollback conflict guard with stale expectedCurrentHash
  const rbConflict = await callRoute('POST', 'http://localhost:4400/api/fenix/projects/test-proj/rollback', {
    checkpointId: save1.payload.checkpointId,
    expectedCurrentHash: 'stale_hash_0000',
  });
  assert.equal(rbConflict.status, 409);
  assert.equal(rbConflict.payload.code, 'ROLLBACK_CONFLICT');

  // Rollback to checkpoint (with audit, memory, and fabric event recording)
  const rbRes = await callRoute('POST', 'http://localhost:4400/api/fenix/projects/test-proj/rollback', {
    checkpointId: save1.payload.checkpointId,
    expectedCurrentHash: save1.payload.hash,
  });
  assert.equal(rbRes.status, 200);
  assert.equal(rbRes.payload.rolledBack, true);
  assert.equal(rbRes.payload.hash, read1.payload.hash);
  assert.equal(rbRes.payload.auditId, 'aud-1');
  assert.equal(rbRes.payload.memoryId, 'mem-1');
  assert.equal(rbRes.payload.eventId, 'evt-1');
  const restoredText = fs.readFileSync(sampleFile, 'utf8');
  assert.ok(restoredText.includes('INITIAL_V1'), 'File content must be restored after rollback');
  console.log(`   ✅ [Fase 5] IDE Global Search, SHA-256 Checkpoint Creation, Conflict Guard & Rollback Audit certified`);

  // 9. HTTP Route Regression Suite (/api/v2/rea/orchestrate + checkpoint/retry/approve/cancel) & Cold-Restart Persistence
  const { handleReaMemoryIndexRoutes } = require('../grg/src/api/rea-memory-index-routes');
  const { ProjectMemoryIndex } = require('../grg/src/memory/project-memory-index');
  const { ReaIntelligenceEngine } = require('../grg/src/services/rea-intelligence-engine');
  const callReaRoute = async (method, urlPath, bodyObj = {}) => {
    let status = 0;
    let payload = null;
    await handleReaMemoryIndexRoutes(
      { method, headers: { host: 'localhost:4400' } },
      {},
      new URL(urlPath, 'http://localhost:4400'),
      (_r, s, p) => { status = s; payload = p; },
      async () => bodyObj,
      { tenantId: 'grg', actorId: 'sec-auditor' }
    );
    return { status, payload };
  };

  const httpOrch = await callReaRoute('POST', '/api/v2/rea/orchestrate', {
    projectId: 'fenix-os',
    objective: 'HTTP Route Governance Test',
    requireHumanApproval: true,
    timeoutMs: 45000,
    maxRetries: 2,
    force: true,
  });
  assert.equal(httpOrch.status, 201);
  assert.equal(httpOrch.payload.lifecycleState, 'AWAITING_APPROVAL');
  assert.equal(httpOrch.payload.governance.humanApprovalState, 'PENDING');
  assert.equal(httpOrch.payload.governance.timeoutMs, 45000);
  const httpOrchId = httpOrch.payload.orchestrationId;

  const httpCp = await callReaRoute('POST', `/api/v2/rea/orchestrate/${httpOrchId}/checkpoint`, {
    stepKey: 'visual_qa',
    note: 'Custom Visual Gate Note',
  });
  assert.equal(httpCp.status, 200);
  assert.equal(httpCp.payload.checkpoint.stepKey, 'visual_qa');
  assert.equal(httpCp.payload.checkpoint.note, 'Custom Visual Gate Note');

  const httpRetry = await callReaRoute('POST', `/api/v2/rea/orchestrate/${httpOrchId}/retry`, {
    stepKey: 'implement',
  });
  assert.equal(httpRetry.status, 200);
  assert.equal(httpRetry.payload.retryAttemptsUsed, 1);

  const httpReject = await callReaRoute('POST', `/api/v2/rea/orchestrate/${httpOrchId}/approve`, {
    decision: 'REJECT',
  });
  assert.equal(httpReject.status, 200);
  assert.equal(httpReject.payload.humanApprovalState, 'REJECTED');
  assert.equal(httpReject.payload.lifecycleState, 'CANCELLED');

  // Verify Cold-Restart Disk Persistence
  const coldMem = new ProjectMemoryIndex();
  assert.ok(coldMem.fileFingerprints.size >= 6, 'Cold-restarted ProjectMemoryIndex must load persisted fileFingerprints from disk');
  assert.ok(coldMem.patternVersions.size >= 1, 'Cold-restarted ProjectMemoryIndex must load persisted patternVersions from disk');
  const coldRea = new ReaIntelligenceEngine();
  assert.ok(coldRea.orchestrations.some((o) => o.orchestrationId === httpOrchId), 'Cold-restarted ReaIntelligenceEngine must load persisted orchestrations from disk');
  console.log(`   ✅ [Fase 8 & 9] HTTP Route Governance & Cold-Restart Disk Persistence certified`);

  // 10. Static Determinism & Canonical UI Controls Check
  const cityCode = fs.readFileSync(path.join(__dirname, '..', 'grg', 'public', 'fenix-world-3d.js'), 'utf8');
  assert.equal(cityCode.includes('Math.random'), false, 'fenix-world-3d.js must contain zero Math.random() calls');
  assert.equal(cityCode.includes('window.fenixSetCityMode'), true, 'fenix-world-3d.js must expose window.fenixSetCityMode');
  assert.equal(cityCode.includes('window.fenixSetCityDensity'), true, 'fenix-world-3d.js must expose window.fenixSetCityDensity');
  const htmlCode = fs.readFileSync(path.join(__dirname, '..', 'grg', 'public', 'index.html'), 'utf8');
  assert.equal(htmlCode.includes('id="fenixIdeSearchBtn"'), true, 'index.html must include #fenixIdeSearchBtn');
  assert.equal(htmlCode.includes('id="fenixIdeRollbackBtn"'), true, 'index.html must include #fenixIdeRollbackBtn');
  console.log(`   ✅ [Fase 5 & 7] Zero-Math.random 3D City & Canonical IDE Toolbar Controls certified`);

  console.log('================================================================');
  console.log('🎉 ALL PHASE 53 UNIT & API CERTIFICATIONS PASSED (10/10 SUITES)');
  console.log('================================================================');
  process.exit(0);
}

runPhase53UnitCertification().catch((err) => {
  console.error('❌ Phase 53 Unit Certification Failed:', err);
  process.exit(1);
});
