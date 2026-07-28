# FÊNIX Ω∞ — RUNTIME

O que está ATIVO agora, medido do código. Segue a regra de estados: nada aqui é descrito
como existente se for apenas arquitetura. Ver a Capability Status Matrix em `FENIX_GENOME.md`.

## Boot Sequence (ACTIVE)

`createApp()` monta o organismo nesta ordem real:

```
store → EventBus → EventStore → FabricEventBus → ControlPlane
→ OrganismIdentity.ensure()   ← identidade estabelecida aqui (MISSION-0003A)
→ audit → policy → domínio (missions, memory, capabilities, ...)
→ governança (gate, matriz, readiness) → app pronto
```

No `server.js`, após o `listen()`: registra a geração (`recordGeneration`) e garante os
schedules. O boot dos 26 probes roda em background pelo worker (não bloqueia a porta).

## Living Runtime (ACTIVE)

`runtime/living-runtime.js` — 11 loops, 6 serviços por role, lease por role, tick como
única prova de vida. Mapeia o ciclo Observe→Learn→Think→Plan→Execute→Measure→Optimize→
Research nos loops observability/knowledge/memory/schedules/jobs/health/optimization/research.

## Mission Runtime (ACTIVE)

Mensagem → `mission-planner.plan()` → modo (INSPECT/OPERATE/OBSERVE/BUILD) → reuso de
playbook → materialização no catálogo governado → execução por worker → `mission.completed`
→ playbook + benchmark. O elo que **não** existe: a missão abrir PR no próprio repo e
auto-evoluir (depende do Connector Runtime, estado PLANNED).

## Identity Runtime (ACTIVE — MISSION-0003A)

`kernel/organism-identity.js`: organismId, bornAt, linhagem append-only. Estabelecida no
boot, sobrevive a restart, idade derivada na leitura. `GET /api/organism/identity`.

## O que NÃO está no runtime (PLANNED)

- Connector Runtime (OAuth de saída) — contrato em `FENIX_CONNECTORS.md`.
- Visual Brain, Operator Mode, Universal Builder mobile — ver `FENIX_GENOME.md` §10.1.
