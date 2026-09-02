# FÊNIX — auditoria real do frontend e fila de estabilização

## Validação adicional — 2026-09-01 17:02 BRT

- URL remota `http://209.50.241.22:4400/app` respondeu `HTTP 200` (42.266 bytes).
- Suíte determinística local: `11/11` testes aprovados, incluindo as `14` views reais e as `5` áreas funcionais.
- Mapa regenerado: `14` telas, `14` contratos backend declarados e `29` endpoints relacionados.
- Plano de QA regenerado com navegação, scroll e cliques somente de leitura para as 14 telas.
- QA remoto sem sessão autenticada parou honestamente em `BLOCKED_AUTH`: `0/14` navegações, `0` erros fatais; nenhum login ou estado foi inventado.
- Auditor local sem serviço em `127.0.0.1:4400` ficou `NOT_RUN` por `ERR_CONNECTION_REFUSED`; evidência em `grg/qa-results/frontend-full-audit.json`.

## Fila de melhoria por tela

Foi criada a fila determinística `grg/qa-results/screen-improvement-queue.json`, com uma atividade por cada uma das 14 telas. Ela separa evidência estática, contrato backend, referência de asset e validação de navegação. Estado atual: `P0=1` (Command Center), `P1=11` (contratos ainda não encontrados nos assets estáticos), `P2=2`; todas as 14 permanecem `BLOCKED_AUTH` para QA visual remoto.

O mapa foi corrigido para usar por padrão o shell canônico atual (`public/index.html` e `public/`), em vez do snapshot histórico. A fila agora não transforma ausência de string de endpoint em falso P1: isso é evidência de integração a validar, não prova de função quebrada. Estado recalculado: `P0=1`, `P1=0`, `P2=13`, com `13` telas contendo endpoints cuja chamada é dinâmica e ainda requer QA autenticado.

O script reproduzível é `scripts/build-screen-improvement-queue.js`, disponível como `npm run qa:screen-queue`. Cada item executa a mesma sequência: abrir hash, confirmar view, scroll, clicar apenas controles seguros e registrar o próximo contrato que precisa ser validado. Nenhum job mutável, mock ou estado fabricado é usado.

## Consolidação funcional do shell — 2026-09-01

- O shell agora apresenta cinco grupos recolhíveis: `COMMAND`, `BUILD`, `INTELLIGENCE`, `INFRASTRUCTURE` e `VALIDATION`.
- As 14 views/hash antigos foram preservados: o agrupamento não remove nem duplica telas.
- Cada grupo pode ser expandido/recolhido pelo próprio cabeçalho, reduzindo a sobreposição visual da barra lateral.
- Alterações aplicadas na VPS FÊNIX; validação remota: `HTTP 200`, 5 grupos, 5 cabeçalhos e 14 views no HTML servido com cache-busting `cb=groups3`.
- Testes após a alteração: `12/12` aprovados.

## Correção de runtime identificada pela suíte completa

- O teste do Agent Runtime revelou que o limite de tamanho do Job resultava em um marcador que descartava `provider`, `model` e `result`, quebrando a leitura operacional do job. O marcador agora preserva esses campos resumidos e o total de tool calls.
- A função `resolveCanonicalPort` foi exportada e cobre `FENIX_PORT`, `GRG_PORT` e fallback seguro para `4400`.
- Validação focada: `4/4` testes aprovados.
- A sincronização desses dois arquivos foi concluída na VPS. Após a recuperação, `index.html` respondeu `HTTP 200` com 5 grupos e 14 views; `/api/fenix/missions` respondeu `401` sem token, confirmando que a proteção da rota permanece ativa.

## Correção de autenticação — 2026-09-01

- Causa raiz encontrada: `verifyPassword()` estava em bypass e retornava `true` para qualquer senha.
- Correção: validação real `scrypt` com comparação `timingSafeEqual`; removido também o bypass de credenciais mestras legadas.
- Testes de autenticação: `7/7` aprovados (senha correta, errada, sessão, logout e ausência de texto plano).
- Correção sincronizada na VPS; após o restart, o endpoint voltou a responder `HTTP 200`.

Data: 2026-09-01  
Ambiente auditado: `http://209.50.241.22:4400/app?#ide`  
Método: DOM real, troca de navegação, console do navegador e correlação com código/API.

## Resultado executivo

**BLOCKED — frontend ainda não está estável para uso completo.** A navegação básica existe e o `window.runChat` está ligado ao formulário principal, mas a tela IDE carrega um conjunto duplicado de scripts legados, há erro JavaScript fatal e o bootstrap consulta endpoints `/api/dev/*` que retornam erro. A tela auditada não pode ser declarada pronta nem 100% carregada.

## Inventário de telas encontradas

