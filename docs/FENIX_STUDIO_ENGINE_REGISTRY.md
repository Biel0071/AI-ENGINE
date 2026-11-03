# FÊNIX STUDIO ENGINE REGISTRY — ESPECIFICAÇÃO TÉCNICA E REGISTRO DE MOTORES

> **DOCUMENT ID**: `FENIX-REG-ENGINES-20261103`  
> **DATA DO REGISTRO**: 2026-11-03T19:40:00-03:00  
> **STATUS**: `ACTIVE & BINDED`

---

## 1. Motores Centrais Registrados

O ecossistema do Studio opera sob quatro subsistemas modulares de backend integrados ao Kernel do Fênix OS:

```
                                  ┌───────────────────────────────┐
                                  │      FENIX_KERNEL RUNTIME     │
                                  └──────────────┬────────────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  │                              │                              │
   ┌──────────────▼──────────────┐┌──────────────▼──────────────┐┌──────────────▼──────────────┐
   │    VisualWorkspaceEngine    ││ VideoProductionStudioEngine ││ VisualCodeBidirectionalMapper│
   │ (24 Ações, QA, Self-Evo)    ││ (NLE Tracks, FFmpeg Render) ││  (Mapeamento AST & CSSOM)    │
   └──────────────┬──────────────┘└──────────────┬──────────────┘└──────────────┬──────────────┘
                  │                              │                              │
                  └──────────────────────────────┼──────────────────────────────┘
                                                 │
                                  ┌──────────────▼──────────────┐
                                  │        BrowserSession       │
                                  │ (DOM, Screenshots, Inspect) │
                                  └─────────────────────────────┘
```

---

## 2. Registro Detalhado dos Módulos

### 2.1 `VisualWorkspaceEngine`
- **Arquivo**: `ai-engine/grg/src/visual-ide/visual-workspace-engine.js`
- **Responsabilidade**: Orquestração das 24 ações visuais dos agentes, gerenciamento de concorrência com locks granulares, execução do loop autônomo de QA em 9 etapas e submissão de propostas de auto-evolução.
- **Assinaturas Principais**:
  - `acquireElementLock(agentId, selector, operation)`: Bloqueia elemento por 30s.
  - `releaseElementLock(agentId, selector)`: Liberação idempotente.
  - `modify_css(selector, properties, options)`: Mutação cirúrgica com push para pilha de `undo`.
  - `reconstructFromSource(type, source, options)`: Síntese de tela a partir de URL, imagem ou vídeo.
  - `runAutonomousQaLoop(targetSelector, options)`: Auditoria e regressão em 9 passos.
  - `proposeSelfEvolution(proposal)`: Criação de branch isolada com aprovação humana obrigatória.

### 2.2 `VideoProductionStudioEngine`
- **Arquivo**: `ai-engine/grg/src/media/video-production-studio.js`
- **Responsabilidade**: Linha de montagem audiovisual multi-agente (Diretor, Roteirista, Editor, Motion Graphics, Áudio, QA), catalogação e thumbnailing de arquivos de vídeo, e renderização via binário FFmpeg do sistema operacional.
- **Assinaturas Principais**:
  - `getProjects()`: Retorna projetos NLE com estrutura de cenas e faixas.
  - `getMediaLibrary()`: Lista arquivos de vídeo indexados com metadados e miniaturas geradas.
  - `renderVideo(projectId, options)`: Monta pipeline de filtros FFmpeg (`scale=720:1280`, `fps=30`, `h264`, `aac`) e produz MP4 real na pasta pública de artefatos.

### 2.3 `VisualCodeBidirectionalMapper`
- **Responsabilidade**: Tradução entre coordenadas visuais/seletores CSS e arquivos de código-fonte (componentes React JSX e estilos CSS).
- **Mapeamentos Nativos**:
  - `AppHeader` ➔ `components/AppHeader.jsx`
  - `AgentGrid` ➔ `components/AgentGrid.jsx`
  - `StatCard` ➔ `components/StatCard.jsx`
  - `ActionToolbar` ➔ `components/ActionToolbar.jsx`

