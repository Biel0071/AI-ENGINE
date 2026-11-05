# GRG SPACE — backlog de bugs visuais

Registro contínuo de defeitos observados em capturas, reproduzidos no navegador ou encontrados por testes. Este arquivo é a fonte de acompanhamento mantida à mão; `qa-results/screen-improvement-queue.json` continua sendo um relatório gerado e não substitui este histórico.

## Estados e evidência

- `OBSERVED`: aparece em captura, ainda sem reprodução controlada.
- `REPRODUCED`: reproduzido com passos registrados.
- `FIXED`: correção aplicada no workspace local, ainda sem validação visual final ou rollout.
- `VERIFIED`: correção reproduzida e validada no navegador na versão indicada.
- `BLOCKED`: não pode avançar sem uma dependência identificada.

Fechamentos ficam no histórico. Não reusar IDs. Uma correção local não significa que a VPS já recebeu a versão.

## Estado da auditoria

- **UI-017 — missão confundida com job — 20/10/2026:** reproduzido no browser a partir de resposta `MISSION_LANE` com `jobId: null`: o chat mostrava `JOB #NOVO`, status de fila, progresso e modelo inventados. O roteamento agora mantém missão no renderizador de conversa, mostra somente ID/estado/objetivo da missão e limita a confirmação ao mesmo ID. Histórico legado também é renderizado como missão; `JOB_LANE` sem ID real recebe erro explícito sem cartão nem ações. Teste Edge browser 1/1 cobriu resposta, reload legado e job sem ID; captura após correção: [sidebar-mission-card-1280-after.png](visual-evidence/2026-10-20/sidebar-mission-card-1280-after.png). Alteração local; provider/runtime real e versão da VPS ainda não foram revalidados.
- **UI-013 — painéis modais acessíveis — 20/10/2026:** reproduzi que Cockpit/Operações cobriam a Cidade como overlays sem semântica de diálogo, foco inicial, fechamento por Esc nem retorno de foco. Marcação de diálogo e nome acessível agora são aplicados ao Cockpit, Operações e Biblioteca; Tab/Shift+Tab ficam contidos, Esc fecha e o foco retorna ao controle visível ou à área do mapa. O teste browser de geometria/fluxo passou 6/6, incluindo os quatro viewports e a troca exclusiva entre painéis. Alteração local; a cena da VPS não foi conferida e capturas dedicadas pós-correção continuam pendentes.
- **Screen DNA — 20/10/2026 11:27 BRT:** corrigi no Page Registry da VPS quatro URLs de captura do Fênix que apontavam para arquivos inexistentes. Agora usam imagens armazenadas da Cidade, Projetos, IDE e Command, todas respondendo HTTP 200; o catálogo autentica `/api/v2/pages` e busca essas imagens como referências históricas de 21/09/2026. A tela mostra a data e avisa que não é o runtime atual. Backup em `/root/grg-space-backups/20261020-screen-dna-archive/`. O `fenix-backend` reiniciado voltou `ready`; o JS servido e a referência cache-busted do HTML foram conferidos. Testes locais focados passaram (5/5 para Screen DNA; 2/2 para layout/Inspector). Falta abrir o catálogo autenticado na VPS e conferir o resultado na página; a sessão atual redireciona ao login.
- **Publicação parcial — 20/10/2026 11:12 BRT:** publicada regra isolada para impedir que o Inspector flutuante do agente reapareça sobre a Cidade enquanto o Fênix está aberto. `/opt/fenix-os/public/city-sidebar-overlay-fix.css` respondeu HTTP 200 com SHA-256 `f02dcc83fdc44b8a0c462ac9ff7566b67f50bf97bf1a8f488ccd272becbeef52`; o HTML servido referencia `?v=20261020-1`. Backup do HTML anterior: `/root/grg-space-backups/20261020-city-inspector-overlay/index.html`. Teste Playwright/Edge local passou em 375, 768, 1280 e 1920 px. Verificação visual autenticada da VPS segue pendente porque a sessão retornou ao login durante a atualização.
- **Fast Lane e popup — 20/10/2026 11:01 BRT:** alterações focadas no roteamento para priorizar o provider conversacional configurado, excluir Echo do Fast Lane e retirar estimativas aleatórias de tokens/custo foram publicadas em `/opt/fenix-os/grg/src`. O `fenix-backend` voltou a `ready`; cópias prévias em `/root/grg-space-backups/20261020-chat-real-provider/`. O asset de modal servido respondeu HTTP 200 sem `Carregando tarefa...`, SHA-256 `dcbd5d0eeb464d70fad355d637666355a8e1de159e4428f41b9218a1edd6b8e1`. Testes focados locais: 49/49. Resposta semântica do chat após publicação e primeira pintura autenticada ainda não foram verificadas.
- **Validação de sessão e World — 20/10/2026 12:10 BRT:** o navegador foi redirecionado de `/app#city` para `/GRG-login` ao atualizar, mas o fluxo de login já aberto voltou à Cidade. Pela mesma sessão, `/api/v2/auth/check` respondeu `authenticated:true` e `/api/v2/living-city/agents` e `/api/v2/living-city/state` retornaram HTTP 200 com 39 agentes; ainda assim a UI mostrava “Aguardando leitura dos agentes da API” e “Telemetria indisponível”. Isso confirma dois defeitos independentes: navegação que cai no login apesar de cookie válido, e estado do World que não chega ao renderizador. Captura da aba feita nesta sessão em 791×1117 mostra a sidebar ocupando quase metade da área, controles inferiores cortados e Echo exibido como resposta concluída. Nenhuma missão foi aprovada.
- **Capacidade Design Intelligence — 20/10/2026:** criado `skills/grg-space-design-quality-gate/SKILL.md`, descoberto automaticamente pelo SkillRegistry para tarefas de interface/UX/QA. Usa princípios HIG como referência sem copiar sua aparência, exige evidência por viewport e atualização do backlog. A implementação está local; publicação e teste via `/api/skills` na VPS pendentes.
- **QualityGate fail-closed — 20/10/2026:** removida a aprovação heurística por ausência/falha do LLM. A certificação agora requer validadores por critério que retornem `passed:true` e evidência; auditoria de IA é consultiva. Sem validadores reais registrados, o resultado permanece falho, como exige a evidência disponível. Correção local; nenhum rollout de backend feito nesta rodada.
- **Atualização ao vivo — 20/10/2026 10:40 BRT:** a VPS foi revalidada após uma correção pontual no classificador da conversa. A primeira pintura autenticada abriu `#city`; clicar em `Command` manteve a Cidade. O chat autenticado agora classifica a pergunta de teste como `FAST_LANE` e não desenha um novo cartão de missão; o retorno recebido, porém, foi `[echo-small] answer(636)` em 22,07 s, portanto a resposta útil por modelo real continua `FAIL`. Os eventos de missão continuavam no registro de teste das 10:29; nenhum evento novo surgiu após a correção. `/health` voltou `ready` após reinício focal do `fenix-backend`. Roteador servido SHA-256 `0ffa8d1c30a397c5df427e9a220b7ddeee31f16a9eaefe59019a20da63840238`; backup prévio em `/root/grg-space-backups/20261020-intent-negation-fix/conversation-router.js`.
- **Atualização ao vivo — 20/10/2026 10:55 BRT:** no navegador autenticado, a tela `#city` reproduziu novamente o modal genérico de tarefa e o retorno Echo. O teste real de conexão da API Platform passou em `3.469 ms`; isso confirma que o provider pode responder, mas ainda não prova uma conversa útil. Hash do asset servido `fenix-task-modal.js`: `e38cb31120190bad2125e862391b2cbcc255d0d90b9edcb3454db845114ef685`; ele contém `Carregando tarefa...` e está referenciado como `v=20261017`. A versão local, hash `dcbd5d0eeb464d70fad355d637666355a8e1de159e4428f41b9218a1edd6b8e1`, não contém o placeholder e valida aprovações. A Cidade em viewport 858×1280, com chat e Inspector abertos, deixa pouco espaço útil para o mapa; o minimapa e a barra inferior competem pela área visível. Na implementação local, o chat agora prioriza a rota conversacional configurada e exclui `echo` dos fallbacks; o popup deixa de inventar tokens/custo. Mudanças ainda não publicadas nem verificadas na VPS.
- **Incidente de teste controlado:** antes da correção, a pergunta “Quanto é 2 + 2? Responda apenas o resultado. Não crie tarefa, job ou arquivo.” gerou a missão `d139ccd5-e1d9-4d3c-b89e-343347a66b8e`, estado `AWAITING_APPROVAL`, `jobId: null`. Nenhuma etapa foi executada. Tentativa de cancelamento pela API sem sessão autenticada foi recusada; o artefato permanece pendente e precisa de encerramento pelo fluxo autenticado de missões. Não aprovar.
- Data: 2026-10-20.
- Capturas de referência: anexos 1–7 da solicitação, com a aplicação em `#city`, além das capturas de projeto e cockpit anteriores.
- Workspace: árvore baseada em `bb57b6ad`; contém alterações locais pré-existentes e não está limpa.
- VPS `209.50.241.22:3000`: `/app` respondeu HTTP 200. O HTML servido ainda marca `view-command` como ativo e `view-city` sem `active`. O `fenix-core-controller.js` servido difere do arquivo local e não contém o alias `command → city` verificado no workspace. No navegador, a rota `#projects` autenticada abriu o projeto FÊNIX OS; o chat continuou retornando `PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT`.
- Identidade observada no servidor: cabeçalho da UI exibe `v2.5.0`; HTML `/app` SHA-256 `71EEEC47DB6FFB62EFBA9056A86DBD50D69C5662162C6CA08A81C922F743FC13`; `fenix-core-controller.js` SHA-256 `3B6E65673768AC337B1B5CBD1ED101124DCB914C12923174C674639E854C5BAB`. O rótulo visual não é um identificador imutável de release.
- Screen DNA na VPS: a absorção do FÊNIX OS confirmou “718 telas mapeadas”. Ao abrir a aba, as entradas observadas indicavam `Captura não registrada`, `DOM não medido` e `Origem: observação registrada`; rotas como `#view-command` e `#view-city` repetiam-se. O número representa itens indexados pelo backend, não 718 capturas visuais verificadas.
- A revisão visual após fechar a sidebar mostrou o cartão Screen DNA com um preview preto “Captura não registrada”; a faixa de detalhes do projeto também fica estreita por causa da coluna fixa de projetos. Nenhuma screenshot real do próprio app apareceu no catálogo.
- Evidências enviadas pelo operador arquivadas em `docs/visual-evidence/user-reports-2026-10-20/`. As capturas 4 e 5 originais eram duplicadas; uma cópia foi preservada.
- Execução local: Edge headless, via `FENIX_QA_CHROMIUM_PATH`. Testes de browser são reproduzíveis sem baixar Chromium.
- Capturas locais pós-correção: `docs/visual-evidence/2026-10-20/city-{375x812,768x1024,1280x800,1920x1080}.png` (servidor estático local; sem alegação de runtime/VPS).

## Bugs priorizados

### PROJ-001 — Project Hub duplica projetos do catálogo local

- Prioridade: `P1` · Estado: `FIXED` local · Área: `src/projects/project-kernel.js`.
- Evidência: catálogo `Desktop/PROJETOS/projetos.json` contém 43 itens; antes do ajuste, merge sempre prefixava IDs e a lista simulada do Registry (7) totalizava 50 cards, incluindo cinco projetos principais duplicados.
- Reprodução: mesclar `PROJECTS` com `getLocalProjects()` e observar IDs repetidos para ZapAI CRM, API Platform, MF Atacadista, Task Board e Gerar Ficha.
- Correção: projetos principais com ID igual enriquecem o card canônico; nomes de alias só mesclam quando workspace e nome relacionado coincidem em um projeto do Registry. Variantes e entradas de arquivo isolado permanecem independentes.
- Teste: `test/project-kernel-local-catalog-merge.test.js` e `test/local-project-catalog-integration.test.js`.
- Validação local: 22/10/2026; 7/7 testes passaram. Merge atual retorna 44 cards (7 Registry + 43 catálogo − 6 correspondências principais/alias), com 37 cards locais, 6 cards enriquecidos; DroidView é associado por workspace e nome relacionado. VPS não alterada.
- Fechamento `VERIFIED`: conferir lista no Project Hub em browser autenticado e confirmar logos/ações por card sem perder variantes.

### UI-001 — Cockpit ativo na primeira pintura

- Prioridade: `P0` · Estado: `VERIFIED` local · Rota: `#city`, hash vazio, `#command` legado.
- Evidência: captura 1; HTML servido pela VPS com `view-command.active`; teste local reproduziu o estado inicial antes de JavaScript.
- Causa encontrada: o HTML base ativava o cockpit enquanto a Cidade só era selecionada depois da inicialização das rotas.
- Correção local: Cidade é ativa no HTML inicial; cockpit inicia inativo; estado de rota inicial do controlador também usa `city`.
- Reprodução: abrir `/app` sem hash, abrir `#city`, abrir `#command`, atualizar e restaurar uma sessão.
- Teste: `test/city-first-paint.test.js`, `test/shell-startup-responsive.test.js` (raiz, preferência salva e alias `#command → #city`).
- Validação: 21/10/2026; Playwright confirmou `view-city` no primeiro HTML, raiz sem hash com preferência salva para Memória, sessão inicial com sidebar fechada e alias `#command → #city`. `test/city-first-paint.test.js test/shell-startup-responsive.test.js` passou 2/2; responsividade de Memória passou em tablet, celular e desktop, tratando o grafo oculto como estado correto quando não há dados medidos.
- Fechamento local: concluído na versão de workspace testada. VPS permanece divergente e não verificada; publicação não executada.
- Reteste HTTP 21/10/2026: `/app` respondeu `200` com `view-city.active` e `view-command` sem `active`; confirma o HTML inicial servido, sem certificar a pintura visual autenticada nem as rotas de login/refresh. A captura automatizada do navegador falhou no CDP, então a validação VPS completa permanece pendente.

### UI-002 — Sidebar do Fênix abre automaticamente

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: todas; primeira visita.
- Evidência: o teste de navegador encontrou `has-right-sidebar-open=true` sem preferência salva; captura 1 mostra a conversa cobrindo parte do cockpit.
- Causa encontrada: ausência de `fenix_sidebar_state` era interpretada como “aberta”.
- Correção local: primeira visita começa fechada; preferências salvas `open`/`minimized` continuam respeitadas.
- Reprodução: limpar armazenamento local e abrir a aplicação; depois salvar a preferência aberta e atualizar.
- Teste: `test/shell-startup-responsive.test.js`.
- Validação: 20/10/2026; `test/shell-startup-responsive.test.js` confirma sidebar fechada em sessão limpa; preferência `open` persistida continua suportada pela implementação.
- Fechamento local: workspace visível na primeira visita. Revalidação da persistência `open` após reload ainda não tem asserção automatizada dedicada.

### UI-003 — Minimap, troca de visualização e barra Universo colidem

- Prioridade: `P1` · Estado: `VERIFIED` local · Viewports: 375 px e 768–1920 px.
- Evidência: captura 2 e medições locais; em 375 px o HUD do Universo cruzava o minimapa; em 768 px a barra de navegação tocava/sobrepunha o minimapa em 5 px.
- Causa encontrada: offsets de rodapé fixos não correspondiam à altura renderizada dos painéis.
- Correção local: empilhamento móvel usa alturas/gaps de referência do HUD e minimapa; desktop/tablet reposiciona a barra acima da altura medida do minimapa.
- Reprodução: abrir `#city` em 375×812, 768×1024, 1280×800 e 1920×1080.
- Teste: `test/city-overlay-layout.test.js` mede interseções entre os três controles.
- Validação: 20/10/2026; `test/city-overlay-layout.test.js` passou nos quatro tamanhos; capturas pós-correção em `docs/visual-evidence/2026-10-20/` confirmam minimapa e barra inferior sem interseção.
- Fechamento local: controles verificados sem chat aberto. A barra inferior ainda comprime/corta rótulos em 375 px; ver UI-011.

### UI-004 — Rótulo de resolução excede espaço da barra superior

- Prioridade: `P2` · Estado: `VERIFIED` local · Viewport: 1440 px.
- Evidência: o teste Playwright mediu `scrollWidth=1492` em uma barra de 1440 px e identificou a cápsula de resolução comprimindo a faixa das ações.
- Correção local: ocultar a cápsula de resolução até 1440 px; navegação, tela cheia e chat permanecem acessíveis.
- Reprodução: abrir `#memory` em 1440×900.
- Teste: `test/shell-startup-responsive.test.js`.
- Validação: 20/10/2026; teste de shell responsivo passou em 1440 px.
- Fechamento local: sem overflow da barra superior; VPS não verificada.

### UI-005 — KPIs e workspace da Memória excedem largura útil

- Prioridade: `P2` · Estado: `VERIFIED` local · Viewports: 797 px com chat aberto/fechado.
- Evidência: o teste encontrou overflow de 5 px nos KPIs; com o chat dockado, o workspace tentava renderizar colunas de 210 px e 280 px em somente 308 px.
- Correção local: permitir quebra do conteúdo de KPI e colapsar a grade da Memória para uma coluna quando o chat está aberto em tablet.
- Reprodução: abrir `#memory` em 797 px e abrir a sidebar do Fênix.
- Teste: `test/shell-startup-responsive.test.js`.
- Validação: 20/10/2026; teste de shell responsivo passou em 797, 390 e 1440 px.
- Fechamento local: larguras internas respeitam o contêiner na matriz testada; VPS não verificada.

### UI-006 — Inspector cobre área útil do mapa

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota/viewport: `#city`; 375×812, 768×1024, 1280×800 e 1920×1080.
- Evidência inicial: captura 2 do relato mostra o Inspector sobre o mapa; a reprodução local também encontrou colisão com aviso de runtime, minimapa, barra de navegação e orbit de provedores.
- Causa reproduzida: regras responsivas posteriores em `fenix-responsive.css` forçavam o Inspector para baixo e limitavam sua altura, enquanto o painel e a ferramenta orbit ocupavam a mesma área.
- Correção: reservar o topo para o aviso de runtime; restringir e limitar a altura do Inspector em celular; afastá-lo do orbit em celular, tablet e desktop. O painel permanece rolável para conteúdo longo.
- Reprodução: inserir Inspector no canvas e medir interseções com `#cityRuntimeLoadStatus`, `#fenixWorldMinimap`, `#fenixCityNavPill`, `#fenixUniverseExplorerHUD` e `#fnxProviderOrbit` nas quatro larguras.
- Teste: `test/city-overlay-layout.test.js` mede todas as cinco colisões e a suíte completa passou 4/4 em 20/10/2026.
- Captura local após correção: [city-agent-inspector-375-verified.png](visual-evidence/2026-10-20/city-agent-inspector-375-verified.png).
- Limite da evidência: Inspector e controles foram exercitados com CSS real em página estática; o runtime retornou HTTP 404, então identidade/seleção autenticada do agente e validação na VPS continuam `PENDING`.

### UI-007 — Painéis operacionais e de mídia cobrem a Cidade

- Prioridade: `P1` · Estado: `FIXED` local; sessão autenticada pendente · Evidência original: capturas 6–7 e teste local do painel de mídia.
- Área provável: drawers da Cidade e camadas de empilhamento sobre `fenixCityWorldArea`.
- Reprodução: abrir Central de Operações e Biblioteca de Ativos, individualmente e com sidebar/chat abertos.
- Testes relacionados: `test/city-operation-layout.test.js`, `test/city-project-inspector-flow.test.js`.
- Progresso 20/10/2026: Biblioteca de Ativos corrigida em UI-037. Central de Operações e Cockpit agora são exclusivos entre si e com a Biblioteca; os drawers ficam abaixo do aviso do runtime e mantêm o fechamento dentro da área da Cidade. Foi reproduzida colisão do chat com o drawer em 375 px. Correção: em telas até 760 px, abrir o chat fecha os drawers e abrir Cockpit/Operações/Ativos recolhe o chat; a partir de 768 px podem coexistir. Playwright verifica ausência de interseção em 375/768/1280/1920 px. Captura local: [city-operations-after-mobile-chat-collision-fix.png](visual-evidence/2026-10-20/city-operations-after-mobile-chat-collision-fix.png).
- Pendente: combinações com Inspector autenticado e a geometria do chat redimensionado ainda precisam ser validadas com sessão real. HTML estático de QA responde HTTP 404 para o runtime; nenhum estado de produção foi certificado.
- Atualização 21/10/2026: o teste Chromium atual percorreu Operações, Cockpit e Biblioteca, exclusividade de painéis, fechamento por Escape, foco restaurado, aviso de runtime, sidebar e controle de mapa em 375/768/1280/1920 px. A suíte `test/city-overlay-layout.test.js` passou 9/9. UI-078 fecha o excesso de altura em conteúdo longo. Captura móvel: `docs/visual-evidence/2026-10-21/city-operations-drawer-content-fit-375-after.png`.
- Limite/critério restante: repetir na sessão autenticada com chat redimensionado, Inspector de agente real e dados da API; validar a versão publicada. VPS não foi alterada.

### UI-008 — Enquadramento da Cidade corta estruturas e amplia terreno

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city`; 375×812, 768×1024, 1280×800 e 1920×1080.
- Evidência inicial: capturas 2 e 4 mostram foco muito próximo em mobile, com edifícios cortados e muito terreno sem contexto.
- Causa: PerspectiveCamera mantinha o mesmo FOV de 38° e distância em todos os aspectos; em retrato, o FOV horizontal ficava estreito e a Cidade parecia ampliada/cortada.
- Correção: FOV e distância agora ajustam o enquadramento pelo aspecto do canvas. A preferência de zoom é salva em escala relativa à câmera de referência e permanece estável quando o viewport muda. A migração v2→v3 não desloca alvos que já usam coordenadas canônicas.
- Valores observados no browser com WebGL: 375 px: FOV 55°, distância 254.9; 768 px: FOV 55°, distância 193; 1280 px: FOV 38.04°, distância 136; 1920 px: FOV 34.14°, distância 136. Sem erros JavaScript de página.
- Evidência antes/depois local: [city-camera-default-375.png](visual-evidence/2026-10-20/city-camera-default-375.png) → [city-camera-fit-375.png](visual-evidence/2026-10-20/city-camera-fit-375.png), e [city-camera-fit-768.png](visual-evidence/2026-10-20/city-camera-fit-768.png), [city-camera-fit-1280.png](visual-evidence/2026-10-20/city-camera-fit-1280.png), [city-camera-fit-1920.png](visual-evidence/2026-10-20/city-camera-fit-1920.png).
- Testes: `test/city-world3d-terrain.test.js` e `test/world-camera.test.js` cobrem ajuste portrait/desktop, zoom relativo e migração.
- Limite: visual local confirmado com WebGL, porém os endpoints do runtime retornam HTTP 404 na fixture e a VPS autenticada redireciona ao login; sincronização com entidades e validade em produção continuam pendentes.
- Fechamento local: distrito central volta a aparecer com contexto em portrait/desktop; zoom salvo continua proporcional após resize. Certificação da VPS não feita.

### UI-009 — Avatares pouco distintos na escala da Cidade

- Prioridade: `P2` · Estado: `VERIFIED` local · Evidência original: capturas 2 e 4; captura comparativa isolada em `%TEMP%/grg-city-agent-profiles-v2-qa.png`.
- Causa reproduzida: agentes dinâmicos usavam o mesmo acessório, fallback amarelo de alta visibilidade e etiqueta genérica. Parte do crachá cobria a cor do uniforme.
- Correção: `city-agent-visual-profile.js` deriva uma paleta discreta, acessório, cabelo e ícone do papel/departamento reais, com variação estável por ID para papéis não mapeados. Uniformes mantêm escala humana e a faixa refletiva virou detalhe estreito.
- Verificação local: três fixtures temporárias com papéis de segurança, plataforma e análise renderizadas em WebGL mostraram cores de uniforme/halo, acessórios e etiquetas diferentes. Fixtures existiram apenas na página de QA e não foram persistidas. Teste focado cobre mapeamento determinístico e legibilidade do uniforme.
- Limite: runtime autenticado estava indisponível; validar a projeção com os agentes reais na VPS permanece pendente.
- Testes relacionados: `test/city-agent-visual-profile.test.js`, `test/city-world3d-agent-coordinates.test.js`.
- Fechamento: agentes continuam identificáveis por nome/estado, modelos apresentam diferenças legíveis por perfil e posição estimada não é confundida com telemetria medida.

### UI-010 — Rótulos perdem hierarquia e disputam espaço

- Prioridade: `P2` · Estado: `VERIFIED` local · Evidência original: capturas 2 e 4; reprodução local em 375 px e orbit de provedores.
- Causa reproduzida: a largura automática do rótulo absoluto colapsava quando ancorado perto da borda direita. A lista de obstáculos consultava `#fenixProviderOrbit`, mas o controle existente usa `#fnxProviderOrbit`, permitindo colisão da placa Industrial Hub.
- Correção: as placas usam `max-content` limitado pelo `max-width` responsivo; o posicionador considera o ID correto do orbit e preserva compatibilidade com o nome legado.
- Teste: `test/city-district-label-layout.test.js` verifica largura mínima/texto visível, limites do canvas, colisões entre placas e colisão com o orbit em 375, 768, 1280 e 1920 px.
- Verificação visual: captura local após correção em `%TEMP%/grg-city-label-mobile-after-orbit-fix.png`; a placa Industrial Hub fica acima do orbit e as oito placas móveis mantêm texto.
- Limite: runtime autenticado indisponível; confirmação com dados reais de entidades continua pendente. VPS não alterada.
- Fechamento local: textos não colapsam, placas não se sobrepõem ou cobrem o orbit, nem saem dos limites do canvas nas quatro larguras.

### UI-011 — Barra de controles inferior comprime rótulos em celular

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city` · Viewport: 375×812.
- Evidência: a captura anterior `docs/visual-evidence/2026-10-20/city-375x812.png` mostrava “Command Center” truncado. Após a correção, `docs/visual-evidence/2026-10-20/city-375-selector-verified.png` mostra o rótulo curto “Central” legível e a barra sem colisão com o minimapa.
- Passos: abrir Cidade a 375 px em modo Universo e conferir o seletor, controles de zoom, minimapa e barra inferior.
- Causa: o seletor tinha 80 px, embora a maior opção ocupasse 103 px antes de incluir padding e seta.
- Correção local: opções visuais concisas, nomes completos acessíveis via `aria-label`/`title`, seletor responsivo de 112 px.
- Teste: `test/city-overlay-layout.test.js` mede o texto das nove opções e verifica colisões em 375, 768, 1280 e 1920 px.
- Validação: 20/10/2026; teste Playwright/Edge passou 3/3. A captura foi feita com assets locais estáticos; o endpoint do runtime retorna 404 nesse modo, portanto ela comprova geometria/legibilidade, não operação da Cidade nem publicação na VPS.

### UI-012 — Catálogo Screen DNA conta referências como telas sem captura

- Prioridade: `P1` · Estado: `VERIFIED local` / `REPRODUCED VPS` · Projeto: FÊNIX OS · Rota: `#projects` → `Screen DNA`.
- Evidência do operador: [03-projects-screen-dna.png](visual-evidence/user-reports-2026-10-20/03-projects-screen-dna.png). Evidência ao vivo em 20/10/2026: a absorção mostrou “718 telas mapeadas”; o catálogo carregado listou `Captura não registrada`, `DOM não medido` e `Origem: observação registrada`, incluindo rotas repetidas (`#view-command`, `#view-city`, entre outras). Reprodução ao vivo em 22/10/2026 na sessão autenticada da VPS: o cartão do projeto continuou em 718, enquanto o contêiner virtualizado do Screen DNA reportou “showing 0-500 of 6401 items”; os primeiros registros apontam para `archive/frontend/...` e `backups/...`, sem captura e sem DOM medido, mas mostram “6 componentes” e “Origem: observação registrada”. Isso reproduz a divergência do catálogo e a apresentação de evidência sem medição. A observação foi feita no browser; uma captura em arquivo ainda não foi arquivada.
- Reprodução: no navegador autenticado, selecionar FÊNIX OS, clicar `Absorver DNA` e abrir `Screen DNA`.
- Área/cause confirmada no workspace: `src/absorption/project-absorption-engine.js` (`#extractScreens`) percorre todas as ocorrências de `id="view-..."` em cada HTML, incluindo cópias/arquis, sem deduplicar; `#buildScreenDna` atribui componentes/layout/cores/hierarquia fixos e `confidence: 1.0` sem medir DOM ou capturar a tela. Isso explica por que uma descoberta estática pode ser contada como tela observada e pode contribuir para rotas repetidas; a fração que explica as 718 entradas da VPS ainda não foi medida.
- Correção local: ocorrências de rota repetidas no mesmo HTML são deduplicadas; telas em apps diferentes mantêm IDs e escopos separados, mesmo com a mesma rota. Screen DNA estático agora tem `SOURCE_DISCOVERED`, DOM `NOT_INSPECTED`, captura `NOT_CAPTURED` e confiança não pontuada; componentes, layout responsivo, estados e dependências não observados ficam vazios/não medidos. Uma captura via browser real atualiza apenas a tela efetivamente inspecionada. O Project Hub usa `title` quando não há `name`, identifica variantes de app apenas quando há colisão de rota e rejeita previews abaixo de 64×36 px no canvas e no portfólio.
- Verificação local: o teste começou reproduzindo 3 registros para 2 rotas de duas aplicações; agora verifica deduplicação dentro do arquivo, preservação das aplicações, proveniência, captura e DOM reais. Browser confirma títulos, rótulos de app e miniatura inválida marcada como baixa resolução; captura: [screen-dna-multi-app-1280-after.png](visual-evidence/2026-10-21/screen-dna-multi-app-1280-after.png). Suítes Screen DNA/absorção/browser e regressões da Cidade: 49/49.
- Limite: teste usa dois apps e uma captura histórica de fixture; os dados de 718 telas da VPS não foram reabsorvidos nem comparados com a revisão servida. A sessão atual reproduz 6.401 itens no contêiner visual, mas a resposta bruta e a revisão servida ainda não foram coletadas para atribuir cada registro à fonte exata. Nenhuma publicação foi feita.
- Teste associado: `test/project-screen-dna-reality.test.js` verifica a UI, enquanto `test/project-absorption-reality.test.js` atualmente espera `confidence === 1.0`, embora esse valor não tenha prova de captura. Falta cenário integrado que valide deduplicação e proveniência para cada campo, além de captura/preview servido pela VPS.
- Critério de fechamento: cada item distingue rota descoberta, DOM inspecionado e screenshot efetivamente capturado; rotas repetidas por cópias/ocorrências são deduplicadas sem colapsar apps distintos; confiança nunca indica medição sem evidência; abrir uma entrada mostra screenshot real ou estado vazio explícito. Validar ao menos uma tela de Projetos e uma tela do próprio FÊNIX OS.

### UI-013 — Painéis da Cidade competem com mapa, minimapa e controles

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#city` · Viewports 375, 768, 1280 e 1920 px.
- Evidência: [05-city-operations-panel.png](visual-evidence/user-reports-2026-10-20/05-city-operations-panel.png) mostra a Central de Operações parcialmente encoberta pela barra inferior/minimapa; [06-city-media-library-panel.png](visual-evidence/user-reports-2026-10-20/06-city-media-library-panel.png) mostra a Biblioteca de Ativos sobre a cena, com conteúdo comprimido e espaço desperdiçado.
- Reprodução: abrir a Central de Operações e a Biblioteca de Ativos em sequência; repetir com a sidebar do Fênix aberta e fechada.
- Área confirmada: os painéis são overlays intencionais dentro da área da Cidade; o defeito reproduzível era o comportamento modal inacessível, somado à falta de cobertura do fluxo de teclado.
- Correção local: Cockpit, Operações e Biblioteca agora têm nome/semântica de diálogo modal, foco inicial, contenção de Tab, Escape e retorno de foco seguro. Abrir um painel remove o listener de teclado do painel anterior. A geometria de Operações e Biblioteca e a exclusividade entre painéis são verificadas pelo teste associado.
- Teste associado: `test/city-overlay-layout.test.js` — 6/6 passaram em Edge headless; mede minimapa/HUD/Inspector/Biblioteca nas quatro larguras e exercício de modal/foco/troca de painéis em 375 px.
- Critério de fechamento: overlay tem saída acessível, não sai da área útil, não cruza controles medidos e sua troca por outro painel é previsível. Capturas pós-correção e confirmação na VPS ainda pendentes; manter como `FIXED`, não `VERIFIED`, até essa evidência visual.

### UI-014 — Avatar e placa do agente não sustentam leitura na Cidade

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#city` → selecionar agente · Viewport conforme captura anexa.
- Evidência: [02-city-agent-inspector.png](visual-evidence/user-reports-2026-10-20/02-city-agent-inspector.png) mostra avatares pequenos e visualmente repetidos em escala de mapa; o Inspector informa `Modelo Não informado` sem deixar clara a procedência desse campo.
- Reprodução: comparar dois ou mais agentes de papéis distintos em visão global e aproximada; abrir o Inspector de cada um.
- Causa confirmada: os agentes dinâmicos eram desenhados em escala uniforme `1.0`; os detalhes de papel no perfil visual não calibravam o tamanho do personagem no enquadramento global.
- Correção local: o perfil dinâmico agora usa escala `1.75` (limite `1.9`), cabeça/cabelo com volumes arredondados e altura do cabelo relativa ao torso; paleta de pele estável pelo ID do agente e independente de papel/status. A captura de QA foi feita com um agente efêmero apenas no browser, sem registro no backend: `docs/visual-evidence/2026-10-21/city-avatar-style-1280-after.png`.
- Teste associado: `node --test test/city-agent-visual-profile.test.js` — 7/7 passaram; valida distinção de papéis, tom de pele determinístico, geometria arredondada e escala aplicada no renderer.
- Critério de fechamento: silhuetas e estados são distinguíveis na escala normal; nome, papel e estado usam campos existentes ou apresentam indisponibilidade explícita; coordenadas estimadas são diferenciadas das medidas.
- Limite: a captura pós-correção usa fixture visual sintética sem sessão autenticada; a conferência com agentes reais de papéis distintos na VPS continua pendente. Nenhuma publicação foi feita.
- Divergência de distribuição verificada em 21/10/2026: o HTML público da VPS não referencia `city-agent-visual-profile.js`, e a URL direta retorna 404. Portanto, a melhoria visual está somente no workspace local; a VPS ainda serve o avatar anterior. Manter pendente até validar a release implantada e a captura com agentes reais.

### UI-015 — Primeira tela da VPS ainda abre o cockpit legado

- Prioridade: `P0` · Estado: `FIXED` na VPS; matriz de entrada incompleta · Rotas: `/app`, `#command`, login + retorno, refresh.
- Evidência inicial: [01-cockpit-first-screen.png](visual-evidence/user-reports-2026-10-20/01-cockpit-first-screen.png) e HTML antigo servindo `view-command.active`.
- Correção na VPS em 20/10/2026: HTML inicial seleciona Cidade; `command/home/dashboard` apontam para `city`; controlador inicia em Cidade. Backup em `/home/deploy/grg-space-backups/20261020-city-first-paint/`. Em sessão autenticada, `/app#city` abriu a Cidade e clicar em `Command` manteve `#city` após atualização do frontend.
- Área: `public/index.html`, `fenix-core-controller.js` e artefatos do gateway.
- Testes: `test/city-first-paint.test.js`, `test/shell-startup-responsive.test.js` (Edge local passou 1/1); falta validar sessão limpa, `#command` direto, refresh e retorno do login na VPS.
- Critério de fechamento: HTML inicial e primeira pintura autenticada mostram Cidade em `/app`, `#city` e `#command`; refresh/login preservam a rota; hashes servidos correspondem à release; completar capturas nas quatro larguras.

### UI-016 — Sidebar do chat ocupa a área do mapa e preserva erros antigos como conversa ativa

- Prioridade: `P1` · Estado: `FIXED` no layout local; conversa/runtime VPS segue `PENDING` · Rota: `#city` / `#projects` com sidebar aberta.
- Evidência original: [04-city-chat-overlay.png](visual-evidence/user-reports-2026-10-20/04-city-chat-overlay.png) e captura ao vivo de 20/10/2026 em 919×1280 mostram a Cidade espremida pela sidebar. A reprodução local no Edge confirmou painel ocupando o espaço entre topbar e dock em 375×812.
- Correção local: em até 760 px, o modo normal da conversa virou painel inferior com altura limitada a 58dvh; a expansão explícita mantém modo quase em tela inteira. A faixa superior do mapa continua visível e o HUD de exploração/zoom volta a ficar acessível acima do painel. Não altera estado de aprovação, missão ou job.
- Evidência após correção: [sidebar-city-sheet-375-after.png](visual-evidence/2026-10-20/sidebar-city-sheet-375-after.png). É uma captura local do shell/layout; a página exibiu runtime indisponível HTTP 404, portanto ela não comprova agente ou telemetria reais.
- Reprodução: abrir `#city` em viewport de 375×812, ativar a sidebar e medir o painel; usar expansão para modo ampliado.
- Teste associado: `test/city-overlay-layout.test.js` verifica faixa de Cidade visível, expansão de conversa e regressões dos overlays/minimapa em larguras suportadas; Edge local passou 7/7.
- Critério de fechamento visual: painel normal não cobre mais de 68% da altura e preserva canvas; painel expandido ocupa mais de 82%. Satisfeito localmente. Fluxo autenticado da conversa, versão VPS e publicação continuam `PENDING`; o erro de conversa/runtime está rastreado separadamente em CHAT-003.

### UI-017 — Resposta de missão sem job real aparece como JOB #NOVO na conversa

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#city` → sidebar Fênix.
- Evidência: a pergunta de teste das 10:29 recebeu a missão `d139ccd5-e1d9-4d3c-b89e-343347a66b8e`, mas o cartão mostrava `JOB #NOVO`, `NA FILA BULLMQ`, `10%`, modelo `qwen2.5:3b` e estimativas apesar de `jobId: null`, estado `AWAITING_APPROVAL` e nenhum job ativo. A ação Cancelar respondeu que não conseguiu cancelar `#NOVO`.
- Passos: apresentar resposta `MISSION_LANE` sem `job.id` e comparar o registro real com o cartão.
- Causa confirmada: o dispatch do chat enviava `MISSION_LANE` para `appendJobMessage`, cujo renderizador aplicava defaults de job sem consultar `mission`.
- Correção local: `MISSION_LANE`/missão passam ao cartão de missão; confirm action só aparece quando o ID da ação corresponde ao ID recebido. Conversas antigas salvas como tipo job são reconhecidas; `JOB_LANE` sem `job.id`/`jobId` vira indisponibilidade explícita.
- Teste associado: `test/sidebar-mission-rendering.test.js` (Edge, fixture de API claramente controlada) valida ID/estado/objetivo, ausência de fila/progresso/provider/tokens fictícios, confirmação vinculada, reload do histórico legado e rejeição visual de `JOB_LANE` sem ID real; verifica overflow e captura a sidebar em 375/768/1280/1920 px.
- Critério de fechamento: missão pendente aparece como missão com ID/estado reais e ação válida; nenhum cartão de job, progresso, provider ou token aparece sem registro observado. Teste browser local passou; fluxo autenticado na VPS permanece pendente.

### UI-018 — Modal global mostra tarefa genérica sem vínculo demonstrável

- Prioridade: `P1` · Estado: bloqueio visual `FIXED` local; fluxo E2E e confirmação na VPS pendentes · Rotas: `#city`, `#operations` · Viewport conforme capturas anexas.
- Evidência: árvore de acessibilidade da VPS mostra `Carregando tarefa...`, objetivo genérico, 65%, 3.450 tokens e botões `Rejeitar`/`Aprovar & Executar`, sem ID de missão visível; aparece junto da Cidade sem estar associado a um card selecionado.
- Passos: abrir a Cidade após login e observar a camada de tarefa; navegar para Operações e voltar sem abrir uma missão específica.
- Área provável: modal global de missão/aprovação, restauração de seleção persistida e placeholders de runtime.
- Teste associado: `test/task-modal-no-placeholder.test.js`; exigir integração autenticada com missão existente e captura visual.
- Critério de fechamento: modal fechado por padrão sem registro real; quando aberto mostra ID, objetivo e estado do mesmo registro; rejeição/aprovação atua somente nesse ID e persiste após refresh.
- Causa rastreada: a VPS serve um `fenix-task-modal.js` antigo (`v=20261017`) sem a validação `isValidApprovalPopup`; a cópia local atual já recusa payloads sem ID/texto/estado válido. O HTML local solicita `v=20261020-task-modal-guard-1` para evitar reutilizar o asset antigo. A VPS também gerava estimativas aleatórias de tokens e custo no `DynamicPoolManager`; a implementação local removeu esses campos. A correção aguarda rollout e reprodução em sessão limpa.
- Evidência adicional de 20/10/2026: após refresh na aba autenticada, a árvore de acessibilidade voltou a expor o modal com título `3`, agente genérico `ESPECIALISTA`, tempo não iniciado e tokens/custo não medidos, sem ID de missão ou job visível. O screenshot contemporâneo não o mostrou; manter a distinção entre árvore acessível e captura visual até repetir após cache limpo.
- Verificação local 21/10/2026: `test/task-modal-no-placeholder.test.js` passou 5/5; HTML inicial mantém o overlay invisível e o modal rejeita dados sem ID, objetivo e status `APPROVAL_PENDING`. O handler de aprovação usa o ID ativo. Ainda falta teste browser do fluxo de aprovar/rejeitar e persistência; a VPS pode servir o asset antigo, sem publicação ou validação autenticada.

### UI-019 — Contador de agentes do cabeçalho diverge da Cidade

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#city` após recuperação do backend.
- Evidência: cabeçalho mostra `0` agentes online enquanto o minimapa informa `30 agentes · 9 prédios medidos` e a Cidade resume `39 agentes`.
- Passos: carregar `#city`, aguardar `/health` ficar online e comparar KPI superior, minimapa e resumo operacional.
- Causa confirmada no frontend: o KPI filtrava agentes por presença conhecida, mas um roster sem `online`, `isOnline`, `status` ou `state` produzia uma lista vazia e exibia `0`. Isso confundia “presença não informada” com “nenhum agente online”. O resumo da Cidade mede agentes registrados e o minimapa mostra agentes posicionados; são populações diferentes.
- Correção local: o KPI agora mostra `—` se algum agente não tiver presença medida, mantém `0` para roster realmente vazio ou todos offline, e o rótulo visível é `Online`. Cache bust de `unified-app.js` atualizado para `v14-agent-presence-20261021`.
- Teste associado: `test/sidebar-kpi-counts.test.js` cobre presença desconhecida, total registrado e online/offline medidos.
- Critério de fechamento: valores iguais quando representam a mesma população; rótulos distinguem total, ativos e medidos; indisponibilidade nunca vira zero.
- Verificação: suíte focada `node --test test/topbar-hig.test.js test/sidebar-kpi-counts.test.js test/city-live-indicators.test.js` passou (16/16) no Chrome local. O teste aguarda o perfil responsivo após redimensionar a janela; a busca compacta mede 40 px em 1280 px. Captura: `docs/visual-evidence/2026-10-21/topbar-agent-kpi-1280-after.png`.
- Pendente: captura autenticada após publicação na VPS; sem isso, não marcar `VERIFIED`.

### UI-020 — Indicador de missão ativa não lista o registro ativo

- Prioridade: `P1` · Estado: `FIXED` local; VPS pendente · Rota: cabeçalho → KPI `Missões`.
- Evidência: KPI mostra `1`, mas o drawer apresenta apenas operações antigas concluídas/canceladas. A missão atual `d139ccd5-e1d9-4d3c-b89e-343347a66b8e` foi confirmada pela rota de detalhe como `AWAITING_APPROVAL` e não aparece no drawer; `/api/plans` retornou lista vazia e a área de Jobs mostrou `0 de 0`/indisponível.
- Passos: abrir KPI Missões Ativas e comparar o drawer com o detalhe de uma missão pendente e com a contagem do runtime.
- Causa confirmada no frontend: a contagem usava uma lista e filtrava estados ativos; o drawer usava outra lista, incluía operações terminadas e transformava falha/ausência de dados em lista vazia. O estado `AWAITING_APPROVAL` também não era contado como trabalho aberto.
- Correção local: contagem e drawer compartilham os mesmos estados abertos, incluindo aprovação pendente. O drawer lê a resposta canônica medida (ou o roster SSE marcado como medido), filtra encerradas, mostra ID/estado, escapa texto remoto e distingue indisponível de vazio real.
- Teste associado: `test/kpi-mission-drawer.test.js`, `test/sidebar-kpi-counts.test.js`, `test/city-live-indicators.test.js` e integração browser em `test/topbar-hig.test.js`.
- Verificação local: suíte focada passou 19/19 no Chrome. Captura com fixture identificada e missão de aprovação: `docs/visual-evidence/2026-10-21/topbar-agent-kpi-1280-after.png`.
- Critério de fechamento: cada missão contabilizada aparece na lista com ID, estado e ação vinculada; contagem e lista usam a mesma fonte; falha de leitura é apresentada como indisponibilidade, nunca como lista vazia. Conferir sessão autenticada depois da publicação para marcar `VERIFIED`.

### UI-021 — Asset antigo reexibe modal no primeiro carregamento

- Prioridade: `P1` · Estado: `FIXED` no asset servido; verificação visual pendente · Rota: `#city` · Viewport: 858×1280 no navegador embutido.
- Evidência: `GET /fenix-task-modal.js?v=20261017` responde HTTP 200, hash `e38cb31120190bad2125e862391b2cbcc255d0d90b9edcb3454db845114ef685` e contém texto placeholder. A fonte local atual não contém esse texto e valida o payload; o HTML servido não invalida a versão antiga.
- Passos: entrar autenticado na Cidade e observar o pop-up antes de selecionar qualquer tarefa; fechar e recarregar para repetir.
- Área provável: divergência entre asset implantado, cache bust do HTML e fonte do workspace.
- Teste associado: `test/task-modal-no-placeholder.test.js` mais captura autenticada da primeira pintura após cache bust.
- Critério de fechamento: HTML servido referencia asset revisado; em sessão limpa e após refresh não aparece modal sem tarefa real, e nenhum campo estimado é inventado.

### UI-022 — Inspector flutuante duplica contexto do agente com sidebar aberta

- Prioridade: `P1` · Estado: `FIXED` no asset servido; verificação visual pendente · Rota: `#city` · Viewport observado: 858×1117.
- Evidência: captura enviada em 20/10/2026 mostra “Media Agent” flutuando sobre o mapa enquanto a sidebar direita já está aberta, reduzindo a área útil da Cidade.
- Reprodução: abrir o Fênix pela sidebar e selecionar um agente; alternar seleção/atualização do mundo e verificar se o Inspector sobrepõe o canvas.
- Área corrigida: CSS dedicado oculta `#fenixWorldAgentInspector` enquanto `has-right-sidebar-open` estiver ativo; o fluxo existente encaminha os detalhes para o Inspector da sidebar.
- Teste associado: `test/city-overlay-layout.test.js`, matriz 375/768/1280/1920 px.
- Critério de fechamento: detalhes do agente continuam acessíveis dentro da sidebar e o drawer duplicado não aparece sobre o mapa. Código local passou; CSS publicado e HTTP/hash conferidos; captura autenticada pós-atualização pendente.

### UI-023 — Screen DNA usa caminhos de captura inexistentes e não consulta referências do projeto

- Prioridade: `P1` · Estado: `FIXED` na API e nos assets servidos; inspeção da página autenticada pendente · Rotas: `#projects` → Screen DNA, projeto Fênix OS.
- Evidência: as quatro entradas do Fênix apontavam para `/screenshots/fenix/*.png`, diretório inexistente na publicação. As capturas correspondentes estavam disponíveis na raiz de `/screenshots/`, com a Cidade e Projetos visualmente confirmados em 21/09/2026. A rota `/api/v2/pages` exige sessão autenticada.
- Correção: caminhos corrigidos para os arquivos existentes; Page Registry informa `ARCHIVED` e `screenshotCapturedOn`; Project Hub consulta o catálogo autenticado quando o projeto ainda não tem capturas absorvidas, mostra a imagem e identifica sua data como histórica.
- Testes: `test/project-screen-dna-reality.test.js` (5/5); quatro arquivos da VPS respondem HTTP 200 `image/png`; HTML servido aponta para a nova versão do script; backend voltou `ready` após restart.
- Critério de fechamento: após login, abrir Screen DNA do Fênix mostra as quatro imagens com aviso histórico e metadados; projetos sem captura mostram estado vazio honesto. Captura atual de runtime continua sendo uma etapa distinta e não está implementada.

### UI-024 — Cidade abre como shell vazio e a sessão oscila para o login

- Prioridade: `P0` · Estado: `REPRODUCED` · Rota: `/app#city` · Viewport: 855×1117.
- Evidência: em 20/10/2026, o navegador abriu `/app#city` com a estrutura do shell, controles da Cidade e minimapa, mas o canvas permaneceu vazio e o minimapa exibiu `AGUARDANDO CIDADE`. Na leitura seguinte, a mesma aba reportou `/GRG-login`; ao acionar o botão de login já preenchido, o shell voltou a aparecer sem carregar entidades. Reteste posterior na aba autenticada: após refresh, permaneceu em `/app#city`, com `39 agentes · 9 prédios medidos`, sem aviso de login ou indisponibilidade. Hash vazio e rota legada ainda não retestados ao vivo.
- Reprodução: abrir a URL atual na sessão existente; observar o canvas e minimapa; aguardar atualização do estado; observar redirecionamento da aba ao login e repetir a entrada normal.
- Área/cause parcialmente confirmada: `loadCityView()` fazia `fetch(...).then(r => r.json()).catch(() => ({}))`, descartando o status HTTP e convertendo 401/403 em coleções vazias. A VPS confirmou que `/api/v2/living-city/state` e `/api/v2/living-city/agents` exigem sessão; a aba alternou para `/GRG-login`. O estado da sessão autenticada ainda não foi validado.
- Mitigações publicadas em 20/10/2026: `fenix-world-3d.js` registra o último status HTTP e oferece retry; hash `0e1e059ff22d011573e07cf789bb5314c2745d5eeebafc95b9aafb0403069107`. O shell agora usa `fenixAuthedFetch`, verifica `response.ok` e apresenta um aviso acessível para sessão expirada, erro HTTP ou falha de conexão. Backup do HTML imediatamente anterior: `/root/grg-space-backups/20261020-city-auth-state/index.html.before`; SHA-256 antes `baf66c89f99d9095615bdac7a4951eeff48ebf3bc4fb6367b07076d73c435182`; após a publicação `982171a3a8a0be5239f7734ae0bce46548d36db7992c77ee07677ac4cab97225`. `/app` retorna HTTP 200 e `/health` `ready`. Mesmo após reload, a aba retornou ao login; a mensagem de erro não foi observada e o bug continua aberto.
- Teste associado: `test/city-bootstrap-auth.test.js` e `test/city-empty-state-recovery.test.js` (2/2); verificação HTTP do shell/API; falta inspeção visual autenticada e teste de retry na interface. Testes de sobreposição também ficaram bloqueados pela ausência do Chromium headless do Playwright neste ambiente; um teste de indicadores existente teve uma falha independente ligada a contrato de evento.
- Critério de fechamento: em sessão autenticada, `/app#city` carrega entidades reais da API dentro do limite definido, mantém a sessão estável e apresenta erro recuperável com detalhe quando World falha; validar também refresh e rota legada.
- Critério de fechamento: em sessão autenticada, `/app#city` carrega entidades reais da API dentro do limite definido, mantém a sessão estável e apresenta erro recuperável com detalhe quando World falha; validar também refresh e rota legada.

### UI-025 — World autenticado retorna dados, mas a Cidade continua em estado vazio

- Prioridade: `P0` · Estado: `REPRODUCED` na VPS · Rota: `/app#city` · Viewport: 791×1117.
- Evidência histórica: com a mesma sessão, as rotas protegidas respondiam HTTP 200 com 39 agentes enquanto a UI mostrava “Aguardando leitura dos agentes da API”/“Telemetria indisponível”. Reteste posterior, antes e depois do refresh na aba autenticada: o minimapa e o resumo da Cidade exibiram `39 agentes · 9 prédios medidos`; não surgiu estado vazio ou erro de runtime. A correspondência de cada ID do snapshot com agente selecionável no renderer segue sem prova.
- Reprodução: entrar pelo fluxo de login aberto; comparar a resposta das duas rotas de leitura com o canvas/minimapa sem trocar de sessão; observar antes e depois de atualizar a página.
- Área provável ainda não isolada: `fenix-world-3d.js`/`fenix-v11-interactions.js`, `fenixAuthedFetch`, cache de assets servido e propagação do snapshot para o renderizador.
- Teste associado: `test/city-bootstrap-auth.test.js`, `test/city-empty-state-recovery.test.js`, `test/city-runtime-truth.test.js`; falta cenário autenticado de navegador na versão VPS que confirma consumo do snapshot, não apenas HTTP 200.
- Critério de fechamento: em sessão autenticada, snapshot medido chega ao renderer/minimapa e IDs selecionáveis correspondem aos dados da API; erro de transporte ou parsing permanece explícito e recuperável.

### UI-026 — Sessão válida é enviada ao login após atualização da Cidade

- Prioridade: `P0` · Estado: `REPRODUCED` na VPS · Rotas: `/app#city` → `/GRG-login` → `/app#city`.
- Evidência histórica: atualizar a aba Cidade a redirecionou ao login apesar da sessão válida. Reteste ao vivo em 20/10/2026: após refresh da aba `/app#city`, a URL permaneceu na Cidade, o menu continuou autenticado e a UI voltou a exibir 39 agentes e 9 prédios medidos; não surgiu tela de login. Falta testar sessão fria e URL sem hash.
- Reprodução: entrar, confirmar `/app#city`, atualizar e inspecionar o URL; validar a sessão pelo endpoint autenticado na mesma origem.
- Área provável: clientes `fenix-bootstrap.js`/`unified-app.js`, decisão de redirect no 401 de outro endpoint, token Bearer persistido e cache/versão dos scripts da VPS.
- Teste associado: `test/auth-session-redirect.test.js`, `test/frontend-gateway-auth-check.test.js`; ambos locais passam, mas falta regressão de browser autenticado em refresh e primeira carga.
- Critério de fechamento: refresh com cookie válido não visita o login; apenas invalidação explícita limpa token e solicita nova entrada; teste visual confirma rota preservada e dados do World carregados.

### UI-027 — HUD Universo fica parcialmente fora da tela com a sidebar aberta

- Prioridade: `P1` · Estado: `FIXED` no workspace local; verificação da versão VPS pendente · Rota: `/app#city` · Viewport reproduzido: 926×1375.
- Evidência ao vivo: leitura DOM da sessão autenticada mediu `#fenixUniverseExplorerHUD` em `x=-102`, largura 679 px, dentro de um mapa iniciado em `x=72`; a sidebar ocupava `x=529..918`. O HUD ficava cortado e sobreposto pela conversa.
- Reprodução: abrir Cidade em 926×1375, deixar a sidebar Fênix aberta e comparar o retângulo do HUD com os limites do mapa e da sidebar.
- Causa confirmada: `city-reality.css` centra o HUD com `translateX(-50%)` e, com sidebar, desloca `left` usando `(100% - --fsb-width)/2`; a conta não inclui metade da largura do próprio HUD e presume uma área dividida que não corresponde ao drawer sobreposto.
- Correção local: em 761–1180 px, ancorar o HUD dentro da área livre à esquerda da sidebar, limitar a largura disponível e permitir rolagem horizontal dos controles. O breakpoint móvel mantém suas regras próprias.
- Teste associado: `test/city-overlay-layout.test.js` reproduz o CSS em viewport 926×1375 e verifica que o HUD permanece dentro do mapa, sem invadir o drawer. Passou após reproduzir a geometria anterior fora dos limites.
- Critério de fechamento: observar a versão atualizada na VPS e confirmar todos os controles do HUD alcançáveis, sem corte ou sobreposição, em 768, 926 e 1180 px. Não publicar nem marcar `VERIFIED` antes disso.

## Níveis de evolução e gates

Os níveis são gates de produto, não uma nota estética. Um nível só avança quando o fluxo correspondente tem reprodução e evidência na versão servida.

| Nível | Resultado verificável | Estado em 20/10/2026 |
| --- | --- | --- |
| 0 — Entrada correta | Cidade aparece na primeira pintura em rota raiz, hash legado, login e refresh. | `FAIL`: shell `/app#city` abre sem entidades (`AGUARDANDO CIDADE`) e sessão oscilou para `/GRG-login`; causa da falha ainda não isolada. |
| 1 — Layout utilizável | Cidade, minimapa, HUD, Inspector, painéis e chat não colidem em 375/768/1280/1920 px. | `PENDING`; teste local de minimapa/HUD/Inspector passou em quatro larguras e a proteção contra Inspector duplicado foi publicada; falta captura VPS autenticada e ainda há painéis sem validação. |
| 2 — Dados com procedência | Estados, coordenadas, jobs e Screen DNA distinguem fatos medidos, descobertas estáticas e indisponibilidade. | `PARTIAL`: Screen DNA informa quatro capturas históricas do Fênix com data; a validação visual autenticada da página e captura atual dos projetos continuam pendentes. `PENDING` para demais campos. |
| 3 — Fluxo real integrado | Chat Fast Lane, missão/job, agente, eventos e Inspector refletem o runtime ativo. | `FAIL`: roteamento negativo corrigido, mas Fast Lane respondeu com Echo e missão/job/agente/SSE ainda não foram comprovados em uma cadeia controlada. |
| 4 — Qualidade premium | Personagens, cenário, tipografia, placas, câmera e microinterações são legíveis, variados e performáticos. | `OBSERVED` abaixo do objetivo; precisa de comparação visual antes/depois. |

### Regra para adicionar ou fechar bugs

Todo item novo precisa de ID não reutilizado, prioridade, estado, rota/viewport, evidência apontada, passos de reprodução, área provável, teste e critério objetivo de fechamento. Ao corrigir, registrar versão/hash, resultado antes/depois e captura. Estado `VERIFIED` exige observação visual da versão em teste; teste de código ou captura do workspace local não fecha o defeito da VPS.

O SkillRegistry inclui `grg-space-design-quality-gate` para aplicar este procedimento a análises futuras de UI. O conteúdo é uma adaptação original de princípios públicos; não inclui os arquivos nem o código dos repositórios de referência.

## Próxima fila

1. `P0`: validar o roteador VPS com casos negativos/positivos e impedir criação de missões sem confirmação; encerrar a missão de teste pendente pelo fluxo autenticado.
2. `P1`: publicar o roteamento Fast Lane que prioriza API Platform e proíbe Echo; responder à pergunta ao vivo e corrigir o erro real remanescente (CHAT-003).
3. `P1`: publicar modal validado e remover estimativas aleatórias; confirmar primeira pintura limpa (UI-017/UI-018/UI-021).
4. `P1`: corrigir contagem divergente de agentes; comparar fontes de KPI, Cidade e roster (UI-019).
5. `P1`: validar a matriz de entrada da VPS e medir sobreposição do Inspector, Operações, Ativos e sidebar em 375/768/1280/1920 px; corrigir UI-011/UI-013/UI-016.
6. `P1`: tornar o Screen DNA fiel à evidência de captura/DOM e abrir capturas reais do FÊNIX OS; deduplicar referências (UI-012).
7. `P2`: refinar avatares, legibilidade dos prédios, câmera e colisões de rótulos com capturas comparativas (UI-008/UI-009/UI-010/UI-014).
6. Após cada rodada, acrescentar bugs com IDs novos e registrar versão, viewport, teste e evidência. Não marcar `VERIFIED` com teste estático isolado.

## Incidentes operacionais relacionados ao fluxo do Fênix

### CHAT-001 — Conversa de execução rejeita workspace salvo em formato Windows

- Prioridade: `P1` · Estado: `FIXED` VPS para resolução do workspace; fluxo de execução ainda pendente · Interface: `POST /api/v2/conversation`.
- Evidência: capturas 3, 5 e 7 mostram `PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT`; teste de regressão local reproduziu 403 com projeto Fênix salvo como `C:\projetos\ai-engine-core` e registro VPS apontando para o workspace canônico existente.
- Passos: encaminhar ao chat um pedido de execução para Fênix OS quando o registro de projeto preserva o caminho local Windows.
- Causa: a rota validava apenas o workspace salvo e não resolvia o `vpsPath` confiável do catálogo para o runtime Linux.
- Correção local: só quando o caminho salvo não está nas raízes permitidas, a rota seleciona o `vpsPath` do registro se esse diretório existe; continua rejeitando caminhos arbitrários e nunca usa o caminho enviado pelo cliente.
- Testes: `test/conversation-route-real-runtime.test.js` e `test/project-workspace-registry-fallback.test.js` (17/17 passaram em 20/10/2026).
- Publicação: fallback do registro canônico em `/root/grg-space-backups/20261020-chat-workspace-fix/conversation-routes.js`; `/health` pronto após reinício focal. Falta validar uma proposta de execução que use o workspace resolvido sem iniciar trabalho não aprovado. Disco estava com cerca de 6,7 GB livres (93% ocupado); runtime continua em `development`.
- Critério de fechamento: proposta real de execução sem 403, com IDs e provider comprovados, e confirmação explícita antes de iniciar o worker.

### CHAT-002 — Negação “não crie tarefa” era classificada como execução

- Prioridade: `P0` · Estado: `FIXED` VPS e verificado no chat autenticado · Interface: `POST /api/v2/conversation`.
- Evidência antes: mensagem explicitamente conversacional criou missão `d139ccd5-e1d9-4d3c-b89e-343347a66b8e` em `AWAITING_APPROVAL`, sem job, e a sidebar desenhou um cartão falso `JOB #NOVO`.
- Causa: regra antiga tratava qualquer ocorrência de `tarefa` como execução e detectava `missão` mesmo dentro da lista de coisas proibidas.
- Correção: classificador respeita negações de missão/tarefa/job/arquivo/projeto/deploy; projeto implícito deixou de ser inferido pelo classificador.
- Testes: `node --test test/conversation-route-real-runtime.test.js test/project-workspace-registry-fallback.test.js` — 19/19 passaram. O teste de regressão adicional falhou antes da correção (`MISSION`, esperado `QUESTION`) e passou depois; o teste de rota confirma que nenhuma missão é criada.
- Implantação: `/opt/fenix-os/grg/src/routing/conversation-router.js`; backup em `/root/grg-space-backups/20261020-intent-negation-fix/conversation-router.js`; hash ativo `0ffa8d1c30a397c5df427e9a220b7ddeee31f16a9eaefe59019a20da63840238`; `node --check` e `/health` `ready` após restart focal do `fenix-backend`.
- Verificação ao vivo: nova pergunta apareceu como `FAST_LANE`, sem novo cartão de job; os eventos de missão continuavam terminando no registro anterior das 10:29. O provider retornou `[echo-small] answer(636)` em 22,07 s; ver `CHAT-003`.
- Pendência: a missão de teste antiga segue `AWAITING_APPROVAL`, sem job ou execução. O endpoint de cancelamento recusou chamada sem autenticação; encerrar pelo fluxo autenticado, nunca aprovar.
- Critério de fechamento: repetir pergunta simples e enunciados negativos em português/inglês sem nova missão/job; pedido positivo explícito gera apenas proposta que aguarda confirmação.

### CHAT-003 — Fast Lane responde com texto Echo, não com resposta útil do provider

- Prioridade: `P1` · Estado: `REPRODUCED` na VPS · Rota: sidebar Fênix → pergunta simples.
- Evidência: depois de corrigir o roteamento, `Quanto é 2 + 2? ...` chegou em `FAST_LANE`, mas a resposta visível foi `[echo-small] answer(636)`, provider/model `echo-small`, duração 22,07 s e 250 tokens. Não responde à pergunta e não comprova uso do modelo conversacional configurado.
- Passos: iniciar nova conversa autenticada, enviar pergunta simples sem intenção de tarefa e conferir texto e metadados.
- Área provável: seleção/fallback Fast Lane, provider Echo e apresentação de `usedAI`, provider e modelo em `conversation-routes.js`/sidebar.
- Teste associado: `test/conversation-route-real-runtime.test.js` cobre resposta de provider e falha explícita; falta integração de fallback Echo na VPS.
- Critério de fechamento: provider configurado produz resposta semanticamente correta e metadados medidos; sem provider real, mostrar indisponibilidade sem texto Echo apresentado como resposta.

## Atualização da capacidade Apple-Hig-Designer — 2026-10-20

- A skill agora orienta revisões de projetos selecionados por workspace real, framework e design system existente; não copia código/ativos e preserva a identidade de cada produto.
- Corrigido um gap de execução: `AgentExecutionRuntime` selecionava skills, mas não enviava seu prompt ao provider. O prompt agora inclui nomes e instruções das skills selecionadas.
- Verificação local: `node --test test/agent-execution-runtime.test.js test/skill-registry.test.js` — 6/6 passaram; cobre seleção para revisão de interface de projeto e injeção das instruções no provider.
- Estado: `PASS` para seleção/injeção local; `PENDING` para uso via API e confirmação da versão VPS. Nenhum projeto foi publicado ou alterado visualmente nesta fatia.

### UI-039 — Atalho Command duplicado abre a Cidade

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: navegação principal.
- Evidência: o shell mostrava oito botões principais; `Command` e `World` apontavam ao mesmo destino porque o roteador mantém `command → city` como alias legado. Isso deixava o nome “Cockpit Central” visível embora a rota abrisse a Cidade.
- Correção: removido o botão legado do menu; os links e favoritos `#command` continuam redirecionando para `#city`.
- Teste: `test/screen-shell-assets.test.js` confirma destinos principais sem duplicação; `test/city-first-paint.test.js` e QA de inicialização cobrem Cidade como entrada.
- Critério de fechamento: menu não tem rotas duplicadas e `#command` continua compatível. Confirmado no workspace local; VPS não publicada nesta fatia.

### UI-028 — Fila de melhoria marcava telas como PASS com API bloqueada

- Prioridade: `P1` · Estado: `VERIFIED` local · Evidência: o relatório antigo tinha 14 resultados de navegação `PASS`, enquanto 22/23 endpoints estavam protegidos por autenticação e o relatório de readiness indicava `BLOCKED_AUTH`.
- Causa: o gerador da fila usava apenas a navegação salva e ignorava o resumo do probe de contratos.
- Correção: a fila considera a proporção real de endpoints protegidos e marca as 15 telas como `BLOCKED_AUTH` quando não há prova de acesso autenticado.
- Teste: `test/screen-readiness-report.test.js` impede que PASS de navegação antiga substitua bloqueio de autenticação.
- Critério de fechamento: nenhum PASS de runtime sem sessão e evidência atuais. `npm run qa:screen-queue` gerou `blockedAuth: 15`.

### UI-029 — Dez contratos esperados não têm referência literal nos assets analisados

- Prioridade: `P2` · Estado: `OBSERVED` · Evidência: execução local de `npm run qa:screen-queue` reporta dez contratos sem correspondência textual direta nos assets do frontend.
- Área provável: chamadas encapsuladas pelo API client, endpoint desatualizado no manifest ou carregamento dinâmico de módulos.
- Próximo passo: auditar cada endpoint contra o loader e o backend; distinguir uso via wrapper de contrato realmente sem consumidor antes de alterar a interface.
- Critério de fechamento: cada endpoint fica marcado como consumido com arquivo/função e teste, removido do manifest com justificativa, ou convertido em bug reproduzido. O achado não é tratado como 404 nem como falha confirmada.

### UI-030 — Probe de contratos invocava rotas POST de ação

- Prioridade: `P1` · Estado: `VERIFIED` local · Área: ferramenta de auditoria/API.
- Evidência: execução do teste `screen-contract-probe-safety.test.js` reproduziu POST para `/api/dev/terminal` e `/api/v2/vision/inspect-element`, apesar do probe declarar que era somente leitura.
- Causa/correção: o manifest misturava GET e ações no campo `readEndpoints`, e o probe enviava `{}` às duas rotas. As ações agora ficam catalogadas separadamente, com `kind: action`, e nunca são chamadas pelo probe.
- Teste: fixture HTTP local confirma que todas as chamadas feitas pelo probe são GET e que as duas ações permanecem explícitas como `not-probed-action`.
- Critério de fechamento: nenhuma execução de auditoria envia comando ou ação de escrita; evidência verificada localmente após a correção.

### UI-031 — Auditoria de navegação não respeitava o Chromium configurado e podia ficar aberta após timeout

- Prioridade: `P2` · Estado: `VERIFIED` local · Área: QA de frontend.
- Evidência: runner não encontrou o Chromium empacotado pelo Playwright; após configurar Edge, timeout no carregamento inicial deixou o processo/browser sem produzir relatório de bloqueio.
- Correção: `FENIX_QA_CHROMIUM_PATH` agora é respeitado; falha de navegação inicial grava evidência `BLOCKED_RUNTIME` e fecha o browser com timeout de teardown. O arquivo de sessão local só é usado com opt-in explícito `FENIX_QA_USE_SESSION_FILE=1`.
- Teste: execução real com Edge e VPS gerou relatório; sem token, detectou redirecionamento à tela de login e terminou sem segredos no log.
- Critério de fechamento: runner inicializa com Chromium configurado, grava relatório em erro e não fica pendente; confirmado localmente.

### UI-032 — Estado da navegação e estado de autenticação eram confundidos

- Prioridade: `P1` · Estado: `VERIFIED` local · Área: fila/readiness de QA.
- Evidência: o relatório agregava proteção de APIs e falha do navegador em `BLOCKED_AUTH`, sem dizer se a navegação abriu ou se a requisição apenas exigia login.
- Correção: readiness e fila distinguem `browserNavigation` de `apiAccess`; falha de abertura recebe `BLOCKED_RUNTIME` e respostas 401 permanecem `BLOCKED_AUTH`.
- Teste: probe live em 20/10/2026 confirmou 1 GET público (`/health` 200), 26 rotas protegidas, 0 rotas ausentes e 2 ações não invocadas. QA de navegador sem sessão confirmou tela de login e 0 telas navegadas.
- Critério de fechamento: relatórios preservam as duas dimensões sem converter erro de navegação em erro de autenticação; verificado nos artefatos atuais.

### UI-033 — A fila rebaixava bloqueio global de autenticação para P2

- Prioridade: `P1` · Estado: `VERIFIED` local · Área: QA/readiness.
- Evidência: o probe atual tinha 26 rotas privadas protegidas e as 15 telas estavam `BLOCKED_AUTH`, mas a fila gerava prioridade P2 para todas.
- Correção: autenticação bloqueada, carregamento inicial bloqueado e contrato de backend ausente agora elevam a tela a P1.
- Teste: `screen-readiness-report.test.js` exige P1 nos bloqueios atuais; `qa:screen-queue` gera 15 P1, 15 bloqueadas por autenticação.
- Critério de fechamento: gate de acesso não fica abaixo de melhorias cosméticas na fila; verificado localmente.

### UI-034 — Lista de empresas começava vazia sem explicar o estado

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: shell/World.
- Evidência: `#fenixSidebarCompaniesList` iniciava vazio até o carregamento de dados; usuários viam um espaço em branco no estado sem empresas.
- Correção: o shell apresenta “Nenhuma empresa cadastrada” com `role="status"`; o renderer continua substituindo o estado quando chegam registros reais.
- Teste: `empty-state.test.js` confirma texto vazio, ausência de cartões fictícios e fluxo de criação real.
- Critério de fechamento: estado vazio claro sem introduzir dados simulados; testes locais passaram.

### UI-035 — Testes estáticos não acompanhavam a navegação e os estados atuais

- Prioridade: `P2` · Estado: `VERIFIED` local · Área: cobertura de QA.
- Evidência: testes esperavam `#command` como distrito primário, mensagem antiga da Cidade (“Nenhum agente ativo...”) e offsets fixos anteriores do minimapa, apesar da rota canônica City e do CSS responsivo com tokens.
- Correção: assertions agora usam o manifest de 15 telas, a mensagem verdadeira da API e as distâncias atuais do layout; `workspace-responsive.test.js` passou 15/15.
- Testes: `empty-state.test.js` 5/5; `workspace-responsive.test.js` 15/15; testes focados de shell/mapa/readiness 25/25. O arquivo `operational-console-ui.test.js` ainda contém três verificações antigas de outros componentes e não está inteiro aprovado.
- Critério de fechamento: os testes refletem contratos e layout implementados, sem reintroduzir a entrada duplicada Command; validado localmente.

### UI-036 — Sidebar não oferecia modo compacto apesar de o runtime suportá-lo

- Prioridade: `P2` · Estado: `VERIFIED` local · Área: conversa do Fênix.
- Evidência: `setCopilotState('compact')` e o CSS de 64 px já existiam, mas o cabeçalho não tinha botão; o teste `copilot-layout.test.js` falhava e o operador não conseguia recolher a conversa mantendo acesso rápido.
- Correção: botão compacto no cabeçalho alterna entre faixa compacta e conversa aberta; a faixa esconde conteúdo secundário, preserva avatar e ações de expandir/fechar.
- Verificação: teste Playwright real clicou, mediu largura e restaurou a sidebar em 375, 768 e 1280 px; `copilot-layout.test.js` passou 6/6.
- Critério de fechamento: faixa ≤70 px e restauração pelo mesmo controle nas três larguras; verificado localmente.

### UI-037 — Biblioteca de Ativos comprimida e cobrindo controles da Cidade

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota/viewports: `#city`; 375×812, 768×1024, 1280×800 e 1920×1080.
- Evidência: Playwright reproduziu colisão com minimapa, navegação e orbit em 375 px e com orbit em 1280 px. A captura inicial mostrou cabeçalho, busca e conteúdo comprimidos sem área de rolagem interna.
- Causa: geometria responsiva insuficiente, ausência de wrapper rolável e regras visuais incompletas para cabeçalho, formulário e controles internos.
- Correção: limitar e posicionar o painel longe dos controles flutuantes; reservar espaço para mapa e rodapé; organizar a busca no mobile; manter cabeçalho e botão fechar visíveis; separar conteúdo em região rolável.
- Teste: `test/city-overlay-layout.test.js` mede limites do painel, colisões, área de rolagem, separação cabeçalho/conteúdo, botão de fechar e largura do campo.
- Captura local: [city-media-panel-375-verified.png](visual-evidence/2026-10-20/city-media-panel-375-verified.png).
- Evolução visual de 21/10: a superfície agora segue os tokens HIG compartilhados (grafite neutro, sem gradiente nem blur, sombra reduzida, acento azul e botão de fechar/foco com alvos de 40 px). Playwright confirma os estilos computados e o layout em 375, 768, 1280 e 1920 px. Captura: [city-media-375-hig.png](visual-evidence/2026-10-21/city-media-375-hig.png).
- Regressão encontrada ao inspecionar a captura 1280 px: a borda superior da Biblioteca cobria parte do aviso de runtime; Playwright também reproduziu interseção em 768 px. A posição desktop/tablet passou para baixo da faixa do aviso; o cenário inclui agora `#cityRuntimeLoadStatus`. Capturas atualizadas: `city-media-{375,768,1280,1920}-hig.png`.
- Limite: validação é local, sem sessão autenticada; não comprova busca real de ativos nem publicação na VPS.
- Limite: HTML estático mostrou HTTP 404 do runtime; busca real, ativos persistidos e fluxo autenticado permanecem pendentes.

### UI-038 — Aviso do runtime interceptava o fechamento da Central de Operações

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota/viewports: `#city`; 375×812, 768×1024, 1280×800 e 1920×1080.
- Evidência: Playwright reproduziu o aviso `Runtime da Cidade indisponível` interceptando o clique no `×` do drawer em 375 px.
- Causa: o drawer usava `inset:12px` e começava na mesma área vertical do aviso global.
- Correção: Cockpit e Central de Operações reservam a faixa superior usada pelo aviso. Abrir qualquer drawer fecha os outros e sincroniza o estado acessível da Biblioteca.
- Teste: `test/city-overlay-layout.test.js` abre Cockpit, Operações e Biblioteca; mede drawer/botão contra a Cidade e o aviso; fecha Operações por clique real nas quatro larguras.
- Captura local: [city-operations-drawer-375-verified.png](visual-evidence/2026-10-20/city-operations-drawer-375-verified.png).
- Limite: frontend estático retornou HTTP 404 do runtime; dados operacionais autenticados e combinação com sidebar/chat ainda não foram validados.

### UI-040 — Modal de aprovação invisível continua exposto à tecnologia assistiva

- Prioridade: `P1` · Estado: `FIXED` local · Rota: todas; shell.
- Evidência: auditoria ao vivo encontrou `#fnxTaskModalOverlay` com `display:flex`, `opacity:0` e `pointer-events:none`, mas ainda visível na árvore de acessibilidade. O diálogo genérico podia ser anunciado mesmo sem tarefa pendente.
- Causa: o estado inativo dependia somente de transparência e bloqueio de ponteiro; isso não remove o conteúdo da árvore acessível.
- Correção local: estado inativo usa `visibility:hidden`; ao ativar, muda para `visible`. A transição de visibilidade tem atraso apenas no fechamento, preservando o fade. A folha recebeu nova chave de cache.
- Teste: `test/task-modal-no-placeholder.test.js` passou 5/5, incluindo a regra inactive/active e a referência cache-busted.
- Critério de fechamento: validar modal aberto/fechado no browser autenticado, confirmar leitura por tecnologia assistiva e estado do modal após reload. VPS ainda não publicada; manter `FIXED`.

### UI-041 — IDs duplicados no próprio backlog

- Prioridade: `P2` · Estado: `FIXED` local · Área: governança de QA.
- Evidência: havia duas entradas `UI-027`, uma para HUD Universo e outra para o atalho Command; contagem resultava em 42 entradas para 41 IDs.
- Correção: a segunda entrada foi renomeada para `UI-039`, preservando histórico e descrição.
- Critério de fechamento: IDs únicos em toda nova entrada; validar por script antes de acrescentar bugs.

### UI-042 — QA visual aprovava imagens sem comparar os pixels

- Prioridade: `P1` · Estado: `FIXED` local · Área: `VisualTestEngine` / `/api/v2/visual-qa/compare`.
- Evidência reproduzida: `runVisualComparison` calculava diferença pelo tamanho dos arquivos, aceitava arquivos que não eram PNG e classificava como `PASSED` quando não havia baseline. O repositório já contém um comparador RGBA real, mas este endpoint não o utilizava.
- Correção local: comparação usa o decodificador PNG com limite de bytes/pixels; ausência de imagem, arquivo inválido e diferença de dimensão ficam `NOT_MEASURED`; sucesso só é atribuído quando os pixels foram medidos dentro da tolerância. Caminhos precisam estar sob raízes de QA permitidas e respostas retornam apenas nomes, sem path absoluto. Histórico legado sem evidência de pixels foi reclassificado como `NOT_MEASURED`.
- Testes: `test/visual-test-engine-truth.test.js` e `test/visual-qa-truth.test.js` — 9/9 passaram; inclui PNGs RGBA reais iguais/diferentes, ausência de baseline, arquivo inválido, path fora da raiz e migração de histórico.
- Critério de fechamento: conferir via endpoint autenticado em runtime local/VPS que apenas comparações medidas podem resultar `PASSED`; VPS ainda não foi publicada nem verificada.

### UI-043 — Dashboard de QA não explica o denominador dos contadores

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#browser`.
- Evidência: captura da tela mostrava “16 telas” e “17 passaram”. O frontend combinava agregados do relatório com a galeria de resultados, que pode conter várias verificações para uma tela.
- Correção local: os quatro contadores usam a lista de resultados apresentada na galeria; a interface chama o total de “Verificações” e separa `PASSED`/`PASS`, `FAILED`/`FAIL` e estados restantes como “Não medidas”.
- Teste: `node --test test/visual-qa-truth.test.js` valida a fonte única do denominador e o agrupamento explícito dos estados desconhecidos.
- Critério de fechamento: revisar visualmente em runtime autenticado com relatório misto contendo aprovações, falhas e capturas; versão da VPS não verificada nem publicada.


### UI-044 — Screen DNA não agregava telas e insinuava medições inexistentes

- Prioridade: `P1` · Estado: `FIXED` local · Área: `Projetos → Screen DNA`.
- Evidência: a aba podia consultar apenas capturas do Page Registry e exibia estado vazio sem ação de mapeamento. Registros da absorção podiam conter arrays genéricos em `components`, que o Inspector apresentava como componentes medidos.
- Correção local: catálogo mescla fontes do projeto, absorção e Page Registry por rota normalizada; tela oferece mapeamento do workspace; captura, DOM, componentes medidos e arquivo de origem são apresentados separadamente, sem usar `components` inferidos como medição.
- Evolução visual local: Screen DNA agora usa tipografia de sistema, superfícies neutras, preview 16:10, bordas discretas e hierarquia mais legível, mantendo o tema escuro do produto.
- Verificação: `node --test test/project-screen-dna-reality.test.js test/project-absorption-reality.test.js` — 17/17 passaram; `git diff --check` nos arquivos alterados passou.
- Critério de fechamento: validar no navegador autenticado o catálogo de projeto absorvido e não absorvido, incluindo execução real de “Mapear telas”; publicação VPS não feita nesta fatia.

### UI-045 — Linguagem visual do shell varia entre módulos

- Prioridade: `P1` · Estado: `FIXED` local · Área: shell compartilhado, navegação, cartões e controles.
- Evidência: capturas fornecidas mostram o mesmo shell usando superfícies muito escuras com bordas/glows de intensidade diferente entre Projetos, Cidade e cockpit; a navegação ativa e os controles competem visualmente com o conteúdo.
- Correção local: camada `public/fenix-hig-system.css` define tokens compartilhados, tipografia de sistema, superfícies neutras, estado ativo azul, foco visível e respeito à preferência de movimento reduzido. A folha é carregada depois do restante do shell.
- Verificação local: folha carregada em `#city` a 375, 768, 1280 e 1920 px; `body.scrollWidth` correspondeu à largura do viewport. A 768 px, minimapa e barra ficaram alinhados com menu recolhido/expandido. `git diff --check` passou.
- Limite da verificação: sessão local expirou durante a captura; conteúdo visual foi inspecionado, mas chamadas autenticadas e métricas de runtime não foram certificadas. VPS não alterada.
- Critério de fechamento: capturar e revisar shell, Cidade, Projetos, IDE e sidebar em 375, 768, 1280 e 1920 px; comparar contraste, hierarquia, foco e colisões; publicar só com versão e rollback identificados.

### UI-046 — Minimap e navegação da Cidade ocupam área excessiva no celular

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#city`, viewport `375×812`.
- Evidência reproduzida: captura local mostrou minimapa de 236 px de largura e barra de navegação da Cidade com a mesma largura, cobrindo área útil do mapa.
- Correção local: abaixo de 420 px, minimapa e barra ficam limitados a 196 px; a altura reservada acompanha o canvas 220×144 para posicionar a navegação sem cortar controles.
- Verificação: screenshot local após mudança; minimapa `196×163`, barra `196×43`, HUD inferior `359×44`, largura do documento `375` sem overflow horizontal. Os controles de modo/zoom permanecem acessíveis.
- Critério de fechamento: repetir com sessão autenticada e sidebar do Fênix aberta/fechada; conferir toque e seleção de agentes em dispositivo real.

### UI-047 — Barra de navegação da Cidade desalinhada do minimapa em tablet

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#city`, viewport `768×1024`.
- Evidência reproduzida: antes da correção, minimapa iniciava em `x=156` enquanto a barra iniciava em `x=80`; a regra do trilho lateral só movia o minimapa.
- Correção local: a barra usa os mesmos offsets do minimapa entre 761–900 px, inclusive com menu expandido.
- Verificação: ambos em `x=156` com menu recolhido e `x=258` após ativar `menu-open`; largura do documento permaneceu `768`.
- Critério de fechamento: validar visualmente a interação real de abrir/fechar o menu com sessão autenticada e confirmar as capturas na trilha de release.

### UI-048 — Sidebar do Fênix abria como janela curta no celular

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city`, viewport `375×812`.
- Evidência reproduzida: ao abrir a sidebar, ela começava em `y=303` e ocupava somente `471px` de altura. A regra responsiva do drawer (`fenix-responsive.css`) vencia a regra genérica do shell e limitava o painel a 58% da altura, deixando pouco espaço útil para a conversa.
- Correção: `fenix-hig-system.css` agora aplica o mesmo escopo de seletor do drawer para reservar a área entre cabeçalho e dock (`top:70px`, `bottom:38px`) em viewports até 900px. As faixas de contexto/ferramentas rolam horizontalmente; conversa e composer recebem a área restante. Anexo, delegação, microfone e envio têm alvos de 40×40px.
- Verificação local: Playwright em `375×812`, `768×1024` e `1280×800`; sidebar em `y=70` e altura `702px` no celular, `y=70` e altura `916px` no tablet, encaixada à direita no desktop; largura do documento igual ao viewport; controles do composer presentes e sem erros de página. Capturas locais: `%TEMP%/grg-sidebar-v2-375.png`, `%TEMP%/grg-sidebar-v2-768.png` e `%TEMP%/grg-sidebar-1280.png`.
- Limite: sessão autenticada expirada; conversa/histórico e chamadas de runtime não foram validados. VPS não alterada.
- Critério de fechamento: repetir a verificação em sessão autenticada na versão implantada e validar envio, resposta e persistência do histórico.

### UI-049 — Aviso de falha do runtime cobre o centro da Cidade

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#city` · Viewports: `375×812`, `768×1024`, `1280×800` e `1920×1080`.
- Evidência reproduzida: captura local mostrava o aviso de sessão expirada/sem acesso centralizado em uma faixa de 560px, cobrindo prédios e a vista principal da Cidade.
- Correção: o estado mantém mensagem e botão “Tentar novamente”, usa um aviso compacto no canto superior direito e, até 600 px, reduz a linha visual com reticências sem remover o texto acessível. O botão continua com alvo de 40 px; não há fallback simulado. Nova colisão reproduzida em 1280 px: o aviso cobria “AI NEXUS”. Incluí `#cityRuntimeLoadStatus` entre os obstáculos do posicionador 3D; as placas agora se reposicionam para evitar o aviso visível.
- Verificação local: `test/city-runtime-notice-mobile.test.js` verificou o estado móvel (54 px, alvo de 40 px); `test/city-district-label-layout.test.js` passou nas quatro larguras, medindo colisões com aviso, rótulos e órbita. Captura depois da correção: [city-runtime-notice-1280-after.png](visual-evidence/2026-10-21/city-runtime-notice-1280-after.png).
- Limite: a sessão de QA estava expirada e o runtime indisponível; a recuperação autenticada e a nova tentativa real seguem pendentes. VPS não alterada.
- Critério de fechamento: validar o retry após reautenticação e medir a posição da mensagem com a sidebar e os painéis da Cidade abertos.

### UI-050 — Agente dinâmico criava dois balões sobrepostos

- Prioridade: `P2` · Estado: `VERIFIED` local · Área: criação de agentes da Cidade.
- Causa reproduzida: `_createCyberHumanoid` já adicionava um `AgentThoughtBubble`; `spawnDynamicAgent` criava outro na mesma posição e substituía a referência, mantendo o sprite anterior na cena.
- Correção: o fluxo atualiza o balão já pertencente ao modelo. Quando a API não publica tarefa, a etiqueta mostra o papel real; quando publica uma tarefa, mostra esse texto. Nenhum estado operacional é inferido.
- Verificação local: três agentes de QA temporários renderizaram exatamente um sprite de conversa cada; texto de tarefa/papel e nenhum erro de página. `test/city-agent-visual-profile.test.js` protege contra a duplicação.
- Limite: verificar com agentes autenticados na versão implantada permanece pendente.
- Critério de fechamento: sincronizar/criar agentes reais e confirmar que cada entidade mantém um único sprite após atualização e remoção.

### UI-051 — Aba de empresa em Projetos apresentava métricas e metas sem evidência

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#projects` → projeto → aba Empresa.
- Evidência: reprodução estática no renderer encontrou SLA P95 `< 200ms`, autonomia nível 4, quatro agentes como fallback, modelos locais “100% ATIVO”, paridade “100% PASS” e BullMQ “ONLINE (:6380)” escritos diretamente no HTML, sem leitura de runtime. A captura de Projetos mostra a hierarquia densa que também precisava de redução.
- Causa: `renderCompanyTab` construía todo o painel com `innerHTML` e valores operacionais fixos.
- Correção local: painel agora monta elementos com `textContent`, mostra somente status/stack/latência/autonomia/agentes recebidos e apresenta campos ausentes como não medidos. Removi o painel de OKRs sem fonte de dados; os atalhos para World e Inspector usam listeners e só aparecem com `companyId`.
- Reprodução/teste: `node --test test/project-screen-dna-reality.test.js` falhava antes da correção e passou após; `node --check public/project-hub-live.js` e `git diff --check` passaram.
- Verificação visual complementar: `test/project-company-panel-layout.test.js` renderiza o componente e a folha real do Project Hub em Edge local; passou em 375, 768, 1280 e 1920 px sem overflow horizontal, com campos indisponíveis claros e botões ≥40 px. Capturas de fixture QA: `docs/visual-evidence/2026-10-21/project-company-panel-{375,768,1280,1920}-after.png`.
- Limite: fixture local, sem autenticação ou dados reais da API; a disponibilidade dos campos não foi validada contra um projeto conectado. A captura visual não certifica a VPS. Estado permanece `FIXED` até verificação autenticada.
- Critério de fechamento: abrir projetos com/sem dados de métrica e confirmar layout, texto “não medido”, links e foco de teclado em 375/768/1280/1920 px; marcar `VERIFIED` somente após captura visual na versão local autenticada.

### UI-052 — Cartão de projeto inventava uma tela Screen DNA

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#projects` → lista de projetos.
- Evidência: `renderCards` atribuía `1` tela ao ID `api-platform-live` mesmo quando nenhuma tela vinha do catálogo/absorção; os demais projetos recebiam contagem zero sem consultar as fontes já normalizadas.
- Correção local: o cartão agora usa `getProjectScreens(project)`, a mesma união de telas registradas para o detalhe Screen DNA. Nenhum projeto recebe contagem especial pelo ID.
- Reprodução/teste: a asserção de regressão falhou antes da correção e passou depois em `node --test test/project-screen-dna-reality.test.js`.
- Limite: contagem revisada no código local; API autenticada e versão VPS não foram acessadas nesta etapa.
- Critério de fechamento: comparar a contagem do cartão com a aba Screen DNA em projeto com catálogo, com absorção e sem telas; confirmar as três situações visualmente.

### UI-053 — Memória lançava exceção ao concluir leitura do Graph Brain

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#memory` · Viewports verificados: 375×812 e 1280×800.
- Evidência/reprodução: abrir Memória em sessão expirada e aguardar a resposta `401`; a conclusão da requisição disparava `ReferenceError: neuralBrainActive is not defined`, interrompendo o callback de renderização. A matriz de geometria também visitou 7 telas em 4 larguras (28 medições, sem overflow ou interativos fora da tela); relatório: `qa-results/visual-audit-2026-10-21.json`.
- Causa: callbacks de busca, seleção e carregamento ficam no escopo do renderer externo, mas o estado e a inicialização do cérebro 3D estavam declarados dentro de `install()`.
- Correção: estado ativo e referência do inicializador agora compartilham o escopo do renderer; `install()` registra a função nesse binding. A tela apresenta um único aviso de sessão expirada, mantém detalhe técnico recolhido e oferece retorno ao login preservando `#memory`. O HTML usa `memory-live.js?v=6-memory-error-recovery`.
- Teste: `node --test test/memory-error-recovery.test.js test/memory-brain-layout.test.js test/memory-provenance.test.js` — 7/7 passaram; teste de erro reproduz `401` e valida aviso, rota de retorno e ausência de exceção JavaScript.
- Limite: a sessão local não autenticou o Graph Brain; `401` permanece mostrado como erro explícito e dados persistidos não foram verificados. VPS não alterada.
- Fechamento: manter busca, seleção, canvas 3D e callbacks de erro operantes com dados autenticados; confirmar novamente com sessão válida e sem console errors.

### UI-054 — Falha de sessão duplicava mensagem e expunha rota de login

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#memory` · Viewport de teste: `375×812`.
- Evidência/reprodução: API responde `401` com mensagem de autenticação; a tela mostrava aviso e status duplicados com o caminho interno de login.
- Correção: mensagem curta em português, detalhe técnico recolhido e ação “Entrar novamente” que preserva a rota de retorno. O status duplicado é ocultado somente enquanto o aviso está ativo.
- Verificação: teste Playwright com resposta `401` controlada passou; erro original permanece nos detalhes e não aparece no texto principal.
- Limite: teste reproduz o estado de sessão expirada, não valida uma sessão real autenticada nem a API da VPS.

### UI-055 — Não havia visão conjunta de telas registradas por projeto

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: as telas só podiam ser vistas entrando em cada projeto; faltava uma visão de portfólio para comparar o que já foi registrado.
- Correção: aba “Telas & DNA” no Project Hub agrega previews e rotas do Project Kernel; abre o Screen DNA do projeto escolhido e indica captura histórica. Projetos sem telas mostram estado vazio, sem thumbnail substituta.
- Verificação: Playwright percorreu tela registrada → portfólio → Screen DNA; a área principal não teve overflow horizontal nas quatro larguras. `node --test test/project-screen-portfolio.test.js` passou.
- Limite: dados do catálogo foram simulados explicitamente no teste. A sessão real estava expirada, a versão VPS não foi alterada e o catálogo desktop de 41 atalhos não foi conectado ao serviço remoto.

### UI-056 — Portfólio de telas escondia registros além das quatro primeiras

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#projects` → `Telas & DNA` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: um projeto com cinco telas mostrava apenas quatro prévias, sem busca global ou acesso direto ao Inspector pela prévia.
- Correção local: portfólio oferece busca por projeto/título/rota/arquivo, filtros por captura/histórico/sem captura, contagens separadas por evidência, expansão/recolhimento do catálogo completo e ação de inspeção em cada tela. Registros sem imagem são rotulados “Sem captura · não medido”. Cache de CSS/JS atualizado para que a interface receba os novos recursos.
- Verificação: `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-company-panel-layout.test.js` — 13/13 passaram; fluxo cobre expansão, busca, filtros, abertura do Inspector, estado sem captura e ausência de overflow nos quatro viewports. Captura de fixture em 375 px: `%TEMP%/grg-project-screen-portfolio-375.png`.
- Limite: os registros foram controlados no fixture Playwright; sessão autenticada e versão da VPS não foram alteradas nem certificadas. A pasta Windows `C:\Users\Dell\Desktop\PROJETOS` continua fora do runtime remoto até integração de agente local autorizada.
- Critério de fechamento: repetir com sessão autenticada e dados reais em 375/768/1280/1920 px; validar carregamento das capturas e a navegação ao Screen DNA do projeto selecionado.

### UI-057 — Project Hub ainda usava estilos concorrentes com o design system

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#projects` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: o CSS da tela declarava Inter, ações com gradiente ciano, sombras de 8×24 px e seleção ciano; o design system carregado no shell não vencia essa cascata. A captura local de 375 px mostrou a diferença no header, métricas, navegação e catálogo visual.
- Correção: unifiquei a superfície do Project Hub em grafite neutro, tipografia de sistema, acento azul, cartões sem sombra e botões com alvos mínimos de 40 px. Mantive informação técnica e identidade GRG; apenas a camada visual de Projeto foi harmonizada. Cache CSS incrementado.
- Verificação: teste Playwright mede font-family, cor da ação primária, cor da navegação ativa, sombra e altura do botão; matriz de overflow passa nos quatro viewports. Captura QA: `%TEMP%/grg-project-screen-portfolio-375-apple.png`.
- Limite: fixture visual usa dados de projeto de teste. Sessão real e CSS da VPS não foram validados/publicados.
- Critério de fechamento: revisar a tela com projetos autenticados e comparar as mesmas regras visuais nas demais áreas do produto antes de fechar a harmonização global.

### UI-058 — Regras Apple HIG anulavam a geometria responsiva da Cidade

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: o override geral em `fenix-hig-system.css` transformava a sidebar móvel em painel quase fullscreen mesmo recolhida. O minimapa e a barra de navegação tinham colisão de 9 px em 375 px; Inspector e painel de mídia ficavam sobre controles de mapa. O HIG CSS também selecionava o Inspector 3D oculto e ocultava navegação que precisava estar visível.
- Causa/correção: removi o override que concorria com o layout responsivo canônico em `fenix-responsive.css`; a sidebar voltou a usar bottom sheet recolhido e expansão explícita. Separei navegação e minimapa com 14 px de margem calculada. Durante Inspector/modal, a navegação de fundo é recolhida apenas em telas estreitas e o painel de mídia é identificado corretamente apesar de ser irmão do `#view-city`.
- Verificação: `node --test test/city-overlay-layout.test.js` — 8/8 passaram após as correções; `city-runtime-notice-mobile.test.js` também passou. Captura real do app local `127.0.0.1:4400/app#city` em 375×812: aviso com 54 px, barra inferior sem colisão, navegação com 5 px de respiro ao minimapa e zero erros JavaScript.
- Limite: o app local mostrou sessão expirada, então a geometria foi verificada, mas não houve telemetria/cidade autenticada. VPS não publicada.
- Critério de fechamento: revalidar conversação e dados autenticados nas mesmas dimensões após deploy controlado; não depende de alterar o layout local atual.

### UI-059 — Catálogo de telas não conectava o mapa global de interfaces

- Prioridade: `P1` · Estado: `FIXED` local; runtime autenticado pendente · Rota: `#projects` → `Telas & DNA` → mapa do shell.
- Evidência/correção local: o QA mapeou 15 telas canônicas na aplicação; uma varredura do HTML encontrou 18 hashes, incluindo três aliases legados. O catálogo de Projetos só mostrava telas do registro/absorção de cada projeto. Agora a aba incorpora o endpoint autenticado de descoberta do shell, lista as 15 rotas canônicas e arquivos de origem, informa os três aliases ocultos, distingue inventário estático de verificação real, abre a rota selecionada e permite expandir o mapa.
- Verificação de UI: `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/screen-readiness-report.test.js` — 15/15 passaram; overflow verificado em 375, 768, 1280 e 1920 px.
- Bloqueio: execução local de `qa:frontend:fast` expirou ao abrir `/app` e registrou quatro respostas 401; 26 dos 29 contratos GET ficam protegidos sem sessão. Não foi possível verificar visualmente as 15 rotas autenticadas nem comparar com o HTML/runtime da VPS. Os 10 contratos sem referência detectada no frontend permanecem como itens de triagem, não como falhas confirmadas.
- Evidência gerada: `qa/screen-function-map.json`, `qa-results/screen-qa-plan.json`, `qa-results/screen-contract-probe.json`, `qa-results/screen-readiness-report.json`, `qa-results/screen-improvement-queue.json` e `qa-results/frontend-navigation-qa.json`.
- Atualização 21/10/2026: implementação e fluxo visual do mapa estão validados localmente; o bloqueio restante é de verificação da sessão/runtime hospedado, não da implementação. Nenhuma publicação foi feita.
- Critério de verificação restante: autenticar o navegador QA, confirmar cada rota na versão servida, testar controles sem mutações e reconciliar os 10 contratos sem referência; marcar como `VERIFIED` somente com evidência visual/runtime autenticada. VPS não alterada.

### UI-060 — Controles e sugestões estáticas comprimiam o chat do Fênix

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: sidebar direita → Chat · Viewports: 375, 768, 1280 e 1920 px.
- Evidência/reprodução: screenshots do operador e do teste local mostravam contexto, memória, quatro ações, seis áreas em ícones, histórico, sugestões de criação e dez chips competindo com a conversa. A saudação inicial incluía botões de criar agente/missão/reunião e sugestões vazias com “—”. Em 375 px, o histórico e a conversa ocupavam pouco espaço útil.
- Correção local: contexto/memória e ações rápidas agora ficam em disclosures acessíveis recolhidos por padrão; a contagem de ações acompanha o contexto carregado. Removi ações de execução e sugestões sem dados do estado inicial; conversa vazia recebe uma saudação concisa. As áreas da sidebar têm rótulos acessíveis e `aria-pressed` acompanha a seleção. Modo compacto móvel fica em largura de 64 px, sem ser expandido para drawer pelo override responsivo.
- Verificação: `node --test --test-concurrency=1 test/sidebar-hig-density.test.js test/sidebar-mission-rendering.test.js test/copilot-compact-interaction.test.js` — 3/3 passaram. Testes cobrem expansão dos disclosures, ações contextuais, saudação vazia, navegação de abas, overflow em quatro larguras, cartão de missão sem telemetria fictícia e compacto 64 px em 375/768/1280 px. Captura local: `%TEMP%/grg-sidebar-hig-375.png`.
- Limite: teste visual usa o shell local; respostas autenticadas do provider e versão da VPS não foram validadas ou publicadas.
- Critério de fechamento local: manter a conversa como foco padrão, preservar acesso às ações rápidas sem dados falsos e não regredir o histórico/mission card; a validação provider/VPS permanece fora deste item visual.

### UI-061 — Cabeçalho global cortava KPIs e não expunha ações de busca acessíveis

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: shell global / `#city` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: os cartões de estado perdiam rótulos em larguras compactas; em 1181–1360 px o texto era truncado; em desktop o grupo de ações podia ultrapassar o cabeçalho. A busca era um `div` clicável sem foco ou teclado.
- Correção local: KPIs são quatro botões nativos com nomes acessíveis; em celular ficam numa faixa rolável com indicador; em tablet/desktop recebem rótulos curtos e dimensões medidas. Controles redundantes do cabeçalho cedem espaço aos KPIs e à busca. Busca global agora tem foco, rótulo, semântica de botão e abre o diálogo com Enter/Espaço; em 1181–1360 px vira um ícone compacto, evitando o placeholder cortado, e em desktop amplo mantém o campo completo. Valores indisponíveis são exibidos em português.
- Verificação: `node --test test/topbar-hig.test.js` — 1/1 passou após a correção de busca; a suíte combinada de shell/contadores/responsividade já havia passado 21/21. Playwright verificou os quatro viewports, overflow, superfícies, foco/teclado dos KPIs e abertura da busca por Enter. As expectativas de teste foram alinhadas à cópia localizada do estado indisponível e ao espaçamento de 20 px já aplicado na Cidade. Capturas locais: `docs/visual-evidence/2026-10-21/topbar-{375,768,1280,1920}-hig.png`.
- Limite: fixture local sem sessão autenticada; não certifica dados do runtime nem versão da VPS. Nenhuma publicação foi feita. `git diff --check` ainda aponta whitespace em alterações preexistentes fora desta fatia.
- Critério de fechamento: repetir após autenticação com a versão servida e confirmar a abertura do diálogo, os quatro KPIs e a rolagem móvel sem overflow.
- Rechecagem em 22/10/2026: a cascata compartilhada HIG retirava as cores próprias dos ícones, e a regra de desktop fixava quatro cartões em 166 px, excedendo a faixa de 612 px no viewport de 1920. O CSS local preserva acentos ciano/laranja/roxo/verde nos ícones e bordas; em desktop amplo os cartões dividem o espaço disponível. O teste foi ampliado para conferir contagens visíveis e bordas na cor de cada categoria em 375/768/1280 px e o ajuste/ausência de overflow em 1920 px; passou 2/2. Estado deste seguimento: `FIXED local`; sem captura arquivada nem validação da versão VPS.

### UI-062 — Tela Memória empilhava indicadores vazios antes do grafo

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#memory` · Viewports: `375×812` e `1280×800`.
- Evidência/reprodução: captura local da tela mostrava sete cartões altos de camada mais quatro cartões de métricas, todos com `—`, empurrando a área de entidades e relações para baixo. Em celular, os cartões ocupavam várias linhas e as camadas eram `div`s clicáveis sem operação por teclado.
- Correção: camadas viraram botões com `aria-pressed`, faixa horizontal rolável em telas estreitas e indicadores do grafo reunidos em uma linha compacta. Ações de conexão/sincronização agora têm hierarquia mais discreta e os assets recebem versão nova para invalidar cache.
- Verificação: `node --test test/memory-screen-hierarchy.test.js test/memory-brain-layout.test.js test/memory-error-recovery.test.js test/memory-provenance.test.js` — 8/8 passaram com Chromium headless 1248. Playwright conferiu a tela em 375 e 1280 px, ativou L3 Semantic e verificou ausência de overflow horizontal. Capturas: `docs/visual-evidence/2026-10-21/memory-hierarchy-{375,1280}-after.png`.
- Limite: fixture local sem sessão autenticada, portanto valores reais do Graph Brain e funcionamento com dados persistidos não foram certificados. Nenhuma publicação na VPS.
- Critério para validação de runtime: repetir com sessão autenticada, conferir contagens reais e confirmar que seleção de cada camada filtra o grafo correspondente.

### UI-063 — Minimap ocupava área excessiva com a conversa acoplada

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city` com Fênix aberto · Viewport: `1280×800`.
- Evidência/reprodução: com a sidebar aberta, a Cidade tinha 594 px de largura útil e o minimapa continuava com 238 px; os controles ficavam visualmente apertados e a navegação inferior se posicionava usando a altura antiga do mapa.
- Correção: em telas de 901–1360 px com a sidebar aberta, o minimapa reduz para 190 px e o seletor se reposiciona conforme a nova altura. A mudança é limitada a essa composição; controles e dados permanecem acessíveis.
- Verificação: `node --test test/city-overlay-layout.test.js` — 9/9 passaram. O cenário `city minimap and view switcher scale down in the remaining map beside chat` falhou antes (238 px) e passou após a correção (192 px medidos incluindo borda); distância entre seletor e mapa ficou em 18 px, sem overflow horizontal. Captura: `docs/visual-evidence/2026-10-21/city-sidebar-minimap-1280-after.png`.
- Limite: fixture e shell locais, sem sessão autenticada; não certifica dados do World na VPS. Nenhuma publicação foi feita.
- Critério de validação restante: rever em navegador autenticado e em largura de notebook com os painéis operacionais reais abertos.

### UI-064 — Cabeçalho e conteúdo do Project Hub eram cortados em celular

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#projects` · Viewport reproduzido: `375×812`.
- Evidência/reprodução: com o catálogo indisponível, `.fenix-live-projects` tinha 319 px úteis e `scrollWidth` de 594 px; as ações do cabeçalho iniciavam em `x=343`, fora do cabeçalho (`x=28–347`), e eram cortadas pelo contêiner.
- Causa/correção: a composição móvel herdava largura mínima e alinhamento horizontal inadequados. A grade passa a ter uma coluna, ações em duas colunas contidas no cabeçalho e abas que quebram em duas colunas. O CSS recebeu versão `8-project-mobile-layout`.
- Verificação: a asserção foi reproduzida falhando antes da correção; `node --test test/project-hub-unavailable-state.test.js test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-company-panel-layout.test.js` — 14 verificações internas passaram em 4 testes. Geometria móvel confirma `scrollWidth === clientWidth` e ações dentro do cabeçalho. Capturas: `docs/visual-evidence/2026-10-21/projects-unavailable-{375,1280}-after.png` e `projects-screen-portfolio-375-after.png`.
- Limite: catálogo e respostas de projeto vêm de fixtures do navegador; sessão autenticada, diretório local `C:\Users\Dell\Desktop\PROJETOS` e versão da VPS não foram conectados/verificados. Nenhuma publicação foi feita.
- Critério de fechamento: repetir com sessão autenticada e projetos reais em 375, 768, 1280 e 1920 px; verificar catálogo de telas do shell e entrada direta no Screen DNA do projeto selecionado.

### UI-065 — Mapa do shell não mostrava a organização funcional das telas

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → `Telas & DNA` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: o inventário visual apresentava rotas numa lista plana, embora `qa/frontend-screen-manifest.json` já organizasse as telas por domínio e descrevesse propósito e contratos de leitura. O teste falhava por ausência dos grupos funcionais.
- Correção: `/api/v2/frontend-reality/screens?mode=shell` acrescenta `domain`, `purpose`, `readEndpoints` e `actionEndpoints` usando o manifesto versionado. O Project Hub agora também completa os campos ausentes com `public/project-screen-manifest.json`, mantendo a API como fonte das rotas e aceitando versões implantadas que ainda não retornam esses metadados. O manifesto público é testado contra a fonte de QA. A interface mostra ações como contratos declarados, sem oferecê-las como execução; runtime continua não verificado.
- Verificação: teste RED reproduziu a ausência de `domain` e de grupos; com uma resposta de API compatível com a versão antiga, `node --test test/project-screen-domain-map.test.js test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-company-panel-layout.test.js test/project-hub-unavailable-state.test.js test/project-screen-manifest-public.test.js` — 16/16 passaram. A matriz do portfólio verifica overflow nas quatro larguras. Capturas: `docs/visual-evidence/2026-10-21/projects-screen-portfolio-{375,1280}-domain-map-after.png`.
- Limite: execução local/fixture; a rota de produção autenticada e a visualização com o catálogo real não foram conferidas. Nenhuma publicação na VPS.
- Critério para fechamento em produção: confirmar que o manifesto existe na imagem implantada, conferir os metadados da rota e revisar os grupos com dados reais de Projetos.

### UI-066 — Projeto único deixava metade do catálogo visual vazia

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → `Telas & DNA` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: no browser com um projeto, a grade tinha 856 px e o cartão apenas 421 px, deixando a coluna lateral vazia e reduzindo os previews a duas colunas.
- Correção: quando o catálogo filtrado contém exatamente um cartão de projeto, a grade usa uma faixa de largura total; dois ou mais projetos continuam na grade responsiva existente.
- Verificação: a asserção falhava com o cartão a 421 px e passou com a largura alinhada à grade. `node --test test/project-screen-portfolio.test.js` passou; matriz existente verifica overflow nas quatro larguras. Captura desktop e mobile: `docs/visual-evidence/2026-10-21/projects-screen-portfolio-{1280,375}-domain-map-after.png`.
- Limite: dados exibidos na captura vêm de fixture de navegador. Sessão autenticada e versão VPS não foram alteradas.
- Critério para fechamento em produção: conferir filtro com um projeto e catálogo com vários projetos autenticados; garantir que ambos preservem hierarquia e largura responsiva.

### UI-067 — VPS serve catálogo de telas anterior ao mapa funcional

- Prioridade: `P1` · Estado: `OBSERVED` na VPS · Rota: `/app#projects` → `Telas & DNA`.
- Evidência: leitura HTTP pública em `http://209.50.241.22:3000/app#city` retornou `200`; o HTML aponta `/project-hub-live.css?v=2` e `/project-hub-live.js?v=20261020-screen-dna-archive-1`. Os hashes completos dos arquivos em `/opt/fenix-os/public/`, que coincidem com os bytes servidos, são `519e0aa2140ab644e09047ff912440e7556c1d4e1e1634cc4d4e35ffad266692` (CSS, 22.697 bytes) e `9ea8175bc6b953f6b5dc8e7dc784c83a1663fce870c2c91f7296629c7527cfbf` (JS, 140.689 bytes). A fonte local aponta `/project-hub-live.css?v=11-project-screen-preview-states` e `/project-hub-live.js?v=12-project-screen-preview-validation`, com hashes `B077F5717A074F09B1DFD854ABDCC53E24EC5073EBD85F21034AA5E29AFBDC42` (CSS, 41.130 bytes) e `7315A070A56211585668BCEE8F42704398B60195E849BA2839A51C2DAF21E389` (JS, 147.938 bytes). A versão local completa metadados pelo manifesto público e rejeita previews com dimensão insuficiente.
- Impacto: melhorias `UI-065` e `UI-066` estão verificadas localmente, mas ainda não aparecem na página servida pela VPS. O layout visto pelo usuário pode continuar exibindo o catálogo antigo.
- Reprodução: obter o HTML de `/app#city`, registrar as referências de CSS/JS e comparar os corpos dos assets com a revisão local correspondente.
- Ação necessária: identificar a origem do listener/artefato da porta 3000 e publicar somente após revisar o pacote. Os assets estáticos foram preparados para funcionar com a resposta antiga da API por meio de um manifesto público local. Um rollback foi copiado e validado em `/home/deploy/grg-space-backups/20261021-project-screen-rollout-prep/` (`index.html`, CSS e JS; `sha256sum -c` passou). `docker ps` não mostra container expondo a porta 3000; `deploy` não tem `sudo` sem senha e não consegue inspecionar o dono do PID/listener. Nenhum asset foi publicado nem processo reiniciado.
- Reteste HTTP 21/10/2026: CSS/JS servidos continuam em `project-hub-live.css?v=2` e `project-hub-live.js?v=20261020-screen-dna-archive-1`; hashes remotos permanecem `519e0aa2…266692` (22.697 bytes) e `9ea8175b…527cfbf` (140.689 bytes). A cópia local atual usa CSS `v=14-screen-dna-unmeasured-compact` (`88560ca4…d382b6`, 43.173 bytes) e JS `v=16-project-folder-browser` (`0095baea…9c124`, 162.393 bytes), ambos diferentes. O HTML remoto também usa `fenix-responsive.css?v=20261020-responsive-layout-9`; `/fenix-hig-system.css` e `/city-agent-visual-profile.js` retornam 404 na VPS, enquanto existem localmente. O JavaScript do modal de tarefa servido tem bytes idênticos à cópia local; o CSS do modal ainda diverge.
- Critério de fechamento: HTML servido usa as versões aprovadas; CSS/JS servidos têm hashes da publicação; sessão autenticada mostra grupos funcionais e cartão único em largura total; registrar captura antes/depois e rollback.

### UI-068 — Miniaturas mínimas eram ampliadas como previews de tela

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → `Telas & DNA` · Viewports: `375×812` e `1280×900`.
- Evidência/reprodução: a resposta de QA fornecia uma imagem de 1×1 pixel para um registro histórico. O cartão ampliava o pixel branco até 132 px de altura e parecia uma captura válida.
- Correção: o portfólio e o canvas do Screen DNA só mostram imagens com pelo menos 64×36 pixels intrínsecos. Capturas menores mostram “Captura em baixa resolução”; erros de carregamento e telas sem captura têm estados vazios próprios. A data histórica continua visível quando fornecida. Removi a linha redundante sob o estado “Prévia não medida”.
- Verificação: teste RED reproduziu a miniatura branca; `test/project-screen-portfolio.test.js` confirma rejeição do pixel 1×1 no portfólio e no canvas, mantém quatro capturas válidas 320×180 e verifica ausência de rótulo duplicado. Suíte atualizada: 49/49 em Projetos, absorção e Cidade. Capturas: `docs/visual-evidence/2026-10-21/projects-screen-portfolio-{375,1280}-domain-map-after.png` e `screen-dna-multi-app-1280-after.png`.
- Limite: imagens e projetos vêm de fixture de QA; a versão da VPS continua antiga, conforme `UI-067`.
- Critério de fechamento em produção: validar dimensões das capturas reais e confirmar que imagens úteis continuam visíveis na sessão autenticada.

### UI-069 — Falha de WebGL deixava a Cidade sem renderizador utilizável

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: no navegador embutido, `THREE.WebGLRenderer` não conseguia criar contexto. O bootstrap tentava iniciar o renderer 3D repetidamente e não ativava o `IsoCityEngine` 2D, apesar de haver uma tela 2D e dados do World disponíveis.
- Correção: falha de inicialização WebGL agora limpa o host parcial e ativa o renderer 2D existente, mantendo o snapshot/roster recebido do runtime. A interface informa a limitação e permite recarregar para tentar 3D. Ausência de Three.js usa o mesmo caminho.
- Verificação: teste browser `test/city-webgl-fallback.test.js` bloqueia WebGL, serve um agente explicitamente medido pela API de QA e confirma o renderer 2D, um agente e aviso visível; mediu contenção horizontal do aviso nos quatro viewports. Suíte City: `test/city-webgl-fallback.test.js`, `test/city-bootstrap-auth.test.js`, `test/city-empty-state-recovery.test.js`, `test/city-live-indicators.test.js` — 13/13. Captura local: [city-webgl-fallback-1280-after.png](visual-evidence/2026-10-21/city-webgl-fallback-1280-after.png).
- Limite: os edifícios decorativos pertencem ao mapa existente; o teste só fornece um agente real de fixture e confirma que a coleção do renderer tem exatamente um. VPS, sessão autenticada e escala dos avatares reais não foram verificadas; nenhuma publicação foi feita.
- Critério de fechamento na VPS: repetir com sessão autenticada em browser sem WebGL e com WebGL, verificar snapshot real, seleção/Inspector do agente e entrada após refresh; anexar evidência da versão servida.

### UI-070 — Project Hub não conectava o catálogo local PROJETOS

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#projects` → `Meus Projetos`.
- Evidência: o inventário existente documentava 41 registros em `C:\Users\Dell\Desktop\PROJETOS\projetos.json`, mas `/api/fenix/projects` só retornava Project Kernel/registry. A VPS não pode ler os caminhos do disco Windows.
- Correção: Project Kernel carrega o catálogo local no backend da máquina do usuário, aceita BOM UTF-8 e cria IDs `local-*` para manter 41 entradas separadas dos projetos canônicos. O Project Hub lista/busca os itens em aba própria, mostra grupo, variante e caminho, permite IDE/Screen DNA e abre manualmente `localUrl`. Entradas de arquivo são limitadas ao arquivo declarado; absorção de pasta é bloqueada para elas. Comandos/atalhos não são executados.
- Verificação: `node --test test/local-project-catalog-integration.test.js test/local-project-catalog-ui.test.js test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-workspace-registry-fallback.test.js` — 21/21 passaram. Leitura real do catálogo: 41 entradas, 41 caminhos existentes, 2 arquivos isolados; Project Kernel local de teste: 41 entradas locais além de 6 canônicas. Chrome exibiu os 41 registros sem erros/overflow nas quatro larguras. Captura: `docs/visual-evidence/2026-10-21/projects-local-catalog-1280-after.png`.
- Limite: o backend hospedado em `209.50.241.22:3000` não tem acesso ao disco C:. O catálogo só aparece quando a interface usa o backend local no mesmo computador; para a VPS é necessário agente local autenticado. Nenhuma publicação foi feita.
- Critério de verificação restante: no app local autenticado, abrir “Meus Projetos”, selecionar pastas/variantes, ler arquivo único e abrir Screen DNA; depois validar o elo local autenticado para consumo da UI hospedada, com permissões e reconexão.

### UI-071 — Detalhe local apresentava métricas de runtime sem fonte

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#projects` → `Meus Projetos` → projeto sem absorção.
- Evidência/reprodução: o detalhe aplicava defaults genéricos (“Operacional”, “1 agente”, “Node.js / Full-Stack”, “0 jobs”, memória sincronizada e Genome v2.5) quando o Project Kernel não enviava esses campos. A captura anterior é `docs/visual-evidence/2026-10-21/projects-local-catalog-1280-after.png`.
- Correção: o resumo local mostra somente caminho, grupo, tipo e campos efetivamente presentes. Campos runtime ausentes ficam em “Dados ainda não mapeados”; métricas de execução e artefatos distinguem ausência de dado de zero medido.
- Verificação: teste browser com estado local `{}` confirma quatro fatos de catálogo, 11 itens não mapeados sob disclosure, ausência de tiles de execução zerados, inspeção Git real e sem overflow em 375/768/1280/1920 px. Captura após correção: `docs/visual-evidence/2026-10-21/projects-local-card-clarity-1280-after.png`.
- Limite: browser e API usam fixture; uma sessão autenticada com os projetos locais reais na aplicação Windows não foi conferida nesta fatia. VPS não alterada.
- Critério de fechamento em produção: validar os mesmos fatos na sessão autenticada e confirmar que contadores reais continuam aparecendo quando fornecidos pelo backend.

### UI-072 — Ações e subabas do projeto competiam por espaço

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → detalhe de projeto.
- Evidência/reprodução: o cabeçalho mostrava até dez botões simultaneamente e as nove subabas quebravam em duas linhas, alongando a tela e obscurecendo a hierarquia.
- Correção: workspace, Screen DNA e sistema declarado ficam como ações principais; ferramentas restantes continuam acessíveis em “Mais ações”. As subabas ocupam uma faixa horizontal rolável com indicador de rolagem.
- Verificação: Playwright confirma menu de ações, acesso à última subaba após rolagem e posicionamento do menu dentro de 375/768 px; layout sem overflow em 375/768/1280/1920 px. Captura: `docs/visual-evidence/2026-10-21/projects-local-card-clarity-1280-after.png`.
- Limite: visualização autenticada da VPS não foi validada e os assets locais ainda não foram publicados.
- Critério de fechamento em produção: repetir a captura com projeto canônico e local na versão servida, incluindo teclado e telas estreitas.

### UI-073 — Git de projeto local ficava indefinidamente em carregamento

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → seleção de workspace local → Visão Geral & Git.
- Evidência/reprodução: `selectProject()` não consultava Git para entradas `LOCAL_PROJECT_CATALOG`, mas `renderGit()` ainda mostrava “Lendo repositório Git…”.
- Correção: seleção de workspace disponível inicia a leitura GET existente do Project Git; commits, push e outras escritas não são iniciados. Erros do endpoint ficam explícitos no painel.
- Verificação: teste integrado cria um repositório Git descartável em diretório temporário, consulta-o pelo ID `local-*` através do Project Kernel e confirma HEAD e status limpo sem alterar o repositório. A captura mostra branch recebido em vez do carregamento eterno.
- Limite: a integração foi validada contra repositório temporário e fixture local; o estado dos repositórios reais do catálogo não foi consultado nesta fatia. VPS não alterada.
- Critério de fechamento em produção: validar leitura em repositório real, em pasta não Git e em arquivo isolado, sem executar operações de escrita.

### UI-074 — Abas da Memória não alternavam e erro deixava o grafo vazio ocupando a tela

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#memory` · Viewport reproduzido: `375×812`.
- Evidência/reprodução: a captura `docs/visual-evidence/2026-10-21/memory-hierarchy-1280-after.png` mostra aviso de sincronização junto de camadas sem contagem e painel de grafo vazio. Os botões “Grafo & Camadas” e “Registros Persistidos” não tinham papéis ARIA nem listeners de alternância.
- Causa: as duas áreas eram renderizadas simultaneamente; falha inicial da API deixava visíveis controles e um workspace sem dados, e a navegação visual não estava conectada a estado.
- Correção local: implementei abas acessíveis com setas/Home/End, separei os painéis e mantive a busca de memória persistida independente do Graph Brain. Camadas, resumo, grafo e proveniência só aparecem após uma leitura medida; erro de sessão fica na aba do grafo, com detalhe técnico recolhido e ação para autenticar.
- Verificação: o teste browser reproduz 401, usa a aba de registros e busca uma memória, navega por teclado, valida contenção móvel, confirma retorno após login e depois carrega grafo medido. Suíte `test/memory-error-recovery.test.js test/memory-screen-hierarchy.test.js test/memory-provenance.test.js`: 4/4. Captura: `docs/visual-evidence/2026-10-21/memory-tab-recovery-375-after.png`.
- Limite: browser usa respostas de fixture. Sessão autenticada e API Graph Brain da VPS não foram conferidas; nenhuma publicação foi feita.
- Critério para fechamento em produção: testar erro/recuperação com sessão real, confirmar que registros persistidos funcionam quando Graph Brain está indisponível e revisar ambas as abas em 375, 768, 1280 e 1920 px.

### UI-075 — Telas de aplicações diferentes compartilhavam rota e pareciam iguais no portfólio

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → `Telas & DNA` · Viewports verificados: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: o catálogo de telas mostrava Admin e Storefront em `/home`, mas os cartões do portfólio exibiam apenas `/home`; a identificação da aplicação só aparecia dentro do canvas Screen DNA.
- Correção local: cartões de telas com rota duplicada agora exibem `Aplicação: <id>` usando `applicationId` observado. O rótulo só aparece quando existem telas com a mesma rota em aplicações distintas.
- Verificação: `test/project-screen-portfolio.test.js` falhava antes da alteração e passou depois; conjunto focado de portfólio, Screen DNA, escopo de aplicação, proveniência, manifest e catálogo local passou. Capturas antes/depois desta fatia: `docs/visual-evidence/2026-10-21/projects-screen-portfolio-integration-1280.png` e `docs/visual-evidence/2026-10-21/projects-screen-portfolio-integration-375.png`.
- Limite: os dados de tela vieram de fixtures e o runtime real da VPS não foi validado; nenhuma publicação foi feita.
- Critério para fechamento em produção: confirmar rótulos de aplicação e capturas reais no catálogo autenticado da VPS e em projetos locais absorvidos.

### UI-076 — Projetos locais não mostravam a árvore real na própria área de Projetos

- Prioridade: `P1` · Estado: `VERIFIED` local (fixture browser) · Rota: `#projects` → projeto local → `Arquivos`.
- Evidência/reprodução: a aba Arquivos exigia um relatório de análise previamente salvo e ficava vazia para workspaces existentes, apesar de haver uma API autenticada de árvore e leitura individual de arquivos.
- Correção local: a aba Arquivos consulta a árvore real, permite expandir pastas e abrir um arquivo na IDE do mesmo projeto. Exibe limite de profundidade, erro e caminho indisponível. A ação principal `Abrir na IDE` seleciona o projeto; Screen DNA segue como ação independente.
- Segurança: usa apenas `GET /api/fenix/projects/:id/tree` e leitura individual já existente; não executa atalhos, comandos ou serviços, nem grava arquivos.
- Verificação: suíte `test/local-project-catalog-ui.test.js test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js` passou 14/14 no Chrome local; comprovou árvore, arquivo escolhido encaminhado à IDE, portfólio Screen DNA e layout sem overflow em 375/768/1280/1920 px. Capturas: `docs/visual-evidence/2026-10-21/projects-local-file-tree-{375,768,1280,1920}-after.png`. Os 41 diretórios reais não foram conectados neste teste.
- Critério para fechar: na sessão local autenticada, conferir pastas, arquivo individual, abertura de arquivo na IDE, erros e larguras 375/768/1280/1920 px. VPS não tem acesso ao disco `C:` sem agente local autenticado.

### UI-078 — Drawer de Operações cobria a Cidade quando havia conteúdo extenso

- Prioridade: `P1` · Estado: `VERIFIED` local (fixture browser) · Rota: `#city` → Painel de Operações 24/7 · Viewport: `375×812`.
- Evidência/reprodução: o teste inseriu conteúdo longo no painel e mediu 471 px de altura (58% do viewport), cobrindo grande parte do mapa. Captura após correção: `docs/visual-evidence/2026-10-21/city-operations-drawer-content-fit-375-after.png`.
- Causa: limite móvel de 58vh permitia que o drawer crescesse além da área reservada à Cidade.
- Correção local: limite reduzido para 50vh; conteúdo interno permanece rolável e o mapa continua visível.
- Verificação: teste Chromium `city cockpit, operations and media drawers never stay open together` passou após a correção; cenário longo confirmou drawer ≤ 50% da altura e conteúdo rolável. Nenhuma publicação foi feita.
- Critério para fechamento em produção: conferir o painel com sessão real em 375/768/1280/1920 px e validar listas longas da API; VPS e dados autenticados permanecem pendentes.

### UI-079 — Telas sem captura ocupavam a mesma área de previews reais

- Prioridade: `P2` · Estado: `VERIFIED` local (fixture browser) · Rota: `#projects` → `Telas & DNA` → projeto com telas não medidas.
- Evidência/reprodução: três estados “Prévia não medida” ocupavam 134 px cada, a mesma altura de imagens reais, criando painéis vazios no portfólio. O teste browser falhou antes da correção com `[134,134,134]`.
- Correção: estados sem captura usam 76 px, com ícone e texto explícitos. Capturas reais mantêm suas dimensões; nenhum placeholder é carregado como imagem.
- Verificação: testes de Screen DNA/portfólio e catálogo local passaram 15/15 (`test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/local-project-catalog-ui.test.js test/project-company-panel-layout.test.js`); validaram altura ≤84 px, três estados claros e layout sem overflow em 375/768/1280/1920 px. Captura: `docs/visual-evidence/2026-10-21/projects-screen-dna-compact-empty-state-375-after.png`.
- Limite: dados de tela vieram de fixture local. Catálogo autenticado, capturas reais e CSS servido pela VPS permanecem pendentes.

### UI-080 — Canvas Screen DNA reserva espaço de captura para telas não medidas

- Prioridade: `P2` · Estado: `VERIFIED` local (fixture browser) · Rota: `#projects` → projeto → `Screen DNA`.
- Evidência/reprodução: [captura antes](visual-evidence/2026-10-21/screen-dna-project-board-fixture-1280.png) mostra cards sem captura ocupando o mesmo formato 16:10 das capturas, com grandes superfícies vazias. O teste mediu 169 px antes da correção.
- Correção local: estados sem captura, captura indisponível ou abaixo da resolução mínima usam altura compacta de 64 px e texto explícito; capturas utilizáveis mantêm proporção 16:10.
- Verificação: `node --test test/project-screen-portfolio.test.js test/project-screen-dna-reality.test.js test/project-screen-discovery-provenance.test.js` — 15/15 passaram em Edge; o teste confirma até 76 px para previews não medidos e mantém as telas e aplicações distintas. Captura pós-correção em `docs/visual-evidence/2026-10-21/screen-dna-project-board-compact-1280-after.png`.
- Critério para encerrar em produção: repetir com projetos e telas autenticados, conferir carregamento das capturas reais e confirmar que CSS/JS servidos correspondem à versão local aprovada.

### UI-081 — Rótulos e navegação 3D eram pequenos na Cidade

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#city` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: `test/city-district-label-layout.test.js` mediu rótulos móveis com título de 8 px e detalhe de 7 px, botões “Projetos”/voltar com 32 px de altura, fechar Inspector com 26×34 px e ações do Inspector com 11 px/36,5 px; as assertions falhavam antes das correções.
- Correção local: rótulos usam fonte de sistema, título/detalhe em 11/9 px em mobile e 12/10 px em desktop, área mínima de 40 px e foco de teclado destacado. Navegação 3D e fechar Inspector usam alvos de 44×44 px. Ações do Inspector usam fonte de sistema 13 px, alvo de 44 px e foco visível.
- Verificação: Edge isolado, `node --test test/city-district-label-layout.test.js` — 1/1 passou nos quatro viewports; mediu tamanhos de texto/alvo e ausência de colisões, corte, sobreposição do aviso de runtime, órbita do provider, navegação ou título do Inspector. Captura do Inspector aberto: `docs/visual-evidence/2026-10-21/city-inspector-actions-1280-after.png`.
- Limite: a captura usa o shell sem autenticação, com aviso de sessão expirada. Os bairros são decorativos do renderer; dados de runtime não foram certificados. VPS não foi alterada.

### UI-077 — Aba de workspace ativa aparecia cortada em telas estreitas

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#projects` → projeto local → subabas · Viewport: `375×812`.
- Evidência/reprodução: ao selecionar `Arquivos` em 375 px, a aba ativa extrapolava a faixa rolável (right `374.9`, limite da faixa `347`), ficando cortada. Reproduzido por teste browser antes da correção.
- Causa: ao carregar a árvore da pasta, `renderDetail()` reconstruía as subabas e zerava a posição horizontal depois da seleção.
- Correção: após cada render, o Project Hub ajusta a rolagem da faixa para manter a subaba selecionada integralmente visível.
- Verificação: suíte focada passou 14/14; assertivas medem a subaba ativa e o detalhe após o carregamento assíncrono em 375/768/1280/1920 px. Captura móvel: `docs/visual-evidence/2026-10-21/projects-local-file-tree-375-after.png`.
- Limite: verificado com dados de fixture no browser local; sessão real autenticada e VPS ainda pendentes.

### UI-082 — Barra de modos invadia o minimapa em celular

- Prioridade: `P1` · Estado: `VERIFIED` local (Edge/fixture browser) · Rota: `#city` · Viewports: `375`, `768`, `1280` e `1920` px.
- Evidência/reprodução: teste `city minimap, view switcher and universe toolbar do not overlap at supported widths` falhou em 375 px; a barra terminava em y=506 enquanto o minimapa começava em y=496 (10 px de interseção). Captura pós-correção: [city-minimap-nav-gap-375-after.png](visual-evidence/2026-10-21/city-minimap-nav-gap-375-after.png).
- Causa: breakpoint até 420 px reservava 154 px para o minimapa, embora a caixa medida tivesse 184 px de altura.
- Correção local: alinhei `--city-mobile-minimap-height` à caixa medida; a regra existente passa a manter a barra acima do minimapa sem esconder nenhum controle.
- Verificação: `FENIX_QA_CHROMIUM_PATH='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' node --test test/city-overlay-layout.test.js` — 9/9 passaram. O teste mediu minimapa, barra de modos e HUD nas quatro larguras; a captura mostra o estado local sem sessão autenticada e com aviso de runtime indisponível.
- Limite: nenhuma publicação foi feita; sessão autenticada e CSS servido pela VPS permanecem pendentes.

### UI-083 — A camada HIG usava azul estranho à identidade do Fênix

- Prioridade: `P2` · Estado: `VERIFIED` local · Áreas: topbar/KPIs, seleção da navegação, Cidade, chat e foco do teclado.
- Evidência: `fenix-hig-system.css` definia o accent Apple blue `#0a84ff` e repetia esse tom em estados ativos, foco, balões do chat e indicadores de rolagem. Isso conflitava com a identidade ciano/verde já usada pelo Fênix.
- Correção local: unifiquei o accent de interação em ciano Fênix (`#22d3ee`), usei teal escuro para mensagens do operador e verde para enviar, mantendo as superfícies neutras e as distinções semânticas.
- Verificação: `node --test test/topbar-hig.test.js` com Edge — 2/2 passaram; valida a token e a seleção ativa renderizada em 375/768/1280/1920 px. Captura: [fenix-hig-brand-accent-1280-after.png](visual-evidence/2026-10-21/fenix-hig-brand-accent-1280-after.png).
- Limite: captura usa fixture local com runtime indisponível; a versão publicada e o contraste da interface autenticada na VPS continuam pendentes.

### UI-084 — Perfis de avatar gerados não eram traduzidos pelos renderers da Cidade

- Prioridade: `P1` · Estado: `FIXED` local, aguardando verificação visual · Rotas: `#city` → Cidade 2D/3D e Inspector de agente.
- Evidência/reprodução: `AgentAvatarRegistry` entrega `avatar.appearance` aninhado (`colorProfile`, `bodyType`, `hair`, `clothing`, `accessory`), enquanto os renderers consultavam somente campos achatados. O teste de regressão falhava com `role-derived` em vez de `registry-avatar`; a captura fornecida pelo usuário mostra agentes visualmente genéricos e o painel de agente aberto.
- Correção local: normalizei paleta, cabelo, roupa, acessório e escala do perfil registrado para o renderer 3D; conectei essa tradução ao perfil do mapa 2D e converti os tokens de pele/cabelo do editor para as cores usadas pelo sprite. A identidade ZAI mantém os defaults Fênix; indicadores de atividade continuam separados do avatar.
- Verificação: `node --test grg/test/city-agent-visual-profile.test.js grg/test/agent-avatar-registry.test.js` — 14/14 passaram; o novo teste confirmou o contrato usando um perfil real criado pelo registry. Cache dos scripts atualizado.
- Critério de fechamento: abrir a mesma identidade em mapa 2D, 3D e Inspector com sessão autenticada; confirmar paleta, roupa/acessório e personalização salva após recarregar. Capturas locais/VPS e teste visual ainda pendentes.

### UI-085 — Prévia do editor de avatar diverge da Cidade 3D

- Prioridade: `P1` · Estado: `FIXED` local, validação parcial · Rota: `#city` → Inspector → Editor de Avatar.
- Evidência: o editor anterior usava `PixelAvatarRenderer.drawAvatar()` enquanto a Cidade monta personagens por `_createCyberHumanoid()` em Three.js. O Avatar Studio do ZAI fornecido como referência mostra uma prévia 2.5D ampla, categorias e controles de rotação/animação.
- Correção local: o editor agora solicita ao runtime uma prévia isolada construída pelo mesmo `_createCyberHumanoid()`, com cores/roupa/acessórios do perfil em edição, rotação, estados visuais e navegação por categoria. A cena temporária usa mapa/material compartilhado apenas para leitura, não registra nem move agentes reais e descarta renderer/recursos ao fechar. Se WebGL não puder ser criado, o editor informa a limitação e mantém o preview 2D disponível. As alterações do perfil só chegam ao runtime após salvar com sucesso.
- Evolução nesta rodada: opção de porte `compacto`, `padrão` ou `alto` agora é validada e persistida pelo endpoint de perfil, aparece na prévia compartilhada e altera a escala visual do mesmo avatar na Cidade após salvar. O contrato rejeita outros valores; enquadramento fixo mantém a diferença visível na prévia.
- Correção de acesso: o Inspector da Cidade 3D agora oferece “Personalizar avatar” e abre o editor compartilhado. Antes, o editor só estava definido no motor 2D, enquanto a Cidade ativa era `FenixWorld3DEngine`.
- Evidência local (2026-10-21): `grg/docs/visual-evidence/2026-10-21/avatar-studio-custom-{375,768,1280,1920}.png`; o modal foi aberto com agente real carregado no runtime e sem salvar alterações. Capturas compacta/alta em 1280 px demonstram mudança de escala sem recorte do avatar.
- Verificação automatizada nesta rodada: 25/25 testes passaram em avatar, perfil autenticado e catálogo/Screen DNA, incluindo Playwright em 375, 768, 1280 e 1920 px para o Project Hub; `node --check` e `git diff --check` dos arquivos tocados passaram.
- Limite: capturas do Studio em quatro larguras foram inspecionadas; login/auth persistente, salvamento seguido de reload e fallback real sem WebGL ainda não foram comprovados. O backend local está em memória; a VPS não recebeu esta alteração. Não classificar como `VERIFIED` até os fluxos autenticados e persistentes serem demonstrados.

### UI-086 — Project Hub ocultava portas e versão do catálogo de projetos

- Prioridade: `P1` · Estado: `FIXED` local, sincronização VPS pendente · Rota: `#projects` → catálogo local → detalhe do projeto.
- Evidência/reprodução: `C:\Users\Dell\Desktop\PROJETOS\projetos.json` tem 41 entradas; cada uma cadastra caminho, modo e, em vários casos, portas e URL. O Project Hub recebia caminhos/URLs, mas descartava `localPort`, `apiPort`, `healthUrl` e versão. Além disso, UI e API não distinguiam porta declarada de listener ativo.
- Correção: o catálogo local agora preserva portas validadas, modo, health URLs e versão do `package.json` quando existe. O painel “Portas e versões do projeto” exibe pasta/versão/URLs e declara que a disponibilidade não foi verificada; nenhum processo é iniciado pelo catálogo.
- Verificação: `node --test grg/test/local-project-catalog-integration.test.js grg/test/local-project-catalog-ui.test.js` — 5/5 passaram. O teste visual verificou a seção em 375, 768, 1280 e 1920 px e gerou `grg/docs/visual-evidence/2026-10-21/project-runtime-{375,768,1280,1920}-after.png`.
- Limite: a versão atualmente exibida é a versão declarada no catálogo ou no `package.json`, não um commit Git. A instalação da VPS não consegue ler o disco Windows `C:`; a sincronização segura dos workspaces para a VPS e a medição dos serviços remotos continuam pendentes.

### VPS-001 — Subdomínio do Fênix apontava para uma porta sem listener

- Prioridade: `P1` · Estado: `FIXED` · Host: `fenix.209-50-241-22.sslip.io`.
- Evidência/reprodução: OpenResty enviava `/` a `172.17.0.1:4400`; `ss -ltnp` não mostrava listener na porta `4400`, enquanto o gateway Fênix respondia em `:3000`. O subdomínio retornava HTTP 502.
- Correção: upstream alterado para `127.0.0.1:3000`; OpenResty passou `-t` e foi recarregado sem reiniciar processos de aplicação.
- Verificação: requisição HTTPS ao subdomínio retornou HTTP 200 em 2026-10-21; arquivo anterior preservado em `/root/codex-grg-routing-20261021/10_grg_fenix.pre-upstream-switch.conf`.
- Verificação adicional (2026-10-21): a raiz HTTPS também encaminha ao gateway Fênix e retornou HTTP 200 com `X-GRG-Route: fenix-os`.
- Limite: HTTP 200 comprova roteamento, não autenticação nem conclusão dos fluxos da aplicação.

### VPS-002 — Raiz pública ainda abria o ZapAI

- Prioridade: `P1` · Estado: `FIXED` (roteamento), validação autenticada pendente · Hosts: `https://209.50.241.22/` e `https://209.50.241.22:1000/`.
- Evidência/reprodução original: a raiz servia `ZAI — Plataforma Inteligente de Atendimento`, mantendo o Fênix somente em `:3000`.
- Correção aplicada: OpenResty agora envia a raiz ao gateway Fênix e mantém ZapAI em HTTPS `:1000`; firewall e CORS foram ajustados. Backups: `/root/codex-grg-routing-20261021/root-switch`.
- Verificação externa (2026-10-21): raiz HTTP 200, título `GRG Serviços — Login`, `X-GRG-Route: fenix-os`; ZapAI `:1000` HTTP 200, título `ZAI — Plataforma Inteligente de Atendimento`; `/health`: status, banco e WhatsApp online. Processo ZapAI permaneceu com o mesmo PID durante a observação e exibiu mais de quatro minutos de tempo ativo.
- Pendente: login interativo e fluxo autenticado de conversa na porta `:1000` não foram exercitados no navegador nesta rodada; HTTP 200 e health não provam esses fluxos.
- Fechamento completo: validar login, sessão, conversa e reconexão do WhatsApp após a mudança, além da permanência do processo sem novos reinícios.

### UI-087 — Health do Project Hub inferia 100% a partir do status cadastrado

- Prioridade: `P1` · Estado: `FIXED` local, publicação VPS pendente · Rota: `#projects` → projeto registrado.
- Reprodução: projetos com `status: ACTIVE` ou `READY` sem verificação de runtime eram exibidos como `100% (Operacional)`.
- Causa: a apresentação convertia status cadastral em métrica de saúde, sem timestamp, fonte nem probe.
- Correção local: health só aparece como percentual quando existe medida numérica com `healthMeasuredAt` e `healthSource`; caso contrário, exibe `Não medido`. Projetos registrados agora mostram portas, paths e nome PM2 cadastrados em “Runtime cadastrado”, com aviso visível de que listener e health não foram verificados.
- Verificação: `node --test grg/test/local-project-catalog-ui.test.js` passou; fixture Fênix confirmou UI `3000`, API `4410`, PM2 `fenix-backend` e ausência de 100% inferido. O mesmo teste valida Screen DNA/Project Hub em 375, 768, 1280 e 1920 px.
- Limite: a tela expõe configuração declarada; o estado vivo de cada listener, versão implantada e health individual ainda exige medição autenticada de runtime. Alteração não publicada na VPS.

### UI-088 — Traje casual não tinha aparência própria no avatar 3D

- Prioridade: `P2` · Estado: `FIXED` local, publicação VPS pendente · Área: Avatar Studio / Cidade 3D.
- Reprodução: no editor de avatar, selecionar “CASUAL” e comparar a prévia com “TRAJE” ou “CYBER”; o valor era aceito e salvo, mas o gerador 3D não tinha uma ramificação para esse traje.
- Causa: `casual` estava na lista permitida e no seletor, mas `_createAvatarOutfitDetails` só desenhava detalhes para suit, hoodie, labcoat, armor e cyber.
- Correção local: o traje casual agora recebe painéis laterais e bolso contrastante no mesmo gerador de geometria compartilhado pela Cidade e pela prévia 3D do editor.
- Verificação: teste de regressão confirma geometria específica para `casual` e que a prévia usa o mesmo construtor; a suíte de avatares, perfil autenticado e catálogo local passou 26/26. `node --check` e `git diff --check` passaram.
- Limite: teste automatizado comprova o caminho de geometria, mas ainda não há captura visual dedicada da opção casual após a correção. Código local, não publicado nem conferido na VPS.

### UI-089 — Agente aparecia trabalhando antes do worker iniciar o job

- Prioridade: `P1` · Estado: `FIXED` local, publicação VPS pendente · Área: Living City / AgentRegistry / JobEngine.
- Reprodução: associar um agente a um job `QUEUED` sem dependências e consultar `/api/v2/living-city/agents`; a API retornava `WORKING` embora o job ainda aguardasse processamento.
- Causa: a projeção do Living City convertia qualquer job `QUEUED` sem dependências para `WORKING`, juntando fila e execução em um só estado.
- Correção local: a API preserva `QUEUED` (e `WAITING_DEPENDENCY` quando há dependências), aceita `QUEUED` no endpoint de lifecycle e a Cidade apresenta estados com texto e cor distintos no avatar e minimapa. `WORKING` continua reservado para job em execução.
- Verificação: testes de contrato e renderização cobrem job queued, job running, rótulo visual, lifecycle e coordenadas; suíte focada passou 15/15.
- Limite: correção local; API Platform e frontend da VPS não foram atualizados nem reiniciados. A validação de ponta a ponta na VPS permanece pendente.

### UI-090 — Destino de movimento publicado pela API não chegava à animação da Cidade

- Prioridade: `P1` · Estado: `FIXED` local, publicação VPS pendente · Área: Living City / WorldStateEngine / cena 3D.
- Reprodução: publicar `state: WALKING`, `targetCoordinates` e `path` para um agente; a API entregava o destino, mas a cena 3D só acompanhava alterações de `coordinates`.
- Causa: o sincronizador ignorava o destino canônico da projeção, e o contrato da Cidade sobrescrevia o estado locomotor com o status de execução.
- Correção local: a API agora preserva `movementState: WALKING` separado de `status`; o sincronizador converte `targetCoordinates` ou o último ponto medido do caminho para coordenadas 3D, segue o alvo sem reiniciar a trajetória em snapshots repetidos e limpa-o quando o runtime o remove. Coordenadas incompletas não viram destino estimado. Os avatares mostram “A caminho · tarefa” durante deslocamento e fazem gesto de trabalho apenas para atividade `WORKING` estacionária.
- Verificação: testes cobrem projeção do destino, separação entre status e locomoção, estabilidade da rota em snapshots repetidos, rejeição de destino incompleto, rótulos e gesto apenas durante execução. Suíte focada nesta fatia: 18/18.
- Limite: comportamento verificado em testes do sincronizador; captura visual do movimento e confirmação com telemetria autenticada na VPS ainda pendentes. Não publicado.

### UI-091 — Avatar Studio não oferecia estilos-base rápidos para personalização

- Prioridade: `P2` · Estado: `FIXED` local, validação visual/VPS pendente · Área: Avatar Studio / agentes ZAI.
- Evidência: o editor compartilhava o modelo 3D da Cidade e expunha campos individuais, mas não tinha estilos-base inspirados no ZAI Avatar Studio; montar um perfil completo exigia alterar cada controle manualmente.
- Correção local: quatro presets editáveis (ZAI, Operações, Criação e Pesquisa) agora preenchem o rascunho e sincronizam roupa, paleta, porte, cabelo, acessórios e insígnia com a prévia 3D. As alterações só persistem após “Salvar Avatar”; o usuário pode ajustar qualquer campo depois de aplicar um preset.
- Verificação: `node --test --test-reporter=dot test/city-agent-visual-profile.test.js test/agent-avatar-registry.test.js` — 21 testes passaram; inclui contrato dos presets e regressões de perfil/registro. `node --check` dos scripts e `git diff --check` passaram.
- Limite: interação manual/capturas responsivas e aplicação autenticada seguida de reload ainda não foram validadas nesta rodada; código local não publicado na VPS.
- Auditoria VPS (2026-10-21): /city-agent-visual-profile.js e /avatar-studio-presets.js retornam 404; o fenix-world-3d.js e o iso-city.js públicos não incluem a prévia compartilhada. Os bundles divergem do checkout em 763 e 253 linhas, respectivamente. As rotas /api/v2/agents e /api/v2/agents/agent-zai/profile respondem 401 sem sessão; o contrato autenticado não foi confirmado. Publicação fica pendente de compatibilidade e validação autenticada.

### UI-092 — Aba pública aberta mostra marca ZapAI enquanto a resposta atual do host é Fênix

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `https://209.50.241.22/login`.
- Evidência: a aba Chrome previamente aberta exibiu título `ZAI — Plataforma Inteligente de Atendimento` e falha de autenticação. Requisições HTTP novas a `/`, `/login` e `/app` no mesmo host retornaram 200 e `X-GRG-Route: fenix-os`, com títulos Fênix. `:1000` HTTPS continua sendo a rota ZapAI documentada.
- Passos para reproduzir: comparar a aba já aberta em `/login` com uma requisição nova ao mesmo URL; antes de limpar cache, confirmar em janela/sessão limpa e após recarregar.
- Hipótese: estado de aba/cache antigo ou diferença de resposta no navegador; causa não confirmada. A automação de nova aba expirou e não houve limpeza de cache nem alteração de rota.
- Critério de fechamento: nova sessão no navegador mostra Fênix na raiz/login e aplicação autenticada Fênix após login; ZapAI continua isolado em `:1000`; capturas e cabeçalho de rota confirmam ambos.
- Limite: o teste de nova sessão e autenticação permanece pendente; nenhum dado de acesso foi consultado ou alterado.

### UI-093 — Project Hub mantinha o shell aberto quando a API recusava uma sessão expirada

- Prioridade: `P1` · Estado: `FIXED` publicado; expiração real ainda não verificada · Rota: `/app#projects`.
- Evidência/reprodução: abrir o app sem sessão e deixar `/api/fenix/projects` responder 401; o Project Hub mostrava “Catálogo indisponível” dentro do shell. No PC, `/api/fenix/projects`, `/api/fenix/github/account` e `/api/v2/living-city/agents` sem sessão retornaram 401.
- Causa: o Project Hub fazia `fetch` próprio e ignorava o fluxo canônico do Fênix para renovar e validar a sessão antes de redirecionar ao login.
- Correção local: consultas agora usam `window.FENIX.api` quando disponível, preservando o fallback legado. O cliente central tenta refresh; se a sessão for confirmada expirada, encaminha para `/GRG-login` e mantém a hash como rota de retorno.
- Verificação: Playwright reproduziu 401 + sessão inválida e confirmou redirecionamento ao login. `node --test --test-reporter=dot test/project-hub-unavailable-state.test.js test/local-project-catalog-integration.test.js test/local-project-catalog-ui.test.js` — 7 testes passaram; `test/auth-session-redirect.test.js` também passou 1/1. `node --check` e `git diff --check` passaram.
- Limite: corrigido e testado no checkout local; Fênix local `:4400` deixou de responder durante a checagem e a alteração ainda não foi implantada na VPS.
- Atualização 2026-10-21: patch mínimo publicado no diretório realmente servido pela VPS como `20261021-projecthub-auth-2`. A sessão autenticada carregou 7 projetos e 5 workspaces. Backups pré-alteração em `/home/deploy/grg-projecthub-auth-20261021-01/active-public/`; hashes-base `project-hub-live.js` `9ea8175bc6b953f6b5dc8e7dc784c83a1663fce870c2c91f7296629c7527cfbf`, `index.html` `9394ed11de70d3dcbf7a2a7b458800a454d9a004761b560108d78fdbdd580642`. A versão ativa também inclui a correção da gaveta (`20261021-mobile-drawer-2`). A sessão autenticada abriu 7 projetos e 5 workspaces. O cenário de sessão expirada não foi reproduzido em produção; essa verificação permanece pendente.

### UI-094 — Chat da sidebar cobria a Cidade em viewport estreito

- Prioridade: `P1` · Estado: `FIXED`, verificado em produção em 375, 758, 768, 1280 e 1920 px · Rota: `/app#city` com sidebar aberta.
- Evidência/reprodução: em viewport 758×1156 a área da Cidade media 758 px e a sidebar fixa ocupava x=430..750, cobrindo 320 px da cena. Em celulares, a navegação passa a uma faixa horizontal no topo; reservar uma coluna lateral fixa deixava um vão desnecessário.
- Causa: o breakpoint estreito mantinha o chat como painel lateral em altura total sobre a cena; o layout de celular tinha um tipo de navegação diferente do tablet.
- Correção: em larguras até 760 px, a sidebar normal abre como gaveta inferior com 58dvh e deixa a navegação descoberta (left 76 px); até 600 px úteis, a navegação horizontal permite usar quase toda a largura (left 8 px). O modo expandido continua ocupando a tela. Cache-buster final `20261021-mobile-drawer-2`.
- Verificação: RED antes da implementação. `node --test test/city-sidebar-drawer.test.js test/city-agent-visual-profile.test.js test/shell-startup-responsive.test.js test/city-world3d-agent-fallback.test.js` — 26/26 passaram. Medições do DOM autenticado na VPS: 375×813 gaveta x=8,y=303,359×471 e navegação y=64..118; 758×1156 x=76,y=558,674×560; 768×1024, 1280×801 e 1920×1080 sem interseção entre área 3D e sidebar. Console sem erros após reload.
- Limite: screenshots visuais foram conferidas em 375 e 758 px; em 768, 1280 e 1920 o aceite desta fatia foi medido por geometria DOM, sem análise estética completa. Backup anterior à versão v2 em `/home/deploy/grg-projecthub-auth-20261021-01/mobile-drawer-small/`.
### UI-095 — Cidade simulava tarefas e sucessos sem job real

- Prioridade: `P1` · Estado: `FIXED` local, VPS pendente · Rota: `/api/v2/living-city/state` e Inspector.
- Reprodução autenticada (2026-10-21): 39 agentes (37 AVAILABLE, 1 WORKING, 1 COMPLETED), somente 1 vínculo de job; `agent-camila` estava AVAILABLE/sem job, mas o Inspector devolvia tarefa de standby e memórias recentes de sucesso da “Ronda preventiva”. O código servido sorteava essa ronda, aumentava `currentJob.progress` por tick, completava rotina sem job e gravava memória como sucesso.
- Correção local: removida a geração aleatória e a conclusão/progresso/memória sintéticos; movimentação medida de tarefas atribuídas foi preservada. A API agora expõe `currentTask` apenas quando ligado a um job real.
- Verificação: teste de regressão passou de RED para 9/9 em `test/living-city-agent-truth.test.js`; suíte focada de Cidade/rotas/3D passou 47/47.
- Limite: código ativo da VPS ainda contém o comportamento falso. Publicação requer identificar o processo/gerenciador do backend e preparar rollback; não reiniciei serviço.

### UI-096 — Inspector atribuía ferramentas fictícias por cargo

- Prioridade: `P1` · Estado: `FIXED` local, VPS pendente · Rota: detalhe de agente.
- Evidência: `living-city-agent-read.test.js` falhava porque agente registrado com `tools: []` recebia `task_execution` e `telemetry_monitoring`; havia ainda listas hardcoded de ferramentas para vários IDs. O detalhe autenticado de Camila também exibia uma lista que não comprovava execução.
- Correção local: `tools` agora é projetado somente do registro real; sem ferramentas registradas, o Inspector mostra lista vazia.
- Verificação: coberto pela suíte focada 47/47, incluindo o teste que falhava antes da correção.
- Limite: atualização do backend da VPS pendente de identificação segura do processo e publicação com rollback.
### UI-097 — Resetar câmera deixa o canvas 3D branco na sessão autenticada

- Prioridade: `P1` · Estado: `FIXED` no checkout; verificação visual na VPS pendente · Rota: `/app#city`, Chrome autenticado, 1745×808.
- Evidência: antes do clique, Cidade WebGL renderizava terreno e prédios. Clicar `#btnResetCamera` (title “Resetar Câmera”) removeu terreno/prédios e manteve rótulos, minimapa e HUD. Recarregar a mesma rota não recuperou a cena; `#cityCanvas3D` e os controles permaneceram presentes.
- Passos: abrir a Cidade em sessão autenticada, registrar a cena inicial, clicar Resetar Câmera, comparar canvas e recarregar a rota.
- Causa do defeito local: no bundle público atual, `resetCamera()` só aplicava a câmera imediatamente em headless; em navegador normal deixava `target`/`distance` interpolados e andares internos ocultos. Isso permitia que o estado renderizado divergisse do alvo de reset. A instância remota não expõe dados suficientes para provar que este é o único gatilho da tela branca observada.
- Correção local: reset sincroniza posição e alvo da câmera, cancela follow, limpa seleção e estado de andares/cutaway, atualiza rótulos, renderiza um frame e salva a preferência.
- Verificação local: `test/world-camera-reset.test.js` falhava antes e passou após a correção; `test/world-camera.test.js` passou 5/5. O Edge local não conseguiu inicializar WebGL de software; teste visual 3D e confirmação na VPS permanecem pendentes.
- Teste de fechamento: resetar câmera repetidamente sem perder geometria, texturas, agentes ou seleção; após refresh, cena continua renderizando; verificar erros WebGL/console e capturas antes/depois.
- Limite: reproduzido em VPS, sem alteração remota. O bundle servido (`/fenix-world-3d.js?v=20261020-city-cookie-world-1`) não contém a correção; implantação e confirmação visual dependem de identificar o processo e validar rollback.

### UI-098 — Modal “Aguardando aprovação” aparece com título numérico sem tarefa

- Prioridade: `P1` · Estado: `FIXED` no checkout; validação visual/API na VPS pendente · Rota: `/app#city`, Chrome autenticado, 1745×808.
- Evidência: árvore de acessibilidade após reload continha `fnxTaskModalTitle` com valor `3`, “Agente Responsável: ESPECIALISTA”, cronômetro não iniciado, sem descrição/ID de tarefa, mas com botões Rejeitar e Aprovar & Executar.
- Passos: abrir a Cidade na sessão autenticada e inspecionar o modal e a origem do evento que o abriu; repetir em sessão limpa para confirmar persistência.
- Causa observada no bundle público: a guarda existente exigia ID/texto não vazio e estado de aprovação, mas aceitava título numérico e não exibia o ID no modal; o JavaScript público consultado continuava sem esses dois critérios.
- Correção local: títulos e objetivos exigem texto legível; título idêntico ao ID é rejeitado; modal mostra o ID real usado pelas ações de aprovar/rejeitar, escrito via `textContent`.
- Verificação: RED antes; `test/task-modal-contract.test.js` e `test/task-modal-no-placeholder.test.js` passaram 8/8 após a correção, incluindo abertura com ID real e rejeição de título numérico, título igual ao ID, payload de teste e estados incompletos. `node --check` e `git diff --check` passaram.
- Limite: o bundle público `/fenix-task-modal.js?v=20261020` responde 200 e já não contém o antigo placeholder, mas ainda não tem título significativo nem ID visível. Correção segue local, sem ação sobre tarefas desconhecidas.

### UI-099 — Registro VPS confundia as portas do frontend e API do ZapAI e omitia Gerar Ficha

- Prioridade: `P1` · Estado: `FIXED` local, VPS pendente · Área: Project Hub / mapa de projetos.
- Evidência: inventário SSH e HTTP em 2026-10-21T14:35Z mostrou ZapAI frontend HTTPS em `:1000`, API em `:4025`, e Gerar Ficha atendendo `:8000` com `gerar-ficha.service`; catálogo canônico anterior declarava ZapAI frontend em `:4025` e não cadastrava Gerar Ficha.
- Correção local: ajustados bindings de Fênix, ZapAI e API Platform; incluído Gerar Ficha com status `DISCOVERED`, serviço systemd e link `/docs` explicitamente tratado como documentação, sem inventar health check. Project Hub distingue bindings auditados de portas locais e exibe timestamp/resultado e aviso de leitura pontual.
- Verificação: 14/14 testes de registro, Project Hub, catálogo e assets passaram. Capturas responsivas em 375, 768, 1280 e 1920 px.
- Limite: correção não publicada; processo da porta 3000 e rollback ativo ainda não identificados com segurança. Nenhuma porta foi alterada.

### UI-100 — Avatares sem coordenadas reais apareciam sem proveniência

- Prioridade: `P1` · Estado: `FIXED` local, VPS pendente · Rota: Cidade 3D e Inspector.
- Evidência: o sincronizador calcula posição estável por distrito quando API não fornece `coordinates`; o registro do avatar e o balão não distinguiam cálculo de medição.
- Correção local: cada agente recebe `coordinateSource` (`MEASURED` ou `ESTIMATED`). Posições estimadas mostram “Posição estimada” no balão e no Inspector; origem medida é identificada separadamente. A regra trata coordenadas zeradas de agente associado a outro distrito como estimadas, preservando origem explícita no HQ.
- Verificação: teste RED antes; `test/city-world3d-agent-coordinates.test.js`, `test/city-agent-visual-profile.test.js`, `test/city-world3d-agent-fallback.test.js`, `test/city-world3d-sync-reconciliation.test.js`, `test/city-project-inspector-flow.test.js` e `test/screen-shell-assets.test.js` — 51/51 passaram.
- Limite: checkout local; bundle de produção antigo. Não criei coordenadas nem tarefas no backend.

### UI-101 — Preset de Operações usava um estilo de cabelo incompatível com o modelo 3D

- Prioridade: `P2` · Estado: `FIXED` local, validação visual na Cidade pendente · Área: Avatar Studio / preview 3D compartilhado.
- Evidência: `avatar-studio-presets.js` enviava `hairStyle: "short"`, enquanto o modelo 3D aceita `buzz` como cabelo curto; ao aplicar Operações o seletor podia ficar sem opção correspondente.
- Correção local: preset usa `buzz`; categorias agora identificam seção atual e amostras de pele/cabelo são botões com rótulo e estado selecionado acessíveis por teclado.
- Verificação: `test/city-agent-visual-profile.test.js` passou 23/23; `node --check` e `git diff --check` passaram.
- Critério de fechamento: aplicar o preset em uma sessão visual, confirmar cabelo curto na prévia 3D e após salvar/recarregar o agente na Cidade; percorrer categorias e paletas com teclado.
- Limite: alteração somente no checkout local; a VPS ainda serve outro bundle e não foi atualizada.

### UI-102 — Porte do avatar alterava escala, mas não a silhueta

- Prioridade: `P2` · Estado: `FIXED` local, validação autenticada/VPS pendentes · Área: Avatar Studio / Cidade 3D.
- Evidência: “COMPACTO”, “PADRÃO” e “ALTO” eram persistidos e alteravam apenas a escala uniforme; largura e proporções permaneciam idênticas na prévia e na Cidade.
- Correção local: o perfil visual propaga `bodyType` ao construtor compartilhado. Compacto recebe silhueta ligeiramente mais larga; alto, mais estreita; a escala calibrada continua preservada. A prévia do editor usa o mesmo construtor e herda a alteração.
- Verificação local: teste RED reproduziu ausência de `bodyType`; GREEN com seis suítes focadas passou 52/52. `node --check` e `git diff --check` passaram. Capturas da prévia real Three.js r152 mostram as variantes `compact`, `standard` e `tall` em `docs/visual-evidence/2026-10-21/avatar-body-{compact,standard,tall}.png`.
- Critério restante: salvar um perfil autenticado, recarregar a Cidade e confirmar a mesma silhueta no agente, nas dimensões responsivas previstas.
- Limite: a validação usa o construtor e WebGL reais num fixture local; não comprova persistência via API, visual na Cidade autenticada ou comportamento da versão VPS. Bundles da VPS continuam divergentes do checkout.

### UI-103 — Inspector mostrava motivo de missão inconsistente com o ciclo real

- Prioridade: `P1` · Estado: `FIXED` local, VPS pendente · Rota: ciclo de vida do agente / Inspector.
- Evidência: o teste de lifecycle esperava objetivo em agente recém-criado, embora não houvesse missão; a atribuição real também não propagava `parentGoal` ao snapshot normalizado. A conclusão via `WorldStateEngine` limpava tarefa, mas deixava `missionId` e objetivo no estado do agente.
- Correção local: missão atribuída persiste objetivo no `WorldCommandEngine` e snapshot; missão concluída limpa objetivo e ID tanto pelo comando quanto pela rota de mutação do `WorldStateEngine`. O Inspector agora representa agente ocioso com objetivo nulo, missão ativa com objetivo/ID reais e conclusão sem metadados residuais. O teste do planner usa estado isolado para evitar depender de agentes carregados pelo runtime.
- Verificação: `test/world-runtime-activation.test.js` passou 4/4; `test/city-agent-visual-profile.test.js` e `test/world-scale.test.js` passaram 29/29; verificações `node --check` e `git diff --check` passaram.
- Critério restante: validar atribuição e conclusão em sessão autenticada na Cidade publicada e conferir a atualização do Inspector após eventos ao vivo.
- Limite: somente checkout local; nenhuma missão real foi criada na VPS e os bundles publicados seguem divergentes.

### UI-104 — Cidade sobrecarrega o navegador com leituras concorrentes e renderização 3D custosa

- Prioridade: `P1` · Estado: `FIXED` no checkout; hotfix de GPU publicado; validação de desempenho ainda pendente · Rota: `/app#city`.
- Evidência: auditoria do código encontrou polling de agentes a cada 3 s em `iso-city.js`, atualização adicional por múltiplos eventos e leituras independentes pelo 3D e pelo painel inferior. O painel inferior ainda fazia seu próprio GET de `/api/v2/living-city/state`. WebGL também preservava o buffer de desenho, usava pixel ratio até 2 e sombras dinâmicas em dispositivos pequenos.
- Correção local: removido o polling concorrente da Cidade 2D; painel inferior agora consome o snapshot canônico e deduplica refreshes simultâneos; o renderer reduz pixel ratio para no máximo 1,5, usa prioridade gráfica econômica, desliga sombras em dispositivos compactos/de poucos núcleos e limita a simulação a 30 FPS nesses dispositivos.
- Reprodução/verificação: `test/frontend-polling-load.test.js`, `test/city-runtime-performance.test.js`, `test/city-first-paint.test.js` e `test/city-mode-initialization.test.js` passaram 9/9. A falha de contrato do painel (leitura duplicada de estado) foi reproduzida antes da correção.
- Critério de fechamento: contar requisições e long tasks numa sessão autenticada em 375/768/1280/1920 px com chat aberto e provar que não há polling duplicado, travamento ou perda de atualização ao vivo.
- Hotfix VPS (2026-10-21): aplicado sobre o bundle remoto byte a byte, com backup e SHA-256 verificado antes da edição. `preserveDrawingBuffer=false`, pixel ratio limitado a 1.5 e renderização compacta limitada a 30 FPS, com sombras dinâmicas desligadas em viewport compacto/dispositivo de até 4 núcleos. O `index.html` aponta para versão nova do script; navegador autenticado carregou essa URL e mostrou a Cidade com 39 agentes/9 prédios após reload. Testes do checkout `city-runtime-performance` e `frontend-polling-load` passaram 7/7.
- Limite: o reload excedeu o timeout de 20 s do observador, embora a página tenha renderizado; em 60 s de observação ela permaneceu em `#city` sem erros de console, salvo aviso de depreciação do Three.js. Falta medir 5 min, FPS/long tasks e confirmar o efeito em viewport compacto; processo proprietário da porta ainda não identificado. Não declarar o lag integralmente resolvido.

### UI-105 — Canvas e Inspector da Cidade ocupavam espaço desproporcional e cobriam controles

- Prioridade: `P1` · Estado: `FIXED` local e `REPRODUCED`/corrigido em navegador de QA; VPS pendente · Área: composição responsiva da Cidade.
- Evidência: regras antigas definiam `min-height` de 440/480 px e altura baseada na janela para o canvas; no Inspector aberto a 375 px, o painel intersectava minimapa e órbita de providers. A suíte visual reproduziu essa colisão antes da correção.
- Correção local: camada final de composição limita o canvas ao espaço flexível do shell, remove altura mínima fixa, limita painéis à largura/altura disponíveis e recolhe minimapa/órbita enquanto o Inspector de agente está aberto; fechar o Inspector restaura os controles.
- Verificação: `test/city-runtime-performance.test.js` mediu canvas/painel em 375, 768, 1280 e 1920 px; após reproduzir e corrigir a colisão entre Inspector, minimapa e órbita, `test/city-overlay-layout.test.js` passou 9/9.
- Critério de fechamento: registrar capturas adicionais da Cidade com sidebar e painéis em estados abertos/fechados nos quatro viewports, e repetir na versão publicada.
- Limite: validação somente no checkout local/Chromium de QA. A VPS ainda serve uma versão sem a nova folha de estilo e sem o ajuste de renderização; processo proprietário e rollback não foram identificados, portanto sem deploy.

### UI-106 — Polling de telemetria repete solicitações durante falha de autenticação

- Prioridade: `P1` · Estado: `FIXED` na VPS; medição de 5 min pendente · Rota: shell/World, desktop e mobile.
- Evidência: console capturado no navegador da VPS em 21/10/2026 mostrou avisos repetidos de `/api/v2/qwen-orchestrator/status` em intervalos de aproximadamente 6 s e de `/api/skills` a cada ciclo, após redirecionamento para `/GRG-login`. A sessão aberta já estava expirada, portanto não foi possível avaliar a carga autenticada.
- Correção local: polling Qwen agora usa intervalo de 30 s, impede chamadas sobrepostas e aplica backoff exponencial (60 s inicial para 401; até 5 min para falhas repetidas). Command Center suspende chamadas por 60 s após 401 e retoma imediatamente quando o token muda.
- Verificação: testes focados locais passaram (4/4); os arquivos implantados retornam HTTP 200 e seus SHA-256 correspondem ao staging com rollback. Browser autenticado após reload permaneceu em `#city`; console sem erros, apenas aviso de depreciação Three.js.
- Critério de fechamento: medir por ao menos 5 min em sessão autenticada e expirada, confirmar ausência de requisições concorrentes/rajadas e retomada após renovar autenticação; conferir CPU, long tasks e console.
- Limite: deploy estático verificado, mas ainda falta medir por 5 min, CPU/long tasks e retomada após renovação do token.

### UI-107 — Controles da Cidade excedem o espaço em viewports estreitos

- Prioridade: `P1` · Estado: `FIXED` na VPS; auditoria responsiva completa pendente · Área: Cidade / canvas, minimapa e HUD.
- Evidência: captura fornecida pelo operador em viewport de aproximadamente 375 px mostra inspector, minimapa e HUD comprimidos sobre o mapa, com controles da base parcialmente fora da área visível. O login expirado impediu conferir o mesmo estado na sessão ao vivo.
- Correção local: camada de composição limita o canvas e os painéis ao viewport disponível, aplica limites consistentes de largura ao minimapa e HUD e evita altura máxima negativa no Inspector em telas baixas.
- Verificação: `test/city-runtime-performance.test.js` mede canvas e Inspector em 375, 768, 1280 e 1920 px; passou. CSS foi servido com HTTP 200, carregou na sessão autenticada e o mapa computou `overflow:hidden` após reload.
- Critério de fechamento: capturar estados autenticados com Inspector, chat e painéis abertos/fechados nos quatro viewports e validar toque/teclado e acesso aos controles recolhidos.
- Limite: falta capturar e validar interações em todos os viewports na versão publicada.

### UI-108 — A Cidade 3D consome ciclos de renderização em segundo plano e pesa em janela dividida

- Prioridade: `P1` · Estado: `FIXED` no bundle servido; validação de fluidez autenticada pendente · Área: Cidade / desempenho no Codex.
- Evidência: o `command-center.js` carregado globalmente mantinha um `requestAnimationFrame` recursivo em todas as rotas e gravava intervalos de quadro em um KPI oculto como se fossem latência/CPU. O perfil econômico da Cidade só era ativado até 768 px ou em máquinas com até 4 núcleos. A inspeção DOM da Cidade no navegador do Codex excedeu o limite de 30 s, enquanto o Project Hub respondeu; isso aponta para bloqueio/carga na rota, mas não mede FPS nem prova sozinho a causa.
- Correção: removido o loop de telemetria falsa; o perfil econômico agora inclui viewports até 1280 px (com sombras dinâmicas desligadas) e limita o pixel ratio do canvas principal a 1,25, inclusive após resize.
- Verificação: 17 testes focados passaram; `node --check` e `git diff --check` passaram. Em 21/10/2026, os bundles e o shell retornaram HTTP 200; os hashes servidos corresponderam aos arquivos de staging. Nenhum processo foi reiniciado. Backup dos arquivos anteriores em `/home/deploy/grg-space-rollback/2026-10-21T1630/codex-split-profile/`.
- Critério de fechamento: observar uma sessão autenticada da Cidade por 5 min em 375, 768, 1280 e 1920 px; registrar FPS, long tasks, CPU e erros de console; confirmar que navegação, chat e painéis respondem sem recargas inesperadas.
- Limite: a aba do Codex não concluiu a validação interativa por timeout/expiração de sessão; melhoria percebida de velocidade ainda não está certificada.

### UI-109 — Project Hub remoto não consegue abrir os projetos do catálogo Windows

- Prioridade: `P1` · Estado: `REPRODUCED` · Área: Projetos / IDE / workspace local.
- Evidência: `C:\Users\Dell\Desktop\PROJETOS\projetos.json` lista 41 projetos e, nesta máquina, os 41 caminhos existem. Os caminhos referenciam diretórios Windows distribuídos pelo disco. O Project Hub servido pela VPS mostra 7 registros do Project Kernel. O leitor local usa `os.homedir()` ou `FENIX_LOCAL_PROJECT_CATALOG`, e as rotas `/api/fenix/projects/:id/tree|file` leem/gravam no filesystem do processo Linux da VPS; um caminho `C:\...` não existe ali.
- Sintoma: a tela de Projetos não consegue abrir/ler a pasta local `PROJETOS` nem os workspaces dos projetos desta máquina quando a UI está servida pela VPS. Portas locais listadas no JSON são metadados de desenvolvimento, não serviços publicados.
- Correção ainda não escolhida: o acesso direto pelo navegador pode manter os arquivos no PC, mas requer HTTPS, permissão explícita do navegador e seleção de cada workspace. Um agente local autenticado permitiria ações remotas sobre pastas selecionadas, mas amplia a fronteira de acesso. Não transmitir o catálogo completo ou criar acesso amplo ao filesystem sem confirmar o escopo.
- Critério de fechamento: abrir o catálogo e um workspace real no Project Hub servido por `https://209.50.241.22/app`; listar pastas/arquivos, visualizar fonte na IDE e demonstrar leitura/escrita autorizada com escopo explícito, sem caminho falso nem conteúdo enviado sem consentimento.
- Próximo passo: escolher o modelo de acesso local antes de implementar a ponte; depois adicionar verificação de origem, permissão, paths, diff e testes no navegador.

### UI-110 — O painel de Command consulta o runtime mesmo fora da rota ativa

- Prioridade: `P1` · Estado: `FIXED` na VPS; validação comportamental autenticada pendente · Área: frontend / polling.
- Evidência: bundle servido carregava o resumo do cockpit ao iniciar qualquer rota e mantinha consulta recorrente de 8 s; isso gerava tráfego e atualizações fora de `#command`.
- Correção: atualização inicial e periódica agora só ocorre quando Command está visível/ativo; refreshs simultâneos são unidos e o intervalo passou a 30 s. Navegação para Command solicita atualização pelo mesmo gate.
- Verificação: `fenix-core-controller.js` SHA-256 `6e4834f48ffd9cb5fde2920f217f3b6d9f725cfc6d0985338381850aa2927d14`; shell referencia URL versionada e os assets respondem HTTP 200. Teste focado de polling passou.
- Critério de fechamento: medir por 5 min em sessão autenticada e comparar quantidade de requests fora de Command, navegação e erros do console.

### UI-111 — O grafo Brain continua renderizando escondido e percorre memória sem limite

- Prioridade: `P1` · Estado: `FIXED` na VPS; validação de CPU/fluidez autenticada pendente · Área: memória / canvas / desempenho.
- Evidência: o grafo mantinha `requestAnimationFrame` após sair da tela e iterava todas as memórias retornadas, com custo quadrático nas relações.
- Correção: limita o desenho a uma amostra de até 120 memórias, limita relações por item, informa `X/Y` exibido e pausa o loop quando a página ou canvas está oculto; listeners e frame anterior são limpos ao remontar.
- Verificação: `fenix-operational-os.js` SHA-256 `c48a3bc16d7f4cb16ac70c12a9e23cf752e65768785549b02f248a7ddbbc87b5`; URL versionada no shell, HTTP 200, teste de ciclo de vida passou e `node --check` passou.
- Critério de fechamento: abrir Brain, navegar para fora e retornar em sessão autenticada; medir long tasks/CPU e confirmar pausa e retomada sem listeners duplicados.

### UI-112 — Renderização contínua 3D mantém carga quando a Cidade está parada

- Prioridade: `P1` · Estado: `FIXED` no bundle publicado; certificação longa de fluidez pendente · Área: Cidade / desempenho no Codex.
- Evidência: sessão Chrome autenticada em `http://209.50.241.22:3000/app#city` mostra Cidade 3D ativa e 39 agentes. O runtime reportou RAM entre 89–93% e disco 94%; comandos de inspeção do navegador para o renderer expiraram repetidamente. No checkout, `_animate` renderizava em cada `requestAnimationFrame` (~60 FPS) em desktop mesmo sem interação; o HUD do pool consultava `/api/v2/agents/pool` a cada 4 s em todas as rotas.
- Correção no checkout: orçamento de 30 FPS no desktop, 24 FPS em telas compactas/até quatro núcleos e 10 FPS em headless; delta da simulação limitado após suspensão; minimapa redesenhado no máximo a cada 250 ms. Atualizações do Command Center e scanner de estados são restritos à rota visível. A mudança local de polling do pool é acompanhada separadamente em UI-114.
- Correção publicada: `_animate` limita a 30 FPS desktop/24 compacto/10 headless, limita delta a 50 ms e atualiza o minimapa a cada 250 ms. O Command Center não atualiza os painéis nem o fluxo de atividade fora da rota visível. O HUD de pool da VPS continua fora deste patch, pois é de propriedade `root`.
- Verificação: 35 testes focados de runtime/Cidade/performance/polling passaram; `node --check` e `git diff --check` passaram. Em 21/10/2026, os assets publicados retornaram HTTP 200 com hashes iguais aos arquivos preparados. Reload autenticado manteve `#city`, canvas ativo, 30 agentes e 9 prédios medidos; leitura pontual do rodapé mostrou CPU 2%, RAM 82% e status ONLINE.
- Rollback verificável: `/home/deploy/grg-space-rollback/2026-10-21T1805-city-lag-budget/` e `/home/deploy/grg-space-rollback/2026-10-21T1820-snapshot-singleflight/` preservam as versões anteriores.
- Critério de fechamento: medir sessão por 5 min em 375/768/1280/1920 px com FPS, long tasks, uso de CPU, requests/minuto e console; confirmar que a Cidade continua estável após alternar rotas e retomar de aba oculta.
- Limite: medição de 5 min e comparação controlada de quadros ainda não realizadas; disco VPS continua em 94%. Não classificar como `VERIFIED` até cumprir esse gate.

### UI-113 — Reconexão WebSocket repete snapshots e mantém registro de socket obsoleto

- Prioridade: `P1` · Estado: `FIXED` no bundle publicado; estabilidade por 5 min pendente · Área: runtime / Cidade / carregamento.
- Evidência: após reload autenticado, o console registrou avisos `[FENIX SINGLETON GUARD] Instance of 'webSocket' already registered` em intervalos crescentes e timeout em `/api/v2/company/projects/fenix-os/absorption`. `connect()` solicita um snapshot HTTP na tentativa e de novo no `onopen`; socket fechado permanecia no registro global e era encontrado na reconexão seguinte.
- Correção: snapshots agora compartilham uma requisição em andamento, usam timeout de 8 s e backoff de 5–60 s (60 s após 401). Ao fechar ou desconectar, o socket é removido do singleton e dos aliases globais se ainda forem a mesma instância.
- Verificação: regressão reproduziu chamadas duplicadas e repetição sem backoff antes da correção; depois, os testes focados passaram. Asset `/live-runtime.js?v=15-socket-cleanup-20261021` retornou HTTP 200 e hash conferido. Após reload a Cidade permaneceu em `#city`, com telemetria `ONLINE`; o console da nova sessão não mostrou erro após o reload.
- Rollback: `/home/deploy/grg-space-rollback/2026-10-21T1835-socket-cleanup/` contém o `live-runtime.js` e `index.html` anteriores, com SHA-256 verificado.
- Critério de fechamento: observar por 5 min a conexão e a telemetria, confirmando que os avisos de singleton não retornam, snapshots falhos respeitam backoff e ações normais continuam recebendo eventos.
- Limite: timeout de absorção de projeto foi observado antes da correção, mas sua causa no serviço da API não foi investigada nem resolvida nesta fatia.

### UI-114 — O HUD do pool consulta a API mesmo com o painel fechado

- Prioridade: `P2` · Estado: `REPRODUCED` na VPS; correção somente no checkout local · Área: frontend / polling / carga.
- Evidência: inspeção do bundle público `fenix-dynamic-agent-hud.js` mostrou polling de `/api/v2/agents/pool` a cada 4 s sem condição para painel aberto. O arquivo pertence a `root` e não foi alterado na VPS.
- Correção local: pausar o polling quando o painel estiver fechado ou o documento oculto; consultar imediatamente ao abrir e continuar em 4 s enquanto visível.
- Critério de fechamento: aplicar por fluxo de publicação autorizado e medir requests/minuto com painel fechado e aberto, sem deixar o indicador do pool desatualizado quando ele for aberto.
- Bloqueio: usuário `deploy` não tem propriedade de escrita no asset root-owned; identificar o processo normal de build/publicação que preserva ownership antes de alterar esse arquivo.

### UI-115 — Falha de leitura do mundo reiniciava a sincronização a cada frame

- Prioridade: `P1` · Estado: `FIXED` no checkout; patch de produção não aplicado · Rota/viewport: `#city`, sessão Codex/IAB 791×1124 e sessão desktop observada.
- Evidência: a Cidade permaneceu em `#city`, com WebGL ativo e telemetria online; a captura mostra a área de mundo estreita por causa da sidebar aberta e controles sobrepostos na parte inferior. O console não registrou erros. A reprodução no código encontrou `_resumeAnimationLoop()` chamando `syncRealData()` sempre que o status não era `MEASURED`. Em respostas indisponíveis/sem coordenadas completas, cada falha liberava `_syncingRealData` e o próximo ciclo de animação iniciava outra leitura.
- Correção local: o loop de animação agora só retoma/redimensiona/renderiza. A leitura inicial, a tentativa curta de recuperação e a atualização autenticada a cada 15 s/evento permanecem fora do frame loop.
- Teste: `test/city-runtime-performance.test.js` reproduziu a chamada antes da correção; depois, seis suítes focadas de composição, primeiro paint, orçamento de render, snapshot desatualizado, fallback WebGL e câmera passaram 11/11.
- Evidência de versão: `grg/public/fenix-world-3d.js` local SHA-256 `a5c9b8863013e8649fa687449d54d1162c022c8613bc0f05b3e4827beae69ddd`; o asset servido é `/opt/fenix-os/public/fenix-world-3d.js`, SHA-256 `a78f09f494e0819acd4c95acc1f454e7743df8a5628c966d69332bf779557de9`, e ainda contém a chamada por frame. A cópia `/opt/fenix-os/grg/public/fenix-world-3d.js` não atende a URL pública. Backup verificável do asset e do `index.html` servido: `/home/deploy/grg-space-rollback/2026-10-21T2000-city-sync-frame-loop/` (hashes comparados antes de qualquer patch). A tentativa de patch ao asset publicado foi rejeitada pela revisão automática da execução antes de rodar; nenhum arquivo de produção foi alterado.
- Critério de fechamento: aplicar a alteração pelo fluxo de publicação permitido; validar a versão/hash servida; observar por 5 min em 375/768/1280/1920 px e comprovar requests de estado limitados à cadência/eventos, mapa estável ao falhar a API, FPS/long tasks e ausência de novas sobreposições críticas.
- Limite: a correção reduz chamadas repetidas e carga de rede em falha; não corrige por si só a composição visual do mundo estreito nem certifica fluidez prolongada na VPS.

### UI-116 — Catálogo de projetos do Windows não aparece na instância hospedada

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `#projects`, instalação VPS · Área: Project Hub / integração local-remota.
- Evidência: o manifesto `C:\Users\Dell\Desktop\PROJETOS\projetos.json` contém 41 projetos com caminhos existentes no PC. O Project Hub hospedado na VPS lista 7 projetos/5 workspaces remotos, e o serviço local de catálogo em `127.0.0.1:4400` não está escutando. O processo Linux da VPS não pode abrir os caminhos `C:\...` do Windows.
- Causa: o catálogo já implementado é local ao host; a UI remota não tem ponte autenticada para o PC. Portas declaradas no manifesto são metadados de desenvolvimento e não comprovam listeners.
- Critério de fechamento: uma conexão local autenticada e limitada a pastas escolhidas publica os 41 registros com origem explícita; o Project Hub permite pré-visualizar e abrir somente pastas autorizadas, sem confundir caminhos locais com workspaces VPS.
- Próximo passo seguro: definir e implementar uma ponte local de escopo mínimo; até lá, manter o estado de indisponibilidade explícito e não oferecer “abrir” como se o servidor remoto tivesse acesso ao disco local.

### UI-117 — Chat estreita a Cidade no viewport de tablet do Codex

- Prioridade: `P1` · Estado: `VERIFIED` no checkout; publicação na VPS pendente · Rota/viewport: `#city`, 768 px · Área: layout responsivo / Cidade.
- Evidência: Chromium reproduziu o mapa com 361 px de largura em viewport de 768 px enquanto a sidebar fixa ocupava 323 px; o mapa perdia largura mesmo com o chat desenhado como overlay.
- Causa: a regra de tablet reservava uma margem do tamanho do chat em `.views-container`, apesar da sidebar estar fora do fluxo como painel fixo.
- Correção: remover essa margem apenas quando a rota ativa é Cidade; as demais telas mantêm o espaço reservado para o chat.
- Verificação: `city-sidebar-map-width.test.js` passou em 375, 768, 1280 e 1920 px; em 768 px o mapa preserva a largura por trás do chat.
- Critério para produção: publicar pelo fluxo permitido, reabrir `#city` na VPS e capturar a mesma geometria antes/depois com sidebar aberta e fechada.

### UI-118 — Atividade da simulação aparecia como tarefa sem job real

- Prioridade: `P1` · Estado: `FIXED` no checkout; validação visual e publicação pendentes · Área: runtime da Cidade / verdade operacional.
- Evidência: `living-city-agent-truth.test.js` falhava quando um agente disponível tinha um rótulo de rotina antigo e nenhum job ativo; a API o retornava em `currentTask`.
- Causa: a projeção da Cidade copiava `agent.currentTask` persistido mesmo sem um job ativo relacionado ao agente.
- Correção: `currentTask` agora vem apenas do job ativo associado; a rotina da simulação continua separada do trabalho executável.
- Teste: as suítes `living-city-agent-truth.test.js` e `living-city-agent-profile.test.js` passaram 12/12.
- Critério para produção: validar agente ocioso, job enfileirado e job em execução na API autenticada e confirmar que somente o job real aparece como tarefa.

### UI-119 — Fallback 2D redesenhava a 60 Hz e minimapa acordava a cada frame

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#city` em fallback 2D ou com minimapa ativo · Área: performance / renderização.
- Evidência: `IsoCityEngine.startLoop()` limitava a 10 fps apenas em headless; navegador normal atualizava e redesenhava em todo `requestAnimationFrame`. O minimapa também consultava o relógio a cada frame embora só redesenhasse a cada 500 ms.
- Correção local: 2D agora segue orçamento de 24 fps em telas compactas, 30 fps em desktop e 10 fps em headless, preservando o delta de simulação entre quadros renderizados. O minimapa aguarda 500 ms entre atualizações e reinicia ao reabrir a Cidade ou retornar à aba.
- Verificação: suíte focada expandida de Cidade/runtime/avatares/projetos passou 46/46; `node --check` em `iso-city.js` e `fenix-world-3d.js` passou.
- Critério para produção: publicar pelo fluxo autorizado e comparar CPU/long tasks em sessão equivalente, mantendo movimento de agentes, pan/zoom e resposta do minimapa utilizáveis.

### UI-120 — Agentes ociosos recebiam movimento e conversas operacionais inventadas

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#city`, fallback 2D · Área: integridade do estado / comportamento visual.
- Evidência: `_updateAgent()` escolhia rotas aleatórias para portais, café e sala de reunião; pares ociosos exibiam mensagens como “Contratos e testes 100% verificados” sem uma missão ou evento correspondente.
- Correção local: removidas rotas e falas aleatórias. Agentes ociosos permanecem no estado de repouso; deslocamento e trabalho continuam ligados a destinos/job explícitos do runtime ou a ações do operador.
- Verificação: a regressão do Invariant 9 agora comprova que a Cidade não gera `routineTimer`, `socialTimer` nem afirmações operacionais fictícias. `node --check` passou.
- Limite: essa mudança corrige a honestidade do modo 2D; não cria novas atividades reais no backend. Para vida diária funcional, os workflows precisam emitir destinos e eventos canônicos para etapas como análise, revisão, teste e entrega.

### UI-121 — A IDE inventava branch e versão quando Git não respondia

- Prioridade: `P2` · Estado: `FIXED` no checkout · Rota: `#ide` · Área: metadados do workspace.
- Evidência: quando `/git` falhava, o cabeçalho exibia `main` e `v8.3` mesmo sem leitura do branch ou commit daquele workspace.
- Correção: exibir `Branch não medida` e `Commit não medido` quando a API Git não retorna esses valores. Dados recebidos continuam sendo exibidos com branch e hash curto.
- Verificação: `project-ide-preview-url.test.js` verifica os casos medidos e indisponíveis; testes focados do Project Hub/IDE passaram 16/16.
- Critério visual: conferir um workspace Git ativo e um sem Git na IDE após o próximo release.

### UI-122 — Modal de aprovação antigo mostra uma tarefa sem identificação suficiente

- Prioridade: `P1` · Estado: `REPRODUCED` na VPS; correção no checkout · Rota: `#city`, primeira pintura autenticada · Área: aprovação de tarefas / sobreposição.
- Evidência: inspeção acessível ao vivo mostrou modal `AGUARDANDO APROVAÇÃO` com título `3`, agente `ESPECIALISTA`, contador não iniciado e custo/tokens não medidos. O shell carrega `fenix-task-modal.js?v=20261020`; o asset tem SHA-256 `dcbd5d0eeb464d70fad355d637666355a8e1de159e4428f41b9218a1edd6b8e1`.
- Segurança da verificação: a tarefa não foi aprovada, rejeitada nem cancelada. O modal permaneceu como estava.
- Correção no checkout: o modal atualizado exige `taskId` e texto significativo; recusa título numérico, ID-only ou payload incompleto e só mostra métricas recebidas. `task-modal-contract.test.js` e `task-modal-no-placeholder.test.js` passaram 8/8.
- Critério de fechamento: publicar a versão revisada, recarregar sessão autenticada e confirmar que o payload inválido não abre o modal; uma aprovação válida deve mostrar ID/título e efeitos antes da confirmação. Validar que minimizar não altera o estado da tarefa.
- Bloqueio: nenhum deploy foi feito. A tentativa anterior de escrita em produção foi rejeitada pela revisão automática antes da execução; não foi tentado outro caminho para contorná-la.

### UI-123 — Cidade fazia consultas duplicadas e Project Hub marcava serviços saudáveis como degradados

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#city` e `#projects` · Área: estabilidade, tráfego e estados de carregamento.
- Evidência: a instância autenticada carregou a Cidade, mas a inspeção mostrou estado inconsistente em outra tarefa pendente. No checkout, o 3D tinha seu próprio polling de 15 s e iniciava leitura ao entrar na rota além do publicador `premium-world-live.js`; isso criava leituras redundantes. Na VPS, `/api/health` em `:4410` e `/api/system/health` em `:4025` retornaram 401; os endpoints medidos `/health` retornaram 200.
- Correção local: o renderer 3D agora solicita a leitura inicial pelo publicador compartilhado e consome `fenix:city-world`; removi a segunda cadência e a leitura direta paralela ao trocar de rota. O Project Registry agora aponta Fênix e ZapAI para `/health`.
- Testes: primeiro a regressão falhou nos contratos antigos; depois as suítes focadas de Cidade/runtime/polling/health passaram 33/33, incluindo reconciliação de snapshots vazios.
- Critério para fechamento: publicar pelo fluxo autorizado; validar na VPS que a entrada na Cidade gere uma única leitura inicial, atualizações regulares do publicador e sem loop de loading; comparar CPU/RAM por 5 min em viewport equivalente. O chat e o mapa devem permanecer responsivos.
- Limite: o navegador da VPS estava com a cena já pintada durante a releitura; o loop de loading não foi reproduzido nessa sessão. A correção e os testes estão apenas no checkout, sem deploy ou restart nesta alteração.

### UI-124 — HUD inferior da Cidade perde alinhamento com chat aberto em viewport estreito

- Prioridade: `P2` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#city`, viewport do navegador embutido (791×1117 medido), sidebar direita aberta · Área: composição responsiva da Cidade.
- Evidência ao vivo: caixas medidas no browser mostram mapa `x=72..439`, HUD `x=-180..171` (350 px), trilho de navegação `y=703..746` e minimapa `y=741..933`; controles ficaram cortados e o trilho cruzou o minimapa. A tela também mostrava uma faixa redundante de métricas sobre os controles.
- Reprodução: abrir `#city` no navegador embutido, manter o chat direito aberto e observar o HUD inferior enquanto a área útil do mapa fica reduzida.
- Causa: a regra antiga centralizava o HUD em relação à largura da sidebar e mantinha o `translateX(-50%)`; o valor foi aplicado ao canvas estreito, levando o grupo para fora da tela. O trilho também não reservava a altura do minimapa.
- Correção local: composição final centraliza a barra no próprio mapa, limita sua largura com rolagem horizontal e reserva espaço acima do minimapa. A faixa duplicada de métricas fica oculta pela folha 3D canônica.
- Testes: `test/city-hud-chat-composition.test.js` cobre 375/768/1280/1920 px com chat aberto/fechado; `test/city-overlay-layout.test.js` confirma que o painel de operações fica na área de mapa exposta quando o chat está aberto.
- Critério de fechamento completo: publicar pelo fluxo autorizado e repetir em 375, 768, 1280 e 1920 px com chat aberto/fechado; anexar capturas da versão servida.

### UI-125 — A Cidade pode perder atualizações após o primeiro snapshot

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#city` · Área: estabilidade e atualização da telemetria.
- Evidência: ordem dos scripts da página executa o renderer 3D antes do publisher deferido. O renderer criava `FENIX.cityWorld`; `premium-world-live.js` encerrava sua inicialização ao encontrar esse objeto. Como a correção anterior removeu a cadência do renderer, nenhum dos dois mantinha atualização periódica nesse caminho.
- Causa reproduzida por inspeção do fluxo de inicialização e registrada no teste de contrato `test/city-runtime-performance.test.js`.
- Correção local: o renderer instala uma única atualização de 15 s apenas quando o objeto compartilhado ainda não tem um `refresh`; a leitura só ocorre com a Cidade visível e o timer é limpo ao descartar o renderer. Se outro publisher já possui `refresh`, o renderer não inicia outro timer.
- Testes: `test/city-runtime-performance.test.js` valida a cadência limitada, visibilidade e descarte; `test/city-world3d-view-lifecycle.test.js` valida entrada e retomada sem leitura paralela.
- Critério de fechamento completo: na versão servida, confirmar atualizações periódicas sem duplicar requisições, sem loop de loading e sem carga de rede quando a Cidade está fora de vista.

### UI-126 — Carga inicial da página tem muitos recursos inativos

- Prioridade: `P2` · Estado: `OBSERVED` · Rota: `#city` · Área: desempenho de inicialização.
- Evidência: inspeção DOM ao vivo encontrou 54 scripts externos carregados, 6 elementos canvas dos quais 4 tinham área zero e 3 iframes ocultos. O console não apresentou erros críticos na amostra. Essa contagem indica custo potencial, mas não identifica sozinha a causa do lag.
- Releitura ao vivo em 21/10/2026: 75 elementos `<script>` (58 externos) e 6 canvases; 4 canvases tinham dimensões zero. A API de performance do navegador não estava disponível nesta sessão de inspeção, então faltam tempo de execução dos scripts, long tasks e FPS medidos.
- Próximo passo: traçar long tasks, tempo de parse/execução, tráfego de boot e FPS na versão local; identificar dependências antes de mover scripts para carregamento tardio.
- Critério de fechamento: entregar perfil antes/depois com métricas comparáveis e sem atrasar navegação, City, chat, projetos ou fluxos críticos.

### UI-127 — Restaurar a rota da Cidade iniciava consultas concorrentes

- Prioridade: `P1` · Estado: `FIXED` no checkout; produção pendente · Rota: `#city` e restauração de rota no boot.
- Evidência: inspeção do HTML encontrou três consultas em paralelo na entrada (`/api/v2/city/state`, `/api/v2/living-city/state` e `/api/v2/living-city/agents`), uma leitura direta adicional do renderer 3D e outra chamada a `syncRealData()` no roteador. O estado completo da Cidade já inclui a projeção dos agentes; a primeira leitura do renderer também ocorre na inicialização.
- Evidência ao vivo em 21/10/2026: a Cidade permaneceu aberta durante a inspeção, sem spinner de carregamento visível e sem erros de console na amostra. O comportamento de loop relatado pelo operador não foi reproduzido nessa sessão. A versão servida tinha `city-runtime-composition.css?v=20261021-runtime-composition-1`; o checkout já usa `?v=20261021-city-hud-map-stability-3`, portanto o alinhamento do HUD ainda não está aplicado na VPS.
- Correção local: a rota agora impede cargas concorrentes, reutiliza snapshot recente por 15 segundos, mantém um botão de atualização explícita e consulta primeiro apenas `/api/v2/living-city/state`, recorrendo a `/agents` somente quando necessário. Chamadas de rede duplicadas foram removidas do roteador e da inicialização do renderer.
- Verificação local: teste de regressão reproduziu a ausência dos controles antes da correção; depois, `city-runtime-performance`, ciclo de vida 3D, primeiro paint, composição do HUD e largura do mapa passaram 9/9.
- Critério de fechamento: publicar a versão aprovada, confirmar uma única leitura inicial, verificar que reload/retorno à rota não repete a leitura durante 15 s e comparar long tasks/FPS e estabilidade por 5 minutos em viewport equivalente, com o chat aberto e fechado.
- Limite: a versão da VPS continua servindo assets diferentes. O reload da sessão ao vivo mostrou a Cidade estável em uma amostra, mas não comprova o loop de 5 minutos nem a redução de lag; nenhuma alteração de produção foi executada.

### UI-128 — Eventos SSE e entrada na rota duplicavam a leitura do mundo

- Prioridade: `P1` · Estado: `FIXED` no checkout; versão servida pendente · Rota: `#city` · Área: carregamento, rede e fluidez do mapa.
- Evidência: o adaptador SSE já publica eventos `fenix-live` e `premium-world-live.js` agenda refresh agrupado em 2 s. O listener legado em `index.html` também chamava `fenixCity.syncRealData()` para cada mensagem não-heartbeat. Em paralelo, a entrada da rota lia `/api/v2/living-city/state` por `loadCityView`, enquanto `fenix:viewchanged` forçava o publisher a ler o mesmo endpoint. Teste de regressão falhou antes da correção ao encontrar a segunda leitura.
- Correção local: removi a leitura direta por evento SSE; o loader agora reutiliza `FENIX.cityWorld.refresh` e o snapshot/evento já aplicado pelo renderer. Eventos SSE agendam uma atualização agrupada de 2 s. Tanto `premium-world-live.js` quanto o refresh fallback do renderer compartilham a Promise em andamento entre evento, rota e atualização manual. Atualizei os cache-busters para `fenix-world-3d.js?v=20261021-city-single-poller-2` e `premium-world-live.js?v=9-city-singleflight`.
- Verificação local: `city-runtime-performance`, `city-bootstrap-auth` e `frontend-polling-load` passaram 15/15 após os testes RED antes da alteração.
- Critério de fechamento: na versão publicada, em sessão autenticada, verificar no Network que rajadas SSE e entrada/retorno à Cidade produzem no máximo uma leitura simultânea do snapshot, sem loader recorrente, com FPS e long tasks comparados por 5 min.
- Limite: a aba VPS permaneceu visualmente estável durante a amostra curta; o loop contínuo não foi reproduzido. A correção está no checkout e não comprova melhoria na versão pública.

### UI-129 — Restauração inicial executava tanto em DOMContentLoaded quanto em load

- Prioridade: `P2` · Estado: `FIXED` no checkout; versão servida pendente · Rota: carregamento inicial e refresh · Área: montagem e transições da shell.
- Evidência: o mesmo callback `restoreRouteOnLoad` era agendado em `DOMContentLoaded` e em `load`, chamando `showView` mais de uma vez na abertura.
- Correção local: restauração agora tem guarda de execução única; a segunda notificação do ciclo de vida do navegador é ignorada. Mudanças de hash posteriores continuam usando o listener próprio.
- Verificação local: teste novo falhou antes da correção e passou em `city-runtime-performance.test.js`.
- Critério de fechamento: publicar e confirmar em sessão limpa, refresh e rota legada que a rota inicial é resolvida uma vez e que mudança posterior de hash continua funcionando.

### UI-130 — Cidade inicial cria cenário periférico além da área necessária

- Prioridade: `P2` · Estado: `FIXED` no checkout; medição na VPS pendente · Rota: `#city` · Área: startup da cena 3D.
- Evidência: câmera inicial em distância 136 acionava raio 2 acima de 130, criando 24 blocos decorativos (terreno, vias e poucos edifícios) antes do zoom out.
- Correção local: raio 1 (8 blocos) no início; anel externo carregado somente acima da distância 210. Viewports compactos continuam limitados ao raio 1. Bundle recebe cache-buster novo no shell.
- Teste: `test/city-world3d-terrain.test.js` cobre distâncias 136 e 220; 14/14 passaram. Isso valida a quantidade de blocos, não uma melhora de FPS.
- Fechamento: comparar FPS, draw calls, tempo de inicialização e heap em câmera/viewport equivalentes na versão servida; confirmar zoom out sem travamento.

### UI-131 — Avatares ficam indistintos e pequenos na visão geral

- Prioridade: `P1` · Estado: `FIXED` no checkout; visual/performance pendentes · Rota: `#city`, visão Global · Área: escala e leitura dos agentes.
- Evidência: captura VPS 1745×808 mostra agentes pequenos e repetitivos. Perfis configuráveis já existem; a falha observada é a legibilidade no overview/LOD.
- Correção local: acessórios de identidade foram separados dos detalhes de close-up e continuam visíveis até 75 unidades, com frustum culling preservado; não foram adicionadas malhas.
- Testes: `test/city-agent-visual-profile.test.js` confirma que acessórios de identidade não estão no conjunto close-up e obedecem ao limite de distância; 24/24 passaram.
- Fechamento: comparar Global/Ilha/De Perto com perfis ZAI distintos na versão servida, preservando custo de render e identificação explícita de coordenadas estimadas.

### UI-132 — Elementos decorativos podem parecer tarefas em execução

- Prioridade: `P1` · Estado: `FIXED` no checkout; publicação/verificação visual pendentes · Rota: `#city` · Área: semântica visual e vínculo com runtime.
- Evidência: auditoria do renderer encontrou ciclo fixo no empilhador/forklift sem job vinculado e `assignDynamicMission` que altera estado/bubble local sem persistir missão.
- Correção local: o empilhador permanece estacionado até o runtime fornecer `forkliftState.jobId`; a animação não representa mais uma tarefa fictícia.
- Fechamento: atividade operacional visível tem ID/estado rastreável; animação decorativa fica rotulada como cenário ou sai da área operacional. Falha/cancelamento nunca se apresenta como sucesso. Ainda falta validar a versão publicada e verificar toda a projeção de `assignDynamicMission`.

### UI-135 — Render loop acordava na frequência do monitor e carregava resumo obsoleto na Cidade

- Prioridade: `P1` · Estado: `FIXED` no checkout; medição visual/performance na VPS pendente · Rota: `#city` · Área: fluidez e inicialização.
- Evidência: o 3D usava `requestAnimationFrame` em todo refresh de tela (normalmente 60 Hz) e descartava quadros acima do limite de 24/30 FPS; a rota também disparava `GET /api/v2/reality/summary` aos 300 ms, além do snapshot do mundo, apesar de `command` ser alias de `city`.
- Correção local: callbacks são agendados pelo intervalo do render (16 FPS em viewports compactos, 24 FPS em desktop; 10 FPS em headless); o canvas compacto limita pixel ratio a 1.0; timers e RAF são cancelados no `dispose`. Removido o fetch/polling automático do resumo legado durante o boot. O snapshot real do mundo mantém o mesmo coordenador de refresh.
- Verificação local: testes direcionados passaram 59/59; prova de scheduler confirma um RAF por intervalo e o teste de boot confirma que o resumo legado não é consultado automaticamente. O perfil de navegador não expôs `performance` nesta sessão; portanto redução de long tasks/FPS não está medida. O código servido na VPS ainda está em versão anterior.
- Critério de fechamento: publicar após verificar processo e rollback; comparar callback count, FPS, long tasks e estabilidade por 5 minutos em 375/768/1280/1920 px, com o chat aberto e fechado.

### UI-133 — Contadores do topo e da Cidade parecem contraditórios

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` · Área: consistência de métricas.
- Evidência: mesma sessão indicou 19 online no topo e 39 agentes/38 ativos na Cidade; 1 missão no topo e 0 jobs ativos na Cidade. Semânticas podem diferir, mas rótulos/fontes não explicam a diferença.
- Ajuste local complementar: o rótulo do minimapa agora diz quantos agentes estão “no mapa”, em vez de sugerir presença online. O contador do topo continua sendo online medido; falta harmonizar/explicar o resumo de 39/38 da Cidade e 1 missão/0 jobs.
- Fechamento: documentar endpoint/campo e significado de cada contador; alinhar janela temporal ou rotular diferenças e testar 0, 1 e estados mistos sem inventar dados.

### UI-134 — Distritos da Cidade têm aparência repetitiva de protótipo

- Prioridade: `P2` · Estado: `OBSERVED` · Rota: `#city`, visão Global · Área: identidade espacial.
- Evidência: oito distritos usam edifícios de caixas e materiais simples com silhuetas semelhantes; agentes e placas não se destacam. Aumentar polígonos sem corrigir hierarquia visual pode agravar o lag.
- Fechamento: distritos reais têm forma/cor/sinalização reconhecíveis, rótulos sem colisão e composição legível; anexar comparação nas quatro larguras e custo de render.

### UI-136 — Atualização do snapshot recriava o coordenador de refresh da Cidade

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: entrada em `#city`, atualização manual e eventos SSE.
- Evidência: `syncRealData()` substituía `window.FENIX.cityWorld` depois de cada leitura, removendo o `refreshPromise` compartilhado usado por navegação, resumo da Cidade e eventos. Além disso, uma reabertura podia conservar um callback `world3d` que apontava para o renderer já desmontado. As regressões falharam antes dos ajustes em `test/city-world3d-refresh-single-flight.test.js` e `test/city-world3d-view-lifecycle.test.js`.
- Correção local: snapshot, timestamp e erro são atualizados no objeto existente; o controlador e a promessa em andamento permanecem intactos. Ao remontar, o renderer atual substitui somente o dono antigo `world3d`, preservando um publisher externo.
- Testes: `node --test test/city-world3d-refresh-single-flight.test.js test/city-world3d-view-lifecycle.test.js` — 3/3 passaram após a correção.
- Fechamento: contar requisições autenticadas na VPS ao abrir, trocar de rota, receber evento e atualizar; confirmar uma chamada em voo por tenant/visão, sem loader que reinicie continuamente.

### UI-137 — Movimento decorativo mantém a Cidade ativa sem jobs e eleva o custo gráfico

- Prioridade: `P1` · Estado: `FIXED` no checkout; perfil de navegador/VPS pendente · Rota: `#city` sem jobs em execução.
- Evidência: o snapshot observado mostrava 0 jobs ativos, enquanto o renderer movia um veículo de tráfego e 13 pulsos de dados em toda cena. O caminho não estava vinculado a job/evento; o loop também redesenhava esses elementos a cada quadro.
- Correção local: o veículo fica estacionado; os pulsos de dados só aparecem e se movem quando `metrics.runningJobs` ou jobs reais recentes indicam execução. Viewport compacto passa a 16 FPS e pixel ratio 1.0 para reduzir o preenchimento da GPU.
- Teste: `test/city-render-budget.test.js` — 11/11 passaram, incluindo idle sem tráfego/pulsos falsos, pixel ratio compacto e limites do scheduler.
- Fechamento: comparar FPS, long tasks e consumo de GPU/RAM com a mesma câmera e snapshot, antes/depois por cinco minutos; conferir uma missão real e estado idle na versão publicada.

### UI-138 — Estado de agente podia vir de outra tenant ou ficar falsamente em execução

- Prioridade: `P1` · Estado: `FIXED` no checkout; revisão autenticada do runtime pendente · API/rota: `/api/v2/living-city/state` e `/api/v2/living-city/agents`.
- Evidência: teste de regressão confirmou que um agente do catálogo global com ID igual ao agente persistido da tenant sobrescrevia nome, status e coordenadas autorizados. Outro teste confirmou que `status: WORKING` persistido sem job ativo era publicado como execução real.
- Correção local: registros da tenant têm precedência, registros explicitamente pertencentes a outra tenant são filtrados, e `WORKING` sem job ativo é normalizado para `AVAILABLE`. Camila inicia sem tarefa/badge de inspeção inventados; scanner só acende com estado `WORKING` e tarefa recebida.
- Testes: `test/living-city-admin-mission-snapshot.test.js` — 3/3 passaram; `test/city-render-budget.test.js` também cobre a remoção do rótulo de tarefa fictício.
- Fechamento: validar com dois tenants autenticados e jobs reais, confirmar que somente os dados autorizados aparecem e que estados `WORKING` correspondem a um job ativo persistido.

### UI-139 — Overlay de aprovação invisível ainda está exposto na árvore acessível da VPS

- Prioridade: `P2` · Estado: `FIXED` no checkout; asset publicado pendente · Rota: `#city` · Área: acessibilidade e empilhamento modal.
- Evidência: no navegador ao lado, `#fnxTaskModalOverlay` estava sem classe `active`, com `opacity: 0`, `display: flex`, `visibility: visible` e `z-index: 10000`; `pointer-events: none` evitava bloquear cliques. A CSS servida usa `?v=20261017` e não contém `visibility: hidden`, enquanto o HTML local já aponta para `?v=20261021-task-id-guard-1`.
- Correção local já existente: a regra base agora usa `visibility: hidden`, e só o modal ativo troca para `visible`; os testes verificam os dois estados e o cache-buster.
- Teste: `test/task-modal-no-placeholder.test.js` valida visibilidade, ausência de placeholder e referência cache-busted.
- Fechamento: servir o CSS novo, confirmar computed visibility `hidden` fora de `.active`, `pointer-events: none` e ausência do diálogo na árvore acessível.

### UI-140 — Reabertura da Cidade podia acumular listeners do renderer

- Prioridade: `P1` · Estado: `FIXED` no checkout; verificação de ciclo de navegação na VPS pendente · Rota: `#city` após sair e voltar.
- Evidência: o renderer registrava callbacks anônimos para `visibilitychange` e `fenix-view-changed`, mas `dispose()` não conseguia removê-los. Remontagens podiam deixar callbacks antigos acordando o loop de desenho.
- Correção local: callbacks agora têm identidade estável e são removidos ao desmontar o renderer.
- Teste: `node --test test/city-world3d-view-lifecycle.test.js test/city-render-budget.test.js` — aprovado.
- Fechamento: abrir/sair da Cidade repetidamente e confirmar um renderer, um conjunto de listeners, sem animação oculta nem aumento progressivo de FPS/uso de memória.

### UI-141 — IDE podia exibir arquivos do projeto Fênix em outro workspace

- Prioridade: `P1` · Estado: `FIXED` no checkout; fluxo de projetos externos na VPS pendente · Rota: Build/IDE ao trocar de projeto.
- Evidência: erro ou árvore vazia no endpoint do projeto selecionado acionava fallback fixo para `/api/v2/projects/fenix-os/...`, podendo misturar arquivos e atrasar a abertura ao aguardar endpoints alheios ao projeto.
- Correção local: o fallback legado só é tentado para `fenix-os`; árvore vazia é tratada como estado válido; erros de outro projeto são mostrados sem cruzar workspace.
- Teste: `node --test test/project-ide-preview-url.test.js` — aprovado.
- Fechamento: alternar Fênix, API Platform, ZAP AI e workspace vazio; cada árvore/arquivo deve permanecer no projeto selecionado e concluir sem loader persistente.

### UI-142 — Versão pública da Cidade não contém as correções locais de estabilidade

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `http://209.50.241.22:3000/app#city`.
- Evidência: navegador ao lado carrega `fenix-world-3d.js?v=20261021-city-30fps-stability-1`, diferente do cache-buster local `20261021-city-render-cadence-1`; o DOM ainda expõe overlay de tarefa invisível. Na observação pontual o mapa estava estável e não havia erros de console, então o relato de loop não foi reproduzido durante essa captura.
- Próximo passo: identificar processo/artefato da porta 3000 e rollback verificável antes de publicar; após isso capturar heap/FPS e repetir navegação/refresh para localizar o loop reportado.
- Fechamento: versão publicada corresponde ao commit validado, modal invisível fica fora da árvore acessível e teste de cinco minutos não apresenta carregamentos repetitivos ou degradação de FPS/memória.

### UI-143 — Resize restaurava resolução WebGL acima do limite compacto

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: Cidade em viewport compacto ao abrir/fechar painéis ou redimensionar.
- Evidência reproduzida: inicialização compacta limitava o pixel ratio a `1`, mas `resize()` elevava o valor até `1.25`. Isso aumenta em até 56% a quantidade de pixels desenhados após um resize.
- Correção local: `resize()` reutiliza o limite por classe de viewport e retorna sem redimensionar o renderer quando dimensões, proporção e pixel ratio não mudaram.
- Testes: `test/city-render-budget.test.js` reproduz a regressão, valida o limite e confirma que resize duplicado não chama `setSize`.
- Fechamento: repetir abertura/fechamento da sidebar e redimensionamento em 375/768/1280 px; confirmar pixel ratio medido dentro do limite e ausência de chamadas repetidas sem mudança geométrica na build implantada.

### UI-144 — Portas do catálogo local não indicavam em qual host existem

- Prioridade: `P2` · Estado: `FIXED` no checkout; VPS pendente · Rota: Build/Projetos, lista local e detalhes de projeto.
- Evidência: `UI: 8180` e `API: 4200` apareciam sem declarar que eram configurações do host onde o catálogo é lido; caminho `C:\` listado na VPS podia parecer acessível.
- Correção local: portas recebem o rótulo `Catálogo local`/`Host do catálogo`; estados vazios explicam que a VPS não acessa pastas Windows do PC.
- Teste: `test/local-project-catalog-ui.test.js` verifica os rótulos e layout responsivo.
- Fechamento: confirmar na versão servida que a distinção aparece em todos os projetos do catálogo e que projetos inacessíveis no host não abrem loaders persistentes.

### UI-145 — Modal de aprovação inativo permanece exposto na árvore acessível da VPS

- Prioridade: `P1` · Estado: `VERIFIED` na VPS (21/10/2026) · Rota: Cidade com tarefa modal fechada.
- Evidência: overlay apresenta `display:flex`, `opacity:0`, `visibility:visible` e seus botões entram na árvore acessível mesmo sem estar visível no mapa.
- Correção publicada: CSS do modal usa `visibility:hidden` até a classe `.active`; o shell solicita CSS com cache-buster `20261022-modal-a11y-1`. SHA-256 servido do CSS: `b7b3cd18a67face5aa5260b6229c690d6a554ed69af9230c4ffecff48514bab2`.
- Teste: `test/task-modal-no-placeholder.test.js` valida estado inativo e cache-buster.
- Validação ao vivo: após recarga autenticada em `#city`, o modal inativo ficou ausente da árvore acessível; backup anterior em `/home/deploy/grg-space-rollback/2026-10-21T2105-hidden-modal/fenix-task-modal.css` e do HTML em `/home/deploy/grg-space-rollback/2026-10-21T2115-modal-cache/index.html`.
- Fechamento: resolvido para o estado fechado. A abertura mediante solicitação real de aprovação ainda não foi percorrida nesta validação.

### UI-146 — Drawer V8 oculto mantinha consultas periódicas de jobs e projetos

- Prioridade: `P2` · Estado: `FIXED` no checkout; VPS pendente · Rota: qualquer tela quando o painel V8 está fechado.
- Evidência: `fenix-v8-ui.js` iniciava cargas de jobs/projetos ao abrir a aplicação e repetia consultas a cada 20/60 s mesmo com `#fv8-panel` em `display:none`.
- Correção local: jobs e projetos carregam quando o drawer é aberto; as atualizações periódicas de jobs, projetos e contador só rodam com o drawer aberto e documento visível. O cache-buster foi atualizado.
- Teste: `test/fenix-v8-polling.test.js` valida ausência de carga inicial escondida e gates dos timers.
- Fechamento: confirmar no Network da versão servida que fechar o drawer interrompe consultas periódicas e que abrir atualiza os dados sem loaders persistentes.

### UI-147 — Cidade 3D animava tráfego sem tarefa e consumia orçamento alto no Codex

- Prioridade: `P1` · Estado: `FIXED` na VPS; medição prolongada de desempenho pendente · Rota: `http://209.50.241.22:3000/app#city` em painel compacto.
- Evidência: snapshot vivo mostrou 39 agentes e 0 jobs, enquanto o bundle público movia empilhadeira, tráfego, pulsos de dados, núcleo, LEDs e gestos de avatares sem execução associada. No painel Codex a área CSS do canvas era 716×969 px, mas o buffer era 786×1065 (pixel ratio ~1,1); o bundle limitava a cena compacta a 24 FPS.
- Correção publicada: atividade ambiental e pulsos dependem de jobs/estados `WORKING` medidos; a empilhadeira exige `jobId`; agentes disponíveis ficam imóveis; primeiro snapshot mantém pulsos ocultos. Em viewport compacto, limite de render cai para 16 FPS e pixel ratio para 1, mantendo resize coerente.
- Evidência pós-publicação (2026-10-21): o navegador carregou `fenix-world-3d.js?v=20261021-idle-city-stability-1`, `readyState=complete`, sem aviso de carregamento visível; buffer passou a 715×969 para a área CSS 716×969. Duas capturas separadas por 3 s mantiveram o mapa estável. Console: sem erros; permaneceu apenas o aviso de depreciação do Three.js.
- Testes locais: `node --test --test-reporter=dot test/city-render-budget.test.js test/city-codex-viewport-performance.test.js test/city-world3d-view-lifecycle.test.js test/city-world3d-refresh-single-flight.test.js` — 19/19 passaram. O bundle publicado também passou `node --check`; URL do asset e rota retornaram HTTP 200.
- Rollback: arquivos originais preservados em `/home/deploy/grg-space-rollback/2026-10-21T2050-idle-city/` (`index.html` e `fenix-world-3d.js`). Nenhum processo foi reiniciado.
- Fechamento: comparar FPS, long tasks e consumo de GPU/RAM por cinco minutos em viewport equivalente; validar movimento durante uma missão real e imobilidade em estado ocioso. Métricas de FPS/long tasks não foram expostas pelo navegador nesta sessão.

### UI-148 — Project Hub inicializava consultas pesadas mesmo fora da rota Projetos

- Prioridade: `P1` · Estado: `VERIFIED` na VPS (21/10/2026) · Rotas: `#city` e `#projects`.
- Evidência/reprodução: carregar `#city` podia disparar conta GitHub e estados/Git para cada projeto sem abrir Projetos; as chamadas duravam 0,45–0,71 s por workspace. O teste RED inicial confirmou seis chamadas indevidas. Um evento obsoleto `fenix:viewchanged:projects` ainda contornava o primeiro gate; um segundo teste RED reproduziu esse caso.
- Correção: `project-hub-live.js` só hidrata em `#projects` com `view-projects` ativo, ou no evento válido de navegação. Cache-buster público `20261022-lazy-viewguard-2`, SHA-256 `7e248f6d91c5349f45b523bc87e1adaec42adba33753b8a0ef0c3191cd1c129e`.
- Testes: `test/project-hub-lazy-startup.test.js` (RED antes de cada correção, GREEN depois), `test/task-modal-no-placeholder.test.js` e `test/local-project-catalog-ui.test.js` aprovados.
- Validação ao vivo: Cidade → Projetos → Cidade; catálogo exibiu sete projetos, cinco workspaces vinculados e 718 telas DNA do Fênix OS. Após o último guard, dois ciclos de 15 s na Cidade não tiveram chamadas de catálogo/jobs/missões; só `/runtime/snapshot` (224–409 ms). Abrir Projetos voltou a carregar as informações detalhadas.
- Rollback: `/home/deploy/grg-space-rollback/2026-10-21T2130-projecthub-lazy/project-hub-live.js`, `/home/deploy/grg-space-rollback/2026-10-21T2150-projecthub-viewguard/project-hub-live.js` e os respectivos `index.html`. Publicação estática, sem restart/reboot.
- Fechamento: hidratação oculta e evento de navegação obsoleto resolvidos. Polling de snapshot e perfil prolongado de CPU/FPS/heap não estão incluídos neste fechamento.

### UI-149 — Cockpit consultava listas do dashboard durante a Cidade

- Prioridade: `P1` · Estado: `VERIFIED` na VPS (21/10/2026) · Rota: `#city`.
- Evidência: `runtime-cockpit.js` incluía projetos, jobs e missões no hydration global, embora o World já tenha seu próprio snapshot; isso podia somar requests lentos na Cidade e a cada ciclo de 15 s.
- Correção: a Cidade mantém `/health` e `/runtime/snapshot`; listas completas continuam nas outras telas e em requisição explícita `forceDomain`. SHA-256 do asset público `9bc429a15f46d8bfa858c9ffeda67081560e4ecef3da8f8c2e05d42ab427d826`; cache keys do bootstrap/shell `20261022-city-loaders-1`.
- Testes: cenário do cockpit em `test/frontend-polling-load.test.js` aprovado; `node --check public/runtime-cockpit.js` aprovado.
- Validação ao vivo: recarga autenticada manteve 39 agentes e 9 prédios medidos. Ciclos seguintes mostraram `/runtime/snapshot` a cada 15 s, sem `/api/v2/jobs`, `/api/missions` ou consultas de lista na Cidade. Abrir Projetos carregou catálogo e estados normalmente.
- Rollback: `/home/deploy/grg-space-rollback/2026-10-21T2140-city-cockpit-poll/` contém os três assets anteriores.
- Limite: a redução de polling está verificada; medição de cinco minutos de FPS/heap/long tasks e geometria compacta seguem pendentes.

### UI-150 — Render loop WebGL acordava no refresh do monitor acima da taxa necessária

- Prioridade: `P1` · Estado: `FIXED` na VPS em smoke test; perfil prolongado pendente · Rota: `#city`.
- Reprodução/evidência: navegador carregava `fenix-world-3d.js?v=20261021-idle-city-stability-1` (SHA anterior `0857edb42e57a0408ed4835399956e9b648f1ef303e6be3ae35adfb7ad2a9194`). O renderer já limitava os desenhos a 16/24 FPS, mas continuava agendando callback `requestAnimationFrame` em cada refresh da tela; o checkout já tinha timer e RAF único na cadência alvo.
- Correção publicada: timer agenda 16 FPS em viewport compacto e 24 FPS em desktop; guarda impede timers/frames duplicados; timer é limpo no `dispose()`. O loop continua pausando quando a Cidade está oculta. Novo asset: `fenix-world-3d.js?v=20261021-cadence-stability-2`, SHA `73a516305aef74a2a87081fb341608aca80a434b61fe8c97a3c8e048b964728b`; `index.html` SHA `ad5b0774aa5ae544dbbd8ea39ba1f9f4ea6534698158c4ec5aeb87adf4d7671d`.
- Verificação local: `city-render-budget`, `city-runtime-performance`, `city-world3d-view-lifecycle`, `city-world3d-refresh-single-flight` e `frontend-polling-load` — 32/32 passaram; hotfix passou `node --check`.
- Validação no navegador da VPS: após reload, houve um primeiro estado transitório `Aguardando leitura dos agentes da API`; cerca de 5 s depois a Cidade recuperou com 39 agentes, 9 prédios medidos, 0 jobs e 0 falhas. Asset novo aparece no DOM. Sem erros JS; permanece aviso de depreciação do Three.js.
- Rollback verificável: `/home/deploy/grg-space-rollback/2026-10-21T2135-city-frame-scheduler/` guarda `index.html` e `fenix-world-3d.js` anteriores com hashes registrados. Nenhum serviço reiniciado.
- Pendente: medir por 5 min FPS, heap/long tasks e fluidez em viewport equivalente. A amostra curta não comprova ganho quantitativo nem fecha o relato de lag persistente.
- Observação de estabilidade pós-correção: 30 s contínuos em `#city` sem retorno do estado de carregamento; permaneceu em 39 agentes, 9 prédios, 0 jobs e 0 falhas. CPU/RAM do ticker foram 2%/82% nessa amostra, métricas do servidor e não do browser; o perfil de FPS/heap continua aberto.
- Reteste 21/10/2026 após recarga: o HUD mudou temporariamente para `TELEMETRIA INDISPONÍVEL` e `Aguardando leitura dos agentes da API`; depois do botão `Atualizar dados do mundo`, voltou a 39 agentes, 9 prédios medidos, 0 jobs e status `ONLINE`. Sem erro JS no console, mas a recuperação após reload não foi automática nesta tentativa; manter este ponto aberto para correção da sincronização inicial.

### UI-151 — Controles de escala e câmera não eram conectados ao renderer WebGL

- Prioridade: `P1` · Estado: `VERIFIED` na VPS · Rota: `#city` no painel Codex (viewport compacto).
- Evidência/reprodução: `bootIsoCity()` retornava ao detectar `FENIX_WORLD_3D` antes de registrar `fenixCitySemanticZoom` e `fenixCityZoom`; giro/reset chamavam `window.fenixCity`, inexistente no modo WebGL. O clique não alterava a câmera e o indicador permanecia estático em `1.35x`.
- Correção: registrar adaptadores do HUD antes do retorno do renderer 3D; encaminhar níveis semânticos, zoom, giro, reset e modo dia/noite ao renderer real. O indicador usa a distância atual da câmera; os handlers de giro/reset usam os novos adaptadores.
- Testes locais: `node --test --test-reporter=dot test/city-semantic-zoom.test.js test/world-camera.test.js test/world-camera-reset.test.js test/world-scale.test.js test/city-render-budget.test.js test/city-world3d-view-lifecycle.test.js` — 31/31 passaram; `node --check public/iso-city.js` e `git diff --check` passaram.
- Publicação: patch estático em `iso-city.js?v=6-world-camera-controls`; `index.html` atualizou os handlers de giro/reset. Backup em `/home/deploy/grg-space-rollback/2026-10-21T-world-camera-controls/`; nenhum serviço foi reiniciado.
- Verificação visual: Universo abriu a visão geral; Ilha aproximou a HQ; De Perto focou `Supervisora Camila · AVAILABLE`; `+` mudou o indicador de `0.65x` para `0.79x`; girar mudou a orientação e reset retornou o indicador a `1.00x`. A Cidade manteve 39 agentes, 9 prédios medidos e 0 jobs; sem erros de console.
- Pendente relacionado: a medição prolongada de FPS, tarefas longas e heap (UI-150) continua aberta. Em De Perto, a câmera pode enquadrar a fachada com o agente dentro do edifício; segue em observação.
- Follow-up local: `bootIsoCity()` sincroniza o rótulo de zoom ao iniciar, antes do retorno para o renderer WebGL; `city-semantic-zoom.test.js` cobre o registro. O cache-buster local está em `20261021-world-camera-controls-2`; ainda não foi validado visualmente na VPS.

### UI-152 — Catálogo de projetos sem identidade visual e sem origem local/VPS imediata

- Prioridade: `P1` · Estado: `FIXED` no checkout; verificação da versão publicada pendente · Rota: `#projects`.
- Evidência: a tela servida mostrou sete registros em uma lista textual; as capturas do launcher local mostram logos, famílias e variantes. A versão hospedada não expõe `MEUS PROJETOS`; o processo da VPS não consegue ler `C:\Users\Dell\Desktop\PROJETOS`.
- Correção local: os cartões aceitam logos PNG reais do catálogo por um endpoint autenticado e confinado a `logos/<logoId>.png`, com fallback legível; o parser não expõe comando de inicialização nem caminho absoluto via URL. A página mantém estado explícito quando o catálogo pertence a outro host.
- Testes: `test/local-project-catalog-integration.test.js` valida o endpoint autenticado e a imagem; `test/local-project-catalog-ui.test.js` valida cartão com logo e fluxos/responsividade em 375/768/1280/1920 px.
- Pendente: publicar o código no host correspondente e conectar o catálogo Windows por uma ponte local autenticada. A captura da VPS não deve listar pastas de `C:\` sem essa ponte; logos de `C:\Users\Dell\Desktop\PROJETOS\logos` ainda não foram enviados ao servidor.
- Critério de fechamento: no Fênix rodando no host local, selecionar Meus Projetos, ver os logos e abrir o workspace/Screen DNA do item selecionado; na VPS, ver os projetos com metadados VPS reais sem apresentar saúde inferida.

### UI-153 — Catálogo Windows exibido como lista estreita e métricas confundiam host local com VPS

- Prioridade: `P1` · Estado: `FIXED` no checkout; VPS pendente · Rota: `#projects` → `MEUS PROJETOS`.
- Evidência: captura do Project Hub mostra cartões textuais em coluna; a referência do launcher Windows organiza projetos como tiles com identidade visual. O catálogo tem 41 caminhos válidos, 13 logos cadastrados e metadados de grupo/versão/URL/porta, medidos no Windows; esses dados não representam o runtime da VPS.
- Correção: o modo local agora usa uma galeria responsiva com logo, nome, grupo/variante e portas cadastradas; os indicadores identificam contagem de projetos, pastas, URLs e logos locais, separados dos jobs do Project Kernel. A ficha mostra portas como “PC local” e bindings remotos como “VPS”, lista projetos da mesma família e permite alternar entre principal e variantes. Um vínculo para VPS só é exibido com ID/alias/repositório/nome exato não ambíguo, e abre a ficha canônica remota com bindings e timestamps registrados. Sem registros locais, os números ficam como “—” e a tela declara que o catálogo Windows não está conectado. Nenhum status de health é inferido.
- Verificação local: `test/local-project-catalog-ui.test.js` cobre a galeria, métricas por host, seleção, IDE, Screen DNA e viewports de 375/768/1280/1920 px. Captura automatizada em `docs/visual-evidence/2026-10-21/projects-local-card-clarity-1280-after.png`.
- Pendente: a versão publicada ainda não expõe `MEUS PROJETOS`; a VPS não lê o disco Windows. Publicação da galeria e integração dos 41 registros/logos dependem de comparar a versão efetivamente servida, criar uma ponte local autenticada ou sincronizar artefatos selecionados, e validar rollback.

### UI-154 — Foco do agente aproximava a câmera até perder o contexto

- Prioridade: `P1` · Estado: `FIXED` local; VPS pendente · Rota: `#city` → seleção de avatar · Viewports: capturas do usuário entre aproximadamente 850 e 1920 px.
- Evidência: captura fornecida em 21/10/2026 mostra agente ocupando área excessiva, com terreno e via ampliados e edifícios fora do enquadramento; o handler usava foco próximo.
- Causa: seleção do mesh e foco pela ação externa usavam 32 unidades, aproximando demais a câmera para o mapa exibido com o Inspector aberto.
- Correção local: ambos usam 44 unidades, mantendo o avatar legível com mais contexto do bairro.
- Teste: `test/city-agent-inspector-layout.test.js` confirma a distância contextual e impede o retorno ao enquadramento excessivamente próximo.
- Critério de fechamento: na versão servida, clicar em agentes próximos e distantes mantém corpo e placa legíveis junto de parte do edifício ou da via, sem salto de zoom.

### UI-155 — Inspector do agente excedia viewport e variava de tamanho

- Prioridade: `P1` · Estado: regras responsivas publicadas; validação visual do Inspector pendente · Rota: `#city` → Inspector do agente · Viewports: 375, 768, 1280 e 1920 px.
- Evidência: capturas de 21/10/2026 mostram proporção excessiva e conteúdo com espaçamento irregular; drawer herdava larguras fixas de 400/420 px e altura baseada somente em `100vh`.
- Causa: regras globais não consideravam a largura estreita, as barras superior/inferior e o fluxo de rolagem do conteúdo.
- Correção local: composição HIG usa tokens de superfície e raio, limita largura por viewport, reserva espaço para topbar e dock, rola o conteúdo dentro do painel e mantém cabeçalho/abas/ações acessíveis. Em celular, o Inspector usa quase toda a área disponível com margem uniforme.
- Teste: `test/city-agent-inspector-layout.test.js` mede limites horizontais e verticais nos quatro viewports e cobre o painel rolável.
- Publicação estática 21/10/2026: regras de proporção e rolagem foram aplicadas em `/opt/fenix-os/public/city-sidebar-overlay-fix.css` (SHA-256 `89fa58bc3af4260ddc3f291f47a96bbd775051363b594bf4f522aefc90901010`); HTML aponta para `inspector-proportions-3`. O teste visual do drawer legado e do Inspector da Cidade passa em 375, 768, 1280 e 1920 px. Backup: `/home/deploy/grg-space-backups/city-visual-20261021-01/`. O Inspector real ainda precisa ser aberto e inspecionado no navegador antes de `VERIFIED`.
- Critério de fechamento: após publicação, conferir Inspector de agente e entidade em navegador; nenhum elemento sai da tela ou encobre fechamento e ações.

### UI-156 — Agentes ociosos não tinham gesto visual de repouso

- Prioridade: `P2` · Estado: `FIXED` local; publicado na VPS, validação visual do gesto pendente · Rota: `#city` · Área: presença dos avatares em baixa distância.
- Evidência: captura de 21/10/2026 mostra avatares estáticos mesmo no foco próximo. O loop só permitia pequenos gestos de cabeça quando o agente estava trabalhando.
- Correção local: avatares em quadro e a menos de 60 unidades podem fazer um olhar sutil; agentes ocupados mantêm amplitude ligeiramente maior. Nenhuma coordenada, tarefa, status ou destino é alterado. Caminhada continua exigindo rota/destino do runtime.
- Teste: `test/city-agent-inspector-layout.test.js` verifica o gesto de olhar; `test/city-world3d-sync-reconciliation.test.js` verifica o gesto ocioso sutil sem classificá-lo como trabalho; `test/city-render-budget.test.js` mantém as salvaguardas de atividade real.
- Atualização 21/10/2026: a versão servida agora permite detalhe de avatar até 42 unidades e um giro de cabeça de baixa amplitude quando o agente está ocioso. A caminhada segue condicionada a rota/destino real. GET do bundle `city-presence-inspector-8` confirmou essas duas regras; SHA-256 servido `5fce4fe53091ace6618c4269ed7881d171cb0d00a57fb1b4c216f26145edf6c8`. A página foi recarregada no navegador, mas falta capturar um agente em primeiro plano para validar o gesto visualmente.
- Critério de fechamento: comparar uma cidade sem jobs e uma com job real na versão servida; repouso deve parecer vivo sem movimento de posição, e caminhada/gesto de trabalho deve corresponder a job/destino medido.

### UI-157 — Seleção do agente duplicava o painel de detalhes

- Prioridade: `P1` · Estado: `FIXED` local; camada CSS publicada, visual do Inspector pendente · Rota: `#city` → selecionar agente → Inspector aberto.
- Evidência: capturas do usuário e reprodução em 21/10/2026 mostram o cartão compacto “Detalhes da seleção” sobre o mapa junto do Inspector completo; o cartão tapa cenário e controles em viewports estreitos.
- Causa: `fenix-world-ui.js` mantém visível o contexto da entidade enquanto `fenix-operational-os.js` abre o drawer compartilhado para a mesma seleção.
- Correção local: esconder o cartão compacto enquanto o drawer está aberto; o CSS restaura o cartão imediatamente quando o drawer fecha. O foco do agente agora preserva mais contexto do bairro (44 unidades) tanto na seleção 3D quanto na ação “Ver na Cidade”.
- Teste: `test/city-agent-inspector-layout.test.js` reproduz a sobreposição nos viewports 375, 768, 1280 e 1920 px, verifica retorno do cartão ao fechar e protege o foco contextual.
- Critério de fechamento: validar na versão servida que selecionar um agente abre somente um painel de detalhes, preserva controles essenciais e não amplia o avatar a ponto de cortar edifícios ou vias.
- Publicação 21/10/2026: `city-inspector-layer.css` foi servido com o hash local correspondente; `index.html` referencia a camada e o navegador autenticado carregou a Cidade. Ainda não foi aberto o Inspector do agente no navegador para confirmar visualmente a ausência de duplicação; por isso permanece pendente de verificação.

### UI-158 — Agentes sem posição medida parecem soltos no terreno

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` · Viewports: capturas do usuário, 21/10/2026.
- Evidência: avatares aparecem isolados em áreas abertas e sem estação visual associada. A captura atual do navegador informa 39 agentes e 0 jobs ativos.
- Diagnóstico atual: quando não há coordenadas, o renderer calcula uma posição estável no distrito para evitar empilhamento. Isso é uma estimativa, não uma posição operacional. Sem job ativo e sem `movementState: WALKING` com destino medido, a API não autoriza animação de caminhada; manter agentes parados é coerente com a telemetria disponível.
- Melhoria proposta: associar a apresentação estimada a edifícios/estações compatíveis com os dados reais de agente e tornar a origem da posição visível; oferecer repouso visual legível sem alterar localização ou estado. Movimento só acompanha rota publicada pelo runtime.
- Critério de fechamento: agentes com vínculo medido ficam associados ao prédio correspondente; agentes sem vínculo são explicitamente estimados; nenhum movimento é sintetizado; a leitura permanece clara em plano geral e foco próximo.

### UI-159 — Personagens e materiais da Cidade 3D ainda têm acabamento de protótipo

- Prioridade: `P2` · Estado: `OBSERVED` · Rota: `#city` · Evidência: capturas do usuário, 21/10/2026.
- Evidência: corpos construídos com primitivas simples, pouca variedade perceptível no enquadramento geral e piso/objetos com baixa leitura visual. O Inspector aumenta o problema quando o foco é muito fechado.
- Diagnóstico atual: perfil por papel já altera paleta, cabelo, acessórios e escala, porém isso não substitui um modelo de personagem com silhueta coesa e materiais calibrados. O renderer limita pixel ratio e FPS para conter carga na GPU; subir resolução sem medição pode agravar o lag relatado.
- Melhoria proposta: compor uma família de modelos leves e reutilizáveis, com variações permitidas pelo Avatar Studio, LOD por distância e materiais consistentes com os tokens visuais HIG do Fênix. Medir FPS e memória gráfica antes/depois na mesma cena.
- Critério de fechamento: capturas comparativas em 375, 768, 1280 e 1920 px mostram silhuetas legíveis, variação reconhecível e materiais sem borrão ou clipping, mantendo o orçamento de renderização aprovado.

### UI-160 — Mapa de telas declarava a projeção legada da Cidade

- Prioridade: `P2` · Estado: `FIXED` local; VPS pendente · Rota: `#city`, `#runtime` → mapa de contratos.
- Evidência: `fenix-world-3d.js` consome `/api/v2/living-city/state`, mas os manifestos do QA e do catálogo público declaravam `/api/v2/city/state`, uma rota antiga ainda registrada com outra projeção.
- Correção local: ambos os manifestos agora apontam Cidade e Runtime para o endpoint do mundo operacional; o manifesto não declara que a rota ou a tela foi verificada em runtime.
- Teste: `test/project-screen-domain-map.test.js`, `test/project-screen-manifest-public.test.js`, `test/screen-function-map.test.js` e `test/screen-shell-assets.test.js`.
- Critério de fechamento: publicar o manifesto e confirmar no catálogo que os endpoints declarados correspondem aos consumidos pela versão ativa.

### UI-161 — Atalho “De Perto” enquadra o agente dentro da geometria do prédio

- Prioridade: `P1` · Estado: `FIXED` no bundle VPS; verificação visual do agente selecionado pendente · Rota: `#city` → botão `De Perto` · Viewport observado: canvas 716 × 969 CSS px, 21/10/2026.
- Evidência: Inspector identifica `Debug Agent`, porém após `De Perto` o mapa mostra a área industrial e o rótulo `Supervisora Camila · AVAILABLE`; o avatar selecionado não fica claramente enquadrado. O controle mostra `2.96x`. Captura feita no navegador da VPS; runtime indicava 39 agentes e 0 jobs ativos.
- Causa confirmada no código local: quando há ID selecionado, mas o mesh e as coordenadas do registro ainda não estão disponíveis, `setSemanticLevel('agent')` caía no mesh da Camila. A correção anterior do foco e a nova escala, isoladas, não bastaram para fechar a cadeia visual.
- Correção de câmera publicada: o nível Agent deixa de trocar para Camila quando o registro selecionado não tem posição e usa coordenadas publicadas quando existem.
- Correção publicada nesta sessão: `focusAgent()` consulta mesh/mesh de runtime e coordenadas do agente selecionado antes dos destinos fixos legados. Bundle `city-focus-real-agent-1`; hash servido `26ec089b4dee571a53a5f663d89b6345ab4939d6ebc0133c7f22a79b8f01d6e0`.
- Backup e retorno: cópias de `fenix-world-3d.js` e `index.html` verificadas por SHA-256 em `/home/deploy/grg-space-backups/city-focus-agent-20261021-01/`; processo estático confirmado como `node /opt/fenix-os/frontend-gateway.js`, PID 1720936. Nenhum serviço reiniciado.
- Testes locais: `city-agent-inspector-focus.test.js`, `world-camera.test.js` e `city-agent-inspector-layout.test.js` passaram; o navegador recarregou o bundle novo, recuperou os 39 agentes/9 prédios medidos após sincronização manual e permaneceu `ONLINE`. O console não mostrou erros JavaScript.
- Critério de fechamento: selecionar um agente real e demonstrar que o mesmo avatar fica inteiro no enquadramento com contexto útil em 375, 768, 1280 e 1920 px. Até isso acontecer, não marcar `VERIFIED`.

### UI-162 — Inspector de IDs conhecidos ignora a posição medida do agente

- Prioridade: `P1` · Estado: `FIXED` na VPS; confirmação visual do foco pendente · Rota: `#city` → selecionar agente → “De Perto”/Inspector.
- Evidência: capturas do usuário mostram o Inspector do `CEO Agent` enquanto a câmera enquadra uma área fixa do mapa; o runtime atual lista agentes reais, mas não há job ativo.
- Causa reproduzida: `focusAgent()` priorizava coordenadas fixas por ID (por exemplo, `agent-api-ops`) antes de consultar o mesh do registro selecionado. A seleção podia abrir o Inspector certo e mover a câmera para outro ponto.
- Correção: mesh/mesh de runtime e coordenadas publicadas do registro selecionado são consultados antes dos destinos legados por papel. Os destinos fixos continuam somente como fallback quando não há posição medida. Bundle VPS `city-focus-real-agent-1`; backup verificado no diretório citado em UI-161.
- Teste de regressão: `test/city-agent-inspector-focus.test.js` reprova antes da correção para um ID conhecido com mesh real e também verifica o fallback legado sem posição.
- Verificação local: `node --test --test-reporter=dot test/city-agent-inspector-focus.test.js test/world-camera.test.js test/city-agent-inspector-layout.test.js` passou; `node --check public/fenix-world-3d.js` e `git diff --check` passaram.
- Critério de fechamento: a mesma seleção permanece visível no centro do enquadramento após testar o clique real no navegador em 375, 768, 1280 e 1920 px; até isso acontecer, manter pendente de verificação visual.

### INT-001 — Project Hub mistura catálogo Windows e workspaces da VPS

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `#projects` → catálogo Fênix · Evidência: sessão autenticada da VPS em 21/10/2026, catálogo exibe 7 projetos de kernel; inspeção local encontrou 41 entradas em `Desktop\PROJETOS`.
- Causa: `local-project-catalog.js` lê o arquivo do host que executa o backend. Na VPS, esse processo não pode ler `C:\Users\Dell\Desktop\PROJETOS`; os dois catálogos representam máquinas diferentes.
- Risco funcional: a ação legada `/api/v2/projects/:id/open-computer` monta uma chamada ao DeviceManager, mas o backend pode responder sucesso mesmo sem confirmação de execução; a implementação local de `computer.openApplication` também pode devolver estado `RUNNING` simulado.
- Critério de fechamento: indicar origem (PC Windows, workspace VPS ou GitHub), mostrar checks com timestamp, e “Abrir no PC” só responder sucesso após ACK autenticado de um agente Windows online que confirme o projeto/editor aberto. Atualizar a tela e validar caminho e versão por projeto.
- Próxima ação: implementar primeiro protocolo de ACK/autenticação do agente e estados explícitos; não mascarar como “aberto” o resultado de despacho ou simulação.

### UI-163 — Clique no cartão abre dossiê duplicado sobre o Inspector canônico

- Prioridade: `P1` · Estado: `FIXED` na VPS; verificado no fluxo autenticado, ainda sem matriz dos quatro viewports · Rota: `#agents` → selecionar agente → `Ver na Cidade` → `#city`.
- Evidência reproduzida antes da correção: selecionar `Alex - API Operations` abria simultaneamente `fenixAgentDossierModal` e `fenixInspectorDrawer`; o dossiê permanecia sobre o mapa após navegar para a Cidade.
- Causa: o listener legado do Avatar Studio abria o dossiê no mesmo clique que selecionava o agente no Inspector runtime. A inspeção ocorria antes de o handler principal marcar o drawer como aberto.
- Correção: o listener legado agora verifica o drawer no próximo ciclo de evento; se o Inspector canônico abriu, fecha qualquer dossiê em vez de sobrepor a interface. A navegação “Ver na Cidade” fecha também o dossiê legado.
- Publicação: `fenix-mascot-sidebar.js` servido com SHA-256 `781a83dc5aa43b75acea136964e6a1b87c28c7d54cde4acec2edd343fb9c3b9b`; cache-busting `20261021-agent-inspector-singleton-1`. `fenix-v11-interactions.js` já servido com `20261021-agent-city-dossier-close-1`. Backup anterior à intervenção em `/home/deploy/grg-space-backups/city-agent-inspector-singleton-20261021-01/`; arquivos originais e cópias tiveram SHA-256 idênticos antes da mudança.
- Validação: navegador autenticado recarregado; seleção de Alex exibiu o `fenixInspectorDrawer` sem `fenixAgentDossierModal`; “Ver na Cidade” abriu `#city` com cartão runtime de Alex e sem o dossiê cobrindo o mapa. Testes locais focados: 17 passaram, 0 falharam. `node --check` dos arquivos servidos passou. Nenhum backend reiniciado.
- Critério de fechamento: validar o fluxo em 375, 768, 1280 e 1920 px e confirmar que o Avatar Studio continua acessível por sua entrada dedicada; manter `FIXED` até essa matriz visual.

### UI-164 — Andar térreo descartado na projeção de agentes

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `/api/v2/living-city/state` → Cidade 3D.
- Evidência: teste de regressão falhou com `floorNum: 0` projetado como `null` por `agent.floorNum || null`.
- Causa: o zero válido do andar térreo era tratado como ausência.
- Correção: a projeção usa nullish coalescing e preserva `0`.
- Teste: `test/living-city-agent-truth.test.js`.
- Validação: 21/10/2026; suíte focada da Cidade e projeções passou; não publicado na VPS.
- Critério de fechamento: andar térreo continua identificável do backend ao seletor/interior no renderer, sem ser confundido com “não medido”.

### UI-165 — Respostas HTTP antigas exibidas como bindings atuais

- Prioridade: `P1` · Estado: `FIXED` local; produção pendente · Rota: `#projects` → detalhes do projeto → Runtime.
- Evidência: respostas `HTTP_200` de 14:31/14:35 ainda apareciam como leitura sem indicar que eram históricas.
- Causa: status e timestamp estáticos no registro eram renderizados como se fossem observação corrente.
- Correção: bindings do catálogo deixam de carregar status/timestamp fixos; a tela distingue sondagem recente autenticada, registro histórico e disponibilidade não medida. O container `4400` foi removido do registro do backend Fênix, e Gerar Ficha usa o health `:8000/health` observado na VPS.
- Testes: `test/project-registry-vps-bindings.test.js`, `test/local-project-catalog-ui.test.js`, `test/project-registry-factual-display.test.js`, `test/project-registry-health-endpoints.test.js`.
- Validação: 21/10/2026; 37 testes focados passaram; layout do catálogo verificado em 375, 768, 1280 e 1920 px com capturas em `docs/visual-evidence/2026-10-21/`. O bundle servido na VPS é diferente e não recebeu esta correção.
- Critério de fechamento: publicação somente após reconciliar versão/hash e testar as mesmas quatro larguras na instância autenticada.

### UI-166 — Catálogo Windows de projetos não conectado ao Project Hub da VPS

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `#projects` → MEUS PROJETOS.
- Evidência: `C:\Users\Dell\Desktop\PROJETOS\projetos.json` possui 41 entradas; a sessão GRG aberta informa 7 projetos registrados. O runtime Linux procura `~/Desktop/PROJETOS/projetos.json`, ausente em `/root`.
- Causa: o servidor remoto não tem acesso ao disco Windows nem existe pareamento de agente local comprovado.
- Próxima ação: bridge local autenticada e revogável para catálogo, abrir pastas e IDE; transmitir metadados mínimos e limitar operações a diretórios autorizados. Não anunciar `C:\` como workspace VPS.
- Critério de fechamento: catálogo Windows aparece com origem/versão/caminho identificados e o agente local confirma abertura da pasta/editor; sem bridge ativa, controles locais devem permanecer indisponíveis explicitamente.

### UI-167 — Inspector do edifício não mostra andares nem salas registradas

- Prioridade: `P1` · Estado: `FIXED` local; verificação visual na Cidade pendente · Rota: `#city` → selecionar edifício → Inspector.
- Evidência: capturas enviadas em 21/10/2026 mostram o Inspector identificando o edifício, mas sem estrutura interna navegável; o modelo canônico já fornece `floors` e admite `rooms` por `floorNum`.
- Causa: o Inspector consultava o registro canônico, porém só renderizava status, saúde e agentes; não projetava a estrutura persistida.
- Correção local: painel de andares deriva do número real de andares e lista somente salas do registro. Andares sem salas são marcados “Sem salas cadastradas”; cada andar tem atalho para focar o nível por `fenixCity.enterBuilding(id, floorNum)`. Não cria cômodos fictícios.
- Teste: `test/living-city-building-inspector-truth.test.js` verifica andar térreo `0`, sala cadastrada, andar vazio e chamada de foco.
- Critério de fechamento: validar em navegador que o edifício selecionado, a quantidade de andares, as salas persistidas e o foco de nível correspondem ao estado real em desktop e viewport estreito.

### UI-168 — Relatório visual de QA exibe total aprovado maior que total de telas

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: tela Browser QA · Evidência: captura enviada em 21/10/2026 mostra “TOTAL TELAS: 16” e “PASSOU: 17”; o JSON local de readiness contém outro snapshot (15 telas, navegação bloqueada por timeout em `127.0.0.1:4400`).
- Causa: ainda não determinada; os números podem vir de agregações/snapshots diferentes. O registro local não prova que é o mesmo build apresentado na captura.
- Critério de fechamento: regenerar relatório de uma única execução identificada, conferir invariantes (`passou + falhou <= total`) e abrir os detalhes das linhas incluídas; não exibir PASS global se a navegação estiver bloqueada.

### UI-169 — Telemetria de atividade do agente não é correlacionada no Inspector

- Prioridade: `P1` · Estado: `FIXED` local, confirmação contra stream autenticado pendente · Rota: `#city` → Inspector de agente.
- Evidência: capturas mostram “último evento não informado” apesar de existir uma área global de eventos; o Inspector apresentava apenas `lastEvent` do snapshot e execuções pré-carregadas.
- Correção local: Inspector consulta `/api/v2/living-city/events?limit=100` com sessão autenticada e exibe até oito eventos cujo payload contém o ID canônico do agente; timeout/falha vira estado vazio explícito. Eventos sem correlação não são atribuídos ao agente.
- Teste: `test/agent-inspector-source-truth.test.js` protege a rota, filtro por ID e estado vazio.
- Critério de fechamento: na sessão autenticada da VPS, executar uma ação real correlacionada e confirmar ID, descrição e timestamp no Inspector; comparar com EventBus/JobEngine.

### INT-002 — Controle de sessões BAI ainda não expõe instâncias executando

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `#browser` / Inspector do agente · Evidência: adapter local `src/browser/bai-adapter.js` declara `runningInstances`, `executorHeartbeat` e `jobListing` como `NOT_EXPOSED_BY_BAI_API`; capturas do usuário mostram somente telas de QA e projetos, sem viewer de instância BAI.
- Causa: a integração atual consulta identidade, metadados de perfis e hosts; não há contrato comprovado para criar/abrir instâncias, stream de eventos ou viewer ao vivo.
- Mapeamento atualizado: o BAI Electron possui IPC real para `snapshot/create/start/stop/runFlow` e mantém contextos Playwright locais; a API de equipe suporta tarefas `start/stop` com lease, mas seu callback ainda precisa ser integrado e supervisionado no host. Ver [`GRG_SPACE_BAI_INTEGRATION_MAP_2026-10-21.md`](GRG_SPACE_BAI_INTEGRATION_MAP_2026-10-21.md). Isso não prova execução remota nem acesso do Fênix ao viewer.
- Critério de fechamento: definir contrato autenticado e permissões no BAI; provar heartbeat, execução, stop/reconnect e visualização de sessão com dados não secretos. Senhas, cookies e tokens não podem aparecer em tela/log nem ser sincronizados sem armazenamento protegido.

### UI-170 — Edifícios sem planta abriam o interior de outro projeto

- Prioridade: `P1` · Estado: `FIXED` local; confirmação no navegador pendente · Rota: `#city` → entrar em prédio/andar.
- Evidência reproduzida no código: `BuildingInteriorSystem.enter(id)` usava o blueprint `dev-loft` como fallback para qualquer ID desconhecido. O mundo canônico usa IDs como `bld-fenix-hq` e `bld-api-platform`, que não eram resolvidos pelo catálogo visual; o operador podia ver uma planta alheia sem aviso.
- Correção local: aliases explícitos somente para blueprints existentes (`bld-fenix-hq` e `bld-dev-loft`); IDs sem planta agora retornam indisponível e disparam `fenix:city:interiorUnavailable`. O Inspector mostra “Planta 3D não modelada” e não oferece foco para pisos sem blueprint correspondente. Solicitar um índice acima dos pisos modelados não é mais limitado silenciosamente ao último piso.
- Testes: `test/city-building-interior-identity.test.js` e `test/living-city-building-inspector-truth.test.js`.
- Critério de fechamento: abrir cada edifício canônico no navegador e confirmar que aliases, número de pisos modelados e salas correspondem à planta escolhida; prédios sem estrutura persistida permanecem explicitamente sem interior.

### UI-171 — Cartão/avatares de agente desproporcionais em zoom de proximidade

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` → selecionar agente → Inspector/De Perto.
- Evidência: capturas do usuário em 21/10/2026 mostram avatar low-poly muito pequeno em visão geral e excessivamente grande em zoom próximo; o rótulo de estado se sobrepõe visualmente ao personagem e o Inspector ocupa proporção alta da viewport estreita.
- Causa: a câmera e o tamanho do avatar usam escalas distintas entre overview e foco; ainda não há uma validação visual conjunta do canvas, avatar, placas e Inspector nas larguras-alvo.
- Critério de fechamento: avatar selecionado permanece inteiro, reconhecível e sem colisão com placa/Inspector em 375, 768, 1280 e 1920 px; câmera mantém contexto útil e registra o ID canônico selecionado.

### UI-172 — Cidade exterior não comunica a estrutura interna real dos edifícios

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` → edifício → andares/salas.
- Evidência: capturas do usuário mostram massa de prédios/galpões com pouca leitura de escala interna; a API observada registra andares, mas muitos edifícios não têm salas ou blueprint 3D. A ausência de planta não deve ser substituída por um interior alheio.
- Causa: geometria exterior e registro de andares/salas são fontes separadas; não existe ainda uma planta visual versionada que mapeie cada cômodo persistido.
- Próxima ação: mapear entidades canônicas (`buildingId`, pisos, salas, projeto associado) e desenhar plantas por dados registrados, marcando explicitamente os níveis sem layout.
- Critério de fechamento: abrir prédio e galpão reais, percorrer cada piso persistido e confirmar que a planta/nomes/quantidades correspondem ao backend; entradas não mapeadas devem mostrar estado indisponível, nunca sala fictícia.

### UI-173 — Métrica de URL local dava a entender que o sistema estava acessível

- Prioridade: `P2` · Estado: `FIXED` local, teste de interface aprovado · Rota: `#projects` → MEUS PROJETOS.
- Evidência: a métrica contava objetos com `localUrl`, mas o rótulo “URLs locais cadastradas” era facilmente interpretado como sistemas ativos; o catálogo não verifica listeners.
- Correção: rótulo alterado para “URLs locais configuradas”, mantendo o valor como contagem de configuração. Os detalhes continuam separando portas cadastradas de listener/health não verificados.
- Teste: `test/local-project-catalog-ui.test.js` verifica o texto da métrica e estados de portas locais; execução em quatro larguras incluída no cenário de UI.
- Critério de fechamento: mantido como correção local até a interface publicada mostrar o novo rótulo; não equivale a medição de disponibilidade.

### UI-174 — Cidade reabre com enquadramento salvo excessivamente aproximado

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` → recarregar sessão existente.
- Evidência: na sessão VPS observada, o zoom estava em `2.96x` e exibia uma área parcial; o controle “resetar câmera” mudou para `0.70x` e enquadrou o conjunto da Cidade sem alterar agentes ou prédios.
- Causa provável: a câmera restaura distância persistida no navegador. Ainda não foi isolado se a distância veio de uma preferência intencional ou de uma sessão anterior que terminou em foco de agente/edifício.
- Critério de fechamento: reproduzir em sessão nova, com preferência ausente e com preferência salva; a primeira abertura deve enquadrar a cidade e a escolha manual deve persistir apenas nos retornos da mesma sessão/preferência, sem restaurar um foco antigo como visão inicial.

### REA-001 — Analisar projeto desconhecido caía no projeto Fênix padrão

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `POST /api/v2/rea/analyze`.
- Evidência: teste autenticado com workspace temporário reproduziu a rota retornando `projectId: fenix-os` ao solicitar `project-map-ui`.
- Causa: rota passava o ID direto ao REA; quando não estava no registry, o resolver escolhia silenciosamente o projeto padrão.
- Correção: projeto autenticado é resolvido pelo store/registry/catálogo e workspace canônico; IDs desconhecidos, workspaces ausentes e projetos de arquivo único têm erros explícitos. Evidência é persistida na memória do projeto. A leitura não usa cache global sem escopo, evitando devolver resultado de outro tenant.
- Teste/evidência: `test/rea-project-workflow-ui.test.js` verifica ID, caminho real, rota observada, persistência/recuperação, rejeição do cache global e UI.
- Critério de fechamento: passou no teste local de API e navegador. Versão VPS ainda não validada.

### UI-175 — Flow Graph de projeto criava módulos e build sem evidência

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#projects` → Inteligência do Sistema → Flow Graph do projeto.
- Evidência: resolver do Flow Graph criava três módulos genéricos, declarava um build `SUCCESS` sem executar build e podia anexar jobs de outros projetos quando não havia jobs vinculados.
- Causa: contexto PROJECT montava entidades estáticas e tinha fallback global de jobs.
- Correção: Flow Graph lê a evidência REA persistida do projeto e desenha módulos, pacotes, rotas e relações observados; jobs ficam limitados ao ID do projeto. Build, módulos genéricos e padrões sem vínculo foram removidos desse contexto.
- Teste/evidência: `test/rea-project-workflow-ui.test.js` abre o grafo no navegador e confirma módulo observado presente e nós genéricos/build ausentes.
- Critério de fechamento: passou no fixture local. Comparação com projetos publicados e execução na VPS continua pendente.

### UI-176 — Inspector do agente não abria o histórico filtrado

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: `#city` → selecionar agente → atividade.
- Evidência: a página de agentes já consultava `/api/v2/events/history`, mas o Inspector da Cidade não tinha uma ação direta que preservasse o ID selecionado no histórico.
- Correção: botão “📜 Ver atividade e histórico real” navega para Agentes, atualiza o Event Store e filtra pelo ID canônico; se o agente não estiver nos últimos eventos, o filtro ainda preserva o ID e mostra o estado vazio correto.
- Teste/evidência: `test/agent-activity-filter.test.js` passou (3/3); `node --check` nos scripts do Inspector e atividade.
- Fechamento local: fluxo conectado ao endpoint real; quantidade de eventos continua limitada pelo contrato atual de histórico (100 por consulta). VPS não revalidada.

### INT-003 — Preferências visuais do projeto não eram recuperadas pelo Fênix

- Prioridade: `P1` · Estado: `VERIFIED` local · Rotas: `#projects` → Inteligência, IDE → Design, conversa Fast Lane.
- Correção: perfil de design 1.1 com proveniência explícita é salvo na memória do projeto e na memória universal; Hub, IDE e Flow Graph usam o mesmo perfil. O chat consulta memórias autenticadas e acrescenta somente regras internas fixas quando encontra uma chave estável esperada; conteúdo livre da memória não é executado nem copiado para o prompt.
- Critério/evidência: o teste de navegador verifica gravação nos dois escopos, nó `CONFIGURED` no Flow Graph e abertura a partir da IDE; `test/conversation-memory-context.test.js` verifica uso e isolamento de conteúdo arbitrário.
- Fechamento local: testes passaram em 22/10/2026; comportamento na versão VPS continua pendente.

### INT-004 — Fênix não recuperava o mapa REA no contexto da conversa

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#projects` → análise REA persistida → conversa Fast Lane com projeto selecionado.
- Evidência: antes da correção, o prompt consultava preferências visuais, mas não a memória `rea-evidence:<projectId>`; a conversa não recebia stack, rotas nem identificação da evidência do projeto atual.
- Correção: o prompt consulta evidência autenticada e vinculada ao projeto selecionado, valida ID/proveniência/formato e inclui apenas hash curto, contagens, stack e rotas allowlisted. Unknowns ficam como contagem; instruções/conteúdo livre nunca entram no prompt. Falta de evidência não interrompe conversa e análise estrutural não é tratada como estado runtime.
- Critério/evidência: `test/conversation-memory-context.test.js` verifica fatos do projeto atual, rejeição de texto livre e continuidade com memória indisponível; `test/rea-project-workflow-ui.test.js` verifica o intake de projeto, regras de controles e persistência do perfil universal.
- Fechamento local: testes de conversa e fluxo Project Hub/REA/Flow Graph passaram em 22/10/2026. VPS sem atualização ou revalidação.

### REA-002 — Cobertura limitada do mapa e rotas de teste misturadas a endpoints

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: Project Hub → Inteligência/REA → Flow Graph e conversa com projeto selecionado.
- Evidência: a varredura anterior podia consumir a cota com arquivos de teste/ferramentas, contar literais desses arquivos como rotas e não indicar que a análise foi truncada. No workspace atual a cota 400 ainda é alcançada; logo o mapa integral permanece pendente.
- Correção: arquivos de runtime têm prioridade sobre testes/ferramentas/gerados; rotas expostas são separadas de chamadas do frontend; a evidência reporta `fileLimit`, `filesTruncated`, `routesDetected`, `apiCallsDetected` e `routeEvidenceTruncated`.
- Teste/evidência: `test/rea-evidence-coverage.test.js` cobre escopo de rota, classificação endpoint/chamada, prioridade e truncamento. Varredura local real: `rea_ev_b11ddb04313d`, truncada no limite 400; não persistida em produção.
- Critério: a cobertura truncada é visível e rotas de teste não são apresentadas como endpoints implementados. Mapeamento integral/paginação de projetos grandes continua pendente.

### UI-177 — Avatares não mantêm leitura consistente entre overview e proximidade

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` → visão geral, foco de agente e Inspector.
- Evidência: capturas fornecidas mostram agentes pequenos e pouco variados no mapa e avatar ampliado com placa próxima/sobreposta na câmera de foco. As capturas provam o problema visual; a relação exata com zoom, escala do asset e câmera ainda precisa ser reproduzida por viewport.
- Critério de fechamento: manter o agente reconhecível, com placa sem colisão e câmera contextual em 375, 768, 1280 e 1920 px; animação só é exibida quando ligada a estado/ação real do agente.

### UI-178 — Mensagens rápidas disputavam o início da mesma conversa

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: sidebar Fênix → enviar duas mensagens em sequência.
- Evidência: a captura do usuário mostra mensagens consecutivas sem resposta entre elas; o cliente iniciava uma requisição por mensagem e só recebia o ID canônico depois da primeira resposta.
- Correção: mensagens comuns digitadas dentro de 320 ms são apresentadas individualmente no chat e enviadas juntas ao provider como um turno contextual. Requisições seguintes aguardam a conclusão anterior e reutilizam o `conversationId` retornado.
- Teste/evidência: `test/sidebar-hig-density.test.js` envia duas mensagens com intervalo de 100 ms, confirma um POST com as duas linhas e verifica o ID do turno seguinte. O endpoint é interceptado pelo teste; isso não prova provider ativo na VPS.

### UI-179 — Timer de resposta simulava décimos e atualizava sem usar o relógio

- Prioridade: `P2` · Estado: `FIXED` local · Rota: sidebar Fênix → Fast Lane.
- Evidência: implementação incrementava `0.1s` a cada callback, acumulando deriva e exibindo precisão que não era medida.
- Correção: exibe segundos inteiros calculados a partir de `Date.now()` no início do pedido.
- Teste: `test/chat-fastlane-interaction.test.js` confirma o cálculo pelo relógio e bloqueia retorno do contador sintético.

### UI-180 — Ações rápidas não podiam ser editadas pelo operador

- Prioridade: `P2` · Estado: `VERIFIED` local · Rota: sidebar Fênix → Ações rápidas.
- Correção: disclosure “Ações rápidas” agora permite adicionar, remover e reordenar até oito comandos por contexto, com persistência em `localStorage`; conteúdo customizado é escapado antes de renderizar. O editor permanece recolhido até ser solicitado.
- Teste/evidência: `test/sidebar-hig-density.test.js` adiciona e remove uma ação no navegador, verifica persistência e testa overflow em 375, 768, 1280 e 1920 px.

### UI-181 — As vias principais da Cidade tinham asfalto quase preto e sem borda legível

- Prioridade: `P2` · Estado: `FIXED` local, QA visual pendente · Rota: `#city` → mapa 3D.
- Evidência: captura fornecida mostra vias praticamente pretas; o renderer usava base `#181e29`.
- Correção local: asfalto passou para `#343c46`, com grão mais claro; foram adicionados segmentos de guia de concreto nas arteriais, deixando a interseção central livre e preservando faixas amarelas e faixas de pedestre.
- Teste: `test/city-street-legibility.test.js` verifica material, guias e sinalização. A versão local ainda precisa de captura comparativa para mudar a estado `VERIFIED`.

### UI-182 — Agentes parados sem atividade visual verificável

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: `#city` → overview 3D.
- Evidência: capturas fornecidas mostram vários agentes estáticos e fora das áreas edificadas. O renderer só deve mover personagens quando a API publica movimento/ação canônicos; parte do estado observado não contém coordenadas ou `movementState` demonstráveis.
- Próxima ação: mapear cobertura de posição, atividade e eventos persistidos por agente; identificar separadamente coordenadas medidas e ausentes antes de completar animações e rotas visuais. Não gerar movimento que pareça execução real sem evento correspondente.
- Critério de fechamento: missão em execução atualiza a posição/atividade do agente correto e a mudança chega pela fonte real; agentes sem telemetria aparecem como disponíveis/sem posição medida.

### UI-183 — Fast Lane recebe `AI_PROVIDER_UNAVAILABLE` no ambiente mostrado

- Prioridade: `P0` · Estado: `OBSERVED` · Rota: sidebar Fênix → conversa normal.
- Evidência: capturas do usuário mostram respostas com `AI_PROVIDER_UNAVAILABLE`; o endpoint local usa o roteador real e retorna indisponibilidade quando nenhum provider completa a inferência. O navegador de QA usou resposta controlada só para testar coalescência, não provider real.
- Próxima ação: validar no runtime local e na VPS catálogo, rota, modelo, health e conectividade do provider configurado. Corrigir apenas com evidência de configuração/runtime; não trocar por `echo` nem exibir resposta simulada.
- Critério de fechamento: pergunta simples retorna resposta do provider identificado, provider/modelo/duração são observados, histórico persiste e o fluxo continua explícito quando o provider está fora do ar. A VPS não foi alterada nem revalidada nesta fatia.

### UI-184 — Copilot da IDE apresentava análise e teste fixos como resultado real

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: IDE → Copilot contextual.
- Evidência reproduzida: `POST /api/v2/workspace/copilot-assist` montava frases determinísticas afirmando sintaxe/imports validados e ausência de regressão sem consultar parser, testes ou provider; no modo de teste emitia `assert.ok(true)` como patch. O cliente ainda podia anexar `testCode` diretamente ao arquivo ativo e concatenava pergunta/resposta em `innerHTML`.
- Correção: rota agora exige pergunta e chama somente `app.llm.chat`; ausência, erro ou resposta vazia do provider retornam falhas explícitas. A resposta inclui provider/modelo/duração reais e não produz patch. O cliente renderiza texto sem HTML interpretável e recusa aplicar payloads sem diff e caminho explícitos.
- Evidência/teste: `test/copilot-assist-provider.test.js` cobre provider conectado, indisponibilidade, proveniência, renderização textual e bloqueio de inserção simulada; `test/conversation-route-real-runtime.test.js` cobre Fast Lane e falha explícita. Os testes focados e `node --check` passaram em 22/10/2026.
- Atualização 22/10/2026: a IDE agora inclui planejamento somente leitura com provider configurado, perfil visual e evidência REA; o operador pode salvar o plano na memória do projeto e vê-lo no Flow Graph ligado ao arquivo/evidência. Depois pode gerar uma proposta de diff temporário. O modal foi medido em 375, 768, 1280 e 1920 px. Testes locais: `test/copilot-assist-provider.test.js` 9/9 e `test/rea-project-workflow-ui.test.js` 1/1; provider de QA foi simulado no fluxo de navegador e nenhum arquivo foi gravado durante revisão. O Flow Graph expõe correspondência de prefixo quando não há hash integral disponível.
- Limite: provider real e sessão visual na VPS ainda pendentes; plano trabalha somente no arquivo aberto; execução multi-arquivo/job não integrada; VPS não atualizada/revalidada.

### UI-185 — Inspector remoto associava DOM de outro produto à tela selecionada

- Prioridade: `P0` · Estado: `OBSERVED` na VPS · Rota: Projetos → Fênix OS → Screen DNA → Inspecionar tela.
- Evidência observada em sessão autenticada, somente leitura, em 22/10/2026: o registro selecionado era `/archive/frontend/grg-apps-ai-city/index.html`; o Inspector abriu o host `http://209.50.241.22:8081/archive/frontend/grg-apps-ai-city/index.html`, mas a aba DOM mostrava `<title>API Platform</title>` e um formulário de login da API Platform. O mesmo painel indicava `28 nós DOM` e `98.5% PARIDADE VISUAL`, apesar do cartão dizer “Captura não registrada”. O título do Inspector apareceu como `undefined`.
- Reprodução: abrir Project Hub autenticado na VPS, selecionar Fênix OS, Screen DNA, primeiro registro e “Inspecionar”; comparar a identidade/rota do registro com `document.title` e conteúdo do preview, depois verificar se há captura e medição que sustentem os números.
- Causa: ainda não isolada. Pode haver divergência entre catálogo implantado, associação de host/arquivo ou ingestão histórica; não tratar a captura como prova de causa.
- Correção/teste: pendentes. O workspace local já rotula registros sem captura/DOM medido e não oferece preview vivo como se fosse captura. Não substituir evidência faltante por reconstrução.
- Critério de fechamento: rota, título, origem e conteúdo medido pertencem ao mesmo app/tela; paridade só aparece com duas versões comparáveis e evidência rastreável; registro sem imagem/DOM usa estado explícito não medido. Revalidar em navegador autenticado e anexar captura antes/depois.
- Versão: Project Hub remoto carregou 718 registros; Flow Graph/telemetria remotos mostraram 39 agentes e 60 jobs. Commit exibido no projeto remoto: `dbbf617b97a0`. Versão servida não correspondeu aos fluxos locais observados; publicação e rollback permanecem pendentes.

### UI-186 — Handoff Screen DNA abria o Flow Graph sem focar a tela de origem

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: Project Hub → Screen DNA → Ver relações no Flow Graph.
- Evidência: no navegador remoto a ação abriu a malha geral do projeto, sem tornar a tela de origem evidente na área visível. O relatório de absorção já alimentava o grafo, mas a seleção não era encaminhada como foco.
- Correção local: o handoff envia o ID canônico da tela como `focusNodeId`; após resolver o grafo do mesmo projeto, o renderer centraliza e seleciona esse nó. A validação também confirma que a tela é nó de Screen DNA antes de aguardar a seleção.
- Teste/evidência: `test/rea-project-workflow-ui.test.js` abriu o grafo e confirmou em navegador que o nó da tela ficou selecionado; a execução completa terminou falhando depois, em etapa preexistente do fluxo de plano, esperando “Plano do projeto pronto para revisão”. Portanto a jornada completa segue pendente.
- Critério de fechamento: abrir a tela selecionada e confirmar que o mesmo ID fica centralizado/selecionado, com relações ao projeto e origem visíveis; repetir no catálogo com mais de 120 telas e na VPS atualizada.
- Limite: local somente. A versão VPS observada continua sem o handoff focado; rollout não realizado.

### INT-008 — Handoff do Project Hub trocava de tela antes de confirmar rascunho da IDE

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#projects` → REA/arquivo → IDE.
- Evidência reproduzida: na VPS, clicar em uma rota do REA mudou para `#ide` antes do diálogo de alterações não salvas; cancelar preservou o buffer, mas deixou o usuário na IDE. A sessão continha um rascunho do usuário; seu conteúdo não foi copiado para o registro.
- Correção: todos os handoffs do Project Hub passam pelo preflight da IDE antes de navegar. Cancelar mantém rota e buffer. Confirmar restaura o conteúdo salvo antes da abertura solicitada, sem disparar uma segunda confirmação.
- Teste: `test/rea-project-workflow-ui.test.js` cobre cancelamento, preservação do buffer, confirmação e abertura do arquivo no projeto correto. O subteste passou em execução local em 22/10/2026; o processo Node permaneceu ativo após emitir o resultado TAP e precisou ser interrompido.
- Limite: `VERIFIED` visual ainda pendente; mudança local não publicada na VPS, cujo processo/rollback não foram identificados nesta fatia.

### INT-009 — Screen DNA apresentava catálogo extenso como cartões sem agrupamento

- Prioridade: `P1` · Estado: `FIXED` local · Rota: `#projects` → projeto → Screen DNA.
- Evidência observada: captura enviada em 22/10/2026 mostra 718 telas em cartões planos com blocos pretos repetidos, dificultando localizar rotas relacionadas; logotipos e versão não aparecem no nó do projeto.
- Correção: catálogo agora agrupa cartões pelo primeiro ramo de rota. Telas sem rota são agrupadas pelo diretório de origem e rotuladas como inferência. O estado sem captura visual ficou compacto e explícito. Nó do projeto mostra logo e versão somente se os metadados reais existirem.
- Testes: `test/project-screen-dna-reality.test.js` passou 14/14; `test/rea-project-workflow-ui.test.js` passou 1/1; `node --check public/project-hub-live.js` e `git diff --check` passaram em 22/10/2026.
- Limite: inspeção visual em 375/768/1280/1920 px e na VPS ainda pendente; a mudança local não foi publicada.

### UI-172 — Cidade mistura controles, resumo duplicado e fidelidade visual insuficiente

- Prioridade: `P1` · Estado: `REPRODUCED` · Rota: `#city` · Evidência: captura enviada em 22/10/2026 (1070×1080) e reprodução DOM na VPS em 22/10/2026 (1033×1088). A barra inferior repete contagens de projetos/agentes já disponíveis no topo; controles flutuantes usam emojis coloridos fora do tema; dois pontos indicados pelo usuário pedem centralização; a Cidade mostra quarteirões e prédios genéricos apesar de dados reais de projetos e estruturas.
- Causa: ainda não determinada. A captura não permite ligar com segurança os dois pontos percentuais a elementos DOM específicos nem validar o snapshot servido pela VPS.
- Atualização local 22/10/2026: os pontos 1 e 2 foram mapeados para os controles 3D/+/- do minimapa; a fileira foi centralizada no próprio mapa. O cartão de métricas redundante do World UI foi removido do DOM; os contadores permanecem nos painéis próprios. Os atalhos usam ícones Phosphor monocromáticos. A imagem 2 também exibe total de verificações diferente do número de aprovadas; o dashboard local agora deriva os dois valores das mesmas linhas e separa itens sem medição. O cache-buster do World UI foi atualizado.
- Atualização local: a captura mais recente ainda mostrava controles desalinhados; a causa foi uma regra concorrente de posição no empilhamento final de CSS. `city-runtime-composition.css` agora fixa o grupo no centro do minimapa, centraliza o conteúdo interno dos botões e mantém os ícones de navegação monocromáticos com destaque na cor do tema. O cartão redundante de projetos/agentes continua removido do chrome da Cidade.
- Validação local: `city-mobile-hig-controls` mediu controles centralizados e layouts em 375, 390, 1072 e 1920 px (`1/1 PASS`); `city-overlay-layout` e `city-navigation-icon-theme` passaram nos testes observados (10 testes). O teste dedicado `design-reference-flowgraph.test.js` passou 1/1 e prova capacidades selecionadas e lacunas. A inspeção visual final da composição alterada segue pendente. A fidelidade da Cidade e seus espaços internos ainda não foi resolvida.
- VPS no registro anterior: **PENDING**. A nota abaixo substitui aquele snapshot: a Cidade VPS foi aberta e a colisão foi reproduzida diretamente; a alteração local ainda não foi publicada. Sem confirmar processo/versão e rollback, não trocar os assets remotos.
- Critério de fechamento: reproduzir a versão e DOM em sessão autenticada, identificar os dois alvos pelas caixas medidas, alinhar controles e remover a contagem redundante sem retirar navegação; substituir emojis por ícones monocromáticos do tema; validar que edifícios, espaços internos e relações do universo usam entidades reais e mostram estados não medidos quando faltarem dados.

- **Reprodução atualizada na VPS (22/10/2026):** em `#city`, 1033×1088, `.fw3-pulse` renderiza `display:flex` em x88/y935 (350×53) e invade o HUD (x220/y923, 660×57) por 218×45 px. O cartão contém contagens redundantes de projetos/agentes/jobs/máquinas/falhas. A regra local `.fw3-pulse{display:none!important}` não está presente no efeito servido; hashes de cinco assets principais diferem local↔VPS. Estado continua `REPRODUCED` na VPS e correção está apenas no checkout. Não é evidência suficiente para atribuir causa à implantação.
- **Validação:** `city-hud-chat-composition.test.js` 1/1 PASS local, quatro larguras cobertas; first paint/auth 5/5 PASS. VPS pós-correção, build pareada e rollback continuam pendentes. Fechar somente após build identificada, visualização autenticada corrigida e critérios acima verificados.

### UI-173 — Controles rápidos da Cidade usavam emojis coloridos

- Prioridade: `P2` · Estado: `FIXED` local · Rota: `#city` → barra flutuante sobre o minimapa.
- Evidência: captura de 22/10/2026; markup local continha cinco emojis coloridos apesar de o tema já prever ícones monocromáticos Phosphor.
- Correção: os cinco botões agora usam ícones Phosphor com cor e hover do tema, mantendo os mesmos IDs, ações e nomes acessíveis.
- Teste: `test/city-navigation-icon-theme.test.js` passou em 22/10/2026.
- Limite: inspeção visual autenticada e publicação VPS pendentes.

### BAI-001 — Integração white-label Fênix↔BAI ainda não tem runtime pareado

- Prioridade: `P1` · Estado: `OBSERVED` · Rota: Project Hub → projetos relacionados → BAI.
- Pedido: integrar BAI e Fênix como projetos relacionados/white-label, com perfis e versões identificáveis; usuários querem abrir/controlar instâncias BAI a partir do mundo Fênix.
- Evidência local: `docs/GRG_SPACE_BAI_INTEGRATION_MAP_2026-10-21.md`; o adapter consulta identidade, perfis e hosts somente via API autenticada. API não expõe instâncias ativas, heartbeat, jobs ou viewer; a janela do desktop está em processo separado.
- Critério de fechamento: contrato pareado/revogável no BAI, conexão de saída autenticada, ACK/lease e telemetria verificáveis, viewer com autorização e redaction; apresentar a relação dos dois projetos sem alegar runtime online antes do heartbeat real. Nunca compartilhar cookies, segredos ou perfis brutos.

### INT-005 — Perfil de design não aceitava escolhas próprias por projeto

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: Project Hub → Inteligência/Design → memória, conversa e Flow Graph.
- Evidência reproduzida: o catálogo apresentava Stitch/Miro/Lovable, mas `Aplicar perfil` persistia os mesmos padrões para todos os projetos. O operador não podia definir App/Web, objetivo, direção visual, fontes de referência ou viewports.
- Correção: formulário de design 1.4 guarda objetivo limitado/normalizado, superfície, direção, fontes allowlisted e larguras selecionadas na memória do projeto. A memória universal mantém só o perfil base. Fast Lane e Copilot recebem o brief explícito e enums validados; Flow Graph expõe escolhas e só cria relações de fontes selecionadas.
- Teste/evidência: `test/rea-project-workflow-ui.test.js` executa REA, configura inputs, valida conteúdo da memória e inspeção do Flow Graph; `test/conversation-memory-context.test.js` comprova uso do perfil e rejeição de texto arbitrário; `test/project-design-preferences.test.js` testa validação/limites. O conjunto focado passou em 22/10/2026.
- Limite: alterações locais apenas; VPS sem sincronização/revalidação. Isto configura a direção/contexto do projeto, mas não cria ainda o canvas navegável do Stitch nem o ciclo Plan→Build do Lovable.

### INT-006 — REA Blueprint usava contrato genérico e a sidebar não consumia o formato retornado

- Prioridade: `P1` · Estado: `FIXED` local · Rota: sidebar Fênix → REA Analyze / Blueprint.
- Evidência reproduzida: a sidebar esperava `data.analysis`/`data.blueprint` e propriedades de contrato antigas, mas as APIs devolviam evidência e blueprint no nível raiz. O caminho alternativo apresentava arquivos, storage, testes e “pronto para execução” sem os observar no projeto.
- Correção local: a geração de blueprint requer evidência REA persistida, autorização `project:read`, SHA e `projectId` compatíveis; contratos sem observação ficam vazios ou `NOT_OBSERVED`; comandos de validação ficam `NOT_RUN`. A UI lê os formatos reais, mostra limites da varredura e não afirma que criou tarefa ou rodou testes.
- Evidência/testes: `test/rea-blueprint-evidence-route.test.js` valida autorização, isolamento por tenant/projeto, evidência obrigatória e ausência de contratos inventados. `test/rea-project-root-selection.test.js` valida o workspace da aplicação Fênix, não a pasta catálogo pai.
- Limite: `test/rea-memory-fastlane.test.js` ainda falha na expectativa histórica de pelo menos 65 telas; o catálogo observado retorna 62. Correções locais, sem captura integrada ou publicação na VPS.

### INT-007 — IDE não tinha proposta de edição com diff antes de gravar

- Prioridade: `P1` · Estado: `FIXED` local, validação visual/provider pendente · Rota: Project Hub → IDE → Propor edição.
- Evidência: o fluxo existente permitia salvar diretamente e o Copilot antigo expunha payloads de análise como se fossem patches; faltava revisão do arquivo completo com hash base antes de escrita.
- Correção local: Copilot em `PROPOSE_EDIT` consulta o provider configurado e retorna proposta estruturada read-only. A IDE cria draft temporário isolado por tenant/ator/projeto, mostra diff real e só aplica após confirmação explícita; aplicação revalida o hash e usa a escrita auditada existente. Fechar a revisão invalida requisições pendentes e descarta drafts que cheguem depois.
- Evidência/testes: `test/copilot-assist-provider.test.js` valida proposta, indisponibilidade, payload inválido e contrato de confirmação; `test/project-workspace-drafts.test.js` valida diff sem escrita, aplicação, hash desatualizado e isolamento.
- Critério de fechamento `VERIFIED`: abrir arquivo em navegador, obter resposta de provider real, confirmar que o conteúdo não muda antes do aceite, aplicar e observar diff/auditoria; testar fechamento durante geração. Provider real, navegador e VPS ainda não foram validados nesta fatia.
- Atualização 22/10/2026: drafts agora persistem no store e podem ser listados/reabertos após reinício; UI da IDE adiciona a lista autenticada e continua exigindo confirmação antes da escrita. Testes API/restart/isolation: 19/19 `PASS`; jornada Playwright REA→preview→plano→diff recuperado→importação DESIGN.md: 1/1 `PASS`. Provider real, inspeção manual e VPS continuam `PENDING`; não marcar como `VERIFIED`.

### FG-001 — Flow Graph apresentava telemetria de aresta sem evidência

- Prioridade: `P1` · Estado: `FIXED` local · Interface: Project Hub → Flow Graph → selecionar uma relação.
- Evidência: arestas sem campos de execução recebiam atividade `false`, subsistema `Fênix Kernel`, cadência `Tempo real`, evento `default.event` e uma execução. O Inspector também afirmava que a relação havia sido estabelecida pelo Fênix. Isso confundia relações estruturais declaradas com execução observada.
- Correção local: campos ausentes ficam `null`; o Inspector informa `Não medida/registrada` e distingue a relação estrutural da telemetria de execução. Propriedades explicitamente fornecidas pela fonte continuam visíveis.
- Reprodução/testes: `test/flow-graph-evidence-truth.test.js` passou 1/1; `node --check public/fenix-flow-graph.js` passou. `test/rea-project-workflow-ui.test.js` imprimiu PASS 1/1 para a jornada REA → Project Hub → Flow Graph; o processo deixou handles ativos e foi interrompido após a conclusão do teste.
- Critério de fechamento: arestas sem atividade permanecem sem medição no catálogo e Inspector em sessão autenticada; executar um caso com telemetria real e confirmar que apenas os campos observados aparecem. Validação visual e versão da VPS: `PENDING`.

### FG-002 — Flow Graph não mostrava proveniência de drafts da IDE

- Prioridade: `P1` · Estado: `FIXED` local · Interface: Project Hub → REA → plano salvo → IDE → draft → Flow Graph.
- Evidência/reprodução: propostas salvas na IDE permaneciam fora do grafo. Não era possível rastrear de forma explícita qual plano REA, evidência, referência selecionada e hash-base originaram um diff aguardando revisão.
- Correção: drafts passam a persistir IDs de evidência/plano/referências e o Flow Graph os desenha como `PENDING_REVIEW`, conectando apenas registros correspondentes. A listagem expõe metadados, nunca o conteúdo do arquivo ou diff; o nó indica `applied: false`.
- Critério/teste local: `test/rea-project-workflow-ui.test.js` percorre a cadeia completa e valida nó/arestas para plano, evidência REA, referência, módulo de origem e estado pendente. Resultado em 22/10/2026: `PASS 1/1`; API de drafts `PASS 4/4`; `node --check` e `git diff --check` passaram.
- Limite: teste de navegador apresentou uma falha intermitente de montagem do preview em uma tentativa e passou nas duas repetições seguintes; causa da intermitência permanece não determinada. Inspeção visual autenticada e versão da VPS: `PENDING`; não publicar sem identificar versão servida e rollback.

### INT-010 — Catálogo Screen DNA não oferecia busca e vistas compactas por projeto

- Prioridade: `P1` · Estado: `FIXED` local · Interface: Project Hub → projeto → Screen DNA.
- Evidência: captura autenticada da VPS em 22/10/2026 mostrava o catálogo como uma sequência extensa de cartões e o contêiner anunciava milhares de itens. A causa/versão do asset servido diverge do código local atual.
- Correção local: busca por nome/rota/arquivo; filtro por captura existente, ausente ou histórica; alternância grade/lista com preferências salvas por projeto; imagens de captura carregam de forma tardia e assíncrona. Ramos de rota e estados observados permanecem explícitos.
- Fechamento local: `test/project-screen-dna-reality.test.js` 15/15; `test/rea-project-workflow-ui.test.js` exercita busca, filtro, layout e persistência após troca de aba. A validar via captura visual em resoluções combinadas.
- Critério pendente: comparar hash e assets da VPS, implantar com rollback verificável, então confirmar busca/layout no runtime de produção. Até essa evidência, a VPS continua `PENDING` e a versão observada é antiga.

### UI-064 — Respostas assíncronas do Project Mirror substituíam a tela selecionada

- Prioridade: `P1` · Estado: `FIXED` local · Rota: Project Hub → Project Mirror → detalhe de tela/runtime · Viewport: harness Chromium.
- Evidência reproduzida: uma resposta lenta de `/api/v2/system/status` podia terminar após a abertura do detalhe e substituir seu preview; uma atualização de `/api/project-mirror` também podia renderizar Overview depois de outra seção ser selecionada.
- Causa: callbacks assíncronos escreviam no contêiner compartilhado sem conferir qual seleção de tela/seção ainda estava ativa.
- Correção: geração de renderização e seção atual; respostas antigas de runtime/tela são descartadas, e o carregamento do snapshot só abre Overview se a seleção não mudou.
- Teste: `test/project-mirror-async-render.test.js` reproduz runtime atrasado e confirma que o detalhe continua selecionado (`1/1 PASS`). Cache-buster atualizado no script servido.
- Limite/fechamento: o teste REA completo em navegador ainda falhou sob pressão de memória local antes/depois desta correção (telemetria registrada em `test/rea-project-workflow-ui.test.js`); inspeção autenticada na VPS e captura visual integrada continuam `PENDING`.
- Checagem remota somente leitura em 22/10/2026: `http://127.0.0.1:3000/index.html` respondeu 200 dentro da VPS; o browser carrega `/project-hub-live.js?v=5-project-conte…`. Hash HTTP do JS `7e248f6d91c5349f45b523bc87e1adaec42adba33753b8a0ef0c3191cd1c129e` e CSS `519e0aa2140ab644e09047ff912440e7556c1d4e1e1634cc4d4e35ffad266692`; hash local do JS `38928aadcedbda9cbf61d21b26e1898b33da5350ad3c9b235ff65b9b68dc44a8` e CSS `a4ba6f7a397c33c5fd3495737b71c0b03483e99052b3193d1844dc44a1c420c6`. Divergência confirmada.
- Operação/rollback: porta 3000 é servida por processos no PM2 de `root` (`/opt/fenix-os/grg/src/server.js` e `/opt/fenix-os/frontend-gateway.js`). `/opt/fenix-os/grg` não tem checkout Git; `deploy` não tem `sudo` sem senha; os containers `fenix_frontend`/`fenix_backend` estão em estado `Created`. Não foi localizado um procedimento de publicação e rollback que permita atualizar sem trocar assets incompatíveis ou reiniciar o serviço errado. Deploy segue `PENDING`.

### FG-003 — Screen DNA não representava a navegação estática entre telas

- Prioridade: `P1` · Estado: `FIXED` local · Rota: Project Hub → projeto → Screen DNA → Flow Graph.
- Evidência reproduzida: telas descobertas em um mesmo HTML não tinham ligação de navegação, embora botões declarassem `data-nav` e chamassem `window.showView(...)` para outro destino presente no arquivo.
- Correção: helper comum só cria arestas para handlers de navegação explícitos com destino conhecido no mesmo arquivo. Arestas preservam ação/label, seletor, arquivo e linha; `STATIC_SOURCE` e `NOT_VERIFIED` distinguem inspeção de código de interação exercida. Destinos desconhecidos são ignorados.
- Testes: `test/static-navigation-evidence.test.js`, `test/fenix-shell-discovery.test.js`, `test/project-screen-discovery-provenance.test.js` (4/4); `test/rea-project-workflow-ui.test.js` (1/1, incluindo verificação da aresta no Flow Graph); sintaxe e `git diff --check` `PASS`.
- Critério de fechamento `VERIFIED`: navegar por transições reais no runtime e anexar evidência de execução; validar visualmente os destinos e identificar versão/rollback antes da VPS. Essas verificações continuam `PENDING`.

### INT-011 — IDE e chat ignoravam o perfil de design schema 2.0

- Prioridade: `P1` · Estado: `FIXED` local, validação visual e VPS `PENDING` · Rotas: Project Hub → inteligência de design → IDE/Plan; chat com projeto ativo.
- Reprodução: salvar o perfil gerado pelo `FenixDesignReference` (`version: 2.0`) e consultar o provider pela IDE ou pelo chat. As rotas só aceitavam `1.x`; a versão atual era descartada sem erro e sem incluir preferências Lovable/Miro/Stitch no contexto.
- Causa confirmada: validação duplicada com regex `^1\.\d+$` em `universal-system-routes.js` e `conversation-routes.js`, embora o perfil ativo em `public/fenix-design-reference.js` seja `2.0`.
- Correção: validação compartilhada `isCompatibleDesignProfile`, que aceita `1.x` legado e `2.0` atual, e rejeita schema futuro/desconhecido ou título divergente.
- Testes: cobertura unitária do contrato; copilot recebe perfil 2.0 e as três referências; chat recebe preferências do projeto 2.0. Suite focada `22/22 PASS`. Jornada Playwright REA → Project Hub → preview → IDE → diff → importação DESIGN.md → Flow Graph: primeira execução falhou intermitentemente na leitura do arquivo; segunda execução passou `1/1`. Evidência usa provider de fixture, não comprova provider externo real.
- Limite: perfil manual ainda representa padrões documentados e inputs capturados; não há conexão autenticada direta às APIs de Lovable, Stitch ou Miro. Comparação visual interativa e produção permanecem `PENDING`.

### Atualização 22/10/2026 — mapa da Cidade e identificação do REA

- Mudança local: controles de zoom do minimapa centralizados; métricas redundantes removidas do chrome do mapa; ícones de navegação preservados monocromáticos; asset 3D recebe novo cache-buster.
- Cidade: prédios canônicos já renderizados atualizam posição, nome e estado somente quando o snapshot autenticado fornece coordenadas válidas para o mesmo ID. Entidades sem coordenadas permanecem sem projeção fabricada. `test/city-world3d-terrain.test.js` cobre movimento de edifício existente e rejeição de entidade não mapeada.
- REA: a detecção agora reporta `embedded`, versão `null` e engine `fenix-rea-evidence-graph-engine` quando `rea-agents` não está instalado; o protocolo e a descrição não afirmam integração externa nessa condição.
- Verificação: teste da coordenada canônica `PASS`; testes REA focados `10/10 PASS`; sintaxe JS e `git diff --check` `PASS`. A suíte completa de terreno ainda tem duas falhas em testes existentes por `navigator` ausente no harness Node, além da nova prova isolada que passou.
- Estado: correções locais ainda não verificadas visualmente no app integrado. A versão da VPS não foi alterada; hash/rollback e processo de publicação seguem pendentes. A fidelidade da Cidade como universo (ruas, densidade, interiores e movimento dos agentes) permanece aberta e requer fatias adicionais do modelo canônico, não está resolvida por este ajuste.

### UI-187 — Flow Graph sem organização manual de cartões

- Prioridade: `P1` · Estado: `FIXED` local, verificação visual após pressão de memória `PENDING` · Rota: Project Hub → perfil de design/Screen DNA → Flow Graph do projeto.
- Evidência reproduzida: a captura/execução de referência Miro apresenta canvas com organização espacial; no Flow Graph do Fênix os cartões eram somente selecionáveis e a disposição sempre retornava ao layout automático. Um teste Playwright de arraste falhou no estado anterior porque nenhum layout era persistido.
- Correção local: cartões agora podem ser arrastados ou movidos por setas; as arestas acompanham o movimento; posições são guardadas no `localStorage` sob chave do contexto e entidade/projeto. “Restaurar disposição automática” apaga somente essa preferência visual. A evidência REA/runtime, nós, status e arestas canônicas não são alterados. O cache-buster do Flow Graph foi atualizado.
- Teste de regressão: `test/design-reference-flowgraph.test.js` arrasta nó, reabre o grafo do projeto, confirma a persistência e restaura o layout. A prova anterior à correção falhou na asserção de persistência (timeout, esperado). O teste pós-correção ainda precisa ser executado.
- Fechamento `VERIFIED`: executar o E2E no navegador após liberar RAM e capturar o estado antes/depois. Layout é preferência local por navegador; colaboração ou sincronização entre operadores continua fora do escopo desta fatia.

### UI-188 — contagens do header viravam badges pequenos sobre os ícones

- Prioridade: `P2` · Estado: `FIXED`, confirmação visual após recarga `PENDING` · Rota: header global em `#city` · Viewport: recorte de 748×75 px enviado pelo operador; viewport completo não informado.
- Evidência: [captura antes](visual-evidence/user-reports-2026-10-22/kpi-header-counts-before.png) mostra ícones dominando a faixa e os números 0/1/0 como pequenos badges claros. Reprodução no DOM confirma botões distintos para agentes, missões, jobs e saúde do sistema; cada botão já tem `title` e nome acessível com sua finalidade.
- Correção: nas larguras compactas, os números passam a ficar em linha dentro da cápsula, com algarismos tabulares e cores por categoria (ciano/agentes, laranja/missões, roxo/jobs, verde/saúde). Em larguras estreitas os ícones decorativos cedem espaço à contagem. Tooltip e foco continuam revelando a descrição e a ação; estado `READY` continua tratado como estado, não como quantidade.
- Teste local: `test/workspace-responsive.test.js` 17/17 `PASS`; `git diff --check` `PASS`.
- Publicação: VPS `209.50.241.22:3000`, `/opt/fenix-os/public/fenix-responsive.css` e `index.html`. URLs servidas responderam HTTP 200; o HTML aponta para `fenix-responsive.css?v=20261022-kpi-count-first-1` e a folha contém a regra publicada. Backups reversíveis: `/opt/fenix-os/public/fenix-responsive.css.bak-20261022-kpi-count-first-1` e `/opt/fenix-os/public/index.html.bak-20261022-kpi-count-first-1`.
- Critério de fechamento `VERIFIED`: recarregar a tela autenticada em larguras compacta e desktop, verificar contagem colorida e tooltip por hover/foco, e anexar captura posterior. A publicação de assets está confirmada; a inspeção visual após recarga continua pendente.

## Auditoria de vídeos e capacidades de referência — 22/10/2026

Mapa de evidências, inventário dos 15 vídeos e quadro de comparação com Lovable, Miro, Stitch e as 18 views canônicas: [GRG_SPACE_REFERENCE_MEDIA_AUDIT_2026-10-22.md](GRG_SPACE_REFERENCE_MEDIA_AUDIT_2026-10-22.md). Estados abaixo representam backlog de evolução, não alegação de funcionalidade já existente. Os critérios detalhados estão no relatório.

### AUD-001 — Baseline local e versão servida ainda divergem

- Prioridade: `P0` · Estado: `OBSERVED` · Rotas: entrada `/app`, `#city`, `#command`, login e refresh.
- Evidência: backlog registra asset/cockpit diferente entre fonte local e VPS; vídeo/capturas não identificam commit/versão servida.
- Evidência runtime 22/10/2026: página autenticada da VPS em `:3000` exibe `v2.5.0`; viewport 1034×1088, rota `#city`. Commit/build/hash correspondente não identificado nesta sessão. O menu `command` foi acionado, mas o browser permaneceu/retornou `#city`; considerar navegação não validada até reproduzir com resultado estável.
- Fechamento: registrar hash/build e screenshots equivalentes local/VPS; provar primeira pintura em sessão limpa/autenticada/refresh e rota legada.

### AUD-002 — Cidade 3D sem fidelidade operacional e orçamento de render comprovados

- Prioridade: `P0` · Estado: `OBSERVED` · Rota: World/Cidade.
- Evidência: V01, V04–V07, V10–V11 mostram referências de mundo 3D com áreas e agentes; backlog UI-137/147/150–159/161–162/167/170–174/181–182 registra câmera, posições, interiores, acabamento, atividade e performance do Fênix.
- Reprodução visual VPS 22/10/2026, 1034×1088: canvas 958×940; minimapa 236×192 (x80,y712); seletor de camadas 236×43 (x80,y674); HUD inferior 659×57 (x221,y924) colide com cartão separado de contagens. A cena mostra grandes áreas vazias e volumes simples; isso registra fidelidade visual insuficiente, não causa de render determinada. Sem perfil/perf trace, custo de CPU/GPU continua não medido.
- Fechamento: perfilar refresh/render ao navegar; comparar coordenadas medidas e previstas; testar prédio→andar→sala e seleção do agente sem sobreposição; capturar quatro larguras.

### AUD-003 — Visão de agente não fecha atividade de ponta a ponta

- Prioridade: `P1` · Estado: `OBSERVED` · Rotas: Agents, Work e World.
- Evidência: V06/V09/V11 mostram equipes, tarefas e painel contextual; Fênix possui IDs canônicos e testes de runtime, mas os vídeos não provam integração de eventos ao Inspector.
- Evidência runtime VPS: `#operations` declara 60/60 itens `operational.activation` como `SUCCEEDED`, com projeto e agente “não informado”; zero em execução/fila e um worker. `#agents` abriu em sincronização com Inspector sem seleção que ainda listava capacidades/contexto padrão. Não foi possível confirmar se os 60 itens são jobs canônicos ou eventos legados; a associação é reproduzida na UI.
- Fechamento: ação autorizada registra job, agente responsável, eventos/run e resultado; estado ocioso não anima como tarefa; histórico é reproduzível no Inspector.

### AUD-004 — Conversa e execução precisam do ciclo visível de aprovação

- Prioridade: `P1` · Estado: `OBSERVED` · Rotas: chat, IDE, Work.
- Evidência: V03/V09 mostram harness/automações; bugs UI-183/184 registram provider indisponível e resultados fixos no estado observado anteriormente.
- Fechamento: conversa comum não cria job; ambiguidade pede contexto; proposta descreve alcance; job canônico só nasce após confirmação explícita; falha/provider indisponível aparece com recuperação.

### AUD-005 — Projeto, tela, rota e código ainda não formam um único workspace consistente

- Prioridade: `P1` · Estado: `OBSERVED` · Rotas: Projetos, IDE, Screen DNA, Flow Graph.
- Evidência: Lovable mostra projeto/recente/preview/arquivos; Stitch mostra telas/protótipos; Fênix já tem Project Hub/REA/diff, porém cobertura de hosts/rotas/preview não foi comprovada no runtime autenticado.
- Evidência runtime VPS `#projects`: 7 projetos, 5 workspaces e `@Biel0071 (0 repos)`; FÊNIX OS mostra 718 telas, mas os cartões visíveis exibem “Captura não registrada”, DOM não medido e fonte de observação/histórico (`/archive/frontend/grg-apps-ai-city/index.html`). Contagem declarada não comprova captura/cobertura; rotas e snapshots requerem origem/build.
- Fechamento: selecionar projeto mantém host/path/build; preview abre a rota correspondente; tela liga ao arquivo-fonte e diff; proposta preserva origem e não grava antes de confirmação.

### AUD-006 — Organização de boards/artefatos e layout não sincronizam como workspace

- Prioridade: `P2` · Estado: `OBSERVED` · Rotas: Projetos e Flow Graph.
- Evidência: Miro documenta Home, Spaces, grupos/seções, busca, recentes, modelos e permissões; Fênix tem favoritos/ordem parcialmente locais e Flow Graph com layout local.
- Fechamento: coleções/seções, filtro/lista/grade/canvas e preferências sobrevivem a nova sessão no servidor; teste multiusuário valida ACL/autoria antes de anunciar colaboração.

### AUD-007 — Canvas de design não tem protótipo navegável e variantes ligadas

- Prioridade: `P2` · Estado: `OBSERVED` · Rotas: Screen DNA e Project Hub.
- Evidência: Stitch documenta canvas multimodal, design system e protótipo clicável; Fênix persiste referências/observações e relações, mas não foi comprovada jornada multi-tela clicável com variantes.
- Fechamento: tela/variante com origem, viewport e confiança; navegação só marca rota observada; export/import reproduzível; nada altera o produto até revisão/aprovação.

### AUD-008 — BAI ainda não tem integração white-label e sessão controlada demonstradas

- Prioridade: `P2` · Estado: `OBSERVED` · Rotas: Browser, IDE e Inspector.
- Evidência: V10 sugere mundo/instalação operacional; backlog BAI-001/INT-002 declara runtime não pareado e instâncias sem visibilidade canônica.
- Fechamento: versionamento/health de ambos, pareamento validado, isolamento/revogação da sessão, logs e retenção definidos; cookies e proxy/VPN sem exposição de segredo.

### AUD-009 — Voz e memória ainda não demonstram sessão realmente compartilhada

- Prioridade: `P2` · Estado: `OBSERVED` · Rotas: Chat e Memory.
- Evidência: V02/V12 mostram memória compartilhada e assistente de voz; status de ASR/TTS em produção não está comprovado.
- Fechamento: provider real completa transcrição/chat/TTS/interrupção/falha, registra apenas texto/proveniência e continua em texto se voz cair.

### AUD-010 — Hierarquia de informação ainda precisa unificar escalas, affordances e estados

- Prioridade: `P1` · Estado: `OBSERVED` · Rotas: shell inteiro · Viewports: 375/768/1280/1920.
- Evidência: backlog UI-172/173/188 e capturas do operador; plataformas referência usam navegação/controles contextuais e diretórios por projeto.
- Geometria VPS 22/10/2026: em viewport 1034×1088, HUD de universo começa em x221 e atravessa o cartão redundante de métricas da Cidade; minimapa e controles ocupam duas caixas adjacentes. `#runtime`, `#memory`, `#agents` e `#browser` mostraram loading/sincronização na leitura pontual. Estados loading são observados, não falhas persistentes; fechamento exige repetir e medir duração/transição para dados/erro.
- Captura do operador 22/10/2026: cabeçalho mostra `Online —`, `Missões 0`, `Jobs 0` e sistema `READY`, enquanto a Cidade mostra `61 no mapa`; footer apresenta CPU 97%, RAM 96%, disco 90% e estado `DEGRADED`. É uma inconsistência visual observada entre contagens/saúde, ainda sem proveniência/horário de cada fonte confirmados; não inferir que 61 estejam online nem que o estado READY esteja errado. Validar payloads e timestamps antes de harmonizar indicadores.
- Fechamento: auditoria DOM/visual sem clipping/overlap; ícones/tokens coerentes; contagens e estados com nome/valor acessível; controles essenciais permanecem disponíveis quando painéis fecham.

### MEM-001 — Pattern Library promovia automaticamente itens não validados

- Prioridade: `P1` · Estado: `FIXED` local, validação de promoção/persistência pendente · Área: `src/memory/pattern-library.js`.
- Reprodução: chamar `registerPattern()` com um padrão novo sem `status` nem `confidence`; o resultado anterior retornava `PROVEN` e `HIGH`, mesmo quando a evidência era apenas uma observação de origem. Regressão registrada primeiro em `test/pattern-library-evidence.test.js`; falhava com `PROVEN` esperado `CANDIDATE`.
- Correção local: valores padrão são `CANDIDATE/UNASSESSED`; promoção para `PROVEN` exige `validationStatus: VERIFIED`, IDs de testes e timestamp válido; `CORE` também exige aprovador. `findReusablePatterns()` e Token Economy ignoram candidatos. Cold reconstruction não carrega Screen DNA absorvido; relatórios de comparação deixam economia sem medição como `null`/`LEARNING_NOT_PROVEN`; CEO não apresenta estimativas como economia real.
- Testes: `pattern-library-evidence` 4/4; `token-economy-pattern-evidence` 2/2; `screen-reconstruction-metrics-truth` 5/5; `project-absorption-reality` 10/10; `external-project-reality` 10/10 com Playwright; `token-economy-truth` 2/2; total focado desta rodada 33/33. A E2E HTTP legada recebeu 401 sem sessão e não verificou os endpoints.
- Economia de tokens adicional: score e economia anteriores eram fabricados sem baseline (3850 tokens fixos, mínimo 52%, score mínimo 50; fallback 450/cache hit). Corrigido localmente em `TokenEconomyEngine`, `/api/v2/company/economy`, telemetria e resposta CEO. Sem baseline/provider comparável, valores medidos são `null`, estimativas ficam em `estimated*`. Persistência e API autenticada continuam pendentes.
- Fechamento `VERIFIED`: mapear persistência/consumidores na inicialização real; ligar evidência de validação a artefatos de execução com identidade de aprovador verificável; demonstrar persistência após restart. Nenhum dado preexistente foi migrado.
- Publicação: local only; VPS não pareada por hash e nenhuma publicação autorizada neste ciclo.

### OPS-001 — Lifecycle ocultava missão atribuída como agente disponível

- Prioridade: `P1` · Estado: `FIXED` local · Área: `src/api/living-city-routes.js`.
- Evidência reproduzida em 22/10/2026: após `ASSIGN_MISSION`, WorldStateEngine tinha `WORKING`, mas a API de lifecycle retornava `AVAILABLE` e `currentTask=null`. Sem destino de movimento, a regra zerava o estado; a composição do roster podia esconder os campos vivos.
- Correção: mescla por ID com WorldStateEngine como fonte final das mutações recentes; missão explícita mantém `WORKING`; resposta preserva tarefa/atribuição real. Atualizado contrato estático do World Reality Gate para eventos `fenix:city-world`, movimento local explicitamente não sincronizado, render `low-power` e telemetria por tarefa, sem fixtures de missão inventadas.
- Verificação: `world-runtime-activation.test.js` + `world-reality-gate.test.js`: 16/16, incluindo assign → GET lifecycle → complete. Persistência externa indisponível durante teste; VPS não alterada.
- Fechamento: atualizar para `VERIFIED` quando a mesma sequência for confirmada na build local servida, com job/worker real e estado visual do agente; não inferir movimento físico do estado de missão.

### PERF-001 — Interior completo do galpão era desenhado também na câmera geral

- Prioridade: `P1` · Estado: `VERIFIED` local · Rota: `#city` · Viewport: 1280×900.
- Reprodução/evidência: baseline local autenticada com 61 agentes, câmera ampla a 136 unidades, telhado fechado e `WarehouseInterior.visible=true`; o depósito continha 2.157 meshes internos e a cena tinha 3.192 draw calls. Arquivo de referência: `qa-results/playwright/city-runtime-1280-auth-baseline.png`.
- Causa: interior era criado visível por padrão e não dependia do estado de cutaway. O foco do depósito aproxima a câmera até 56 unidades, acima do limite anterior de 48, impedindo a abertura contextual.
- Correção: interior começa oculto e só é mostrado enquanto o cutaway abre/está ativo; foco próximo habilita a abertura a menos de 60 unidades. Reset volta a ocultá-lo.
- Critério/evidência de fechamento: regressão automatizada comprova visibilidade inicial/condicional; browser local confirmou foco no depósito → cutaway aberto/interior visível e reset → interior oculto. Em amostra pós-fix de 8 s, mesmo viewport e 61 agentes: p50 43,9 ms (antes 78,5 ms), p95 52,2 ms (antes 86 ms), 2.377 draw calls (antes 3.192), 86.976 triângulos (antes 96.876). Redução observada no navegador local, não extrapolar para VPS ou outros hardwares.
- Testes: `city-render-budget`, `city-runtime-performance`, `frontend-polling-load` e `city-world3d-sync-reconciliation` — 46/46; `node --check public/fenix-world-3d.js` passou. Nenhum deploy.

### PERF-002 — Screen DNA remoto monta milhares de controles no Project Hub

- Prioridade: `P1` · Estado: `FIXED` e `TESTED` localmente; `REPRODUCED` na VPS sem atualização · Rota: `#projects` · Viewport: 957×992 de conteúdo (janela 1033×1088).
- Reprodução/evidência: sessão autenticada read-only na VPS em 22/10/2026, projeto FÊNIX OS selecionado (718 telas registradas). DOM medido: 32.173 elementos, 6.341 botões, `.flp-screens-grid` com 718 filhos; `.flp-detail` tinha `scrollHeight=320.722 px` para `clientHeight=578 px`. Isso demonstra custo estrutural alto; não mede FPS nem prova isoladamente a causa de todo o lag.
- Área provável: renderização de todos os nós de Screen DNA em `public/project-hub-live.js` (`renderScreensTab`) e falta de renderização por lote/virtualizada.
- Critério para correção: manter busca/filtros sobre o catálogo inteiro, mas limitar DOM inicial a um lote pequeno com ação acessível para carregar mais; não perder IDs, origem, estado de captura, ligação ao IDE/Flow Graph, seleção nem acessibilidade. Testar com 718+ telas, teclado, filtros e largura responsiva; medir DOM/tempo antes e depois.
- Correção local: `renderScreensTab()` filtra a lista completa, mas monta 48 cartões por lote e adiciona 48 por vez sob ação acessível. Busca/filtro examinam telas ainda não montadas; ordenação manual segue preservada. O contêiner ajusta a caixa ao viewport.
- Verificação: fixture de 718 telas confirmou 48 cartões/144 botões iniciais, 96 após carregar mais, busca e filtro em item não carregado e geometria em 375/768/1280/1920 px. Suíte `project-screen-portfolio` + `project-screen-dna-reality`: 17/17; `node --check public/project-hub-live.js` passou.
- Limite: VPS continua com a reprodução original; sem FPS/long tasks medidos e sem deploy. Correção local reduz DOM inicial, mas impacto em toda a percepção de lag não está demonstrado.

- **RUN-2026-10-22-12 — Atualização local de PERF-002:** corrigido e testado no checkout, não validado na VPS. O E2E amplo de REA/anotações variou entre detachment/timeout no botão de anotação e espera por painel oculto; houve uma execução isolada verde, mas falhas sucessivas impedem considerar esse fluxo estável. Causa pendente; consulte RUN-12.

### REA-001 — Atalho `/screens` usava contrato inexistente e contagem fixa

- Prioridade: `P2` · Estado: `FIXED` local para o contrato do chat · Área: `src/services/rea-intelligence-engine.js`, `public/fenix-mascot-sidebar.js`, `src/execution/fast-lane-engine.js`.
- Evidência: API retorna `projectsScreensSummary` e `totalEcosystemScreens`; sidebar esperava `screens`, portanto o comando podia não responder. Fallback antigo apresentava 65 mesmo sem dado. Inventário local atual soma 62 em 7 projetos.
- Correção: sidebar consome o shape da API; FastLane chama o inventário de telas registradas, sem alegar catálogo completo; teste valida soma real e número retornado.
- Verificação: `rea-memory-fastlane.test.js` 4/4. Nenhuma tela nova foi criada ou atribuída sem fonte.
- Fechamento total: auditar os 7 workspaces e comparar rotas/DOM reais com os 62 registros. Só então indicar cobertura completa.

### PROJ-002 — Logos do catálogo local retornam 404

- Prioridade: `P2` · Estado: `OBSERVED` · Rota: `#projects` · Viewport: runtime local autenticado; viewport não preservada no relatório da sessão.
- Evidência: auditoria Playwright autenticada em `127.0.0.1:4400` registrou 404 em `/api/fenix/projects/local-meta-autoposter-python/logo`, `/api/fenix/projects/local-fortlev-quote/logo`, `/api/fenix/projects/local-droidview-copia/logo` e `/api/fenix/projects/local-zapflow-html/logo`; corpos retornaram `Project logo is unavailable`.
- Reprodução: abrir Projetos com sessão autenticada e aguardar carregamento do catálogo local; conferir Network e os quatro cartões citados na evidência.
- Área provável: resolução/allowlist de logos do catálogo e fallback do componente de cartão em `public/project-hub-live.js`.
- Teste associado: criar cobertura do contrato logo-presente/logo-ausente e conferir erro de rede/fallback no browser. Ainda sem teste.
- Critério de fechamento: logo autorizada responde 200 com imagem válida; ID sem logo apresenta ícone/fallback de texto sem request 404 repetido, layout quebrado ou card sem identidade.
- Versão/evidência: RUN-2026-10-22-09, checkout local autenticado a 1440×900; quatro logos sem fallback validado; sem validação na VPS.

### PROJ-003 — Catálogo declara serviço online sem medição

- Prioridade: `P1` · Estado: `VERIFIED` (local) · Rota: `#projects` · Viewport: 1440×900.
- Evidência: o card `HttpApp` vinha com `status=ONLINE` do catálogo sem health check, e o detalhe afirmava serviço ativo, latência “imediata” e link sem URL. Corrigido para `NÃO VERIFICADO` até existir medição; estados online/offline agora vêm de health check observado.
- Reprodução original: abrir Projetos sem leitura de health e selecionar `HttpApp`; o cabeçalho exibia online apesar de endpoint/latência ausentes.
- Área: `public/project-hub-live.js` e `test/project-hub-operational-status.test.js`.
- Teste associado: `project-hub-operational-status.test.js` verifica status não medido, filtro desconhecido e online/offline medidos; Playwright autenticado confirmou o estado visual após a correção.
- Critério de fechamento: sem health check, nenhuma superfície afirma online/offline ou latência; quando medido, exibe o resultado e o horário da última verificação.
- Versão/evidência: RUN-2026-10-22-09, runtime local `127.0.0.1:4400`; captura `C:\Users\Dell\AppData\Local\Temp\fenix-projects-status-1440-after.png`. VPS não alterada.

### PROJ-004 — Ações do cabeçalho do Project Hub extrapolam a tela móvel

- Prioridade: `P1` · Estado: `VERIFIED` (local) · Rota: `#projects` · Viewport: 375 px.
- Evidência: em viewport estreita, os controles do cabeçalho ficavam além da coluna do shell. Layout alterado para empilhar título e ações, mantendo os controles acessíveis.
- Reprodução original: abrir Projetos em 375 px e medir o limite direito dos botões do cabeçalho em relação ao viewport.
- Área: `public/project-hub-live.css` e `test/project-hub-unavailable-state.test.js`.
- Teste associado: teste de overflow responsivo em 375 e 1280 px passou; captura após correção armazenada pelo próprio teste em `docs/visual-evidence/2026-10-21/projects-unavailable-375-after.png`.
- Critério de fechamento: todos os controles do cabeçalho ficam dentro do viewport e alcançáveis em 375 px; viewport desktop continua sem regressão.
- Versão/evidência: RUN-2026-10-22-09, runtime local; sem validação na VPS.

### UI-189 — Preview da IDE podia confundir porta de API com frontend e iniciar em Split

- Prioridade: `P1` · Estado: `FIXED` no checkout · Rota: `#projects` → IDE → Preview/Split.
- Evidência: nas capturas anexadas, Split aparecia ativo por padrão e o painel ficava em “Carregando aplicação real…”. Há projetos com API e UI em portas distintas; apontar para API/health não apresenta o frontend real. Sem binding, um placeholder de outro app seria uma substituição enganosa.
- Reprodução: abrir IDE em sessão com preferência antiga de Split, trocar entre API Platform, ZapAI CRM e projeto sem endereço de frontend; comparar URL/porta apresentada com bindings do cadastro e observar se estado sem frontend mantém conteúdo anterior.
- Correção local: modo padrão migrado para Code; Preview e Split só são abertos por escolha do usuário. O resolvedor seleciona bindings frontend compatíveis com a porta publicada e rejeita health/API. Projeto sem binding mostra estado indisponível e encerra o iframe anterior. O divisor do Split ganhou teclado e semântica de separador, além do arraste.
- Teste associado: `test/project-ide-preview-url.test.js`; valida portas de API Platform/ZapAI, binding correto, ausência de fallback falso, modo inicial e divisor ajustável.
- Verificação: conjunto IDE + Memória + avatar passou 38/38 nesta rodada. Ainda falta abrir a versão local autenticada com projetos reais, comparar URL/porta e registrar capturas antes/depois.
- Critério de fechamento: em 375/768/1280/1920 px, cada projeto abre apenas a UI de seu próprio frontend quando cadastrada; caso contrário, informa ausência. Code/Preview/Split alternam sob comando, Split ajusta por mouse e teclado, e nenhum preview antigo permanece ativo ao trocar de projeto.
- Versão/evidência: 22/10/2026, checkout local; VPS sem atualização ou validação.

### UI-190 — Canvas da constelação de Memória era removido antes da inicialização

- Prioridade: `P1` · Estado: `FIXED` no checkout · Rota: `#memory` → Grafo & Camadas.
- Evidência: capturas anexadas mostram 2.828 nós/13.528 relações, mas o painel renderiza uma única entidade isolada ou um mapa radial 2D simples. Inspeção do ciclo da tela encontrou `shell()` substituindo `#view-memory` após o canvas ter sido registrado; o renderer 3D tentava buscar um elemento já removido. O vídeo `1001656590.mp4` (129,634 s; 720×1280; 30 fps) apresenta uma referência de grafo/constelação interativa com exploração de memória e busca/filtros; a auditoria de referência amostrou storyboards a cada 7–8 s, sem alegar revisão humana de todos os 3.885 frames.
- Reprodução: abrir Memória, selecionar “Grafo & Camadas” e observar o estado 3D/2D; selecionar nó sem relações e então um nó com vizinhos. Conferir console e existência do canvas após montagem da shell.
- Correção local: a shell monta os elementos do canvas 3D e mapa 2D antes de inicializar os listeners; a visualização realça apenas arestas carregadas conectadas ao nó escolhido e informa quando o nó não tem relações registradas. Contagens são derivadas dos dados recebidos; posições ainda não formam agrupamento semântico.
- Teste associado: `test/memory-graph-renderer.test.js`, além de layout/hierarquia/proveniência e renderer browser.
- Verificação: testes Memory focados 10/10 PASS, incluídos no conjunto de 38/38 desta rodada. Renderer usa fixtures; consulta do backend e revisão visual autenticada na VPS seguem pendentes.
- Critério de fechamento: em sessão autenticada, alternar 2D/3D, pesquisar/filtrar, explorar milhares de nós sem bloquear a tela, abrir e fechar detalhes e verificar relações/proveniência reais; estados isolados, erro e carregamento devem ser distintos. Não afirmar “cérebro 3D equivalente ao vídeo” até completar agrupamento semântico, navegação visual e validação de escala/performance com grafo real.
- Versão/evidência: 22/10/2026, checkout local; VPS sem atualização ou validação.

### SEC-001 — Inspector de Jobs interpretava conteúdo da API como HTML

- Prioridade: `P1` · Estado: `FIXED` e `TESTED` local · Rota: `#operations` → Inspecionar Job.
- Evidência: `operations-live.js` interpolava campos da API autenticada em `innerHTML` nos detalhes de erro, payload, resultado, progresso e logs; feedbacks de missão também interpolavam IDs/mensagens. Isso permitia que conteúdo controlado por registros externos fosse interpretado como markup.
- Reprodução: construir um Job de fixture com `<img src=x onerror=...>` nos campos de texto e abrir o Inspector; antes da correção, a string era incluída sem codificação.
- Correção: escape de caracteres HTML antes dos pontos dinâmicos de inserção; texto não interpolado continua em `textContent`.
- Área: `public/operations-live.js`; cobertura em `test/operations-live-auth.test.js`.
- Teste associado: escape de payload hostil e verificações das saídas dinâmicas; conjunto de operações/runtime/job passou 22/22. Execução em browser com CSP/event handler não realizada.
- Critério de fechamento `VERIFIED`: browser local autenticado demonstra que campos hostis aparecem como texto inerte em todos os painéis e feedbacks; regressão do Inspector e logs preservam conteúdo legível.
- Versão/evidência: RUN-2026-10-22-10, testes locais em VM; produção/VPS sem validação.

### UI-191 — Grafo de Memória confundia registros repetidos com conexões visuais distintas

- Prioridade: `P1` · Estado: `REPRODUCED` na VPS; `FIXED` no checkout · Rota: `#memory` → Grafo & Camadas.
- Evidência: leitura autenticada da VPS em 22/10/2026 mostra 2.828 nós, 13.528 relações e, para FÊNIX OS, “600 relações registradas · 14 vizinhos exibidos”; o Inspector usa “Relações (600)” e repete destinos entre seus 20 itens. A fixture local reproduziu 600 registros ligados a somente 14 pares únicos. No runtime VPS, a captura mostra apenas a vista 2D; a versão local testada apresenta canvas interativo.
- Reprodução: selecionar uma entidade com múltiplos registros de relação para os mesmos vizinhos; comparar `totalEdges`, linhas/nós desenhados e itens do Inspector. Em memória, conferir a versão/asset servidos antes de comparar comportamento.
- Área provável: `public/memory-live.js`, `public/memory-brain-layout.js` e versão de assets publicada.
- Correção local: desenha uma ligação por par de entidades, prioriza seleção/vizinhos, limita subconjunto visual a 500 nós, escala a nuvem para preencher melhor o canvas, mostra vizinhos únicos separados dos registros de relação e agrupa no Inspector tipos/contagens por vizinho. Animação não consome RAF quando ociosa; interação agenda repaint.
- Teste associado: `test/memory-graph-renderer.test.js` — fixture 200 nós/601 relações, 15 pares visuais, 15 vizinhos únicos, interação/repintura e nó isolado.
- Verificação: suíte IDE + Memória + Avatar 39/39; screenshot Playwright local inspecionado. Fixture sintética; nenhum grafo backend real foi visualmente certificado.
- Critério de fechamento `VERIFIED`: comparar checkout e VPS com hashes/build identificados; em grafo real, 2.828+ nós e relações, validar rótulos, filtros, navegação, seleção, ausência de duplicatas e orçamento de frame. Confirmar canvas/2D com alternância e nenhum bloqueio em viewport de desktop e mobile.
- Versão/evidência: 22/10/2026, checkout local; os cinco assets comparados diferem da VPS. Nenhum deploy, identificação compatível de build ou rollback comprovado.

### UI-192 — Alias legado `#command` não era canonicalizado após navegação interna

- Prioridade: `P2` · Estado: `REPRODUCED` na VPS; `FIXED` no checkout · Rota: `#command` → `#city`.
- Evidência: em sessão autenticada, abrir diretamente `http://209.50.241.22:3000/app#command` mostrava a Cidade (39 agentes e 9 prédios medidos; READY), mas mantinha `#command` na URL. No carregamento frio sem hash, o runtime redirecionou para `#city`. O alias funcionava visualmente, mas o estado da URL diferia do destino canônico.
- Reprodução: estando em qualquer rota, usar navegação interna do browser para `#command`; comparar URL com view efetiva. Repetir em `#home` e `#dashboard` antes de expandir a correção para todos os aliases.
- Área: `public/index.html`, `ROUTE_ALIASES` e `handleHashChange()`.
- Correção local: resolve alias antes de chamar `showView`, troca o hash por destino canônico com `history.replaceState` e mantém query/path/sub-rota. Não dispara transição adicional.
- Teste associado: `test/city-first-paint.test.js`, extrai e executa o handler real de `hashchange` em VM com stubs; preservação de query, sub-rota e canonicalização cobertas. Verificação browser VPS observou `#command` ainda sem rewrite na versão servida.
- Verificação: caso local de first paint + alias: 2/2; runtime autenticado confirma comportamento antigo na VPS e destino visual City. Teste VM não substitui E2E local.
- Critério de fechamento `VERIFIED`: navegação interna para todos os aliases mapeados substitui URL pelo canônico, preservando query e sub-rota; voltar/avançar e deep links mantêm view esperada; validar no browser local e versão pareada na VPS.
- Versão/evidência: 22/10/2026, checkout local; VPS ainda serve `index.html` com hash diferente, sem deploy.

### UI-193 — Grafo 3D da Memória borrado, pouco legível e sem paridade visual com a referência

- Prioridade: `P1` · Estado: `FIXED` local e VPS; `VERIFIED` pendente para todos os viewports · Rota: `#memory` → Grafo & Camadas.
- Evidência: no vídeo `1001656590.mp4` (720×1280, 129,63 s), a referência mostra uma nuvem neural luminosa, interativa e colorida, painel de entidades/detalhes e caminhos de conexão/configuração de clientes. O renderer local pintava diretamente no tamanho CSS (sem DPR), não atualizava o bitmap ao redimensionar e atribuía cinza a nós sem proveniência. Captura anterior desta interface também mostra a vista radial 2D na VPS; assets locais/VPS diferem.
- Reprodução: abrir `#memory` em tela com `deviceScaleFactor=2`, redimensionar 375→1920 px e selecionar nós sem `properties.provenance`; comparar nitidez, escala, cor e seleção do canvas. No desktop autenticado VPS, a vista de rede aparecia como mapa radial 2D.
- Área: `public/memory-live.js`, `public/memory-live.css` e versão dos assets servidos.
- Correção local: canvas usa bitmap de até 2× DPR, acompanha `ResizeObserver`, preserva hit-test em coordenadas CSS, reforça halos e conexões. Nós sem proveniência usam cor explícita por tipo, com rótulo para não confundir tipo com origem de IA.
- Teste associado: `test/memory-graph-renderer.test.js`; fixture sintética de escala com 2.828 nós/13.528 registros, 600 registros em 15 vizinhos, DPR 2, clique real no canvas, resize 375/768/1280/1920, interação drag, ociosidade sem RAF contínuo e vizinhos agrupados.
- Verificação: suíte focal do renderer: 4/4; screenshot atualizado da fixture local inspecionada em `%TEMP%\fenix-memory-brain-final.png`. A quantidade iguala as contagens VPS observadas, mas a estrutura do grafo continua sintética e não equivale ao payload real nem ao modelo visual 3D avançado do vídeo.
- Critério de fechamento `VERIFIED`: executar local com o payload autenticado de 2.828+ nós e dados completos; validar zoom/rotação/seleção em 375/768/1280/1920, sem travar; identificar build VPS e comparar screenshot depois de rollout com rollback conhecido. A paridade com configurações realmente conectadas exige prova de cada integração e permanece separada.
- Versão/evidência: 22/10/2026, checkout local, mudança não publicada; VPS segue com hash divergente.
- Atualização 22/10/2026: renderer local evoluiu de canvas 2D para Three.js/WebGL real, com nuvem bilateral de pontos, links de grafo, rotação, zoom, seleção e orçamento responsivo de até 2.400 pontos (2.828 entidades no fixture); teste integrado em Chromium/SwiftShader verificou DPR 2 e render em menos de 5 s. Fixture é sintética. Captura: `%TEMP%\fenix-memory-webgl.png`.
- Limite de escopo: o formato visual 3D está implementado localmente, mas não reproduz anatomia Blender, controles de busca/filtros/conectores do vídeo nem prova semântica por comunidades. Falta carregar payload real autenticado e comparar com a referência.
- Atualização 23/10/2026 — release phase6: a VPS agora serve WebGL em canvas próprio, separado do canvas 2D de fallback; a colisão de contextos WebGL/2D foi reproduzida no console e removida. O grafo usa amostragem distribuída para evitar que o nó raiz de grau alto transforme a nuvem em estrela. No browser autenticado, FÊNIX OS selecionado mostra 700/2828 entidades, 45 ligações visuais, 13.528 registros totais, 1.531 vizinhos e 4.055 registros nas relações do nó; seleção de API Platform e retorno a FÊNIX OS foram exercitados. Release `fenix-vps-static-overlay-20261023-memory-brain-cloud-phase6`; hashes e rollback registrados em RUN-2026-10-23-04. Suíte focada 16/16.
- Estado permanece `FIXED` (não `VERIFIED`): falta captura comparável e validação em 375/768/1280/1920, incluindo rotação/zoom/hit-test em cada viewport, e avaliar a referência completa de nuvem/comunidades. O canvas mostra 700 entidades simultaneamente no viewport atual, não 2.828 pontos; a cobertura integral existe nos dados/carregamento, não na renderização visual ao mesmo tempo.
- Atualização phase9 (23/10/2026): a amostra 3D agora percorre relações reais além da entidade em foco e reserva no máximo 8 arestas para os spokes do foco; relações contextuais restantes são distribuídas pelo orçamento visual. Browser autenticado com FÊNIX OS: `700/2828 entidades · 40/45 ligações visuais · 13528 registros`, com 1.531 vizinhos no Inspector; seleção API Platform e retorno ao Fênix exercitados. Captura atual mostra nuvem bilateral mais legível, mas a forma e a interação ainda diferem do vídeo. Release phase9/backup/testes ficam registrados em RUN-2026-10-23-05. Continua `FIXED`; `VERIFIED` pendente da matriz visual e interação completa.
- Atualização RUN-18 (22/10/2026): a inspeção autenticada da VPS confirmou o payload atual de 2.828 nós e 13.528 registros de relação (lista com 200 itens paginados e 600 registros para o projeto Fênix). A leitura direta sem cookie respondeu 401, como esperado. Renderer local agora apresenta os 2.828 nós na viewport desktop e informa ligações renderizadas/pares únicos; o contexto de links é limitado a 2.400 para evitar saturação visual, com arestas da seleção priorizadas. Teste integrado verificou 2.400/12.942 pares numa fixture de estresse sintética; não foi possível carregar o mesmo payload autenticado no QA local.
- Evidência nova: CUA na rota autenticada `?designboard=1.3#memory`, estado “200/2828 nós carregados”, “2828” nós, “13528” relações e “600” registros / 14 vizinhos para Fênix. VPS continua na interface anterior; esta captura observada não valida o renderer WebGL local.

- Deploy estático em 23/10/2026 UTC: `memory-live.js?v=13-memory-brain-webgl-full-graph`, SHA-256 `f776dd8a71ea9d4598e2eb94c7504c1af843998832aa223f16962c88f7137f9b`; `index.html` SHA-256 `131c1601523b7f70ad60dd2d587b643bc05b7ba204e13cdd84e6f469bed12778`. Backup de rollback: `/home/deploy/.fenix-release-backups/memory-webgl-20261022-b86wmw37`; checkpoint da fase WebGL anterior e `rollback.sh` presentes. `/health`, `/app` e JS versionado retornaram HTTP 200. Browser autenticado confirmou 2.828/2.828 nós, 13.528 relações; viewport em teste renderizou orçamento de 500 nós e 499 vizinhos de Fênix, com 2.018 relações visuais. Estado continua `FIXED`: faltam capturas comparáveis e validação visual em 375/768/1280/1920 antes de `VERIFIED`.- Baseline comparativo atualizado em 23/10/2026 UTC (HEAD `bb57b6ad85980396bdd1fdb3d379cab6725c55d9`, worktree com 520 caminhos alterados): `index.html` local `052d058f99ea01bfcb1effa93802063d5022b214d52e9ad4a1a4df12694136bc` / VPS `131c1601523b7f70ad60dd2d587b643bc05b7ba204e13cdd84e6f469bed12778`; `fenix-world-3d.js` `4181c346894b5638351a3fd38b182b96546ca1f5217e379840c120c68eb628ad` / `26ec089b4dee571a53a5f663d89b6345ab4939d6ebc0133c7f22a79b8f01d6e0`; `unified-app.js` `48566faaf83955b10fc18363328df5e9e3a53b6978546f6a33d9fe4e85a68a7b` / `5e5b2c88342a5a1ea138951fa2efc4fabbb9e97b54f07f742868de8099b70aba`; `project-ide-live.js` `a7028605aa8aacd1d6b7f741ff206b708f28ea8d03d3a015addd962424c99617` / `f8ba64ee94740f57f4aee5f2cd5c0528bc62768267ff9b14fce783ce1a8acd5b`; `memory-live.js` coincide em `f776dd8a71ea9d4598e2eb94c7504c1af843998832aa223f16962c88f7137f9b`. O snapshot contém mudanças não publicadas; não há identidade de build integral. AUD-001 segue `OBSERVED`.
- AUD-001 / salvaguarda de rollback: em 23/10/2026, `rollback.sh` passou numa cópia temporária remota; `cmp` confirmou index, CSS e JS restaurados e `test` confirmou remoção dos módulos WebGL. A pasta de produção permaneceu intocada; isto prova a reversibilidade do pacote de memória, não a identidade de release do frontend completo.
- Identificação aditiva: `GET /release-manifest.json` em 23/10/2026 respondeu 200 e foi comparado ao arquivo local; release `fenix-vps-static-overlay-20261023-memory-brain-phase2`, 9 hashes, estado declarado `partial-static-overlay`, `singleSourceCommit: null`. Ajuda a identificar os arquivos vivos, mas não fecha a divergência entre shell/World/IDE.
- Atualização 23/10/2026: em nova entrada fria autenticada, primeiro snapshot mostrou indisponibilidade e depois estabilizou em 37 agentes/9 prédios, `#city`, sem login. Corrigido o estado inicial `undefined`: renderer inicia em `CONNECTING` e mostra “Sincronizando telemetria…” até uma leitura; falha confirmada segue exibindo indisponibilidade/recuperação. `city-stale-snapshot` + regressões Cidade: 14/14. Deploy estático verificado no browser após reload. Isso fecha somente o rótulo transitório; UI-024 permanece aberto até matriz completa de autenticação/refresh/alias.
- Release phase3 (`fenix-vps-static-overlay-20261023-memory-city-startup-phase3`) identificada no manifesto público. Worktree continua sujo e somente o estado da Cidade/Memory tratado nesta fatia está pareado por asset; AUD-001 não fecha.
