# FÊNIX OS — API CONTRACT & SOURCE OF TRUTH
> **CONTRATO OFICIAL DE APIS DO RUNTIME DO FÊNIX**  
> **Data**: 2026-08-20  

---

## 1. ENDPOINTS REST OFICIAIS (CONSUMIDOS PELO FRONTEND)

### 🏙️ 1. AI City & Telemetria do Sistema
* **`GET /api/v2/city/state`**
  * **Retorno**: `{ projects: number, agents: { online, total }, memoryUsageMb: number, cpuUsagePercent: number, buildings: object, events: array }`
  * **Origem**: Dados reais do `MultiProjectWorkspaceManager`, `AgentRuntime`, `process.memoryUsage()` e `UnifiedEventBus`.
* **`GET /api/v2/ai-platform/status`**
  * **Retorno**: `{ status: "CONNECTED"|"DISCONNECTED", provider: "aiplatform", url: string, model: string, latencyMs: number }`
  * **Origem**: Verificação real na VPS (`http://209.50.241.215:80`).

---

### 💻 2. Workspaces, Árvore de Arquivos & IDE
* **`GET /api/v2/projects`**
  * **Retorno**: Lista de projetos cadastrados no `MultiProjectWorkspaceManager` com `projectId`, `name`, `rootPath`, `stack`, `dnaVersion`.
* **`GET /api/v2/projects/:id/files`**
  * **Retorno**: `{ success: true, rootPath: string, tree: DirectoryNode[] }`
  * **Origem**: `fs.readdirSync` recursivo no disco ignorando pastas ocultas.
* **`GET /api/v2/projects/:id/file?path=...`**
  * **Retorno**: `{ success: true, path: string, content: string }`
* **`POST /api/v2/projects/:id/file`**
  * **Payload**: `{ path: string, content: string }`
  * **Ação**: Escreve o arquivo no disco em UTF-8 e registra mutação no `DevelopmentObserver`.
* **`GET /api/v2/projects/:id/dna`**
  * **Retorno**: Modelo 4-DNA compilado pelo `GenomeBuilder`.

---

### ⚡ 3. Operações 24/7 & Orquestrador JARVIS
* **`GET /api/v2/jarvis/daily-operations`**
  * **Retorno**: `{ engineState: string, summary: object, jobs: object, engineering: object, intelligence: object, pendingApprovals: array, opportunities: array }`
* **`GET /api/v2/jarvis/jobs`**
  * **Retorno**: `{ total: number, jobs: Job[] }`
* **`POST /api/v2/jarvis/jobs/submit`**
  * **Payload**: `{ projectId, title, objective, riskLevel, allowAutoExecution }`
* **`POST /api/v2/jarvis/jobs/:id/approve`**
  * **Ação**: Concede autorização humana e move o job para `QUEUED`.
* **`POST /api/v2/jarvis/jobs/:id/reject`**
  * **Ação**: Recusa a execução do job.
* **`POST /api/v2/jarvis/heartbeat/tick`**
  * **Ação**: Dispara imediatamente um ciclo do heartbeat 24/7.
* **`POST /api/v2/agentic/execute`**
  * **Payload**: `{ prompt, projectId, projectName, stack }`
  * **Ação**: Aciona o pipeline de desenvolvimento agêntico completo com gravação no disco.

---

## 2. EVENT STREAMING EM TEMPO REAL

* **WebSocket**: `ws://localhost:4400/events`
  * O servidor transmite todos os eventos emitidos no `UnifiedEventBus`:
    * `jarvis.heartbeat.tick`
    * `jarvis.job.created`
    * `jarvis.job.started`
    * `jarvis.job.completed`
    * `jarvis.job.approved`
    * `jarvis.opportunity.discovered`
    * `file.mutation.saved`
