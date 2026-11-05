# GRG SPACE — estado verificado

Snapshot de auditoria: 2026-10-20 03:02 UTC. Escopo: interface autenticada em `http://209.50.241.22:3000`, endpoints públicos de saúde, Docker/host via SSH de leitura e testes locais. Não houve restart, reboot, migration ou job novo.

## Evidências

| Área | Estado | Evidência observada |
|---|---|---|
| Frontend | PASS parcial | A aplicação abre na sessão autenticada; navegação Cidade, Agents, Memory e Build foi inspecionada. |
| Control | FAIL parcial | Health, Serviços e Workers ficaram em “Carregando dados…”; ciclo autônomo e tick aparecem desabilitados como “Em desenvolvimento”. |
| API GRG | PENDING | `:3000/api/v2/system/health` retorna 401 sem sessão; a UI autenticada mostra dados de agentes/memória. Isso confirma proteção HTTP, não saúde completa do runtime. |
| Chat pela sidebar | FAIL | Perguntas read-only de aritmética terminaram em `PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT` (8,99 s na sessão anterior e 5,61 s neste teste). Um pedido de layout terminou em `AI_PROVIDER_UNAVAILABLE` (313,87 s). Não foi criado job ou arquivo por esses pedidos. |
| Cidade | PASS API / FAIL render no IAB | GET autenticado `/api/v2/living-city/agents` retornou `count: 39`, com IDs/posições e `measuredAt=2026-10-20T03:02:14Z`. Porém o IAB registrou `THREE.WebGLRenderer: A WebGL context could not be created` (`GL_VENDOR=Disabled`, `Sandboxed=yes`) em `fenix-world-3d.js:1435`; o construtor falha antes de chamar `syncRealData()`, deixando a cena em branco mesmo com a API populada. A aba Chrome normal existe, mas a conexão de inspeção expirou duas vezes; o efeito nela permanece PENDING. |
| Agents | PASS parcial / FAIL telemetria | Roster e busca funcionam (filtro “Alex - API Operations” retornou 1 agente); abrir o cartão selecionou o mesmo ID `agent-api-ops` no Inspector. O Inspector ainda não tem missão, job, ação recente ou evento SSE medidos; a lista mostra 39 registrados, 0 em execução, 38 disponíveis e 1 concluído. |
| Provedores | FAIL parcial | Painel marca `echo` como SIMULATED, Ollama como ONLINE sem latência medida e API Platform sem sessão. O botão de teste do Ollama permaneceu em “Testando…” por mais de 15 s, sem resultado; a prova foi encerrada como falha. |
| Memory | PENDING | Graph endpoint reporta 2.801 nós e 11.362 relações; a tela mostra 6 registros persistidos. Proveniência/índice `O(1)` aparecem como indisponíveis, e entidade selecionada exibiu 0 relações. |
| Build/Projects | PENDING | Interface lista 7 projetos, 5 workspaces, 0 jobs em execução/falhos. Não foi criada nem gravada alteração. |
| Estado visual residual | FAIL | A sessão mantém um modal “Carregando tarefa...” aguardando aprovação (65%, custo/tokens estimados) e um Inspector de Security Agent sem telemetria. Não foram aprovados nem alterados. |
| Navegação Agents → Cidade | FAIL parcial | “Ver na AI City” muda a rota para `#city`, mas o canvas continua em espera e o minimapa vazio. |
| API Platform | PASS parcial | `http://209.50.241.22:3001/health` respondeu HTTP 200. Isso não certifica o GRG nem uma chamada de modelo. |
| Containers GRG | FAIL | `grg-fenix-enterprise-api-1` está Exited (137) há 5 dias; worker e frontend em estado Created. PostgreSQL, Redis, Qdrant, MinIO e Keycloak aparecem ativos. |
| Processos do host | PENDING | Há processos host `fenix-evolution-worker.js` e `fenix-supervisor.js`, mas heartbeat/consumo de job não foi comprovado. O processo que atende `:3000` não teve executável identificável pelo SSH disponível. |
| Capacidade VPS | FAIL para expansão | Raiz 94% (6,1 GiB livres); RAM 4,7/5,8 GiB usada e 1,1 GiB disponível; swap 2/4 GiB usada; uptime 13 dias. Não iniciar cargas autônomas ou Whisper na VPS agora. |

## Alterações locais ainda não publicadas

`src/api/conversation-routes.js` contém allowlist exata para workspaces canônicos Fênix OS e API Platform. O teste correspondente rejeita paths fora das raízes permitidas. A cópia local **não foi publicada**; o arquivo da VPS observado em `/opt/fenix-os/grg/src/api/conversation-routes.js` ainda não contém a allowlist. A diferença de fonte/hash e o processo ativo impedem atribuir essa cópia ao servidor que atende o chat.

Validação local executada em `ai-engine/grg`: `node --test test/conversation-route-real-runtime.test.js test/workspace-responsive.test.js` — 25/25 passaram; `git diff --check` passou. Isso não comprova o runtime da VPS.

## Limites desta leitura

Estados e métricas exibidos pela UI foram registrados como observação da tela. O endpoint de agentes comprova uma projeção JSON de 39 registros, não heartbeat ou 39 agentes executando trabalho; a própria tela conta 0 em execução. O erro WebGL foi observado somente no navegador embutido em sandbox e não deve ser atribuído ao Chrome normal sem teste. Nenhum segredo foi coletado ou incluído.

## Atualização da fatia sidebar, Cidade e Screen DNA — 2026-10-20

Esta atualização registra mudanças no workspace local. A produção em `:3000` não foi publicada nem reiniciada porque a origem do listener e o rollback permanecem sem comprovação.

