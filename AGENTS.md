# FENIX OS - FONTE UNICA DA VERDADE OPERACIONAL

Atualizado em: 2026-08-26
Snapshot auditado: `FENIX_GOLDEN_BASELINE@08383c7b3f6017fe9d80d64811193cd6c7c0c2f7`

Este arquivo e o contrato operacional do repositorio para humanos e agentes de IA
(Codex, Claude, Qwen e equivalentes). Se qualquer README, memoria, ADR, manifesto,
branch, screenshot ou comentario contradizer este arquivo, este arquivo prevalece
ate que a contradicao seja validada no runtime e registrada aqui.

## 1. Verdade executavel atual

- Branch de trabalho auditada: `FENIX_GOLDEN_BASELINE`.
- Runtime real local/VPS: `grg/src/server.js`.
- Comando canonico local: entrar em `grg/` e executar `node src/server.js`.
- Porta canonica: `4400`.
- Health check: `GET /health`.
- Login: `/`, `/login` ou `/GRG-login` -> `grg/public/login.html`.
- Aplicacao autenticada: `/app` -> `grg/public/index.html`.
- Frontend canonico: somente `grg/public/`.
- Backend/composicao de dominio: `grg/src/app.js`.
- Servidor, REST, SSE, WebSocket e arquivos estaticos: `grg/src/server.js`.
- Kernel e registries: `grg/src/core/`.
- Estado e infraestrutura: `grg/src/kernel/` e `grg/src/infrastructure/`.
- Deploy canonico: `grg/docker-compose.enterprise.yml` + `grg/Dockerfile`.

O `npm start` e o `npm run dev` da raiz executam `node grg/src/server.js`.
O servidor anterior permanece apenas em `npm run start:legacy` e deve ser tratado
como legado de migracao ate ser removido ou convertido em proxy explicito.

## Diagnóstico operacional e fan-out em lotes (2026-10-09)

- `EventStore.appendMany()` persiste eventos individuais numa atualização, preservando sequência por stream, hashes e idempotência. `FabricEventBus.publishBatch()` mantém os eventos tipados e notifica os consumidores com o lote para projetar Cidade, versões globais e twin uma vez por lote.
- `EventBus.beginBatch()` consolida as gravações de auditoria depois do fan-out completo, mantendo um registro auditável por evento original e por notificação derivada. A ativação segue limitada a grupos de 4 e heartbeat entre grupos.
- `activation-write-budget.test.js` reproduz o custo anterior de 92 atualizações com 9 componentes e garante no máximo 30 depois da alteração, verificando também evento, Cidade, versão e twin por componente.
- Estado pós-implementação local: 40 testes focados e os quatro gates canônicos passaram. O suite completo foi executado e acusou falhas distribuídas em testes existentes de Alexa, API Platform, shell visual, GitHub sem autenticação e capacidades não implementadas; nenhum gate obrigatório falhou.
- Compatibilidade de inicialização: a recarga revelou que o `app.js` carregado na VPS chama `FabricEventBus.setRedisClient()`, ausente no checkout e no backup remoto. O setter opcional foi incluído com teste de regressão; o segundo deploy estabilizou o backend e o health voltou a 200.
- Evidência VPS após deploy `79f83be1`: PM2 `fenix-backend` online, sem novos restarts durante as amostras; `/health` Fênix 200 em 3 ms, frontend 200 em 5 ms, API Platform 200 em 73 ms e API legada 200 em 404 ms. Disco raiz 92%, swap ~961 MiB e CPU steal entre 41% e 42% nas últimas amostras; esses limites do host ainda afetam fluidez.
- Fênix worker, Ollama CPU-only e PostgreSQL compartilham CPU. A API legada na porta 4400 segue acessível publicamente e não foi parada sem confirmar seus consumidores.

## 2. Arvore arqueologica canonica

