# FÊNIX UNIVERSAL STUDIO — ATIVAÇÃO E INTEGRAÇÃO DE WORKSPACE

> **DOCUMENT ID**: `FENIX-ACT-STUDIO-20261103`  
> **DATA DE ATIVAÇÃO**: 2026-11-03T19:40:00-03:00  
> **CANONICAL SHELL**: `ai-engine/grg/public/index.html`  
> **FRONTEND CONTROLLER**: `ai-engine/grg/public/fenix-visual-agent-workspace.js`  
> **STATUS**: `ACTIVE & VERIFIED`

---

## 1. Visão Geral da Ativação

O **Universal Studio** ativa no Fênix OS um ambiente de trabalho multimodal e integrado diretamente na visão canônica de desenvolvimento (`#view-ide`), respeitando estritamente a **Regra I (Single Source of Truth)**. Nenhuma janela paralela ou dashboard isolado foi criado.

A barra superior de ferramentas do `#view-ide` foi enriquecida com o **Studio Modality Switcher**, permitindo alternância instantânea entre 4 modalidades de produção assistida por agentes autônomos:

1. 🌐 **Web Studio (`web`)**: Edição visual bidirecional de aplicações web, layouts e componentes com cursores multi-agente e sincronização com arquivos de código.
2. 🎬 **Video Studio (`video`)**: NLE (Non-Linear Editor) multitrack com monitor de reprodução, timeline de 4 faixas (V2 Overlays, V1 Vídeo, A1 Voz, A2 Música), catálogo de mídia indexado e renderização real via FFmpeg.
3. 🔮 **Reconstrução (`reconstruct`)**: Motor de engenharia reversa visual que reconstrói telas completas a partir de URLs públicas, capturas de tela (PNG) ou gravações em vídeo (MP4).
4. 🛡️ **QA & Evolução (`qa`)**: Loop autônomo visual em 9 etapas (`runAutonomousQaLoop`) e criação de melhorias contínuas em branch isolada com aprovação humana obrigatória.

---

## 2. Contratos de DOM e IDs Oficiais

Todos os elementos do Universal Studio aderem aos contratos estritos de nomenclatura e isolamento do Fênix OS:

| Elemento DOM | ID Oficial | Descrição & Função |
|---|---|---|
| Modality Switcher | `#fenixStudioModalitySelect` | Seletor de modo (`web`, `video`, `reconstruct`, `qa`) |
| Botão Disparador de Agentes | `#btnFenixStudioRunAction` | Dispara ciclo visual autônomo dos agentes |
| Seletor de Agente Ativo | `#fenixStudioActiveAgentSelect` | Alterna foco do operador entre os 9 agentes |
| Overlay de Cursores Vivos | `#fenixAgentCursorOverlay` | Renderiza cursores com nomes, cores e badges de ação |
| Bounding Box com Alças | `#fenixElementBoundingBox` | Caixa delimitadora com 8 alças para redimensionamento |
| Painel Inspetor Visual | `#fenixVisualInspectorPanel` | Controles visuais de CSS (cor, raio, tamanho, padding) |
| Container Video Studio | `#fenixStudioVideoView` | Monitor de vídeo, cards de mídia e timeline NLE |
| Container Reconstrução | `#fenixStudioReconstructView` | Interface para importação de URL, imagem e vídeo |
| Container Visual QA | `#fenixStudioQaView` | Visualizador do ciclo de 9 etapas com logs e métricas |

---

## 3. Modos de Operação do Studio

### 3.1 Web Studio
- **Superfície de Edição**: Canvas isolado e responsivo com dimensões parametrizáveis (`1440x900` Desktop, `768x1024` Tablet, `375x667` Mobile).
- **Cursores Vivos**: Pílulas coloridas representam os agentes conectados (Claude, Alex, etc.) navegando e manipulando seletores.
- **Sincronização Bidirecional**: Alterações feitas no `#fenixVisualInspectorPanel` disparam eventos para a API `/api/v2/visual-workspace/action` com tipo `modify_css`, atualizando a folha de estilos e o código-fonte subjacente.

### 3.2 Video Production Studio
- **Monitor de Visualização**: Player de vídeo com controles de reprodução (Play, Pause, Scrubbing) e proporção 9:16 / 16:9.
- **Catálogo de Mídias Reais**: Indexação automática de vídeos MP4 locais e uploads de usuários com extração de miniaturas reais via FFmpeg em `ai-engine/grg/public/artifacts/video-studio/thumbnails/`.
- **Timeline Multitrack**: Faixas dedicadas:
  - `V2 (Overlays)`: Textos, títulos e legendas com animações CSS.
  - `V1 (Video)`: Clipes principais, transições e cortes.
  - `A1 (Voice)`: Locuções geradas ou gravadas.
  - `A2 (Music)`: Trilhas sonoras com controle de volume.
- **Renderizador Real FFmpeg**: Botão `#btnFenixRenderVideo` dispara requisição POST para `/api/v2/video-studio/render` que processa via pipeline FFmpeg e gera o arquivo MP4 final para download e streaming.

### 3.3 Reconstrução de Sites
- **Fontes Suportadas**:
  - `URL`: Faz requisição HTTP, extrai o DOM estrutural, componentes, paleta de cores e tipografia.
  - `Screenshot`: Processa geometria, identifica blocos de navegação, hero, grids e gera código semântico HTML5/CSS3.
  - `Vídeo`: Extrai keyframes de transições e interações temporais.
- **Saída**: Gera arquivos completos e auto-contidos em `ai-engine/grg/public/artifacts/reconstructed/`.

### 3.4 QA & Auto-Evolução
- **Visual QA Loop**: Executa o ciclo formal de 9 passos:
  `OBSERVE -> ANALYZE -> PLAN -> MODIFY -> RENDER -> TEST -> COMPARE -> FIX -> VERIFY`.
- **Auto-Evolução Segura**:
  - Toda proposta gera uma branch isolada `fenix/self-evolution-*`.
  - Executa as suítes de teste de arquitetura, honestidade e regressão.
  - Cria um manifesto JSON com link de preview e status `AWAITING_APPROVAL`.
  - Nenhuma alteração é aplicada diretamente na branch principal sem aprovação humana.

---

## 4. Comunicação de Estado & Contratos de API

O controlador frontend se comunica via REST e WebSockets com o backend Fênix nas rotas:
- `GET /api/v2/visual-workspace/status`: Estado do workspace, agentes ativos e locks.
- `POST /api/v2/visual-workspace/action`: Execução de qualquer uma das 24 ações canônicas.
- `POST /api/v2/visual-workspace/reconstruct`: Execução de reconstrução de websites.
- `POST /api/v2/visual-workspace/qa-loop`: Disparo do loop autônomo de QA.
- `GET /api/v2/video-studio/projects`: Listagem de projetos de vídeo.
- `GET /api/v2/video-studio/media`: Catálogo de vídeos e mídias indexadas com miniaturas.
- `POST /api/v2/video-studio/render`: Renderização de vídeo via FFmpeg.
