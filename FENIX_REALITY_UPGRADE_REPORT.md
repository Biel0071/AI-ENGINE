# Fênix Reality Upgrade — relatório de execução

Data desta consolidação: 2026-10-08
Escopo: estado do repositório, runtime local, evidências anteriores da VPS e testes executados nesta sessão.

## Estado anterior

O workspace já continha alterações locais extensas antes deste ciclo; elas foram preservadas. O estado anterior registrado apontava divergência entre o bundle local e o bundle da VPS, erro de autenticação da API Platform, timeout de inferência Ollama e pressão de disco/RAM. A navegação visual completa não tinha evidência de execução autenticada pelo navegador.

## O que foi encontrado

- O front canônico está em `grg/public/index.html`; a API/runtime canônica está em `grg/src/`.
- A conversa persistida já encaminhava trabalho ao MissionKernel e JobEngine, mas a aprovação RED não concluía o despacho pelo botão existente: o front chamava apenas `/api/approvals/:id/approve`, enquanto o job só era criado por `MissionKernel.approveStep`.
- A aprovação RED exige um aprovador diferente do solicitante. Essa regra está preservada.
- A camada de mídia tem busca real na Wikimedia Commons, rota autenticada, cache em memória, cadastro persistente de assets e player nativo de vídeo na biblioteca da Cidade. A experiência não foi exercitada em navegador nesta sessão.
- O login já persistia o hash da sessão. O ajuste deste ciclo passou a popular o cache em memória só depois da persistência, e o teste de recuperação da sessão após reinício passou.

## O que foi removido

Não foi feita remoção em massa: há alterações preexistentes e não relacionadas no workspace. Os ciclos anteriores deste trabalho retiraram respostas de IA sintéticas, alguns contadores otimistas e entidades de cidade sem fonte no estado real; as verificações de honestidade continuam incompletas para o repositório inteiro.

## O que foi integrado

- A aprovação de uma etapa de missão valida ação e recurso, exige autorização independente, consome a aprovação e despacha o job persistente no mesmo fluxo.
- Repetir a aprovação de uma etapa já despachada devolve a missão existente, sem criar job duplicado.
- A resposta HTTP passa a incluir a aprovação consumida, a missão atualizada e o ID real do job.
- O modal só fecha quando a API confirma aprovação/rejeição; falhas e permissões negadas aparecem como erro na interface.
- A entrada pelo comando de conversa e pela rota de aprovação reutiliza o fluxo governado do MissionKernel.
- O modal de job não inventa mais progresso de 45%, ETA de 15 segundos, agente “Testing” nem orçamento sob demanda quando esses campos não vierem do runtime.
- O painel Runtime deixou de mostrar serviços, versões, limites e supervisores fixos; agora renderiza somente serviços, fila, agentes e memória publicados pela API, com estado indisponível explícito.
- O endpoint de status do ecossistema parou de afirmar que workers e squads estão online sem telemetria. A contagem de agentes vem do armazenamento e respeita o tenant autenticado.
- O terminal administrativo agora rejeita `cwd` fora do workspace do projeto, travessias `..`, links simbólicos que escapem da raiz, caminhos inexistentes e arquivos usados como diretório. A execução continua exigindo `runtime:admin` e deixa trilha de auditoria.
- Limite de segurança: o terminal ainda aceita comandos de shell arbitrários para administradores e não tem isolamento de processo no nível do sistema operacional. A restrição de `cwd` não impede um comando shell de acessar caminhos fora do projeto; não publicar essa rota para usuários sem confiança administrativa.
- A tela de infraestrutura agora distingue inventário medido vazio de inventário indisponível e não inventa uma versão de Linux quando a leitura falha.

## Backend real — PARTIAL

O fluxo local testado conecta conversa, Project Kernel, Mission Kernel, aprovação, JobEngine e memória. O endpoint autenticado de aprovação RED foi exercitado via HTTP. O provedor de IA configurado na VPS não foi validado com sucesso; persistência de jobs/memória após reinício dos serviços da VPS ainda está pendente.

## Frontend canônico — PARTIAL

`grg/public/index.html` permanece o shell principal. A Cidade e a biblioteca de mídia estão conectadas a rotas de runtime. A aprovação agora mostra sucesso apenas após confirmação do backend. Os painéis de Runtime e Infraestrutura mostram leituras da API e estados indisponíveis. A revisão manual de todas as telas e ações no navegador não foi concluída.

