# PROMPT — Gerar / Expandir Testes

> Cole `_HEADER.md` antes. Preencha [ALVO].

## Tarefa

Gere ou expanda a cobertura de testes de **[ALVO]** (módulo, capability ou repo).

## Execução

1. Detectar o framework de teste do alvo. Se não houver, montar o padrão do ecossistema.
2. Cobrir por camada (pirâmide): unit (maioria) → integration → e2e nos caminhos críticos.
3. Priorizar: caminhos de negócio, bordas de erro, autorização multi-tenant, invariantes.
4. Nomes descrevem comportamento (`rejects memory event without evidence`).
5. Testes de integração que dependem de banco → banco real quando a divergência importa.
6. Rodar a suíte; garantir verde. Se não for possível rodar, declarar e explicar.

## Categorias-alvo (por maturidade)

unit → integration → e2e → contract → security → performance → snapshot/regression.

## Saída esperada

Testes novos passando, cobertura relevante aumentada, lacunas restantes documentadas.
