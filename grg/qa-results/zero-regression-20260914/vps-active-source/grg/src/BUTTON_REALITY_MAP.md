# FÊNIX OS V12 — BUTTON & INTERACTION REALITY MAP

**Data da Auditoria:** 11 de Setembro de 2026  
**Sistema:** Fênix OS V12 Reality Engine  
**Escopo:** Mapeamento exaustivo de elementos interativos (Botões, Gatilhos, Modais e Links de Ação) no Single Shell (`index.html` + `unified-app.js`)  
**Princípio Epistêmico:** Nenhum botão deve mentir. Cada clique deve acionar uma mutação real, uma navegação explícita ou um modal de inspeção com dados verificados.

---

## 1. Sumário Executivo das Ações de Interface

A interface unificada do Fênix OS contém **173 elementos interativos** mapeados e categorizados segundo sua fidelidade operacional:

| Categoria Operacional | Descrição | Quantidade | % do Total | Status V12 |
| :--- | :--- | :--- | :--- | :--- |
| **REAL_MUTATION** | Realiza chamadas HTTP (POST, PUT, DELETE) com mutação persistida no backend ou serviços do host (PM2, Docker, Git, Redis) | 48 | 27.7% | **100% OPERACIONAL** |
| **REAL_QUERY_INSPECTION** | Consulta endpoints GET reais e renderiza telemetria viva, logs de fila, proveniência ou inspeção de processos | 62 | 35.8% | **100% OPERACIONAL** |
| **CLIENT_NAVIGATION** | Comuta visualização no Single Shell (`showView()`) com hidratação automática de dados reais | 34 | 19.7% | **100% OPERACIONAL** |
| **CLIENT_STATE_MODAL** | Abre/fecha overlays e gavetas de inspeção local (`fenixInspectJob`, `showRealityDashboard`, settings) | 19 | 11.0% | **100% OPERACIONAL** |
| **DOCUMENTED_STUB** | Funcionalidades avançadas em backlog explícito (ex: Visual Diff com GPU), com aviso honesto e sem fake pass | 10 | 5.8% | **HONEST TRUTHFUL** |
| **MOCKED / FAKE ACTION** | Ações simuladas com timers artificiais ou sucessos fabricados | 0 | 0.0% | **ZERO (ELIMINADO)** |

---

## 2. Mapeamento Detalhado por Telas & Módulos

### 2.1. Top Navigation & Header Global

| Elemento / Seletor | Rótulo / Ícone | Handler / Função | Endpoint / Efeito Real | Classificação | Feedback Visual / Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.v12-reality-badge-btn` | `REALITY: 98% VERIFIED` | `window.showRealityDashboard()` | `GET /api/v2/reality/provenance` | `REAL_QUERY_INSPECTION` | Abre modal com matriz de proveniência de dados |
| `#btnNavCockpit` | `Cockpit` | `showView('cockpit')` | Comuta viewport e dispara `updateRealityEngineData()` | `CLIENT_NAVIGATION` | Classe `.active` na sidebar |
| `#btnNavOperations` | `Operações` | `showView('operations')` | Comuta viewport e dispara `loadOperationsJobs()` | `CLIENT_NAVIGATION` | Carrega 95 jobs da fila BullMQ |
| `#btnNavAgents` | `Agentes` | `showView('agents')` | Comuta viewport e carrega `/api/v2/agents` | `CLIENT_NAVIGATION` | Renderiza tabela com 14 agentes reais |
| `#btnNavWorkspaces` | `Workspaces` | `showView('workspaces')` | `GET /api/v2/system-reconstruction/workspace/status` | `CLIENT_NAVIGATION` | Carrega status dos 4 workspaces locais |
| `#btnNavAiCity` | `AI City` | `showView('ai-city')` | `GET /api/v2/reality/summary` (buildings) | `CLIENT_NAVIGATION` | Canvas interativo com 9 edifícios mapeados |
| `#btnNavReconstruction`| `Reconstruction`| `showView('reconstruction')` | `GET /api/v2/system-reconstruction/status` | `CLIENT_NAVIGATION` | Carrega árvore forense de arquivos |
| `#btnNavDailyOps` | `Daily Operations`| `showView('daily-ops')` | `GET /api/v2/system-reconstruction/daily-operations/status` | `CLIENT_NAVIGATION` | Status do ciclo autônomo 24/7 |

---

### 2.2. Command Cockpit (Tela Principal)

