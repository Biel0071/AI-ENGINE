# Security Report — FÊNIX Alpha

## Classificação geral

**Risco atual: crítico para exposição em rede pública.** O servidor está adequado apenas a desenvolvimento local.

## Achados

### SEC-001 — Credenciais administrativas fixas — Crítico

`grg/src/server.js` cria usuários com senhas padrão, incluindo fallback `admin`. Qualquer exposição do serviço permite takeover previsível.

Correção: bootstrap somente com segredo externo obrigatório e uso único; nenhuma senha deve existir no código, HTML, teste de produção ou imagem.

### SEC-002 — Autenticação por headers de desenvolvimento — Crítico

`AuthService.contextFrom()` aceita `x-tenant-id` e `x-user-id` por padrão. Um cliente pode representar qualquer membership existente.

Correção: desabilitar por padrão; liberar apenas com `FENIX_ALLOW_DEV_HEADERS=1` e recusar a flag em produção.

### SEC-003 — Sessões em memória — Alto

Tokens não sobrevivem ao reinício, não são compartilhados entre instâncias e não têm trilha persistente. Não há refresh token, rotação ou revogação global.

Correção: `SessionStore` persistente, tokens opacos hasheados ou JWT curto com refresh rotativo, family revocation e registro de dispositivo.

### SEC-004 — Autorização de deploy por booleano — Alto

`approved:true` no mesmo pedido satisfaz a política de produção. Não há segregação de função, assinatura, expiração ou vínculo a um plano imutável.

Correção: Approval Engine com request persistente, risk level, policy decision, aprovador distinto e consumo único.

### SEC-005 — Ausência de proteção HTTP — Alto

Faltam security headers, rate limit, CSRF para fluxos baseados em browser, request ID, limites por rota, content-type enforcement e política CORS explícita.

### SEC-006 — Execução e filesystem — Alto

Factory escreve em disco e adapters de Git podem clonar/processar conteúdo. Não há sandbox, quotas, allowlist de caminhos ou isolamento de processo/container.

### SEC-007 — Segredos e provenance — Médio/Alto

Providers leem segredos de environment, mas não existe Secret Manager, rotação, redaction central ou inventário de provenance de prompts/respostas.

### SEC-008 — Persistência sem isolamento de banco — Médio/Alto

O filtro de tenant é aplicado no domínio. Não existe defesa em profundidade via PostgreSQL RLS.

## Controles já presentes

- hash de senha com scrypt e salt;
- comparação timing-safe;
- tokens aleatórios de 256 bits;
- RBAC e checagens multi-tenant no domínio;
- produção exige um sinal de aprovação, embora insuficiente;
- limite de 2 MB no corpo HTTP;
- static file path resolve/startsWith contra traversal simples.

## Plano de correção imediato

1. Remover credenciais fixas e bootstrap fake.
2. Dev headers opt-in e impossíveis em produção.
3. Criar SessionStore e AuditTrail ports com adapters locais persistíveis.
4. Security headers, request ID, content-type e rate limiter.
5. Approval Engine para deploy e outras ações críticas.
6. Testes negativos para bypass, expiração, revogação e isolamento.
7. Depois: OIDC/JWT, Redis/PostgreSQL, CSRF, secret manager e policy engine distribuído.

## Critério para exposição pública

Nenhum achado crítico aberto; scanner de dependências sem vulnerabilidade crítica; teste de tenant isolation; rate limit distribuído; secrets externos; TLS; audit trail persistente; backup testado; runbook de incidente e kill switch operacional.
