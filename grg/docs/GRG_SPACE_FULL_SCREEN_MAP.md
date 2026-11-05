# GRG SPACE — mapa de telas e integração de projetos

Auditoria incremental de código, manifest e navegação autenticada observada em 20/10/2026. Esta documentação separa evidência de browser, inspeção estática e pendências; não certifica a release servida pela VPS.

## Escopo e evidência

- Manifest canônico: `qa/frontend-screen-manifest.json` — 15 rotas em cinco domínios. Entradas de navegação: Command, World, Work, Build, Memory, Control e Agents; algumas rotas são acessadas dentro do shell, não por item próprio.
- O HTML também possui aliases históricos (`#command`, `#dna`, `#metrics` e `#flow-graph`). O manifest resolve `command/home/dashboard` para `city`, `dna` para `knowledge` e `metrics` para `observability`.
- Em sessão autenticada, naveguei pelas 15 rotas no browser VPS em viewport de aproximadamente 926×1375. As seções montaram; estados de carregamento variaram após hidratação. Isso verifica navegação/renderização, não a integridade de cada dado ou ação.
- O navegador autenticado retornou dados de runtime em várias rotas durante a auditoria; a mesma VPS teve redirecionamentos para login em outras sessões. Acesso e versão implantada são, portanto, variáveis e devem ser repetidos por release.
- As capturas do usuário demonstram colisões e conteúdos enganosos na Cidade, Projects e chat. Os IDs relacionados permanecem no backlog; só são fechados após reprodução e evidência pós-correção.

## Inventário das telas canônicas

| Rota | Área / propósito | Fontes declaradas no manifest | Achado atual / situação |
|---|---|---|---|
| `#city` | World e Cidade, mapa, agentes e métricas | `/api/v2/city/state` | Cidade visual aparece; contagem do minimapa (33) divergiu do registro de agentes (39). HUD Universo foi observado fora do viewport com sidebar. Runtime visual não equivale a atividade real. |
| `#agents` | Frota, agentes e estados | `/api/agents/panel`, `/api/agents/swarm`, `/api/v2/agents/live-states` | 39 registrados/38 disponíveis/0 executando foram mostrados após hidratar; validar identidade e estado por agente. |
| `#operations` | Missões, jobs e filas | `/api/fenix/missions`, `/api/fenix/jobs`, `/api/v2/jarvis/jobs` | Contadores e eventos precisam conciliação; houve painel com “Teste Operacional” e jobs duplicados `operational.activation` nas capturas. |
| `#projects` | Project Hub, workspaces, catálogo e Screen DNA | `/api/v2/projects`, `/api/project-mirror/projects` | 7 projetos/5 workspaces observados na VPS. Screen DNA anuncia 718 telas, mas catálogo contém referências sem captura/DOM medido; UI-012. |
| `#ide` | Arquivos, editor, preview e edição visual | `/api/dev/fs`, `/api/project-mirror` | Rotas de arquivos existentes; teste de workspace e permissões reais ainda pendente para cada projeto. |
| `#terminal` | Arquivos e terminal controlado | `/api/dev/fs`; ação POST `/api/dev/terminal` | Terminal executa ação; não invocar durante QA read-only. Exige revisão de isolamento/permissões antes de conectar novos workspaces. |
| `#memory` | Memória e grafo | `/api/fenix/memory/search`, `/api/v2/memory/development` | Estado vazio/carregando foi intermitente; repetir com sessão/telemetria válida e checar proveniência dos nós. |
| `#knowledge` | Federação de conhecimento | `/api/knowledge-federation/publications` | Montagem verificada; conteúdo e persistência por publicação pendentes. |
| `#mcp` | Conectores e providers | `/api/connectors`, `/api/fenix/providers` | Montagem verificada; prontidão de provider precisa distinguir configuração, conexão e resposta real. |
| `#marketplace` | Skills e conectores do runtime | `/api/skills`, `/api/connectors` | Um carregamento permaneceu sem conclusão durante a navegação; confirmar em repetição autenticada. |
| `#observability` | Métricas, séries e evidências | `/api/observability/metrics`, `/api/observability/series` | UI deve exibir indisponibilidade se fonte faltar; não certificar métricas sem origem e timestamp. |
| `#runtime` | Health, serviços, workers | `/health`, `/api/v2/city/state` | API 40ms e serviços CONNECTED_AT_BOOT foram exibidos. A tela reportou 60 jobs enquanto filas/execuções estavam 0: divergência a rastrear. |
| `#project` | Project Mirror e arquitetura | `/api/project-mirror`, `/api/v2/projects` | Sobrepõe parte do Project Hub; definir como detalhe/rota secundária e evitar catálogo duplicado. |
| `#browser` | QA visual e auditoria | `/api/v2/frontend-reality/screens`, `/api/v2/frontend-reality/audit` | A captura mostrou “16 telas / 17 passaram”. O builder do dashboard repassa o resumo do relatório sem verificar os denominadores; ainda não se sabe se são métricas comparáveis. A classificação segue `OBSERVED`, não é tratada como erro matemático confirmado. UI-043. |
| `#flowgraph` | Relações entre telas, agentes, jobs, memória e projetos | várias APIs de World/jobs/memória | A tela depende de múltiplos serviços; validar correlação/estado vazio sem tratar grafo parcial como estado completo. |

## Defeitos rastreados prioritários

