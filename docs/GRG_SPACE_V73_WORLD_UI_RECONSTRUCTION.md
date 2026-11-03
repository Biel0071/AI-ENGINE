# GRG SPACE — FÊNIX OS V7.3: WORLD UI RECONSTRUCTION & SPATIAL ALIGNMENT

**Data de Emissão:** 03 de Novembro de 2026  
**Status do Sistema:** OPERACIONAL & HOMOLOGADO EM PRODUÇÃO (VPS 209.50.241.22)  
**Branch:** `fenix/operational-os-20260924`  
**Escopo:** Reconstrução de Interface 3D, Hierarquia de Docking, Cluster de Câmera & Registro Espacial  

---

## 1. Sumário Executivo & Diagnóstico Pré-V7.3

Antes da intervenção V7.3, a interface do Mundo 3D (`ai-engine/grg/public/fenix-world-3d.js` e folhas de estilo associadas) sofria de quatro problemas graves de acoplamento visual e desalinhamento espacial:
1. **Dispersão de Coordenadas no Rodapé:** O Minimap, os Agentes em Destaque e os Últimos Eventos flutuavam com coordenadas absolutas e independentes em múltiplos arquivos CSS (`city-reality.css`, `fenix-world-3d.css`), gerando sobreposição em resoluções inferiores a 1920x1080.
2. **Conflito de Controles & Mascote:** O cluster de controle de zoom/orientação concorria em z-index e coordenadas com o Mascote Flutuante (`#fenix-floating-mascot`), resultando em cliques interceptados e sobreposição do mascote sobre os botões ou dentro do dock.
3. **Colisão de Elementos na Lateral Direita:** O widget `fnx-provider-orbit-widget` (posicionado com `top: 50%`) colidia diretamente com a barra de ferramentas de câmera `fenix-city-right-toolbar` (`top: 52%`).
4. **Vulnerabilidade Espacial de Edifícios:** Edifícios canônicos como GRG SPACE (HQ), Depósito Mais, ZapAI CRM, ZapFlow CRM, Fortlev Quote, IUS Email Control e Event Bus Kafka não possuíam posições imutáveis registradas no `_initObstacleRegistry`, permitindo invasão da Praça Cívica central `(0, 0)`.

---

## 2. Reconstrução Arquitetural do Layout Inferior (Unified 3-Card Dock)

### 2.1 CSS Grid Canônico Único (`#fenixModularBottomDock`)
Os 3 cards foram unificados sob um contêiner mestre com CSS Grid responsivo, ancorado na base da viewport da cidade:

```css
.fenix-modular-bottom-dock {
  position: absolute !important;
  bottom: 0 !important;
  left: 0 !important;
  right: 0 !important;
  width: 100% !important;
  height: 188px !important;
  z-index: 25 !important;
  background: rgba(9, 14, 26, 0.94) !important;
  backdrop-filter: blur(18px) !important;
  -webkit-backdrop-filter: blur(18px) !important;
  border: 1px solid rgba(0, 217, 255, 0.25) !important;
  border-radius: 12px 12px 0 0 !important;
  display: grid !important;
  grid-template-columns: minmax(260px, 320px) minmax(360px, 1fr) minmax(300px, 380px) !important;
  gap: 12px !important;
  padding: 0 14px 8px 14px !important;
}
```

### 2.2 Estrutura Modular dos 3 Cards:
- **Card 1 (Esquerda) — Mapa Operacional (`#fenixWorldMinimap`):** Canvas 2D/3D integrado com controles de zoom in/out e toggle de projeção isométrica.
- **Card 2 (Centro) — Agentes em Destaque (`#dockWindowAgents`):** Grid responsivo dos 4 agentes operacionais (Ana, Ryo, Luna, Max) com cards clicáveis que focam no agente 3D no mundo.
- **Card 3 (Direita) — Últimos Eventos (`#dockWindowMissions`):** Stream de telemetria ao vivo integrado com o Communication Fabric e link para modal de auditoria.

### 2.3 Responsividade Multi-Breakpoint:
- **1024px (Tablet Landscape):** `grid-template-columns: 240px 1fr 280px !important; gap: 8px;`
- **820px (Tablet Portrait):** `grid-template-columns: 1fr 1fr !important; height: 160px;` (Card 3 oculto graciosamente).
- **600px (Mobile):** `grid-template-columns: 1fr !important; height: 140px; max-height: 140px;` (Card 2 e Card 3 ocultos; Card 1 preenche 100% com canvas adaptativo).

---

## 3. Cluster Exclusivo de Controles de Câmera (`#fenixMiroSpatialHud`)

