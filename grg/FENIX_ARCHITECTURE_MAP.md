# FÊNIX Ω∞ — MAPA DE ARQUITETURA

Derivado do grafo de dependências real (`require` entre módulos). Sentido único, sem ciclos
entre os módulos grandes; `kernel` é a fundação com 216 fan-in.

## Camadas (de baixo para cima)

```
                    ┌─────────────────────────────────────────────┐
   ENTRADA          │  server.js (192 rotas)   worker.js (--role)  │
                    └───────────────┬─────────────────────────────┘
                                    │
                    ┌───────────────▼─────────────────────────────┐
   ORGANISMO VIVO   │  runtime/living-runtime.js — 11 loops         │
                    │  jobs · schedules · health · memory ·         │
                    │  knowledge · research · optimization ·        │
                    │  organization · security · observability ·   │
                    │  business                                     │
                    └───────────────┬─────────────────────────────┘
                                    │
   GOVERNANÇA       │  gatekeeper · readiness-matrix ·              │
   (compõe, não     │  production-readiness · simulation-audit      │
    mede sozinha)   │  → PRODUCTION_LOCK, default-DENY              │
                    └───────────────┬─────────────────────────────┘
                                    │
   DOMÍNIO          │  missions · memory · knowledge-graph ·        │
                    │  capabilities · evolution · operations ·      │
                    │  ai-runtime · repo-intel · onedeploy          │
                    └───────────────┬─────────────────────────────┘
                                    │
   SUPERFÍCIES      │  omega · omega-infinity · nexus · keos ·      │  ← 8 camadas
   COGNITIVAS       │  uios · scos · cognitive · agents            │     sobrepostas
                    └───────────────┬─────────────────────────────┘
                                    │
   FUNDAÇÃO         │  kernel (measurement · store · ids · errors · │  216 fan-in
                    │  event-bus · state-migrations · retention ·   │
                    │  organism-identity)                           │
                    └─────────────────────────────────────────────┘
```

## Contratos que atravessam todas as camadas

- **`measured()` / `unknown()`** (`kernel/measurement.js`): nenhum endpoint devolve métrica
  inventada. Valor sem fonte lança; valor indisponível é `unknown` com pendência, nunca zero.
- **Store transacional** (`kernel/store.js`): `read()` / `update()`. Documento único —
  toda escrita reserializa tudo, então escrita é cara e retenção é dimensionada em bytes.
- **Event bus** (`kernel/event-bus.js`): publica/assina; `mission.completed` → artefato.
- **Autorização** (`controlPlane.authorize`): toda rota exige permissão nominal.

## Fluxo de uma solicitação (o pipeline que já existe)

```
usuário → /api/avatar/message → MissionPlanner.plan()
   → inferMode (INSPECT/OPERATE/OBSERVE/BUILD)
   → reuso de playbook (se missão idêntica já terminou SUCCEEDED)
   → MissionKernel materializa steps do catálogo governado
   → job-engine executa via worker (--role=worker)
   → mission.completed → MissionArtifactsService → playbook + benchmark + capsule
   → conhecimento reutilizável fica no store (patrimônio, não no modelo)
```

## O ponto que sustenta "sobreviver à troca de modelo"

`ai-runtime/ai-gateway.js` resolve o provedor por tabela de rotas
(`this.providers[candidate.provider]`). Trocar Claude por Gemini/GPT já é configuração, não
reescrita. O patrimônio — grafo, competências, memória, playbooks, benchmarks, governança —
vive no store, uma camada abaixo do modelo. É a arquitetura que a diretiva pede; falta o
**instrumento que prova** isso (o Capability Contract).
