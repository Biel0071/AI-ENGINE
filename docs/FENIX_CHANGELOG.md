# FÊNIX OS — REGISTRO HISTÓRICO DE MUDANÇAS (CHANGELOG TÉCNICO)
> **Documento:** `FENIX_CHANGELOG.md`  
> **Status:** Atualizado com evidências empíricas  
> **Regra Constitucional:** Prova antes de concluir (*Evidence before assertions*)

---

## 1. REGISTRO DE MODIFICAÇÕES POR ARQUIVO

### Modificação 1: Resiliência a Diretórios sem Repositório Git Direto
* **Arquivo:** `ai-engine/grg/src/repo-intel/git-write-capability.js`
* **Linhas Alteradas:** 21 a 38
* **Motivação:** Diretórios de projeto que não possuem `.git` diretamente na raiz (como `C:\projetos\ai-engine-core` ou `/opt/fenix-os` na VPS) causavam erro fatal `fatal: not a git repository` no método `precheck`, impedindo o salvamento de arquivos na IDE.
* **Alteração Realizada:** Introduzida verificação via `git rev-parse --is-inside-work-tree`. Caso o diretório não seja um repositório Git, o método retorna `{ isGit: false, clean: true }` sem disparar exceção, permitindo que a escrita atômica e os controles de caminho seguro prossigam normalmente.
* **Testes Associados:** `ai-engine/grg/test/git-workspace-write.test.js` (2 testes passando, incluindo novo teste `GitWorkspaceWriteCapability writes safely in non-git workspace directories`).

---

### Modificação 2: Tratamento Seguro de Git HEAD na Rota de Salvamento da IDE
* **Arquivo:** `ai-engine/grg/src/api/project-workspace-routes.js`
* **Linhas Alteradas:** 50 a 60
* **Motivação:** A rota `PUT /api/fenix/projects/:projectId/file` executava `git rev-parse HEAD` com `cwd: root` sem try/catch. Quando `root` não possuía `.git` na raiz, o processo disparava uma exceção não tratada, retornando `HTTP 500` com erro `Command failed: git rev-parse HEAD`.
* **Alteração Realizada:** O comando git foi encapsulado em bloco de tratamento seguro. Se o git falhar ou o diretório não for rastreado diretamente, `head` é definido como `null`, e a escrita atômica grava o conteúdo sem quebrar o contrato da API.
* **Testes Associados:** `ai-engine/grg/test/project-workspace-routes.test.js` e `ai-engine/grg/test/test-ide-file-save.js`.

---

### Modificação 3: Reconhecimento dos Projetos do Ecossistema na Memória Cognitiva
* **Arquivo:** `ai-engine/grg/src/memory/memory-engine.js`
* **Linhas Alteradas:** 115 a 130
* **Motivação:** Ao salvar um arquivo pela IDE, o sistema grava automaticamente uma memória associada ao projeto (`MemoryEngine.remember`). A validação de escopo (`validateScope`) verificava apenas `state.projects` (banco relacional/memória em runtime). Projetos registrados nativamente via `project-registry.js` (como `fenix-os`, `zapai-crm`, `api-platform`) geravam `ValidationError: project memory requires an existing tenant project`.
* **Alteração Realizada:** Inclusão de fallback inteligente: se o projeto não estiver no `store.projects`, o `validateScope` consulta `project-registry.getProjectById(projectId)`. Sendo um projeto reconhecido do ecossistema, o escopo é validado com sucesso.
* **Resultado:** O salvamento de arquivos agora grava auditoria, versão de memória e eventos de barramento com `memoryRecorded: true`.

---

### Modificação 4: Unificação do Alias de Abertura de Arquivos da IDE
* **Arquivo:** `ai-engine/grg/public/project-ide-live.js`
* **Linhas Alteradas:** 1335
* **Motivação:** O módulo `office-live.js` (linha 1697) tentava abrir arquivos de código chamando `window.openProjectFile(filepath)`, porém o módulo da IDE exportava a função sob o nome `window.fenixSelectIdeFile`, resultando em chamada nula sem abrir o editor.
* **Alteração Realizada:** Exposição explícita do alias `window.openProjectFile = window.fenixSelectIdeFile;`.
* **Resultado:** Navegação fluida entre a visão de escritório, logs de diffs e a IDE integrada.

---

### Modificação 5: Criação do Teste Automatizado de Salvamento e Memória
* **Arquivo:** `ai-engine/grg/test/test-ide-file-save.js`
* **Finalidade:** Teste de integração automatizado que realiza login real como `grg-admin`, lê o `package.json` do projeto `fenix-os` via GET, executa gravação via PUT com `expectedHash` e valida retorno HTTP 200 com `ok: true`, `memoryRecorded: true`, `auditId` e `eventId`.
* **Resultado:** Execução 100% verde com confirmação em log: `VERIFICATION COMPLETE: Save succeeded with memoryRecorded: true!`.

---

## 2. MATRIZ DE TESTES E RESULTADOS DE REGRESSÃO

| Teste | Tipo | Itens Testados | Resultado |
|---|---|---|---|
| `architecture-guard.test.js` | Arquitetura | 5/5 verificações | **PASSOU (100%)** |
| `frontend-honesty.test.js` | Integridade & Zero-Mock | 19/19 invariantes | **PASSOU (100%)** |
| `frontend-runtime-safety.test.js` | Segurança de Runtime | 5/5 verificações | **PASSOU (100%)** |
| `e2e-smoke.test.js` | Full E2E & Operações | 1/1 suíte completa | **PASSOU (100%)** |
| `git-workspace-write.test.js` | Escrita em Workspace | 2/2 testes | **PASSOU (100%)** |
| `project-workspace-routes.test.js` | Rotas de Workspace | 2/2 testes | **PASSOU (100%)** |
| `test-ide-file-save.js` | Integração E2E IDE | 1/1 fluxo completo | **PASSOU (100%)** |