| Caminho/hash | View DOM | Estado observado | Funcionalidades/caminhos identificados |
|---|---|---|---|
| `#command` | `view-command` | existe, não validado visualmente nesta sessão | Command Center, formulário principal, prompts |
| `#city` | `view-city` | existe; runtime cockpit injeta conteúdo | AI City, workers, métricas e visão de runtime |
| `#agents` | `view-agents` | existe | painel de agentes |
| `#ide` | `view-ide` | **visível e carregada** | chat, agents, jobs, memória, grafos; editor visual/código/split/preview/inspect; salvar |
| `#operations` | `view-operations` | existe | missões, jobs, novo programa/decomposição |
| `#runtime` | `view-runtime` | existe | executar tick, health, serviços, workers |
| `#project` | `view-project` | existe | Overview, Screens, Components, APIs, Backend, Database, Workers, Queues, AI |
| `#projects` | `view-projects` | existe | projetos acoplados, filtros e grafo do workspace |
| `#memory` | `view-memory` | validada no navegador | estado/resumo de memória |
| `#knowledge` | `view-knowledge` | existe | manifesto KOS e knowledge graph |
| `#mcp` | `view-mcp` | existe | MCP Hub, conectores e roteamento de IA |
| `#browser` | `view-browser` | existe | Browser QA/auditoria visual |
| `#observability` | `view-observability` | existe | amostra, métricas e séries |
| `#terminal` | `view-terminal` | existe | clone, arquivo, terminal isolado e preview |

## Evidências reais

- Foram encontrados 14 botões de navegação com `data-view`: command, city, agents, ide, operations, runtime, project, projects, memory, knowledge, mcp, browser, observability e terminal.
- Foram encontradas 10 views DOM, incluindo IDE, City, Project, Projects, Operations, Runtime, Memory, Knowledge, MCP, Browser, Observability e Terminal; algumas não são ativadas/validáveis porque o boot falha durante a inicialização.
- `masterCmdForm` existe e reporta `data-fenix-command-bound=true`.
- O código contém `window.runChat`, `POST /api/fenix/missions`, Project Mirror, edição de arquivo, transform-file e aplicação visual.
- A API contém rotas reais de descoberta frontend: scan, screens, navigation-graph, audit, correlate, click-test, repair e design-system.
- A API contém rotas reais de edição: `/api/dev/fs/file`, `/api/dev/fs/move`, `/api/dev/ai/transform-file`, `/api/v2/visual/mutate` e `/api/v2/vision/apply-visual-change`.
- O grafo persistente `graphify-out/graph.json` foi consultado para correlacionar `mission-kernel`, `job-engine`, `ai-gateway`, `memory-engine`, `repository-intelligence`, `software-factory` e `frontend-agent`.
- O smoke test reutilizável foi criado em `grg/scripts/frontend-navigation-qa.js`; ele gera JSON e screenshots por submenu, sem mocks e sem submeter missões.
- Execução standalone contra a VPS redirecionou para `GRG-login`; sem sessão autenticada o resultado foi `navTotal=0`, com `fenix-command-bridge.js` recusado por MIME vazio/404. Isso confirma que a validação precisa preservar uma sessão autenticada ou corrigir a publicação do asset.
- Correção aplicada na publicação: o container ativo é read-only e não monta novos arquivos; o bridge foi incorporado ao asset persistente já montado `unified-app.js`, e o índice passou a carregá-lo por `unified-app.js?v=bridge1`. Validação HTTP real: `index=200`, `js=200`, `Content-Type=text/javascript`, assinatura do bridge presente.
- Tentativa seguinte: a correção local do `ide-enhancer.js` passou `node --check`; porém a resposta HTTP ainda serve um índice diferente do arquivo esperado (continua referenciando `/fenix-command-bridge.js`), então a alteração de compatibilidade ainda não está comprovada no container. Permanece P0 até localizar a origem efetivamente montada pelo serviço.
- Após reiniciar somente `grg-fenix-enterprise-api-1`, os hashes do índice no host e no container coincidiram. A referência 404 foi removida, o compat layer do IDE está servido, e a validação HTTP passou: `/app` 200, `missingRef=false`, `compat=true`; `/unified-app.js` 200, MIME JavaScript e assinatura do bridge presente.
- Validação posterior: `/app` continua 200 e contém `fenix-ide-dom-compat`; o healthcheck HTTP não respondeu dentro de 8 segundos, então não foi marcado como saudável. O runtime precisa ser investigado antes de declarar o boot 100%.

Foi criado `qa/frontend-screen-manifest.json` e `scripts/verify-screen-manifest.js`. O guard local executou e falhou honestamente (`expected=14`, `nav=0`, `viewIds=0`) porque a cópia local atual de `public/index.html` é uma versão reduzida com apenas seis referências antigas; isso evidencia divergência entre a base local e o índice ativo, e impede sincronização/merge seguro sem escolher uma fonte canônica.

O inventário estático `scripts/inventory-screen-controls.js` também foi executado no snapshot ativo: encontrou 14/14 views, 39 botões, 4 formulários e 1 endpoint literal no HTML. A maior parte das ações é ligada por JavaScript, não por HTML; por isso o próximo teste obrigatório é runtime/browser, não apenas parsing. O inventário completo está em `qa/remote-snapshot/screen-control-inventory.json`.

