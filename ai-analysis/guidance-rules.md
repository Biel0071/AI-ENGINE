# Guidance Rules

## Objetivo
Garantir que o guidance responda de forma objetiva:
- o que fazer agora
- onde mexer
- qual prioridade

## Entradas obrigatorias
- `context` (summary, mainFlows, criticalPoints)
- `diagnostics` (issues e severidade)
- `tokens` (importance/confidence/sources)

## Regras de decisao
1. `nextSteps`
   - origem: `context.criticalPoints`
   - foco: acao imediata em pontos criticos
   - prioridade: baseada em `confidence`

2. `fixes`
   - origem: `diagnostics.issues`
   - filtro: apenas `high` e `critical`
   - foco: risco estrutural e corretivo

3. `optimizations`
   - origem: `tokens`
   - filtro: `importance >= 0.8`
   - foco: ganho de performance/manutenibilidade

## Ordenacao de prioridade
- Todos os itens sao ordenados por `priorityScore` decrescente.
- Itens devem manter `confidence` e `sources` para rastreabilidade.

## Formato esperado
Acoes em `nextActions` devem ser acionaveis e curtas:
- acao
- razao
- prioridade
- confianca
- origem

## Criterio de qualidade
- Sem recomendacao sem evidencia.
- Sem prioridade sem score.
- Sem item sem origem de arquivo/sinal.