| Fluxo | Estado | Evidência |
|---|---|---|
| Chat da sidebar / workspace canônico | PASS local | `src/api/conversation-routes.js` permite apenas o caminho exato `vpsPath` do projeto registrado; a rota continua rejeitando paths arbitrários. `node --test test/conversation-route-real-runtime.test.js` passou 11/11, incluindo a aceitação do workspace canônico API Platform. |
| Alternância 2D/3D | PASS focado local | `node --test test/city-minimap-mode.test.js test/city-world3d-agent-fallback.test.js test/city-mode-initialization.test.js` passou 7/7. O teste cobre alternância, inicialização real do motor e fallback 2D após falha de WebGL. |
| Screen DNA | PASS focado local | `node --test test/project-screen-dna-reality.test.js` passou 2/2. O canvas usa registros de telas do projeto, não gera screenshot/DOM/código/paridade fictícios e informa quando não há captura. |
| Modal de aprovação | PASS focado local | `node --test test/task-modal-no-placeholder.test.js` passou 3/3. Modal exige ID, título, objetivo e estado de aprovação pendente; popups de teste e métricas inventadas não abrem como trabalho real. Criação de missão/job não injeta agente ou estimativas fictícias. |
| Suíte focada combinada | PASS local | 23 testes passaram em uma execução: rotas de conversa, Cidade, Screen DNA e modal. |
| Suíte completa | PENDING | `npm test` iniciou; o reporter dot registrou execução ampla e alguns `X`, depois ficou aguardando `local-model-engine-pipeline.test.js`, `operational-real-mission.test.js` e `workforce.test.js`. A execução foi interrompida, então não há resultado final nem atribuição segura dos `X`. |
| QA Playwright | BLOCKED | `npm run qa:frontend:fast` não iniciou: o Chromium headless esperado pelo Playwright não está instalado no ambiente (`chromium_headless_shell-1243`). |
| Navegador ao vivo / produção | FAIL observado, código novo PENDING | A sessão autenticada atual ainda mostra o modal `Carregando tarefa...`, valores fixos de token/custo/progresso e o catálogo publicado. Isso confirma que as alterações locais ainda não chegaram à VPS. Nenhum job/missão foi enviado. |
| Responsividade 375/768/1280/1920 | PENDING | Requer QA de navegador; a execução Playwright está bloqueada pela ausência do browser instalado. |

Arquivos tocados nesta fatia: roteamento de conversa e teste de workspace; alternância da Cidade e teste; renderização/estilo de Screen DNA e teste; validação do modal e teste. O estado geral e demais áreas deste documento não foram reavaliados.

## Atualização do portfólio visual de projetos — 2026-10-21

O Project Hub local agora reúne as telas registradas em **Projetos → Telas & DNA**, com busca por projeto/tela/rota/arquivo, filtros por estado da captura, contagens que separam capturas de registros sem medição, expansão da galeria completa e abertura de cada prévia no Inspector. A imagem ausente não é substituída por mockup; o estado aparece como “Sem captura · não medido”.

Verificação: `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-company-panel-layout.test.js` — 13/13 passaram; `git diff --check` passou. Playwright cobriu a galeria em 375, 768, 1280 e 1920 px, incluindo busca, filtros, Inspector e catálogo com seis registros. A sessão autenticada e a publicação na VPS não foram validadas; o sistema de atalhos `C:\Users\Dell\Desktop\PROJETOS` continua não conectado ao runtime remoto.

### Harmonização Apple HIG do Project Hub — 2026-10-21

A tela de Projetos agora usa tipografia do sistema, superfícies grafite neutras, azul de seleção/ação, cartões sem sombras fortes e alvos de interação de pelo menos 40 px. A mudança cobre o shell interno do Project Hub, abas, cartões, métricas, detalhes e o catálogo Screen DNA; outras telas ainda precisam da mesma revisão para alcançar consistência global.

Verificação: Playwright mede o sistema tipográfico, cor da ação principal, estado da navegação, ausência de sombra e altura dos botões; `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-company-panel-layout.test.js` — 13/13 passaram. Captura local de QA em `%TEMP%/grg-project-screen-portfolio-375-apple.png`. Sem sessão autenticada; sem publicação na VPS.

### Composição responsiva da Cidade — 2026-10-21

Correções Apple HIG na Cidade local: removi um override que anulava o bottom sheet do chat em telas estreitas, aumentei o espaço entre barra de navegação e minimapa, fiz a navegação recolher enquanto Inspector/modal ocupa a tela, e deixei o aviso de runtime em uma linha compacta com retry de 40 px. Captura em `375×812`: `%TEMP%/grg-city-current-375-apple.png`; medição real do app local confirmou aviso com 54 px, separação do minimapa e zero erros JavaScript. O estado “sessão expirada” continua visível porque a sessão do runtime não está autenticada.

Verificação: `node --test test/city-overlay-layout.test.js` — 8/8 passaram; `test/city-runtime-notice-mobile.test.js` e `test/city-mobile-hig-controls.test.js` validam aviso e alvos móveis. Produção/VPS não publicada; restante da harmonização Apple ainda precisa cobrir as outras áreas e ser revalidado após autenticação.

### Mapa de telas integrado a Projetos — 2026-10-21

**Projetos → Telas & DNA** agora inclui o mapa das rotas do shell GRG SPACE, lido por `GET /api/v2/frontend-reality/screens?projectId=fenix_enterprise&mode=shell`. A descoberta local encontrou 18 hashes; o catálogo lista 15 rotas canônicas e identifica três aliases legados (`#command`, `#dna`, `#metrics`) sem tratá-los como telas distintas. Cada item mostra nome, hash, arquivo de origem e estado de verificação; o botão abre a rota no shell. O mapa apresenta quatro rotas inicialmente e expande a lista completa. A UI informa claramente que descoberta HTML é inventário estático e não certifica runtime.

Varredura local executada: `npm run qa:screen-map` encontrou 15 telas, 35/35 contratos de backend declarados e 23 referências de API no frontend; plano gerado para 15 telas. `npm run qa:screen-contracts` verificou 29 contratos: 1 disponível, 26 protegidos por autenticação, 2 ações não invocadas e nenhum 404. A análise de navegador local (`npm run qa:frontend:fast`) não passou do primeiro carregamento: timeout em 8 s, quatro respostas 401 no console e zero falhas de transporte. Resultado da fila: 15 itens P1; runtime/autenticação bloqueados em 15, com 10 contratos declarados sem referência frontend detectada. Estes últimos precisam de triagem e não são classificados automaticamente como bugs funcionais.

Verificação da fatia: Playwright local, `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/screen-readiness-report.test.js` — 15/15 passaram; visualização da aba validada em 375, 768, 1280 e 1920 px, com busca, filtros, expansão, Inspector, mapa e navegação por rota. Captura de QA em `%TEMP%/grg-screen-map-portfolio-375.png`. Sem sessão autenticada, sem execução visual real autenticada e sem publicação na VPS. A lista de 15 telas é inventário do shell local, não inventário das telas de cada projeto conectado.

