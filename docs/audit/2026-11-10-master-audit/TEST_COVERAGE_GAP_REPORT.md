# TEST_COVERAGE_GAP_REPORT — FÊNIX OS

Data: 2026-11-10 · ✔ Suíte executada pelo auditor nesta data.

## 1. Execução real

Comando: `node --test --test-force-exit --test-reporter=spec --test-concurrency=4 test/*.test.js` em `ai-engine/grg`, Node v22.22.0 (`C:\projetos\ai-engine-core\node.exe`), sem variáveis de ambiente do projeto. Duração: ~19,6 min.

| Métrica | Valor |
|---|---|
| Testes | **1.879** |
| Passaram | **1.485** (79,0%) |
| Falharam | **391** |
| Cancelados | 2 |
| Pulados | 1 |
| Arquivos com falha no nível do arquivo | 25 distintos |

### 1.1 Causa dominante (301 de 391 falhas)

✔ `Error [ValidationError]: bootstrap admin requires both user and password` em `src/security/config.js:27`.
Causa: **alteração não commitada** em `src/security/config.js` (`git diff HEAD`): o usuário bootstrap passou a ter padrão fixo `grg-admin` mesmo fora de produção, com senha padrão vazia, e a guarda de produção foi desligada com `if (false && …)`. Qualquer `start()`/`createApp()` sem `FENIX_BOOTSTRAP_ADMIN_PASSWORD` lança exceção. **No HEAD esses 301 testes provavelmente passam [HIPÓTESE — não reexecutado contra o HEAD].**

### 1.2 Falhas independentes da causa acima (amostra relevante)

| Teste | Erro | Leitura |
|---|---|---|
| `OIDC verifier rejects insecure endpoints and unsigned identities` | Missing expected exception | **Regressão de segurança** |
| `IDE never substitutes Fenix files for another project or an empty workspace` | regex encontrou `tree.length === 0` | IDE pode mostrar arquivos errados |
| `Phase B: AMBIENT_CITY_LOTS has zero collision with 45 enterprise project parcels` | lote "north-east" sobrepõe "project-1" | bug de layout da cidade |
| `M3: TaskEngine — DAG Decomposition…` | `Agent Research Agent has no execution adapter` | agente sem executor |
| `SNAPSHOT 2/3` (rollback) | `EBUSY … grg\data\test-snapshot-workspace` | teste escreve em `grg/data` real; trava no Windows |
| `3D city rendering scales GPU cost…` | `preserveDrawingBuffer` deveria estar desligado | custo de GPU |
| `FÊNIX shell discovery maps the 18 hash-routed views` | contagem diferente | há 19 views |
| `RECIPROCITY 11` | `operations-live.js must list reciprocity tab` | UI divergente do contrato |
| `Level 20/21/23`, `UNIFIED FRONTEND SUITE`, `Visual Recovery` (Playwright) | timeouts de 30–240 s, "found 0 KPI capsules" | E2E de navegação não completa |
| `VPS chat returns real provider text…` | chave de fixture | teste depende de ambiente |
| `api-platform-life-reality` | 88 s, falha | depende da API Platform (offline) |

### 1.3 Os 3 testes obrigatórios do CLAUDE.md

| Teste | Resultado ✔ | O que realmente prova |
|---|---|---|
| `architecture-guard.test.js` | PASSOU | Script (não `node:test`) que varre todo `C:\projetos\ai-engine-core` atrás de shells concorrentes; checa 14 IDs de view por substring; sobe servidor com `GRG_LLM=0` ou **reaproveita qualquer processo na porta 4400** (não hermético) |
| `frontend-honesty.test.js` | PASSOU (23/23) | Auditor de "sinais falsos" sobre `public/` + ~18 regex em código-fonte. Estático. **Não detecta** os fallbacks `'98%'` e `|| 4` encontrados nesta auditoria |
| `frontend-runtime-safety.test.js` | PASSOU (5/5) | 5 regex em `unified-app.js`. Estático |

Os três passarem **não** significa que o produto funciona: a suíte completa tem 391 falhas.

## 2. Inventário por tipo (heurística por nome + conteúdo)

