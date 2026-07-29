# FÊNIX Ω∞ — ROLLBACK (RC1)

Como reverter o deploy do RC1 (v31) de volta ao v24, se qualquer item do
`GO_LIVE_CHECKLIST.md` falhar. Executado pelo dono na VPS.

## Fato que torna o rollback seguro (medido)

A migração v24→v31 é **aditiva**: só cria coleções vazias (`organismIdentity`,
`connectorRegistry`, `connectorMetrics`, `connectorEvents`, `aiRouterDecisions`). **Nenhum
dado existente é transformado ou removido.** Consequência: o código v24 **convive** com um
documento que já tem essas coleções — ele simplesmente as ignora. Então reverter o CÓDIGO
já resolve, sem precisar restaurar o dump na maioria dos casos.

## Rollback de código (caminho normal)

```
1. docker compose down
2. git checkout 38bbde3          # o commit v24 em producao, ou a tag da imagem anterior
3. docker compose build          # se a imagem v24 nao estiver mais no host
4. docker compose up -d
5. curl /health                  # confirmar {"ok":true} no v24
```

`docker image ls grg/fenix` mostra as tags disponíveis. Se a imagem v24 ainda existe, pule
o build (passo 3) e use a tag direto — rollback em segundos.

## Rollback de dado (só se necessário)

Necessário apenas se algum dado v31 escrito precisar sumir (raro — as coleções novas são
inertes para o v24). Nesse caso:

```
1. docker compose down
2. bash ops/restore.sh <dump-do-backup> --confirm-destructive   # o dump do passo 1 do deploy
3. docker compose up -d
```

`restore.sh` é **destrutivo** (`pg_restore --clean` sobre o banco vivo). Use só com o dump
do backup feito ANTES do deploy, e confirme o healthcheck depois.

## Ordem de decisão

1. Falha no boot / health vermelho → rollback de código (o caminho normal resolve).
2. Dado corrompido ou estado v31 indesejado → rollback de código + rollback de dado.
3. Em dúvida → rollback de código primeiro; ele é reversível e não perde o backup.

## O que NÃO fazer

- Não editar o schema à mão no Postgres.
- Não rodar `restore.sh` sem o dump do backup pré-deploy.
- Não deixar a stack parcialmente atualizada (api v31 + worker v24) — recrie todos juntos.

Após qualquer rollback: registrar a causa (o que falhou no checklist) para a próxima
tentativa corrigir a raiz, não contornar.
