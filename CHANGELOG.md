# Changelog

## [1.0.0-rc.1] — 2026-07-27

### Added

- Cognitive Core governado, Admin Avatar e Capability Registry.
- Runtime distribuído com worker dedicado, lease Redis, recovery, retry e DLQ.
- Stack VPS com PostgreSQL, Redis AOF, Qdrant, MinIO e Prometheus.
- Identidade corporativa OIDC/JWKS e referências SPIFFE para serviços.
- Digital Twin operacional e métricas cognitivas/Prometheus.
- Scripts de instalação, diagnóstico, backup, restore, upgrade e rollback.
- CI com testes, audit, CodeQL, SBOM e container scan.

### Security

- Removido token que existia no script local de inicialização.
- Login local desativado em produção; secrets externos obrigatórios.

### Known limitations

- Release Candidate, não Production Ready. Falta ensaio real em VPS, HA multi-host, Grafana/Loki/OTel,
  validação de restore/disaster recovery e cobertura mínima comprovada de 95%.
