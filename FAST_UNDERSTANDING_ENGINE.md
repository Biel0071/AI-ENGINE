# FAST_UNDERSTANDING_ENGINE.md — Protocolo Operacional do Agente (FASE 18/19/20/21)

> Fluxo padrão para TODA tarefa futura no FÊNIX OS. Não começar abrindo arquivos aleatórios.

## Sequência obrigatória

```
1. TASK            → escrever a tarefa em uma frase
2. MEMORY LOOKUP   → DECISION_MEMORY.md + ARCHITECTURE_MEMORY.md + ai-os/MEMORY/decisions/
3. SCREEN REGISTRY → SCREEN_REGISTRY.md (qual tela? qual entrypoint REAL?)
4. PROJECT SKELETON→ node engine/projectIntelligence/query.js module|file <alvo>
5. CODE GRAPH      → node engine/projectIntelligence/query.js who-uses <arquivo>
6. DEPENDENCY MAP  → output/graph.json (consumers/imports antes de mexer)
7. RELEVANT FILES  → node engine/projectIntelligence/query.js context-pack "<tarefa>"
8. IMPLEMENT       → somente agora abrir os poucos arquivos necessários (LEVEL 3/4)
9. TEST            → cd grg && node --test test/  |  cd platform && node --test test/*.test.js
10. UPDATE MEMORY  → nova entrada em TASK_MEMORY.md; decisões novas em DECISION_MEMORY.md
11. UPDATE INDEX   → node engine/projectIntelligence/build.js   (incremental, ~<1s)
12. REPORT         → node engine/projectIntelligence/audit.js --record (mede evolução)
```

## Token Economy (FASE 8) — níveis de leitura

| LEVEL | O que consultar | Quando |
|---|---|---|
| 0 | metrics.json / PROJECT_STRUCTURE.md | tamanho, topologia |
| 1 | query.js file/module/api/who-uses | **sempre primeiro** |
| 2 | PROJECT_SKELETON.md | resumo por módulo |
| 3 | trechos de funções relevantes | quando o nível 1 não basta |
| 4 | arquivo completo | implementação |
| 5 | contexto cross-module | raro — nunca usar quando LEVEL 1 resolve |

## GRILL ME (FASE 19) — checklist antes de mudanças destrutivas

Antes de apagar/mover/recriar, responder por evidência:
- existe frontend duplicado? → SCREEN_REGISTRY (sim: platform/public é LEGADO separado — preservar)
- existe componente/API/contrato equivalente? → `query.js api` / `search`
- existe memória/decisão sobre isso? → DECISION_MEMORY.md
- há risco de quebrar World? → quem consome `/api/city` e `grg/src/ai-city/*` (`who-uses`)
- há teste cobrindo? → `grg/test/` (68 suítes), `frontend-runtime-safety.test.js`
- há dependência oculta? → BROKEN_REFERENCES e consumers em graph.json

Risco alto → PARAR → EXPLICAR → PROPOR → AGUARDAR CONFIRMAÇÃO.
Mudança segura (adicional, sem tocar contratos) → EXECUTAR diretamente.

## TEAMWORK (FASE 20)

Coordenação interna sobre o MESMO projeto: Architect usa ARCHITECTURE_MEMORY; Code Intelligence mantém o índice; Frontend só toca `grg/public/*` (canônico); Backend valida contratos via API_REGISTRY; QA roda as suítes acima; Memory registra; nada disso cria projetos paralelos.

## EVOLUTION LOOP (FASE 21)

Após cada mudança: DISCOVER (build.js incremental detecta hash) → IMPLEMENT → TEST → MEASURE (audit --record compara perf-history) → MEMORY (TASK_MEMORY) → INDEX (docs regenerados) → IMPROVE.

## Regras permanentes (REGRA ZERO resumida)

Primeiro MAPEAR → CLASSIFICAR → PROPOR → MIGRAR → VALIDAR.
Não criar outro projeto/frontend/index paralelo. Não duplicar. Não mover cegamente.
Não substituir módulos reais por mocks. Não apagar UNKNOWN. Reuse → Extend → Refactor → Create.
