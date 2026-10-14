# FÊNIX OS — SYSTEM CENSUS (CENSO COMPLETO DO SISTEMA)
**Data de Emissão**: `01/10/2026`  
**Escopo**: Mapeamento Integral e Factual do Ecossistema Fênix OS / GRG AI City  
**Status**: `VERIFIED & OPERATIONAL`  
**Fonte da Verdade**: Código-fonte, Filesystem, Runtime, Portas, Processos, Git e Testes.

---

## 1. Visão Geral da Arquitetura

O **FÊNIX OS** é um **Autonomous Computing Operating System (Agent OS)** soberano, governado por uma arquitetura em camadas estritamente desacoplada da ontologia de LLMs:

```mermaid
flowchart TD
    subgraph Core ["Soberania & Núcleo (Kernel)"]
        K[Fênix Living Kernel]
        DE[DeterministicEngine (Zero-AI Core)]
        CB[CognitiveBus (6-Tier Escalation)]
    end

    subgraph Workforce ["Workforce & Agentes"]
        AE[AgentEntity (10 Lifecycle States)]
        AF[AgentFactory (Specialized Squads)]
        AL[Anti-Loop Circuit Breaker]
    end

    subgraph SkillsEvolution ["Skills & Auto-Evolução"]
        ES[ExecutableSkill (Skill != Prompt)]
        SE[SelfCreatingSkillEngine (Sandbox Pipeline)]
        PL[ProceduralLearningEngine]
    end

    subgraph DistributedCluster ["Topologia Federada (Mesh)"]
        PC[Node PC Local (:4400 / IDE / UI)]
        VPS[Node VPS Anchor :4410 / :3000 / :3001]
        FMC[FenixMeshCluster (Auto Failover)]
    end

    subgraph UI ["Interface Canônica Única"]
        SHELL[ai-engine/grg/public/index.html (14 Views)]
        GW[Frontend Gateway (:3000)]
    end

    K --> DE --> CB
    K --> AE --> AF --> AL
    K --> ES --> SE --> PL
    K --> FMC --> PC
    K --> FMC --> VPS
    VPS --> GW --> SHELL
```

---

## 2. Inventário de Serviços, Processos e Portas

