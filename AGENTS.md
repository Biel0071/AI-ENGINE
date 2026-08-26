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

O `npm start` da raiz executa `server.js` -> `platform/http/server.js` na porta
2150 e serve `platform/public`. Esse caminho NAO e o produto canonico e deve ser
tratado como legado de migracao ate ser removido ou convertido em proxy explicito
para o runtime `grg`.

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
- A taxonomia canonica possui 13 destinos e 13 views DOM sem IDs duplicados:
  `command`, `city`, `agents`, `ide`, `operations`, `runtime`, `projects`, `memory`,
  `knowledge`, `mcp`, `browser`, `observability` e `terminal`.
- O HTML quebrado entre editor e painel direito foi reparado.
- Metricas e status plausiveis do shell foram substituidos por valores medidos ou
  estados explicitos `--`, `UNKNOWN`, `EMPTY`, `DEGRADED` e `UNMEASURED`.
- O Developer District usa contratos reais para clone, arvore, leitura, escrita,
  transformacao por IA, move, terminal com polling, preview e pipeline de agentes.
- O runtime fresco em `:4401` publicou `KERNEL_ACTIVE`; o bug 500 de
  `/api/system/boot-status` foi corrigido.
- O fluxo autenticado via API validou login, listagem de 30 arquivos, leitura e
  escrita real. O terminal isolado, executado fora do sandbox, terminou com exit 0.
- O provider QWEN terminou o discovery como `OFFLINE`; OpenAI permanece
  `UNCONFIGURED`. Nenhuma tela deve apresenta-los como disponiveis.
- Os gates `frontend-honesty` (4/4), `frontend-runtime-safety` (5/5),
  `operational-console-ui` (6/6) e `architecture-guard` passaram neste ciclo.
- A sessao visual autenticada no navegador continua pendente; o login publico foi
  renderizado sem erros de console.

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
$env:PORT=4400
..\node.exe src\server.js
```

## 10. Decisoes e pendencias atuais

- Decidido: manter os 12 distritos atuais e acrescentar `operations`, totalizando
  as 13 views canonicas listadas na secao 5.
- Decidido: o comando `npm start`/`npm run dev` da raiz aponta para
  `grg/src/server.js`; o servidor anterior existe apenas como `npm run start:legacy`.
- Pendente: remover fisicamente o controlador legado da AI City atualmente isolado
  em comentario ao final de `unified-app.js`; `iso-city.js` e a implementacao ativa.
- Pendente: substituir os adaptadores in-memory por Postgres/Redis/Qdrant configurados
  no ambiente de producao e comprovar persistencia entre reinicios.
- Pendente: configurar ou restaurar pelo menos um provider de IA real e executar uma
  chamada de inferencia com provider, modelo, latencia e tokens registrados.
- Pendente: concluir o E2E visual autenticado em desktop e breakpoint menor.

Enquanto essas decisoes nao forem fechadas, implementar primeiro o fluxo principal:
**login -> selecionar projeto -> conversar -> editar codigo -> executar -> visualizar
preview -> validar resultado**.
