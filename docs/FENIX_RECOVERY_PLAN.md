# FÊNIX OS — PLANO DE RECUPERAÇÃO, UNIFICAÇÃO & EXECUÇÃO AUTÔNOMA
> **Documento:** `FENIX_RECOVERY_PLAN.md`  
> **Status:** Em Execução Ativa  
> **Referência Constitucional:** `CONSTITUICAO_FENIX_CEC.md` & `GEMINI.md`

---

## 1. OBJETIVO & ESCOPO GERAL

Recuperar, consolidar e comprovar o funcionamento de ponta a ponta dos **3 Pilares Estruturais do FÊNIX OS**:

```
+-----------------------------------------------------------------------------------+
|                                  FÊNIX OS V8.3                                    |
+--------------------------+------------------------------+-------------------------+
|     AI LIVING CITY       |        INTEGRATED IDE        |    AUTONOMOUS CORE      |
|  * Canvas 2.5D Isométrico|  * Seletor Universal Projetos|  * Mission Kernel & Jobs|
|  * 14 Views Nativas      |  * Árvore de Arquivos Real   |  * Qwen Orchestrator    |
|  * Sidebar Mascote Fênix |  * Editor Monaco / Preview   |  * Runner de Testes     |
|  * Telemetria Zero-Mock  |  * Gravação Atômica + Memória|  * Auditoria ZAI/Projetos|
+--------------------------+------------------------------+-------------------------+
```

O princípio norteador é **NUNCA RECRIAR DO ZERO, SEMPRE EVOLUIR E CONECTAR**:
- O frontend oficial e canônico é estritamente `ai-engine/grg/public/index.html`.
- O backend de controle é `ai-engine/grg/src/server.js` (porta local 4400 / VPS 4410).
- Nenhuma feature é declarada pronta sem validação do ciclo: `CÓDIGO -> SINTAXE -> EXECUÇÃO -> TESTES PASSANDO -> DOM VERIFICADO -> ENDPOINTS 200`.

---

## 2. ESTRUTURA DE FASES DE EXECUÇÃO

### FASE 1: Baseline e Diagnóstico (CONCLUÍDA)
- **Escopo:**
  - Inventário completo dos servidores, processos PM2, portas, bancos e modelos de IA (Local e VPS).
  - Identificação de pontos de falha: erro de auth na listagem de projetos da IDE, erro HTTP 500 no salvamento de arquivos por ausência de `.git` na raiz, e incompatibilidade do alias `openProjectFile`.
- **Critério de Aceite:**
  - `FENIX_BASELINE.md` documentado com evidências.
  - Causas raízes identificadas e validadas empiricamente.

### FASE 2: Primeira Correção Comprovada — IDE File Operations & Auth (CONCLUÍDA)
- **Escopo:**
  - Adaptação de `git-write-capability.js` e `project-workspace-routes.js` para suportar tanto repositórios Git quanto diretórios de workspace normais sem repositório Git direto na raiz.
  - Reconhecimento dos projetos do `project-registry.js` na validação de escopo do `MemoryEngine`.
  - Exposição de `window.openProjectFile = window.fenixSelectIdeFile` para compatibilidade entre views.
- **Critério de Aceite:**
  - Leitura de arquivo via `GET /api/fenix/projects/:id/file` retorna 200.
  - Escrita de arquivo via `PUT /api/fenix/projects/:id/file` retorna 200 OK com `memoryRecorded: true` e auditoria gravada.
  - Testes unitários `git-workspace-write.test.js`, `project-workspace-routes.test.js` e script `test-ide-file-save.js` passando com zero erros.

### FASE 3: Unificação de Estado de Projetos & Sincronização da Cidade (EM ANDAMENTO)
- **Escopo:**
  - Garantir que o seletor de projetos na IDE, a cápsula de contexto no topo da interface, os edifícios da cidade isométrica e a sidebar do mascote compartilhem o mesmo estado de projeto (`GlobalSelectionStore`).
  - Quando um projeto for selecionado no topo ou na IDE, o mascote e a cidade atualizam seu foco para o projeto ativo.
- **Critério de Aceite:**
  - Trocar de projeto na IDE ou no topo sincroniza `localStorage.getItem('fenix_ide_project_name')` e emite evento `project:selected`.

### FASE 4: Execução de Missão Real com Verificação de Evidências
- **Escopo:**
  - Execução de missão autônoma de ponta a ponta pelo `MissionKernel` ou `QwenOrchestrator`.
  - O mascote recebe instrução via chat, decompõe em etapas, executa tarefas de leitura, testes ou inspeção de código e gera relatório factual.
- **Critério de Aceite:**
  - A missão gera relatório estruturado com ID, tempo de execução, arquivos lidos e resultados de testes reais.

### FASE 5: Polimento Visual e Ergonomia da Interface Canônica
- **Escopo:**
  - Preservar o visual isométrico sem cartões flutuantes desnecessários.
  - Minimap fixado no canto inferior direito com arco meia-lua e os 5 botões de navegação rápida com emojis acoplados na parte superior.
  - Barra de status inferior sem poluição, reservando logs detalhados para drawers/modais dedicados.
  - Sidebar do mascote com largura otimizada (520px) para leitura confortável de código e relatórios.
- **Critério de Aceite:**
  - Inspeção visual sem elementos sobrepostos ou cortados.
  - Passar 100% nos testes de arquitetura e honestidade factual.

### FASE 6: Deploy Canônico para VPS e Certificação Final
- **Escopo:**
  - Sincronização dos arquivos alterados para a VPS (`root@209.50.241.22`) com paridade dual entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.
  - Reinício controlado dos processos PM2 (`fenix-backend` e `fenix-frontend`).
  - Verificação de saúde remota (HTTP 200 nas portas 3000 e 4410).
- **Critério de Aceite:**
  - `FENIX_PRODUCTION_CERTIFICATION.md` emitido com todos os checks aprovados.

---

## 3. ANÁLISE DE RISCOS & ESTRATÉGIA DE ROLLBACK

| Risco | Impacto | Mitigação | Estratégia de Rollback |
|---|---|---|---|
| Quebra de sintaxe em módulos JS canônicos | Backend/Frontend não sobe | Executar `node -c` em cada arquivo antes de restart ou deploy | Reverter arquivo via Git (`git restore <arquivo>`) |
| Perda de dados ou memória em disco | Alto | Assegurar que gravações na IDE usam verificação de hash (`expectedHash`) | Backups versionados em `backups/` e Git commits atômicos |
| Divergência entre local e VPS | Médio | Usar script canônico `deploy.bat` com paridade dual estrita de webroots | Manter snapshot dos arquivos remotos antes de sobrescrever |
| Travamento de processos em testes | Baixo | Uso de timeouts estritos (5s-30s) e encerramento de conexões via `closeAllConnections()` | Encerramento via `manage_task kill` |

---

## 4. CRONOGRAMA TÉCNICO DE IMPLEMENTAÇÃO

1. **Fase 1 (Baseline):** Concluída com geração de `FENIX_BASELINE.md`.
2. **Fase 2 (Correção IDE):** Concluída com testes 100% green em escrita de arquivos e registros de memória.
3. **Fase 3 (Sincronização de Estado):** Validação da reatividade do `GlobalSelectionStore` e eventos cross-view.
4. **Fase 4 (Missão Autônoma Real):** Disparo de missão auditável com persistência de evidências.
5. **Fase 5 (Refinamento Visual):** Verificação de responsividade, contraste e ausência de overlaps.
6. **Fase 6 (Certificação & Deploy):** Validação completa e emissão do laudo de certificação.
