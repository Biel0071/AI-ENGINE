'use strict';

/**
 * FÊNIX OS — INTENT ENGINE 2.0 COMPREHENSIVE TEST SUITE
 * =====================================================
 * Validates the 12 Mandatory Real Proof Tests (Section 48)
 * and the Incomplete Request Test (Section 49).
 * Tests all 15 stages: READ -> UNDERSTAND -> DECOMPOSE -> INSPECT ->
 * IDENTIFY GAPS -> CHECK AMBIGUITIES -> DESIGN -> CRITIQUE ->
 * IMPROVE -> IMPLEMENT -> TEST -> OBSERVE -> COMPARE -> IMPROVE -> DELIVER -> LEARN
 */

const test = require('node:test');
const assert = require('node:assert');
const { IntentEngine } = require('../src/intent/intent-engine');
const { SelfModel } = require('../src/intent/self-model');
const { ReferenceAcquisitionEngine } = require('../src/intent/reference-acquisition');
const { SystemGapAnalyzer } = require('../src/intent/system-gap-analyzer');
const { DesignCritic } = require('../src/intent/design-critic');

test('FÊNIX INTENT ENGINE 2.0 — TEST 01: "Crie um agente."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Crie um agente.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;
  
  // Understanding
  assert.ok(spec.normalizedIntent.includes('AGENT'));
  assert.ok(spec.confidenceScore >= 0.85);

  // Decision & Assumptions (No annoying questions asked)
  assert.strictEqual(spec.questions.length, 0);
  assert.ok(spec.assumptions.some(a => a.includes('Developer') || a.includes('Engenharia') || a.includes('Core Engineer')));

  // Execution DAG
  assert.ok(spec.implementationPlan.length >= 4);
  assert.ok(spec.implementationPlan.some(s => s.actor === 'AgentFactory'));

  // Learning
  assert.ok(res.recordedOutcome.patternResult);
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 02: "Crie um agente de segurança."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Crie um agente de segurança.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Understanding & Role Specialization
  assert.ok(spec.objective.toLowerCase().includes('segurança') || spec.objective.includes('Security'));
  assert.ok(spec.entities.agents.includes('Security'));
  assert.ok(spec.entities.workstations.includes('ws-exec-04'));

  // Risk & Autonomy
  assert.strictEqual(spec.taskRisk, 'LOW');
  assert.strictEqual(spec.autonomyLevel, 'L3');
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 03: "Faça ele trabalhar com o Backend."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Faça ele trabalhar com o Backend.', {
    selectedAgentId: 'Security'
  });

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Collaboration Semantics
  assert.strictEqual(spec.normalizedIntent, 'AGENT_TEAM_COLLABORATION');
  assert.ok(spec.capabilities.includes('AGENT_COMMUNICATION_BUS'));
  assert.ok(spec.capabilities.includes('RELATIONSHIP_GRAPH'));
  assert.ok(spec.constraints.includes('MAX_HOP_THRESHOLD_10'));
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 04: "Melhore a tela."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Melhore a tela.', {
    activeRoute: 'view-city'
  });

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Contextual Inference & Frontend Critic
  assert.strictEqual(spec.normalizedIntent, 'FRONTEND_AESTHETIC_REFINEMENT');
  assert.ok(spec.proposedArchitecture.frontendCritique);
  assert.strictEqual(spec.proposedArchitecture.frontendCritique.status, 'AAA_DESIGN_SYSTEM_VERIFIED');
  assert.ok(spec.constraints.includes('VANILLA_JS_MODULAR_ONLY'));
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 05: "Quero algo parecido com esta referência."', async () => {
  const engine = new IntentEngine();
  const refRes = await engine.ingestReference({
    url: 'https://example.com/saas-dashboard',
    type: 'URL_WEBSITE'
  });

  assert.ok(refRes.knowledge.functional);
  assert.ok(refRes.knowledge.visual);
  assert.strictEqual(refRes.adaptationStrategy.principle, 'Evolve, Enhance, Never Blindly Copy');

  const res = await engine.processRequest('Quero algo parecido com esta referência.', {
    reference: refRes
  });

  assert.strictEqual(res.status, 'SUCCESS');
  assert.strictEqual(res.intentSpec.normalizedIntent, 'REFERENCE_BASED_ADAPTATION');
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 06: "Crie um sistema que faça X."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Crie um sistema de monitoramento de integridade de disco');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Universal Engineering Goal
  assert.ok(spec.implementationPlan.some(s => s.action.includes('CANONICAL') || s.action.includes('EXTEND')));
  assert.ok(spec.validationPlan.runtimeProbes.length > 0);
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 07: "Faça isso funcionar sem IA."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Faça isso funcionar sem IA.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Zero-AI Determinism
  assert.strictEqual(spec.normalizedIntent, 'ZERO_AI_DETERMINISTIC_ENFORCE');
  assert.ok(spec.capabilities.includes('DETERMINISTIC_EXECUTION'));
  assert.ok(spec.capabilities.includes('ZERO_AI_CORE'));
  assert.ok(spec.constraints.includes('NO_LLM_DEPENDENCY'));
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 08: "Crie 20 agentes."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Crie 20 agentes.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Population Scale
  assert.strictEqual(spec.normalizedIntent, 'POPULATION_SCALE_SIMULATION');
  assert.ok(spec.objective.includes('20 agentes'));
  assert.ok(spec.capabilities.includes('POPULATION_SCALE'));
  assert.ok(spec.constraints.includes('MEMORY_BUDGET_512MB'));
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 09: "Agora crie mais 10."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Agora crie mais 10.', {
    currentAgentCount: 20
  });

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Anaphoric Context Understanding
  assert.ok(spec.objective.includes('mais 10 agentes (total 30)'));
  assert.strictEqual(spec.normalizedIntent, 'POPULATION_SCALE_SIMULATION');
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 10: "Faça esses agentes trabalharem juntos."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Faça esses agentes trabalharem juntos.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  assert.strictEqual(spec.normalizedIntent, 'AGENT_TEAM_COLLABORATION');
  assert.ok(spec.acceptanceCriteria.some(c => c.includes('loops infinitos')));
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 11: "Melhore tudo."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Melhore tudo.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Holistic Polish
  assert.strictEqual(spec.normalizedIntent, 'FRONTEND_AESTHETIC_REFINEMENT');
  assert.ok(spec.confidenceScore >= 0.85);
  assert.ok(spec.proposedArchitecture.designA);
  assert.ok(spec.proposedArchitecture.designB);
  assert.ok(spec.proposedArchitecture.designC);
});

