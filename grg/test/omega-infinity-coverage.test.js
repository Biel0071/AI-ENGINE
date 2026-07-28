const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

// SPRINT A — cobertura de omega-infinity (self-evolution + cognitive-laws).
//
// Ambos os módulos são governança-crítica: o laws-engine é o que impede um
// `law001Compliant: true` incondicional (a simulação que ele existe para matar), e o
// self-evolution-kernel deriva duplicação/fragmentação de dados REAIS do store. Os testes
// exercitam os dois vereditos e as duas taxas contra estado semeado, não contra fachada.

async function tenantApp() {
  const app = await createApp({ dataFile: null });
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

test('cognitive law 001 never approves without measured improvement', async () => {
  const app = await tenantApp();

  // Sem medição alguma: veredito UNVERIFIED, nunca COMPLIANT.
  const unverified = await app.cognitiveLaws.verifyLaw001('grg', 'grg-admin', { name: 'blind proposal' });
  assert.equal(unverified.verdict, 'UNVERIFIED', 'no measurement means no verdict');
  assert.equal(unverified.law001Compliant, false, 'unverified is never compliant');
  assert.ok(unverified.pending, 'the pendency names what is missing');

  // Uma regressão medida: NON_COMPLIANT, mesmo com outras melhorias.
  const regressed = await app.cognitiveLaws.verifyLaw001('grg', 'grg-admin', {
    name: 'regressing proposal',
    measurements: {
      speed: { before: 100, after: 200 },   // maior é melhor → melhora
      latency: { before: 50, after: 90 },   // menor é melhor → regressão
    },
  });
  assert.equal(regressed.verdict, 'NON_COMPLIANT', 'any measured regression fails the law');
  assert.equal(regressed.law001Compliant, false);
  assert.ok(regressed.regressedMetrics.includes('latency'));

  // Melhoria medida sem regressão: COMPLIANT — e só aqui.
  const compliant = await app.cognitiveLaws.verifyLaw001('grg', 'grg-admin', {
    name: 'improving proposal',
    measurements: {
      speed: { before: 100, after: 150 },
      latency: { before: 90, after: 40 },
      cost: { before: 10, after: 6 },
    },
  });
  assert.equal(compliant.verdict, 'COMPLIANT', 'measured improvement with no regression is compliant');
  assert.equal(compliant.law001Compliant, true);
  assert.ok(compliant.improvedMetrics.length >= 3);

  await app.close?.();
});

test('the self-evolution kernel derives duplication and fragmentation from real store state', async () => {
  const app = await tenantApp();

  // Estado limpo: sem cápsula, as taxas se declaram unknown (não zero fabricado).
  const empty = await app.selfEvolutionKernel.getIntelligenceCrystalState('grg', 'grg-admin');
  assert.equal(empty.nodesCount.value, 0);
  assert.equal(empty.duplicationRate.state, 'unknown', 'no hashed capsule → unknown, not zero');
  assert.equal(empty.fragmentationScore.state, 'unknown', 'no indexed capsule → unknown');

  // Semeia três cápsulas, duas compartilhando o mesmo hash de conteúdo: duplicação real
  // e observável, exatamente o que o kernel mede.
  await app.store.update((state) => {
    state.knowledgeCapsules = state.knowledgeCapsules || [];
    state.knowledgeCapsules.push(
      { id: 'c1', tenantId: 'grg', hash: 'AAA' },
      { id: 'c2', tenantId: 'grg', hash: 'AAA' },
      { id: 'c3', tenantId: 'grg', hash: 'BBB' },
    );
    return state;
  });

  const seeded = await app.selfEvolutionKernel.getIntelligenceCrystalState('grg', 'grg-admin');
  assert.equal(seeded.nodesCount.value, 3);
  assert.equal(seeded.duplicationRate.state, 'measured');
  // 3 hashes, 1 duplicado (o segundo AAA) → 1/3.
  assert.equal(seeded.duplicationRate.duplicated, 1);
  assert.equal(seeded.duplicationRate.hashed, 3);
  assert.equal(seeded.duplicationRate.value, Number((1 / 3).toFixed(4)));

  await app.close?.();
});
