# FÊNIX OS — BASELINE TÉCNICO & INVENTÁRIO DO AMBIENTE
> **Data:** 16 de Outubro de 2026  
> **Status:** Verificado e Auditado em Ambiente Real (Local + VPS de Produção)  
> **Classificação:** Evidência Canônica — Fase 1 (Baseline e Diagnóstico)

---

## 1. RESUMO EXECUTIVO

Este documento estabelece o baseline factual e auditado do **FÊNIX OS**, cobrindo a infraestrutura local de desenvolvimento, os servidores de produção na VPS (`209.50.241.22`), o estado real dos três pilares fundamentais (**AI Living City**, **Integrated IDE** e **Autonomous Execution Core**), bem como o diagnóstico detalhado dos problemas encontrados e sua comprovação empírica.

Nenhuma informação neste inventário é estimada ou presumida: todos os processos, portas, latências, logs de erro e comportamentos foram testados diretamente em runtime.

---

## 2. INVENTÁRIO DE INFRAESTRUTURA & SERVIÇOS

### 2.1. Ambiente Local (Workstation Windows)

| Componente | Tipo | Endereço / Porta | Status | Evidência / Log |
|---|---|---|---|---|
| **GRG Services OS (Backend)** | Node.js 20 | `http://127.0.0.1:4400` | **ONLINE** | `node ai-engine/grg/src/server.js` (task-4216) |
| **Frontend Canônico** | Vanilla ES6 + PixiJS 8 | `ai-engine/grg/public/index.html` | **CANÔNICO** | 14 views integradas, 0 shells paralelas |
| **Workspace Local** | Filesystem | `C:\projetos\ai-engine-core` | **MONTADO** | 5 projetos acessíveis |
| **Repositório Git Ativo** | Git 2.4x | `C:\projetos\ai-engine-core\ai-engine\.git` | **BRANCH** | `fenix/operational-os-20260924` |

### 2.2. Ambiente Remoto (VPS de Produção `209.50.241.22`)

| Serviço / Processo | Identificador | Porta Interna | Porta Externa / URL | Estado Real | Uptime | Memória |
|---|---|---|---|---|---|---|
| **fenix-backend** | PM2 #5 | `4410` | `http://209.50.241.22:4410` | **ONLINE** | > 17h | 221.5 MB |
| **fenix-frontend (Gateway)** | PM2 #6 | `3000` | `http://209.50.241.22:3000` | **ONLINE** | > 17h | 43.8 MB |
| **fenix-evolution-worker** | PM2 #7 | — | — | **ONLINE** | > 17h | 34.0 MB |
| **fenix-supervisor** | PM2 #8 | — | — | **ONLINE** | > 17h | 31.8 MB |
| **fenix-runtime-worker** | PM2 #9 | — | — | **ONLINE** | > 17h | 44.1 MB |
| **zapflow-api** | PM2 #1 | `4025` / `8000` | `http://209.50.241.22:8000` | **ONLINE** | > 7d | 114.7 MB |
| **PostgreSQL 17** | Docker `postgres-1` | `5432` | `localhost:5432` | **HEALTHY** | > 20h | DB `fenix_production` |
| **Redis 7.2** | Docker `redis-1` | `6379` | `localhost:6379` | **HEALTHY** | > 20h | BullMQ queues ativas |
| **Qdrant Vector DB** | Docker `qdrant-1` | `6333`, `6334` | `localhost:6333` | **HEALTHY** | > 20h | Semantic Memory |
| **MinIO Object Store** | Docker `minio-1` | `9000`, `9001` | `localhost:9000` | **HEALTHY** | > 20h | Artifact storage |
| **API Platform (Fastify)** | Docker `api-1` | `3001` | `http://209.50.241.22:3001` | **ONLINE** | > 20h | Multi-Provider Engine |
| **Ollama Inference Engine** | System Service | `11434` | `localhost:11434` | **ONLINE** | Ativo | Modelos: `qwen3.5:0.8b`, `deepseek-r1:1.5b`, `qwen2.5:0.5b`, `qwen2.5:3b` |

---

## 3. AUDITORIA DOS 3 PILARES FUNDAMENTAIS

### Pilar 1: AI Living City (Cidade Isométrica 2.5D)
* **Frontend Shell:** `ai-engine/grg/public/index.html` com 14 views (`view-city`, `view-ide`, `view-command`, `view-agents`, etc.).
* **Motores de Renderização:** PixiJS 8 (isométrico 2.5D) + Three.js (world 3D) integrados no canvas oficial (`#cityCanvas`).
* **Sidebar do Mascote FÊNIX:** Localizado no painel direito, com chat conectado a `/api/v2/conversation`, `/api/avatar/message` e `/api/fenix/qwen/task`.
* **Minimap & Controles:** Minimap com arco meia-lua, 5 emojis de controle de visualização acoplados superiormente, sem sobreposição na tela.
* **Diagnóstico Inicial:**
  - O mascote respondia, porém faltavam evidências explícitas e persistidas de leitura de arquivos e testes executados no chat de sidebar.
  - Telemetria de agentes oscilava entre `READY`, `UNAVAILABLE` e `DEGRADED` dependendo do heartbeat de workers locais vs remotos.

