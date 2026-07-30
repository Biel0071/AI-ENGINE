# FÊNIX — Dívida Técnica (medida)

> Ordenada por **custo de operação**, não por gosto estético. Cada item tem medição, impacto
> observado e a correção concreta. Itens já corrigidos ficam registrados com a medição de antes
> e depois — servem de referência de calibragem.

---

## D1 — Documento único de estado (dívida estrutural, dominante)

**Medição:** `fenix.kernel_state` é **uma linha** (`state_key='global'`) com o estado inteiro em
jsonb. Toda escrita reserializa tudo sob `ISOLATION LEVEL SERIALIZABLE`.

| Tamanho do doc | `read()` | `update()` no-op |
|---|---|---|
| 6,38 MB | 321 ms | ~2.000 ms |
| 5,4 MB | 312 ms | ~900 ms |
| 607 kB | 121 ms | ~430 ms |

**Impacto observado:** com ~61 escritas/min da API, o store saturava. Jobs morriam com
`could not serialize access due to concurrent update` (40001) e `worker heartbeat expired` — **por
não conseguirem escrever**, não por defeito próprio. Em um episódio anterior a fila parou por
completo (7 de 7 ciclos do worker falhando, 0 workers registrados, 4 jobs órfãos).

**Por que não foi resolvido:** separar coleções em tabelas é mudança de arquitetura do kernel,
com migração de schema 33 e reescrita de todo `store.update(mutator)`. Fora de escopo até aqui.

**Mitigações aplicadas (medidas):**
- retenção por bytes no `PostgresStore` (antes não podava nada);
- retry dimensionado (6 tentativas, base 250 ms, jitter 0.5) contra os ~2 s reais de transação;
- teto de bytes no resultado de job;
- varredura de ativação em **uma** escrita em vez de 26.

**Dívida remanescente:** o custo continua sendo `nº de escritas × tamanho do documento`. A
próxima alavanca real é **sink externo de histórico** + tabelas separadas para as coleções
append-only (`auditEvents`, `domainEvents`, `runtimeJobs`).

---

## D2 — Fan-out de 8 escritas por evento

**Medição:** um `fabricEvents.publish()` provoca **8 chamadas a `store.update()`** (contado
instrumentando `store.update` num publish real): event store, ai-city, version engine, digital
twin, audit trail, mais os eventos derivados (`city.updated`, `global.version.recorded`) que
reentram no pipeline.

**Impacto:** cada componente checado na ativação custa ~7 s de capacidade de store. Emitir evento
em laço é a operação mais cara do sistema.

**Correção não aplicada:** as projeções precisariam escrever em lote ou de forma assíncrona
desacoplada. Muda o contrato dos projetores — decisão de arquitetura, não ajuste.

---

## D3 — 193 sinais falsos em 13 módulos simulados

**Medição:** `simulationAudit` → 0 módulos `production`, 13 `simulated` concentrando 187 sinais.
Tipos: `hardcoded-score`, `hardcoded-percent-string`, `hardcoded-verdict`,
`hardcoded-confidence`, `hardcoded-delta`, `hardcoded-count`.

**Impacto:** o sistema exibe inteligência que não mediu. Viola a regra REALITY FIRST do próprio
projeto, e o auditor existe justamente para pegar isso — está pegando, e ninguém agiu.

**Concentração:** `omega-infinity` 33, `omega` 30, `onedeploy` 26, `operations` 19, `keos` 18.

---

## D4 — Retenção não alcança campo dentro de registro

**Medição:** `operationalInvestigations[].evidence` acumulava uma evidência por check, a cada
5 min, para sempre — 10 investigações ocupando **369 kB** (6% do documento).

**Causa:** `kernel/retention.js` limita o **tamanho da coleção**, nunca um array dentro de um item
longevo. Um registro que vive passa por baixo da poda.

**Corrigido:** corte no push (últimas 20 amostras), com o motivo no código.

**Dívida remanescente:** é um padrão, não um caso. Qualquer `item.array.push()` em registro
longevo tem o mesmo defeito. Não há verificação automática disso.

---

## D5 — Resultado de job sem teto (corrigido)

**Medição:** o engine gravava em `job.result` o retorno do handler sem limite.
`operational.activation` devolvia **26 kB por job** (run + 26 componentes + readiness inteiro),
com 60 jobs retidos = **1,2 MB, 19% do documento**. E era **duplicata**: o relatório já vive em
`operationalReadinessReports`.