### Hierarquia da sidebar Fênix — 2026-10-21

No estado inicial do Chat, contexto e memória ficam sob “Contexto e ferramentas”; sugestões rápidas são contextuais e recolhidas. Removi do estado vazio atalhos para criar agentes/missões/reuniões e sugestões sem dados. Conversa nova mostra uma saudação simples gerada localmente; áreas da sidebar são anunciadas por rótulos acessíveis e estado selecionado.

Também corrigi o override móvel que abria o modo compacto como drawer de 359 px. Agora permanece em 64 px no celular. Verificação em navegador local: `node --test --test-concurrency=1 test/sidebar-hig-density.test.js test/sidebar-mission-rendering.test.js test/copilot-compact-interaction.test.js` — 3/3 passaram; largura 64 px verificada em 375/768/1280 px, composição da conversa sem overflow em 375/768/1280/1920 px e cartão de missão sem barra/progresso fictício. Captura: `%TEMP%/grg-sidebar-hig-375.png`.

O teste do chat usa fixture e não valida provider autenticado; a QA do runtime local continua expirando no login e a VPS não foi alterada. Arquivos desta fatia: `public/fenix-mascot-sidebar.js`, `public/fenix-hig-system.css`, `public/fenix-responsive.css`, `public/index.html` e `test/sidebar-hig-density.test.js`.

### Contadores do painel de QA — 2026-10-21

O painel `#browser` agora calcula total, aprovadas, falhas e não medidas usando a mesma lista de verificações mostrada na galeria. Isso remove a mistura entre contagem de telas e quantidade de resultados. Verificação focada: `node --test test/visual-qa-truth.test.js` — 6/6 passaram; `git diff --check` sem erros. Falta validação visual autenticada com relatório misto; VPS não publicada.

### Superfície da Biblioteca de Ativos na Cidade — 2026-10-21

Harmonizei a Biblioteca de Ativos com os tokens HIG do shell: superfície grafite sem gradiente/blur, borda neutra, sombra menor, acento azul, inputs e busca com alvos de 40 px e foco visível. A inspeção desktop reproduziu a colisão com o aviso do runtime; movi o painel para abaixo da faixa em desktop/tablet e adicionei `#cityRuntimeLoadStatus` à medição. Capturas Playwright em `docs/visual-evidence/2026-10-21/city-media-{375,768,1280,1920}-hig.png`. `node --test test/city-overlay-layout.test.js` — 8/8 passaram nas quatro larguras, incluindo colisões, estilos computados, foco e exclusividade de drawers. Sem autenticação de runtime ou publicação VPS.

### Cabeçalho global HIG — 2026-10-21

Os quatro KPIs agora são ações de botão acessíveis. Em celular a faixa é rolável; entre 1181 e 1360 px usa rótulos curtos, e em desktop reserva largura para os controles essenciais. Busca global pode ser acionada pelo teclado e mostra o diálogo existente. Estado indisponível usa texto em português.

Verificação: `node --test test/topbar-hig.test.js` — 1/1 passou; Playwright mede overflow, estilos, alvos e teclado em 375/768/1280/1920 px. Capturas: `docs/visual-evidence/2026-10-21/topbar-{375,768,1280,1920}-hig.png`. Shell local sem autenticação; provider/runtime e VPS não verificados, sem deploy.

A medição visual identificou o placeholder da busca cortado em 1280 px. Nesse breakpoint ela agora é um botão de busca com foco/teclado e nome acessível; em ≥1361 px o campo completo continua disponível. A captura atualizada é `docs/visual-evidence/2026-10-21/topbar-1280-hig.png`.

### Legibilidade dos agentes da Cidade — 2026-10-21

Os agentes dinâmicos agora usam escala visual `1,35×` (limitada a `1,45×`) para melhorar a leitura no mapa geral. O fallback usa a mesma calibração; trabalhadores decorativos dos edifícios e as coordenadas dos agentes não mudam. O teste `test/city-agent-visual-profile.test.js` verifica o perfil e sua aplicação no renderer. A reprodução visual autenticada não foi possível nesta sessão porque o controle da aba Chrome expirou; correção local ainda sem captura pós-alteração e sem deploy.

### Placas da Cidade e aviso de sessão — 2026-10-21

No app local servido em `127.0.0.1:4400`, reproduzi o aviso de sessão expirada sobre a placa “AI NEXUS” em `1280×800`. O aviso agora participa do cálculo de obstáculos e as placas se movem para uma posição legível. Screenshot depois da correção em `docs/visual-evidence/2026-10-21/city-runtime-notice-1280-after.png`; não há interseção entre rótulo e aviso. `node --test test/city-district-label-layout.test.js test/city-agent-visual-profile.test.js` — 6/6 passaram nos quatro viewports. A sessão expirada permanece indicada e agentes reais continuam indisponíveis; VPS não alterada.

### Hierarquia da tela Memória — 2026-10-21

Em fixture local sem autenticação, reduzi os cartões redundantes da tela `#memory`: sete camadas agora são botões acessíveis e compactos, e as métricas do grafo compartilham uma faixa. Capturas após a correção em `docs/visual-evidence/2026-10-21/memory-hierarchy-{375,1280}-after.png`. O Playwright confirmou 7 controles, seleção de camada e sem overflow horizontal em 375/1280 px. Testes de memória: 8/8 passaram com Chromium headless instalado. Os dados reais do Graph Brain, sessão autenticada e a versão da VPS continuam pendentes; nenhum deploy foi feito.

### Cidade com sidebar aberta — 2026-10-21

No shell local, reproduzi a composição com 594 px para o mapa e o chat acoplado. O minimapa ocupava 238 px de largura, apesar do canvas estreito. Ajustei-o para 190 px nessa faixa de tela e mantive 18 px entre o seletor e o minimapa. `node --test test/city-overlay-layout.test.js` passou 9/9; a captura final é `docs/visual-evidence/2026-10-21/city-sidebar-minimap-1280-after.png`. Dados autenticados e VPS continuam pendentes; nenhuma publicação foi realizada.

### Projetos · catálogo de telas e Screen DNA — 2026-10-21