Foi baixado um snapshot somente-leitura do índice ativo para `qa/remote-snapshot/index.html` e verificado contra o manifesto: `expected=14`, `nav=14`, `viewIds=14`, `missingNav=[]`, `missingView=[]`, `duplicateNav=[]`, `pass=true`. Portanto, para esta fase, o índice remoto ativo é a fonte canônica de telas; a base local reduzida não deve ser promovida por cima dele.

## Consolidação funcional proposta em cinco áreas

As 14 entradas permanecem como caminhos compatíveis; a consolidação é de navegação e responsabilidade, não remoção de funcionalidade:

1. **Command** — Command, Operations, Runtime: prompt, missão, jobs, workers, pausa/resume, saúde e eventos.
2. **Build** — IDE, Project, Projects: Project Mirror, arquivos, Git/branch, preview, edição por prompt e edição visual.
3. **Intelligence** — Agents, Memory, Knowledge: agentes/subagentes, skills, memória de engenharia/visual e grafo.
4. **Infrastructure** — MCP Hub, Observability: conectores, providers, traces, métricas e evidências.
5. **Validation** — Browser QA, AI City: descoberta de telas, click-test, scroll, runtime visual e auditoria/reparo.

O aceite dessa consolidação exige que cada caminho antigo continue abrindo a área correspondente e que a API da área seja a mesma já existente; a fila FE-004/FE-008 deve validar isso automaticamente.

## Falhas bloqueadoras observadas

1. **Boot JavaScript:** `ReferenceError: $ is not defined` em `/ide-enhancer.js:216`. Causa provável: o script usa jQuery sem dependência carregada; esse erro interrompe a inicialização da camada IDE.
2. **Duplicação de assets:** o HTML carrega duas versões de `unified-app.js`, duas de `live-runtime.js`, duas de `ide-enhancer.js` e múltiplos módulos de cockpit. Isso explica comportamento de tela duplicado, handlers concorrentes e regressões visuais.
3. **Contrato de endpoints:** `fenix-bootstrap.js` registra erros reais em `/api/dev/projects`, `/api/dev/jobs`, `/api/dev/missions`, `/api/learning/procedural`, `/api/dev/connections`, `/api/dev/git/status` e `/api/agents/panel`. A tela mostra “CONNECTED”, mas essas leituras não estão comprovadas como saudáveis.
4. **Estado visual:** IDE carrega texto/editor, porém o workspace inicialmente mostra `Loading Workspace...`; a auditoria não comprovou carregamento até 100%, projeto Git associado, telas do Project Mirror ou preview renderizado.
5. **Validação incompleta:** ainda não houve prova autorizada nesta auditoria de uma submissão real Command → missionId → Job, nem de escrita de arquivo, teste, diff e commit.

## Fila de melhoria priorizada

### P0 — estabilização antes de novas telas

- FE-001: remover duplicação de scripts e definir uma única ordem de boot.
- FE-002: corrigir `/ide-enhancer.js:216` para não depender de `$` inexistente; validar carregamento sem erro fatal.
- FE-003: fechar contrato `/api/dev/*` ou alterar o bootstrap para as rotas reais existentes, com estados de erro honestos.
- FE-004: garantir roteador único: um clique ativa exatamente uma view e um hash; nenhum cockpit pode sobrescrever a view selecionada.
- FE-005: indicador de carregamento por etapas até 100%, com falha explícita por recurso.
- FE-005a: publicar `fenix-command-bridge.js` com MIME `application/javascript` e validar que não há 404/redirect do asset.

### P1 — sincronização projeto/Git/Project Mirror

- FE-006: ligar `projects → project mirror → source/files/screens` a um projeto real, sem caminho Windows inválido no servidor.
- FE-007: mostrar branch, status Git, diff e checkpoint do workspace acoplado.
- FE-008: validar cada tela descoberta com navigation graph, audit e click-test; registrar órfãs e botões mortos.

### P1 — edição visual e por prompt

- FE-009: garantir seleção de qualquer elemento no preview e abrir inspector com arquivo/linha/estilo correspondente.
- FE-010: transformar alteração visual em proposta/diff auditável usando `/api/v2/vision/apply-visual-change`.
- FE-011: garantir prompt → job → agente → workspace → teste, com pause/resume e evidências no painel Jobs.

### P2 — memória e evolução sem regressão

- FE-012: persistir visual memory, engineering memory e project state após cada auditoria/correção.
- FE-013: checkpoint antes de cada mutação e rollback explícito.
- FE-014: só permitir commit local após build/test/diff passarem; push/merge/deploy continuam manuais.

## Artefato de teste

Executar a partir de `grg`:

```powershell
$env:FENIX_URL='http://host:4400/app?#ide'
$env:FENIX_USER='usuario-de-teste'
$env:FENIX_PASSWORD='senha-fornecida-no-ambiente'
node scripts/frontend-navigation-qa.js
```

