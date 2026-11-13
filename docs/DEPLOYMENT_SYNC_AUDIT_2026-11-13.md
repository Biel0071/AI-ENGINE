# Auditoria de sincronização local/VPS — 2026-11-13

## Referência do checkout

- Repositório: `AI-ENGINE`
- Branch: `entrega-a`
- Commit runtime publicado: `8dcb65768afac85e5a154e04e58b4eb684daeb17`
- `origin/entrega-a` apontava para o mesmo SHA durante a auditoria.
- A VPS não possui metadados Git em `/opt/fenix-os`; a comparação foi feita pelo hash Git de cada arquivo versionado contra o conteúdo remoto.

## Resultado da comparação

Foram comparados 6.030 caminhos do índice Git com `/opt/fenix-os`:

| Estado | Quantidade |
| --- | ---: |
| Hash idêntico | 768 |
| Arquivo divergente | 1.499 |
| Caminho ausente na VPS | 3.755 |
| Submódulo (commit comparado à parte) | 8 |

Resumo de áreas com mais divergência:

| Área | Versionados | Iguais | Divergentes | Ausentes |
| --- | ---: | ---: | ---: | ---: |
| `grg/src` | 591 | 127 | 461 | 3 |
| `grg/public` | 417 | 322 | 95 | 0 |
| `grg/runtime` | 4 | 1 | 3 | 0 |
| `grg/test` | 526 | 23 | 142 | 361 |
| `engine` | 95 | 5 | 90 | 0 |
| `platform` | 64 | 0 | 56 | 8 |

Arquivos centrais verificados:

- `grg/src/server.js`: idêntico ao checkout.
- Runtime worker, supervisor, evolution worker e módulos de análise visual: divergentes.

O relatório compara o conteúdo versionado do checkout com a árvore implantada. Arquivos gerados, diretórios de dados, backups e demais itens não versionados da VPS não fazem parte da contagem.

## Publicação desta sessão

O commit `8dcb6576` foi enviado para `origin/entrega-a`. Na VPS, as mudanças runtime de análise visual foram aplicadas como overlay nos dois módulos relevantes, preservando o restante do código divergente. Antes da aplicação, ambos os arquivos foram copiados para:

`/root/.config/fenix/backups/20261113-visual-release`

A validação local passou em 3 testes; a mesma lógica foi exercitada diretamente na VPS depois do restart do backend e do worker. O registro da publicação está em `/opt/fenix-os/deployments/8dcb6576.json`.

## Estado de credenciais e serviços

- Login de `grg-admin` validado com a senha rotacionada; a sessão autenticou em `/api/me`.
- Redis aceita a credencial nova e rejeita a anterior e conexões sem senha.
- Chave antiga da API Platform revogada; a nova chave validou `/v1/runtime`.
- Os logins dos papéis PostgreSQL antigos (`fenix` e `apiplatform`) foram desativados; os papéis novos conectaram com sucesso.
- Backend, runtime worker, supervisor e evolution worker estão online em produção; `NODE_ENV` e `FENIX_ENV` estão em produção, com dev headers desativados no backend e worker.
- Containers anteriores da API Platform foram preservados, parados, para rollback.
- Senhas locais estão armazenadas em arquivos DPAPI; segredos ativos da VPS permanecem em arquivos root-only ou com permissão `600`.

## Próximo passo de sincronização

Reconciliar código por área, começando por `grg/src`, `engine` e `platform`, comparando diffs antes de substituir qualquer arquivo. Não copiar a árvore inteira do checkout sobre a VPS: ela contém divergências e a partição estava em 96% de uso. Nenhum arquivo de dados foi removido nesta publicação.