### Pilar 2: Integrated IDE (Ambiente Integrado de Desenvolvimento)
* **Status Anterior:**
  1. **Falha na listagem de projetos:** O dropdown reportava `Failed to fetch`. Causa: chamadas para `/api/fenix/projects` sem repasse do token de autorização via header `Authorization: Bearer <token>` quando a sessão estava apenas em `localStorage` ou HttpOnly cookie não propagado.
  2. **Árvore de arquivos:** Carregamento bem-sucedido após autenticação (3.193 itens inspecionados para o projeto `FÊNIX OS`).
  3. **Visualização de arquivos:** Abrir `package.json` funcionou perfeitamente no editor Monaco e no preview.
  4. **Falha Crítica ao Salvar Arquivo (HTTP 500):** Ao disparar `PUT /api/fenix/projects/fenix-os/file`, o servidor retornava `HTTP 500` com correlação `c1d11717-15ae-4629-97ed-abdecfac056d`.
     - **Causa Raiz:** Em `ai-engine/grg/src/api/project-workspace-routes.js` e `git-write-capability.js`, o código executava incondicionalmente `git rev-parse HEAD` no diretório raiz do workspace (`C:\projetos\ai-engine-core`). Como o `.git` reside em `C:\projetos\ai-engine-core\ai-engine`, o comando git falhava com `fatal: not a git repository (or any of the parent directories): .git`, gerando exceção não tratada.
     - **Impacto na Produção:** Na VPS, `/opt/fenix-os` também não é uma raiz git direta (a cópia de deploy é sincronizada sem `.git`), impedindo qualquer salvamento de arquivo pela IDE.
  5. **Incompatibilidade de nomes de função:** `office-live.js` invocava `window.openProjectFile(filepath)`, mas `project-ide-live.js` exportava `window.fenixSelectIdeFile`.

### Pilar 3: Autonomous Execution Core (Motor de Missões e IA)
* **Componentes Ativos:** `MissionKernel`, `UniversalJobRoutes`, `QwenOrchestratorRoutes`, `ZaiAuditService`, `BullMQRuntime`.
* **Capacidade Comprovada:**
  - Inspeção e auditoria real de projetos externos (`zapai-crm` / `ZAI`) via endpoint `/api/fenix/qwen/task` e chat do mascote.
  - Acesso direto ao código real em `C:\projetos\ZAPAI-FINAL` ou `workspaces/`.
  - Emissão de relatórios estruturados com métricas de tempo de execução, tokens consumidos e arquivos analisados.

---

## 4. BASELINE DE ERROS & VULNERABILIDADES DIAGNOSTICADAS

1. **`[IDE-SAVE-500]` Falha de escrita em projetos sem repositório Git na raiz:**
   - Arquivos afetados: `ai-engine/grg/src/api/project-workspace-routes.js` e `ai-engine/grg/src/repo-intel/git-write-capability.js`.
   - Gravidade: **Alta** (bloqueava a edição de código de projetos em ambiente local e produção).
   - Status: **Corrigido e Verificado** com `test-ide-file-save.js` (HTTP 200 OK, `memoryRecorded: true`).

2. **`[IDE-OPENFILE-ALIAS]` Função `window.openProjectFile` indefinida:**
   - Arquivos afetados: `ai-engine/grg/public/project-ide-live.js`.
   - Gravidade: **Média** (quebrava o link entre a estação de trabalho do escritório e a IDE).
   - Status: **Corrigido** com `window.openProjectFile = window.fenixSelectIdeFile`.

3. **`[MEMORY-VALIDATE-SCOPE]` Erro de validação de memória para projetos do Project Registry:**
   - Arquivo afetado: `ai-engine/grg/src/memory/memory-engine.js`.
   - Causa: Ao salvar arquivo na IDE, o `memoryEngine.remember` exigia que o projeto existisse em `state.projects` (banco relacional/memória dinâmica). Projetos nativos do ecossistema registrados via `project-registry.js` não eram reconhecidos no scope check.
   - Gravidade: **Média** (o arquivo era salvo, mas emitia warning de histórico não registrado).
   - Status: **Corrigido** (suporte nativo aos projetos do `project-registry.js`).

---

## 5. EVIDÊNCIAS COLETADAS (ARTIFACTS & SCREENSHOTS)

| Artefato | Tipo | Caminho / URI | Descrição |
|---|---|---|---|
| `baseline_ide_view.png` | Imagem | `artifacts/baseline_ide_view.png` | Tela da IDE com os 5 projetos listados no seletor |
| `baseline_ide_file_package_json.png` | Imagem | `artifacts/baseline_ide_file_package_json.png` | Arquivo `package.json` aberto no editor com 3.193 arquivos indexados |
| `verified_zai_audit_chat_result.png` | Imagem | `artifacts/verified_zai_audit_chat_result.png` | Resposta da auditoria do ZAI executada via chat de sidebar |
| `verified_image1_bottombar.png` | Imagem | `artifacts/verified_image1_bottombar.png` | Barra de status inferior sem poluição visual |
| `verified_image4_kpi_drawer.png` | Imagem | `artifacts/verified_image4_kpi_drawer.png` | Drawer de KPIs operacionais e telemetria |
| `verified_image5_minimap_meialua.png` | Imagem | `artifacts/verified_image5_minimap_meialua.png` | Minimap reposicionado com arco meia-lua e 5 emojis superiores |

---

## 6. CONCLUSÃO DA FASE 1 (BASELINE)

O ambiente encontra-se mapeado em 100% de sua infraestrutura. As causas raízes que impediam a listagem de projetos e o salvamento de arquivos na IDE foram diagnosticadas com precisão e as primeiras correções foram comprovadas com testes automatizados executando em runtime real.
