# Technical Debt Register

## Prioridade 0

| ID | Dívida | Impacto |
|---|---|---|
| TD-001 | Senhas fixas e dev headers | Comprometimento total |
| TD-002 | `grg/` ainda fora do histórico Git enquanto legado aparece removido | Perda de rastreabilidade/migração insegura |
| TD-003 | FileStore como persistência operacional | Concorrência, escala e recuperação insuficientes |
| TD-004 | Execução/build sem sandbox | RCE e exfiltração |
| TD-005 | Deploy e packagers simulados | Critérios funcionais não correspondem à produção |

## Prioridade 1

- EventBus em processo, sem outbox/inbox/replay.
- ausência de fila, scheduler, DLQ e idempotência distribuída.
- dois caminhos de IA: gateway do domínio e LLM separado do chat.
- aprovação booleana sem workflow.
- auditoria misturada a `memoryEvents` e mutável pelo mesmo store.
- autorização por mapa estático sem ABAC/policy context.
- health check superficial, sem readiness/dependency health.
- custos de IA estimados por constante.
- API não versionada e sem OpenAPI.
- código HTTP concentra roteamento manual e cross-cutting concerns.

## Prioridade 2

- duplicação conceitual entre `engine/`, `platform/` e `grg/`.
- 127 comunidades no grafo, várias finas ou pouco conectadas.
- Digital Twin sem performance, custos, incidentes e métricas.
- Discovery restrito a repositórios e heurísticas estáticas.
- cidade visual não possui modelo explícito distrito/prédio/andar/sala/evento.
- falta de testes de performance, chaos, mutation e AI evaluation.

## Código morto e arquivos históricos

O worktree marca grande parte do CRM e engine antigo como removida. Não é possível classificar essas remoções como código morto sem uma decisão de migração formal. Antes de consolidar:

1. produzir inventário de capabilities do legado;
2. mapear substituto em `grg/` ou registrar descarte aprovado;
3. exportar dados/sessões necessários com tratamento de segredos;
4. criar tag de recuperação;
5. somente então commitar remoções em mudança separada.

## Meta de redução

Cada incremento Enterprise deve fechar IDs deste registro e adicionar ADR, testes, migration/rollback e feature flag. Não usar percentual de cobertura como substituto para testes de risco.
