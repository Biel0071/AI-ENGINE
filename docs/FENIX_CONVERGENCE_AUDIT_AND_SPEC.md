# FÊNIX OS — AUDITORIA DE REALIDADE (FASE 0) E ESPECIFICAÇÃO DE ALVO VISUAL E FUNCIONAL (FASE 1)

**Data da Auditoria:** 15 de Outubro de 2026  
**Escopo:** Repositório completo (`ai-engine-core`), Backend (`grg/src/`), Frontend Canônico (`grg/public/`), Runtime em Produção (`http://209.50.241.22:3000` / `:4410`) e Artefatos Visuais Anteriores.

---

## FASE 0 — INVENTÁRIO DE REALIDADE DO SISTEMA

### 1. Diagnóstico Estrutural e Arquitetural

1. **Shell Canônico vs. Estado Publicado na VPS:**
   - O shell canônico oficial é `ai-engine/grg/public/index.html` servido por `ai-engine/grg/src/server.js`.
   - O repositório local possui **29 arquivos modificados e não publicados** na VPS (`209.50.241.22`). Como resultado, o ambiente de produção estava executando uma versão anterior de `fenix-world-3d.js`, `index.html`, `operations-live.js`, `office-live.js` e `mission-kernel.js`.
2. **Por que as telas pareciam vazias ou presas em `"Carregando..."` / `"UNAVAILABLE"`:**
   - **Rota 404 na Telemetria Global (`/api/v2/reality-engine/telemetry`):** No `index.html` (linha 6490), a função `updateRealityEngineData()` faz polling em `/api/v2/reality-engine/telemetry`, que retorna **HTTP 404 Not Found** no backend. Além disso, a função possui um guarda `if (!isCommandViewActive()) return;`, o que impede a hidratação da barra superior (`#v10AgentsVal`, `#v10MissionsVal`, `#v10TasksVal`, `#v10SysStatus`) e do rodapé (`#gaugeCpuVal`, `#gaugeMemVal`, `#gaugeDiskVal`, `#gaugeNetVal`, `#fenixTickerState`) quando o sistema inicia na tela padrão `#city`.
   - **Payloads Massivos e Contenção de I/O no Backend:**
     - `GET /api/v2/graph/data` retorna **1,74 MB** (`1.739.969 bytes`) em `1570ms` porque despeja todos os nós e arestas sem paginação ou limite padrão.
     - `GET /api/v2/jobs` retorna **225 KB** (`225.753 bytes`) em `1602ms`.
     - `GET /api/fenix/projects` leva `2900ms` e `GET /api/agents/panel` leva `2588ms` sob concorrência no boot.
   - **Conflito de DOM na Tela de Memória (`#view-memory`):**
     - `memory-live.js` executa `view.replaceChildren()`, destruindo a barra das 7 camadas cognitivas (`#fenixMemoryLayers`), o container operacional (`#fenixMemoryOperationalContainer` com `.fenix-mem-tab-btn`) e `#fenixMemoryErrorNotice`, substituindo a tela por um layout esparso que exige download de 1,74 MB antes de exibir dados e que deixa a seção de Memórias Persistentes vazia até que o usuário digite uma busca manual.
   - **Bug Crítico na Execução de Missões (`grg/src/missions/mission-kernel.js`):**
     - Em `MissionKernel.start()`, o método `this.#event(mission, 'MISSION_STARTED', null, {...}, 'mission-kernel', (state) => { state.status = 'RUNNING'; })` passa um 6º argumento `mutator`, mas a assinatura de `#event(mission, type, step, data, actorId)` aceita apenas 5 argumentos e ignora o `mutator`. Consequentemente, `current.status` permanece `'PLANNED'`, o loop de despacho de steps nunca executa, e todas as missões criadas ficam congeladas em `PLANNED (0%)`.
   - **Artefatos Visuais Indesejados na Cidade 3D (`fenix-world-3d.js` e `city-reality-engine.js`):**
     - `_initDataFlowPipelines()` cria vigas escuras (`0.3m x 0.3m` com material `dockBumper` / `cyberMullion`) suspensas no ar em `y = 10`, atravessando o céu da cena como um "fio preto" cortando a imagem.
     - A pílula `#fenixCityNavPill` é criada vazia no topo do canvas sem conteúdo até interação posterior, aparecendo como um bloco escuro vazio no centro superior da tela.
     - O painel `#creOverlayRoot` (`city-reality-engine.js`) inicia com placeholders `"Carregando telemetria..."` e `"Conectando ao Project Kernel..."` e faz chamadas redundantes pesadas que atrasam a hidratação.

---

### 2. Classificação de Realidade por Subsistema e Tela

