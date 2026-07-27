# ADR-0001 — Security and Governance Foundation

Status: accepted
Date: 2026-07-27

## Context

FÊNIX Alpha possuía hash de senha e RBAC, mas mantinha sessões apenas em memória, aceitava identidade por headers por padrão, criava credenciais administrativas fixas e tratava aprovação de produção como um booleano no mesmo request.

## Decision

1. Introduzir `SecurityPlane` entre HTTP e casos de uso.
2. Tornar headers de desenvolvimento opt-in e proibidos em produção.
3. Remover todo bootstrap implícito; bootstrap exige configuração externa completa e é proibido em produção.
4. Persistir somente hash SHA-256 do token de sessão; o bearer bruto nunca vai ao store.
5. Manter `contextFrom()` síncrono para compatibilidade local e usar `contextFromAsync()` no servidor para reidratação após reinício.
6. Criar `AuditTrail` append-only com encadeamento SHA-256 por tenant.
7. Criar `PolicyEngine` e `ApprovalEngine`; operações críticas exigem aprovador diferente e aprovação de uso único.
8. Produção no `Deployer` exige `approvalId` quando Governance Plane está injetado. O booleano legado permanece apenas em testes/adapters locais sem o plane.
9. Adicionar request ID, headers de segurança, rate limit local e kill switch.

## Consequences

- sessões sobrevivem ao reinício do FileStore;
- múltiplas instâncias ainda exigirão RedisSessionStore;
- o rate limiter local não substitui rate limit distribuído;
- hash chain oferece detecção de adulteração, não imutabilidade de infraestrutura; produção exigirá storage WORM ou banco com privilégios separados;
- o bootstrap administrativo deve ocorrer por processo operacional fora de produção.

## Migration

O estado passa ao schema 4 e recebe coleções vazias `sessions`, `auditEvents`, `approvalRequests`, `idempotencyKeys`, `outbox` e `inbox`. `FileStore` combina o estado existente com `EMPTY_STATE`, mantendo compatibilidade com arquivos antigos.

## Rollback

Desativar o enforcement de aprovação removendo a injeção do Approval Engine somente em ambiente local. Não reativar credenciais fixas nem headers de identidade em produção. As novas coleções podem permanecer no JSON sem afetar leitores antigos.
