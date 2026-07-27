# Incremental Migration Plan — Alpha to Enterprise Foundation

## Regras

- preservar contratos de domínio e comportamento testado;
- nenhum mock pode ser selecionado em produção;
- todo adapter novo entra por DI e feature flag;
- migrations são forward-only com procedimento compensatório documentado;
- commits usam pathspec explícito por causa do worktree preexistente;
- a remoção do legado não faz parte destes commits.

## Fase 0 — Baseline e checkpoint

Entregáveis: auditoria, arquitetura atual, dependências, segurança, dívida e este plano. Validar testes existentes. Criar commit apenas de `docs/`.

Rollback: remover os documentos; nenhum comportamento é alterado.

## Fase 1 — Security and Governance vertical slice

1. configuração validada por ambiente;
2. remover bootstrap de credenciais fixas;
3. dev headers opt-in e proibidos em produção;
4. `SessionStore` port e revogação;
5. `AuditTrail` append-only;
6. `ApprovalEngine` com risk level e consumo único;
7. security headers, request ID e rate limit local;
8. integrar deploy de produção ao Approval Engine.

Feature flags: `FENIX_ALLOW_DEV_HEADERS`, `FENIX_BOOTSTRAP_ADMIN`, `FENIX_SECURITY_ENFORCE_APPROVALS`.

Rollback: adapters anteriores continuam disponíveis somente em `development/test`; desativar enforcement restaura compatibilidade durante a migração.

## Fase 2 — Enterprise persistence

Criar `StorePort` formal, migrations SQL e `PostgresStore` com pool e RLS. Introduzir `RedisSessionStore` e Redis cache. Executar dual-write controlado FileStore/Postgres, verificar hashes/contagens e trocar leitura por feature flag.

Rollback: leitura volta ao FileStore; outbox preserva operações pendentes.

## Fase 3 — Durable events and runtime

Outbox transacional, inbox idempotente, BullMQ, workers, retry exponencial, circuit breaker, DLQ e scheduler. Factory/deploy deixam de executar no processo HTTP.

Rollback: pausar producers, drenar filas e reativar executor local apenas em ambiente não produtivo.

## Fase 4 — Unified AI Gateway

Registrar providers, health, fallback, provenance, pricing versionado, privacy policy, evaluation e prompt versions. Chat e factory passam pelo mesmo contrato.

Rollback: route table retorna ao provider anterior sem perder telemetry/provenance.

## Fase 5 — Memory and Knowledge

Separar memórias episódica, semântica, procedural, conversacional, execução, evolução e reflexão. PostgreSQL é source of truth; pgvector/Qdrant são índices reconstruíveis. Knowledge graph ganha temporalidade e versionamento.

## Fase 6 — Discovery and Software Factory

Conectores autorizados, ingestão assíncrona, robots/rate limit, OCR/Docling e GraphRAG. Build em container efêmero com lint, testes, SAST, dependency scan, SBOM, assinatura e artifact store.

## Fase 7 — Digital Twin, Observability and City

OpenTelemetry, métricas técnicas/negócio/IA/custos, dashboards e alertas. Expandir Twin e projetar a cidade 2D/2.5D a partir de read models versionados.

## Fase 8 — Cognitive Planner

Goal Manager, decomposição, hipótese, experimento, reflexão e nightly review. Começar read-only; qualquer ação externa passa por policy, budget, approval e Runtime.

## Gates de promoção

| Ambiente | Gate |
|---|---|
| development | mocks explicitamente permitidos |
| test | adapters determinísticos e testes isolados |
| staging | mesmos adapters de produção, dados sintéticos |
| production | zero fallback para mock, migrations aplicadas, health ready, backup verificado, audit/approval ativos |

## Definição de conclusão

Os 18 tópicos do Super Prompt são um programa de múltiplos incrementos. A Foundation só pode ser declarada pronta após security review independente, restore testado, chaos test, carga representativa, RPO/RTO medidos e operação em staging com os mesmos adapters de produção.
