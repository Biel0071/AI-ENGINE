// MEDIDO EM PRODUCAO (2026-07-29): o ciclo de missao so avancava por EVENTO de job
// (mission-kernel attach() -> projectJobEvent). Nada reconciliava missoes fora desse caminho.
// Estado real na VPS: 4 missoes RUNNING e 17 steps PLANNED presos com progresso 0, e 3 steps
// DISPATCHED apontando para jobs que morreram em DEAD_LETTER. O worker cuidava de jobs; de
// missao, ninguem cuidava.
//
// reconcile() fecha a lacuna sem inventar progresso. Estes testes travam as duas garantias que
// importam: missao orfa volta a andar, e a governanca (step RED exige aprovacao) continua
// valendo dentro da reconciliacao -- do contrario o conserto abriria um bypass.
// ASCII apenas: o lexer TAP do Node 18 quebra com caractere non-ASCII na saida do teste.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function bootstrap() {
  const app = await createApp({});
  await app.controlPlane.createTenant({ id: 'grg', name: 'GRG' }, 'grg-admin');
  return app;
}

// Missao de dois passos GREEN em sequencia: o segundo so pode andar quando o primeiro conclui.
async function missaoEmCadeia(app) {
  return app.missions.create('grg', 'grg-admin', {
    title: 'reconcile: cadeia',
    objective: 'primeiro descobrir, depois analisar',
    steps: [
      { key: 'descobrir', type: 'discover', payload: {} },
      { key: 'analisar', type: 'analyze', payload: {}, dependsOn: ['descobrir'] },
    ],
  });
}

test('reconcile is idempotent and writes nothing when there is nothing to do', async () => {
  const app = await bootstrap();
  const antes = await app.store.read();
  const r = await app.missions.reconcile('grg', 'grg-admin');
  assert.deepEqual(r, { examinadas: 0, orfaosResolvidos: 0, despachados: 0, iniciadas: 0 });
  const depois = await app.store.read();
  assert.equal(depois.missions.length, antes.missions.length);
});

test('a step stuck on a dead job is resolved instead of hanging forever', async () => {
  const app = await bootstrap();
  const mission = await missaoEmCadeia(app);
  await app.missions.start('grg', 'grg-admin', mission.id);

  // Estado pos-start: passo 1 despachado, passo 2 aguardando a dependencia.
  let state = await app.store.read();
  let steps = state.missionSteps.filter((s) => s.missionId === mission.id);
  const passo1 = steps.find((s) => s.key === 'descobrir');
  assert.equal(passo1.status, 'DISPATCHED');
  assert.ok(passo1.jobId, 'o passo precisa ter job');

  // Reproduz a condicao medida: o job morre SEM que o evento chegue a missao (foi o que
  // aconteceu com HeartbeatTimeout apos o container ser recriado).
  await app.store.update((draft) => {
    const job = draft.runtimeJobs.find((j) => j.id === passo1.jobId);
    job.status = 'DEAD_LETTER';
    return draft;
  });

  const r = await app.missions.reconcile('grg', 'grg-admin');
  assert.equal(r.orfaosResolvidos, 1, `orfao deveria ser resolvido: ${JSON.stringify(r)}`);

  state = await app.store.read();
  steps = state.missionSteps.filter((s) => s.missionId === mission.id);
  assert.equal(steps.find((s) => s.key === 'descobrir').status, 'FAILED', 'job morto -> step FAILED');
  // O desfecho e registrado como evento: reconciliacao silenciosa seria mudanca de estado
  // sem trilha, o oposto do que o FENIX exige.
  const eventos = state.missionEvents.filter((e) => e.missionId === mission.id);
  assert.ok(eventos.some((e) => e.type === 'mission.step.reconciled'), 'a reconciliacao emite evento');
});

test('reconcile dispatches a ready step whose unlocking event was lost', async () => {
  const app = await bootstrap();
  const mission = await missaoEmCadeia(app);
  await app.missions.start('grg', 'grg-admin', mission.id);

  // Passo 1 concluiu no store, mas a projecao nunca ocorreu (evento perdido no reinicio).
  // Sem reconcile, o passo 2 fica PLANNED para sempre -- foi o caso dos 17 steps medidos.
  const state0 = await app.store.read();
  const passo1 = state0.missionSteps.find((s) => s.missionId === mission.id && s.key === 'descobrir');
  await app.store.update((draft) => {
    draft.missionSteps.find((s) => s.id === passo1.id).status = 'SUCCEEDED';
    return draft;
  });

  const r = await app.missions.reconcile('grg', 'grg-admin');
  assert.equal(r.despachados, 1, `o passo dependente deveria ser despachado: ${JSON.stringify(r)}`);
  const state = await app.store.read();
  const passo2 = state.missionSteps.find((s) => s.missionId === mission.id && s.key === 'analisar');
  assert.equal(passo2.status, 'DISPATCHED');
  assert.ok(passo2.jobId, 'o passo despachado recebe job real');
});

test('reconcile never bypasses approval for a RED step', async () => {
  const app = await bootstrap();
  // `generate` e nivel RED no catalogo governado: exige aprovacao humana.
  const mission = await app.missions.create('grg', 'grg-admin', {
    title: 'reconcile: red',
    objective: 'gerar sistema exige aprovacao',
    steps: [{ key: 'gerar', type: 'generate', payload: {} }],
  });
  await app.missions.start('grg', 'grg-admin', mission.id);
  await app.missions.reconcile('grg', 'grg-admin');
  const state = await app.store.read();
  const step = state.missionSteps.find((s) => s.missionId === mission.id);
  assert.equal(step.status, 'AWAITING_APPROVAL', 'RED nao pode ser despachado pela reconciliacao');
  assert.ok(step.approvalId, 'a aprovacao e registrada');
  assert.equal(step.jobId, null, 'nenhum job foi criado sem aprovacao');
});