A aba “Telas & DNA” reúne o mapa do shell (rotas e contratos descobertos), catálogo visual por projeto, capturas históricas e telas ainda não medidas. Permite buscar/filtrar, expandir o conjunto, inspecionar uma tela e abrir o Screen DNA do projeto selecionado. O status de inventário estático não é apresentado como validação de runtime. Corrigi também o recorte móvel do Project Hub: em 375 px a área interna deixou de exceder 594 px; o teste agora exige largura contida e botões dentro do cabeçalho. Verificação focada: 14 asserções em quatro testes de Project Hub/Screen DNA passaram; capturas em `docs/visual-evidence/2026-10-21/projects-screen-portfolio-375-after.png` e `projects-unavailable-{375,1280}-after.png`. Fixture local sem autenticação; o diretório Windows `C:\Users\Dell\Desktop\PROJETOS` não está conectado ao servidor e a VPS não foi alterada.

### Projetos · mapa funcional das telas — 2026-10-21

Completei a projeção visual usando o sistema de telas existente: o inventário da aplicação agora anexa domínio, propósito e contratos declarados pelo manifesto; “Telas & DNA” agrupa rotas por área e mostra contagem, propósito, leituras e ações declaradas. O contrato da API foi estendido sem alterar campos existentes e mantém `NOT_VERIFIED` para runtime. Teste do contrato e browser passou 15/15, incluindo overflow em 375/768/1280/1920 px. Captura local em `docs/visual-evidence/2026-10-21/projects-screen-portfolio-375-domain-map-after.png`. A VPS e dados autenticados seguem pendentes.

A captura desktop mostrou que um único projeto preenchia apenas metade do catálogo. A grade agora usa a largura disponível quando há um só cartão; com vários projetos mantém as colunas responsivas. Medição do browser confirmou 856 px de área de grade e cartão após correção com largura correspondente. Teste de portfólio passou; capturas: `projects-screen-portfolio-1280-domain-map-after.png` e `projects-screen-portfolio-375-domain-map-after.png`.

#### Conferência da versão servida — 2026-10-21

GET público a `http://209.50.241.22:3000/app#city` retornou HTTP 200 e identificou título do GRG SPACE; uma sessão sem autenticação foi redirecionada a `/GRG-login`, então a tela de Projetos autenticada não pôde ser inspecionada. O HTML ainda referencia `project-hub-live.css?v=2` e `project-hub-live.js?v=20261020-screen-dna-archive-1`. SSH de leitura confirmou os arquivos em `/opt/fenix-os/public/`, e seus hashes coincidem com a resposta HTTP, mas diferem da fonte local que contém o mapa por domínio e o cartão em largura total. `:3001/health` retornou HTTP 200. O usuário `deploy` não tem `sudo` sem senha; não foi possível mapear o PID proprietário do listener nem estabelecer rollback por essa conta. Nenhuma publicação ou restart foi feito. Evidências e hashes estão em `UI-067`.

#### Compatibilidade do catálogo com API anterior — 2026-10-21

O Project Hub agora completa somente os metadados ausentes de domínio, propósito e contratos a partir de `public/project-screen-manifest.json`; as rotas continuam vindo do endpoint autenticado. Isso permite que a próxima publicação estática funcione mesmo se a API ainda servir o contrato anterior. A cópia pública do manifesto é verificada contra `qa/frontend-screen-manifest.json`; a fixture do navegador removeu intencionalmente esses campos da API e confirmou os grupos corretos. Testes de Projetos/Screen DNA: 16/16 passaram. Capturas revisadas em 375 e 1280 px. Versão ainda não publicada.

Rollback dos arquivos atualmente servidos preparado em `/home/deploy/grg-space-backups/20261021-project-screen-rollout-prep/`; `sha256sum -c SOURCE-SHA256SUMS` confirmou os três arquivos. O diretório tem modo `700`. `docker ps` não mostra serviço expondo 3000; o usuário `deploy` não consegue mapear o PID porque não tem `sudo`. Nenhuma alteração foi aplicada aos arquivos ativos.

### Agentes da Cidade — evolução visual — 2026-10-21

A captura com agente sintético de QA mostrou que a escala `1.35` ainda deixava a silhueta pouco legível no mapa. O perfil agora usa `1.75` (limite `1.9`); cabeça/cabelo têm volumes arredondados, o topo do cabelo acompanha o torso sentado/em pé, e tons de pele variam de forma estável por ID sem alegar status ou função. Teste focado 7/7 passou; captura efêmera: `docs/visual-evidence/2026-10-21/city-avatar-style-1280-after.png`. A comparação com os agentes reais na sessão autenticada permanece pendente; não houve publicação.

### Projetos · previews do Screen DNA — 2026-10-21

Corrigi a apresentação de capturas inválidas no catálogo: imagem menor que 64×36 px não pode mais ser esticada como preview; erro de carregamento e ausência de captura usam estados vazios próprios, e a data histórica fica visível quando fornecida. Uma linha redundante no estado não medido foi removida. O teste usa uma imagem 1×1 inválida e telas 320×180 válidas; confirma que somente as capturas úteis aparecem. Suíte focada de Projetos/Screen DNA: 16/16. Capturas locais revisadas em 375 e 1280 px. Dados de projeto vêm de fixture; a versão VPS continua sem essas mudanças.

### KPI de presença de agentes — 2026-10-21

Corrigido o falso zero no cabeçalho: listas de agentes sem presença individual agora produzem `—`, presença medida em todos os registros produz contagem online real, e a cápsula identifica explicitamente `Online`. Roster vazio medido continua mostrando `0`. Ampliei para 40 px o alvo da busca compacta e tornei determinística a espera do perfil responsivo no teste. Suíte local de cabeçalho e indicadores: 16/16; captura revisada em `docs/visual-evidence/2026-10-21/topbar-agent-kpi-1280-after.png`. VPS/sessão autenticada ainda pendentes; ver UI-019 no backlog.

### KPI de missões — 2026-10-21

Contei aprovações pendentes como trabalho aberto e alinhei o drawer à mesma lista e classificação do KPI. O drawer omite estados terminais, exibe o ID e estado reais, escapa campos recebidos e separa falha de leitura de lista vazia. Suíte local de contagem, drawer, Cidade e cabeçalho: 19/19; captura de revisão com fixture em `docs/visual-evidence/2026-10-21/topbar-agent-kpi-1280-after.png`. Conferência autenticada na VPS segue pendente (UI-020).

### Fallback real da Cidade quando WebGL falha — 2026-10-21

