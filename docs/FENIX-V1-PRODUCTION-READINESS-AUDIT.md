# GRG FÊNIX V1 — Auditoria de prontidão para produção

Data: 2026-07-27. Estado avaliado: Cognitive Core V1.5.

## Resultado

O Kernel e o loop cognitivo governado estão testáveis e desacoplados, porém a plataforma ainda não
deve ser declarada Production Ready. O modo de produção falha fechado quando Postgres, Redis/BullMQ,
Object Storage, identidade externa, providers reais e deploy adapter seguro não estão configurados.

## Pendências priorizadas

| Prioridade | Componente | Impacto | Critério verificável |
|---|---|---|---|
| P0 | Infraestrutura externa e HA | Estado, filas e artefatos não podem depender de processo único | Postgres, Redis/BullMQ e S3 com backup/restore e teste de failover |
| P0 | Identidade e segredos | Impede credenciais locais e identidades autoassinadas em produção | Vault/step-ca/SPIFFE, rotação e auditoria de acesso |
| P0 | Worker e scheduler operacionais | Jobs recorrentes exigem supervisor e eleição de líder | Worker separado, heartbeat, recuperação e apenas um scheduler ativo |
| P0 | Deploy real com rollback | Produção exige adapter explicitamente seguro | Pipeline assinado, smoke test, rollback aprovado e evidência persistida |
| P1 | Digital Twin operacional | O twin atual é centrado em repositório | Serviços, métricas, incidentes, custo e hipóteses refletidos por evento |
| P1 | Métricas cognitivas completas | Faltam tempos, MTTR e precisão histórica | OpenTelemetry e SLOs para decisão, execução e recuperação |
| P1 | Políticas contextuais | Budget, quota e maintenance window precisam de fontes reais | Testes ABAC e negação fechada para cada restrição |
| P1 | AI Gateway em produção | Modelos precisam ser substituíveis sem fallback simulado | Dois providers reais, circuit breaker, budget e teste de fallback |
| P2 | Reconstrução além de 1.000 eventos | Projeções têm janela limitada de rebuild | Paginação/cursor e teste de replay integral |
| P2 | Console operacional do Avatar | APIs existem, mas falta UX integrada | Estado, decisão, aprovação, riscos e limitações visíveis |

## Evidências atuais

- Runtime é a única via de execução do Cognitive Core.
- Ações críticas exigem aprovador independente e consumo único da aprovação.
- Event Store, Version Engine e AI City recebem os eventos cognitivos.
- Memory e Knowledge recebem aprendizado append-only com proveniência.
- Scheduler aceita `cognitive.cycle` sob permissão administrativa.
- Avatar Administrativo é somente leitura e não afirma execução inexistente.

## Decisão

Prosseguir para hardening P0. Não promover para produção até os quatro itens P0 terem testes de
integração em infraestrutura equivalente à VPS/cluster de destino e runbook de recuperação aprovado.
