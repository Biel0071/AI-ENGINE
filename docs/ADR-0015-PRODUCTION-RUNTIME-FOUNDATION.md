# ADR-0015: Fundação operacional de produção

## Status

Aceito incrementalmente em 2026-07-27. Não equivale à certificação Production Ready.

## Decisão

A instalação VPS usa uma imagem OCI imutável, processo sem root, filesystem read-only e Docker
rootless. PostgreSQL, Redis AOF, BullMQ, Qdrant e MinIO são dependências persistentes com health
checks. API e worker são processos separados. Apenas o worker que mantém um lease Redis pode emitir
jobs agendados; qualquer worker pode recuperar e executar jobs, preservando escala horizontal.

Segredos entram por Docker secrets e são convertidos em variáveis somente no processo. O repositório
não contém valores padrão de tokens. Identidades de serviço em produção são referências SPIFFE e o
Fabric nunca recebe nem persiste chave privada. O adapter local continua disponível apenas em
desenvolvimento.

## Operação

Os scripts em `grg/ops` implementam instalação, diagnóstico, health check, backup PostgreSQL com
checksum, restore destrutivo com confirmação explícita, upgrade precedido por backup e rollback por
versão de imagem. Restore e rollback não são automáticos.

## Limites comprováveis

A sintaxe Compose e os contratos foram testados localmente. O Docker daemon desta estação não está
disponível para executar um ensaio real de instalação/restore/deploy. OIDC, observabilidade completa,
HA PostgreSQL e disaster recovery multi-host continuam abertos; portanto nenhum status Production
Ready é atribuído por este ADR.