Reproduzi a falha de criação do contexto WebGL no browser local. O bootstrap antes interrompia a Cidade sem iniciar o renderer 2D. Agora remove o host 3D parcial e ativa `IsoCityEngine` na mesma tela, consumindo o estado do runtime; a barra avisa que está em 2D e oferece nova tentativa. Teste Playwright bloqueou WebGL e confirmou um agente vindo da fixture de API, sem entidades adicionais no roster do renderer. Aviso medido em 375/768/1280/1920 px. Suíte focada City: 13/13; captura revisada em `docs/visual-evidence/2026-10-21/city-webgl-fallback-1280-after.png`. Alteração local, ainda não publicada. Teste da VPS autenticada, seleção/Inspector e WebGL funcional seguem pendentes (UI-069); a sessão/CDP não foi acessível nesta rodada.

### Screen DNA do Project Hub — descoberta, proveniência e variantes de app — 2026-10-21

Reproduzi no workspace que o mesmo HTML com duas ocorrências de `view-projects` gerava três itens ao mapear duas aplicações, e a tela não capturada recebia confiança `1.0` junto de componentes, layout e responsividade inventados. A absorção agora deduplica ocorrência no arquivo, preserva apps distintos com rotas iguais, marca escopo por aplicação e separa rota encontrada, inspeção DOM e captura real. Só a tela aberta por Playwright recebe resumo DOM, caminho de captura e confiança observada. Memória preserva confiança explicitamente não pontuada. O canvas agora usa o título absorvido e rejeita miniaturas 1×1; na captura browser as telas Admin e Storefront ficam separadas em `#/home`, com estados de captura honestos: `docs/visual-evidence/2026-10-21/screen-dna-multi-app-1280-after.png`. Verificação local de Project Hub/Screen DNA/absorção/Cidade: 49/49. Alterações locais, ainda não publicadas; catálogo autenticado e 718 registros da VPS não foram reabsorvidos (UI-012).
### Project Hub · catálogo local PROJETOS — 2026-10-21

Integrei o `projetos.json` da pasta `C:\Users\Dell\Desktop\PROJETOS` ao Project Kernel local. A leitura real encontrou 41/41 caminhos; 39 são pastas e dois são arquivos individuais. O Project Hub ganhou a aba **Meus Projetos**, separada de **Projetos Fênix**, com busca por grupo/tipo, metadados, abertura de sistema por URL declarada, acesso à IDE e entrada no Screen DNA. IDs `local-*` mantêm cópias/variantes separadas dos projetos canônicos. Com a lista local junto dos seis projetos registrados neste teste, o catálogo apresenta 47 registros (41 locais + 6 canônicos).

Na IDE, pastas autorizadas usam a árvore existente; entradas de arquivo único expõem somente o arquivo declarado e não absorvem a pasta vizinha. O catálogo não envia nem executa `command`, `.lnk`, `.bat` ou script. Verificação focada: `node --test test/local-project-catalog-integration.test.js test/local-project-catalog-ui.test.js test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-workspace-registry-fallback.test.js` — 21/21 passaram com Chrome do sistema; `node --check` nos módulos alterados passou. O browser abriu os 41 cartões reais, sem erro de console e sem overflow horizontal em 375/768/1280/1920 px; captura em `docs/visual-evidence/2026-10-21/projects-local-catalog-1280-after.png`. A leitura fria do catálogo mediu 17,1 ms e leituras seguintes em cache 0,06 ms em média (40 leituras). A integração opera somente quando o backend local consegue ler o catálogo. A tela `209.50.241.22:3000` continua sem acesso a esses arquivos até existir um agente local autenticado; VPS sem publicação.

### Project Hub · clareza e inspeção local — 2026-10-21

Ao revisar a captura do projeto local, encontrei defaults de runtime apresentados como fatos, ações acumuladas no cabeçalho, subabas em duas linhas e carregamento Git infinito. O resumo agora mostra apenas metadados conhecidos; dados ausentes ficam recolhidos, métricas sem evidência não viram zero e ações secundárias ficam em menu. As subabas rolam horizontalmente. A seleção de uma pasta local consulta somente o endpoint GET de estado Git e termina com branch/erro real.

Verificação: suíte de Project Hub, Screen DNA, catálogo local, resolver de workspace e Git passou 23/23; Chrome conferiu menu e navegação em 375/768/1280/1920 px. Teste adicional consulta repositório Git temporário via ID local e comprova que o conteúdo não mudou. Captura: `docs/visual-evidence/2026-10-21/projects-local-card-clarity-1280-after.png`. Alteração permanece local; não foi implantada na VPS. A inspeção visual da aba da VPS não foi possível nesta rodada.

### Memória · navegação das abas e falha recuperável — 2026-10-21

As abas “Grafo & Camadas” e “Registros Persistidos” agora alternam painéis acessíveis por clique e teclado. Quando o Graph Brain ainda não foi medido, camadas, indicadores, proveniência e workspace vazio ficam recolhidos. A busca de registros persistidos continua disponível mesmo com erro de autenticação do grafo; após voltar uma resposta medida, o workspace aparece novamente. Teste de navegador reproduziu 401, buscou registro, navegou por teclado, validou retorno ao login e carregamento recuperado do grafo: 4/4 nos testes focados de Memória. Captura móvel: `docs/visual-evidence/2026-10-21/memory-tab-recovery-375-after.png`. Fixture local; autenticação e runtime da VPS não foram validados e nenhuma publicação foi feita.


### Projetos · portfólio visual distingue aplicações por rota — 2026-10-21

Na aba **Telas & DNA**, rotas repetidas entre shells diferentes agora mostram o `applicationId` nos cartões do portfólio; Admin e Storefront deixam de parecer a mesma tela quando ambos usam `/home`. O catálogo geral continua ligado ao mapa do shell, previews Screen DNA por projeto, filtros por captura, Inspector e entrada para abrir o projeto nas telas. A diferença foi reproduzida com teste browser antes da correção.

Verificação focada de Project Hub, Screen DNA, escopo, proveniência, manifest e catálogo local: 22/22; sem erros de página e sem overflow em 375, 768, 1280 e 1920 px. Capturas revisadas: `docs/visual-evidence/2026-10-21/projects-screen-portfolio-integration-1280.png` e `docs/visual-evidence/2026-10-21/projects-screen-portfolio-integration-375.png`. Evidência de runtime por fixture local; catálogo autenticado e projeto real da VPS pendentes. Nenhuma publicação foi feita.
## Project Hub · navegação de arquivos locais — 2026-10-21