O script grava `qa-results/frontend-navigation-qa.json` e uma captura por submenu. Sem `FENIX_USER`/`FENIX_PASSWORD`, ele permanece somente leitura e relata o bloqueio de autenticação.

## Critério de aceite final

Só marcar COMPLETED quando houver evidência de: boot sem erros; todas as views navegáveis; projeto Git e branch mostrados; Command Center criando missionId; jobs e subjobs observáveis; agente/provider real; workspace write; teste real; diff; commit local auditado; pause/resume/recovery; Project Mirror renderizando screens; edição por prompt e por seleção visual; memória persistida.

## Atualização runtime — 2026-09-01

Auditoria autenticada no navegador: **14/14** submenus trocaram para a `view-*` correta, **14/14** atualizaram o hash e **14/14** marcaram o submenu ativo. O roteador está validado.

O boot ainda registra falhas reais de hidratação em `/api/dev/git/status`, `/api/skills`, `/api/dev/projects`, `/api/dev/jobs`, `/api/dev/missions`, `/api/runtime/jobs`, `/project-mirror` e endpoints relacionados. Essas falhas continuam classificadas como bloqueio de dados/backend; não foram convertidas em estado ONLINE ou pronto.

## Atualização de sincronização de assets

Os mounts persistentes foram adicionados ao `docker-compose.enterprise.yml` para `runtime-cockpit.js`, `fenix-visual-ide.js` e `ide-enhancer.js`. O compose passou na validação (`CONFIG_OK`) e somente a API foi recriada. O container confirmou os três destinos em `/app/public` e está `running healthy`.

Validação HTTP dos assets ativos: `runtime-cockpit.js` 200, `fenix-visual-ide.js` 200, `ide-enhancer.js` 200 e `unified-app.js` 200, todos com `text/javascript`. O reload automatizado da aba foi bloqueado pela política de URL do navegador nesta sessão; portanto a validação visual pós-recreate permanece pendente.

## Atualização pós-mount

Após a recriação, `/app` respondeu 200, os assets `runtime-cockpit.js` e `fenix-visual-ide.js` responderam 200, e `/api/system/boot-status` respondeu `{"ok":true,"status":"KERNEL_ACTIVE"}`. A sessão do navegador permaneceu com erro de acesso e a política bloqueou o reload automatizado; a prova visual pós-mount ainda requer recarga manual da aba.

O cockpit foi então alinhado às rotas registradas: projetos/jobs/missões passaram para `/api/fenix/*`; aprendizagem para `/api/memory/search`; conexões para `/api/connectors`; git para `/api/project-mirror`; swarm para `/api/agents/panel`. O asset servido `runtime-cockpit.js?v=12` foi validado 200 e contém esses caminhos. A próxima sessão deve verificar a redução dos erros no console.
## Validação pós-correção — 2026-09-01

- [PASS] Serviço remoto: container `grg-fenix-enterprise-api-1` em `running healthy`.
- [PASS] `/app?cb=final1`: HTTP 200.
- [PASS] `/api/system/boot-status`: HTTP 200.
- [PASS] Índice remoto após deduplicação: referência estática a `unified-app.js` removida; o carregamento fica sob responsabilidade do bootstrap dinâmico.
- [PASS] Compose remoto validado antes da recriação do serviço.
- [PASS] Os três assets corrigidos estão montados no container: `runtime-cockpit.js`, `fenix-visual-ide.js` e `ide-enhancer.js`.
- [PASS] Sintaxe Node dos três assets corrigidos.
- [PASS] Teste operacional local do Project Mirror: 3/3.
- [PASS] Inventário do snapshot remoto: 14/14 telas encontradas, 39 botões, 4 formulários e 1 endpoint declarado.
- [PASS] Manifesto remoto: 14/14 navegações e views, sem duplicatas.

### Bloqueio atual de validação visual

- COMPONENT: QA visual automatizado da aba já aberta.
- ERROR: a sequência de 14 cliques excedeu o timeout do controle do navegador.
- ROOT CAUSE: latência/timeout do canal de automação durante a repetição completa; não há evidência suficiente para atribuir o problema ao frontend.
- EVIDENCE: a aba foi localizada, mas duas tentativas de sequência completa terminaram por timeout após o reload.
- FIX ATTEMPT: reload pós-deduplicação e início da navegação sem repetir cliques cegamente.
- VALIDATION: pendente; não declarar PASS visual até executar a sequência com uma sessão de navegador estável.

## Auditoria de cobertura de funções — atualização

O inventário foi ajustado para distinguir o que está declarado no HTML do que é carregado pelos assets JavaScript. Resultado atual do snapshot: 14 telas, 39 botões, 4 formulários, 22 endpoints esperados pelo manifesto. O HTML declara apenas 1 endpoint diretamente; isso é esperado para uma SPA, mas a cobertura de endpoints precisa continuar sendo verificada contra todos os assets servidos, não somente contra o HTML.

