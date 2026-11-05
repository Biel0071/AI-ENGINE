# GRG SPACE · REA e fluxo de design com evidência

Data da auditoria: 22/10/2026. Esta nota mapeia os fluxos públicos documentados e as capturas entregues, compara cada capacidade com o código local e registra a integração possível no Fênix. A auditoria é de produto/UX, não engenharia interna proprietária; nenhuma API, conta, projeto ou dado externo foi acessado ou alterado.

## Referências observadas

- **Stitch:** a fonte oficial atual descreve canvas de design com contexto multimodal (imagens, texto, código), agente de design, exploração de alternativas, DESIGN.md, protótipos navegáveis, crítica por voz e exportações/integradores. A captura anterior também mostra projeto, entrada por prompt e modo App/Web. O Fênix conecta análise/contexto do projeto, Screen DNA, memória de design, IDE e grafo; gera DESIGN.md a partir do perfil e evidência REA com revisão de diff. Layout por prompt, protótipo navegável, importação/exportação e crítica por voz permanecem pendentes.
- **Miro:** home de trabalho com projetos/quadros recentes, busca, favoritos, organização, grade/lista, filtros e modelos. O Fênix tem Project Hub autenticado, busca/lista de projetos, filtros de portfólio e Screen DNA; não tem quadros editáveis, favoritos, compartilhamento colaborativo ou catálogo de modelos.
- **Lovable:** a documentação atual cobre árvore de projeto, chat, planejamento antes de implementar, modo de construção, prévia em tamanhos de tela, código, edição a partir da prévia, rascunhos, histórico, integração Git e publicação. As capturas também mostram o editor dividido entre navegação/código, preview e chat. No Fênix, Project Hub/IDE/Live Browser/Git/jobs/Fast Lane dão partes desse fluxo; já há seleção visual no preview, draft persistido por 30 minutos com diff/confirmar e plano conectado ao Flow Graph. Sandbox de preview isolado, histórico visual completo e publicação/reversão ponta a ponta continuam sem prova. Dados da captura com pagamento e a identidade visual desses produtos não foram reutilizados.

Observação de navegador, 22/10/2026: a página pública atual do Stitch abriu sem autenticação e mostrou uma caixa de prompt, seletor de arquivo, opções App/Web, estilo Balanced, Live Mode (Preview), geração desabilitada enquanto o prompt está vazio e cartões de templates; a página também anuncia exportação HTML/Figma. A página pública do Lovable mostrou entrada de chat, seletor Construir e ações de anexo/transcrição desabilitadas com entrada vazia; o anúncio público descreve criação e publicação, sem provar esses resultados na sessão. Miro redirecionou para cadastro/login; nenhum login foi tentado. Sua captura fornecida mostra Create, templates, recents, busca e alternância lista/grade. A captura fornecida do editor autenticado Lovable mostra navegação de projetos, Preview/Files/Code, seletor de rota/viewport e chat de alteração. Esses elementos privados são evidência fornecida pelo operador, não interação reproduzida nesta sessão; a auditoria limita afirmações a telas públicas e capturas autorizadas.

### Rechecagem autenticada do catálogo Screen DNA na VPS

Em 22/10/2026, a aba autenticada `#projects` mostrou FÊNIX OS com 718 telas no cartão e no resumo do projeto. A aba Screen DNA exibiu o contêiner com “showing 0-500 of 6401 items”. Os primeiros cartões são de diretórios `archive/` e `backups/`, sem captura e sem DOM medido, apesar de exibirem seis componentes e “Origem: observação registrada”. Isso confirma, na versão atualmente servida, divergência entre a contagem resumida e o catálogo, além de metadados que parecem observacionais sem evidência visual correspondente. O HTML de acessibilidade confirma o conteúdo, mas não identifica a resposta bruta nem o hash/versão dos scripts servidos; a causa exata dos 6.401 itens permanece aberta. Registro vinculado ao bug estável `UI-012` em `docs/GRG_SPACE_VISUAL_BUG_BACKLOG.md`. A correção de proveniência local continua sem publicação e sem validação na VPS.

### Referências primárias consultadas

- Stitch, anúncio oficial de 18/03/2026: https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- Miro, documentação oficial de Home: https://help.miro.com/hc/en-us/articles/360017571294-Home-page
- Lovable, índice oficial de documentação: https://docs.lovable.dev/llms.txt (editor, chat, preview, drafts, code mode, history, settings, Plan mode, Build mode, preview toolbar e design systems).

## Matriz de capacidade

O painel de Inteligência do Project Hub agora mostra a matriz por capacidade com status e localização da evidência. Os status são explícitos: `PARTIAL` significa que existe um fluxo relacionado, mas não cobre o comportamento de ponta a ponta; `BACKLOG` significa que ainda não está integrado. Botões na matriz levam somente a telas já implementadas no Fênix.

| Produto / capacidade observável | Adaptação no Fênix | Estado local |
|---|---|---|
| Stitch: contexto por objetivo e histórico de projeto | REA, perfil universal/do projeto em memória e contexto autenticado no chat | Parcial |
| Stitch: DESIGN.md orientado pelo projeto | Project Hub gera um rascunho com objetivo, viewports, referências escolhidas e evidência REA; IDE mostra diff e pede confirmação; importação lê campos permitidos com prévia, confirmação e hash de origem | Parcial; não há exportação para Stitch nem crítica por voz |
| Stitch: canvas multiformato e telas conectadas | Screen DNA lista capturas/rotas e Flow Graph exibe relações observadas | Parcial; não reproduz fluxo clicável |
| Stitch: protótipo navegável, DESIGN.md, crítica por voz e exportação | Sem equivalente funcional identificado | Backlog |
| Miro: home, busca e recuperação do trabalho | Project Hub, pesquisa de projetos, acesso a recentes e favoritos e portfólio filtrável de telas | Parcial; favoritos/recentes são preferências locais, sem sync multiusuário |
| Miro: quadros, favoritos e grade/lista persistente | Screen DNA organiza telas reais; o catálogo alterna lista/grade. Ordem e favoritos ficam no navegador | Parcial; sem quadro colaborativo, espaços ou preferências sincronizadas no servidor |
| Miro: Sidekick entende o quadro, pergunta e edita objetos no lugar | Memória do projeto, evidência REA, plano IDE e Flow Graph preservam contexto e proveniência | Parcial; o Flow Graph ainda não é um canvas inteiro editável pelo chat |
| Miro: templates, comentários e colaboração ao vivo | Sem camada de quadro colaborativo identificada | Backlog |
| Lovable: projeto, árvore, código e prévia | Project Hub, browser de arquivos, IDE e Live Browser | Parcial; seleção/preview varia por projeto |
| Lovable: seleção, edição inline, anotações e comentários na toolbar do preview | IDE vincula um elemento selecionado ao plano REA | Parcial; edição inline, desenho de anotações e comentários ainda não existem |
| Lovable: planejamento antes de alterar e conversa de build | IDE consulta provider configurado com perfil e evidência REA; plano salvo na memória do projeto aparece no Flow Graph e segue para proposta de diff do arquivo aberto | Integrado localmente; execução multi-arquivo/job não é parte deste fluxo |
| Lovable: rascunho, seleção de elemento no preview, histórico e publicar/reverter | Draft persistido por 30 min + diff/confirmar e seleção contextual no preview; Git/jobs cobrem passos isolados | Parcial; preview isolado, histórico de versões e publicar/reverter ponta a ponta pendentes |

O perfil de design atual é `2.0` e mantém fontes, fatos observados, adoção no Fênix, limitações e botões de navegação. Não afirma conexão com os serviços nem replica seus algoritmos internos.

## Fluxo já integrado

