# ADR-0016: Identidade corporativa, observabilidade e Twin operacional

## Status

Aceito incrementalmente em 2026-07-27.

## Decisão

Produção desativa login por senha local. Bearer tokens externos são verificados com JOSE contra JWKS
HTTPS, issuer, audience, expiração e algoritmo permitido. A identidade corporativa precisa conter
`sub` e tenant explícito; autorização continua no RBAC/ABAC interno. Desenvolvimento mantém o fluxo
local para testes isolados.

O endpoint `/metrics` exige token separado e exporta somente métricas agregadas em formato Prometheus.
O Compose inclui Prometheus persistente e segredo dedicado. Nenhum label contém prompt, credencial ou
identificador de usuário.

O Digital Twin passa a manter snapshots operacionais append-only por evento, cobrindo recursos de
compute descobertos, containers, workers, jobs, schedules, bancos, filas, deploys, incidentes e health.
Custos, latência e performance permanecem `null` até existirem fontes observadas; não são simulados.
O dashboard cognitivo calcula tempos médios de decisão/execução, precisão, taxa de sucesso e volume de
aprendizados a partir dos registros históricos.

## Consequências

Uma instalação de produção exige OIDC e HTTPS para issuer/JWKS. Prometheus é funcional, mas Grafana,
Loki e OpenTelemetry distribuído ainda precisam de integração e ensaio em VPS. A projeção operacional
é tenant-wide e versionada; retenção/compactação deve ser definida antes de alto volume.
