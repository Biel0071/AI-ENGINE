# FÊNIX Ω∞ — LIVE RUNTIME FLOW

O caminho real de uma missão, do objetivo à tela — tudo medido, tudo já existente (exceto o
transporte realtime, PLANNED). Nenhuma etapa é mock.

## Fluxo completo (o que acontece hoje)

```
Usuário (chat/painel)
   │  descreve objetivo
   ▼
Mission Planner  (plan)                          RC1 — existe
   │  compila modo (INSPECT/OPERATE/OBSERVE/BUILD), reusa playbook
   ▼
Mission Runtime  (materializa)                   RC1 — existe
   │  cria missão + steps governados; estado PLANNED→RUNNING
   ▼
Job Runtime (BullMQ)                             existe
   │  cada step vira job; worker consome
   ▼
AI Router  (decide provider por evidência)       RC1 — existe
   │  local→grátis→pago; registra aiRouterDecisions
   ▼
AI Gateway  (executa)                            existe
   │  cache · circuit breaker · rate-limit · grava aiCalls
   ▼
Connector Runtime → Providers                    RC1 — existe
   │  ollama/groq/claude/gemini/openai/aiplatform
   ▼
mission.completed → Mission Artifacts            existe
   │  destila playbook + benchmark + capsule (Knowledge + DNA)
   ▼
Frontend  (polling 5s reflete tudo)              existe — SSE é RC2
```

## Estados de missão (existem, medidos)

`PLANNED → RUNNING → (AWAITING_APPROVAL ↔ PAUSED) → SUCCEEDED / FAILED / CANCELLED`.
Terminal = {SUCCEEDED, FAILED, CANCELLED}. Cada transição publica evento no EventBus e é
gravada — a base para o Event Stream futuro.

## O que cada missão JÁ produz (FASE 3, medido)

- **Timeline / eventos** — `missionEvents`, publicados no EventBus.
- **Jobs / subjobs** — `runtimeJobs` (BullMQ), por step.
- **Logs** — via eventos e job results.
- **Knowledge** — capsule no genoma (mission-artifacts).
- **Artefatos** — playbook reutilizável.
- **DNA / Benchmark** — `missionBenchmarks` por missão concluída.
- **Approval** — steps YELLOW/RED exigem aprovação (AWAITING_APPROVAL).
- **Telemetria** — `aiCalls` (gateway) + `aiRouterDecisions` (router).

Nada disso foi criado agora — tudo já existe. A MISSION-1009 é integração/documentação, não
implementação.

## O único elo que falta

O frontend reflete tudo por **polling de 5s**, não por push. O Event Stream (SSE) que
tornaria isso instantâneo é `EVENT_STREAM_PLAN.md` (RC2). Sem perda funcional — só latência.