A aba `Arquivos` agora carrega a árvore de pastas do workspace selecionado pela API autenticada existente, com expansão de diretórios, abertura de arquivo na IDE e limite de profundidade declarado. `Abrir Workspace` seleciona esse projeto na IDE; Screen DNA continua separado. A faixa de subabas rola automaticamente até a aba ativa após renderizações assíncronas, evitando texto cortado em telas estreitas. A mudança usa leitura apenas e não inicia serviços nem altera arquivos.

Verificação local: 14/14 testes focados de catálogo, Project Hub e Screen DNA passaram no Chrome. O fluxo cobre seleção do projeto, árvore, encaminhamento do arquivo à IDE, Screen DNA, aba ativa inteira e ausência de overflow em 375/768/1280/1920 px. Capturas em `docs/visual-evidence/2026-10-21/projects-local-file-tree-{375,768,1280,1920}-after.png`. Estado `UI-076`/`UI-077` consta no backlog. Fixture do navegador; projeto local real autenticado e VPS não validados. Nenhuma publicação.

O teste completo dos painéis da Cidade passou 9/9 em Chromium nas geometrias móveis, tablet, notebook e desktop. Exclusividade, foco, fechamento, limites do mapa, sobreposição com sidebar e rolagem de conteúdo longo foram verificados. `UI-007` está corrigido no layout local; validação autenticada continua pendente.

## Screen DNA · estados sem captura — 2026-10-21

No Project Hub, telas sem screenshot registrado agora usam um estado vazio compacto de 76 px, mantendo explícito “Prévia não medida”. Imagens reais continuam intactas; nenhuma miniatura foi inventada. O teste browser falhou antes da mudança (134 px) e passou depois, cobrindo mapa, portfólio, Inspector, filtros e 375/768/1280/1920 px. Captura: `docs/visual-evidence/2026-10-21/projects-screen-dna-compact-empty-state-375-after.png`. Dados de teste são fixture; sessão real e VPS permanecem pendentes.

## Cidade · painel de Operações compacto — 2026-10-21

O drawer móvel de Operações agora fica limitado a 50% da altura da tela e rola o conteúdo longo dentro do painel, preservando a área visível do mapa. Antes da correção, o cenário longo ocupava 471/812 px. O teste Chromium focado passou após a mudança e a captura revisada em 375×812 está em `docs/visual-evidence/2026-10-21/city-operations-drawer-content-fit-375-after.png`. Teste executado com fixture; indicadores mostram runtime indisponível. VPS não alterada e verificação em sessão autenticada pendente.

## Entrada inicial e modal de aprovação — 2026-10-21

Verifiquei a primeira pintura antes dos scripts: `#view-city` já vem ativo no HTML, `/` sem hash fica na Cidade mesmo com uma preferência antiga para Memória, `#command` normaliza para `#city`, e a sidebar começa fechada. `test/city-first-paint.test.js` e `test/shell-startup-responsive.test.js` passaram 2/2 nos viewports usados pelo teste. Atualizei assertions antigas que esperavam uma chave de cache CSS vencida e uma área de KPI removida; o teste agora valida o resumo real e permite workspace do grafo oculto enquanto não houver dados medidos.

O modal de aprovação local segue oculto até receber uma tarefa válida com ID, texto e estado de aprovação. `test/task-modal-no-placeholder.test.js` passou 5/5. UI-018 foi marcado corrigido localmente; o asset e o comportamento autenticado da VPS ainda não foram validados.

## Auditoria HTTP da VPS · versões visuais — 2026-10-21

O HTML público de `/app` respondeu `200`, contém `view-city.active` e mantém o cockpit inativo no documento inicial. Já o HTML remoto serve o Project Hub antigo (`project-hub-live.css?v=2`, `project-hub-live.js?v=20261020-screen-dna-archive-1`); ambos os corpos diferem dos assets locais atuais. Também usa o CSS responsivo anterior e não contém `fenix-hig-system.css`; os endpoints estáticos de `fenix-hig-system.css` e `city-agent-visual-profile.js` retornaram `404`. O JS do modal de tarefa tem hash igual ao local, mas o CSS diverge.

Antes de qualquer publicação, ainda é necessário identificar com precisão o PID que atende à porta 3000 e provar rollback do artefato realmente ativo. `docker ps` não mostra container mapeando essa porta; `ss` executado como `deploy` não expõe PID e `sudo` não está disponível sem senha. Há um pacote de backup em `/home/deploy/grg-space-backups/20261021-project-screen-rollout-prep/`, com checksum interno validado, mas não confirmei que ele corresponde ao processo servido hoje. Nenhum arquivo remoto foi alterado e nenhum serviço foi reiniciado.

## Screen DNA · canvas de Projetos sem captura — 2026-10-21

Revisando o canvas integrado em **Projetos → Screen DNA**, encontrei previews não medidos ocupando 169 px cada. O canvas agora recolhe esses estados, erros de carregamento e imagens abaixo de 64×36 para 64 px, com rótulo explícito; imagens utilizáveis preservam 16:10. A integração permanece baseada em telas reais descobertas/registradas, distingue aplicação quando há colisão de rotas e oferece abertura do projeto e da tela no Inspector.

Verificação final: `node --test test/project-screen-portfolio.test.js test/local-project-catalog-ui.test.js test/project-screen-dna-reality.test.js test/project-screen-discovery-provenance.test.js test/screen-shell-assets.test.js` — 21/21 passaram em Edge. A cobertura de layout do portfólio mede 375, 768, 1280 e 1920 px. O HTML agora aponta para novas revisões cache-busted (`project-hub-live.css?v=15-screen-dna-canvas-compact`, `project-hub-live.js?v=17-project-screen-states`), com teste para confirmar que os assets existem. Capturas antes/depois: `docs/visual-evidence/2026-10-21/screen-dna-project-board-fixture-1280.png` e `docs/visual-evidence/2026-10-21/screen-dna-project-board-compact-1280-after.png`. Fixture local, sem captura autenticada dos projetos do usuário; VPS ainda serve JS/CSS divergentes, então nada foi publicado.

## Cidade · rótulos de bairros legíveis — 2026-10-21