| Subsistema / Tela | Classificação Atual | Evidência Empírica Coletada | Causa Raiz / Defeito |
| :--- | :--- | :--- | :--- |
| **1. Cidade Isométrica 3D (`#view-city`)** | **PARCIALMENTE FUNCIONAL** | WebGL renderiza, zoom/pan/click respondem, `/api/v2/living-city/agents` retorna 200 OK (101 KB). Porém, screenshot mostra cabo preto aéreo, pílula vazia no topo, placeholders `"Carregando telemetria..."` na direita e `"MAPA OPERACIONAL - TELEMETRIA INDISPONÍVEL"` na esquerda. | 1) `_initDataFlowPipelines()` desenha viga preta em `y=10`. 2) `#fenixCityNavPill` renderiza sem texto inicial. 3) `CITY_DEFAULT_DISTANCE=152` afasta demais ou estado antigo na VPS aproximava demais no telhado. 4) Overlays HUD demoram ou falham ao hidratar. |
| **2. Centro de Comando (`#view-command`)** | **PARCIALMENTE FUNCIONAL** | KPIs de Missões/Uptime carregam via `/api/overview`, porém `updateRealityEngineData()` recebe `404` em `/api/v2/reality-engine/telemetry` e cards de CPU/RAM/Agentes ficam em `—` ou `UNAVAILABLE`. | Rota `/api/v2/reality-engine/telemetry` inexistente (404) e guarda `isCommandViewActive()` bloqueando atualização global. |
| **3. Operações & Missões (`#view-operations`)** | **PARCIALMENTE FUNCIONAL** | `operations-live.js` carrega `/api/v2/jobs` (225 KB) e `/api/workers`, mas criação/execução de missão via `MissionKernel.start()` trava em `PLANNED`. | Bug no 6º parâmetro `mutator` de `MissionKernel.#event` impede transição para `RUNNING` e despacho real de tarefas. |
| **4. Projetos (`#view-projects`)** | **PARCIALMENTE FUNCIONAL** | `/api/fenix/projects` retorna 200 OK com projetos reais, mas leva `2,9s` sob concorrência; na captura anterior a tela ainda exibia `"Carregando projetos..."`. | Latência de `/api/fenix/projects` e ausência de pré-carregamento/cache compartilhado no `project-hub-live.js`. |
| **5. Memória & Conhecimento (`#view-memory` / `#view-knowledge`)** | **PARCIALMENTE FUNCIONAL** | `/api/v2/graph/stats` retorna 887 nós e 5746 relações em `218ms`, mas `/api/v2/graph/data` transfere **1,74 MB**; `memory-live.js` destrói `#fenixMemoryLayers` e deixa "Memórias Persistentes" vazio sem busca. | Payload excessivo em `/api/v2/graph/data` sem limite default e `view.replaceChildren()` apagando as 7 camadas cognitivas Reborn e lista inicial de memórias. |
| **6. Runtime & Workers (`#view-runtime`)** | **PARCIALMENTE FUNCIONAL** | Sub-abas (`Workers`, `Jobs & Fila`, `Auto-Evolução`, ` Providers`, `Gêmeo Digital`) existem, mas o carregamento inicial depende de clique ou sofre atraso de `/api/v2/jobs`. | Hidratação tardia ao entrar na view e ausência de resumo imediato de workers/filas/circuit-breakers. |
| **7. Agentes (`#view-agents`)** | **PARCIALMENTE FUNCIONAL** | `/api/agents/panel` retorna 200 OK (`2588ms`) e `/api/v2/living-city/agents` retorna 62 agentes, mas a lista no modal/view fica presa em `"Consultando runtime..."` durante vários segundos. | `loadAgentsViewData()` em `fenix-v11-interactions.js` aguarda `/api/agents/panel` lento sem usar os dados de agentes já carregados ou otimizar a rota. |
| **8. IDE & Código (`#view-ide`)** | **FUNCIONAL COM EVIDÊNCIA** | `project-ide-live.js` carrega árvore de arquivos real (`/api/ide/files`), abre arquivos (`/api/ide/file`), edita e salva com persistência real. | Necessita apenas garantir abertura imediata do primeiro arquivo real ao entrar na view para não exibir painel central vazio. |
| **9. MCP & Ferramentas (`#view-mcp`)** | **PARCIALMENTE FUNCIONAL** | Catálogo MCP renderiza servidores configurados, mas precisa exibir status de saúde real, tools disponíveis e ação de teste verificável. | Melhorar densidade informacional e feedback de invocação/diagnóstico real. |
| **10. Browser Automation (`#view-browser`)** | **PARCIALMENTE FUNCIONAL** | Controles de URL e captura existem, mas estado inicial fica vazio até interação. | Hidratar histórico/status de automação e permitir inspeção/probe real de URL com resultado visível. |
| **11. Observabilidade (`#view-observability`)** | **PARCIALMENTE FUNCIONAL** | `observatory-client.js` consulta `/api/v2/observatory/summary` (200 OK), mas tela inteira fica presa em `"Consultando runtime..."` se `window.ObservatoryClient.refresh()` não for acionado deterministicamente no `showView('observability')`. | Garantir gatilho determinístico em `showView('observability')` e renderizar métricas de latência, eventos, custos e saúde dos subsistemas. |
| **12. Terminal (`#view-terminal`)** | **FUNCIONAL COM EVIDÊNCIA** | Executa comandos reais via `/api/terminal/exec` / `/api/command` e exibe saída real. | Pré-popular saída inicial com diagnóstico real do sistema (`status`, `uptime`, `workers`) ao abrir a view para eliminar tela preta vazia. |
| **13. FlowGraph (`#view-flowgraph`)** | **PARCIALMENTE FUNCIONAL** | Renderiza grafo de execução de arquitetura/fluxo, mas precisa refletir contagens reais de missões, agentes e pipelines ativos do runtime. | Conectar nós do FlowGraph aos contadores reais do runtime (`/api/overview` e `/api/v2/city/state`). |