| Tipo | Qtde | Observação |
|---|---|---|
| Arquivos `*.test.js` | 476 | + 1 `.mjs` que o `npm test` **não executa** (`e2e-event-city-realtime.test.mjs`) + ~33 scripts `.js` em `test/` fora do glob |
| Servidor HTTP real | 59 | bom sinal |
| App em processo (`createApp`) | 74 | |
| Browser (Playwright) | 47 | dependem de `FENIX_QA_CHROMIUM_PATH`; só 3 se pulam sem browser |
| Estáticos de string do frontend | 124 (90 puramente estáticos) | provam que um texto existe, não que a tela funciona |
| Postgres | 18 menções, **0 com banco real** | `postgres-store-retention` usa `fakePool()` |
| Autenticação | 12 por nome | |
| Concorrência | 5 por nome | |
| Recuperação/persistência | 13 por nome | |
| Pulados condicionalmente | 16 testes em 6 arquivos | `container-entrypoint` (10, exige `sh`), `self-development-ai-platform` (exige `GRG_AIPLATFORM_*`) |

## 3. Lacunas

### 3.1 Comportamento sem nenhum teste

| Lacuna | Por que importa | Teste necessário |
|---|---|---|
| Rota `preview/dev-session` não concede privilégio | P0 de segurança | HTTP: preview com `userId:"grg-admin"` não pode chamar rota com `authorize('runtime:admin')` nem métodos não-GET |
| Rotas de terminal/arquivo exigem permissão | P0 (RCE) | HTTP: viewer recebe 403 em `reality-operator/terminal/exec`, `command-palette`, `files/edit` |
| Login não aceita senha fixa | P0 | `auth.test.js` já tem "legacy bootstrap passwords cannot bypass…", **mas está falhando** pela causa 1.1 — o backdoor passa despercebido |
| Nenhum segredo versionado | P0 | teste de repositório: `git ls-files` não contém `.secrets/` nem `*vault*.json` |
| Postgres real | store único é o maior risco de escala | testes com Postgres efêmero (docker) para `update()` concorrente e retenção |
| API + worker concorrendo | perda/duplicação de jobs | 2 processos, 1 fila, N jobs → cada job executado exatamente uma vez |
| Reinício no meio de job | recuperação | matar worker durante job, subir de novo, job termina ou vai para DLQ |
| Isolamento de tenant em WebSocket/SSE | vazamento entre empresas | 2 tenants conectados; evento do tenant A não chega ao B |
| Isolamento de tenant em GraphBrain/AgentRegistry/PatternLibrary | idem | consultas do tenant B não veem dados do A |
| Upsert no Qdrant pelo KnowledgeGenome | bug confirmado | teste com vector store falso que valida a assinatura |
| Saída real de modelo | nenhum teste padrão toca provedor real | suíte opcional "contract" por provedor, rodada com chaves em CI |
| Fallbacks fabricados | `success:true` falso | teste por módulo: falha do provedor → `success:false` |
| Frontend chama endpoints existentes | ≥10 chamadas para rotas inexistentes | teste que extrai `fetch('/api/…')` de `public/` e confere com o roteamento |

### 3.2 Subsistemas sem teste algum

`automation/`, `cli/`, `compiler/`, `connections/`, `context/`, `mind/`, `vision/`, `voice/` (sem teste e sem ligação em `app.js` → provavelmente mortos); `models/` e `queue/` estão vazios.

### 3.3 Qualidade dos testes existentes

- **IA sempre simulada:** 16 testes injetam `providers:`, ~15 definem `fake*`, 3 substituem `global.fetch`. A lógica de roteamento é real, a saída do modelo nunca.
- **Testes acoplados ao código-fonte:** muitos fazem `assert.match(source, /…/)` sobre o texto do arquivo. Provam que uma string existe, não o comportamento. Quebram em refatorações legítimas.
- **Asserções fracas:** vários "truth tests" checam só existência (`assert.ok(x)`).
- **Não herméticos:** dependem de caminhos locais (`FENIX_API_PLATFORM_WORKSPACE`, 24 refs), de Ollama local (só 6 testes setam `GRG_LLM=0`) e de processo na porta 4400.
- **Efeitos colaterais:** escrevem em `grg/data/` e `grg/.data/` reais (ver STABILITY_SECURITY_AUDIT ST9).
- **CI:** `.github/workflows/fenix-ci.yml` roda `npm test` sem instalar browsers do Playwright → os 47 testes de browser **[HIPÓTESE]** falham em CI. Status do CI não verificado (`gh` sem autenticação).

## 4. Último QA visual registrado (não reexecutado)

- `grg/qa-results/frontend-navigation-qa.json` (2026-10-21): `authenticationBlocked: true`, `navigationBlocked: true`, 0 controles exercitados.
- `grg/qa-results/layout-reality-gate.json` (2026-10-14): 112 resultados, 0 overflow horizontal, 23 com elementos fora da viewport.
- `screen-contract-probe.json`: `available: 0`.

→ **O último QA de navegação registrado não passou do login.**