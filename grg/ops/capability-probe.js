// capability-probe: mede o que o FENIX REALMENTE faz, capacidade por capacidade.
//
// Regra: uma capacidade so e REAL se COMPLETAR a tarefa. Rota que responde 200 sem executar
// e SCAFFOLD, e o probe registra o ponto exato de parada. Nada e ativado nem construido aqui.
//
// Rodar DENTRO do container (tem env, secret e rede do processo real):
//   docker exec -i -w /app <api> sh -c 'export GRG_AIPLATFORM_KEY=...; node -' < ops/capability-probe.js

const results = [];
function record(id, name, verdict, evidence, stopsAt = null) {
  results.push({ id, name, verdict, evidence: String(evidence).slice(0, 400), stopsAt });
  console.log(`\n[${id}] ${name}\n  VEREDITO: ${verdict}`);
  console.log(`  EVIDENCIA: ${String(evidence).slice(0, 400)}`);
  if (stopsAt) console.log(`  PARA EM: ${stopsAt}`);
}

(async () => {
  const { createApp } = require('/app/src/app.js');
  const { loadInfrastructureConfig } = require('/app/src/infrastructure/config');
  const { CloningGitHostAdapter } = require('/app/src/repo-intel/cloning-git-host');
  // ARMADILHA MEDIDA: createApp() NAO le DATABASE_URL do ambiente -- ele so usa Postgres se
  // receber `options.databaseUrl` (app.js:83). Quem monta isso e o server.js a partir de
  // loadInfrastructureConfig(). Um probe que chama createApp({}) mede um MemoryStore vazio:
  // 0 tenants, 0 missoes, e TODA capacidade multi-tenant falha com "Tenant not found".
  // As 3 primeiras rodadas deste probe cairam nisso. Aqui reproduzo as opcoes do server.js.
  const infra = loadInfrastructureConfig(process.env, { requireExternal: false });
  const app = await createApp({
    llm: true,
    databaseUrl: infra.databaseUrl,
    databaseSchema: infra.databaseSchema,
    redisUrl: infra.redisUrl,
    queueRedisUrl: infra.queueRedisUrl,
    // gitHost real: o default do createApp e LocalGitHostAdapter (nao clona da internet).
    gitHost: new CloningGitHostAdapter(),
  });
  console.log(`store=${app.store.constructor.name} databaseUrl=${infra.databaseUrl ? 'SET' : 'ausente'}`);
  const T = process.env.PROBE_TENANT || 'grg';
  const A = process.env.PROBE_ACTOR || 'grg-admin';

  // 1. CONVERSA -- baseline
  try {
    const t0 = Date.now();
    const r = await app.chat.handle(T, A, 'Diga apenas: teste');
    record('1', 'Conversa (chat texto)', r.llm && r.reply ? 'REAL' : 'SCAFFOLD',
      `llm=${r.llm} latencia=${Date.now() - t0}ms intent=${r.intent} reply="${String(r.reply).slice(0, 90)}"`);
  } catch (e) { record('1', 'Conversa (chat texto)', 'ERRO', e.message); }

  // 2. PESQUISAR NA WEB -- o servico existe; a pergunta e se devolve resultado usavel
  try {
    if (!app.externalSearch) record('2', 'Pesquisar na web', 'NAO EXISTE', 'app.externalSearch ausente');
    else {
      // Discriminador de FABRICACAO: se a mesma consulta com um termo absurdo ainda devolve
      // "resultados" com a query embutida na URL, os itens sao template, nao busca.
      const nonsense = 'zzqx-termo-que-nao-existe-em-lugar-nenhum-9271';
      const out = await app.externalSearch.search(T, A, { q: nonsense });
      const items = out?.results || out?.items || [];
      const templated = items.filter((r) => String(r.url || '').includes(encodeURIComponent(nonsense))).length;
      const fabricated = items.length > 0 && templated === items.length;
      record('2', 'Pesquisar na web', fabricated ? 'FABRICA (pior que scaffold)' : (items.length ? 'REAL' : 'SCAFFOLD'),
        `itens=${items.length} com_query_na_url=${templated} amostra=${JSON.stringify(items[0] || {}).slice(0, 220)}`,
        fabricated
          ? 'search() NAO faz requisicao HTTP: monta URLs por template com a query e reliability fixa'
          : (items.length ? null : 'search() responde sem itens: sem fonte configurada'));
    }
  } catch (e) {
    record('2', 'Pesquisar na web', 'SCAFFOLD', e.message, 'search() lanca: ' + e.message);
  }

  // 3. ACOPLAR/LER REPOSITORIO -- clone real de um repo publico pequeno
  try {
    const t0 = Date.now();
    const repo = await app.repoIntel.connect(T, A, { url: 'https://github.com/octocat/Hello-World', id: `probe-${Date.now()}` });
    const id = repo?.id || repo?.repository?.id;
    let analysis = null;
    try { analysis = await app.repoIntel.analyze(T, A, id); } catch (e) { analysis = { error: e.message }; }
    // MEDIDO: analyze() devolve { snapshot: { fileCount, revision, ... } } -- ler `fileCount`
    // na raiz dava null e teria classificado como SCAFFOLD uma capacidade que funciona.
    const snap = analysis?.snapshot || analysis || {};
    const files = snap.fileCount ?? analysis?.fileCount ?? analysis?.files?.length ?? null;
    const revision = snap.revision || null;
    // Prova de clone REAL: a revision tem de ser o SHA do HEAD do repo publico, nao um id
    // gerado. Se `revision` viesse nula ou aleatoria, seria registro sem leitura.
    record('3', 'Acoplar/ler repositorio', files > 0 && revision ? 'REAL' : 'SCAFFOLD',
      `id=${id} fileCount=${files} revision=${revision} ms=${Date.now() - t0} `
      + `languages=${JSON.stringify(snap.languages || null)} analysis=${JSON.stringify(analysis).slice(0, 160)}`,
      files > 0 && revision ? null : 'connect registra o repo mas analyze nao devolve arquivos lidos');
  } catch (e) { record('3', 'Acoplar/ler repositorio', 'SCAFFOLD', e.message, 'connect/analyze lanca: ' + e.message); }

  // 4. MISSAO ATE O FIM -- criada, executada, concluida?
  // MEDIDO: create() NAO aceita objetivo livre. Exige `steps[]` de um catalogo governado
  // (MISSION_STEP_CATALOG: discover, inspect, analyze, agent-observe, validate, generate,
  // orchestrate, activate, daily-intelligence). Uso `discover` (nivel GREEN = sem aprovacao
  // humana) porque e o unico caminho que pode concluir sozinho dentro do probe.
  try {
    const created = await app.missions.create(T, A, {
      title: 'probe: missao de teste',
      objective: 'probe de inventario de capacidades: varredura de descoberta',
      steps: [{ key: 'passo-descoberta', type: 'discover', payload: {} }],
    });
    const mid = created?.id || created?.mission?.id;
    let started = null;
    try { started = await app.missions.start(T, A, mid); } catch (e) { started = { error: e.message }; }
    // A missao anda por jobs: dispatch coloca na fila, tick executa. Sem tick nao progride.
    const ticks = [];
    for (let i = 0; i < 5; i += 1) {
      try { ticks.push(await app.jobs.runBatch(`probe-worker-${i}`, 5)); } catch (e) { ticks.push({ error: e.message }); }
      await new Promise((r) => setTimeout(r, 400));
    }
    let status = null;
    try { status = await app.missions.get(T, A, mid); } catch { status = started || created; }
    const state = status?.status || status?.state;
    const stepStates = (status?.steps || []).map((s) => `${s.key}:${s.status}`).join(' ');
    const done = state === 'SUCCEEDED' || state === 'COMPLETED';
    record('4', 'Criar e executar missao', done ? 'REAL' : 'SCAFFOLD',
      `id=${mid} estado_final=${state} progresso=${status?.progress} steps=[${stepStates}] `
      + `ticks=${JSON.stringify(ticks).slice(0, 200)}`,
      done ? null : `criada e persistida, start()+tick() chamados, mas parou em "${state}" (${stepStates})`);
  } catch (e) { record('4', 'Criar e executar missao', 'SCAFFOLD', e.message, 'create lanca: ' + e.message); }

  // 5. EXECUTAR COMANDO -- com que isolamento?
  // MEDIDO: execute() NAO aceita comando arbitrario. Exige `scriptId` de um script REGISTRADO
  // (`scripts.resolve`) ligado a uma tool registrada. Isso e allowlist por design -- a pergunta
  // honesta nao e "roda `echo`?", e "existe algum script autorizado e ele roda de verdade?".
  try {
    if (!app.sandbox) record('5', 'Executar comando', 'NAO EXISTE', 'app.sandbox ausente');
    else {
      let registrados = [];
      try {
        const st = await app.store.read();
        registrados = (st.scriptDefinitions || []).filter((x) => x.tenantId === T && x.status === 'ACTIVE').map((x) => x.scriptId);
      } catch (e) { registrados = [`<list falhou: ${e.message}>`]; }
      let out = null; let erro = null;
      if (registrados.length && !String(registrados[0]).startsWith('<')) {
        try { out = await app.sandbox.execute(T, A, { scriptId: registrados[0], params: {} }); }
        catch (e) { erro = e.message; }
      }
      const txt = JSON.stringify(out);
      const rodou = Boolean(out && (out.status === 'SUCCEEDED' || out.result?.exitCode === 0));
      record('5', 'Executar comando', rodou ? 'REAL' : 'SCAFFOLD',
        `scripts_autorizados=${registrados.length} [${registrados.slice(0, 5).join(',')}] `
        + `erro=${erro} execucao=${txt ? txt.slice(0, 240) : 'nao tentada'}`,
        rodou ? null : (registrados.length
          ? `script autorizado existe mas a execucao nao concluiu: ${erro || 'sem exitCode 0'}`
          : 'nenhum script registrado: a allowlist esta vazia, nao ha o que executar'));
    }
  } catch (e) { record('5', 'Executar comando', 'SCAFFOLD', e.message, 'sandbox lanca: ' + e.message); }

  // 6. LER E GRAVAR ARQUIVO
  try {
    const fs = require('node:fs');
    let readOk = false; let readEv = '';
    try { readEv = fs.readFileSync('/app/package.json', 'utf8').slice(0, 60); readOk = readEv.length > 0; } catch (e) { readEv = e.message; }
    let writeOk = false; let writeEv = '';
    for (const target of ['/app/probe.tmp', '/tmp/probe.tmp']) {
      try { fs.writeFileSync(target, 'probe'); fs.unlinkSync(target); writeOk = true; writeEv = `escreveu em ${target}`; break; }
      catch (e) { writeEv += `${target}: ${e.code || e.message}; `; }
    }
    record('6', 'Ler e gravar arquivo', readOk && writeOk ? 'REAL' : 'SCAFFOLD',
      `leitura=${readOk} (${readEv.replace(/\n/g, ' ')}) | escrita=${writeOk} (${writeEv})`,
      readOk && writeOk ? null : 'rootfs read-only: escrita so em volume gravavel');
  } catch (e) { record('6', 'Ler e gravar arquivo', 'ERRO', e.message); }

  // 7. FILA / AGENDAMENTO
  // MEDIDO: `app.queues` e um objeto VAZIO (0 metodos, sem enqueue). O servico de fila real e
  // `app.jobs` (register/submit/schedule/tick/get/list). Medir o wrapper errado produziria
  // "NAO EXISTE" para uma capacidade que existe -- falso negativo, tao ruim quanto o positivo.
  try {
    if (!app.jobs) record('7', 'Agendar job (fila)', 'NAO EXISTE', 'app.jobs ausente');
    else {
      // Marcador unico: `ran` so muda se o handler REALMENTE foi invocado pela fila.
      let ran = null;
      app.jobs.register('probe-job', async (payload) => { ran = payload || 'probe-ran-7731'; return { ok: 'probe-ran-7731' }; });
      const job = await app.jobs.submit(T, A, { type: 'probe-job', payload: { at: 'probe' } });
      const jid = job?.id || job?.jobId;
      // tick() e o que faz a fila andar. Sem chamar, o job fica enfileirado por definicao.
      // tick(tenantId, actorId) -- chamar sem argumentos da "Tenant not found: undefined".
      let ticked = null;
      try { ticked = await app.jobs.runBatch('probe-worker-fila', 5); } catch (e) { ticked = { error: e.message }; }
      let back = null;
      try { back = await app.jobs.get(T, A, jid); } catch (e) { back = { error: e.message }; }
      const state = back?.status || back?.state;
      const done = Boolean(ran) || /succeed|complet|done/i.test(String(state));
      record('7', 'Agendar job (fila)', done ? 'REAL' : 'SCAFFOLD',
        `jobId=${jid} estado=${state} handler_rodou=${JSON.stringify(ran)} `
        + `tick=${JSON.stringify(ticked).slice(0, 140)} job=${JSON.stringify(back).slice(0, 160)}`,
        done ? null : `enfileirado e recuperavel, mas parou em "${state}": handler nao executou no tick`);
      // Recorrencia e outra pergunta que nao se responde por "a fila funciona".
      const temSchedule = typeof app.jobs.schedule === 'function';
      record('7b', 'Agendar job RECORRENTE', temSchedule ? 'EXISTE (metodo)' : 'NAO EXISTE',
        `app.jobs.schedule=${temSchedule} metodos=${Object.getOwnPropertyNames(Object.getPrototypeOf(app.jobs)).join(',')}`,
        temSchedule ? 'metodo existe; recorrencia real depende de tick periodico rodando' : 'sem metodo de recorrencia');
    }
  } catch (e) { record('7', 'Agendar job (fila)', 'SCAFFOLD', e.message, 'jobs lanca: ' + e.message); }

  // 8. AUTO-MELHORIA -- existe caminho que MODIFICA codigo?
  try {
    const hasEvolution = Boolean(app.evolution);
    const hasFactory = Boolean(app.factory);
    const ghOps = Boolean(app.github);
    let proposal = null;
    if (app.evolution?.propose) {
      try { proposal = await app.evolution.propose(T, A, { goal: 'probe' }); } catch (e) { proposal = { error: e.message }; }
    }
    // O veredito NAO pode ser constante no codigo (seria sinal fabricado). Ele e derivado de
    // uma pergunta respondivel: existe algum metodo que aplique mudanca em arquivo de codigo?
    const applyMethods = ['apply', 'applyPatch', 'writePatch', 'selfModify', 'promote']
      .filter((m) => typeof app.evolution?.[m] === 'function');
    const diff = proposal && (proposal.diff || proposal.patch || proposal.files);
    const verdict = (applyMethods.length && diff) ? 'REAL' : (hasEvolution ? 'SCAFFOLD' : 'NAO EXISTE');
    record('8', 'Auto-melhoria (modificar codigo)', verdict,
      `evolution=${hasEvolution} factory=${hasFactory} github=${ghOps} metodos_de_aplicacao=[${applyMethods.join(',')}] `
      + `proposta_traz_diff=${Boolean(diff)} propose=${JSON.stringify(proposal).slice(0, 200)}`,
      verdict === 'REAL' ? null : 'nao ha metodo que produza diff de codigo e o aplique: o ciclo para na proposta/hipotese');
  } catch (e) { record('8', 'Auto-melhoria (modificar codigo)', 'SCAFFOLD', e.message); }

  console.log(`\n===== RESUMO =====`);
  for (const r of results) console.log(`${r.id}. ${r.verdict.padEnd(11)} ${r.name}`);
  if (app.close) await app.close();
  process.exit(0);
})().catch((e) => { console.log('PROBE FALHOU:', e.stack || e.message); process.exit(1); });