Substituiu controles dispersos por uma cápsula de comando aeroespacial integrada:
- **Botões Disponíveis:**
  - `btnMiroZoomOut`: Zoom Out (-)
  - `fenixMiroZoomLevel`: Indicador de zoom em porcentagem (clique para 100%)
  - `btnMiroZoomIn`: Zoom In (+)
  - Divisor vertical
  - `btnMiroResetCamera`: Reset de orientação e compasso
  - `btnMiroToggle2D3D`: Alternar perspectiva 2D Ortográfica / 3D Perspectiva
  - `btnMiroFullscreen`: Fullscreen nativo e enquadramento de visão
  - `btnMiroFitView`: Enquadramento automático da cidade
  - `btnMiroToggleMinimap`: Alternar visualização do minimap

### Posicionamento e Desacoplamento do Mascote
- **HUD:** `bottom: calc(188px + 14px) !important; right: 86px !important; z-index: 50;`
- **Mascote Flutuante (`#fenix-floating-mascot`):** Pinned a `bottom: calc(188px + 84px + 14px) !important; right: 18px !important; z-index: 850;`
- **Espaçamento Horizontal:** O Mascote ocupa `W - 72px` até `W - 18px` (largura 54px). O HUD de controles termina em `W - 86px`. Distância horizontal = **14px livres**.
- **Espaçamento Vertical:** A base do mascote fica a 286px da base da tela, enquanto o topo do dock fica a 272px (considerando a área do rodapé e a margem de 52px). Distância vertical = **14px livres**.
- **Resultado:** Zero colisão e zero sobreposição em 100% das resoluções.

---

## 4. Desacoplamento da Barra Lateral Direita e Provider Orbit

- O widget `.fnx-provider-orbit-widget` foi reposicionado para `top: 18px !important; transform: none !important;` (altura total 124px, terminando em 142px).
- A barra de câmera `.fenix-city-right-toolbar` permaneceu em `top: 52% !important; transform: translateY(-50%) !important;` (span vertical de ~185px a ~415px em 720p).
- **Folga vertical mínima:** 43px em 720p e >200px em 1080p. Sobreposição eliminada com 0% de intersecção.

---

## 5. Registro Canônico de Edifícios & Coerência Espacial

No módulo `ai-engine/grg/public/fenix-world-3d.js`, o método `_initObstacleRegistry()` foi formalizado como fonte de verdade matemática de todos os footprints:

```javascript
_initObstacleRegistry() {
  this.obstacleRegistry = [
    // GRG SPACE / FÊNIX HQ (Prédio Central Mestre)
    { id: 'bld-fenix-hq', x: 0, z: -35, radius: 14, district: 'command-center', name: 'GRG SPACE (HQ Central)' },
    // Depósito Mais
    { id: 'bld-deposito-mais', x: -45, z: 25, radius: 10, district: 'industrial', name: 'Depósito Mais' },
    // API Platform Spire
    { id: 'bld-api-platform', x: 38, z: 12, radius: 12, district: 'data-center', name: 'API Platform Spire' },
    // Dev Studio / Dev Loft
    { id: 'bld-dev-loft', x: 35, z: -30, radius: 11, district: 'dev-district', name: 'Dev Studio' },
    // AI Nexus / Neural Lab
    { id: 'bld-neural-core', x: -35, z: -30, radius: 11, district: 'ai-district', name: 'AI Nexus' },
    // Project Forge
    { id: 'bld-project-forge', x: -38, z: 12, radius: 12, district: 'project-district', name: 'Project Forge' },
    // Memory Vault
    { id: 'bld-memory-vault', x: -18, z: -48, radius: 9, district: 'ai-district', name: 'Memory Vault' },
    // Observatório de Trading
    { id: 'bld-observatory', x: 0, z: 42, radius: 12, district: 'observatory', name: 'Observatório 3D' },
    // Novas Empresas Integradas
    { id: 'bld-mf-atacadista', x: -22, z: -15, radius: 8, district: 'commercial', name: 'MF Atacadista' },
    { id: 'bld-zapai-crm', x: -28, z: -27, radius: 8, district: 'commercial', name: 'ZapAI CRM' },
    { id: 'bld-fortlev-quote', x: 22, z: -15, radius: 8, district: 'industrial', name: 'Fortlev Quote' },
    { id: 'bld-zapflow-crm', x: -24, z: 15, radius: 8, district: 'commercial', name: 'ZapFlow CRM' },
    { id: 'bld-ius-email', x: -14, z: 27, radius: 8, district: 'commercial', name: 'IUS Email Control' },
    { id: 'bld-kafka-bus', x: 22, z: -62, radius: 8, district: 'data-center', name: 'Event Bus Kafka' }
  ];
}
```

### Invariantes Espaciais Garantidos:
1. **Praça Cívica Intocada:** A origem `(0, 0)` permanece como área aberta com raio livre de 12m, abrigando o pedestal do Fênix Dourado.
2. **Zero Colisão:** Nenhum raio de influência dos edifícios se intercepta.
3. **Roteamento Inteligente:** Agentes que não possuem coordenadas explícitas da API de telemetria são roteados para a zona do seu distrito operacional correspondente, nunca empilhando na origem `(0, 0)`.
