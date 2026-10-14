# FÊNIX OS — MAPA ARQUITETURAL COMPLETO DO FRONTEND

> **DOCUMENTO OFICIAL DE NAVEGAÇÃO, EVOLUÇÃO E ENGENHARIA VISUAL**
> **Versão:** 4.0 Living World & Cognitive Spatial Engine  
> **Localização Canônica:** `ai-engine/grg/public/`  
> **Constituição:** [CONSTITUICAO_FENIX_CEC.md](file:///c:/projetos/ai-engine-core/ai-engine/docs/CONSTITUICAO_FENIX_CEC.md) | [GEMINI.md](file:///c:/projetos/ai-engine-core/GEMINI.md)

---

## 1. Princípios Fundamentais & Invariantes Constitucionais

1. **Fonte Canônica Única da Verdade (Single Source of Truth)**
   - O **ÚNICO** frontend oficial, executável e editável de todo o sistema reside exclusivamente em `ai-engine/grg/public/index.html` e seus módulos em `ai-engine/grg/public/`.
   - É expressamente proibido criar arquivos HTML ou shells adicionais em `scratch/`, na raiz ou em diretórios temporários.
   - O guardião automatizado `node ai-engine/grg/test/architecture-guard.test.js` bloqueia qualquer tentativa de deploy se detectar duplicatas.

2. **Zero-Mock & Honestidade de Telemetria**
   - O HTML/JS servido ao usuário nunca deve conter dados inventados ou fixados artificialmente.
   - Todo slot inicial de dado dinâmico deve exibir o marcador honesto de ausência (`—`).
   - O teste `node --test ai-engine/grg/test/frontend-honesty.test.js` valida 19 invariantes factuais de forma rigorosa.

3. **Vanilla JS Modular de Alta Performance**
   - O frontend opera em **Vanilla JavaScript ES6+ Puro**, sem frameworks pesados (sem React, Vue, Angular ou Next.js), garantindo carregamento instantâneo, renderização a 60 FPS e controle total sobre o ciclo de vida do DOM e do Canvas.
   - 14 Views integradas em um único Single-Page Application (SPA).

4. **Engine 2.5D Isométrica Habitável (Habbo / Tibia Reference)**
   - Projeção 2:1 (`TILE_W = 64px, TILE_H = 32px`).
   - Pipeline de pixel art com integer snapping e nearest-neighbor para nitidez absoluta.
   - Ordenação estrita em profundidade pelo algoritmo do pintor (Y-sorting).
   - Renderização contínua de terreno, arquitetura detalhada, interiores em cutaway, estações de trabalho e personagens com animações de 7 estados.

---

## 2. Visão Panorâmica da Árvore de Módulos (`ai-engine/grg/public/`)

```
ai-engine/grg/public/
│
├── 🌐 NÚCLEO, BOOTSTRAP & ROTEAMENTO
│   ├── index.html                   # Shell canônico único (hosts 14 views, navbars, modais)
│   ├── unified-app.js               # Orquestrador central de views, roteamento, autenticação e SSE
│   ├── fenix-operational-os.js      # Controlador de estado reativo, barramento de eventos e sincronização
│   ├── fenix-core-controller.js     # Mediador de janelas, modais, toolbars e atalhos
│   ├── fenix-bootstrap.js           # Bootstrapper inicial (validação de token, health check)
│   └── login.html                   # Portal de autenticação corporativa
│
├── 🏙️ WORLD & CITY RENDERING ENGINES
│   ├── iso-city.js                  # Controlador do Canvas da Cidade Isométrica (#cityCanvas)
│   ├── fenix-pixel-engine.js        # Engine de Pixel Art 2.5D (Habbo/Tibia) - 5.883 linhas de assets
│   ├── office-live.js               # Munder Difflin Living Office (Workstations, Chat cognitivo, Memória)
│   ├── premium-world-live.js        # Cliente de sincronização de estado do mundo (/api/v2/living-city)
│   ├── city-reality-engine.js       # Verificador de realidade física vs operacional
│   ├── fenix-world-3d.js            # Projeção espacial Three.js / WebGL
│   ├── unreal-world-live.js         # Controlador de iluminação e atmosfera espacial
│   └── pixi-city-renderer.js        # Pipeline acelerado por GPU (PixiJS)
│
├── 🏢 AS 14 VIEWS CANÔNICAS INTEGRADAS
│   ├── command-center.js            # View 1: Command Center (Cockpit executivo, KPIs, ciclo autônomo)
│   ├── [iso-city.js]                # View 2: City View (Mundo 2.5D vivo, agentes, empresas, obras)
│   ├── [office-live.js]             # View 3: Agents View (Diretório de agentes, estados, inspectores)
│   ├── project-ide-live.js          # View 4: IDE Developer (Editor Monaco, syntax highlighting, run code)
│   ├── fenix-visual-ide.js          # Complemento visual da IDE
│   ├── ide-enhancer.js              # Árvore de arquivos e terminal interativo
│   ├── operations-live.js           # View 5: Daily Operations (Rotinas 24/7, crons, jobs em fila)
│   ├── runtime-cockpit.js           # View 6: Runtime Engine (Processos PM2, telemetria de CPU/RAM)
│   ├── live-runtime.js              # Gauge de saúde do runtime e latência de loop
│   ├── project-hub-live.js          # View 7: Project Hub (DNA de projetos, repositórios, tarefas)
│   ├── project-hub-controller.js    # Controlador de integração com Git e pipelines
│   ├── memory-live.js               # View 8: Memory Vault (Memória episódica, semântica, Qdrant/vetorial)
│   ├── observatory-client.js        # View 9 & 12: Knowledge & Observability (Grafos, logs, CI/CD)
│   ├── marketplace-live.js          # View 10: MCP Marketplace (Catálogo de skills, tools e servidores MCP)
│   ├── dev-pipeline-client.js       # View 11: Browser / Quality Pipeline (Auditoria e testes)
│   ├── unified-app.js (terminal)    # View 13: Terminal Headless (Streaming bash/powershell)
│   └── fenix-flow-graph.js          # View 14: Flow Graph (Grafo visual de orquestração de enxame)
│
├── 🎨 ARQUITETURA DE ESTILOS & SISTEMA DE DESIGN (CSS)
│   ├── unified.css                  # Folha mestre de tema (tokens HSL, glassmorphism, reset, flex/grid)
│   ├── fenix-design-system.css      # Componentes do design system (botões, inputs, cards, pills, badges)
│   ├── city-reality.css             # Estilização do HUD da cidade, minimapa e pinos
│   ├── office.css                   # Estilização das mesas de escritório, chat espacial e inspetor
│   ├── command-center.css           # Estilos do cockpit executivo
│   ├── project-hub-live.css         # Estilos da vitrine de projetos
│   ├── project-ide-live.css         # Estilos da IDE de código
│   ├── fenix-flow-graph.css         # Estilos do visualizador de grafos de nós
│   ├── operations-live.css          # Estilos do painel de operações 24/7
│   ├── memory-live.css              # Estilos do explorador de memória
│   └── fenix-window-overrides.css   # Regras de sobreposição responsiva e modais
│
└── 🧩 COMPONENTES COMPLEMENTARES
    ├── fenix-mascot-sidebar.js      # Assistente IA lateral flutuante
    ├── fenix-command-palette.js     # Paleta de comandos global (Ctrl+K)
    ├── connections-panel.js         # Painel de conexões de rede e gateways
    └── fenix-city-event-adapter.js  # Adaptador de eventos de barramento para a cidade
```

---

## 3. As 4 Camadas da Cidade Viva (Living World Architecture)

A Cidade do Fênix não é um mapa estático ou uma imagem isolada. Ela é uma **projeção espacial 2.5D viva de um motor computacional contínuo em 4 camadas**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ CAMADA 4: REAL AGENT RUNTIME & COGNITIVE INTERACTION                   │
│ - office-live.js, fenixShowWorldAgentInspector, Spatial Chat           │
│ - Camila, André, Marcos, CEO com memória episódica isolada e skills    │
├────────────────────────────────────────────────────────────────────────┤
│ CAMADA 3: CANVAS VISUAL ENGINE & 2.5D PIXEL PIPELINE                   │
│ - iso-city.js (Camera, Zoom 0.35x..4.2x, Y-sorting, Frustum Culling)   │
│ - fenix-pixel-engine.js (Terreno 51x51, Prédios, Props, Habbo Avatars) │
├────────────────────────────────────────────────────────────────────────┤
│ CAMADA 2: 24/7 SIMULATION ENGINE (BACKEND NODE.JS)                     │
│ - world-simulation-engine.js                                           │
│ - Máquina de estados: IDLE -> RECEIVING_TASK -> WALKING -> WORKING... │
│ - Rotas de veículos (Caminhões Depósito Mais, Drones, Trens)           │
│ - Obras progressivas: FOUNDATION -> STRUCTURE -> FINISHING -> ACTIVE   │
├────────────────────────────────────────────────────────────────────────┤
│ CAMADA 1: PERSISTENT WORLD STATE & ATOMIC MUTATIONS                    │
│ - world-state-engine.js (Gravado em .data/world-state.json)            │
│ - Mutações canônicas: CREATE, UPDATE, MOVE, BUILD, ASSIGN_TASK, CHAT   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Guia Rápido de Edição e Evolução

### Como Adicionar um Novo Prédio / Distrito
1. **Defina a Coordenada Isométrica:**
   - Em `ai-engine/grg/public/iso-city.js` no array `CANONICAL_DISTRICTS`, registre o ID, nome, cor, ícone e posições `(x, y)` na grade 2.5D.
2. **Desenhe a Fachada Pixel Art:**
   - Em `ai-engine/grg/public/fenix-pixel-engine.js`, na função `initBuildings()`, utilize o helper de desenho pixel a pixel para gerar a fachada (`Cache.buildings.meuPredio`).
3. **Instancie no Loop de Renderização:**
   - No método `_drawLivingPixelWorld()` de `iso-city.js`, adicione `addBuilding(Cache.buildings.meuPredio, gx, gy, sortOffset, largura, altura, 'meu-predio-id')`.
4. **Adicione as Mesas e Estações Internas:**
   - Em `office-live.js`, adicione as estações no dicionário `CANONICAL_AGENT_STATIONS` com coordenadas `(x, y, floor, bldKey)`.

### Como Adicionar ou Modificar um Agente
1. **Registrar no World State Engine:**
   - Em `ai-engine/grg/src/world-model/world-state-engine.js`, adicione o agente no catálogo com ID, nome, empresa, habilidades, ferramentas e estação inicial.
2. **Definir o Visual do Avatar:**
   - Em `fenix-pixel-engine.js`, configure a paleta do agente no mapeamento de avatares (tom de pele, estilo de cabelo, uniforme, acessórios).
3. **Comportamento Autônomo:**
   - No `world-simulation-engine.js`, o agente automaticamente herda o ciclo de vida `IDLE -> WALKING -> WORKING -> THINKING -> REPORTING`.

### Como Alterar a Câmera e o Nível de Zoom
- `iso-city.js` suporta zoom suave de `0.35x` (visão macro de toda a ilha metropolitana) até `4.2x` (zoom profundo até a xícara de café na mesa de trabalho).
- Para focar e dar zoom programático em um agente:
  ```javascript
  window.fenixCity.followAgent('agent-camila');
  window.fenixCity.state.targetCamera.zoom = 3.4;
  ```

---

## 5. Bateria de Verificação Obrigatória (Quality Gates)

Antes de considerar qualquer modificação de frontend concluída, execute obrigatoriamente:

```powershell
# 1. Validação de sintaxe JS pura
node -c ai-engine/grg/public/unified-app.js
node -c ai-engine/grg/public/iso-city.js
node -c ai-engine/grg/public/office-live.js
node -c ai-engine/grg/public/fenix-pixel-engine.js

# 2. Testes de integridade constitucional e zero-mock
node ai-engine/grg/test/architecture-guard.test.js
node --test ai-engine/grg/test/frontend-honesty.test.js
node --test ai-engine/grg/test/frontend-runtime-safety.test.js
node --test ai-engine/grg/test/living-world-four-layers.test.js
node --test ai-engine/grg/test/company-brain-reality.test.js

# 3. Sincronização da Memória Ativa Oficial
node ai-engine/grg/scripts/sync-active-memory.js
```