1. Project Hub resolve o projeto autenticado e o workspace registrado. Um ID desconhecido retorna `PROJECT_NOT_FOUND`; não cai no projeto Fênix padrão.
2. `Analisar com REA` lê os arquivos reais e gera evidência com SHA-256, módulos, rotas, fronteiras e limites detectados. Cache global do processo não é usado para responder a leitura de evidência por projeto/tenant.
3. A evidência é salva na memória persistente vinculada ao ID do projeto, com chave estável `rea-evidence:<projectId>` e proveniência do REA. Reabrir Inteligência do Sistema carrega a última evidência salva.
4. Flow Graph, no contexto do projeto, lê essa evidência e monta nós/relações somente a partir de módulos, pacotes, rotas e jobs que correspondem ao projeto. Não declara build, módulo genérico ou job de outro projeto como concluído.
5. A IDE tem um atalho REA que abre o projeto selecionado no Project Hub e inicia a leitura; a tela de análise também dá acesso ao Flow Graph. A ação não grava código nem cria jobs.
6. O painel de Inteligência oferece um perfil de design por projeto derivado das referências visuais observadas. O perfil 2.0 mantém o intake de contexto, estados, restrições e aceite, e permite registrar um objetivo (até 500 caracteres), escolher superfície Web/App, direção visual, fontes Stitch/Miro/Lovable e viewports. As escolhas são salvas na memória daquele projeto; apenas o perfil base vai à memória universal. Fast Lane e Copilot da IDE usam o brief e enums permitidos do projeto, tratando o brief como requisito e limitando comprimento/controles. Flow Graph mostra as escolhas e só adiciona ao grafo as referências selecionadas. Os atalhos abrem Project Hub, Screen DNA, Inteligência e IDE.
7. O chat recupera a preferência visual universal/do projeto e, quando o workspace atual tem evidência persistida do REA, recupera apenas um resumo validado por projeto (ID, hash, contagens, stack e rotas). Da memória de design, só enums allowlisted e o `designGoal` explicitamente digitado pelo operador (limite 500 caracteres, normalizado em uma linha) entram no contexto. Outros campos livres e instruções arbitrárias da memória não são copiados. A análise é estrutural e datada; não prova estado de runtime. A conversa continua se a memória REA estiver indisponível.
8. Cada rota observada pelo REA oferece `Abrir <arquivo> na IDE`: o Fênix seleciona o mesmo projeto e abre o arquivo citado na evidência. Cartões Screen DNA também abrem o arquivo de origem quando registrado e levam ao Flow Graph do mesmo projeto. Nenhum path é inferido quando ausente; a IDE valida a leitura pelo endpoint autenticado existente.
9. Reordenar cartões do Screen DNA persiste a ordem em `localStorage` com chave por projeto. A interface informa que a preferência é local ao navegador; isso não altera a evidência REA, o catálogo de telas nem cria sincronização entre usuários/dispositivos.
10. O Copilot da IDE envia pergunta, projeto, arquivo, até 20.000 caracteres do conteúdo atual e preferências de design controladas ao provider configurado. Sem provider, retorna `AI_PROVIDER_UNAVAILABLE`; resposta vazia ou erro do provider também falham explicitamente. A consulta não cria missão/job nem emite patch. Texto do operador/modelo é renderizado via `textContent`; conteúdo analisado não é interpretado como HTML.
11. O passo `Planejar com REA` usa o mesmo provider autenticado em modo somente leitura, inclui perfil de design e evidência REA persistida, e devolve proveniência real. O operador pode salvar o plano na memória do projeto; o Flow Graph lê esses registros e liga cada plano ao projeto e ao arquivo medido. O hash integral do arquivo é armazenado, mas o grafo REA atual expõe só um prefixo de 16 caracteres para alguns módulos; por isso indica `HASH_PREFIX_MATCH`, sem alegar validação integral. O plano pode seguir para proposta de diff do arquivo aberto; não cobre edição multi-arquivo, não inicia job e só mostra o rascunho temporário. Aplicar ainda requer confirmação explícita e hash-base compatível.

## Alvos compartilhados de interface

- Controles compactos: 32 CSS px; padrão: 40 CSS px; alvos de toque: 44 CSS px.
- Espaçamento: escala 4/8/12/16/24 CSS px.
- Intake mínimo: projeto/workspace/branch/ambiente, objetivo/público/aceite, rotas e estados, referências/assets com origem, viewports e restrições.
- Botões: ação primária nomeia o resultado e revisão; secundária navega/abre contexto; ícones têm nome acessível; loading impede envio duplicado; erros oferecem recuperação; não há botão ativo sem ação funcional.
- Fluxo por projeto: selecionar contexto → organizar telas/rotas/componentes → revisar preview e dimensões → diff/testes → confirmar gravação ou ação externa.
- Esses números são alvos internos do design system, não medições inferidas de Lovable, Stitch ou Miro.

## Limites atuais

- A análise de workspace de um único arquivo não é suportada pelo REA; a API informa o bloqueio explicitamente.
- As referências de Stitch/Miro/Lovable são manuais/read-only. Ainda não existe sincronização automática com suas APIs.
- Esta fatia registra e reutiliza um contrato de interface e injeta evidência REA validada na conversa do projeto selecionado. REA continua sendo uma análise de leitura síncrona; não cria jobs nem altera código automaticamente. Próximos passos técnicos: ordem persistida do canvas; ligações explícitas de navegação entre telas com modo Play; intake de plano conectado ao diff e aprovação; rascunho isolado; seleção/inspeção visual de preview; versionamento e publicação com rollback verificado; import/export DESIGN.md; experiência de colaboração apenas após existir contrato de permissões e autoria.
- A persistência de evidência requer permissão de leitura do projeto e gravação de memória. Se a permissão faltar, a análise não será anunciada como persistida.
- Uma varredura local read-only deste workspace em 22/10/2026 (limite 400) gerou evidência `rea_ev_b11ddb04313d`, SHA `b11ddb04313d805d9dadd03f1627fa94688787389ae4fc0f37bc786eb85b59f9`: 400 arquivos considerados, 120 nós retornados no grafo da resposta, 250 endpoints expostos detectados, 105 chamadas de API e `filesTruncated=true`/`routeEvidenceTruncated=true`. Não é mapeamento completo e não foi persistida na memória de produção. A análise agora prioriza `src`/backend, distingue endpoints expostos de chamadas e sinaliza limites; a lista ainda requer paginação/varredura segmentada para cobrir todo o repositório.

## Evidência de verificação