1. **P0 entrada inicial** — UI-015: primeiro paint/redirect de login precisa ser comprovado em sessão limpa, hash legado e refresh. O código local aponta Cidade, mas a VPS já variou entre cockpit e login.
2. **P1 geometria World** — UI-003, UI-006, UI-007, UI-013, UI-016, UI-027, UI-037, UI-038: minimapa, HUD, Inspector, drawers, chat e barra inferior competem pelo mapa. Fixes locais existem para alguns itens; combinação completa e VPS ainda pendentes.
3. **P1 confiabilidade dos dados** — UI-019, UI-020, UI-025, UI-026: contadores/agentes e sincronização da Cidade não são consistentes entre World, runtime e endpoints.
4. **P1 Screen DNA** — UI-012: descobertas de HTML e referências não capturadas não devem ser contadas como screenshot/DOM observado.
5. **P1 chat/artefatos** — evidências nas capturas mostram falha `PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT`, provider indisponível e erro de anexo (`digest` undefined/stack overflow). Fluxo de leitura, anexos e resposta semântica continua pendente de prova ponta a ponta.
6. **P1 acessibilidade modal** — UI-040 foi corrigido localmente: overlay inativo usa `visibility:hidden`; validar no browser e release ainda pendente.
7. **P2 confiabilidade da auditoria** — UI-041 corrigiu ID duplicado no backlog. UI-028–UI-033 rastreiam falhas do próprio pipeline de QA.
8. **P1 QA visual** — UI-042: o comparador de jobs anteriormente aprovava por tamanho de arquivo e aprovava sem baseline. Agora usa comparação RGBA real, restringe imagens às raízes de QA e reclassifica histórico sem medição; testes com PNG real e casos inválidos passaram. Publicação ainda pendente.

## Pasta local de projetos do operador

Inspeção read-only de `C:\Users\Dell\Desktop\PROJETOS`:

- `projetos.json` tem 41 itens em 10 grupos; todos os 41 caminhos catalogados existiam na inspeção. Há 19 pastas, 13 web, 2 batch, 2 Docker, 2 extensões, 2 arquivos e 1 comando.
- O diretório também contém painel `Iniciar-Projeto.ps1`, `MENU.bat`, atalhos, logos, logs e mapas. O launcher valida identidade antes de abrir uma URL, preserva logs e não encerra processos que ocupem uma porta inesperada.
- Este ambiente contém projetos e cópias/variantes distintos. Não colapsar cópias no Project Hub nem executar os lançadores durante inventário.
- O Project Hub da VPS reportou 7 projetos e 5 workspaces. A aplicação remota não tem acesso ao disco Windows `C:`. A diferença 41 vs 7 é uma diferença de catálogo/ambiente, não prova de projetos faltantes no servidor.
- O serviço local em `127.0.0.1:4400` respondeu `/health` como `grg-services-os`, ambiente `development`, `state-store: sqlite`, `redis: unavailable (in-memory fallback)` e `qdrant: unavailable (local fallback)`. As consultas GET de projetos testadas retornaram 401 sem autenticação. Isso prova um runtime local disponível, não prova sessão compartilhada nem conexão segura com o browser da VPS.

### Integração necessária para abrir projetos pelo Fênix

Fazer o navegador/VPS ler caminhos `C:\...` enviando strings de path ao backend remoto não funciona e seria um limite de segurança inadequado. O Fênix precisa de um conector local pareado com escopo explícito:

1. Importar o `projetos.json` como metadados (ID, nome, grupo, papel/variante, tipo e estado de caminho); ocultar segredos e comandos de execução da listagem comum.
2. Agente local no Windows anuncia disponibilidade e recebe apenas operações autenticadas do usuário; a VPS nunca ganha acesso genérico ao filesystem.
3. Primeira fatia: listar/abrir os diretórios dentro da raiz aprovada e ler árvore/arquivos com limites de tamanho, extensão, symlink, traversal e auditoria. Abertura em IDE deve mostrar caminho e workspace selecionados.
4. Escrita, terminal e inicialização de serviço ficam desligados por padrão; quando adicionados, exigem preview/diff, confirmação por ação e limite de processo/porta. O launcher existente é referência de segurança funcional, não deve ser chamado remotamente sem protocolo.
5. Parear por segredo de curta duração, autenticar cada solicitação, revogar dispositivo e registrar usuário/ação/projeto/resultado; nunca expor token em HTML/log.

O `WindowsDeviceAgent` encontrado no backend não é seguro para essa integração agora: permissões de arquivos/processo são padrão `ALLOW`, caminhos não são confinados a raiz, terminal permite comando arbitrário e o screenshot é uma imagem fake. Não conectar Project Hub a esse agente até endurecimento e testes. O código atual de descoberta na VPS também percorre o filesystem do servidor, não o Windows do operador.

## Plano de acompanhamento

- **P0:** confirmar primeira pintura e sessão; evidência HTML/JS/hash e screenshot autenticado.
- **P1:** resolver conversa/provider e attachments; reduzir overlays na Cidade; reconciliar contagens e jobs; corrigir Screen DNA e summary QA.
- **P1 integração local:** projetar e testar pairing/agent Windows read-only usando fixture isolada; em seguida importar catálogo sem executar comandos.
- **P2:** ampliar qualidade dos personagens/placas, rotulagem de posição medida vs estimada e reduzir densidade visual.
- **P2:** integração controlada com IDE, diff, escrita e terminal após threat review e aprovação granular.

Cada item fecha somente com passos reproduzíveis, teste associado e evidência na versão indicada. Estado atual de publicação: **PENDING**; a VPS não foi alterada nesta auditoria.
