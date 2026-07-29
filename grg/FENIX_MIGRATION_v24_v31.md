# FÊNIX Ω∞ — PLANO DE MIGRAÇÃO v24 → v31 (MISSION-1006 FASE 4)

Documento apenas. **Nada aqui é executado por mim** — o deploy é ação do dono na VPS. Cada
passo é medido do código real, não assumido.

## Natureza da migração (medida)

`state-migrations.js:85` — `migrateState` aplica cada versão de `version+1` até
`CURRENT_SCHEMA_VERSION` no boot, incrementalmente. As versões v25→v31 são **todas
aditivas**: cada uma só cria coleções vazias que não existiam (`connectorRegistry`,
`organismIdentity`, `aiRouterDecisions`, etc.). **Nenhuma transforma ou remove dado
existente.** Isso torna a migração de baixo risco: os dados v24 (missões, aiCalls,
capabilities) permanecem intactos; só ganham coleções novas ao lado.

Risco real, portanto, não está no schema — está em: (a) o código novo ter um bug que só
aparece com dado de produção; (b) downtime durante o redeploy dos containers.

## Pré-requisitos (o dono confirma na VPS)

- Backup do Postgres ANTES de tudo (o dump é a linha de retorno).
- A branch `feature/fenix-living-organism-foundation` mergeada (ou o código dela presente
  em `/opt/grg-fenix/source`).
- `GITHUB_TOKEN` opcional — sem ele o connector github fica CONFIGURED (não bloqueia).
- Chaves de provider (ANTHROPIC/OPENAI/GEMINI/GROQ/GRG_AIPLATFORM) já no `.env` de produção
  — o AI Router só vê como CONNECTED os que têm credencial.

## Sequência de deploy (o dono executa)

```
1. BACKUP        bash ops/backup.sh              # dump + sha256; a prova de retorno
2. MERGE/PULL    trazer a branch para /opt/grg-fenix/source
3. BUILD         docker compose build            # imagem com o codigo v31
4. UP            docker compose up -d             # sobe; migrateState roda v24->v31 no boot
5. VERIFY        curl /health                     # todos os checks criticos ok?
6. RUNTIME       node scripts/runtime-roles.js    # 6 servicos vivos por tick
7. SMOKE         os smoke tests abaixo
```

O passo 4 é onde a migração acontece — sozinha, no boot do processo, sem comando manual de
migração. Confirmar no log: `schemaVersion` chega a 31.

## Downtime esperado

O redeploy dos containers (`up -d` recria) — segundos a poucos minutos, conforme o build.
A migração em si é instantânea (adicionar arrays vazios a um documento). **Não há janela de
migração longa** porque nenhum dado é reprocessado.

## Smoke tests (medem, não assumem)

1. `curl /health` → `{"ok":true}` com state-store/queue/redis/object-storage verdes.
2. `curl /api/organism/identity` → organismId estabelecido, schema 31 na linhagem.
3. `curl /api/connectors` → github + providers de IA com estado DERIVADO (não fixo).
4. `curl /api/ai/router/select` → escolhe um provider CONNECTED por evidência.
5. Uma missão real de ponta a ponta → grava em `aiCalls` E `aiRouterDecisions`.
6. `node scripts/verify-infrastructure.js` → 26 probes, readiness gravado.

## Rollback (se qualquer smoke falhar)

```
1. docker compose down
2. restaurar a imagem anterior (tag v24) OU git checkout do commit 38bbde3
3. docker compose up -d
4. restore do dump do passo 1 SE algum dado v31 foi escrito e precisa sumir
```

Ponto importante: como v25→v31 são aditivas, um rollback de código para v24 **convive** com
um documento que já tem as coleções novas — o código v24 simplesmente as ignora. Então o
rollback é seguro mesmo sem restaurar o dump, exceto se quiser um estado limpo.

## Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Bug no código novo com dado real de produção | média | smoke tests 1–6; rollback de código para 38bbde3 |
| Downtime no redeploy | baixa | `up -d` recria rápido; sem migração longa |
| Provider sem credencial → CONNECTED falso | nenhuma | por design: sem chave, fica CONFIGURED, nunca CONNECTED |
| Perda de dado na migração | nenhuma | migração é aditiva; backup é a garantia |
| AI Router sem provider saudável | média | router devolve unknown honesto; gateway usa rota configurada como fallback |

## O que este plano NÃO faz

Não executa deploy, não toca a VPS, não promove nada. É a documentação que a MISSION-1006
FASE 4 pede. A execução é decisão humana sobre evidência, na VPS.