## World Runtime — PARTIAL

O renderer local usa a projeção de estado da Cidade e vincula entidades disponíveis a registros do runtime. Ainda faltam comparação visual e ciclo completo de seleção, zoom, atividade e retorno de câmera com captura no navegador publicado.

## Agentes — PARTIAL

Os estados existentes são projetados a partir de registros e eventos do backend nos fluxos cobertos. A comprovação visual de atividade dinâmica, conversa com agente e navegação até a IDE está pendente.

## Projetos — PARTIAL

O Project Kernel é a fonte dos atalhos e do contexto de projeto nas rotas cobertas. A jornada completa Cidade → projeto → IDE → retorno preservando câmera não foi validada no navegador.

## Jobs — PARTIAL

O JobEngine cria jobs associados à missão e ao projeto, e o teste HTTP comprova o despacho depois da aprovação. A sobrevivência de job e resultado após reinício de API/worker na VPS continua sem comprovação. O comando explícito de limpar histórico permanece indisponível para evitar apagar auditoria persistente.

## Eventos — PARTIAL

O MissionKernel grava eventos `mission.step.approved` e `mission.step.dispatched`; o teste HTTP confirmou ambos. Reconexão do stream e atualização visual no navegador ainda não foram aceitas de ponta a ponta.

## IA — FAIL

O canal rápido usa o roteador de provedores reais e retorna indisponibilidade quando não há conector utilizável; não substitui a resposta por texto sintético. Na auditoria anterior deste ciclo, a API Platform retornou HTTP 500 e a chave configurada no Fênix recebeu HTTP 401 no endpoint atual. Uma inferência mínima no Ollama ultrapassou 20 segundos.

## Busca de mídia — PARTIAL

Existe `GET /api/media/search`, autenticada, com busca real na Wikimedia Commons, validação de URL, metadados e cache. Os testes com respostas controladas passaram; uma sessão de navegador contra a fonte pública não foi validada.

## Vídeos — PARTIAL

A busca filtra resultados de vídeo e a biblioteca usa o elemento HTML `<video>` com controles nativos, thumbnail e carregamento sob demanda. Reprodução real e fallback para fonte externa ainda precisam de validação no navegador.

## Imagens — PARTIAL

A busca de imagem e o registro persistente de assets estão implementados. A abertura, zoom/pan e atribuição de origem não foram validados por E2E visual nesta sessão.

## Performance — BLOCKED

Não houve benchmark contínuo nesta execução. Na verificação anterior da VPS, o disco estava com 96% de uso e havia aproximadamente 925 MiB de RAM disponíveis. Evitar rebuild e aumento de workers até a capacidade ser medida novamente.

## VPS — BLOCKED

Evidência de 2026-10-08: `/health` da API Fênix e `/v1/models` da API Platform responderam HTTP 200; o chat do provedor falhou (HTTP 500), a credencial configurada recebeu HTTP 401 e Ollama excedeu o timeout. Após o push desta consolidação, a checagem pública encontrou `/GRG-login` e `/health` em HTTP 200, `/api/health` em HTTP 401 e a porta direta `:4410/api/health` inacessível a partir deste ambiente. Isso não confirma que a versão nova esteja rodando. O bundle remoto diverge do local; nenhum deploy ou reinício controlado foi feito.

## Testes E2E — PARTIAL

A automação Playwright autenticada em runtime local passou pelos aliases de navegação, QA Visual sem execução, conectores/MCP, abertura de Operações, seleção de projeto e contexto compartilhado na IDE, leitura e gravação real de arquivo. O salvamento retornou `Salvo com sucesso · memória v1`; como o runtime local estava sem banco, Redis e Qdrant, esse teste não prova persistência durável após reinício. O percurso completo com conversa, job, agente na Cidade, resultado, memória após reinício e publicação na VPS continua pendente.

## Testes de honestidade — PARTIAL

Os testes focados verificam indisponibilidade real do provedor, ausência de resposta inventada, estados de fila do JobEngine e resultado persistido. A busca global de `mock`, `dummy`, `fake`, `placeholder`, `sample`, `demo`, `fallback`, `hardcoded`, timers e randomização ainda não classifica cada ocorrência do monorepo; portanto, não se declara ausência total de mocks.

