# FÊNIX Ω∞ — EXECUTIVE BRAIN

Camada de **orquestração** acima do Mission Runtime. Fundação (contratos + documentos) da
MISSION-1008. A RC1 está congelada; esta camada é aditiva, por composição, sem tocar a RC1.

## O que o Executive Brain É e o que NÃO é

- **É** o decompositor: recebe um objetivo estratégico e o quebra em um **Programa** de
  missões, delegando cada missão ao `mission-planner` existente.
- **NÃO é** um executor. Contrato (`executive-contract.js`) **proíbe** `invoke`/`complete`/
  `chat` — se o Brain expuser execução de IA, o `assertExecutiveContract` lança. O Brain
  orquestra; o AI Gateway executa. Um runtime só, garantido por teste.

## Onde encaixa (FASE 1 — medido)

`mission-planner.plan(tenantId, actorId, {objective})` produz **uma** missão. Não existe
camada de Programa hoje (0 ocorrências de `program` no store/missions). O Executive Brain
entra exatamente acima do planner:

```
Usuário → Executive Brain → Program → Mission Planner → Mission Runtime
                                     → AI Router → AI Gateway → Connector Runtime → Providers
```

O Brain chama `plan()` N vezes (uma por missão decomposta) e agrupa os resultados sob um
Programa. Zero mudança no planner — é o mesmo ponto de composição que o AI Router usou com o
Gateway.

## Contratos (FASE 2 — entregues, sem execução)

`src/executive/executive-contract.js`:

- **Executive Contract** — 10 métodos de orquestração: `decompose, createProgram, approve,
  prioritize, replan, detectBlocks, progress, costs, quality, requestApproval`. Nenhum
  executa IA (trava validada).
- **Program Contract** — Programa é ESTADO no store: `id, tenantId, objective, state,
  missions[], createdBy, createdAt`. Estados derivados das missões: DRAFT → APPROVED →
  RUNNING → BLOCKED / COMPLETED / CANCELLED. Nunca escrito à mão.
- **Planner Contract** — exige `plan()` do mission-planner existente. Documenta que o Brain
  COMPÕE, não reimplementa.

## Princípios que a camada honra

- **Orquestra, não executa** (contrato proíbe IA direta).
- **Aprovação humana** — `requestApproval` abre pedido; o Brain nunca decide promover sozinho.
- **Estado derivado** — progresso/custo/qualidade agregam o que as missões medem; custo vem
  de `aiCalls` real, não estimado. Qualidade fica `unknown` honesto até existir o sinal.
- **Sem novo runtime** — usa BullMQ/Mission Runtime/Gateway existentes por composição.

## O que fica PLANNED (implementação = missão futura)

Este entregável é a FUNDAÇÃO: contratos + documentos + teste de contrato. A implementação
pesada (o algoritmo de decomposição objetivo→missões, a persistência de Programa, os
endpoints) é a próxima missão, sobre a RC1 já deployada. Nada de decomposição real foi
implementado aqui — declará-lo pronto seria a simulação que a Constituição proíbe.

## Diagrama completo do FÊNIX após a camada (FASE 4)

```
                                 USUÁRIO
                                    │
                    ┌───────────────▼───────────────┐
   NOVA CAMADA      │        EXECUTIVE BRAIN          │  decompõe · prioriza · replaneja
   (orquestra,      │  decompose → Program (DRAFT)    │  detecta bloqueio · agrega custo
    não executa)    │  requestApproval → [humano]     │  NUNCA executa IA (contrato proíbe)
                    └───────────────┬────────────────┘
                                    │ approve (humano)
                    ┌───────────────▼────────────────┐
   RC1 (congelada)  │  Mission Planner  (plan × N)    │  1 missão por decomposição
                    │       │                          │
                    │  Mission Runtime (materializa)   │  Jobs · artefatos · Knowledge · DNA
                    │       │                          │
                    │  AI Router (decide provider)     │  local→grátis→pago, por evidência
                    │       │                          │
                    │  AI Gateway (executa)            │  cache · breaker · aiCalls · telemetria
                    │       │                          │
                    │  Connector Runtime               │  estado derivado por selfTest
                    │       │                          │
                    │  Providers: ollama·groq·claude·  │
                    │  gemini·openai·aiplatform        │
                    └──────────────────────────────────┘
                                    │
              BullMQ · Redis · Postgres · Qdrant · MinIO · Prometheus  (infra, intacta)
```

A única caixa nova é o Executive Brain, no topo. Tudo abaixo é a RC1, intocada. A seta que
os liga é `mission-planner.plan()` — composição, não invasão.

## Estado

`EXECUTIVE BRAIN READY FOR IMPLEMENTATION` — contratos travados por teste (5/5), ponto de
composição medido, zero código invasivo, RC1 intacta. A implementação do `decompose` real e
da persistência de Programa é a próxima missão.