test('autoStart is opt-in: a PLANNED mission is never started by default', async () => {
  const app = await bootstrap();
  const mission = await missaoEmCadeia(app);
  await app.missions.reconcile('grg', 'grg-admin');
  const state = await app.store.read();
  assert.equal(state.missions.find((m) => m.id === mission.id).status, 'PLANNED', 'sem opt-in, ninguem inicia');
});

test('with autoStart enabled the scheduler starts planned missions up to the cap', async () => {
  const app = await bootstrap();
  // Reproduz o caso medido: um programa materializa varias missoes PLANNED de uma vez.
  for (let i = 0; i < 4; i += 1) {
    await app.missions.create('grg', 'grg-admin', {
      title: `programa: missao ${i}`,
      objective: `passo de descoberta numero ${i}`,
      steps: [{ key: 'descobrir', type: 'discover', payload: {} }],
    });
  }
  const r = await app.missions.reconcile('grg', 'grg-admin', { autoStart: true, maxConcurrent: 2 });
  assert.equal(r.iniciadas, 2, `o teto precisa ser respeitado: ${JSON.stringify(r)}`);
  const state = await app.store.read();
  const rodando = state.missions.filter((m) => m.status === 'RUNNING');
  assert.equal(rodando.length, 2, 'nao inunda a fila: 2 de 4');
  // A missao iniciada realmente despachou trabalho -- iniciar sem despachar seria so mudar
  // um rotulo de estado.
  const comJob = state.missionSteps.filter((s) => rodando.some((m) => m.id === s.missionId) && s.jobId);
  assert.equal(comJob.length, 2, 'cada missao iniciada gerou job real');
});

test('the cap counts missions already running, not only newly started ones', async () => {
  const app = await bootstrap();
  const emCurso = await app.missions.create('grg', 'grg-admin', {
    title: 'ja rodando', objective: 'missao ja em curso',
    steps: [{ key: 'descobrir', type: 'discover', payload: {} }],
  });
  await app.missions.start('grg', 'grg-admin', emCurso.id);
  await app.missions.create('grg', 'grg-admin', {
    title: 'na fila', objective: 'missao aguardando vaga',
    steps: [{ key: 'descobrir', type: 'discover', payload: {} }],
  });
  const r = await app.missions.reconcile('grg', 'grg-admin', { autoStart: true, maxConcurrent: 1 });
  assert.equal(r.iniciadas, 0, `teto 1 com 1 em curso nao abre vaga: ${JSON.stringify(r)}`);
});

// MEDIDO EM PRODUCAO (2026-07-29): o autoStart estava ligado no .env e nenhuma das 5 missoes
// PLANNED iniciava. O relatorio dizia `iniciadas: 0` e nada mais, entao "a politica recusou",
// "o ator perdeu permissao" e "a variavel nunca chegou ao processo" eram indistinguiveis de
// fora -- e a causa real era a terceira. Um scheduler que recusa em silencio nao e auditavel.
test('a refused start reports the reason instead of vanishing', async () => {
  const app = await bootstrap();
  const mission = await missaoEmCadeia(app);
  // Ator sem permissao para iniciar: o start() vai recusar por autorizacao, que e uma das
  // recusas legitimas que o operador precisa poder distinguir de "scheduler desligado".
  await app.store.update((draft) => {
    draft.missions.find((m) => m.id === mission.id).requestedBy = 'ninguem-conhecido';
    return draft;
  });
  const r = await app.missions.reconcile('grg', 'grg-admin', { autoStart: true, maxConcurrent: 2 });
  assert.equal(r.iniciadas, 0);
  assert.equal(r.naoIniciadas?.length, 1, `a recusa precisa aparecer: ${JSON.stringify(r)}`);
  assert.equal(r.naoIniciadas[0].missionId, mission.id);
  assert.ok(r.naoIniciadas[0].reason.length > 0, 'a recusa vem com motivo, nao vazia');
  // A reconciliacao nao morre por causa da recusa: e por isso que o catch existe.
  assert.equal((await app.store.read()).missions.find((m) => m.id === mission.id).status, 'PLANNED');
});

test('a successful autoStart reports no refusals', async () => {
  const app = await bootstrap();
  await missaoEmCadeia(app);
  const r = await app.missions.reconcile('grg', 'grg-admin', { autoStart: true, maxConcurrent: 2 });
  assert.equal(r.iniciadas, 1);
  assert.equal(r.naoIniciadas, undefined, 'sem recusa, sem ruido no relatorio');
});

test('a mission whose every step succeeded is finalized by reconcile', async () => {
  const app = await bootstrap();
  const mission = await app.missions.create('grg', 'grg-admin', {
    title: 'reconcile: unico passo',
    objective: 'passo unico de descoberta',
    steps: [{ key: 'descobrir', type: 'discover', payload: {} }],
  });
  await app.missions.start('grg', 'grg-admin', mission.id);
  const s0 = await app.store.read();
  await app.store.update((draft) => {
    draft.missionSteps.find((s) => s.missionId === mission.id).status = 'SUCCEEDED';
    return draft;
  });
  assert.ok(s0.missions.find((m) => m.id === mission.id).status === 'RUNNING');

  await app.missions.reconcile('grg', 'grg-admin');
  const state = await app.store.read();
  assert.equal(state.missions.find((m) => m.id === mission.id).status, 'SUCCEEDED');
});