O teste encontrou títulos de 8 px e detalhes de 7 px nos bairros em mobile, botões “Projetos”/voltar com 32 px, fechar o Inspector com 26×34 px e ações com 11 px/36,5 px. Rótulos usam fontes do sistema, escala 11/9 px em mobile e 12/10 px em desktop, alvo de 40 px e foco visível; navegação, fechamento e ações do Inspector usam alvos de 44 px, e as ações usam texto de 13 px. O CSS do World está em `?v=7-city-inspector-actions`. `node --test test/city-district-label-layout.test.js` passou 1/1 no Edge e verificou texto, alvos, não sobreposição do título e ausência de colisões/cortes em 375/768/1280/1920 px. Capturas: `docs/visual-evidence/2026-10-21/city-district-labels-readable-1280-after.png` e `docs/visual-evidence/2026-10-21/city-inspector-actions-1280-after.png`.

Verificação sequencial anterior: `node --test --test-concurrency=1 test/city-district-label-layout.test.js test/city-overlay-layout.test.js test/city-project-inspector-flow.test.js test/screen-shell-assets.test.js` — 18/18 passaram. Após elevar os alvos da navegação 3D, o teste de legibilidade/colisões passou novamente 1/1 em Edge. Sessão sem autenticação, runtime não certificado e CSS da Cidade não publicado na VPS.

## Rechecagem autenticada do runtime e da VPS · 2026-10-21

- Pelo Chrome autenticado, `GET /api/v2/living-city/state` e `/api/v2/living-city/agents` responderam JSON. A leitura às 14:16 UTC identificou `source=JobEngine/ProjectKernel/WorldStateEngine`, 39 agentes (37 AVAILABLE, 1 WORKING, 1 COMPLETED), 1 agente com vínculo de job, 19 com coordenadas medidas e nenhum destino de movimento publicado. Isso prova as rotas e a projeção autenticadas, não heartbeat dos 39 agentes.
- O detalhe real de `agent-camila` estava `AVAILABLE`, sem `currentJob`, mas retornou `currentTask` de standby e memórias recentes repetindo “Concluída tarefa com sucesso: Ronda preventiva…”. O código servido em `/opt/fenix-os/grg/src/world-model/world-simulation-engine.js` cria tarefas aleatórias a cada 20 ticks, incrementa o progresso local e conclui trabalho sem job após 35 ticks. A projeção também inventava ferramentas por ID/cargo.
- Correção local: o simulador não cria trabalho, não incrementa progresso do JobEngine nem grava sucesso sintético; movimento para workstation continua disponível para tarefas atribuídas. A projeção da Cidade exibe tarefa somente quando há job ativo, e ferramentas só quando constam no registro real do agente.
- Verificação local: `node --test --test-reporter=spec test/living-city-agent-truth.test.js` 9/9; suíte focada de rotas de agentes e projeção 3D 47/47. `living-world-four-layers.test.js` ainda tem duas falhas fora desta correção: fixture espera estação antiga `st-pack-supervisor` (snapshot atual usa `st-supervisao`) e outra asserção espera veículos em um snapshot vazio. Não ajustei esses testes nesta fatia.
- O código em `/opt/fenix-os/grg/src` ainda contém a simulação falsa. Não foi publicado nem reiniciado: o PID/gerenciador efetivo do backend permanece sem identificação segura, e a raiz está 94% cheia (5,9 GiB livres; RAM disponível 1,1 GiB).
- A porta raiz HTTP redireciona (308) para HTTPS; `https://209.50.241.22/` e `:3000/app` responderam 200. A Cidade aparece ativa no HTML inicial publicado; `/api/v2/living-city/state` não autenticada recebe bloqueio, mas no Chrome autenticado a rota retornou dados, então o 404 descrito no material não foi reproduzido nesta leitura.

O catálogo `C:\Users\Dell\Desktop\PROJETOS\projetos.json` foi revalidado: 41 entradas e 41 caminhos existentes. As portas nele são locais de desenvolvimento; a página na VPS não acessa o disco C:. O Project Hub já apresenta as portas locais/API existentes, mas não há bridge de filesystem entre PC e VPS.
## Rechecagem visual com sessão autenticada · câmera da Cidade — 2026-10-21

Na aba temporária de QA (1745×808), a Cidade autenticada abriu inicialmente com WebGL e os oito rótulos de prédios. O botão `Resetar Câmera` foi acionado para verificar o enquadramento; após a ação, terreno e geometria sumiram, mas rótulos, minimapa e HUD permaneceram. Reload na mesma aba preservou o canvas branco. Registrei UI-097 como `REPRODUCED`, ainda sem causa raiz confirmada; não alterei o servidor. A árvore de acessibilidade também expôs o modal “Aguardando aprovação” com título `3` e sem payload identificável. Registrei UI-098 como `OBSERVED`; não aprovei nem rejeitei a tarefa.

O reset não melhorou a composição: no lugar do mundo apareceu uma tela branca com overlays ainda ativos. Capturas e medidas do DOM foram lidas diretamente na sessão autenticada. A mudança local de simulador continua não implantada e não explica, por si só, a falha de desenho do WebGL.

## Project Hub · bindings VPS datados — 2026-10-21

Corrigi a divergência entre portas cadastradas e serviços realmente observados: o frontend do ZapAI fica em TLS `:1000`, a API em `:4025`; Gerar Ficha foi incluído na porta `:8000` sob `gerar-ficha.service`; API Platform mantém `:3001` e dashboard `:8081`; Fênix mantém gateway público `:3000`, HTTPS público `:443` e backend loopback `:4410`. Nesta leitura, todos os sete URLs testados responderam HTTP 200; `/8000/docs` é documentação OpenAPI, não health. Disco da VPS em 94%.

O Project Hub local agora mostra bindings de implantação em cards separados das portas do catálogo local, com destino, timestamp, resultado da leitura e aviso de que uma observação pontual não garante disponibilidade contínua. Testes browser e de registro passaram 14/14; capturas: `docs/visual-evidence/2026-10-21/project-vps-bindings-375-after.png`, `-768-after.png`, `-1280-after.png`, `-1920-after.png`. O mapeamento está apenas no checkout; publicação permanece pendente de identificação segura do processo ativo e rollback confirmado.

## Cidade · proveniência de coordenadas de agente — 2026-10-21

