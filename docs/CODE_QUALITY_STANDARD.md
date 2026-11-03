# CODE QUALITY STANDARD (PADRÃO OBRIGATÓRIO DE QUALIDADE DE CÓDIGO)

**Status:** ENFORCED POR TESTES AUTOMATIZADOS E QUALITY GATE
**Escopo:** Todo código criado ou modificado por agentes (`API Platform VPS`, `Antigravity`, `Codex`) no ecossistema FÊNIX OS.

---

## 1. Regras Obrigatórias de Engenharia (Fase 8)

1. **Funções Pequenas e Coesas**: Cada função deve ter responsabilidade única, entrada/saída explícitas e baixo acoplamento.
2. **Nomes Claros e Semânticos**: Identificadores autoexplicativos, preservando as convenções de nomenclatura de cada módulo.
3. **Zero Duplicação (Nunca Recriar, Sempre Evoluir)**: É proibido criar shells paralelos, funções duplicadas ou componentes redundantes (`architecture-guard.test.js` valida 5 invariantes de fonte única).
4. **Validação de Entradas e Contratos**: Todas as rotas de API validam parâmetros, escopos RBAC e tipos antes de mutar estado.
5. **Tratamento Explícito de Erros**: Nenhum erro pode ser silenciado para fingir sucesso (`frontend-runtime-safety.test.js` e `frontend-honesty.test.js`).
6. **Logs Estruturados e Rastreáveis**: Toda transição de missão ou falha de adaptador registra timestamp ISO-8601, ator, causa raiz e evidência.
7. **Checkpoint SHA-256 Antes de Editar**: Toda intervenção autônoma cria checkpoint pré-edição e executa rollback imediato caso `node -c` ou a suíte de testes retorne `exitCode !== 0`.
8. **Revisão Independente Obrigatória**: Nenhum agente pode aprovar o próprio código (`validatorAgentId !== authorAgentId`).

---

## 2. Bateria Obrigatória de Verificação Antes de Homologar

```powershell
node ai-engine/grg/test/architecture-guard.test.js
node ai-engine/grg/test/frontend-honesty.test.js
node ai-engine/grg/test/frontend-runtime-safety.test.js
node ai-engine/grg/test/continuous-evolution-loop.test.js
node ai-engine/grg/test/autonomous-routes-truth.test.js
node ai-engine/grg/test/autonomous-v6-evolution-engine.test.js
node ai-engine/grg/test/e2e-smoke.test.js
```