O script reutilizável agora aceita `FENIX_ASSET_DIR` e registra, por tela, endpoints declarados, endpoints encontrados nos assets e endpoints esperados ausentes. Isso cria uma base rápida para o loop de QA e evita confundir tela existente com função realmente conectada.

Última validação local: sintaxe dos scripts OK; testes Project Mirror 3/3.

## Execução do loop rápido — 2026-09-01 14:38 UTC

O script `frontend-navigation-qa.js` foi executado contra a URL remota sem credenciais embutidas. Resultado: a aplicação redirecionou para `GRG-login` antes de renderizar os 14 menus (`navTotal=0`). O script foi ajustado para registrar explicitamente esse caso como `BLOCKED/authentication`, sem contar a tela de login como falha funcional das telas protegidas.

Isso confirma que a auditoria standalone não pode validar o frontend autenticado sem uma sessão autorizada. O snapshot remoto e a aba autenticada continuam sendo as fontes apropriadas para validar as rotas; não serão usados mocks nem credenciais gravadas no repositório.

O loop foi otimizado para uso recorrente: `FENIX_QA_TIMEOUT` limita o tempo por ação e `FENIX_QA_MAX_CONTROLS` limita controles somente-leitura por tela. Em uma execução sem autenticação, o script encerra imediatamente após registrar o bloqueio, em vez de desperdiçar tempo tentando clicar na página de login.

## Sincronização frontend ↔ backend

Foi feita uma verificação estática cruzando todos os endpoints do manifesto com `src/`. Resultado: os 23 endpoints atualmente mapeados têm implementação encontrada no backend, incluindo `/api/v2/city/state`, APIs de agentes, Project Mirror, memória, knowledge, providers, frontend-reality, terminal e as séries de observabilidade. O endpoint de observabilidade foi corrigido no manifesto de `/api/v2/observability/series` para `/api/observability/series` e passou a incluir também `/api/observability/metrics`.

Conclusão parcial: o backend possui os contratos necessários; a lacuna restante é confirmar, com sessão autenticada, quais telas realmente chamam cada contrato no browser e corrigir as que apenas exibem estado agregado.

Foi criado `scripts/build-screen-function-map.js`, que gera `qa/screen-function-map.json`. A execução atual produziu:

- 14 telas mapeadas em 5 domínios;
- 29 contratos de endpoint;
- 29/29 endpoints encontrados no backend;
- 14/14 telas com status `backend-ready`;
- 11 referências de endpoint diretamente localizadas nos assets publicados.

As referências ausentes dos assets não foram tratadas como erro: algumas telas consomem estado agregado pelo runtime. O mapa deixa essa diferença explícita para a próxima validação autenticada.

O `frontend-navigation-qa.js` também passou a registrar o resultado por domínio agregado (`command`, `build`, `intelligence`, `infrastructure`, `validation`), mantendo simultaneamente a evidência individual das 14 telas. A execução sem sessão continua encerrando em `GRG-login`, conforme esperado e registrado como bloqueio de autenticação.

### Sincronização do shell frontend

Foi confirmada a causa das telas que “sumiam” localmente: `public/index.html` tinha somente 3 views e 6 menus, além de carregar scripts de forma duplicada. O shell foi sincronizado com o índice canônico capturado da VPS, preservando backup em `public/index.html.before-canonical-sync-20260901`. Validação do shell após a sincronização: 14/14 menus, 14/14 views, nenhuma navegação duplicada. O teste `serves dashboard html` passou.

Na conferência de assets, `runtime-cockpit.js`, `ide-enhancer.js` e os demais assets estáveis coincidiram; `fenix-bootstrap.js`, `unified-app.js` e `live-runtime.js` divergiam da VPS. Esses três foram alinhados ao snapshot remoto e cada versão anterior foi preservada com sufixo `.before-remote-sync-20260901`. Depois da sincronização: sintaxe dos três assets OK, manifesto 14/14 e regressão funcional 5/5.

Foi adicionado `test/screen-shell-assets.test.js`, que protege o shell contra desaparecimento de views, menus duplicados e assets dinâmicos ausentes ou carregados duas vezes. Resultado combinado dos testes de shell e mapa funcional: 4/4 aprovados.

O `package.json` agora expõe comandos operacionais: `qa:screen-map`, `qa:screen-contracts`, `qa:frontend` e `qa:frontend:fast`. O modo rápido aceita `--fast` e reduz o limite de ações somente-leitura por tela, mantendo a execução sem mocks e sem submissões mutáveis.

Foi criado o orquestrador `qa:frontend:all`, que executa mapa, probe de contratos e QA visual rápido, cada etapa com timeout próprio, e grava `qa-results/frontend-full-audit.json`. Na primeira execução remota, mapa e contratos terminaram; o passo visual autenticado excedeu o limite e foi registrado como timeout, sem transformar a auditoria parcial em aprovação.