## Pendências reais

1. Corrigir a URL e a credencial da API Platform no servidor usando um canal seguro e testar uma inferência real; investigar Ollama se ele permanecer como fallback.
2. Medir novamente disco, RAM, CPU e latência da VPS; preparar backup e rollback antes de qualquer publicação.
3. Publicar frontend e backend como um único release versionado quando a VPS estiver apta.
4. Executar no navegador autenticado o fluxo conversa → aprovação → fila → job → IDE → Cidade → eventos → resultado → memória.
5. Reiniciar API e worker de forma controlada e confirmar persistência, expiração de sessão, reconexão e retry.
6. Concluir revisão de todas as telas, ações e capturas em visão mundo, edifício e estação de agente.
7. Aplicar sandbox de sistema operacional e aprovação governada ao terminal antes de expor execução de comandos fora do perfil administrativo.

## Evidências

- Suíte focada executada após as mudanças: 35 testes passaram, incluindo conversa/job, rota HTTP de aprovação, MissionKernel, segurança e fila.
- Testes de sintaxe passaram para `grg/src/auth/auth.js`, `grg/src/missions/mission-kernel.js`, `grg/src/server.js` e `grg/public/command-center.js`.
- O novo teste HTTP confirma bloqueio de autoaprovação, despacho após aprovação independente, vínculo do job à missão e idempotência ao repetir a chamada.
- O teste de segurança `sessions persist as hashes and survive app restart` passou na repetição focada.
- O conjunto atual `runtime-telemetry-truth.test.js` passou: 4 testes cobrindo limite de diretório do terminal e estados desconhecidos nas telas de Runtime/Infraestrutura.
- `frontend-honesty.test.js` mais `runtime-telemetry-truth.test.js` passaram em conjunto: 23 testes.
- Repetição final da bateria integrada: 76 testes passaram, 0 falharam.
- O conjunto direcionado `node --test --test-force-exit grg/test/e2e-http.test.js grg/test/media-search-service.test.js grg/test/media-routes.test.js grg/test/world-asset-registry.test.js grg/test/living-os-vertical-slice.test.js grg/test/fenix-mission-job-api.test.js` passou: 35 testes.
- A suíte completa `node --test --test-force-exit --test-reporter=dot "test/*.test.js"` terminou com falhas em testes de subsistemas diversos, incluindo `api-platform-world-engine.test.js`, `compose-runtime-env.test.js`, `e2e-http.test.js` (corrida de cancelamento durante a execução concorrente; o arquivo passou no conjunto direcionado), `v70-v71-production-activation.test.js`, `visual-reality-gate.test.js`, `vps-chat-contract.test.js` e `workspace-responsive.test.js`. A suíte integral não está verde.
- `git diff --check` no workspace inteiro aponta whitespace em arquivos alterados fora deste fluxo; esse conteúdo não foi reformatado para evitar mudanças incidentais.

## URLs/rotas verificadas

- Teste local autenticado: `POST /api/approvals/:approvalId/approve` — status 202, aprovação consumida e job associado à missão.
- Teste local do canal de conversa: `POST /api/v2/conversation` — cria conversa persistida e missão real quando o pedido entra na faixa de execução.
- Código e testes da busca: `GET /api/media/search?query=...&type=image|video` — implementado; execução pública pelo navegador não verificada nesta sessão.
- VPS verificada anteriormente: `/health`, `/v1/models` — HTTP 200; `/v1/chat` — HTTP 500; autenticação do Fênix no endpoint configurado — HTTP 401.
- Navegação manual autenticada e comparação visual de todas as telas: NOT RUN/BLOCKED.

## Commits

Commits seletivos enviados para `origin/fenix/operational-os-20260924`: `aa832834` (telemetria e limite do terminal), `84c3d571` (evidência de rollout) e `15b7a5ab` (observabilidade baseada em runtime e dados de tenant). As demais alterações locais descritas neste relatório não foram incluídas: o workspace contém centenas de modificações rastreadas e milhares de arquivos não rastreados, incluindo segredo local e backups, então não foi seguro publicar o conjunto inteiro sem separar e revisar cada mudança.

## Deploy