```text
ai-engine/
|-- AGENTS.md                         <- esta fonte unica da verdade
|-- grg/                              <- PRODUTO EXECUTAVEL CANONICO
|   |-- src/server.js                 <- entrypoint HTTP :4400
|   |-- src/app.js                    <- composition root do dominio
|   |-- src/core/                     <- Kernel, registries, policies
|   |-- src/api/                      <- rotas v2 e developer/product APIs
|   |-- src/chat/                     <- chat persistido/streaming
|   |-- src/missions/                 <- missoes e workers
|   |-- src/runtime/                  <- jobs, worker e execucao
|   |-- src/infrastructure/           <- Postgres, Redis, S3, Qdrant, auth
|   |-- public/                       <- UNICO frontend permitido
|   |   |-- login.html                <- entrada publica
|   |   |-- index.html                <- shell autenticado
|   |   |-- unified-app.js            <- estado, API e roteamento principal
|   |   |-- unified.css               <- base visual principal
|   |   |-- command-center.*          <- dashboard de comando
|   |   |-- iso-city.js               <- AI City
|   |   |-- ide-enhancer.js           <- IDE/preview/inspector
|   |   |-- dev-pipeline-client.js     <- pipeline de desenvolvimento
|   |   `-- live-runtime.js            <- eventos em tempo real
|   |-- test/                         <- contratos e gates do produto
|   `-- docker-compose.enterprise.yml <- stack de producao
|-- engine/                           <- biblioteca historica de analise/geracao;
|                                       nao e o servidor do produto
|-- platform/                         <- control plane/servidor legado; nao servir UI
|-- ai-os/, memory/, docs/, system/   <- especificacoes e memoria consultiva
|-- archive/                          <- frontends e codigo aposentados; nunca importar
|-- future/, generated/               <- sandbox/artefatos; nunca promover implicitamente
|-- graphify-out/                     <- mapa derivado; nao e fonte normativa
`-- patch_*, scratch_*, temp_*        <- artefatos de reparo; nao sao arquitetura
```

### 2.1 Arqueologia real de `grg/public/` em 2026-08-26

| Arquivo | Classe | Papel atual |
|---|---|---|
| `index.html` | CANONICO | shell autenticado; declara nav e as 13 views |
| `unified-app.js` | CANONICO | `window.state`, API autenticada, roteamento e render principal |
| `unified.css` | CANONICO | base visual do shell e workspace |
| `login.html` | CANONICO | login local/OIDC e emissao de token |
| `iso-city.js` | CANONICO | unica City ativa; canvas 2.5D instanciado em `cityCanvas` |
| `live-runtime.js` | ATIVO | WebSocket `/events`, `window.FENIX.live` e eventos `fenix-live` |
| `command-center.js` / `command-center.css` | ATIVO | painéis do Command consumindo `window.state` |
| `ide-enhancer.js` | ATIVO | Monaco, terminal visual, preview e inspector da IDE |
| `dev-pipeline-client.js` | ATIVO | delegacao para `/api/dev/pipeline` |
| `visual-inspector.js` | ATIVO | inspector visual do iframe de preview |
| `fenix-ide-v2.css`, `city-overrides.css`, `living-panels.css` | DEPENDENCIA | estilos carregados pelo shell canonico |
| `preview.html`, `assets/ai-city-bg.png`, `fenix.css`, `office.css`, `design-system.css`, `level30.css`, `layout-patch.css` | DEPENDENCIA/LEGACY | assets/estilos mantidos; so promover apos referencia explicita no shell |
| `fenix-bootstrap.js`, `runtime-cockpit.js`, `cockpit-app.js`, `jobs-app.js` | LEGACY/PARALELO | nao sao carregados por `index.html`; nao podem comandar o shell canonico sem integracao |
| `connections-panel.js`, `task-creator.js` | LEGACY/PARALELO | aparecem em backup antigo; nao entram no runtime atual |
| `index_frozen_backup.html`, `index.html.bkp` | BACKUP | snapshots historicos; nao importar ou servir como fonte |
| `ai-city-physics.js`, `live-dashboard.js` | REMOVIDO/ORFAO | removidos do working tree atual; nao referenciados pelo shell canonico |

## 3. Fluxo real de uma requisicao

```text
Browser /app
  -> grg/public/index.html
  -> unified-app.js + extensoes carregadas pelo shell
  -> fetch /api/*, /api/v2/* e stream de eventos
  -> grg/src/server.js
  -> createApp() em grg/src/app.js
  -> servicos de dominio em grg/src/*
  -> stores/adapters em grg/src/infrastructure/*
  -> Postgres / Redis / Qdrant / MinIO ou adaptador local explicitamente reportado
```

Nenhuma camada pode substituir ausencia de dado por valor plausivel. Estado ausente
deve aparecer como `--`, `indisponivel`, `degraded` ou erro explicito.

## 4. Estado das branches em 2026-08-26

Comparacao contra `FENIX_GOLDEN_BASELINE`:

| Branch | Relacao com o snapshot | Decisao |
|---|---:|---|
| `main` | 129 commits atras, 0 a frente | historica; nao usar como base |
| `master` | 216 atras, 0 a frente | versao v1 historica |
| `fenix/finalization-real-ai-platform` | 28 atras, 0 a frente | ja absorvida |
| `fenix/stabilize-canonical-frontend` | 6 atras, 0 a frente | ja absorvida |
| `vps-rescue` | 154 atras, 1 a frente | snapshot de resgate; nao mesclar inteiro |
| `vps/master` | 219 a frente e 145 atras | historia divergente; apenas cherry-pick auditado |

Regra: nao fazer merge cego de nenhuma branch. Uma feature so entra apos comparar
o arquivo contra o runtime canonico, executar os gates abaixo e registrar a mudanca
neste arquivo. Branch antiga nao e memoria; Git e evidencia arqueologica.

## 5. Estado real do frontend (nao confundir com intencao)

O shell estrutural e o fluxo developer foram restaurados no ciclo de 2026-08-26.
O frontend ainda NAO esta certificado como completo enquanto faltar o E2E visual
autenticado e a validacao dos provedores externos.

Evidencias auditadas:

- Runtime `:4400/health` responde `200` e `ready`.
- Login renderiza corretamente e impede acesso anonimo a `/app`.
- Os quatro JS principais passam em `node --check`.
- A taxonomia canonica possui 14 destinos e 14 views DOM sem IDs duplicados:
  `command`, `city`, `agents`, `ide`, `operations`, `runtime`, `project`, `projects`, `memory`,
  `knowledge`, `mcp`, `browser`, `observability` e `terminal`.
- O HTML quebrado entre editor e painel direito foi reparado.
- Metricas e status plausiveis do shell foram substituidos por valores medidos ou
  estados explicitos `--`, `UNKNOWN`, `EMPTY`, `DEGRADED` e `UNMEASURED`.
- O Developer District usa contratos reais para clone, arvore, leitura, escrita,
  transformacao por IA, move, terminal com polling, preview e pipeline de agentes.
- O Project Mirror canonico deriva telas, arquivos, componentes DOM, APIs, Git,
  design system e runtime do filesystem. `GET /api/project-mirror/source` entrega
  codigo real limitado ao projeto selecionado; o registry e apenas indice/cache.
- A barra de comando de uma Screen envia `source: web` para `POST /api/v2/jobs`
  com `projectId`, `workspaceId`, `screenId`, rota, arquivos, componentes, APIs,
  design system, runtime e Git. O JobEngine persiste o contexto e o pipeline usa
  worktree isolada, IA, gates reais, diff e rollback. Preview do checkout alterado
  permanece `WORKTREE_READY` ate existir um servidor de preview isolado; a UI nao
  o apresenta como live antes disso.
- O runtime fresco em `:4401` publicou `KERNEL_ACTIVE`; o bug 500 de
  `/api/system/boot-status` foi corrigido.
- O fluxo autenticado via API validou login, listagem de 30 arquivos, leitura e
  escrita real. O terminal isolado, executado fora do sandbox, terminou com exit 0.
- O runtime canonico agora carrega o `.env` da raiz antes de compor os providers,
  sem expor ou versionar secrets. QWEN terminou o discovery como `OFFLINE`; a chave
  OpenAI foi detectada, mas seu health terminou `DEGRADED`. O router operacional
  selecionou somente `echo`, unico provider com self-test conectado. Nenhuma tela
  deve apresentar QWEN/OpenAI como disponiveis enquanto esses checks nao mudarem.
- Em 2026-08-26 o runtime canonico foi corrigido para ignorar `PORT` generico
  como default; sem `PORT` explicita, mesmo com `.env` contendo `PORT=4000`, a
  execucao direta sobe em `:4400`. `GET /health` respondeu `ready` e
  `GET /api/system/boot-status` respondeu `KERNEL_ACTIVE`.
- `unified-app.js` publica `window.FENIX.api/state` e dispara `FENIX_READY`;
  `live-runtime.js` conecta o WebSocket sem sobrescrever o KPI de agentes; e
  `iso-city.js` instancia a City canonica no `cityCanvas` existente.
- O tema visual canonico depende de `unified.css` iniciar em `:root`. Em
  2026-08-26 foi removida corrupcao de encoding antes de `:root`, que quebrava
  variaveis CSS e fazia o shell autenticado regredir para barra branca/textos
  pretos. O Command Center agora possui linhas/status legiveis, cards com
  contraste e AI City com fundo escuro proprio.
- O Command Center foi aproximado do cockpit operacional-alvo sem criar nova tela:
  o painel 5 mostra jobs reais quando publicados e cai para projetos; o painel 8
  mostra eventos reais; e o painel 9 mostra providers a partir de `/health`,
  `/providers` ou `/connection`. Se o runtime nao publicar dado, a UI mostra
  estado vazio/degradado em vez de preencher numeros plausiveis.
- `iso-city.js` evoluiu sem criar City paralela: adicionou distritos
  `KNOWLEDGE` e `MCP`, estruturas estaticas nos distritos, legenda e sincronismo
  com `window.FENIX.state.data.agents/swarm`. Contagens e agentes continuam
  vindo somente do estado real.
- Os gates `frontend-honesty` (4/4), `frontend-runtime-safety` (5/5),
  `operational-console-ui` (7/7) e `architecture-guard` passaram neste ciclo.
- A sessao visual nao autenticada no navegador confirmou `/GRG-login` sem erros
  de console e `/app` anonimo redirecionando para login. A sessao visual
  autenticada continua pendente: a extensao do Chrome nao expos aba local
  autenticada para inspecao read-only e digitar senha exige confirmacao explicita.

Conclusao: os contratos estruturais convergiram e o fluxo developer tem backend e
controles reais. Os bloqueios atuais sao prova visual autenticada, provedores de IA
externos indisponiveis e infraestrutura local usando adaptadores de desenvolvimento.

## 6. Ordem obrigatoria para finalizar o frontend

1. **Eliminar dois runtimes oficiais**
   - Fazer raiz/deploy/dev apontarem inequivocamente para `grg/src/server.js`.
   - Remover `platform/public` do caminho executavel ou arquiva-lo.

2. **Restaurar o contrato estrutural**
   - Escolher a taxonomia final das telas e alinhar nav, IDs DOM, router e testes.
   - Nenhum botao pode existir sem view renderizavel e estado vazio util.

3. **Restaurar honestidade de dados**
   - Remover percentuais, versoes, latencias e scores fabricados.
   - Todo card deve ter endpoint, loading, empty, degraded e error state.

4. **Concluir a IDE como fluxo vertical**
   - Selecionar projeto -> listar arvore -> abrir arquivo -> editar -> salvar ->
     executar terminal -> receber polling/stream -> abrir preview -> inspecionar ->
     aplicar mudanca -> mostrar evidencia.

5. **Corrigir layout e encoding**
   - Remover artefatos de patch e mojibake.
   - Resolver overflow/sobreposicao em desktop e validar breakpoints menores.

6. **Validar autenticado e promover**
   - Rodar gates unitarios, contratos frontend, E2E autenticado, screenshots e smoke
     no mesmo build que sera implantado.

## 7. Definition of Done do front

O frontend so pode ser chamado de completo quando:

- cada item de navegacao abre uma view funcional;
- nenhum dado plausivel e fabricado;
- login, refresh de token e logout funcionam;
- command center, city, agents, IDE, runtime, projects, memory, knowledge, MCP,
  browser QA, observability e terminal possuem estados reais ou indisponibilidade
  honesta;
- o fluxo da IDE funciona ponta a ponta com arquivo real e preview;
- console do navegador nao apresenta erro nao tratado;
- suites `frontend-honesty`, `architecture-guard`, `frontend-runtime-safety` e
  `operational-console-ui` passam;
- E2E autenticado percorre todas as telas e guarda evidencia visual;
- o compose de producao serve exatamente o mesmo artefato validado localmente;
- este arquivo e atualizado no mesmo commit da mudanca arquitetural.

## 8. Regras para qualquer agente que entrar

1. Ler este arquivo antes de propor ou editar codigo.
2. Confirmar branch, commit e `git status`; preservar alteracoes do usuario.
3. Rastrear a feature do DOM ate a rota e o store antes de alterar qualquer camada.
4. Nunca recuperar um frontend inteiro de outra branch; portar apenas a capacidade.
5. Nao criar novo shell, servidor, design system, memoria global ou fonte da verdade.
6. Nao usar `archive/`, `future/`, `generated/`, `temp_*`, `patch_*` ou screenshots
   como dependencia de runtime.
7. Atualizar testes junto com o contrato, nao para esconder falhas.
8. Se codigo, teste, deploy e documento divergirem, a precedencia e:
   runtime observado -> teste reproduzivel -> codigo executado -> este arquivo -> ADR/docs.
9. Alteracao arquitetural exige atualizar esta fonte no mesmo commit.
10. Declarar claramente o que foi medido, inferido e ainda nao validado.

## 9. Comandos de verificacao

No Windows deste workspace, o Node disponivel esta em `../node.exe` quando o cwd
e `grg/`.

```powershell
# Sintaxe dos entrypoints principais
..\node.exe --check src\server.js
..\node.exe --check public\unified-app.js
..\node.exe --check public\fenix-bootstrap.js
..\node.exe --check public\iso-city.js

# Gates atuais do frontend (executar diretamente evita spawn bloqueado no sandbox)
..\node.exe test\frontend-honesty.test.js
..\node.exe test\architecture-guard.test.js
..\node.exe test\frontend-runtime-safety.test.js
..\node.exe test\operational-console-ui.test.js

# Runtime canonico
..\node.exe src\server.js
```

## 10. Decisoes e pendencias atuais

- Decidido: manter os 13 distritos operacionais anteriores e incorporar `project`
  como Project Mirror no mesmo shell, totalizando as 14 views listadas na secao 5.
- Decidido: o comando `npm start`/`npm run dev` da raiz aponta para
  `grg/src/server.js`; o servidor anterior existe apenas como `npm run start:legacy`.
- Decidido: o controlador duplicado da AI City foi removido de `unified-app.js`;
  `iso-city.js` e a unica implementacao ativa da cidade.
- Decidido: `options.llm = false` desliga o chat natural de forma explicita e nao
  pode reativar fallback por variavel de ambiente; o modo regras passa a ser
  respeitado ate `ChatAgent` e `ConversationStore`.
- Decidido: `FENIX_PORT`/`GRG_PORT` podem alterar a porta canonica; `PORT`
  generico nao pode desviar a execucao local padrao de `:4400`.
- Pendente: substituir os adaptadores in-memory por Postgres/Redis/Qdrant configurados
  no ambiente de producao e comprovar persistencia entre reinicios.
- Pendente: restaurar conectividade/autenticacao de pelo menos um provider de IA
  externo e executar uma chamada de inferencia com provider, modelo, latencia e
  tokens registrados. A presenca de chave, isoladamente, nao prova disponibilidade.
- Pendente: concluir o E2E visual autenticado em desktop e breakpoint menor.
- Pendente: servir e autenticar um preview do worktree isolado para promover o
  artefato `WORKTREE_READY` a preview visual pos-alteracao.
- Validado em 2026-08-28: `POST /api/dev/projects/clone` preserva diretorios relativos
  organizados (por exemplo `projects/API-PLATAFORM`), rejeita caminhos absolutos/traversal
  e aciona o scan real que registra projeto, repositorio, capacidade e relacoes no store.
- Validado em 2026-08-28: o repositorio API-PLATAFORM e consumido pelo provider canonico
  `aiplatform` via `/v1/text`, `/v1/chat` e polling de `/v1/jobs/:id`; nao existe gateway
  paralelo dentro do FENIX.
- Validado em 2026-08-28: o Project Mirror agrega dependencias dos workspaces de monorepos,
  reconhece o stack real do API-PLATAFORM e limita descoberta REST a receptores HTTP
  conhecidos, evitando classificar chamadas genericas `.get()` como endpoints.
- Validado em 2026-08-28: o terminal seguro resolve CLIs de package managers no Windows
  e as executa via Node, preservando `shell:false`, whitelist e validacao de subcomando;
  uma CLI ausente falha explicitamente e pode ser configurada por `FENIX_<NOME>_CLI`.
- FENIX-CONTINUOUS-0001: o `CentralOrchestrator` nao possui executor de arquivos paralelo.
  Ele persiste requests/missions/events no store canonico (schema 36), decompoe a missao em
  tarefas, delega geracao/aplicacao ao `JobEngine` + `SafeDevPipeline`, exige diff, arquivo
  alterado e pelo menos um gate real aprovado. Falha aciona rollback da worktree e uma nova
  tentativa com o erro anterior no contexto; `/health` isoladamente nunca conclui missao.
- FENIX-CONTINUOUS-0002: a URL padrao da API Platform aponta para o gateway Fastify real em
  `http://209.50.241.215:3000`; a porta 80 serve apenas o dashboard e respondia 405 aos POSTs.
  `FenixMind` e `PromptCompilerEngine` reutilizam o `secret-resolver` em vez de repetir o host.
  A conectividade foi medida (`/v1/health`: ONLINE, Postgres/Redis/Docker e quatro providers
  online), mas a inferencia permanece DEGRADED enquanto a chave configurada retornar 401
  `INVALID_API_KEY`; conectividade nao deve ser confundida com credencial valida.
- FENIX-CONTINUOUS-0003: `grg/node.exe` (binario versionado de 25 MB) foi removido porque
  sombreava o Node do sistema nos lifecycle scripts do npm e impedia os testes de iniciarem.
  `npm test` agora descobre explicitamente `test/*.test.js`, termina mesmo quando suites deixam
  handles abertos e falha honestamente com a lista de regressões; `npm run test:orchestration`
  e o gate focado do closed loop. A remocao e recuperavel pelo historico Git e o Docker nunca
  copiava esse binario para a imagem.
- FENIX-CONTINUOUS-0004: a liveness do container usa `/api/system/boot-status`, que mede o
  processo/kernel sem depender de inferencia externa. `/health` continua sendo o probe profundo
  de readiness e valida o provider com geracao real, mas nao pode dirigir reinicio automatico:
  a latencia do provider excedia o timeout e um daemon legado reiniciava inclusive o PostgreSQL.

Enquanto essas decisoes nao forem fechadas, implementar primeiro o fluxo principal:
**login -> selecionar projeto -> conversar -> editar codigo -> executar -> visualizar
preview -> validar resultado**.

## V2 Evolution Rules (2026-09-04)

Decisoes tomadas durante a sessao de planejamento FENIX OS V2. Todas as regras abaixo
prevalecem sobre qualquer instrucao anterior que as contradiga.

### Rule: No Rewrites
Nunca recriar o frontend, backend, AI City ou runtime do zero.
Sempre evoluir os arquivos canonicos existentes. Antes de qualquer mudanca grande,
perguntar: posso corrigir? posso extrair? posso adaptar? posso reutilizar?

### Rule: No Mocks in Production Paths
Caminhos de codigo em producao nunca devem conter: setTimeout simulando progresso,
agentes falsos, dados demo, missoes falsas, progresso inventado, eventos WebSocket falsos.
Usos legitimcos de setTimeout (debounce, polling, timeouts reais) sao preservados.

### Rule: No Card Factory
Nao resolver problemas de UI adicionando mais cards. Usar: workspaces, drawers,
inspectors, timelines, tables, overlays, command surfaces.

### Rule: Single Source of Truth
A City, Agent Desk, Mission Workspace e todos os paineis do frontend consomem
FENIX Runtime State vindo do backend. Nenhum componente mantem estado independente.
O frontend nao executa logica paralela.

### Rule: Ollama Local-First
Provider de LLM e Ollama (local). Sem chamadas a APIs cloud a menos que explicitamente
configurado. SQLite para persistencia local, Postgres quando disponivel.

### Rule: UI Language
PT-BR para labels e textos de interface. EN para codigo, variaveis, nomes de API
e paths de rotas.

### Rule: Vanilla JS Frontend
O frontend permanece vanilla JS. Sem migracao para React, Vue, Svelte ou qualquer
framework. Evoluir os arquivos monoliticos existentes incrementalmente.

### Rule: Prove Before Claiming
Nunca dizer "implementado" sem provar execucao.
Nunca dizer "funcionando" sem rodar.
Nunca dizer "validado" sem um teste.
Validacao Playwright e obrigatoria apos mudancas de UI.

### Rule: City = Runtime Truth
A AI City reflete estado real do runtime. Movimento de agentes e dirigido por eventos
reais (agent.online, job.started, tool.started, job.completed, agent.handoff).
Nunca animar a City apenas para "parecer viva".

### Rule: Attack Priority
Ao evoluir: Runtime > Execucao > Eventos > WebSocket > City sync > UI polish.
Nao comecar por mudancas visuais. Provar o ciclo end-to-end primeiro:
Command -> Mission -> Agent -> Job -> Real Execution -> Event -> City -> Result.

### Evidencia VPS 2026-09-23
- `/api/v2/jobs` e `/api/v2/runtime/full-status` sem credencial retornam 401 depois da correcao da rota pre-auth remota.
- Job canonico `discovery.scan` executou sonda Docker na VPS; apos reload do PM2 o mesmo UUID continuou `SUCCEEDED`, com 9 recursos no inventario e 2 eventos. `FENIX_DISCOVERY_DOCKER=1` esta no ecosystem remoto e no dump PM2.
- WebSocket `/events` remoto rejeitou conexao anonima e aceitou token valido apos retirar fallback administrativo de desenvolvimento. Backup remoto `server.js.bak-ws-20260923112211`.
- `AgentRuntime` local agora falha quando um papel nao tem executor; registro de papel nao significa capacidade de agir. `TaskEngine` local tambem nao conclui tarefa sem executor. Essas mudancas locais ainda nao foram implantadas na VPS.
- Teste direcionado `m2-agent-runtime.test.js`: 2/2. A bateria `e2e-http.test.js` passou 16/16 apos corrigir `server.start()` para honrar `options.dataFile` quando nao ha `DATABASE_URL` explicita; antes os testes reutilizavam o SQLite padrao e colidiam em projetos, identidade e Fabric.
- Gates locais apos essa correcao: `architecture-guard` 5/5, `frontend-honesty` 19/19, `frontend-runtime-safety` 5/5 e `e2e-smoke` 1/1. A correcao de armazenamento e a mudanca de agentes permanecem locais; deploy do backend requer revisar o adaptador real de subagentes.
- `/api/v2/agents/orchestrate` agora requer `projectId` de um Project Kernel com workspace Git e cria `agent.execute` no JobEngine (HTTP 202 + jobId), em vez de declarar conclusao ficticia. O agente usa `AgentExecutionRuntime` e `AgentWorkspaceExecutor`; plano vazio e teste falho geram erro. Provas locais: submissao HTTP ao JobEngine, execucao real de plano de provedor em repositorio Git temporario com escrita, teste e artefato, e casos negativos de plano vazio/teste falho. Gates 5/5, 19/19, 5/5, 1/1 passaram apos a mudanca. Rota e guardas do executor foram implantados na VPS por patch pontual com backups `*.bak-agent-20260923113210`.
- VPS: `/opt/fenix-os` nao e checkout Git; `/root/api-gratis` e checkout Git na branch `main` (com alteracoes preexistentes). Registrei `api-platform-live` no Project Kernel apontando a `/root/api-gratis`. Prova remota: anonimo 401, projeto inexistente 400, submissao valida 202, job `c82b8687-9db1-433c-8e63-2511954ab1de` persistido como `AWAITING_APPROVAL`. Nenhum arquivo desse projeto foi editado pela prova.
- VPS: corrigi as rotas `default`, `plan` e `generate` para API Platform `qwen2.5:0.5b`; antes `plan/generate` usavam modelo inexistente `echo-large` no Ollama. O provider API Platform respondeu no health real. O primeiro job isolado `35a52d86-dc13-423a-8b57-11d804d2c705` em `/root/fenix-agent-probe-20260923` recebeu resposta real da API Platform mas terminou `DEAD_LETTER` sem tocar arquivos: o modelo entregou JSON em bloco Markdown e nenhum teste. Ajustei o parser para aceitar bloco JSON e recusar mudancas sem testes; teste local direcionado 3/3; patch pontual implantado na VPS. A execucao completa com modelo real ainda precisa de prova positiva.
- Segunda prova `agent.execute` com API Platform: job `3105ca11-42c2-41c1-b82f-4b8e604fa2c5` terminou `DEAD_LETTER` sem editar arquivo. Resposta real do modelo `0.5b` colocou `node --check` em `operations` e deixou `tests` vazio; guarda recusou o plano. Nao alegar capacidade de programacao autonoma desse modelo.
- Prova positiva do caminho executavel explicito na VPS: job `ce0d40ad-9e0f-4ea6-9fdf-464c8501d8a7` do tipo `agent.workspace.execute` criou `proof.js` no Git isolado, executou `node --check proof.js`, terminou `SUCCEEDED`, gerou 2 eventos e 1 artefato `FENIX_AGENT_EXECUTION_REPORT` consultavel por `/api/fenix/projects/fenix-agent-probe-20260923/artifacts`. Nao houve commit nem edicao do projeto de producao. Isso prova JobEngine -> atribuicao -> workspace -> teste -> evento -> artefato, mas nao prova geracao autonoma confiavel pela API Platform.
- `AIPlatformProvider.complete()` chamava fallback `/v1/chat` com timeout implicito de 120s e ate 3 retries, ignorando `FENIX_AI_REQUEST_TIMEOUT_MS=45000` da VPS. Corrigido local e remotamente; 10/10 `aiplatform.test.js` e 14/14 `aiplatform-job-polling.test.js` passaram. Apos reload, job explicito e artefato continuaram disponiveis e `/health` respondeu 200.

### As 5 Regras de Ouro Anti-Regressão e Governança Universal

As 5 regras abaixo são mandatórias e invioláveis para qualquer desenvolvedor, agente de IA (Antigravity, Claude, Gemini, Cursor, Copilot) ou motor de auto-evolução autônomo (Fênix Self-Evolution Engine):

#### 1. Regra I — Fonte Canônica Única Inviolável (Single Source of Truth)
- O **ÚNICO** frontend oficial, executável e editável de todo o sistema reside exclusivamente em:
  `grg/public/index.html` (e módulos complementares em `grg/public/`).
- **PROIBIDO**: Criar cópias paralelas de `index.html` em `scratch/`, na raiz do projeto, ou em subdiretórios temporários/experimentais.
- **ISOLAMENTO HISTÓRICO**: Qualquer frontend aposentado ou legado deve obrigatoriamente residir em `archive/retired-frontends/`.
- **ENFORCEMENT**: O teste `architecture-guard.test.js` e o `Gatekeeper` (`grg/src/governance/gatekeeper.js`) realizam varredura recursiva dinâmica em toda a árvore e bloqueiam qualquer execução ou deploy se detectarem shells paralelas fora do archive.

#### 2. Regra II — Zero-Mock & Honestidade de Telemetria (Veracity Contract)
- O HTML estático NUNCA deve conter métricas, scores, contagens ou percentuais inventados (ex.: "100%", "4 ATIVOS", "95%").
- Todo slot inicial de dado dinâmico deve exibir o marcador honesto de ausência (`—`) até ser carregado por API real.
- Código de backend deve retornar estruturas do contrato `measured(val, source)` ou `unknown(reason)`. É expressamente proibido simular progresso com timeouts artificiais para mascarar ausência de backend real.
- **ENFORCEMENT**: O teste `frontend-honesty.test.js` valida 19 invariantes e falha se qualquer mock for introduzido.

#### 3. Regra III — NUNCA Recriar, SEMPRE Evoluir (Evolution Over Re-creation)
- O frontend é Vanilla JS modular de alto desempenho (14 views integradas). NUNCA substituir por frameworks (React, Vue, Next, Svelte) nem criar um novo shell.
- Preservação estrita de contratos de DOM exigidos por testes (`#orchHeatmapGrid`, `#fenixMemoryErrorNotice`, `#fenixMemoryOperationalContainer`, `.fenix-mem-tab-btn`, `#cityCanvas`).
- Antes de criar qualquer elemento novo, pesquise o que já existe em `grg/public/` e evolua-o.

#### 4. Regra IV — Prova Obrigatória Antes de Concluir (Prove Before Claiming)
- Nenhuma tarefa pode ser alegada como concluída sem evidência factual:
  `CÓDIGO -> SINTAXE (node -c) -> EXECUÇÃO -> TESTES PASSANDO -> DOM VERIFICADO -> ENDPOINTS 200`.
- Bateria de testes obrigatória antes de qualquer entrega ou deploy:
  1. `node grg/test/architecture-guard.test.js` (5/5 verificações)
  2. `node grg/test/frontend-honesty.test.js` (19/19 testes)
  3. `node grg/test/frontend-runtime-safety.test.js` (5/5 testes)
  4. `node grg/test/e2e-smoke.test.js` (1/1 teste full E2E)
- Se a interface visual sofrer degradação (elementos sobrepostos, desalinhamento, quebra de hierarquia), a tarefa NÃO é considerada concluída.

#### 5. Regra V — Deploy Canônico e Paridade Dual de Webroot
- O deploy remoto na VPS (`root@209.50.241.22`) é realizado estritamente pelo script `deploy.bat`.
- Paridade dual de 100% obrigatória entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.
- Após o deploy, validar PM2 #16 (`fenix-backend`) e PM2 #17 (`fenix-frontend`) como `online` e HTTP 200 nas portas 4410 e 3000.

#### 6. Regra VI — Consulta e Atualização Obrigatória da Memória Ativa
- O arquivo `ACTIVE_PROJECT_MEMORY.md` (na raiz do projeto e em `memory/`) é a **Memória Ativa Oficial e Mapa Vivo do Projeto**.
- Todo agente (Antigravity, Codex, Gemini, Claude, Cursor) DEVE OBRIGATORIAMENTE ler `ACTIVE_PROJECT_MEMORY.md` no início de qualquer intervenção.
- Ao concluir modificações relevantes, o agente DEVE sincronizar ou registrar as alterações na seção de *Últimas Modificações* (executando `node grg/scripts/sync-active-memory.js`), unificando o conhecimento de todos os agentes em **uma coisa só**.

---

### Governança da Auto-Evolução do Fênix OS
Qualquer missão ou ciclo autônomo gerado pelo próprio Fênix OS (`AutonomousEvolutionKernel`, `MissionRegistry`, `QualityGate`) está submetido aos mesmos invariantes. Qualquer tentativa de criar frontend paralelo ou injetar mocks resultará em falha imediata da missão (`mission.failedValidation = true`).

## Verificação do Command Center e da City em 2026-09-22

- O shell continua único em `grg/public/index.html`. O Command Center consulta `/api/agents/panel`, `/api/v2/projects`, `/api/v2/jobs`, `/api/missions` e `/api/system/boot-status`. Os endpoints antigos `/api/v2/living-city/agents`, `/api/v2/mirror/projects` e `/api/v2/fenix/intelligence/missions` responderam 404 no runtime observado e não devem alimentar KPIs.
- `fenix-v11-interactions.js` não pode injetar uma frota sintética nem reescrever o mapa de agentes do `IsoCityEngine`. A City só projeta agentes observados no runtime; listas vazias e falhas de leitura têm estados distintos.
- O Command Center não inicia com contagens, progresso, atividade ou decisões de demonstração. A faixa de missão mostra um registro real quando `/api/missions` publicar um; ausência aparece como estado vazio.
- A regra de layout em `fenix-window-overrides.css` usa toda a largura do Command Center. A coluna fixa antiga de 300 px comprimia o painel a cerca de 718 px em uma viewport de 1264 px; a medição após a correção foi 1040 px para o painel e 976 px para a grade de KPIs.
- Evidência local: `frontend-honesty` 19/19, `frontend-runtime-safety` 5/5, `architecture-guard` aprovado, `e2e-smoke` 1/1 e `city-runtime-truth` 2/2. No browser autenticado, os endpoints canônicos responderam 200 e o contador exibiu `19 / 19` agentes registrados e `0` jobs em execução. Isso não comprova inferência da VPS nem operação 24/7.

## Status de runtime e inferência do worker em 2026-09-22

- `/api/v2/runtime/full-status` deve receber o `app` real e o tenant autenticado; contagens de agentes/memórias vêm do store desse tenant. Drivers locais aparecem como `LOCAL_ADAPTER`, sem alegar Redis/Postgres/Qdrant online.
- O worker de jobs só tenta Ollama direto quando uma URL direta foi configurada. A API Platform usa `AIPlatformProvider`, `resolveAIProviderKey` e o contrato `/v1/chat`, incluindo polling de jobs 202. Ausência/falha de inferência marca o job como falho; relatórios sintéticos não são resultados válidos.
- Evidência: `runtime-full-status-truth.test.js` e `fenix-worker-provider-truth.test.js` passaram localmente. Na VPS, PM2 `fenix-backend` estava online mas consumia 100% de CPU, enquanto logs registravam falhas de Ollama/API Platform; o container `api-platform-worker-1` registrou erro de DNS `EAI_AGAIN redis`. Essas condições ainda exigem correção e validação após deploy.
- Em 2026-09-22, o gateway VPS foi reconstruído com roteamento que preserva o modelo Ollama solicitado e `qwen2.5:0.5b` como modelo padrão/rápido instalado. O worker do Fênix e a rota `/api/v2/vps-chat` corrigidos foram implantados com backup dos arquivos anteriores; PM2 #16 foi recarregado com o modelo leve, sem URL direta obsoleta do Ollama, e timeout de 45 s. O contêiner da API ficou `healthy`, o backend respondeu 200 em `/health`, a chamada autenticada Fênix → API Platform → Ollama respondeu HTTP 200 com texto real (`probe-fenix-vps-chat.js`), e o probe direto do gateway também respondeu HTTP 200. Isso prova o caminho de chat nessa amostra; jobs, memória durável e estabilidade 24/7 ainda precisam de provas próprias.
- A senha fixa de bypass no login foi removida no código local e na VPS. A senha de bootstrap da VPS, que era `admin123`, foi rotacionada para uma senha aleatória de 43 caracteres em `/root/.fenix-bootstrap-admin-password` (permissão 600); `ecosystem.config.js`, `.env`, backups de ambos e dump do PM2 ficaram com permissão 600. Após reload e `pm2 save`, o probe autenticado confirmou rejeição da senha antiga e login/chat 200 com a nova. Nunca registrar a senha nova em logs, repositório ou relatório.
- A memória de conhecimento do `StorageManager` passou a usar `FENIX_KNOWLEDGE_SQLITE_PATH=/opt/fenix-os/grg/.data/knowledge.db` na VPS. O driver usa WAL e chave composta `(id, collection)`; a prova remota gravou, fechou, reabriu, leu e removeu um registro. Após reload, o log confirmou `relational:sqlite` e `/health` respondeu 200. O estado principal já usa `/opt/fenix-os/grg/.data/fenix.db`; ambos os bancos e o diretório `.data` foram restringidos a root. Cache ainda é memória local e busca vetorial ainda usa arquivo local com busca textual, então memória semântica completa e persistência de cada subsistema continuam em aberto.

## Cidade ligada ao JobEngine em 2026-09-23

- `grg/src/api/living-city-routes.js` é a projeção autenticada do catálogo de agentes, jobs, missões e projetos. O handler deve preceder as rotas universais legadas na VPS, que interceptavam `/api/v2/living-city/*` com um contrato incompatível. A sondagem remota autenticada obteve HTTP 200 nos dois endpoints, 19 agentes registrados e 2 projetos, com fonte `JobEngine/ProjectKernel`.
- `JobEngine` publica `runtime.job.started` após o claim, além dos eventos de fila e conclusão, com `agentId`, `projectId` e `missionId` nos dados. O teste HTTP 18/18 e o Playwright local confirmaram a ordem `queued → started → succeeded` e a projeção `WORKING` para o agente designado durante a execução. Uma execução remota anterior de `agent.workspace.execute` concluiu em checkout Git isolado; a cadeia remota completa de evento até avatar ainda deve ser verificada.
- `unified-app.js` tinha uma segunda animação chamando `initCityCanvas()` no mesmo canvas do `IsoCityEngine`; ela apagava o mapa a cada frame. A chamada foi removida. O teste Playwright mede pixels de terreno e guarda captura em `grg/qa-results/playwright/city-runtime-job-flow.png`; a captura da VPS está em `vps-city-live.png`. Não reativar os dois renderizadores no mesmo canvas.
- O rodapé da Cidade usa `REGISTRADOS` para o total observado do catálogo; `ONLINE` induzia uma contradição com o estado real dos processos. Os quatro gates obrigatórios passaram antes do deploy. `deploy.bat city` copia os sete arquivos alterados aos dois webroots, recarrega PM2 #17 e verifica paridade ignorando backups forenses.
- A API Platform/Ollama continua configurada, mas o modelo leve ainda falhou em produzir planos válidos para algumas tarefas de programação. Não há prova de operação autônoma ininterrupta 24/7 nem de criação ilimitada de agentes ou máquinas isoladas por agente.
- Prova remota adicional: job `8d0590d0-2412-42ef-8988-5f7c9207f427` (`discovery.scan`, probe Docker) terminou `SUCCEEDED` pela API autenticada; o stream persistido contém `runtime.job.queued`, `runtime.job.started` e `runtime.job.succeeded`. A captura publicada mostrou 19 agentes, terreno visível e rodapé `19 REGISTRADOS`, sem exceções de página. PM2 #16 e #17 ficaram `online`, HTTP 200 nas portas 4410 e 3000 e webroots em paridade excluindo apenas backups. A API Platform está vinculada ao IP público `209.50.241.22:3001` (não ao loopback); `/health` nesse endereço retornou 200 e o contêiner estava `healthy`.

## Agentes cognitivos dinâmicos em 2026-09-23

- `CognitiveHierarchy.createAgent` registra agentes com identidade UUID persistida e escopo de tenant/equipe ou projeto. `seedAgents:false` cria equipe vazia. As rotas autenticadas `GET/POST /api/cognitive/entities/:id/agents` usam as permissões da hierarquia.
- `AgentJobAssignment` aceita `agentId` cognitivo explícito, valida escopo e disponibilidade e preserva a identidade até o `JobEngine`. A delegação do `AgentEcosystem` também encaminha `agentId`. A City projeta agentes cognitivos e marca `WORKING` quando um job atribuído está em execução.
- A tela canônica de Agentes em `grg/public/index.html` permite criar equipe e agente, apresenta contagens observadas e lista os agentes do runtime. O painel legado duplicado permanece oculto. Não exibir capacidade ou eficiência inventada.
- Os gates `architecture-guard` 5/5, `frontend-honesty` 19/19, `frontend-runtime-safety` 5/5 e `e2e-smoke` 1/1 passaram. `e2e-http` passou 19/19 em execução serial; o Playwright local criou equipe e agente pela interface e confirmou a projeção na City.
- Na VPS, a equipe `Fênix Operações` e o agente `Inventário de Infraestrutura` sobreviveram ao reload do PM2. O job Docker `129a4d96-537d-4310-a7a4-8ac959e9d7df`, atribuído a esse agente, terminou `SUCCEEDED` com eventos de fila, início e conclusão persistidos. A tela publicada exibiu 21 agentes e a equipe no seletor, sem exceções de página; captura em `grg/qa-results/playwright/vps-dynamic-agents.png`.
- Essa prova cobre criação persistente, atribuição e execução de um job de descoberta. Ainda falta isolamento de máquina por agente, limites operacionais de escala e prova de disponibilidade contínua 24/7. Não alegar essas capacidades antes de validá-las.

## Workspace de agente e execução concorrente em 2026-09-23

- `AgentWorkspaceExecutor` não registra mais `filesystem.write` e `test.run` globalmente no tenant durante cada job. Essas funções capturavam o workspace do projeto e podiam ser substituídas por um job concorrente de outro projeto. Escrita e testes agora usam capacidades locais da execução, com as verificações de Git, caminho e comandos permitidos. Jobs diretos com escrita e sem testes são rejeitados antes de modificar arquivos.
- O teste de concorrência executou dois agentes em dois repositórios ao mesmo tempo e confirmou os arquivos e testes em seus respectivos projetos. Os testes de runtime e executor passaram 7/7.
- Na VPS, após backup do módulo e reload do PM2 #16, o agente cognitivo `Inventário de Infraestrutura` executou `node --check app_front.js` no projeto Project Kernel `api-platform-live` (`/root/api-gratis`). Job `24e7ba74-d1a4-4a30-af62-40e1ce7a0078` terminou `SUCCEEDED`, `VALIDATED_NO_COMMIT`, zero arquivos alterados e eventos `queued → started → succeeded` persistidos.
- O executor ainda roda comandos de teste no host, e `FENIX_SANDBOX_DRIVER` não está configurado na VPS. A separação de workspace entre jobs reduz colisões de projeto, mas não prova isolamento de máquina por agente. A rota `/api/v2/projects` apresenta um catálogo legado sem workspace; use `/api/fenix/projects` para ler os projetos reais do Project Kernel.

## Resultado de validação e investigação do sandbox em 2026-09-23

- `AgentWorkspaceExecutor` agora lança falha após persistir o relatório quando qualquer teste falha. O `JobEngine` registra `DEAD_LETTER` e publica o evento correspondente em vez de declarar sucesso. O teste local confirmou o estado e o artefato. Na VPS, job `1c39d9bb-c794-4f5e-bc5b-9cde3e330f20` falhou na validação e gerou `queued → started → dead_letter`; job `96e2c83c-2918-43a8-a60f-afa38c350f29` passou e gerou `queued → started → succeeded`, ambos atribuídos ao agente cognitivo e ao projeto `api-platform-live`.
- Correção da observação anterior: existe um Docker rootless ativo no socket `/run/user/1001/docker.sock`, pertencente ao usuário `fenix`; a checagem anterior procurou apenas o UID 1000. `DockerRootlessSandbox` agora permite ao daemon atravessar o diretório temporário aleatório para montar o workspace. O teste isolado avançou até a criação do contêiner, mas o host recusou `--cpus` porque o serviço `user@1001.service` delega somente `memory pids`, sem o controlador `cpu`. Não ativar `FENIX_SANDBOX_DRIVER` nem alegar execução isolada antes de delegar CPU e provar limites, execução e limpeza de contêineres. Além disso, `agent.workspace.execute` ainda executa testes no host; ativar o sandbox genérico não o migra automaticamente.
- `systemctl set-property --runtime` não aceitou alterar `DelegateControllers` nesse serviço; nenhuma alteração de delegação ficou aplicada. A correção persistente exigirá um drop-in de `user@1001.service` e reinício coordenado do serviço de usuário, que hospeda contêineres rootless ativos. A sondagem não deixou contêineres `fenix-sbx` residuais; backend, frontend e API Platform continuaram HTTP 200.
- Em 2026-09-24, o adaptador ganhou modo explícito `FENIX_SANDBOX_CPU_MODE=process-time`: Docker recebe `--ulimit cpu`, calculado de `timeoutMs × cpuUnits`, quando a quota cgroup não está delegada. É limite de tempo de CPU **por processo**, não quota agregada de CPU; o timeout de parede, memória e `pids-limit` continuam ativos. A quota cgroup permanece o padrão. A imagem `node:22-alpine` foi carregada no daemon rootless; uma sonda executou `proof.js` em workspace copiado, sem rede, retornou saída esperada e não deixou `fenix-sbx` ativo. O backend VPS usa `FENIX_SANDBOX_DRIVER=docker-rootless`, socket `/run/user/1001/docker.sock` e modo `process-time`, persistidos no dump PM2. A integração posterior com os testes de agentes está registrada abaixo.

## Validação de agente em contêiner rootless em 2026-09-24

- Com `FENIX_SANDBOX_DRIVER=docker-rootless`, `AgentWorkspaceExecutor` envia `node --check <arquivo relativo>` a um contêiner efêmero usando imagem fixada por SHA-256 (`FENIX_AGENT_TEST_IMAGE`). O snapshot contém somente o arquivo validado, sem `.env` ou resto do projeto; rede desligada, filesystem base somente leitura, memória, processos e tempo de CPU limitados. O resultado do teste identifica `sandbox.driver`. Outros comandos de teste, inclusive `npm test`, falham explicitamente nesse modo; não retornam ao host de forma silenciosa. A escrita Git, o diff e o commit ainda operam no host sob capacidades próprias.
- O teste local verificou o arquivo isolado, ausência de `.env` e bloqueio de `npm test`; suíte de agente e sandbox passou 11/11. Na VPS, o agente cognitivo `Inventário de Infraestrutura` executou `agent.workspace.execute` no projeto `api-platform-live`: job `dc573ce6-00ea-49dc-b8b6-94ca6511c066` terminou `SUCCEEDED`, `VALIDATED_NO_COMMIT`, `testsPassed: true`, `sandboxDriver: docker-rootless` e eventos `queued → started → succeeded`. O job de validação negativa `71740333-c52e-46df-ae68-5503608b7ebc` terminou `DEAD_LETTER` com `queued → started → dead_letter`. Nenhum contêiner `fenix-sbx` residual foi observado.
- Esta prova cobre isolamento do teste de sintaxe em uma máquina efêmera por job. Ainda não cobre toda a execução do agente dentro da máquina, testes com dependências, múltiplas máquinas simultâneas ou quota agregada de CPU. A delegação do controlador de CPU continua pendente para substituir `process-time` por quota cgroup.
- Se `docker run` falhar ou expirar, o adaptador chama `docker rm -f` para remover o contêiner pelo nome de execução antes de apagar o staging local. Um teste com executor Docker simulado confirmou a limpeza preservando o erro original; a sonda rootless real continuou passando após o deploy. A limpeza em encerramento abrupto do próprio backend ainda depende da recuperação posterior de contêineres rotulados.

## IDE canônica conectada ao Project Kernel em 2026-09-23

- A visão `#ide` do shell único carrega `project-ide-live.js`/`.css` e substitui a árvore ilustrativa por um seletor dos projetos persistidos em `/api/fenix/projects`. `api-platform-live` é preferido quando registrado; o operador pode trocar de projeto. A inicialização compartilha uma única carga para impedir que navegação e deep link apaguem o arquivo aberto.
- `GET /api/fenix/projects/:id/tree`, `GET /api/fenix/projects/:id/file?path=...` e `PUT /api/fenix/projects/:id/file` usam o workspace registrado do tenant, caminhos relativos, rejeição de travessia e symlinks, limite de 1 MB, permissão `project:read`/`project:write` e hash de versão para impedir sobrescrita após mudança externa. O salvamento usa `GitWorkspaceWriteCapability`, modifica arquivo existente e deixa a alteração no working tree para validação/revisão; não cria commit nem publica deploy.
- `ProjectKernel.analyze` agora instancia Git READ na raiz do projeto selecionado, permitindo analisar `/root/api-gratis` fora da raiz global do Fênix. A análise escreve um artefato `PROJECT_STATE.md` no banco e não altera o checkout.
- O teste HTTP validou leitura, salvamento, conflito 409, rejeição de caminho externo e análise Git. O Playwright local editou um repositório temporário pela interface, sem exceções; captura em `grg/qa-results/playwright/project-ide-live.png`. Os gates `architecture-guard`, `frontend-honesty`, `frontend-runtime-safety` e `e2e-smoke` passaram (26 testes agregados).
- Na VPS, a sonda autenticada leu a árvore e `app_front.js` da API Platform, bloqueou `../.env`, editou um arquivo temporário pela API, confirmou 409 com hash antigo e removeu o arquivo. A análise real retornou HTTP 202 com HEAD Git; o Playwright publicado mostrou `APIPlatform Live`, 208 arquivos na árvore, `AGENTS.md` aberto e artefato de análise registrado, sem exceções. Captura em `grg/qa-results/playwright/vps-project-ide.png`. `deploy.bat ide` publica somente os três assets da IDE em ambos os webroots e confere paridade.

## Memória e auditoria das edições da IDE em 2026-09-23

- Antes de salvar, a rota da IDE exige `project:write` e `memory:write`. Após a escrita, registra `project.ide.file.saved` na trilha de auditoria, cria/atualiza memória `kind: project` com chave estável por projeto e arquivo, e publica evento no stream do projeto. A memória contém caminho relativo, hashes SHA-256 anterior/atual, tamanho e horário, sem copiar o conteúdo do arquivo. Revisões posteriores incrementam `memoryVersions`.
- A resposta da API inclui IDs de auditoria, memória, versão e evento. Caso a escrita tenha ocorrido e o registro da história falhe, a resposta e a tela informam explicitamente a falha parcial; a IDE não apresenta uma gravação completa fictícia.
- O teste HTTP local comprovou memória, versão, auditoria e evento persistidos após salvar. Na VPS, uma edição de QA no projeto `api-platform-live` retornou `memoryRecorded: true`, memória v1 e busca por projeto encontrou o ID `d2ceb7a5-3cc8-422c-b9fb-6d80dc20168d`. Após reload do PM2 #16, a busca e o histórico da memória ainda responderam com a mesma identidade e uma versão. O arquivo temporário foi removido e a memória de QA recebeu tombstone `DELETED`, preservando o histórico sem aparecer como trabalho ativo.
- Isso comprova persistência de uma edição observada e reinício do backend. Não comprova ingestão de alterações feitas fora da IDE, continuidade 24/7, nem que todos os subsistemas do Fênix já escrevam na mesma memória.

## Guarda das rotas legadas de projeto em 2026-09-24

- `grg/src/api/universal-system-routes.js` agora exige `project:read` para árvore/leitura e `project:write` para edição/reversão em `/api/v2/projects/:id`. A resolução de arquivo exige um arquivo regular existente dentro da raiz real do projeto, bloqueia travessia, prefixos irmãos, symlinks, segmentos protegidos e backups `.fenix-bak`. A edição limita conteúdo a 1 MB e rejeita backup que seja symlink.
- Na VPS, o servidor precisava passar `app` à rota universal para que as permissões funcionassem; isso foi corrigido com backup específico, preservando as outras rotas divergentes da versão local. A sonda autenticada confirmou leitura válida 200, tentativa em diretório irmão 403, `.env` 403 e escrita fora da raiz 403, mantendo o arquivo externo intacto. O teste local `legacy-project-file-guard.test.js` passou; `architecture-guard` e `e2e-smoke` passaram 2/2. Após reload, PM2 backend/frontend ficaram online e `/health` respondeu 200 nas portas 4410, 3000 e 3001 (API Platform no IP público).
- As escritas e reversões legadas agora exigem `memory:write` e registram auditoria, memória versionada e evento no stream do projeto. Projetos cadastrados no Project Kernel recebem memória `project`; o catálogo legado `fenix-os`, sem registro nesse Kernel, recebe memória `episodic` identificada por `legacy-ide-file:fenix-os:<path>`. Na VPS, a sonda autenticada salvou e reverteu um arquivo temporário: ambas as operações responderam 200 com auditoria/evento/memória, a identidade da memória foi a mesma nas versões 1 e 2, o histórico respondeu 200 e o conteúdo original foi restaurado. O arquivo e backup temporários foram removidos.
- A rota `/api/v2/terminal/exec` agora exige `runtime:admin`, limita o comando a 4096 bytes, verifica que o `cwd` inicial pertence à raiz real do Fênix, limita tempo/saída e registra auditoria de início e conclusão/falha usando hash do comando (sem copiar o comando para a auditoria). Na VPS, `pwd` respondeu 200 no diretório esperado com `auditId`; `cwd=/root` respondeu 403. A rota ainda executa shell no host e um comando pode navegar fora do `cwd`; ela é uma capacidade administrativa, **não** isolamento seguro de agente. Não conectá-la à delegação autônoma.

