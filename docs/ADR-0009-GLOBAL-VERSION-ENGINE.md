# ADR-0009: Global Version Engine e rollback governado

## Status

Aceito em 2026-07-27.

## Decisão

Todo evento durável publicado no `FabricEventBus` alimenta um ledger global por recurso.
A identidade canônica é `tipo:id`, derivada do stream e do subject. Cada versão contém
snapshot estável, versão anterior, evento de origem, autor, motivo, data, correlação e
causação. Um `changeSet` separado guarda o diff por caminho JSON. O evento de origem é
a chave idempotente, portanto replay não cria versões duplicadas.

O ledger é histórico e não substitui o Event Store. O Event Store continua sendo a
evidência imutável; o Global Version Engine é um read model transversal reconstruível.

## Rollback

Rollback é modelado como comando, não como escrita direta em bancos de outros módulos.
Uma proposta referencia versão atual, versão-alvo, ambiente, snapshot-alvo e justificativa.
Em produção, a policy exige aprovação de outra pessoa. Em desenvolvimento/homologação a
policy pode autoaprovar, mas o despacho continua explícito. O despacho consome a aprovação
uma única vez e publica `version.rollback.requested`; o adaptador responsável pelo recurso
deve aplicar, validar e publicar o resultado em incremento posterior.

Essa separação evita a alegação falsa de que restaurar um snapshot do ledger já restaurou
containers, bancos ou código. Também permite que cada runtime implemente compensação com
pré-checks e backup próprios.

## Segurança e operação

- Payloads passam pela proibição de segredos do Event Store.
- Leitura requer `event:read`; proposta requer `security:manage` via Policy Engine.
- Produção exige aprovação independente, com expiração e consumo único.
- A API expõe histórico, diff, proposta e despacho; nunca aceita comandos shell.

## Migração e reversão

O schema de estado v10 adiciona `resourceVersions`, `changeSets` e `rollbackProposals`.
Reverter o código exige manter um leitor compatível com v10 ou restaurar backup anterior;
o kernel recusa abrir um schema mais novo para impedir perda silenciosa.
