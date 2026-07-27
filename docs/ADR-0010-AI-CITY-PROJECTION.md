# ADR-0010: AI City como projeção viva do Event Store

## Status

Aceito em 2026-07-27.

## Decisão

A AI City é um read model tenant-scoped e reconstruível, nunca a fonte primária. Eventos
duráveis do Fabric são projetados na hierarquia `Tenant → City → District → Building →
Floor → Room → System → Service → Process → Event`. IDs de nós e relações são
determinísticos, permitindo replay idempotente e reconstrução após perda do índice.

Cada nó guarda estado operacional derivado, contagem de eventos e último evento observado.
Eventos de falha, erro ou recurso ausente degradam o caminho afetado. A API oferece mapa e
rebuild, ambos protegidos por RBAC; rebuild exige `security:manage`.

## Consequências

Novos sistemas aparecem na cidade ao publicar eventos, sem integração direta com frontend ou
Knowledge Graph. O frontend poderá consumir esse contrato como 2D/2.5D/3D sem alterar o
Kernel. O read model atual limita replay aos 1.000 eventos fornecidos pelo Event Store; cursor,
snapshots e replay paginado são dívida explícita antes de grande escala.

## Migração

O schema v11 adiciona `cityNodes`, `cityEdges` e `cityProjectionStates`. Esses dados podem ser
descartados e refeitos; o Event Store permanece a evidência canônica.