**Corrigido:** `FENIX_JOB_RESULT_MAX_BYTES` (default 4 KB) com marcador informando tamanho real e
onde procurar. Novos resultados de ativação: **12 bytes**.

---

## D6 — Allowlist de env do compose (corrigido)

**Medição:** o bloco `environment` do compose é uma allowlist. `FENIX_MISSION_AUTOSTART=1` estava
no `.env.production` e `/proc/1/environ` do worker **não tinha uma única variável de missão**.

**Impacto:** o deploy reportava sucesso e o comportamento era o default silencioso. Custou um
release inteiro (rc.13) sendo no-op.

**Corrigido:** 20 variáveis de runtime/retenção repassadas + `test/compose-runtime-env.test.js`
que cruza o que o código lê com o que o compose repassa.

**Armadilha derivada (corrigida):** `${VAR:-}` entrega **string vazia**, não ausente. Default de
parâmetro (`ownerId = crypto.randomUUID()`) só vale para `undefined` → o vazio atravessou e a fila
parou com `workerId is required`. Consumidor normaliza com `|| undefined`; teste cobre o padrão.

---

## D7 — Erro engolido em caminho autônomo (corrigido)

**Medição:** `missions.reconcile` fazia `catch {}` no `start()`. Com `iniciadas: 0` e nada mais,
"a política recusou", "o ator perdeu permissão" e "a variável nunca chegou ao processo" eram
indistinguíveis de fora — e a causa era a terceira. Custou uma sessão de diagnóstico.

**Corrigido:** `naoIniciadas: [{missionId, reason}]` no relatório + log do worker apenas quando
houve ação ou recusa.

**Padrão a generalizar:** todo `catch {}` em laço autônomo é dívida. Não foi feita varredura por
outros.

---

## D8 — 5 testes falhando em `main`

`chat.test.js`, `cognitive-council-voting`, `keos-uios-coverage`, `omega-infinity-coverage`,
`v61-operation-genesis`. **Pré-existentes** (provado por `git checkout` do arquivo: mesmo
resultado antes e depois das mudanças). `chat.test.js:54` espera texto antigo (`/Gerei o projeto/`)
enquanto `generate` hoje cria um programa com 6 missões — a expectativa está velha, não o código.

**Impacto:** uma suíte que já falha normaliza falha. Regressão nova se esconde no ruído.

---

## D9 — 144 markdowns, nenhum medido

40+ arquivos `.md` na raiz de `grg/` (FENIX_ARCHITECTURE_MAP, FENIX_GENOME, EXECUTIVE_BRAIN,
SYSTEM_INTEGRATION_MATRIX, RC1_PROMOTION_REPORT…). Descrevem intenção; nenhum tem data de
medição nem é verificado por teste. `docs/architecture/` não existia até este Discovery.

**Risco:** documentação que afirma capacidade que a medição contradiz é pior que documentação
ausente — foi o que produziu a resposta errada do FÊNIX na UI ("não possuímos capacidades
avançadas").

---

## D10 — `livingRuntime` implementado e não wired

`src/runtime/living-runtime.js` (8 loops, lease, heartbeat, suspensão por falha repetida, ~540
linhas) **não é instanciado em nenhum lugar** — `grep` por `LivingRuntime` fora do próprio arquivo
não retorna nada. O worker atual (`worker.js`) faz um subconjunto disso.

Dois motores de laço permanente, um deles morto. Decidir: promover o `livingRuntime` a serviço
único ou remover.

---

## D11 — `app.queues`, `app.llm`, `app.objects`, `app.vectorStore`, `app.redis` nulos localmente

`app.queues` é **objeto vazio (0 métodos)** — a fila real é `app.jobs`. Um nome que promete e não
entrega já causou diagnóstico errado ("capacidade 7 não existe"). Os outros são `null` por
ausência de infra local, o que é correto — mas `queues` é diferente: é um nome órfão.

---

## Ordem recomendada de pagamento

| # | Item | Ganho | Custo |
|---|---|---|---|
| 1 | D3 busca web (o que mente) | credibilidade | horas |
| 2 | D8 destravar suíte | toda regressão futura fica visível | horas |
| 3 | D11 remover `app.queues` órfão | evita diagnóstico errado | minutos |
| 4 | D10 decidir livingRuntime | um motor de laço, não dois | horas |
| 5 | D1/D2 sink externo + tabelas | tira o teto de escala | dias |
| 6 | D3 restante: tornar real ou remover 8 camadas | 187 sinais a zero | semanas — decisão primeiro |