BLOCKED: a API Platform ainda não passou no teste de chat, há evidência de credencial inválida e a VPS estava sob pressão de disco/RAM; o bundle local e o remoto também não coincidem. O commit foi enviado ao GitHub, mas não foi implantado na VPS. O endereço remoto deve ser atualizado em release completo, nunca por cópia isolada do HTML.

## Resultado final

Melhorias locais e o commit seletivo de telemetria/terminal foram testados e publicados na branch. A aprovação governada e persistência de sessão passaram nos testes focados. O upgrade global permanece parcial e a operação 24/7 na VPS não está comprovada.

```text
FENIX REALITY UPGRADE

BACKEND: PARTIAL
FRONTEND: PARTIAL
WORLD: PARTIAL
AGENTS: PARTIAL
PROJECTS: PARTIAL
JOBS: PARTIAL
EVENTS: PARTIAL
AI: FAIL
MEDIA SEARCH: PARTIAL
VIDEO: PARTIAL
IMAGE: PARTIAL
PERSISTENCE: PARTIAL
RECONNECTION: PARTIAL
PERFORMANCE: BLOCKED
E2E: PARTIAL
MOCKS: PARTIAL

REALITY SCORE: NOT_EVALUATED

BLOCKERS:
- A API Platform respondeu HTTP 500 ao chat e a credencial configurada no Fênix recebeu HTTP 401 no endpoint atual.
- Ollama excedeu o limite de 20 segundos na inferência medida.
- Evidência anterior da VPS: disco em 96% e cerca de 925 MiB de RAM disponíveis.
- O bundle remoto diverge do local; deploy atômico não foi feito.
- O E2E local autenticado validou aliases, QA, conectores, Operações e gravação pela IDE; a jornada completa no navegador público e após reinício segue pendente.
- A suíte completa de testes falhou em subsistemas além do caminho focado.

NEXT REQUIRED ACTION:
Atualizar a credencial/URL da API Platform por canal seguro, recuperar capacidade da VPS e então publicar o bundle completo com rollback, testar o fluxo autenticado no navegador e provar persistência após reinício.
```

### Verificações de navegador A–T

Todos os itens são `NOT RUN / BLOCKED`; a interação manual com o navegador não foi concluída nesta sessão.

| Teste | Estado | Evidência |
| --- | --- | --- |
| A — Login | NOT RUN / BLOCKED | Sem sessão de navegador autenticada verificável |
| B — Cidade | NOT RUN / BLOCKED | Ainda sem percurso completo da Cidade em runtime publicado |
| C — Zoom | NOT RUN / BLOCKED | Sem captura/interação |
| D — Seleção de edifício | NOT RUN / BLOCKED | Sem captura/interação |
| E — Seleção de agente | NOT RUN / BLOCKED | Sem captura/interação |
| F — Criar projeto | NOT RUN / BLOCKED | Cobertura HTTP/local não equivale ao navegador |
| G — Projeto aparece no mundo | NOT RUN / BLOCKED | Sem confirmação visual |
| H — Executar missão | NOT RUN / BLOCKED | Coberto por contrato local de API, sem percurso completo no navegador |
| I — Acompanhar execução | NOT RUN / BLOCKED | SSE foi testado no backend; UI completa com job real não foi verificada |
| J — Resultado aparece | NOT RUN / BLOCKED | Sem navegador |
| K — Memória atualiza | NOT RUN / BLOCKED | IDE confirmou `memória v1`; consulta visual e persistência durável após reinício pendentes |
| L — Buscar vídeo | NOT RUN / BLOCKED | Rota e testes controlados, sem browser |
| M — Reproduzir vídeo | NOT RUN / BLOCKED | Sem player real verificado |
| N — Buscar imagem | NOT RUN / BLOCKED | Rota e testes controlados, sem browser |
| O — Abrir imagem | NOT RUN / BLOCKED | Sem viewer verificado |
| P — Atualizar navegador | NOT RUN / BLOCKED | O teste local não cobriu restauração após recarga |
| Q — Confirmar persistência | NOT RUN / BLOCKED | O runtime local caiu para armazenamento em memória; reinício não foi comprovado |
| R — Queda de conexão | NOT RUN / BLOCKED | Sem simulação visual |
| S — Reconectar | NOT RUN / BLOCKED | Sem simulação visual |
| T — Coerência do mundo | NOT RUN / BLOCKED | Sem captura após reconexão |

## Atualização de observabilidade — 2026-10-08

