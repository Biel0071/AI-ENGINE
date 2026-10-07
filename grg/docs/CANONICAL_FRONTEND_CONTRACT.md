# CONTRATO CONSTITUCIONAL DO FRONTEND CANÔNICO DO FÊNIX OS
**Status:** ATIVO E VIGENTE  
**Escopo:** Universal (Modelos, Agentes, Desenvolvedores e Runtimes)  
**Single Source of Truth:** `ai-engine/grg/public/index.html`

---

## 1. Fonte Canônica Única Inviolável
1. O **ÚNICO** frontend oficial, executável, publicado e editável de todo o ecossistema Fênix OS reside exclusivamente em:
   `ai-engine/grg/public/index.html` (e seus módulos complementares em `ai-engine/grg/public/`).
2. É expressamente proibido:
   - Criar arquivos HTML adicionais que funcionem como dashboards paralelos (ex.: `*dashboard*.html`, `preview_*.html`, `world_*.html`).
   - Importar frameworks de CSS via CDN (como Tailwind CDN) ou bibliotecas de interface concorrentes que descaracterizem os design tokens canônicos (`#050810`, `var(--fenix-...)`, `unified.css`, `command-center.css`, `fenix-world-3d.css`).
   - Servir qualquer aplicação paralela de frontend em portas ou rotas alternativas.
3. Todas as capacidades do sistema pertencem às **14 Views Canônicas** nativas:
   - `view-command`: Central de Operações, Command Bar unificado, telemetria de missões e log de decisões.
   - `view-city`: AI Living City e Digital Twin 3D (Three.js WebGL / Pixi 2.5D).
   - `view-agents`: Esquadrão autônomo, registro de competências e status da frota.
   - `view-ide`: Ambiente de desenvolvimento integrado com editor de código e preview real.
   - `view-operations`: Fila de jobs, workers BullMQ e orquestração de tarefas.
   - `view-runtime`: Monitoramento do kernel, infraestrutura, banco de dados e Redis.
   - `view-projects`: Hub de projetos, espelhamento de repositórios e branches Git.
   - `view-memory`: Grafo de conhecimento cognitivo, memória episódica e vetorial.
   - `view-knowledge`: Biblioteca de padrões e arquiteturas consolidadas.
   - `view-mcp`: Conectores de ferramentas e protocolo de contexto.
   - `view-browser`: Navegador headless Playwright e automação web.
   - `view-observability`: Métricas de latência, consumo de tokens e saúde do sistema.
   - `view-terminal`: Terminal host com execução remota e interativa.
   - `view-flowgraph`: Grafo de dependências e fluxo de tarefas.

---

## 2. Invariante de Realidade do Living World (Backend como Autoridade)
1. **O World Runtime reside exclusivamente no Backend/Kernel**:
   - O estado do mundo é mantido pelo `WorldStateEngine` (`ai-engine/grg/src/world-model/world-state-engine.js`).
   - O `World View` (`fenix-world-3d.js` e `iso-city.js`) é **estritamente uma projeção visual** do estado real do sistema.
   - O frontend nunca cria uma realidade paralela nem altera estados sem comando emitido e validado pelo backend.
2. **Zero-Mock & Ausência Honesta**:
   - É proibido criar fallbacks de simulação local no cliente (ex.: "executado localmente em modo preview" ou "mock success").
   - Se a API falhar, o frontend reporta o erro factual retornado ou ausência honesta (`—`).
   - É proibido hardcodar contagens de prédios, agentes ou memórias no HTML/JS. Todos os dados são derivados do estado vivo (`world.buildings.length`, `world.agents.length`, etc.).
3. **Fluxo Unificado de Eventos**:
   - Existe exatamente um fluxo realtime via Server-Sent Events (SSE) conectado a `/api/v2/events/stream` ou `/api/v2/living-city/events/stream`.
   - Mutações espaciais disparam eventos reais pelo `globalBus` (`world.building.created`, `world.agent.created`, `world.agent.moved`, `world.command.executed`), e a visualização 3D/2.5D atualiza via Hot World Mutation sem reload de página.
4. **Porta de Entrada Oficial de Comandos**:
   - A Command Bar canônica (`#fenixCmdIntentInput` e `#fenixOmniPrompt`) é a única interface de despacho de comandos em linguagem natural do operador.
   - O `WorldIntentPlanner` compila intenções em comandos declarativos executados pelo `WorldCommandEngine`.
5. **Contrato de Ciclo de Vida de 9 Perguntas**:
   - Todo agente no mundo responde ao contrato de 9 eixos de identidade, consultável pelo endpoint oficial `/api/v2/living-city/agent/:id/lifecycle` e inspecionável diretamente no `#fenixWorldAgentInspector` (em `view-city`) e no `#fenixCockpitInspector` (em `view-command`).

---

## 3. Topologia de Produção Oficial (VPS `209.50.241.22`)
- **Backend Oficial**: Porta `4410` (PM2 #5 `fenix-backend`) em `/opt/fenix-os/grg/src/server.js`.
- **Frontend Oficial**: Porta `3000` (PM2 #6 `fenix-frontend`) servindo com paridade dual de 100% entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.
- **Worker de Evolução**: PM2 #7 `fenix-evolution-worker`.
- **Supervisor de Integridade**: PM2 #8 `fenix-supervisor`.
- É expressamente vedado criar processos PM2 ou servidores HTTP paralelos para subsistemas de interface.