- `test/rea-project-workflow-ui.test.js`: cobre workspace temporário real, rejeição de ID desconhecido, análise REA, persistência da memória de projeto e universal, abertura do arquivo de rota observado na IDE e nó configurado do Flow Graph.
- `test/conversation-memory-context.test.js`: verifica recuperação contextual e que texto arbitrário da memória não é injetado no prompt; indisponibilidade da memória não interrompe o chat.
- `test/rea-project-workflow-ui.test.js`: verifica contrato 1.4, matriz dos três produtos, seleções persistidas por projeto, estados parciais/backlog, atalhos funcionais, memória universal/do projeto, Flow Graph e montagem compatível com o Project Hub antigo.
- `test/design-reference-legacy-bridge.test.js`: verifica a ponte do Screen DNA legado com a evidência real de absorção, abertura de arquivo no projeto selecionado, contexto do Flow Graph e ordem local reidratada após recarregar.
- `test/rea-evidence-coverage.test.js`: verifica separação de rotas expostas/chamadas, exclusão de literais em tests/scripts e sinalização/prioridade de varredura truncada.
- `test/copilot-assist-provider.test.js`: comprova consulta ao provider real configurado, metadados observados, erro explícito sem provider e ausência de patch ou inserção de código fictício.
- `test/project-design-preferences.test.js`: valida enumerações, allowlist de referências/viewports e limite/normalização do brief persistido.
- Verificação desta fatia em 22/10/2026: 9 testes focados passaram (29/29); `node --check` passou nos módulos alterados e `git diff --check` passou.
- A VPS serve `/opt/fenix-os/public`. O chat responsivo/destacável e a matriz Stitch/Miro/Lovable foram publicados em 22/10/2026 sem reiniciar o serviço. Como o Project Hub servido diverge do arquivo local, a matriz usa um módulo compatível independente em vez de substituir o arquivo dirty inteiro. Backup do HTML imediatamente anterior à matriz: `~/grg-design-ref-rollback-20261022/index.html`; backup anterior do chat: `/tmp/grg-space-rollback-20261022-chat/`.
- Verificação remota em `http://209.50.241.22:3000/app?designboard=1.3#projects` em 22/10/2026: Project Hub e aba Screen DNA carregaram no projeto selecionado. O catálogo retornou 718 registros; a árvore acessível da página reportou 6.401 itens, principalmente cartões e ações. Há rotas com origem em diretórios `archive/` e `backups/`, sem captura atual nem medição DOM; essas entradas estão rotuladas como observações/histórico, não previews vivos. Esse volume motivou paginação de 24 cartões por página; testes verificam que apenas 24 cartões permanecem conectados no quadro e o restante segue navegável.
- A ponte compatível do Screen DNA legado foi publicada sem reiniciar o gateway, com backup prévio de `index.html` e `fenix-design-reference-panel.js` e substituição atômica dos assets e da referência de cache. O Project Hub remoto diverge do arquivo local; o bundle principal não foi substituído. Backup: `/home/deploy/rollback/grg-screen-dna-paging-20261022-v1.0/`. Hashes publicados desta versão: painel `8b71ab48028fb783adfc502fec09b832b9d2a02eec7a670fb2236d6a0d3c1161`.
- Estado desta fatia: `PASS` para testes focados locais (3/3), painel carregado na VPS, catálogo acessível com 24 cartões por página e navegação ao vivo da página 1 para a página 2 (`1–24 de 718` → `25–48 de 718`), estados/proveniência e handoff da primeira rota observados ao vivo: a IDE abriu no projeto Fênix OS em `archive/frontend/grg-apps-ai-city/index.html`. `PENDING` para medir INP/LCP antes/depois, exercitar a navegação do Flow Graph na versão ao vivo, e para importar/exportar DESIGN.md, protótipos clicáveis, rascunho isolado, colaboração e publicação/rollback de apps. `PASS` para chat remoto redimensionável/destacável.
- `test/project-understanding-workspace-ui.test.js`: a etapa REA/UI passou nesta execução, mas a suíte encerrou em falha posterior de captura do observador (`EPERM` ao renomear `checkpoint.tmp` para `checkpoint.json`).
- `test/rea-memory-fastlane.test.js`: uma expectativa preexistente de catálogo fixo (65 telas) falhou com 62 telas observadas; as outras verificações REA/Fast Lane passaram.
- A captura remota não foi usada para gravar dados de projeto/memória durante esta auditoria.

## Ciclo de correção REA Blueprint — 22/10/2026

- Reproduzido: a sidebar esperava os objetos `analysis` e `blueprint` aninhados, embora os endpoints devolvessem evidência e blueprint no nível raiz; o resultado era um estado de falha mesmo quando o contrato da API era válido. A interface também mostrava caminhos e tecnologias padrão não observados e afirmava que o blueprint estava pronto para execução.
- Corrigido localmente: o endpoint `POST /api/v2/rea/blueprint` exige sessão, permissão `project:read`, objetivo limitado e evidência REA persistida com ID e SHA compatíveis com o projeto e tenant. Sem evidência retorna `REA_EVIDENCE_REQUIRED` (409); nenhuma missão/job/edição é criada.
- O blueprint usa a evidência persistida, elimina caminhos/API/storage de fallback e declara `NOT_OBSERVED`/`NOT_RUN` quando os arquivos não comprovam esses contratos. A sidebar consome métricas e IDs reais do REA, informa truncamento e separa proposta de execução.
- Corrigido localmente: resolução da raiz `fenix-os` agora prioriza o workspace de aplicação `ai-engine/grg` nesta instalação, em vez da pasta catálogo superior. O teste confirma o caminho efetivamente resolvido.
- Testes desta correção: `test/rea-blueprint-evidence-route.test.js` (5 verificações de contrato/segurança/UI) e `test/rea-project-root-selection.test.js`; 18 testes focados da integração Project Hub/IDE/REA passaram (18/18). A suíte REA confirmou análise/hash/rotas após correção da raiz, e seus testes REA/fast-lane selecionados passaram (2/2). A suíte `test/rea-memory-fastlane.test.js` completa ainda tem uma expectativa antiga de ≥65 telas, enquanto o catálogo atual retorna 62; esse descompasso continua aberto, sem inflar a contagem.
- Estado: `PASS` para rota de blueprint, isolamento, mapeamento da raiz, testes de interface do REA e análise local. `PENDING` para conferir com provider real, capturar o navegador integrado, validar as telas privadas de Miro/Lovable e publicar/revalidar a versão da VPS.

## Ciclo Lovable: proposta revisável na IDE — 22/10/2026

- A IDE agora oferece `Propor edição` no arquivo aberto. O Copilot usa o provider configurado em modo somente leitura, valida JSON estruturado e vincula a resposta ao SHA do arquivo; resposta inválida ou sem provider resulta em erro explícito.
- O workspace guarda um rascunho temporário no processo, isolado por tenant/ator/projeto, limitado a 1 MB e 2.000 linhas para geração do diff. Nenhum arquivo é alterado ao criar ou visualizar o diff. O draft expira em 30 minutos e não sobrevive a reinício do serviço.
- `Confirmar e aplicar` pede confirmação e revalida o SHA antes de delegar à escrita já existente, que registra auditoria e memória. Hash divergente bloqueia a aplicação. Fechar a revisão invalida a requisição em andamento e descarta eventual draft tardio.
- Testes focados locais desta fatia: `test/project-workspace-drafts.test.js` e `test/copilot-assist-provider.test.js`. Isso prova contratos/segurança do backend e parte do contrato cliente, não uma sessão visual real com provider.
- Estado: `PASS` para testes locais e verificações sintáticas; `PENDING` para navegação manual, provider real, teste visual em viewports, revisão de histórico durável, e publicação/revalidação na VPS. A proposta atende ao passo de revisão antes de escrever; sandbox de código e rollback/publicação integrada continuam em backlog.

## Ciclo REA Plan → Build: plano antes do diff — 22/10/2026

- A IDE oferece `Planejar com REA`: consulta somente leitura ao provider, vinculada ao projeto e arquivo aberto, com o perfil de design selecionado e evidência REA persistida quando disponível. A resposta informa provider, modelo, duração e ID da evidência; falhas permanecem explícitas.
- O operador pode salvar o plano na memória existente do projeto com chave, tags e proveniência; o Flow Graph busca somente memórias `rea-plan` daquele projeto e cria nós vinculados ao projeto, arquivo e evidência. Hash integral é guardado; se o REA só fornecer hash curto, o grafo sinaliza correspondência de prefixo e não verificação completa.
- `Gerar diff deste plano` passa o objetivo e o plano revisado ao fluxo existente de proposta. O workspace cria rascunho temporário e diff; nenhum arquivo é escrito durante planejamento ou revisão. A escrita continua dependendo do botão `Confirmar e aplicar`, da confirmação do operador e da validação do hash-base.
- Escopo real: a geração aplica somente ao arquivo aberto. O plano deve limitar caminhos a evidência observada/arquivo aberto e explicitar testes não medidos; não cria missão/job e não promete edição de múltiplos arquivos.
- Evidência: `test/copilot-assist-provider.test.js` passou 9/9, incluindo plano somente leitura, contexto REA e hash integral do arquivo. `test/rea-project-workflow-ui.test.js` passou 1/1 com fluxo de navegador: REA persistido → plano → memória do projeto → nó no Flow Graph → diff temporário → arquivo intacto. O modal coube em 375, 768, 1280 e 1920 px. O processo Node ficou ativo após emitir TAP e foi encerrado manualmente. Sintaxe e `git diff --check` passaram.
- Estado: `PASS` para contratos locais e persistência/Flow Graph com provider simulado. `PENDING` para provider real, renderização manual na VPS e publicação/revalidação da versão servida.

## Ciclo Project Hub → IDE: confirmação de rascunho — 22/10/2026