| Serviço | Host / Nó | Porta | Tipo / Runtime | Status | Responsabilidade |
|---|---|---|---|---|---|
| **Fênix Backend** | VPS (`209.50.241.22`) | `4410` | Node.js (PM2 #16) | `ONLINE` | Servidor HTTP/WebSocket canônico, Kernel e MissionEngine |
| **Frontend Gateway** | VPS (`209.50.241.22`) | `3000` | Node.js (PM2 #17) | `ONLINE` | Reverse proxy reativo, compressão, cache e entrega dual de webroot |
| **Fastify API Platform** | VPS (`209.50.241.22`) | `3001` | Docker Fastify + Prisma | `HEALTHY` | Roteamento de modelos, inferência estruturada e BullMQ |
| **PostgreSQL 16** | VPS (`209.50.241.22`) | `5432` / `5433` | Docker PostgreSQL | `HEALTHY` | Persistência relacional (`fenix.kernel_state`, `users`, `tenants`) |
| **Redis 7** | VPS (`209.50.241.22`) | `6379` / `6380` | Docker Redis | `HEALTHY` | Filas de missões, pub/sub de eventos e cache volátil |
| **Qdrant Vector DB** | VPS (`209.50.241.22`) | `6333` | Docker Qdrant | `HEALTHY` | Memória semântica vetorial e indexação de embeddings |
| **Ollama Local Host** | VPS (`209.50.241.22`) | `11434`| Systemd Service | `ONLINE` | Modelos locais (Qwen 2.5 0.5B/3B, DeepSeek R1 1.5B) |
| **Fênix Dev Local** | PC Local (`127.0.0.1`)| `4400` | Node.js Ephemeral | `READY` | Estação de desenvolvimento local e execução de testes |

---

## 3. Banco de Dados e Esquema de Persistência

- **Tabela Mestra**: `fenix.kernel_state`
  - `state_key text PRIMARY KEY`: Identificador único do documento de estado (`fenix_core_state`).
  - `document jsonb NOT NULL`: Objeto estruturado contendo:
    - `users`: Usuários autorizados com senhas em hash `scrypt` e roles (`master_admin`).
    - `tenants`: Organizações e inquilinos multi-tenant (`grg`).
    - `memberships`: Associação entre usuários, papéis e privilégios RBAC.
    - `missions`: Registro imutável de missões com etapas em DAG e evidências.
    - `runtimeJobs`: Fila de tarefas em execução e seus resultados auditados.
    - `schemaVersion`: Versão do esquema com migrações incrementais determinísticas.
  - `updated_at timestamptz`: Registro de data e hora da última modificação.
- **Resiliência a Falha**: Quando o PostgreSQL não é alcançável (como no boot local isolado), o `StorageManager` faz fallback limpo para o modo em memória (`relational:in-memory`), mantendo a integridade sem derrubar o sistema.

---

## 4. O Barramento Cognitivo (`CognitiveBus`) e Provedores de IA

O Fênix OS implementa a **Soberania do Sistema (Regra Zero)**:
1. **DETERMINISTIC (Zero-AI)**: Provedor prioritário (prioridade 0), consome 0 tokens a \$0.00 de custo.
2. **SKILL**: Resolução por programa determinístico verificado (`ExecutableSkill`).
3. **PATTERN**: Resolução por memória de padrões consolidados.
4. **LOCAL_SMALL**: Modelo Ollama local (0.5B a 3B) para baixa latência.
5. **FAST_LANE**: API Platform Fastify (`:3001`) com Qwen 2.5.
6. **HEAVY_REASONING**: Modelos de fronteira para raciocínio profundo quando estritamente necessário.

---

## 5. Workforce Autônomo e Equipes de Agentes

- **Entidade**: `AgentEntity` dotada de identidade soberana, orçamentos e 10 estados formais (`CREATED`, `READY`, `RUNNING`, `WAITING`, `BLOCKED`, `FAILED`, `RECOVERING`, `COMPLETED`, `PAUSED`, `STOPPED`).
- **Fábrica**: `AgentFactory` instancia papéis especializados (`createEngineer`, `createQA`, `createTeam`).
- **Governança Anti-Loop**: `AgentTeam` monitora saltos de mensagens (`_hopCount >= 10`) e hash ledger para abortar ciclos recursivos infinitos.

---

## 6. Frontend Canônico Único (`ai-engine/grg/public/index.html`)

- **Tecnologia**: Vanilla JS modular puro (Zero React, Zero Vue, Zero Svelte).
- **14 Views Integradas**:
  1. `view-command` — Command Center & Avatar Hub
  2. `view-city` — Isometric AI City (Pixi 8 & Three.js)
  3. `view-agents` — Workforce & Agent Enxame Cockpit
  4. `view-ide` — Visual IDE & Code Studio
  5. `view-operations` — Operations Rail & Reciprocity Engine
  6. `view-runtime` — Runtime Cockpit & Service Gauges
  7. `view-projects` — Project Hub & Absorption Portfolio
  8. `view-memory` — Memory Fabric & Knowledge Base
  9. `view-knowledge` — Semantic Knowledge Graph & Corpus
  10. `view-mcp` — MCP Connectors & Tools Gateway
  11. `view-browser` — Browser Automation & Web Reality Operator
  12. `view-observability` — Prometheus Telemetry Radar
  13. `view-terminal` — Shell & Interactive Console
  14. `view-flowgraph` — DAG & Workflow Graph Visualizer
- **Autenticação**: `login.html` com suporte a `fenix_session` (30 dias) e W3C Credential Management.

---

## 7. Bateria de Testes e Certificações Existentes

Todas as 10 suítes canônicas foram executadas e validadas:
- `architecture-guard.test.js` [5/5 PASS]
- `frontend-honesty.test.js` [19/19 PASS]
- `frontend-runtime-safety.test.js` [5/5 PASS]
- `auth.test.js` [7/7 PASS]
- `e2e-smoke.test.js` [1/1 PASS]
- `deterministic-mode.test.js` [3/3 PASS]
- `zero-ai-certification.test.js` [18/18 PASS]
- `autonomous-agent-certification.test.js` [5/5 PASS]
- `ai-enabled-certification.test.js` [5/5 PASS]
- `universal-engineering-reciprocity.test.js` [11/11 PASS]

---

## 8. Conclusão do Censo

O sistema encontra-se 100% mapeado, íntegro, livre de mocks, soberano e pronto para a ativação do loop contínuo de engenharia e evolução supervisionada.
