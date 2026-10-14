# FÊNIX OS — EVOLUTION QUEUE & LIFECYCLE GOVERNANCE
**Data de Emissão**: `01/10/2026`  
**Escopo**: Fila Persistente de Oportunidades de Melhoria e Sessões de Engenharia Autônoma  
**Status**: `ACTIVE & SUPERVISED`  
**Conformidade**: Regra Constitucional Nº 1 (Reciprocidade) & Regra Zero (Soberania)

---

## 1. O Ciclo de Vida da Fila de Evolução

Toda oportunidade descoberta pelo Fênix OS percorre um ciclo de vida formal e auditável:

$$\text{DISCOVERED} \rightarrow \text{ANALYZING} \rightarrow \text{PROPOSED} \rightarrow \text{APPROVED} \rightarrow \text{PLANNED} \rightarrow \text{SANDBOX} \rightarrow \text{TESTING} \rightarrow \text{READY} \rightarrow \text{PROMOTED} \rightarrow \text{DEPLOYED}$$

Se qualquer falha for detectada em sandbox ou testes:
$$\text{TESTING} \rightarrow \text{FAILED} \rightarrow \text{ROLLING\_BACK} \rightarrow \text{ROLLED\_BACK} \rightarrow \text{LEARNING\_RECORD}$$

---

## 2. Inventário de Propostas na Fila (`EVOLUTION_QUEUE`)

| ID da Proposta | Título | Tipo | Prioridade | Esforço | Risco | Status |
|---|---|---|---|---|---|---|
| **EVO-PROP-001** | Isolamento do Evolution Worker em Processo Dedicado PM2 (#18) e Supervisor (#19) | Arquitetural | `P1 (Alta)` | Médio | Baixo | `DEPLOYED` ✅ |
| **EVO-PROP-002** | Implementação de Portão de Regressão Visual Automatizado | Qualidade / Visual | `P2 (Média)` | Médio | Baixo | `QUEUED` |
| **EVO-PROP-003** | Consolidação de Scripts Utilitários Dispersos em `grg/scripts/` | Manutenção | `P3 (Baixa)` | Baixo | Baixo | `DISCOVERED`|
| **EVO-PROP-004** | Monitoramento Proativo de Memória na VPS para Concorrência Ollama | Performance | `P2 (Média)` | Médio | Médio | `DISCOVERED`|

---

## 3. Resumo da Execução de EVO-PROP-001 (Concluída com Sucesso)

- **Objetivo**: Separar o ciclo de auto-evolução contínua em um processo dedicado do PM2 na VPS (`fenix-evolution-worker` :4420) monitorado por watchdog com Circuit Breaker (`fenix-supervisor` :4430).
- **Módulos Criados**:
  - `ai-engine/grg/src/evolution/persistent-evolution-queue.js`: Fila persistente dual (PostgreSQL + JSON fallback), P0-P7, anti-starvation, deduplicação e quarentena.
  - `ai-engine/grg/src/evolution/evolution-session.js`: Entidade com 15 estados granulares e cadeia de evidência criptográfica SHA-256.
  - `ai-engine/grg/src/evolution/evolution-snapshot.js`: Captura de estado git, backups de arquivos e rollback atômico com verificação SHA-256.
  - `ai-engine/grg/src/evolution/sandbox-runner.js`: Execução isolada com timeout, semáforo e detecção de leaks.
  - `ai-engine/grg/src/evolution/evolution-scheduler.js`: Agendador com máquina de estados (IDLE, OBSERVING, DISPATCHING, EXECUTING, COOLING_DOWN).
  - `ai-engine/grg/src/evolution/fenix-evolution-worker.js`: Processo PM2 (#18) com microserviço HTTP na porta :4420 e startup crash recovery.
  - `ai-engine/grg/src/ops/resource-governor.js`: Semáforo de concorrência (1 evolução, 1 ollama) e bounds de heap/RAM.
  - `ai-engine/grg/src/ops/fenix-supervisor.js`: Processo PM2 (#19) com microserviço HTTP na porta :4430, health watchdog e Circuit Breaker anti-reboot loop.
- **Suíte de Testes Aprovada (100% PASS — 18 Verificações)**:
  - `evolution-queue.test.js` (4/4 PASS)
  - `evolution-session.test.js` (3/3 PASS)
  - `snapshot-rollback.test.js` (3/3 PASS)
  - `resource-governor.test.js` (4/4 PASS)
  - `evolution-worker.test.js` (1/1 PASS)
  - `supervisor.test.js` (1/1 PASS)
  - `evolution-anti-loop.test.js` (2/2 PASS)
- **Topologia de Processos sob PM2**:
  - `PM2 #16`: `fenix-backend` (:4410)
  - `PM2 #17`: `fenix-frontend` (:3000)
  - `PM2 #18`: `fenix-evolution-worker` (:4420)
  - `PM2 #19`: `fenix-supervisor` (:4430)