- A navegação por arquivo/rota agora consulta alterações não salvas antes de trocar de tela. Cancelar preserva a rota e o buffer; confirmar descarta explicitamente o rascunho e prossegue para o workspace/arquivo selecionado.
- Os botões de abrir workspace, IDE, arquivo e Screen DNA usam o mesmo handoff com validação de caminho e preflight. O teste de navegador exercita cancelamento e confirmação no workspace temporário.
- Estado: `PASS` para o subteste local; `PENDING` para captura visual, conclusão natural do processo Node (mantém handles abertos após o TAP), e implantação/revalidação na VPS.

## Ciclo Stitch: DESIGN.md revisável — 22/10/2026

- Project Hub compõe o documento usando objetivo e seleções do perfil do projeto, referências escolhidas e evidência REA persistida (ID, SHA, contagens e persistência). Valores internos de controles ficam identificados como alvos, nunca como medições do app analisado; componentes e telas sem captura também são declarados como não medidos.
- O conteúdo é enviado como draft de criação/atualização e aparece no diff da IDE. O backend valida o hash ou a ausência do destino; aplicar exige confirmação explícita, checa colisões novamente e registra a escrita pela capacidade Git/auditoria/memória existente.
- `test/project-workspace-drafts.test.js`: 3/3 passou, cobrindo preview sem escrita, confirmação, colisão e hash obsoleto. `test/rea-project-workflow-ui.test.js`: subteste 1/1 passou incluindo gerar documento no workspace temporário e confirmar; o Node manteve handles abertos após TAP e foi interrompido manualmente. Sintaxe dos módulos alterados passou.
- Estado: `PASS` local para o fluxo e os drafts; `PENDING` para revisão visual manual, import/export de DESIGN.md, operação em projetos de catálogo restritos ao arquivo de entrada, provider real (não necessário para este documento determinístico) e implantação/revalidação na VPS.

## Auditoria de fluxo dos produtos de referência — 22/10/2026

Esta seção descreve padrões de produto observáveis nas capturas fornecidas e nos documentos públicos oficiais. Não presume acesso ao código privado, contas autenticadas ou serviços internos de Stitch, Miro ou Lovable.