---

## FASE 1 — ESPECIFICAÇÃO DE ALVO VISUAL E FUNCIONAL MENSURÁVEL

### 1. Direção Artística e Critérios Visuais da Cidade Isométrica 3D (`#view-city`)

1. **Enquadramento Inicial e Câmera (`Camera & Framing`):**
   - Distância padrão calibrada (`CITY_DEFAULT_DISTANCE = 112`) com elevação isométrica (`0.58 rad`) e azimute (`Math.PI / 4`), enquadrando o **Fênix HQ** no centro, **Depósito Mais** à direita, **API Platform** e **AI Nexus** à esquerda/fundo, **Project Forge** e **Memory Vault** à frente, ocupando >80% da área útil do canvas sem grandes vazios cinzentos.
   - Zoom suave com limites seguros (`12m` a `220m`), pan contínuo sem perda de centro, rotação orbital de 90° e botão de reset imediato.
2. **Eliminação de Artefatos Visuais e Poluição de HUD:**
   - **Zero cabos pretos aéreos:** Os dutos de fibra óptica entre distritos devem correr embutidos no solo (`y = 0.08m`) como canais luminosos ciano/âmbar com pulsos de dados ao nível da avenida (`y = 0.22m`), nunca cruzando o céu na frente da câmera.
   - **Zero pílulas vazias:** `#fenixCityNavPill` permanece oculto (`display: none`) quando não há sub-contexto ativo, ou exibe o breadcrumb real do distrito selecionado.
   - **HUD Enxuto e 100% Hidratado:** Nenhum painel sobreposto à cidade pode exibir `"Carregando telemetria..."`, `"Conectando ao Project Kernel..."` ou `"TELEMETRIA INDISPONÍVEL"`. Todos os contadores (`Agentes`, `Prédios`, `Missões`, `Eventos`, `Fast Lane`, `Job Lane`) devem exibir os números reais do runtime em `< 1.5s`.
3. **Arquitetura Reconhecível por Distrito e Mundo Vivo:**
   - **Central Fênix HQ (`command-center`):** Torre executiva escalonada em vidro azul-ciano com anéis luminosos de fachada, heliponto, antena de comando, praça cívica arborizada, espelho d'água iluminado e pórtico de entrada.
   - **Depósito Mais (`logistics`):** Hub logístico industrial com telhado em shed metálico, docas numeradas (`DOCA 1..3`), carretas estacionadas, empilhadeira animada (`Toyota 8FBE20`) em operação contínua, racks porta-paletes de 3 níveis, esteira luminosa de pacotes e agentes operacionais (`Supervisora Camila`, `Operador de Doca`, `Especialista WMS André`).
   - **API Platform (`api-platform`):** Edifício tecnológico de 4 andares com cutaway inteligente por andar (Lobby, Operações API, Sala Cofre/Racks 42U SRE, Laboratório Neural AI Core), dutos ópticos verticais e 7 agentes especialistas.
   - **AI Nexus (`ai-district`), Dev Loft (`dev-district`), Project Forge (`project-district`), Memory Vault (`data-center`), Observatório (`observatory`):** Silhuetas distintas, iluminação arquitetônica dedicada, calçadas, árvores e sinalização clara sem colisão de rótulos.

### 2. Critérios de Aceitação de Densidade Funcional nas 14 Views (Fase 3 e Fase 4)

- **Proibição Absoluta de Placeholders Persistentes:** Após `2500ms` da abertura de qualquer view, o texto visível da página NÃO pode conter `"Carregando dados..."`, `"Consultando runtime..."`, `"Carregando telemetria..."`, `"Conectando ao Project Kernel..."` ou `"TELEMETRIA INDISPONÍVEL"`.
- **Fluxo E2E de Missão Verificável:** Criar uma missão via `POST /api/missions` ou pela UI deve transicionar imediatamente para `RUNNING`, despachar steps reais no `MissionKernel`, emitir eventos auditáveis em `/api/missions/:id/events` e refletir na UI.
- **Bateria de Certificação Playwright:** Testes automatizados reais em `1440x900` e `1280x720` validando todas as views, interações na cidade, criação/execução de missão, inspeção de agente, consulta de memória com as 7 camadas cognitivas, zero erros de console/pageerror e gravação dos **Vídeo A (Cidade)** e **Vídeo B (Sistema Completo)**.