Uma execução sem `FENIX_URL` confirmou que o comando usa localhost por padrão e falha com `ERR_CONNECTION_REFUSED` quando não há API local. Para auditar a VPS, a URL deve ser fornecida no ambiente; nenhuma URL remota foi embutida no package.

O QA visual recebeu também timeout explícito de navegação (`FENIX_QA_NAV_TIMEOUT`, padrão 8 s), para não ficar preso no carregamento inicial. A execução direta contra a VPS encerra em cerca de 7 s e registra autenticação ausente; o orquestrador ainda pode atingir seu limite próprio quando o processo de navegador não encerra sob `spawnSync`, mantendo o resultado como timeout em vez de PASS.

A suíte completa de Project Mirror/shell foi executada após a sincronização. Havia 5 falhas aparentes causadas apenas por `EPERM` na limpeza de diretórios temporários do Windows; a limpeza foi tornada tolerante a `EPERM`/`EBUSY`, sem capturar falhas de asserção. Resultado final: 15/15 testes aprovados em 1,03 s.

Validação HTTP pós-sincronização na VPS: `/app` e os 8 assets do bootstrap retornaram HTTP 200 com MIME JavaScript/HTML correto. O shell remoto está entregando `fenix-bootstrap`, `runtime-cockpit`, `unified-app`, `live-runtime`, `ide-enhancer`, `cockpit-app`, `visual-inspector` e `jobs-app`.

### QA visual autenticado — evidência real

A aba autenticada foi localizada e inspecionada. O DOM visível confirmou `runtime DEGRADED`, usuário `Admin (Bypass)`, os 14 menus laterais e a tela AI CITY com runtime, providers, andares, jobs, eventos, memória e QA Center. A navegação foi executada em cinco blocos para evitar timeout do canal: `command`, `city`, `agents`, `ide`, `operations`, `runtime`, `project`, `projects`, `memory`, `knowledge`, `mcp`, `browser`, `observability` e `terminal` retornaram `ok=true`, com hash correspondente e uma única view visível por vez. Após a navegação, não foram registrados erros JavaScript recentes (`[]`).

Foi adicionado `test/screen-function-map.test.js` como proteção contra regressão. Resultado: 2/2 testes aprovados, garantindo 14 telas, 5 domínios, cobertura integral do manifesto e evidência backend para todos os contratos.

## Probe HTTP real e recuperação do serviço

O probe somente-leitura foi executado contra a VPS com 23 contratos. `/api/fenix/jobs` respondeu 404 para GET porque o contrato de criação/controle usa métodos específicos; os demais requests entraram no servidor, mas vários excederam o timeout sem autenticação. O log remoto confirmou que as rotas foram recebidas e que o storage persistente está ativo (`postgresql`, `redis`, `qdrant`). Também confirmou o AI Platform configurado em `209.50.241.215:3000`.

O serviço API foi reiniciado uma vez para recuperação. Após o restart: container `running starting`, `/app` respondeu 200 imediatamente e o processo completou o boot. A sonda `/health` continua lenta porque executa probes reais de provider/vector store; isso é uma pendência de responsividade do health endpoint, não foi mascarado como `PASS`.

Foi implementado localmente em `src/server.js` um deadline explícito para `/health`: 8 s em produção e 30 s fora de produção. Se probes reais excederem o limite, a resposta será `probe_timeout`/degradada, sem afirmar `READY`. `node --check src/server.js` passou e o teste de health HTTP passou; a alteração ainda não foi publicada na VPS porque a suíte local também expôs uma falha independente no teste de dashboard e não seria seguro misturar as duas mudanças em um deploy.

### Correção do dashboard local

A falha do teste `serves dashboard html` foi localizada: `public/index.html` estava codificado em UTF-16 com BOM, causando texto corrompido e falhas na detecção do shell. O arquivo foi convertido para UTF-8 sem BOM. Validação posterior: `serves dashboard html` passou, junto com `health endpoint responds`, configuração OIDC fora de produção e rejeição de API sem autenticação.

Também foi removido um retorno artificial inalcançável de `src/infrastructure/health.js` que reportava `simulated_failure`; o monitor volta a consultar o boot manager real. Validação: `enterprise-foundation.test.js` e `compose-runtime-env.test.js`, 17/17 testes aprovados.

## Validação dos motores que alimentam as telas

- [PASS] Agent Runtime chama provider configurado e entrega o plano de tools ao executor.
- [PASS] Agent Job Assignment entrega contexto do Project Kernel ao job.
- [PASS] Workspace Executor escreve sob policy, valida e cria commit auditado em teste.
- [PASS] Engineering Memory promove somente evidências validadas e permite reuso.
- [PASS] Mission/Job HTTP contract persiste DAG, eventos, checkpoints e controles pause/resume/cancel.
- [PASS] SSE envia evento de conexão.
- [PASS] Project Kernel vincula missão real e recupera job stale.

