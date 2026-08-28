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

Enquanto essas decisoes nao forem fechadas, implementar primeiro o fluxo principal:
**login -> selecionar projeto -> conversar -> editar codigo -> executar -> visualizar
preview -> validar resultado**.