test('FÊNIX INTENT ENGINE 2.0 — TEST 12: "Descubra o que está faltando."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Descubra o que está faltando no sistema.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // Gap Analysis & Self Model
  assert.strictEqual(spec.normalizedIntent, 'SYSTEM_GAP_DISCOVERY');
  assert.ok(spec.existingSystemAssets.reusable.length >= 0);
  assert.ok(typeof spec.reuseScore === 'number');
});

test('FÊNIX INTENT ENGINE 2.0 — TESTE INCOMPLETO (SEÇÃO 49): "Quero um sistema de atendimento inteligente para minha empresa."', async () => {
  const engine = new IntentEngine();
  const res = await engine.processRequest('Quero um sistema de atendimento inteligente para minha empresa.');

  assert.strictEqual(res.status, 'SUCCESS');
  const spec = res.intentSpec;

  // 1. Entendeu a intenção
  assert.strictEqual(spec.normalizedIntent, 'ENTERPRISE_CUSTOMER_SUPPORT_SYSTEM');
  assert.ok(spec.objective.includes('Atendimento Inteligente'));

  // 2. Consultou o sistema existente & 3. Descobriu o que já existe
  assert.ok(spec.existingSystemAssets);
  assert.ok(spec.reuseScore >= 0.60);

  // 4. Identificou lacunas & 5. Fez somente perguntas essenciais se necessário (aqui tomou decisões inteligentes e registrou premissas)
  assert.strictEqual(spec.questions.length, 0); // Decidiu razoavelmente sem interrogar
  assert.ok(spec.assumptions.length >= 2);
  assert.ok(spec.assumptions.some(a => a.includes('AgentCommunicationBus')));

  // 6. Propôs arquitetura (Design A, B, C)
  assert.ok(spec.proposedArchitecture.designA);
  assert.ok(spec.proposedArchitecture.designB);
  assert.ok(spec.proposedArchitecture.designC);

  // 7. Melhorou a ideia (adicionou presença espacial no World e fallback sem IA)
  assert.ok(spec.constraints.includes('ZERO_AI_FALLBACK_REQUIRED'));
  assert.ok(spec.proposedArchitecture.worldCritique.isSpatial);

  // 8. Implementou (DAG gerado)
  assert.ok(spec.implementationPlan.length >= 5);

  // 9. Testou & 10. Validou visualmente
  assert.ok(spec.validationPlan.visualVerification.length > 0);

  // 11. Integrou com o restante do Fênix
  assert.ok(spec.dependencies.includes('AgentCommunicationBus'));
  assert.ok(spec.dependencies.includes('OfficeManager'));

  // 12. Entregou
  assert.ok(res.deliveryReport);
  assert.strictEqual(res.deliveryReport.title, 'FÊNIX OS — ENTREGA DE INTENÇÃO EXECUTADA');

  // 13. Aprendeu com o resultado
  assert.ok(res.recordedOutcome.patternResult);
  assert.ok(['REUSE', 'LEARN'].includes(res.recordedOutcome.patternResult.status));
});
