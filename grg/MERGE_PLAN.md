# FÊNIX Ω∞ — MERGE PLAN (RC1 → main)

Plano de merge da branch `feature/fenix-living-organism-foundation` (13 commits, schema
v31) para `main`. **Medido, não assumido.** Nenhum merge executado por este documento.

## Fato central (medido)

`git merge-base main <branch>` = **`3a203d12`** = **HEAD atual do main.** A branch está
exatamente à frente do main, sem divergência — o main não recebeu nenhum commit desde que a
branch saiu. Consequência:

- **Merge é fast-forward puro. ZERO conflitos.** `git merge-tree` confirmou (saída vazia).
- Os 8 arquivos que a branch altera e que existem no main (`app.js`, `server.js`,
  `ai-gateway.js`, `state-migrations.js`, `store.js`, `public/*`, `operational-console-ui.test.js`)
  **não conflitam** — ninguém mais os tocou no main.

## Commits que entram (13, em ordem)

```
5238d4db initialize Living Organism Foundation
8205b7c7 MISSION-0002 analysis + Sprint A council coverage
f660a792 close MISSION-0002 — Sprint A coverage + GENOME
4e8eb717 MISSION-0003 — activate identity + capability contracts
af739063 MISSION-0004 — Reality Connector Runtime (GitHub only)
c84d713e MISSION-1000 FASE 1 — validação + relatório de ativação
19e30393 MISSION-1003 — AI Router + provider reconciliation
c3260897 MISSION-1004 — integration validation, end to end
af596d16 MISSION-1005 — mission flow routes through AI Router
47cbbbe2 MISSION-1006 RC1 — consolidate + fix router/gateway model pairing
beafb12a MISSION-1007A — RC1 finalization + deploy docs
33e9632c MISSION-1008 — Executive Brain foundation (contracts + docs)
ffc80a17 MISSION-1009A — system integration report (docs only)
```

## Conflitos esperados

**Nenhum.** Fast-forward. Se o main receber commits antes do merge, reavaliar — mas no
estado medido agora, não há divergência.

## Migrations

Schema **v24 → v31**, todas aditivas (v25–v31 só criam coleções vazias:
`organismIdentity`, `connectorRegistry`, `connectorMetrics`, `connectorEvents`,
`aiRouterDecisions`). Rodam sozinhas no boot (`migrateState`). Nenhum dado transformado.
Detalhe em `FENIX_MIGRATION_v24_v31.md`. **O merge em main não roda migração** — ela só
acontece no boot da VPS, num passo posterior (Main → VPS).

## Riscos do merge (não do deploy)

| Risco | Nível | Mitigação |
|---|---|---|
| Conflito de merge | nenhum (medido) | fast-forward puro |
| main avançar antes do merge | baixo | reavaliar merge-base na hora |
| Merge traz código não revisado | nenhum | os 13 commits são os revisados; nada além |

O merge em si é seguro: não toca produção, não roda migração, não recria container. É só
mover o ponteiro do main para incluir os 13 commits.

## Rollback lógico (do merge)

Se após o merge se decidir reverter (antes de qualquer deploy):
```
git revert -m 1 <merge-commit>     # ou reset se o main não foi compartilhado ainda
```
Como nada foi deployado, reverter o merge não afeta a produção (que segue em v24). O
rollback do DEPLOY é assunto separado (`ROLLBACK.md`), só relevante após Main → VPS.

## Duas etapas, nunca puladas

```
ETAPA 1 (esta): Branch → Main    — merge fast-forward, sem deploy
ETAPA 2 (depois): Main → VPS     — deploy, migração no boot, smoke tests (DEPLOY_EXECUTION.md)
```

Este documento cobre a ETAPA 1. Nenhum deploy aqui.