### 2.4 `BrowserSession`
- **Responsabilidade**: Encapsulamento da camada de automação headless Playwright com fallback determinístico quando executado em containers sem GPU/display.
- **Capacidades**: Captura de screenshots em alta resolução, inspeção de caixas delimitadoras de elementos (`bounding boxes`) e injeção de eventos de clique e digitação.

---

## 3. Catálogo de Endpoints HTTP e Contratos REST

Montados em `ai-engine/grg/src/api/visual-agent-workspace-routes.js` e plugados em `ai-engine/grg/src/server.js`:

```http
### 1. Status do Workspace
GET /api/v2/visual-workspace/status
Response: 200 OK
{
  "status": "active",
  "activeProject": "fenix-os",
  "agentsCount": 9,
  "activeLocks": [],
  "timelineEventsCount": 12
}

### 2. Executar Ação Visual de Agente
POST /api/v2/visual-workspace/action
Body:
{
  "action": "modify_css",
  "selector": ".btn-primary",
  "agentId": "visual-designer",
  "payload": { "background-color": "#00D9FF" }
}
Response: 200 OK
{
  "ok": true,
  "selector": ".btn-primary",
  "appliedProperties": { "background-color": "#00D9FF" }
}

### 3. Reconstruir Website
POST /api/v2/visual-workspace/reconstruct
Body:
{
  "type": "screenshot",
  "source": "mock_dashboard.png",
  "targetProject": "Fintech UI"
}
Response: 200 OK
{
  "ok": true,
  "type": "screenshot",
  "targetProject": "Fintech UI",
  "isEquivalentImplementation": true,
  "generatedCode": "<!DOCTYPE html>..."
}

### 4. Executar Ciclo de Visual QA
POST /api/v2/visual-workspace/qa-loop
Body:
{
  "target": "#main-nav"
}
Response: 200 OK
{
  "cycleId": "qa_loop_1793745583",
  "status": "COMPLETED",
  "verdict": "VERIFIED",
  "stepsCount": 9,
  "similarityScore": 96.5,
  "responsivePassed": true,
  "accessibilityPassed": true
}

### 5. Catálogo de Projetos de Vídeo
GET /api/v2/video-studio/projects
Response: 200 OK
[
  {
    "id": "proj_video_factory_01",
    "title": "Fênix AI Multi-Agent Reel",
    "aspectRatio": "9:16",
    "scenes": [...]
  }
]

### 6. Catálogo de Mídias e Thumbnails
GET /api/v2/video-studio/media
Response: 200 OK
[
  {
    "id": "media_01",
    "name": "Live Cursors Reference",
    "format": "mp4",
    "thumbnailUrl": "/artifacts/video-studio/thumbnails/thumb_01.png"
  }
]

### 7. Renderização Real de Vídeo via FFmpeg
POST /api/v2/video-studio/render
Body:
{
  "projectId": "proj_video_factory_01",
  "durationSec": 5
}
Response: 200 OK
{
  "success": true,
  "projectId": "proj_video_factory_01",
  "outputPath": "C:\\projetos\\ai-engine-core\\ai-engine\\grg\\public\\artifacts\\video-studio\\renders\\output.mp4",
  "downloadUrl": "/artifacts/video-studio/renders/output.mp4",
  "sizeBytes": 3077291
}
```

---

## 4. Topologia de Armazenamento de Artefatos

Todos os arquivos produzidos pelas ferramentas residem no diretório estático público servido pelo Fênix Web Server (`server.js`):

- **Raiz Pública**: `ai-engine/grg/public/artifacts/`
- **Miniaturas de Vídeo**: `.../artifacts/video-studio/thumbnails/`
- **Vídeos Renderizados**: `.../artifacts/video-studio/renders/`
- **Capturas de Tela e Diff**: `.../artifacts/screenshots/`
- **Telas Reconstruídas**: `.../artifacts/reconstructed/`
- **Manifestos de Auto-Evolução**: `.../artifacts/self-evolution/`
