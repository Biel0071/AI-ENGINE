# PROVIDER INTEGRATION STATUS (TRÊS CANAIS DE EXECUÇÃO)

**Status:** CERTIFICADO COM PROBES DE EXECUÇÃO REAL (ZERO FALSOS POSITIVOS)
**Implementação:** `ReaIntelligenceEngine.testUniversalAdapter()`, `ReaIntelligenceEngine.dispatchUniversalAdapterTask()`, `FenixAutonomousLoop.routeToProvider()`

---

## 1. Regra de Honestidade de Conexão (Fase 3)

Nenhum ambiente ou provedor é declarado conectado (`CERTIFIED` / `CONNECTED`) apenas por configuração estática:
- Cada canal executa um **probe real de processo ou HTTP** via `testUniversalAdapter(adapterId)`.
- Se um ambiente estiver fechado ou indisponível no host no momento da execução, o FÊNIX registra explicitamente `certificationStage: 'UNAVAILABLE'` e `availabilityStatus: 'UNAVAILABLE_FAILOVER_READY'`, documenta a indisponibilidade nos logs/artefatos da missão e realiza **failover automático** para os canais autorizados disponíveis.

---

## 2. Matriz dos 3 Canais Coordenados

| Canal | Adapter ID Canônico | Especialidades | Método de Probe Real | Estado Medido | Comportamento em Indisponibilidade |
|---|---|---|---|---|---|
| **1. API Platform — VPS** | `api-platform-gateway` (`api-platform-vps`) | Planejamento, análise arquitetural, investigação de bugs, geração de código, classificação, documentação e coordenação de agentes | Probe HTTP real (`curl -s -m 2`) em `http://209.50.241.22:3001/health`, `http://209.50.241.22:4410/api/v1/system/health` e fallback local `:11434/api/tags` | `CERTIFIED` (`AVAILABLE`) | Failover automático para `ollama-local` (`:11434`) mantendo custo zero |
| **2. Antigravity** | `antigravity-gemini` (`antigravity`) | Inspeção de interface, navegação no browser, análise visual, implementação frontend, edição cirúrgica de arquivos, testes visuais e captura de evidências | Probe de processo Node.js + resolução real do `playwright` + verificação do shell canônico `ai-engine/grg/public/index.html` | `CERTIFIED` (`AVAILABLE`) | Registra indisponibilidade se o bridge local não estiver ativo e delega testes de backend ao `node-test-runner` |
| **3. Codex** | `codex-cli` (`codex`) | Engenharia de backend, refatoração, análise de repositório, correção de código, criação de testes automatizados, revisão de implementação e checagem de regressão | Probe real via `execFileSync('codex', ['--version'])` | `UNAVAILABLE` quando o CLI está fechado no host (`UNAVAILABLE_FAILOVER_READY`) ou `CERTIFIED` quando sessão CLI está aberta | Registra `PRIMARY_ADAPTER_UNAVAILABLE` no histórico da missão e realiza handoff contínuo (`handoffMissionProvider`) para `antigravity-gemini` + `node-test-runner` sem perder locks ou contexto |