- A API autenticada do observatório agora lê projetos do `ProjectKernel`, missões do `MissionKernel` e contagens de jobs/agentes do estado persistido filtrado por tenant.
- O Reality Score permanece `NOT_EVALUATED` com valor nulo até existir auditoria real. Telas são lidas do shell publicado e marcadas `UNVERIFIED`; auditorias, linhagem, inspeção visual e rastreamento sem fonte retornam indisponível em vez de zero ou sucesso.
- Git, absorção, eventos de missão e swarm deixaram de ser interceptados por respostas estáticas; consultas de autoconhecimento usam a memória real com escopo de tenant. O botão de auditoria não declara sucesso nem gera snapshot inexistente.
- Testes focados mais recentes: 86 passaram, 0 falharam, incluindo contrato de rota, autenticação HTTP, dados por tenant, indisponibilidade honesta e regressões do fluxo de missão/job/memória.
- O navegador público ainda não foi validado interativamente e o deploy na VPS continua bloqueado pela divergência do bundle, falha do provedor e limite de disco/RAM já registrados. Esta alteração local ainda não prova operação 24/7.

## Verificação SSH somente leitura — 2026-10-08

- A API Platform está publicada em `209.50.241.22:3001`; `/health` respondeu `ONLINE`, mas `/v1/models` retornou `INVALID_API_KEY` tanto com a chave configurada no container Fênix quanto com a chave local disponível. Os valores das chaves não foram exibidos nem incluídos no Git.
- O container de produção do Fênix está configurado para `http://209.50.241.215:3000`, endereço sem rota. A porta pública `:3000` serve o frontend: `/v1/models` nela retorna `index.html`, não um catálogo de modelos. A tela `/GRG-login` respondeu HTTP 200.
- O backend PM2 estava `online`, mas com 82 reinícios, cerca de 3 horas de uptime e 100% de CPU na leitura. O `fenix-os-daemon` estava parado; disco em 96%, RAM disponível em cerca de 842 MiB e uso de memória do host em 86%.
- Nenhum arquivo de produção foi alterado e nenhum serviço foi reiniciado. Sem uma chave de API válida e com esses sinais de instabilidade, o deploy e o teste de chat real permanecem bloqueados.

## Atualização de interface e evidência — 2026-10-08

- O painel de QA Visual agora distingue relatório de teste de simples captura. Sem relatório e sem imagens, a API retorna `NOT_RUN` com zero resultados; imagens sem relatório recebem `CAPTURED`, sem diferença visual ou aprovação inventada.
- Runtime, Provedores/MCP e Observabilidade renderizam dados das rotas correspondentes ou um estado indisponível. A lista de Operações não tem mais missões/jobs de exemplo; progresso e ETA aparecem somente quando o job os reporta.
- Os contadores da fila no Runtime agora são calculados dos jobs persistidos do JobEngine e filtrados pelo tenant autenticado; o estado de pausa aparece como não exposto, pois o JobEngine não fornece essa medição.
- O teste E2E local autenticado passou: `node qa/project-ide-live-playwright.mjs`. Validou `dna`→Conhecimento, `metrics`→Observabilidade, QA sem certificação falsa, painel de conectores sem status Docker sem medição, origem `JobEngine` no Runtime, abertura de Operações, seleção “Projeto de QA”, cabeçalho de contexto e gravação do arquivo real no workspace temporário, sem erros JavaScript.
- Testes direcionados desta atualização passaram: 45 testes de honestidade, runtime, provedor e QA; 10 testes de JobEngine/MissionKernel/fila. `node --check` passou nos quatro arquivos JavaScript alterados. A suíte integral não foi repetida.
- O commit seletivo `3c9b89d1` foi enviado a `origin/fenix/operational-os-20260924`; inclui os arquivos relacionados a IDE, Runtime/JobEngine, Operações, QA e os testes desta entrega. Esse push não publicou a VPS.
- O teste local iniciou com persistência degradada em memória por ausência de Postgres, Redis e Qdrant. Assim, ele prova o salvamento pela API e a resposta de memória da sessão de teste, não retenção durável 24/7.
- A VPS continua sem deploy nem reinício: a credencial da API Platform falhou em autenticação e o host permanece sob os limites de capacidade já registrados. O E2E publicado e os itens A–T continuam pendentes.
