# FÊNIX Ω∞ — GRAFO DO ORGANISMO

Grafo único derivado do `require` real entre os 46 módulos (sentido único, sem ciclos).
`kernel` é a raiz com 216 fan-in.

## Grafo de dependência (arestas mais pesadas medidas)

```
kernel (216 fan-in) ◄── tudo
   ▲
   │ 22   omega ──────────┐
   │ 13   cognitive ──────┤
   │ 11   omega-infinity ─┤   as 8 superfícies cognitivas
   │ 10   uios ───────────┤   todas dependem de kernel,
   │  9   keos ───────────┤   raramente uma da outra:
   │  9   nexus ──────────┤   colaboração via event-bus,
   │  9   governance ─────┤   não via require direto
   │  8   execution ──────┘
   │
(root: server.js, app.js) ──13──► infrastructure ──8──► kernel
```

Achado estrutural: as superfícies cognitivas **não se importam entre si** por `require` —
elas dependem quase só de `kernel`. A sobreposição é **conceitual** (fazem coisas
parecidas), não **estrutural** (não há acoplamento cruzado). Isso é uma boa notícia para
consolidação: fundir duas superfícies não desencadeia cascata de imports.

## Os organismos (uma responsabilidade, um lar canônico)

| Organismo | Lar canônico | Superfícies que orbitam o mesmo conceito |
|---|---|---|
| Identidade | `kernel/organism-identity.js` | — (único) |
| Memória | `memory/memory-engine.js` | performance/hot-memory, knowledge-genome |
| Conhecimento | `memory/knowledge-genome.js` + `knowledge-graph/` | uios/knowledge-os, cognitive |
| Capacidades | `capabilities/capability-registry.js` | uios/capability-os |
| Missões | `missions/mission-kernel.js` + `mission-planner.js` | uios/mission-compiler, orchestrator |
| Execução | `runtime/job-engine.js` | execution/sandbox |
| Runtime vivo | `runtime/living-runtime.js` (11 loops) | — (único, canônico) |
| Observabilidade | `operations/observability-center.js` | infrastructure/monitoring |
| Governança | `governance/*` | — (canônico) |
| Evolução | `evolution/` + `omega-infinity/self-evolution-kernel.js` | omega-infinity/meta, cognitive |
| Eventos | `eventing/` (3 camadas) + `kernel/event-bus.js` | nexus/bus (fachada HTTP) |

## Fluxo de vida (o ciclo que o Living Runtime já roda)

```
observability ─► knowledge ─► memory ─► schedules ─► jobs ─► health
     ▲                                                          │
     └──────────── optimization ◄─ research ◄───────────────────┘
```

Nove verbos da diretriz (Observe→Learn→Think→Plan→Execute→Measure→Optimize→Research→Repeat)
já mapeiam nos 11 loops. Não há loop a criar — há loops a manter cobertos por teste.
