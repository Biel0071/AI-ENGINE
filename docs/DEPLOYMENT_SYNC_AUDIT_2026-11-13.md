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

## Follow-up — runtime worker alinhado (2026-11-13)

- A diferença do worker era a identidade do lease: a VPS usava somente `FENIX_WORKER_ID`; a branch acrescenta um UUID por inicialização para impedir que um processo novo herde a identidade/heartbeat do anterior.
- A VPS recebeu somente esse arquivo, com backup anterior preservado em `/root/.config/fenix/backups/20261113-worker-sync/worker.js`.
- A comparação do arquivo implantado com `HEAD:grg/src/runtime/worker.js`, normalizando CRLF, passou sem diferenças.
- A prova isolada confirmou IDs únicos; o backend não foi alterado nessa etapa. O runtime worker (PM2 ID 9) reiniciou e ficou online; o estado foi salvo no PM2.
- Registro da publicação: `/opt/fenix-os/deployments/90d56a8b-worker-sync.json`.
- O restante das divergências do inventário permanece pendente e não foi sobrescrito.

## Follow-up — Entrega A no runtime (2026-11-13)

- Os módulos de chat, MissionPlanner CODE, cliente Ollama e sandbox de código foram aplicados como overlay na VPS; os arquivos existentes têm cópia anterior em `/root/.config/fenix/backups/20261113-entrega-a-code-delivery`.
- O sandbox da Entrega A foi configurado para Docker rootless com imagem Node fixada por digest, sem rede, limite de memória/PIDs e limite de CPU por tempo de processo. O probe rootless isolado passou.
- A suíte local de sandbox e Entrega A terminou com 19 testes aprovados, zero falhas e 1 teste de Ollama real ignorado por ausência de `OLLAMA_URL` local.
- Uma tentativa do fluxo real na VPS confirmou modelo `qwen2.5-coder:1.5b`, autenticação de sessão isolada e delegação de job ao worker, mas o job falhou no acesso ao socket Docker: `/run/user/1001` é privado (0700) para o usuário `fenix`; o processo temporário `deploy` não consegue acessar `/run/user/1001/docker.sock`. O resultado é **BLOCKED/FAIL**, sem geração validada ou entrega persistida. Nenhuma permissão de produção foi ampliada.
- A validação usou SQLite e workspace sob `/tmp`; não criou missão em produção, não alterou arquivos de dados existentes e não publicou versão.
- Naquela tentativa, o próximo passo era obter um runner rootless isolado; a validação concluída no follow-up abaixo resolveu essa limitação sem acessar o socket privado de produção.

## Follow-up — E2E HTTP real aprovado (2026-11-13)

- Para preservar o socket rootless privado de produção, foi iniciado um daemon Docker rootless efêmero da conta `deploy`, em `/run/user/1002/docker.sock`, com `data-root` e `exec-root` sob `/tmp`. `docker info` confirmou `rootless`; o serviço temporário foi parado ao fim da prova. Nenhuma ACL de produção foi alterada.
- A instância temporária usou o código implantado em `/opt/fenix-os/grg`, banco SQLite e workspace isolados sob `/tmp`, sem ler nem gravar no banco operacional e sem abrir missão no tenant de produção.
- A rota HTTP real foi validada: `/api/login` retornou HTTP 200 e `/api/chat/stream` autenticado retornou HTTP 200 com `provider=local-code-delivery` e `deliveryStatus=TESTS_PASSED`.
- Evidência do fluxo: missão `SUCCEEDED`; job `SUCCEEDED`, executado por `fenix-local:<pid>`; gerente `Orchestrator`; subagente `Developer`; modelo `qwen2.5-coder:1.5b`; artefato persistido na missão temporária.
- Ollama reportou 155 tokens, 9,9 s de geração e 4,4 s de carregamento do modelo. Os casos `add(2, 3) => 5` e `add(-1, 1) => 0` passaram (2/2) no sandbox Docker rootless, imagem Node fixada por SHA-256, rede `none`, memória 128 MiB e 64 PIDs.
- Resultado: **PASS para o E2E HTTP isolado sobre o código implantado**. Isso valida geração local e persistência do caminho de aplicação em instância descartável; não é uma missão de produção nem uma gravação no banco operacional.