Esses testes foram executados no ambiente local com os drivers de fallback explicitamente reportados como `in-memory`, `memory` e `local`; portanto comprovam os contratos e o ciclo do motor, mas não substituem a prova autenticada contra os serviços persistentes da VPS.

Revalidação remota posterior confirmou: container `running healthy`, `/app` HTTP 200 em 0,4 s, mas `/health` excedeu 12 s. Os logs continuam mostrando mutações do `PostgresStore` entre 314–484 ms. A API não está indisponível; o health agregado permanece lento por probes reais e precisa do patch cirúrgico na versão remota correspondente.

### Patch remoto aplicado

Foi criado backup remoto `src/server.js.before-health-deadline-20260901`, aplicado o patch cirúrgico sobre a versão remota divergente e validada a sintaxe com `node --check`. Após o restart controlado: container `running healthy`, `/app` HTTP 200 em 0,10 s e `/health` HTTP 503 em 9,39 s com degradação explícita por timeout. O resultado é intencional: o sistema permanece acessível e não afirma saúde completa enquanto os probes reais não terminam.

Nova leitura do corpo confirmou o contrato: `status=probe_timeout`, `boot.status=KERNEL_ACTIVE`, `activation=COMPLETED`, sem erro de boot. Os logs do mesmo período mostram mutações lentas do PostgresStore até 600 ms; permanece necessária uma investigação específica dos probes/telemetria para reduzir o tempo do health profundo.

### Correção encontrada no QA autenticado

Durante o teste real da Cidade, foi identificado que o runtime chamava `/api/memory`, rota inexistente. A API canônica expõe `/api/fenix/memory/search`. `runtime-cockpit.js` foi corrigido, validado com `node --check`, enviado para a VPS com backup `runtime-cockpit.js.before-memory-route-20260901` e validado com `node --check` remoto. O reload com cache-busting da aba excedeu o timeout antes de permitir uma nova leitura limpa; a correção permanece pendente de confirmação visual pós-cache.
Nova sessão com cache-busting confirmou que a correção foi carregada: a tela `FENIX AI CITY` aparece e não há mais referência antiga a `/api/memory` no asset ativo. O bootstrap agora chama `/api/fenix/memory/search?q=&limit=20`. Persistem erros `Object` nas respostas de `/api/fenix/missions`, `/api/fenix/projects`, `/api/fenix/jobs` e `/api/fenix/memory/search`; os logs do servidor confirmam que todas essas rotas são recebidas. O sandbox de avaliação do navegador não expõe `fetch`, então o status HTTP individual dessas respostas permanece pendente de captura pelo painel Network/QA.

### Sincronização remota do contrato `/api/fenix/*`

O diagnóstico direto na VPS encontrou a causa raiz dos `404`: o `server.js` montado no container era uma versão anterior e não continha as rotas `/api/fenix/missions`, `/api/fenix/jobs`, `/api/fenix/projects` e `/api/fenix/memory/search`, embora o frontend já as utilizasse. Foi preservado backup remoto `src.before-20260901-fenix-api-sync`, sincronizado o `server.js` com as rotas atuais e incluídos os módulos de runtime necessários. Também foi corrigido o valor inválido de `FENIX_AI_ROUTES_JSON` na recriação do container.

Validação remota atual: serviço inicia, `GET /api/fenix/missions` responde `401 not authenticated` com `requestId` quando não há sessão, comprovando que a rota existe e que a proteção de autenticação está ativa. A prova autenticada pelo navegador e a execução Qwen→tool→workspace continuam BLOCKED até uma sessão válida ser estabelecida novamente; não foram fabricados estados de sucesso.

### Loop determinístico de QA das 14 telas

Foi criado `qa-results/screen-qa-plan.json` por `scripts/generate-screen-qa-plan.js`, com 5 domínios, 14 telas e atividades read-only para cada tela: navegação, assert da view visível, scroll e clique limitado em controles seguros. O plano não envia missões, não cria jobs e não usa dados mock; ele serve como roteiro rápido e reprodutível para o executor de QA existente.

Validação local: `npm run qa:screen-plan`, `npm run qa:screen-map` e 19 testes de Project Mirror/shell/map passaram. O mapa atual confirma 14/14 telas com backend evidence, 29 contratos e 5 áreas funcionais.

### QA remoto sem sessão

`npm run qa:frontend:fast` contra `http://209.50.241.22:4400/app` confirmou o redirecionamento real para `GRG-login`; portanto a auditoria standalone não atravessou as 14 views. O script agora classifica os erros de identidade/backend decorrentes desse bloqueio como `expectedAuthErrors`, mantendo `fatalConsoleErrors` separado, sem transformar autenticação ausente em falso PASS.

### Navegação agrupada publicada

O shell foi reorganizado visualmente em cinco grupos (`COMMAND`, `BUILD`, `INTELLIGENCE`, `INFRASTRUCTURE` e `VALIDATION`) sem remover nem duplicar rotas. A publicação remota foi feita com backups `index.html.before-domain-groups-20260901` e `unified.css.before-domain-groups-20260901`. Validação no HTML servido: 14 `data-view` e 14 `view-*` distintos.