Fontes primárias consultadas em 22/10/2026: [Lovable Plan mode](https://docs.lovable.dev/features/plan-mode), [Miro dashboard e organização de boards](https://help.miro.com/hc/en-us/articles/360017571294-What-is-on-your-dashboard), [Google Stitch canvas e protótipos](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) e [Stitch updates e exportação](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/).

| Padrão observado | Componente Fênix correspondente | Lacuna verificada / limite |
|---|---|---|
| Lovable: navegação do workspace, projetos e recentes junto do editor | Project Hub e navegação de arquivos da IDE | Catálogo, árvore e recentes locais existem; ainda não formam uma sessão sincronizada única entre dispositivos |
| Lovable: chat e preview lado a lado, rotas e tamanhos de dispositivo | IDE, Live Browser e preview de telas do Screen DNA | Preview exige um alvo descoberto; a seleção visual atual funciona em iframe acessível e não comprova cobertura de todos os projetos/rotas |
| Lovable: selecionar um elemento no preview e incluir contexto no pedido | `public/fenix-visual-ide.js` captura seletor, tag, texto e trecho HTML e preenche o prompt | Seleção é contexto de prompt; não é edição inline. O resultado segue o fluxo de plano/diff/confirmar da IDE |
| Lovable: rascunho, histórico e publicação como estados separados | Drafts de workspace persistidos no store, diff, escrita auditada e integração Git existente | Draft expira após 30 minutos e é recuperável; histórico durável de versões e publicação/rollback ponta a ponta não foram provados |
| Miro: recuperar trabalho por busca, recentes, espaços, modelos, favoritos e grade/lista | Project Hub, portfólio de telas e canvas Screen DNA | Busca/filtro de captura e alternância grade/lista do Screen DNA agora funcionam e persistem por projeto; Spaces, modelos, comentários e colaboração multiusuário não estão conectados a quadros |
| Miro: objetos conectados num quadro espacial manipulável | Screen DNA e Flow Graph | Screen DNA organiza telas reais e metadados; Flow Graph representa relações de código/memória. Não há quadro livre colaborativo com conectores arbitrários |
| Stitch: iniciar a partir de prompt/contexto multimodal, selecionar App/Web e estilo | REA + perfil de design por projeto + DESIGN.md revisável | Upload/captura só vira medida quando analisada; não foi identificado um canvas generativo de protótipos conectado ao provider |
| Stitch: iterar, comparar alternativas e formar protótipo navegável | Plano REA → memória de projeto → nó no Flow Graph → diff | Já existe uma trilha revisável de código; falta protótipo multi-tela navegável com links de interação e comparação persistente de alternativas |
| Stitch: crítica por voz e exportação | Chat/voz e IDE existem em outras áreas do Fênix | Não comprovado que crítica de voz compartilhe a sessão de design ou que exporte para formatos interoperáveis de design |

- Implementação Screen DNA: a busca opera sobre nome, rota e arquivo; o filtro separa capturas presentes, ausentes e históricas. A preferência de layout/filtro é salva no navegador por projeto. Capturas usam `loading="lazy"`/decodificação assíncrona para evitar solicitar todas ao abrir o mapa. Isso melhora localização e carga inicial, sem afirmar captura, medição de DOM ou preview onde não há evidência.
- Evidência local em 22/10/2026: `test/rea-project-workflow-ui.test.js` exerce busca com/sem resultado, grade/lista, filtro de evidência e restauração após troca de aba. A versão atualmente aberta na VPS ainda exibiu a lista antiga sem esses controles; o código local e a VPS não devem ser tratados como a mesma versão.

### Verdade do fluxo de REA e execução

- `POST /api/v2/intent/ingest-reference` registra fonte e pistas. URL sozinha não é baixada nem analisada; sem conteúdo/captura o estado é `NEEDS_CAPTURE`. Texto pode gerar apenas pistas `INFERRED_FROM_TEXT`; cor, tipografia, espaçamento, arquitetura e interação ficam sem medição até haver evidência verificável.
- O painel Screen DNA/IDE pode selecionar elemento de um preview acessível e incluir esse contexto no prompt. Isso não executa uma edição. O fluxo implementado é: referência/evidência → plano somente leitura → memória do projeto → Flow Graph → draft/diff → confirmação explícita → escrita validada por hash.
- O compilador de intenção anteriormente retornava `SUCCESS`, marcava todos os passos como `COMPLETED`, inventava testes passados e gravava aprendizado sem despachar um executor. Isso foi removido: `IntentEngine.processRequest()` retorna `AWAITING_APPROVAL` com a proposta e valores nulos para execução/testes. Não registra conclusão nem emite `intent.completed`. Esse endpoint ainda não é um executor; aprovação real precisa passar pelo MissionKernel/JobEngine canônico.
- `PreviewEngine.registerPreview()` registra um endpoint já ativo e emite observação de início. Ele não inicia o servidor, mede qualidade visual ou certifica que a rota funciona. `VisualRealityEngine` e qualquer score de QA também precisam de evidência de captura/teste antes de serem apresentados como aprovados.

### Próximos incrementos ordenados por dependência

1. **P0 — fechar revisão até resultado:** a IDE já encaminha plano revisado ao MissionKernel como etapa RED, com workspace Git resolvido pelo `projectId`, referências REA e aprovação canônica pendente. Continua necessário provar o ciclo com workspace real, revisor independente, diff do worktree, gates e resultado registrado; não marcar missão concluída por resposta do provider.
2. **P1 — coleta de referência reproduzível:** permitir anexar captura/HTML autorizado, guardar origem/hash/viewport e executar análise com provider real; renderizar fatos e inferências separadamente e permitir corrigir a associação de rota/componente.
3. **P1 — preview comprovável:** ligar descoberta de processo/porta, health/rota observada, captura por viewport e logs ao projeto; mostrar “indisponível”/“não medido” sem gerar preview fictício.
4. **P2 — canvas de projeto:** cartões de tela/componentes/rotas com relações rastreáveis, notas, zoom/organização e salvamento por projeto/usuário no servidor; as relações devem carregar origem e status medido/inferido.
5. **P2 — edição visual revisável:** seleção de elemento com screenshot/selector, geração de patch limitado, preview antes/depois, diff de arquivo e confirmação. A seleção existente é apenas o primeiro passo.
6. **P3 — protótipos e biblioteca:** templates derivados dos fluxos reais, comparação de variantes, links clicáveis entre telas, exportação/importação de DESIGN.md e formatos suportados. Colaboração, voz e publicação só devem ser anunciadas quando os contratos correspondentes forem validados.

### Fontes públicas

- Google Stitch: [anúncio oficial e capacidades do canvas](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/).
- Miro: [Home page](https://help.miro.com/hc/en-us/articles/360017571294-Home-page) e [Templates](https://help.miro.com/hc/en-us/articles/360017731093-Templates).
- Lovable: [Editor](https://docs.lovable.dev/features/projects/editor) e [Preview e teste](https://docs.lovable.dev/features/projects/preview).

### Sincronização da matriz com o fluxo existente — 22/10/2026

- A matriz do perfil `1.5` agora descreve o que foi exercitado no Fênix: seleção contextual no preview, plano REA somente leitura → memória do projeto → Flow Graph → draft/diff → confirmação. A seleção não altera o app diretamente.
- O status Lovable permanece `PARTIAL`: drafts agora sobrevivem ao reinício no store, expiram em 30 minutos e podem ser recuperados com diff/confirmar; não há preview isolado por draft, histórico visual completo nem publicação com rollback ponta a ponta. Miro permanece parcial porque favoritos/recents são locais e não existe quadro colaborativo sincronizado.
- O cache key do script foi atualizado para `1.5-reference-capability-map-20261022`, evitando manter a descrição antiga em cache do navegador.
- Evidência local: `test/design-reference-capability-map.test.js` (1/1), `test/rea-project-workflow-ui.test.js` (1/1, Playwright) e testes de perfil/draft/copilot (19/19 em conjunto) passaram. A integração percorre análise REA persistida, plano e memória, Flow Graph sem módulos fictícios e diff sem gravação antes da confirmação.
- A execução Playwright registrou um `GET /api/fenix/projects/rea-ui-fixture/analysis` com 404 antes da análise tradicional do Project Kernel; o fluxo REA termina aprovado, mas a ausência esperada ainda é logada como erro de servidor e deve ser tratada na próxima auditoria de ruído/empty-state.
- Estado: `PASS` para estes contratos e integração local; `PENDING` para validar providers reais, análise multimodal de capturas externas, revisão visual manual de cada viewport, publicação/rollback na VPS e completar as capacidades de canvas/protótipo colaborativo.

### Contexto do preview até plano, diff e Flow Graph — 22/10/2026

- O Visual IDE agora expõe somente a identidade observada da tela, rota e seletor/tag/texto do elemento clicado; o HTML completo do elemento não cruza a fronteira.
- A IDE associa a seleção ao projeto apenas quando a raiz do workspace do preview corresponde à raiz do projeto aberto. Essa verificação evita anexar seleção antiga ou de outro projeto.
- O contexto acompanha a consulta PLAN, a proposta PROPOSE_EDIT e a memória existente do plano. O Flow Graph representa a seleção como nó de tela observado e liga o plano a ela; o backend exige o `projectId` ativo e sanitiza os campos antes de enviá-los ao provider.
- A ação “Edit Screen with AI” agora abre a IDE no arquivo-fonte descoberto, prepara o diálogo revisável e inclui tela, rota e elemento selecionado no pedido; não enfileira tarefa nem grava arquivo automaticamente. A ligação do clique é idempotente e funciona se o iframe já carregou ou ainda está carregando.
- Verificação local: `test/copilot-assist-provider.test.js`, `test/design-reference-capability-map.test.js` e `test/rea-visual-selection-context.test.js` passaram (13/13). `test/rea-project-workflow-ui.test.js` passou (1/1) e agora descobre uma tela HTML real no workspace temporário, abre o preview same-origin, clica no botão, envia a observação ao PLAN, salva a memória sem caminho local e verifica o nó/aresta no Flow Graph.
- A execução ponta a ponta encontrou e corrigiu a perda do rascunho de design: atualizações assíncronas do Project Hub recriavam o formulário e apagavam o objetivo. O formulário agora conserva mudanças temporárias por projeto durante a sessão; memória só é escrita ao clicar em aplicar, e o teste verifica o valor após a atualização do painel.

### Recuperação de propostas do IDE — 22/10/2026

- Diffs pendentes agora são persistidos no `app.store` com expiração de 30 minutos e escopo por tenant, usuário e projeto. Reiniciar o processo não perde a revisão; o endpoint de listagem retorna apenas metadados e exige autenticação/autorização existentes.
- A IDE oferece “Rascunhos” para localizar e reabrir um diff salvo. A listagem não grava arquivos; a escrita continua condicionada à confirmação explícita e à validação de hash base. Limites de armazenamento retornam erro explícito, sem apagar rascunhos ativos silenciosamente.
- Evidência local: `project-workspace-drafts.test.js`, `enterprise-foundation.test.js` e `postgres-store-read-fast-path.test.js` passaram (19/19); `rea-project-workflow-ui.test.js` passou (1/1) percorrendo o fluxo REA, preview contextual, plano/Flow Graph, diff persistido reaberto sem gravar e importação confirmada de `DESIGN.md`. A fixture autoriza somente sua raiz temporária para o Project Mirror.
- Estado: contratos API e fluxo de UI local `PASS`; provider real, inspeção manual em viewports e VPS `PENDING`. A mudança não foi publicada.
- Estado: seleção visual→plano→memória→Flow Graph `PASS` local, com provider de copilot simulado no teste. Provedor real, viewport com captura manual e VPS permanecem `PENDING`.

### Plano REA para missão canônica — 22/10/2026

- `POST /api/dev/pipeline` agora exige projeto selecionado, valida workspace disponível e Git, ignora caminhos enviados pelo navegador e cria uma missão com uma etapa `dev-execute` RED contendo o plano e referências REA. A rota inicia a missão somente até `AWAITING_APPROVAL`; o job permanece inexistente até uma aprovação canônica.
- Na IDE, “Enviar para aprovação” registra a missão após revisão explícita, mostra IDs reais e oferece abrir a fila de operações e atualizar o estado. A aprovação deve vir de outro administrador, conforme a política existente que impede autoaprovação do solicitante. Depois da aprovação, o JobEngine executa em worktree isolada e o backend devolve `READY_FOR_REVIEW` com diff; a IDE ainda não incorpora o diff de saída para revisão visual e não há merge automático.
- Verificação: `test/dev-pipeline-route.test.js` passou 2/2; `test/project-ide-mission-handoff.test.js` e `test/project-mirror-async-render.test.js` passaram 2/2; contratos MissionKernel/aprovação e topo/KPI passaram na suíte focada 14/14. `node --check` passou para os módulos alterados. A jornada REA completa avançou até o preview e draft, mas repetiu falha de iframe com RAM local em ~15.6/16 GB; ela não chegou ao novo handoff nessa execução.
- Estado: API local e UI isolada do handoff `PASS`; jornada longa autenticada `PENDING` por pressão de recursos; provider real, aprovação de outro usuário, gates/diff final e VPS `PENDING`. Nenhuma implantação foi feita nesta alteração.

### Recuperação do catálogo e nova conferência pública — 22/10/2026

- Padrão Miro confirmado na documentação atual: Home coloca conteúdo relevante/recente à frente, oferece Starred e Browse/Search, filtros e alternância entre grade/lista. Aplicação no Fênix: Project Hub agora permite Todos/Recentes/Favoritos, alterna lista/grade, guarda favoritos e últimas 24 aberturas em `localStorage` e abre somente projetos que vieram do catálogo do servidor. Isso é estado pessoal deste navegador, não dado canônico nem colaboração.
- Padrão Lovable confirmado na documentação atual: projeto abre em editor com chat à esquerda e preview executável à direita; toolbar separa Preview/Files/Code; preview permite tamanhos de dispositivo, seleção, texto inline e anotações; versão publicada é separada do preview. Fênix possui Project Hub/IDE/Live Browser, seleção de elemento, viewport e fluxo Plan→diff, mas o editor não tem versões de preview isoladas por draft nem aprovação/publicação com rollback; continuam `PARTIAL`.
- Padrão Stitch confirmado pela fonte oficial: canvas de design multimodal, agente que acompanha a evolução do projeto, exploração de alternativas, protótipos conectados e DESIGN.md importável/exportável. Fênix ancora contexto no REA e nas referências/metadados do projeto; ainda não gera protótipos navegáveis comparáveis ou um canvas multimodal de design. Continua `BACKLOG`.
- Conferência das páginas no navegador desta execução: Lovable abriu a landing pública; Miro redirecionou para cadastro. A página do Stitch abriu sem conteúdo utilizável neste navegador. Não houve login, submissão de prompt, upload ou alteração nos produtos de terceiros; interfaces privadas continuam observadas apenas nas capturas fornecidas e documentos oficiais.
- Testes de catálogo: `test/project-hub-lazy-startup.test.js`, `test/local-project-catalog-ui.test.js` e `test/project-hub-unavailable-state.test.js` passaram (4/4). O Playwright carrega a folha de estilos real e verifica contenção da barra em 375, 768, 1280 e 1920 px; inspeção manual por captura permanece `PENDING`.
- Estado: recuperação de projeto `PASS` local; favoritos e recentes são preferências deste navegador. Sincronização multiusuário, criação de Spaces/boards, templates colaborativos, preview de drafts isolado e protótipos Stitch permanecem `PENDING/BACKLOG` conforme a matriz.

Fontes oficiais usadas nesta atualização:

- [Miro Home: recentes, favoritos, busca, filtros e grade/lista](https://help.miro.com/hc/pt-br/articles/360017571294-P%C3%A1gina-inicial).
- [Lovable Editor: chat, preview, Projects, Starred e Recents](https://docs.lovable.dev/features/projects/editor) e [preview, viewports e seleção visual](https://docs.lovable.dev/features/projects/preview).
- [Google Stitch: canvas, agente, protótipos, DESIGN.md e voz](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) e [atualização de edição em tempo real/exportação](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/).

### Proteção contra corrida ao restaurar preferências — 22/10/2026

- Um teste Playwright atrasou a resposta autenticada da memória enquanto o operador digitava. Reproduziu que a hidratação tardia sobrescrevia o rascunho recém-editado.
- `public/project-hub-live.js` agora restaura preferências salvas somente quando ainda não existe rascunho local naquela sessão/projeto. O salvamento explícito e a recuperação após reabrir continuam preservados.
- `test/rea-project-workflow-ui.test.js` cobre a corrida e confirma que o objetivo aplicado ainda alimenta o preview de `DESIGN.md` após restaurar o valor persistido.
- Verificação focada: 14/14 testes passaram (Playwright REA/Project Hub/Flow Graph, contexto visual, copilot e matriz de capacidades). A execução ainda emite um 404 esperado da consulta de análise do Project Kernel antes de iniciar REA; continua anotado para auditoria de ruído.
- Estado: proteção de rascunho `PASS` local. A matriz Stitch/Miro/Lovable segue com limites já declarados; providers reais, colaboração sincronizada e validação visual manual permanecem `PENDING`.

### Entrada de referências por projeto e propagação para IDE/Flow Graph — 22/10/2026

- Project Hub agora recebe URL e/ou conteúdo capturado autorizado, envia a entrada ao Reference Acquisition Engine e salva a especificação com `projectId`, origem, limitações, estado e evidência na memória autenticada. URL sozinha resulta em `NEEDS_CAPTURE`; não há fetch automático nem medição visual fictícia. Credenciais e fragmentos da URL são removidos antes do armazenamento.
- A lista de referências é restaurada da memória do projeto. O Flow Graph cria um nó `TOOL` por referência e uma aresta `DERIVED_FROM`, mostrando `NEEDS_CAPTURE`/`PARTIALLY_ANALYZED` e pistas com estado, sem inserir notas livres no grafo.
- Conversa e IDE recebem apenas host, tipo, estado e códigos de capacidade validados. Notas, trechos arbitrários e instruções contidas na referência ficam fora do prompt do modelo.
- A matriz de capacidades passou para perfil `1.6`; permanece explícito que análise multimodal de imagem, acesso privado a produtos, canvas compartilhado e protótipo navegável não estão demonstrados.
- Verificação: testes de contexto da conversa e IDE verificam isolamento de projeto e ausência de prompt injection; Playwright exercita URL→memória→Flow Graph com estado `NEEDS_CAPTURE`; regressão do draft assíncrono permanece coberta. A rodada focalizada final deve registrar o resultado atualizado abaixo.

- Resultado final da fatia de referências (22/10/2026): `node --test --test-force-exit --test-concurrency=1 test/rea-project-workflow-ui.test.js test/conversation-memory-context.test.js test/copilot-assist-provider.test.js test/rea-visual-selection-context.test.js test/design-reference-capability-map.test.js` — **20/20 PASS**. `node --check` passou nos seis arquivos JS alterados.
- Playwright validou contenção dos controles em 375/768/1280/1920 px e gerou capturas. A captura 1280 px foi inspecionada; o novo painel de referência ocupa a largura total, sem estreitar os controles. A revisão visual manual dos demais viewports e da experiência autenticada real continua `PENDING`.
- O teste ainda registra o 404 esperado da busca de análise do Project Kernel antes do primeiro REA; não afeta o resultado, mas segue como ruído técnico a corrigir.
- A versão final do perfil de capacidades é `1.6`. Entradas de URL e texto são processadas pela heurística de aquisição, não por um provider de visão; captura de imagem, inspeção autenticada dos dashboards privados e validação de interações externas continuam `PENDING`. Nenhuma publicação na VPS foi feita.

### Capturas de interface com provider visual configurado — 22/10/2026

- O Project Hub permite enviar PNG/JPEG/WebP de até 1 MiB a `POST /api/v2/intent/analyze-reference-image`. A rota exige `project:read`, valida projeto no tenant, assinatura real do arquivo e modelo explicitamente configurado em `GRG_VISION_MODEL` (ou `FENIX_VISION_MODEL`). Sem provider/modelo visual compatível, retorna `503 VISION_MODEL_UNAVAILABLE`; não usa resposta fixa nem o analisador heurístico legado.
- A resposta deve ser JSON estruturado produzido por `app.llm.chat`, que recebe os bytes da imagem em `messages[].images`. O catálogo do Project Hub e a memória autenticada guardam observações, SHA-256, provider/modelo e duração; a imagem bruta não é persistida. O REA marca `MODEL_OBSERVATIONS_REQUIRES_VALIDATION`; observações do modelo não provam medidas, interação ou comportamento.
- O Flow Graph agora apresenta a captura como nó ligado ao projeto, com o estado de validação, modelo, provider, SHA, resumo de layout e componentes aparentes limitados. Conversa e IDE continuam recebendo apenas contexto estruturado e validado pelo escopo do projeto.
- Verificação: regressão relacionada de conversa, IDE, contexto visual, REA, mapa de capacidades, análise de imagem e rota — 25/25 `PASS`; `node --check` e `git diff --check` passaram. Playwright do Project Hub/Flow Graph passou 1/1 (reexecutado após incluir o seletor de arquivo na checagem responsiva) com endpoint visual interceptado por fixture de QA, validando upload, persistência sem bytes e proveniência no grafo; essa fixture não certifica provider real. O 404 de análise antes do REA permanece ruído conhecido.
- Perfil atualizado para `1.8`. Captura com provider configurado e fluxo UI/grafo `PASS` local; provider visual instalado/configurado e resultado ponta a ponta com modelo real `PENDING`; inspeção visual manual nas quatro larguras `PENDING`; dashboards privados, colaboração ao vivo, protótipos e publicação reversível continuam `PENDING/BACKLOG`. Nenhuma publicação na VPS foi feita.

### Contexto das capturas autenticadas Stitch, Miro e Lovable e uso pelo Fênix — 22/10/2026

Evidência: três capturas autenticadas fornecidas pelo operador. A inspeção não abriu sessão nem alterou dados nos serviços externos.

| Referência observada | Fluxo visível nas capturas | Correspondência atual no Fênix | Limite que permanece |
| --- | --- | --- | --- |
| Lovable Editor | Seletor de workspace/projeto, busca, projetos recentes; preview com rota selecionável e viewport; alternância Preview/Código/estrutura; Ask Lovable; ações Share e Publish. | Project Hub seleciona projeto/workspace; IDE abre arquivos, preview/viewport e modo split; Plan gera plano somente leitura, proposta gera diff e só grava após confirmação. | Compartilhamento/publicação contínua com histórico e rollback de release não estão implementados; preview de projeto só é real quando há URL/runtime disponível. |
| Miro Home | Criar quadro vazio ou por template, recentes em lista, colunas de nome/usuários/espaço/última abertura, alternância grade/lista e navegação de conteúdo. | Project Hub tem busca, recentes e favoritos neste navegador, lista/grade, Screen DNA e metadados de projeto. | “Usuários online”, Spaces colaborativos, templates de board e favoritos sincronizados não têm fonte/serviço real correspondente e não são simulados. |
| Stitch Home | My Projects/Shared with me, busca, agrupamento temporal, iniciar design com prompt, anexos, App/Web, direção de estilo e inspirações. | Project Hub guarda contexto por projeto; intake REA aceita URL/notas/captura; perfil oferece superfície/direção/viewports; conversa e IDE usam os fatos permitidos do projeto. | Shared with me, geração de múltiplas telas navegáveis, canvas de protótipo e inspiração por template ainda não têm equivalentes funcionais compartilhados. |

- O fluxo de captura por imagem agora chega ao contexto limitado da conversa e do Copilot/Plan da IDE: provider, modelo, estado de validação, resumo do layout e até oito rótulos/categorias/estados aparentes. O payload é JSON delimitado como dado visual não confiável; `visibleText`, notas submetidas, bytes e hash não são passados como prompt. A memória conserva hash como proveniência e não conserva bytes.
- O Flow Graph cria nós `COMPONENT` separados para os componentes aparentes da captura, ligados ao nó da captura com `DERIVED_FROM`; cada nó conserva `MODEL_OBSERVATIONS_REQUIRES_VALIDATION` e navega de volta ao projeto. Nenhum componente é promovido a elemento estrutural verificado pelo REA.
- Os fatos da referência continuam restritos ao mesmo `projectId`; edição permanece read-only até diff e confirmação. Nada nas capturas foi tratado como prova de comportamento ou como autorização para publicar.
- Evidência de implementação: `src/design/project-reference-context.js`; cobertura nas rotas reais de conversa e Copilot em `test/conversation-memory-context.test.js` e `test/copilot-assist-provider.test.js`; testes de isolamento e injeção em `test/project-reference-context.test.js`.
- Regressão após esta integração: 27/27 `PASS`; o E2E confirmou intake de captura, contexto do projeto, nós de referência/componente e metadados de modelo no Flow Graph. Revisão das capturas em 375/768/1280/1920 segue `PENDING` para os demais painéis; o resultado real de provider visual e a versão publicada seguem `PENDING`.

### Correção visual reproduzida no Project Hub — 22/10/2026

- A captura Playwright em 1280 px reproduziu o contador do projeto espremido: o card era um grid de duas colunas, mas o botão de abrir ocupava apenas a primeira célula; o conteúdo interno ficava em ~52 px. O card agora reserva espaço para o favorito e mantém o botão de abertura e seus metadados na área larga.
- Em 375 px, os botões do intake podiam disputar largura e o fim da área de rolagem ficava junto da barra fixa inferior. A vista móvel agora limita os controles ao painel, permite quebra legível dos rótulos e reserva 110 px no fim do scroll.
- O E2E mede a largura real do botão/conteúdo do card e exige `writing-mode: horizontal-tb`. A captura nova em 1280 px foi inspecionada e mostra o contador horizontal e legível. A captura de 375 px mostra os controles alcançáveis via scroll, mas falta revisão manual em dispositivo real e das demais áreas/painéis nas quatro larguras.
- Resultado: regressão REA/Project Hub/Flow Graph `1/1 PASS`; suíte relacionada conversa, memória, IDE, referências, imagem e rota `27/27 PASS`; `node --check` e `git diff --check` passaram. O log ainda contém o 404 conhecido da consulta de análise antes do primeiro REA.
- Estado: card e contenção responsiva do intake `PASS` no navegador local com Playwright; validação visual manual completa `PENDING`; provider multimodal real configurado `PENDING`; publicação/versão VPS `PENDING`. A publicação não foi tentada pois a identidade segura do processo na porta 3000 e o procedimento verificável de rollback não estão estabelecidos.

### Importação confirmada de DESIGN.md para memória do projeto — 22/10/2026

- O Project Hub lê `DESIGN.md` do workspace selecionado via rota autenticada existente, limita o tamanho a 64 KiB para esta operação e exibe campos extraídos e Markdown original em uma prévia. Nada é persistido até a confirmação explícita.
- O parser aceita somente objetivo, superfície, direção, viewports, IDs/SHA do REA e URLs de referência com allowlist. Markdown bruto e instruções livres não entram na memória nem no contexto do modelo. Preferências e SHA-256 ficam no perfil de memória daquele projeto com origem e estado `IMPORTED_UNVERIFIED`; importação não afirma que o arquivo está validado visual ou funcionalmente.
- A importação preserva referências oficiais selecionadas que constam no documento e não altera o perfil visual universal. A geração já existente continua criando um draft na IDE com diff/confirmar.
- Perfil evoluiu para `2.0` para refletir drafts persistidos por 30 minutos e fluxo E2E local comprovado. Parser: 2/2; mapa de capacidades: 1/1; Project Hub/Flow Graph E2E: 1/1. A cobertura inclui REA, preview same-origin, seleção visual, plano e memória, diff reaberto sem escrita e importação confirmada de DESIGN.md. Provider real e inspeção visual manual permanecem `PENDING`.
- `node --check` nos scripts afetados e `git diff --check` passaram. Estado: importar para o perfil do projeto e gerar draft `PASS` local; integração externa/exportação a Stitch, canvas/protótipo, provider visual real, revisão completa em quatro viewports e VPS permanecem `PENDING/BACKLOG`.

### Screen DNA no grafo do projeto — 22/10/2026

- Ao abrir “Ver relações no Flow Graph” em uma tela do Screen DNA, o Project Hub repassa o relatório de absorção já carregado. O grafo valida `projectId`, limita a 120 registros e cria nós `SCREEN` com rota, arquivo, estado de descoberta, captura e inspeção; nenhum conteúdo-fonte bruto é copiado.
- Cada tela ganha uma aresta `ROUTES_TO` a partir do projeto. Uma aresta `DERIVED_FROM` para um arquivo REA só é criada quando `sourceFile` coincide exatamente com o `path` do mesmo `applicationGraph`.
- O E2E exercita absorção real do workspace temporário, proveniência, estados não medidos, origem REA correspondente e isolamento quando um relatório é enviado para outro projeto. Estado: implementação local e validação focada `PASS`; layout manual nas quatro larguras e versão/rollback da VPS `PENDING`.

### Planejamento REA em escopo de projeto — 22/10/2026

- A IDE oferece “Plano REA” sem exigir arquivo aberto. A rota autenticada reutiliza o contexto do projeto selecionado, perfil de design, referências salvas e evidência REA persistida; o resultado é explicitamente somente leitura e retorna `createsJob: false`, sem hash de arquivo ou missão.
- O operador pode salvar o plano na memória já existente do projeto. O Flow Graph classifica-o como `PROJECT_PLAN` e liga a evidência às referências do mesmo projeto e ao perfil visual usado. O plano não oferece ação de build de arquivo; mudanças continuam passando pela seleção de arquivo, proposta e diff.
- Verificação local nesta rodada: `copilot-assist-provider`, contexto de seleção visual, matriz de capacidades e contrato de Flow Graph — 15/15 `PASS`; `node --check` nos três scripts de runtime e `git diff --check` `PASS`.
- `test/rea-project-workflow-ui.test.js` passou 1/1 nesta rodada, exercitando plano de projeto, memória, relações no Flow Graph, draft persistido reaberto sem escrita e importação confirmada de `DESIGN.md`. A fixture autoriza somente sua raiz temporária no Project Mirror; essa configuração não altera produção.
- Revisão manual em quatro viewports, provider real, versão servida/rollback da VPS e publicação `PENDING`.

### Auditoria remota do Screen DNA e foco do Flow Graph — 22/10/2026

- Em sessão autenticada e sem mutações, o catálogo da VPS abriu 718 registros. No primeiro cartão, a rota registrada como `/archive/frontend/grg-apps-ai-city/index.html` levou a um Inspector cujo DOM era da API Platform (`<title>API Platform</title>` e formulário de login). O painel simultaneamente declarou 28 nós e 98.5% de paridade, sem captura registrada; título do Inspector `undefined`. Registro rastreável no backlog: UI-185, estado `OBSERVED`.
- A ação para Flow Graph abriu a telemetria geral do projeto (39 agentes/60 jobs) sem foco visual na tela selecionada. O workspace local agora passa `focusNodeId` canônico, centraliza e seleciona a mesma tela. Registro UI-186: `FIXED` local; VPS sem atualização.
- Commit remoto exibido no projeto: `dbbf617b97a0`. Isso não comprova o bundle servido nem a associação entre rota e preview. Não foi executada absorção, job ou escrita. A divergência precisa ser corrigida e verificada antes de sincronizar.
- `test/rea-project-workflow-ui.test.js` alcançou e passou pela asserção de foco/seleção no navegador, mas a suíte terminou depois falhando numa espera da etapa de plano (“Plano do projeto pronto para revisão”); fluxo completo `FAIL/PENDING`, sem declarar a jornada inteira aprovada.

### Transições de tela no Flow Graph — 22/10/2026

- A descoberta estática reconhece controles `<button>` com `data-nav` e chamada explícita a `window.showView(...)` ou `fenixSwitchNav(...)` cujo destino existe no mesmo arquivo. A aresta conserva label, seletor, arquivo e linha.
- Screen Discovery e Project Absorption Engine anexam essas transições ao Screen DNA. O Flow Graph as liga como `NAVIGATION` com `evidenceSource: STATIC_SOURCE` e `verificationStatus: NOT_VERIFIED`; leitura do código não é apresentada como clique/runtime.
- Destinos desconhecidos, links genéricos e botões sem handler explícito são ignorados.
- Verificação local: testes de helper, shell e absorção — 4/4 `PASS`; `test/rea-project-workflow-ui.test.js` — 1/1 `PASS`, incluindo aresta `NAVIGATION` com seletor e estado não verificado; `node --check` e `git diff --check` `PASS`.
- Estado: integração e jornada do navegador local `PASS`; medição visual manual e confirmação de navegação em runtime `PENDING`; versão servida, rollback e VPS `PENDING`.

### Auditoria atualizada de Lovable e Miro — 22/10/2026

- Capturas autenticadas fornecidas pelo operador mostram o editor Lovable dividido entre chat, Preview/Files/Code e toolbar visual; a home Miro mostra templates, recentes, busca e alternância grade/lista. O Stitch mostra projetos recentes/compartilhados, prompt multimodal, escolha App/Web e estilo.
- A documentação oficial atual do Lovable descreve seleção de elementos, edição inline, anotações e comentários na toolbar do preview: https://docs.lovable.dev/features/preview-toolbar. O Fênix só fornece seleção contextual para o plano REA; os outros três modos permanecem `PARTIAL`/abertos.
- A documentação oficial atual do Miro descreve Sidekicks que entendem o quadro, fazem perguntas, planejam e editam objetos no lugar: https://help.miro.com/hc/en-us/articles/39972686949266-Intelligent-Canvas-2-0-overview. O Fênix transporta memória, evidência, referências e plano ao Flow Graph, mas o chat ainda não lê nem modifica o grafo inteiro como um canvas.
- A matriz do Project Hub e o playbook enviado à IDE agora registram essas capacidades e lacunas com fontes diretas. Não houve login, alteração ou chamada de API aos produtos externos; observações de interface autenticada vieram das capturas do operador.
- Verificação local: `design-reference-capability-map`, `copilot-assist-provider`, `design-reference-flowgraph` — 15/15 `PASS`; `rea-project-workflow-ui` — 1/1 `PASS`. O E2E utiliza provider de teste/fixture para comprovar a jornada local, portanto não certifica um provider de visão real. Execução local, não validada na VPS.
- Próxima tarefa prioritária: implementar seleção + anotação/comentário de tela com proveniência no Project Hub/IDE e edição semântica de nós protegida por confirmação no Flow Graph; validar manualmente os quatro viewports e com provider real antes de alterar o estado para `VERIFIED`.

### Iteração Miro → Flow Graph: quadro de projeto reorganizável — 22/10/2026

- Releitura das três capturas fornecidas: Lovable mostra a hierarquia projeto/arquivos/código/preview/rota com solicitação contextual; Miro mostra criar por quadro/template, recentes e modos lista/grade; Stitch mostra projetos/compartilhados, prompt multimodal e escolha App/Web/estilo. As capturas mostram sessões autenticadas do operador; a leitura não demonstra integração externa do Fênix.
- Conferência pública de leitura: [Lovable](https://lovable.dev/pt-br/) expõe intake por conversa e fluxo de criação/iteração; [Stitch](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/) documenta prompt e imagem, exploração de variantes e exportação; [Miro Frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames) documenta canvas, frames e navegação por conteúdo estruturado. As áreas autenticadas não foram alteradas.
- Lacuna funcional reproduzida no Fênix: Flow Graph organizava entidades reais automaticamente, mas não permitia ao operador rearranjar cartões para ler uma arquitetura/rota.
- Implementação local: arraste e teclado movem cartões; arestas acompanham a interação; a disposição manual é persistida localmente por contexto/projeto. “Restaurar disposição automática” recupera o layout calculado. A camada altera somente coordenadas visuais; REA, IDs, estados, proveniência e dados do runtime continuam canônicos.
- Limites: não há objetos de quadro livres, colaboração/presença/comentários nem sincronização da disposição entre operadores; templates e layouts gerados pelo REA ainda não são aplicados automaticamente. A preferência do canvas permanece local ao navegador.
- Teste red-green: a regressão Playwright falhou antes da correção ao esperar o marcador de layout salvo; falta executar a mesma prova após a implementação por pressão de memória local. Resultado deverá ser registrado em `UI-187` antes de elevar de `FIXED` local para `VERIFIED`.
- Deploy: nenhuma alteração enviada à VPS; a divergência local/servidor e a falta de rollback verificável permanecem.

### Inventário atualizado de vídeos, plataformas e universo GRG — 22/10/2026

- Auditoria detalhada do conjunto de 15 vídeos únicos, matriz Lovable/Miro/Stitch, inventário das 18 views do HTML e critérios de evolução: [GRG_SPACE_REFERENCE_MEDIA_AUDIT_2026-10-22.md](GRG_SPACE_REFERENCE_MEDIA_AUDIT_2026-10-22.md).
- O inventário de mídia contabiliza 26.739 frames e 15:01 de duração; foram revisados storyboards em intervalos regulares, não cada frame visual individual. Essa limitação está registrada para não afirmar cobertura que não ocorreu.
- Miro e Stitch estavam abertos no browser, mas a extração visual falhou por timeout; por isso, suas capacidades atuais foram comparadas usando documentação oficial e a sessão ficou marcada `PENDING`, sem interação externa.
- Dez itens de melhoria AUD-001–AUD-010 foram adicionados ao backlog, cada um com evidência/critério. A primeira fatia local liga seleção visual observada a uma tela absorvida somente por `projectId` igual e correspondência não ambígua.
- Verificação dessa fatia: teste puro `flow-graph-evidence-truth` passou 2/2. E2E Playwright começou a inicialização, mas não forneceu resumo de conclusão dentro do limite da chamada; registrar como `PENDING`, não PASS. A VPS não recebeu essa alteração.
