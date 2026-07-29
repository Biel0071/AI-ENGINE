# FÊNIX Ω∞ — MISSION DECOMPOSITION

Como o Executive Brain decompõe um objetivo estratégico em missões. **Desenho**, não
implementação — o algoritmo de decomposição é missão futura. Aqui fica o contrato e a
honestidade sobre o que ainda não existe.

## O fluxo conceitual

```
Objetivo → Programa → Missões → Jobs → SubJobs → Artefatos → Knowledge → DNA
```

Exemplo: "Quero transformar a GRG no maior ERP com IA."

```
Executive Brain.decompose(objetivo)
  └─ Programa "Construção da Plataforma GRG" (DRAFT)
       ├─ Missão 1: Arquitetura   → mission-planner.plan(mode: INSPECT/BUILD)
       ├─ Missão 2: Backend       → plan(mode: BUILD)
       ├─ Missão 3: Frontend      → plan(mode: BUILD)
       ├─ Missão 4: Deploy        → plan(mode: OPERATE)
       ├─ Missão 5: Marketing     → plan(...)
       ├─ Missão 6: Documentação  → plan(...)
       └─ Missão 7: Monitoramento → plan(mode: OBSERVE)
```

Cada missão, ao ser aprovada, vira uma chamada real a `mission-planner.plan()` — que já
gera Jobs (BullMQ), artefatos, Knowledge e DNA pela maquinaria da RC1. O Brain **não**
gera Jobs; ele gera Missões e delega.

## O ponto honesto: a decomposição em si NÃO existe ainda

`decompose(objetivo) → [missões]` é o coração do Executive Brain, e é a parte que exige
raciocínio. Duas formas possíveis na implementação futura:

1. **Regra/template** — objetivos conhecidos (ERP, SaaS, CRM) mapeiam para um conjunto
   declarado de missões. Determinístico, sem IA. É o começo honesto.
2. **Via AI Router** — o Brain pede ao Router (que decide provider) uma decomposição, e o
   Gateway executa. Aqui o Brain **continua sem executar IA direto** — ele delega ao Router,
   como todo o resto. A decomposição vira uma missão de planejamento como qualquer outra.

Qualquer que seja a forma, o Brain nunca chama `provider.complete()`. Declarar hoje que a
decomposição "funciona" seria inventar — ela é `PLANNED`.

## Contrato da decomposição (forma travada)

`decompose` está no `EXECUTIVE_METHODS` e é validado. A saída deve ser uma lista de missões
propostas (objetivo + modo sugerido), que `createProgram` registra em DRAFT para aprovação
humana. Nenhuma missão é materializada sem `approve`.

## O que este entregável NÃO faz

Não decompõe nenhum objetivo de verdade. Entrega o contrato, o desenho e a fronteira (Brain
orquestra, Gateway executa). A implementação do `decompose` real é a próxima missão.