O orquestrador `qa:frontend:all` agora executa também a geração do plano de tela. Foi corrigido um falso positivo: quando a auditoria standalone é bloqueada no login, `frontend-navigation-qa.js` retorna código 2 e o relatório geral fica `pass: false`. Execução remota atual: mapa, plano e contratos passaram; navegação visual ficou explicitamente pendente por autenticação.

Foi acrescentado `build-screen-readiness-report.js` e o comando `npm run qa:screen-readiness`. Ele combina mapa estático, contratos HTTP e navegação real por tela, classificando cada tela como `PASS`, `BLOCKED_AUTH` ou `NOT_RUN`; não promove contrato estático a funcionamento visual. A execução remota atual mantém o resultado geral `pass: false` por autenticação ausente, enquanto registra 14 telas e 23 endpoints sem mocks.

Foi adicionado `test/screen-readiness-report.test.js`; a suíte específica passou com 6/6 testes. O HTML remoto servido com cache-busting `groups2` confirmou 5 grupos, 14 navegações, 14 views e um bootstrap `boot3`, provando que a consolidação foi publicada sem perda de caminhos.

### Honestidade do auditor visual e do frontend

Foi removido do frontend o estado hardcoded `RUNTIME ONLINE` e o fallback numérico `99.8`; os slots agora permanecem sem medição até receberem resposta real. O auditor de telas agora retorna `NOT_RUN_NO_SCREENS` e `auditPass=false` quando o projeto não possui telas, e a análise visual não fabrica componentes quando o motor não está disponível. A VPS recebeu esses arquivos com backups próprios; após o restart controlado, `/app?cb=honesty2` respondeu HTTP 200.

Consulta pública atual da VPS: AI City está `HEALTHY`, com 19 agentes registrados porém 0 ativos, 0 projetos e 0 telas descobertas. Isso é estado real de ambiente vazio, não aprovação de auditoria; o relatório de prontidão mantém a condição como não executada.

### Auditoria do próprio FÊNIX e proteção contra crash

O endpoint de descoberta passou a usar `fenix_enterprise` somente quando uma varredura explícita é solicitada; a listagem/auditoria não dispara varredura pesada automaticamente. Também foi corrigido o tratamento de erro HTTP para não tentar escrever uma segunda resposta quando os headers já foram enviados. A versão foi publicada na VPS e `/app?cb=stable3` voltou a responder HTTP 200 após o reinício.

Uma tentativa de auto-scan do diretório `public/` confirmou que a descoberta síncrona ainda é pesada demais para ser executada na requisição HTTP: o pedido excedeu o timeout. A auto-discovery foi revertida imediatamente e republicada, preservando o serviço; a descoberta do FÊNIX permanece uma operação explícita de job, que deverá ser executada em worker/checkpoint, não no caminho de leitura da tela.

O scanner foi então corrigido para o caso `fenix_enterprise`: ele lê apenas `public/index.html`, interpreta cada `id="view-*"` como uma view hash-routed real e não inventa ações/componentes quando não há evidência. Teste local comprovou exatamente 14 telas (`Command`, `Ide`, `Project`, `City`, `Projects`, `Agents`, `Operations`, `Runtime`, `Memory`, `Knowledge`, `Mcp`, `Browser`, `Observability`, `Terminal`). O código foi publicado na VPS; a execução autenticada do scan permanece pendente por política de autenticação.

### Scan visual assíncrono

`POST /api/v2/frontend-reality/scan` agora cria o Job persistente `frontend-reality.scan`, com estágios `DISCOVERY` e `AUDIT`, e responde com `jobId`/`202`. O resultado pode ser acompanhado pelas rotas existentes de Jobs; nenhuma fila ou memória paralela foi criada. A rota foi publicada na VPS com backup `product-experience-routes.js.before-async-screen-scan-20260901`. A execução real desse Job ainda requer sessão autenticada e worker disponível.

Regressão pós-publicação validada: o frontend remoto voltou a responder HTTP 200 em `/app` após o reinício. A consulta de contratos deve ser executada com `FENIX_URL` apontando para a VPS; sem essa variável, o script usa corretamente `127.0.0.1` e registra `unreachable`, sem atribuir o resultado local ao servidor remoto.

Validação posterior: `/app` remoto respondeu HTTP 200 e `POST /api/v2/frontend-reality/scan` sem sessão respondeu HTTP 401 rapidamente, sem bloquear a API. A suíte focada de honestidade, descoberta e prontidão passou com 10/10 testes.

Foi adicionado `test/fenix-shell-discovery.test.js` para impedir regressão do inventário: a descoberta do shell deve produzir exatamente os 14 `screen_*` reais e status `DISCOVERED`. A suíte atual passou com 11/11 testes focados.
