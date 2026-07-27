# GRG FÊNIX 1.0.0-rc.1

Primeiro candidato de lançamento focado em hardening. A release separa API e workers, externaliza
estado e segredos, exige OIDC em produção, disponibiliza métricas Prometheus e mantém um Digital Twin
operacional versionado.

## Migração

O schema sobe de v14 para v15 adicionando `operationalTwins`. A migração é append-only. Faça backup
com `grg/ops/backup.sh` antes do upgrade. Configure todos os parâmetros OIDC, o provider externo de IA
e arquivos de secrets antes de executar `grg/ops/upgrade.sh`.

## Status

RC apenas. A promoção depende dos gates descritos em `docs/PRODUCTION-CHECKLIST.md`.

Na medição local de 2026-07-27, 182 testes passaram, `npm audit` encontrou zero vulnerabilidades e
o SBOM SPDX 2.3 enumerou 68 pacotes. A cobertura foi 90,56% de linhas, abaixo do gate de 95%; por isso
o critério de cobertura permanece aberto.
