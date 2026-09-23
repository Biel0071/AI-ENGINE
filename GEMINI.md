# GEMINI.md — CONSTITUIÇÃO OPERACIONAL E REGRAS DE OURO DO FÊNIX OS

> **DIRETIVA SUPREMA PARA MODELOS GOOGLE GEMINI & ANTIGRAVITY**
> Ao operar no repositório `ai-engine-core`, o modelo deve seguir impreterivelmente as regras deste documento. Não é permitido desviar, atalhar ou inventar caminhos paralelos.

---

## 1. Fonte Canônica Única da Verdade (Single Source of Truth)
- O **ÚNICO** frontend oficial, executável e editável de todo o sistema reside exclusivamente em:
  `grg/public/index.html` (e seus módulos complementares em `grg/public/`).
- Servidor de aplicação local: `grg/src/server.js` (porta 4400).
- Gateway / Reverse Proxy: porta 3000.
- Servidor na VPS (`209.50.241.22`): porta 4410 (PM2 #16 `fenix-backend`) e webroots `/opt/fenix-os/public/` + `/opt/fenix-os/grg/public/` (PM2 #17 `fenix-frontend`).
- **PROIBIDO**: Criar arquivos `index.html` ou shells adicionais em `scratch/`, na raiz ou em qualquer outro diretório. Cópias legadas devem residir unicamente em `archive/retired-frontends/`.

---

## 2. As 5 Regras de Ouro Anti-Regressão

### Regra I — Fonte Canônica Única Inviolável
- Qualquer alteração de frontend DEVE ser feita em `grg/public/index.html` ou arquivos complementares do mesmo diretório (`unified-app.js`, `command-center.js`, `iso-city.js`, `unified.css`).
- O teste `node grg/test/architecture-guard.test.js` verifica dinamicamente a inexistência de shells paralelas e falha caso detecte qualquer violação.

### Regra II — Zero-Mock & Honestidade de Telemetria
- O HTML estático NUNCA deve conter métricas, scores, contagens ou percentuais inventados (ex.: "100%", "4 ATIVOS", "95%").
- Todo slot inicial não carregado deve exibir o marcador honesto de ausência (`—`).
- O teste `node grg/test/frontend-honesty.test.js` valida 19 invariantes de honestidade factual.

### Regra III — NUNCA Recriar, SEMPRE Evoluir
- O frontend é Vanilla JS modular puro com 14 views integradas (`view-command`, `view-city`, `view-agents`, `view-ide`, `view-operations`, `view-runtime`, `view-projects`, `view-memory`, `view-knowledge`, `view-mcp`, `view-browser`, `view-observability`, `view-terminal`, `view-flowgraph`).
- NUNCA reescrever em frameworks externos (React, Vue, Svelte, etc.).
- Preservar estritamente IDs e contratos de DOM esperados por testes automatizados (`#orchHeatmapGrid`, `#fenixMemoryErrorNotice`, `#fenixMemoryOperationalContainer`, `.fenix-mem-tab-btn`, `#cityCanvas`).

### Regra IV — Prova Obrigatória Antes de Concluir (Prove Before Claiming)
- Nenhuma tarefa pode ser declarada concluída sem prova de execução:
  `CÓDIGO -> SINTAXE (node -c) -> EXECUÇÃO -> TESTES PASSANDO -> DOM VERIFICADO -> ENDPOINTS 200`.
- Bateria obrigatória de testes antes de considerar o trabalho finalizado:
  1. `node grg/test/architecture-guard.test.js` (5/5 verificações)
  2. `node grg/test/frontend-honesty.test.js` (19/19 testes)
  3. `node grg/test/frontend-runtime-safety.test.js` (5/5 testes)
  4. `node grg/test/e2e-smoke.test.js` (1/1 teste full E2E)

### Regra V — Deploy Canônico e Paridade Dual de Webroot
- O deploy remoto para a VPS (`root@209.50.241.22`) é realizado estritamente pelo script `deploy.bat`.
- Paridade dual absoluta de 100% entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.
- Após o deploy, verificar que PM2 #16 (`fenix-backend`) e PM2 #17 (`fenix-frontend`) estão `online` e que a resposta HTTP é 200 OK.

---

## 3. Comandos de Validação Rápida
```powershell
# 1. Verificar sintaxe de arquivo JS modificado:
node -c grg/public/unified-app.js

# 2. Executar suíte de testes de arquitetura e honestidade:
node grg/test/architecture-guard.test.js
node grg/test/frontend-honesty.test.js
node grg/test/frontend-runtime-safety.test.js
node grg/test/e2e-smoke.test.js

# 3. Executar deploy para VPS (quando autorizado):
.\deploy.bat
```