O motor posicionava agentes sem coordenadas reportadas em uma localização estável calculada pelo distrito, mas não identificava essa localização como estimativa. Agora o snapshot visual guarda `coordinateSource` com `MEASURED` ou `ESTIMATED`; o balão e o Inspector comunicam a origem. Coordenadas nulas e localizações zeradas inconsistentes com a afiliação são estimadas; coordenada explícita no HQ continua medida. Isso melhora a honestidade visual sem inventar tarefas, destinos ou telemetria.

Testes relevantes passaram 51/51, incluindo coordenadas, criação de avatares, Inspector, fallback e reconciliação de snapshots. A VPS não foi atualizada; seus bundles ainda diferem do checkout local.

## Cidade · recuperação do botão Resetar Câmera — 2026-10-21

Na leitura pública atual, `/app` serviu `fenix-world-3d.js?v=20261020-city-cookie-world-1`; esse código só sincronizava e renderizava a câmera no caminho headless, enquanto navegadores normais dependiam da interpolação do frame seguinte. Localmente, o reset agora sincroniza câmera atual/alvo, encerra follow, restaura andares e cutaway, limpa seleção, atualiza os rótulos, força um frame e persiste o estado. `test/world-camera-reset.test.js` reproduz o estado divergente e passou após a correção; `test/world-camera.test.js` passou 5/5. O Edge de QA não inicializou WebGL por software (o teste de fallback 2D passou), então não há captura local 3D nem confirmação visual do bug corrigido. A VPS permanece inalterada e o bug continua pendente de validação visual após implantação segura.

Revalidação SSH somente leitura: `/` continua em 94% (6,1 GB livres); portas 80/443/1000/3000/3001/4025/8000/8081 continuam escutando. `docker ps` confirma API Platform e serviços de dados; `gerar-ficha.service` está ativo. `pm2 ls` como `deploy` não lista apps; os processos Fênix aparecem como `root` sob `/root/.pm2` e `/opt/fenix`, mas `sudo` exige senha e a porta 3000 não expôs PID ao usuário deploy. Portanto, o gerenciador exato do frontend e uma rota de rollback autorizada seguem sem confirmação; não implantei.

## Aprovação de tarefas · payload e identidade visual — 2026-10-21

O modal exigia que `taskId`, título, objetivo e `APPROVAL_PENDING` existissem, mas aceitava um título composto apenas por número e não mostrava o ID usado pelos botões. O bundle servido na porta 3000 (`fenix-task-modal.js?v=20261020`) ainda tem essa validação permissiva. Localmente, o modal rejeita título/objetivo sem texto legível e título igual ao ID; mostra o identificador real em texto seguro. `test/task-modal-contract.test.js` e `test/task-modal-no-placeholder.test.js` passaram 8/8, incluindo payload real identificado e rejeição dos casos inválidos. A VPS e ações sobre tarefas não foram alteradas; verificação autenticada permanece pendente.

Verificação conjunta dos contratos de câmera, avatares, sincronização real da Cidade, modal, shell e portfólio de testes selecionados: 75/75; `node --check` e `git diff --check` passaram. Isso não substitui inspeção visual autenticada em WebGL.

## IDE · recuperação persistente de diffs — 2026-10-22

Propostas de edição aguardando confirmação agora sobrevivem ao reinício do processo e podem ser listadas/reabertas na IDE. O store mantém escopo por tenant, ator e projeto; a listagem expõe metadados, e a confirmação ainda valida hash antes de gravar. Testes focados de drafts, migração e caminho rápido Postgres passaram 19/19; jornada Playwright REA→preview selecionado→plano/memória/Flow Graph→diff persistido reaberto sem escrita→importação confirmada de DESIGN.md passou 1/1; `node --check` passou. Provider real, viewport manual e implantação permanecem pendentes. A porta 3000 ainda não tem processo/rollback identificado com segurança para publicar nesta fatia.

## Screen DNA → Flow Graph e divergência da VPS — 2026-10-22

Na versão local, abrir relações de uma tela agora encaminha o ID canônico do Screen DNA e centra/seleciona o nó correspondente no Flow Graph. Os testes focados de absorção, catálogo, portfólio e bridge passaram 26/26; a jornada E2E ampla alcançou a nova seleção, mas falhou depois na etapa de planejamento REA aguardando “Plano do projeto pronto para revisão”. `node --check` e `git diff --check` passaram.

Na VPS, a sessão autenticada observou um Inspector de Fênix OS cujo DOM era a tela de login da API Platform, com título `undefined`, 28 nós e alegação de 98.5% de paridade sem captura registrada. A evidência foi registrada como UI-185 (`OBSERVED`), sem concluir causa. UI-186 acompanha o foco local do Flow Graph; a jornada completa e a VPS seguem pendentes. A leitura SSH encontrou serviços Fênix sob processos root, `pm2 list` vazio para `deploy` e nenhum PID da porta 3000 visível a esse usuário; rollback/gerência do listener não foram confirmados. Nenhuma publicação ou reinício realizado.

## Screen DNA por ramos — 2026-10-22

O quadro local agrupa telas por prefixo de rota e, para registros sem rota, pelo diretório de origem com esse critério explicitado. Captura ausente ocupa um estado compacto; logo e versão do projeto aparecem apenas quando fornecidos pelo catálogo. Testes de realidade do Screen DNA passaram 14/14 e jornada Playwright do Project Hub passou 1/1. Validação visual multi-viewport e atualização da VPS permanecem pendentes.

## Controles visuais da Cidade — 2026-10-22

Os cinco atalhos da barra da Cidade foram convertidos de emojis coloridos para ícones Phosphor monocromáticos já cobertos pelo tema. Testes de catálogo visual + Screen DNA: 15/15; Playwright Project Hub: 1/1 (jornada completada). A centralização dos pontos da captura e a remoção do resumo redundante dependem de identificar o DOM/overlay servido na versão VPS; fidelidade do universo e integração white-label BAI continuam no backlog. Nenhuma publicação ocorreu.

## Flow Graph — telemetria sem evidência — 2026-10-22

Correção local para não derivar atividade, execuções, subsystem, evento ou cadência quando a aresta não os fornece. O teste unitário de evidência passou 1/1, `node --check` passou e a jornada REA → Flow Graph reportou PASS 1/1; o processo foi interrompido após a conclusão TAP por manter handles ativos. A versão autenticada da VPS e um caso de telemetria positiva permanecem pendentes; nenhuma publicação foi feita.
