# FÊNIX OS — API CONTRACT & SOURCE OF TRUTH
> **CONTRATO OFICIAL DE APIS DO RUNTIME DO FÊNIX**  
> **Data**: 2026-08-20  

---

## 1. ENDPOINTS REST OFICIAIS (CONSUMIDOS PELO FRONTEND)

### Project Mirror e execução de desenvolvimento

* **`POST /api/dev/projects/clone`**
  * **Payload**: `{ url, directory?, branch?, scan? }`; `directory` aceita caminho relativo organizado, por exemplo `projects/API-PLATAFORM`.
  * **Ação**: clona um repositório Git HTTPS dentro do workspace autorizado e, por padrão, executa o scan real do OneDeploy.
  * **Acoplamento**: o scan registra projeto, repositório, capacidade descoberta, relações do grafo e evidência de stack no store canônico; caminhos absolutos e traversal são rejeitados.
* **`GET /api/project-mirror`**
  * **Retorno**: snapshot derivado do filesystem com projeto, pacotes de monorepo, Git, arquivos, telas, componentes, APIs, serviços, workers, filas, testes, design system e runtime.
  * **Origem**: `grg/src/project-mirror/scanner.js` e `screen-extractor.js`; registry externo não é fonte definitiva.
* **`GET /api/project-mirror/screen/:id`**
  * **Retorno**: Screen descoberta com `route`, `sourceFiles`, linhas, componentes, dependências de API e `previewTarget`.
* **`GET /api/project-mirror/source?file=...&path=...&line=...`**
  * **Retorno**: conteúdo real do arquivo e linha inicial; leitura limitada ao projeto selecionado e a 500 KB.
* **`POST /api/project-mirror/scan`**
  * **Ação**: invalida o cache e executa nova descoberta real.
* **`POST /api/v2/jobs`**
  * **Contrato do chat visual**: `type: "development.execute"`, `source: "web"`, workspace Git, risco, política de paths e contexto automático de projeto/Screen.
  * **Execução**: JobEngine → fila configurada ou worker persistente → AI Gateway → worktree → gates → diff → evidência para revisão.
* **`GET /api/v2/jobs/:id`**, **`GET /api/v2/jobs/:id/events`**
  * **Retorno**: estado persistido, worker, estágios, testes, validação, diff e estado honesto do preview.
* **`GET /api/v2/jobs/:id/diff`**
  * **Retorno**: diff Git recalculado sob demanda na worktree; evita ultrapassar o limite de 4 KB do `job.result`.
* **`POST /api/v2/jobs/:id/approve|reject|rollback`**
  * **Ação**: governa execução de risco e rollback da worktree isolada. Merge/deploy pós-revisão ainda não faz parte deste contrato.

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

### API Platform Enterprise

* O provider canônico `aiplatform` consome `POST /v1/text`, `POST /v1/chat` e consulta `GET /v1/jobs/:id` quando a plataforma responde com trabalho assíncrono.
* Configuração: `GRG_AIPLATFORM_URL`, segredo `GRG_AIPLATFORM_KEY`, modelo `GRG_AIPLATFORM_MODEL` e rota `FENIX_AI_DEFAULT_PROVIDER=aiplatform`.
* O health executa uma inferência mínima e não considera apenas o processo HTTP online; respostas vazias ou fabricadas são recusadas.

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
