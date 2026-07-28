# PROMPT — Otimizar (Performance / Custo / Tokens)

> Cole `_HEADER.md` antes. Preencha [ALVO] e [MÉTRICA].

## Tarefa

Otimize **[ALVO]** para melhorar **[MÉTRICA]** (latência, custo, tokens, memória, throughput).

## Execução

1. Medir a baseline (evidência quantitativa antes de mudar).
2. Buscar `ai-os/MEMORY/optimizations/` — otimização parecida já registrada?
3. Identificar o gargalo real (não presumir). Instrumentar se necessário.
4. Aplicar a otimização de menor risco/maior ganho primeiro.
5. Para tokens: aplicar cache (semântico/embedding/response), contexto incremental,
   compressão de contexto, seleção automática de contexto, análise por delta.
6. Medir de novo. Comparar com a baseline.
7. Registrar em `ai-os/MEMORY/optimizations/` com números antes/depois e evidência.

## Regras

- Não otimizar sem medir. Não trocar clareza por micro-ganho irrelevante.

## Saída esperada

Ganho medido (antes/depois), testes passando, memória registrada.