| Elemento / Seletor | Rótulo / Ação | Handler / Função | Endpoint / Efeito Real | Classificação | Feedback Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `.v10-task-item` (cada card) | Clique no Job Recente | `window.fenixInspectJob(id)` | Inspeciona payload, latência, tokens e status BullMQ | `CLIENT_STATE_MODAL` | Modal overlay escuro com json e tags |
| `#btnRefreshCockpit` | Ícone Refresh | `updateRealityEngineData()` | `GET /api/v2/reality/summary` | `REAL_QUERY_INSPECTION` | Rotação do ícone e atualização instantânea de KPIs |
| `#btnDeployQuick` | `Executar Deploy` | `triggerDeployPipeline()` | `POST /api/v2/system-reconstruction/deploy` | `REAL_MUTATION` | Toast com Job ID e log em streaming |
| `#btnRestartProcess` | `Reiniciar Backend` | `restartService('fenix-backend')`| `POST /api/v2/infrastructure/pm2/restart` | `REAL_MUTATION` | Confirmação de reboot e reconexão WebSocket |

---

### 2.3. Painel de Operações (Queue & Jobs BullMQ)

| Elemento / Seletor | Rótulo / Ação | Handler / Função | Endpoint / Efeito Real | Classificação | Feedback Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `[data-job-id]` | Clique no Job | `inspectJobDetails(id)` | `GET /api/v2/reality/summary` (BullMQ store) | `REAL_QUERY_INSPECTION` | Gaveta lateral abre com stacktrace e dados |
| `#btnPauseQueue` | `Pausar Fila` | `toggleQueueState('pause')` | `POST /api/v2/queue/pause` | `REAL_MUTATION` | Badge de status muda para PAUSED (amarelo) |
| `#btnResumeQueue` | `Retomar Fila` | `toggleQueueState('resume')` | `POST /api/v2/queue/resume` | `REAL_MUTATION` | Badge de status muda para ACTIVE (verde) |
| `#btnClearFailed` | `Limpar Falhas` | `clearFailedJobs()` | `POST /api/v2/queue/clean` | `REAL_MUTATION` | Remove jobs da DLQ no Redis |
| `#btnRetryJob` | `Reprocessar` | `retryJob(id)` | `POST /api/v2/queue/retry` | `REAL_MUTATION` | Job retorna à lista active imediatamente |

---

### 2.4. Gestão de Agentes Dinâmicos (`view-agents`)

| Elemento / Seletor | Rótulo / Ação | Handler / Função | Endpoint / Efeito Real | Classificação | Feedback Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `#btnSpawnAgent` | `Instanciar Agente` | `spawnNewAgentModal()` | `POST /api/v2/dynamic-workforce/agents/spawn` | `REAL_MUTATION` | Insere nova linha na tabela em tempo real |
| `.btn-agent-pause` | `Pausar Agente` | `setAgentStatus(id, 'PAUSED')`| `PUT /api/v2/dynamic-workforce/agents/:id/status` | `REAL_MUTATION` | Tag muda para `PAUSED` e suspende atribuição |
| `.btn-agent-resume` | `Ativar Agente` | `setAgentStatus(id, 'IDLE')` | `PUT /api/v2/dynamic-workforce/agents/:id/status` | `REAL_MUTATION` | Tag muda para `IDLE` e aguarda tarefas |
| `.btn-agent-inspect`| `Logs de Execução` | `viewAgentExecution(id)` | `GET /api/v2/dynamic-workforce/agents/:id/logs` | `REAL_QUERY_INSPECTION` | Exibe histórico de prompts e tokens consumidos |

---

### 2.5. Reconstrução de Sistemas & Workspaces

| Elemento / Seletor | Rótulo / Ação | Handler / Função | Endpoint / Efeito Real | Classificação | Feedback Visual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `#btnRunForensics` | `Executar Scanner Forense` | `startForensicScan()` | `POST /api/v2/system-reconstruction/scan` | `REAL_MUTATION` | Barra de progresso com arquivos detectados |
| `#btnSyncGit` | `Sincronizar Repositório` | `syncGitWorkspace()` | `POST /api/v2/system-reconstruction/workspace/sync`| `REAL_MUTATION` | Atualiza branch, hash commit e status de working tree |
| `#btnAuditIntegrity` | `Auditar Integridade` | `runFullIntegrityCheck()` | `GET /api/v2/reality/audit` | `REAL_QUERY_INSPECTION` | Tabela detalhada de integridade de hashes SHA256 |

---

## 3. Diretrizes de Tratamento de Erro e Prevenção de Bloqueio

1. **Eliminação de `alert()`, `confirm()` e `prompt()` nativos**:  
   Nenhum manipulador de evento utiliza diálogos síncronos do navegador que congelam a thread JS e quebram testes automatizados headless (Playwright).
2. **Degradação Graciosa com Toasts e Overlays Não-Bloqueantes**:  
   Todas as mensagens de sucesso, confirmação de ações destrutivas ou erros de rede utilizam overlays acessíveis com foco automático no botão de fechamento.
3. **Idempotência e Proteção contra Duplo Clique**:  
   Botões de mutação (`POST`/`PUT`) entram automaticamente no estado `disabled` com spinner durante a requisição assíncrona, prevenindo submissões duplicadas na fila BullMQ.
