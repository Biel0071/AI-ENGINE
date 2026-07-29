# FÊNIX Ω∞ — POST DEPLOY REPORT (v24 → v31)

Deploy do v31 em produção (VPS `209.50.241.22`, stack `grg-fenix-enterprise`). Cada linha é
evidência medida ao vivo, não declarada.

## Resultado: SUCESSO (na segunda tentativa)

O v31 está no ar. Health `{"ok":true,"status":"ready"}`, schema 31, todos os serviços
healthy.

## Cronologia honesta

1. **Backup** — `pg_dump` gravado (894K) antes de tocar em qualquer coisa. Rede de retorno.
2. **Rede de segurança** — a produção tinha 66 arquivos não-commitados (v24 + patches locais).
   Salvos em commit `cf23259` na VPS **e** em bundle de 85M na máquina local. Dupla cópia.
3. **Comparação** — medido que a RC1 é superconjunto estrito da produção (todas as rotas,
   coleções, módulos e serviços da produção estão na RC1). Deploy não removeria nada.
4. **1ª tentativa — FALHOU** — container api em restart loop: `Cannot find module
   './measurement'`. Causa: `main` era um conjunto INCOMPLETO — eu havia commitado os módulos
   novos da RC1 mas não 9 fundações que eles importam (measurement, gatekeeper,
   readiness-matrix, simulation-audit, etc.), tratando-as erradamente como "de sprint
   anterior".
5. **ROLLBACK automático** — revertido para `cf23259` (v24); produção restaurada, health verde.
   O rollback funcionou; zero perda.
6. **Correção** — commit `13e055dc` adicionou as 9 fundações a `main`, com o grafo de imports
   fechado (verificado local: todos os requires resolvem, o crash não se repete).
7. **2ª tentativa — SUCESSO** — v31 subiu healthy.

## Evidência final (medida ao vivo)

| Verificação | Resultado |
|---|---|
| `/health` | `{"ok":true,"status":"ready"}` — security-plane, state-store (postgresql), queue (bullmq), object-storage todos ok |
| Dashboard `/app` | HTTP 200 |
| `/api/organism/identity` | HTTP 401 (existe, exige auth) — capacidade RC1 no ar |
| `/api/connectors` | HTTP 401 — Connector Runtime no ar |
| `/api/ai/router/select` | HTTP 401 — AI Router no ar |
| Schema no código implantado | `CURRENT_SCHEMA_VERSION 31` |
| HEAD | `13e055d` |
| api container | Up (healthy), recriado com v31 |
| postgres/redis/qdrant/minio | Up 39h (healthy) — infra preservada, sem downtime de dados |

## Rollback necessário?

Não, agora. Foi necessário na 1ª tentativa e funcionou. A 2ª está estável.

## Migração de dado

Aditiva (v24→v31, 5 coleções novas vazias). Nenhum dado transformado. Os dados de produção
(missões, aiCalls, capabilities) intactos — postgres up há 39h sem recriação.

## Riscos remanescentes (medidos, não bloqueiam)

- **chat-agent** usa `this.llm` direto — Known Limitation, MISSION-1008/v32.
- **Polling** de 5s no painel (sem SSE) — RC2.
- **Executive Brain `decompose`** — fundação só; implementação futura.
- **PRODUCTION_PROVEN** exige janela do Assisted Mode — o deploy entrega READY vivo, não PROVEN.

## Segurança

- **Senha root da VPS foi exposta em texto puro no chat — ROTACIONAR agora.** O deploy usou
  a chave SSH `grg_fenix_vps` (passwordless), não a senha; rotacionar não quebra o acesso.
- Nenhum segredo lido/ecoado; `.env.production` (0600) usado pelo compose, nunca impresso.

## Próximos passos

1. Rotacionar a senha root da VPS.
2. Abrir a janela do Assisted Mode (48h) para caminho a PRODUCTION_PROVEN.
3. Reconciliar: a branch de resgate `vps-local-patches-20260729` (cf23259) pode ser
   arquivada — seu conteúdo já está superado pela RC1 em produção.

## Lição registrada (para o GENOME/Constituição)

Commitar por stage explícito protege contra incluir lixo — mas **omitir uma dependência é
tão quebra quanto incluir lixo**. Antes de um deploy, verificar o FECHAMENTO do grafo de
imports do que foi commitado, não só que os arquivos novos estão lá. O `node --check` passa
por arquivo; só o carregamento (`require`) do app inteiro pega módulo ausente.
