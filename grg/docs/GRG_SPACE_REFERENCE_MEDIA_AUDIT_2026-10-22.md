# GRG SPACE — auditoria de vídeos, plataformas e mapa de evolução

**Data:** 22/10/2026
**Fonte:** 15 vídeos únicos enviados em dois arquivos ZIP e dois MP4, captura da tela inicial do Stitch, browser com sessões Lovable/Miro/Stitch abertas, documentação pública oficial e código do shell Fênix no checkout local.
**Versão do Fênix avaliada:** checkout local em `ai-engine/grg` para mapa de código; inspeção runtime adicional da VPS `:3000`, declarada visualmente como `v2.5.0`, sem identificação de commit/build correspondente ao checkout.
**Status global:** auditoria documental e estática `PASS`; leitura autenticada de Cidade, Work, Projetos, Memory, Runtime, Agents e Browser na VPS `PASS` (somente leitura); comparação visual autenticada de Miro/Stitch `PENDING` (browser expôs timeout de inspeção); validação de cada interação nas plataformas `PENDING`; publicação decorrente desta auditoria `PENDING`.

## 1. Método, cobertura e limites

- Inventariados os 15 vídeos únicos: 901,4 segundos, 720×1280 na maioria dos clipes, 26.739 frames de vídeo somados. Os dois ZIPs foram descompactados para inspeção temporária; não alterei os arquivos originais.
- Revistos storyboards amostrados a cada 7–8 segundos, além da leitura da captura fornecida. Esse método cobre a progressão e os estados visuais principais; **não equivale a inspeção humana individual de todos os 26.739 frames**. As capturas de tela gravadas de monitor têm perspectiva/moiré, portanto pixels medidos no vídeo não são dimensões CSS confiáveis.
- O browser permitiu ler o DOM inicial do Lovable (dashboard autenticado, workspace “gabriel”, projeto recente “Billiard Bliss”). O controle do browser retornou timeout ao ler/salvar tela das abas Miro e Stitch; não tentei contornar autenticação nem executar ações que alterassem dados. A imagem anexada do Stitch mostra a página carregando, não uma tela funcional.
- Mapeamento Fênix feito com `grg/public/index.html`, `unified-app.js`, `fenix-flow-graph.js`, testes relacionados, `AGENTS.md`, `GRG_SPACE_VISUAL_BUG_BACKLOG.md` e `GRG_SPACE_REA_REFERENCE_WORKFLOW_2026-10-21.md`.
- “Observado” significa visível na captura/vídeo/documentação; “implementado localmente” significa encontrado no código/teste local; “validado” exige interação real e resultado. Nenhum dado de demo, mock, inferência de modelo ou telemetria sem origem vira fato operacional.

## 2. Inventário de todos os vídeos

`Frames` é a contagem do fluxo de vídeo no arquivo; os storyboards mantêm a ordem temporal esquerda→direita e cima→baixo.

| ID / arquivo | Duração / frames / imagem | O que aparece e fluxo observável | Paralelo para o Fênix | Confiança |
|---|---:|---|---|---|
| V01 `1001656597.mp4` | 106,3 s · 3.184 · 720×1280 | Demonstração de cidade/dashboard 3D neon com distritos e torres identificadas, valores e gráficos atualizados, telas de análise em detalhe e um painel de resultado acumulado. A narração associa agentes Python a operações/estratégias financeiras. | Cidade deve abrir em panorama legível e levar de edifício/agente ao detalhe operacional; valores precisam vir de runtime e riscos financeiros exigiriam origem, autorização e trilha. Usar a metáfora de distritos/estados, sem copiar o tema neon nem prometer trading. | Alta para layout/fluxo; baixa para veracidade dos resultados e autonomia. |
| V02 `1001656590.mp4` | 129,6 s · 3.885 · 720×1280 | Aplicação de memória como grafo/constelação com painéis laterais; narração apresenta uma memória compartilhada para várias IAs, consulta por e-mail/palavra-chave e filtragem de conteúdo/nós. | Integrar as memórias canônicas do Fênix com proveniência, projeto/conversa/agent, busca e contexto visível; distinguir armazenamento, recuperação e inferência. Não duplicar o backend de memória. | Alta para interface e jornada anunciadas; detalhes do backend não comprovados. |
| V03 `WhatsApp Video 2026-10-22 at 12.11.54 (1).mp4` | 4,0 s · 60 · 720×900 | Um diagrama legível como “The Self-Evolving Agent Harness”, com etapas de observação/avaliação/alteração e retorno de feedback. Quase não há transição no clipe curto. | Ciclo agente: observar → propor → editar em sandbox → testar → revisar → aprovar → registrar/recuperar; cada transição precisa de artefato e estado, não só animação. | Média; texto do diagrama é pequeno e o clipe dura 4 s. |
| V04 `WhatsApp Video 2026-10-22 at 12.11.54.mp4` | 16,5 s · 496 · 1280×630 | Gravação paisagem de mapa/isométrico de escritório com zonas, agentes e painel de propriedades; visão geral troca para vista mais próxima. | Comparável à Cidade: enquadramento inicial, hierarquia prédio→andar→sala→agente e Inspector contextual. Ainda faltam evidências de tarefas reais, telemetria, navegação interna ou origem das posições. | Média: UI/câmera visíveis; função real não confirmada. |
| V05 `WhatsApp Video 2026-10-22 at 12.11.57.mp4` | 20,0 s · 600 · 368×464 | Montagem curta de cockpit 3D com métricas, gráficos, entidade central animada e painéis compactos. Texto fino não é legível no arquivo. | Reservar 3D decorativo a overview/estado; KPIs críticos continuam como números legíveis, com foco, filtros e detalhe. Cidade do Fênix deve manter custo de render sob controle. | Baixa para o significado das métricas. |
| V06 `WhatsApp Video 2026-10-08 at 10.43.58 (1).mp4` | 59,3 s · 1.775 · 720×1280 | Mundo 3D roxo de escritório/finanças, avatares, dashboards e circulação em corredores; overlay sugere uma demonstração de agente e métricas financeiras. | Adotar ambiente com contexto e destinos úteis; agentes só se movem por tarefa/evento medido, com estados ocioso/em execução/bloqueado/falha explícitos. | Média para a experiência; baixa para atividade real. |
| V07 `WhatsApp Video 2026-10-08 at 10.43.58.mp4` | 85,2 s · 2.552 · 720×1280 | Mundo 3D colorido com biomas/áreas, prédios temáticos e trilha de ações na parte inferior; locutora demonstra transição entre áreas e variações de cenário. | Cidade precisa de distritos com identidade funcional, prédios/salas, rotas e conteúdo; não adicionar biomas só cosméticos. Navegação de alto nível deve mostrar onde estou e como voltar. | Média para mapa de telas e controles; interações reais parciais. |
| V08 `WhatsApp Video 2026-10-08 at 10.44.12.mp4` | 41,4 s · 1.032 · 720×1280 | Reunião em vídeo e conversa de equipe sobre mapa, alternando rosto, grade de participantes e chat contextual. | Incorporar colaboração somente quando sessão, presença, comentário e permissões vierem do serviço real; layouts de reunião são referência para estado contextual, não para simular participantes. | Média; vídeo é clipe promocional. |
| V09 `WhatsApp Video 2026-10-08 at 10.44.18 (1).mp4` | 86,3 s · 2.590 · 478×850 | Narração percorre agente com memória persistente, skills, canais externos, automações e UI própria; cenas incluem terminal, grafo de conhecimento, painéis e operações. | É o paralelo mais direto ao pedido Fênix “agir como agente”: contexto de repositório, ferramentas autorizadas, memória recuperada, plano, execução limitada, aprovação, logs e resultado verificável. Conectar contratos existentes; não anunciar integrações indisponíveis. | Alta para componentes anunciados, média/baixa para funcionamento real. |
| V10 `WhatsApp Video 2026-10-08 at 10.44.18 (2).mp4` | 72,3 s · 2.168 · 1248×718 | Simulação de fábrica/logística em vista superior/isométrica: edifício, docas, veículos/estações e painéis operacionais distribuídos. | Usar como referência para edifícios compostos, áreas internas, níveis e entidades espacialmente vinculadas; as estruturas devem derivar do projeto BAI/sistema e de registros reais. | Média para composição de cena; baixa para contratos de dados. |
| V11 `WhatsApp Video 2026-10-08 at 10.44.18 (3).mp4` | 48,6 s · 1.453 · 720×1280 | Agência com cerca de 35 agentes exibidos em mesas/ilhas, coordenação visual por agente e um painel de tarefas/comunicação; vídeo compara grupo genérico à equipe organizada. | Mostrar roster de agentes canônicos com avatar/identidade, especialidade, tarefa, responsável e evento recente; filtrar por projeto/status, selecionar agente e abrir runs. Agentes sem tarefa ficam em estado ocioso e não simulam trabalho. | Média: claims são do vídeo; backend não é visível. |
| V12 `WhatsApp Video 2026-10-08 at 10.44.18.mp4` | 77,9 s · 2.334 · 720×1280 | Assistente de voz J.A.R.V.I.S. com palavra de ativação, resposta falada e cards de clima, briefing/notícias, cobranças/lembretes e conversa de acompanhamento. | Sessão contínua ligada ao mesmo chat/memória, status de microfone/provider, transcrição visível, interrupção e fallback textual. Só declarar voz real após ASR→LLM→TTS validado; cartões financeiros/notícias devem trazer fonte/horário. | Alta para a demonstração visível; provider real não comprovado. |
| V13 `WhatsApp Video 2026-10-08 at 10.44.19 (1).mp4` | 35,6 s · 1.064 · 720×1280 | Montagem de algoritmos e escritório 3D, indicadores de mercado positivos/negativos e agentes posicionados em mesas; fala menciona dezenas de algoritmos e execução com intervalos. | Se a operação for relevante, mostrar estado real de cada run e ganhos/perdas com fonte, período e disclaimers de negócio; não misturar métricas sintéticas com telemetria. Melhor paralelo genérico: job timeline e resultados. | Baixa a média; números e comportamento não foram auditados. |
| V14 `WhatsApp Video 2026-10-08 at 10.44.19 (2).mp4` | 32,6 s · 971 · 394×848 | Gravação oblíqua e pouco legível de um editor de fluxo/automação com nós, painel lateral de propriedades, área de configuração e execução. | Flow Graph precisa separar grafo observado de editor executável. Edição de grafo exige contrato persistente, validação, run real, diffs e permissões; não transformar a visualização atual em automação fictícia. | Baixa por resolução/orientação. |
| V15 `WhatsApp Video 2026-10-08 at 10.44.19.mp4` | 85,8 s · 2.575 · 478×850 | Painel “Optimal Engine”, gráficos de fluxo e redes de agentes, critérios/parametrização na lateral e vários módulos de estado. | Inspirar inspeção contextual e encadeamento visual de sistemas; expor evento, origem, data, confiança e estado de execução. O Fênix já tem Flow Graph/Observatory, mas cada aresta sem evento/execução deve continuar sem status fabricado. | Média para disposição e domínios; comportamento real não demonstrado. |

### Síntese temporal dos clipes

Os storyboards percorrem o vídeo em intervalos regulares, na ordem indicada. Foram criadas 15 montagens temporárias em `%TEMP%\fenix-video-storyboards`; esse material não é necessário para reconstruir a auditoria. Clipes V03–V05 e V08/V14 têm texto/estado insuficiente para conclusão funcional. Repetições dentro dos ZIPs foram removidas por SHA-256 antes de contar os 15 itens; os MP4 originais permaneceram intactos.

## 3. Auditoria das plataformas de referência

### Lovable — workspace + agente de construção

- **Evidência direta da sessão:** DOM autenticado do dashboard; sidebar com workspace, `New`, busca `Ctrl+K`, connectors, Projects e Recent; prompt central com ação/transcrição; tabs de Search, My projects, Recently viewed, Shared with me e templates; cartão recente com favorito, perfil e menu. A sessão exibia um workspace/projeto real, mas não enviei prompt nem abri/altere o projeto.
- **Evidência da documentação:** modos Chat/Plan/Build, contexto de projeto, gestão de arquivos, teste/preview, Git sync, colaboração e publicação estão documentados. A documentação oficial separa planejar a mudança de editar/buildar.
- **Padrões para importar:** um espaço de trabalho principal; contexto selecionado persistente; chat e estado de edição lado a lado; preview com rota/viewport; planos separados de alterações; diff recuperável; teste e deploy com estado próprio.
- **Fênix local:** Project Hub, IDE/Terminal, preview/Live Browser, REA, memória de projeto, Screen DNA, draft/diff e proposta de edição existem. O ciclo REA→memória→Flow Graph→draft→diff→confirmação tem testes locais; completar execução isolada, provider real e deploy/rollback com prova ainda é necessário. Não está comprovado que preview cubra todas as rotas/hosts nem que a tela/vps aberta corresponde ao checkout.

### Miro — home, Spaces e quadro espacial

- **Evidência direta nesta auditoria:** aba já aberta intitulada “Miro”; a automação não conseguiu extrair o DOM/tela devido a timeout do browser. Não criei/editei quadro. A imagem anterior do usuário mostra interface Home com navegação e criação em outras sessões, mas não conta como leitura atual desta aba.
- **Evidência documental oficial:** Home centraliza times, Spaces, boards compartilhados/estrelados, criação, busca, ordenação, filtros e grade/lista. Spaces acrescentam overview com atividade, sidebar própria, seções reordenáveis, permissões, grupos e Blueprints. Boards oferecem canvas espacial, templates e ferramentas de criação/comentário conforme permissão.
- **Fênix local:** Project Hub/Screen DNA e Flow Graph cobrem catálogos/relacionamentos, e uma parte de layout local foi entregue; o backlog reconhece preferências ainda locais e ausência de quadro espacial multiusuário. A página não deve anunciar colaboradores/atividade quando não existem eventos reais.
- **Padrões para importar:** projeto→seções→telas/artefatos; recentes/favoritos/busca; ordenação com estado persistente; canvas onde cada cartão abre fonte/IDE e cada aresta tem evidência; permissões e autoria reais.

### Google Stitch — canvas de design com agente

- **Evidência direta nesta auditoria:** aba aberta intitulada Stitch; imagem recebida só mostra carregamento. Snapshot/tela não foi obtido pelo controle do browser devido timeout. Nenhum projeto foi aberto ou alterado.
- **Evidência documental oficial atual:** Stitch se posiciona como canvas infinito multimodal, agente que considera evolução do projeto, gerenciador de múltiplas ideias, design system importável/exportável por `DESIGN.md`, geração/edição de telas, protótipo clicável, crítica por voz e exportação para ferramentas de desenvolvimento.
- **Fênix local:** REA aceita URL/texto/imagem e guarda proveniência; a análise visual exige modelo configurado e marca observações como pendentes de validação. Perfil e `DESIGN.md`, anotação, Flow Graph e plano/diff estão ligados ao projeto. Não existe ainda protótipo navegável de telas com variantes/links operacionais equivalentes ao fluxo Stitch.
- **Padrões para importar:** referência visual como fonte versionada; regras de design estruturadas; variantes antes de consolidar; canvas de telas ligadas por navegação observada; crítica por conversa dentro da mesma sessão; exportação com contrato de evidência.

### Convergência e originalidade

Não copiar marca, texto, imagens, CSS ou layout proprietário. Combinar a **recuperação e construção do Lovable**, o **canvas e colaboração organizacional do Miro**, e a **iteração multimodal/design system do Stitch** com o design system GRG. O produto original Fênix fica no vínculo de ponta a ponta entre universo operacional, projeto, conversa, memória, tarefa, runtime e evidência.

## 4. Mapa atual do Fênix GRG

### Entradas principais da navegação (código do shell local)

| Entrada | Rota/view | Papel planejado | Lacuna/evidência a fechar |
|---|---|---|---|
| World | `city` | mapa 3D, distritos, edifícios, agentes e Inspector | Bugs UI-137/140/147/150–159/161–162/167/170–174/181–182 já constam do backlog. Revalidar geometria, interior, movimentos e carga no browser do usuário. |
| Work | `operations` | missões, equipes, fila e aprovações | Demonstrar job/missão canônicos com pause/resume/cancel/result e atualizações sem estado inventado. |
| Projetos | `projects` | catálogo de projetos, hosts, versões, Screen DNA | Separar medido/local/VPS/offline; abrir detalhes do projeto selecionado sem perder contexto. |
| Memory | `memory` | memória e descoberta | Tornar fonte/conversa/projeto/autor legíveis e confirmar recuperação após reload. |
| Control | `runtime` | saúde e métricas | Não misturar snapshot, KPI calculado e telemetria real; fonte e última leitura visíveis. |
| Agents | `agents` | elenco/swarm | Identidade/estado/run/tarefa devem vir do mesmo runtime. |
| Browser | `browser` | sessão navegador gerenciada | Contrato com BAI, isolamento, política de proxy/VPN e cookies ainda precisam ser mapeados antes de expor automação/sessão. |

### Views internas presentes no HTML canônico

`command`, `ide`, `project`, `dna`, `metrics`, `city`, `projects`, `agents`, `operations`, `runtime`, `memory`, `knowledge`, `mcp`, `marketplace`, `browser`, `observability`, `terminal`, `flowgraph`.

O HTML lista essas superfícies; isso não certifica que todas tenham dados, todos os botões funcionais ou carga sem regressões. `city` é a view inicial no shell local; a página inicial da VPS precisa de verificação separada por divergência já registrada no backlog. Páginas e componentes destacados da Cidade incluem City Inspector, overlays, minimap, barra de modo/zoom, drawers de operação/mídia e chat do mascote. O backlog é a fonte contínua para bugs já levantados.

### Runtime VPS observado em 22/10/2026 (somente leitura)

O browser autenticado estava em `http://209.50.241.22:3000/app?designboard=1.3#city`, viewport `1034×1088`, DPR `1.1`. A interface indica `v2.5.0`, mas o commit/hash da aplicação não foi identificado; os dados abaixo são evidência da VPS naquele momento, não prova de equivalência com o checkout local.

| Rota | Observação direta | Leitura / pendência |
|---|---|---|
| Cidade `#city` | Canvas `958×940`; mapa indica `39 AGENTES · 9 PRÉDIOS MEDIDOS`; cartão inferior separado repete `PROJETOS 7 / AGENTES 39`; HUD inferior inicia em x=221 e cruza essa faixa; footer de 32 px no y=1056. Header mostra agentes online `0`, missões `1`, jobs `0`, saúde `READY`. | Sobreposição do HUD/cartão confirmada. `0 online` e `39 medidos` podem ser métricas com definições diferentes; explicitar semântica/origem, não presumir divergência de backend. Cidade dominada por terreno vazio e volumes geométricos simples na captura; medir custo de render e qualidade visual antes de redesenho amplo. |
| Work `#operations` | 0 em execução, 0 na fila, 1 worker; tabela lista `60/60` jobs `operational.activation`, todos `SUCCEEDED`, mas projeto/agente aparecem como “não informado”. | Estado/status está presente, mas a associação e utilidade operacional não. Validar se esses registros são eventos sintéticos/legados ou jobs canônicos; não apresentá-los como 60 tarefas de negócio sem proveniência. |
| Projetos `#projects` | Catálogo indica 7 projetos, 5 workspaces; GitHub `@Biel0071 (0 repos)`. FÊNIX OS anuncia 718 Screen DNA; cartões visíveis têm “Captura não registrada”, DOM não medido e origem de observação/histórico, incluindo `/archive/frontend/grg-apps-ai-city/index.html`. | Número 718 é contagem declarada do catálogo, não 718 capturas validadas. Exibir cobertura medida, observada/histórica e sem captura separadamente; resolver identidade da origem/build antes de abrir links como atuais. |
| Memory `#memory` | UI declara memória unificada e sincronização; painel naquele carregamento mostrava “Graph Brain…”/sincronizando, 0 entidades legíveis. | A alegação de memória compartilhada e a disponibilidade da leitura precisam de estado de sync, timestamp, escopo e contagens de API claramente separados. |
| Runtime `#runtime` | Tela mostrava “Carregando dados…” para Health/Serviços/Workers e telemetria. | Captura pontual prova estado de loading naquele instante, não falha persistente; verificar timeout, skeleton/erro e política de retry. |
| Agents `#agents` | Abertura mostrava “Sincronizando agentes…” enquanto o Inspector vazio exibia capacidades e contexto padrão declarados. | Evitar apresentar capacidades de template como fatos do agente selecionado; mostrar estados loading/sem seleção e proveniência do runtime. |
| Browser `#browser` | Dashboard QA mostrava “Carregando dados…” e “Re-run QA · Em desenvolvimento”. | QA anterior/estático não é estado de execução atual. Rotular última execução e bloquear estado `PASS` sem timestamp/artefato daquela execução. |

### Geometria observada na Cidade

Medição DOM na mesma sessão: `#fenixCityWorldArea` x=72, y=64, 958×940; `#cityCanvas3D` ocupa a mesma caixa; minimapa x=80, y=712, 236×192; navegação do minimapa x=80, y=674, 236×43; `#fenixUniverseExplorerHUD` x=221, y=924, 659×57; footer global x=0, y=1056, 1034×32. O mapa e o minimapa cabem na área, mas o HUD intersecta horizontalmente o cartão duplicado de projetos/agentes, confirmado visualmente. Critério: remover redundância ou reservar área sem colisão nos quatro breakpoints e em cada painel aberto.

### Cobertura do mapa de páginas

As sete entradas principais lidas por DOM na VPS são `command`, `city`, `operations`, `projects`, `memory`, `runtime`, `agents`, `browser` (a tentativa de abrir `command` terminou em `#city`; o fluxo de navegação não foi considerado verificado). As views internas listadas pelo HTML local são 18 superfícies; headings/controles incluem IDE/projeto/Screen DNA/metrics/knowledge/MCP/marketplace/observability/terminal/Flow Graph. Essa lista é inventário de código e navegação, não certificação funcional. Na VPS foram lidos os conteúdos de `city`, `operations`, `projects`, `memory`, `runtime`, `agents` e `browser`; `command` e demais views internas continuam sem inspeção de jornada nesta sessão.

### Recursos reais encontrados e seus limites

- **Projeto/IDE/REA:** leitura do projeto, mapa de arquivos/rotas, intake de referências, memória associada, draft e diff antes da gravação. Aprovação e execução permanecem estados diferentes; execução precisa passar por executor canônico e gerar resultado rastreável.
- **Flow Graph:** projetos, evidência REA, telas absorvidas, relações de navegação declaradas, memória, anotações e drafts podem ser projetados. Aresta observada não é execução; status ausente tem de permanecer vazio.
- **Memória:** serviços e APIs existentes; índice visual não pode virar banco paralelo. Scope por projeto/tenant e proveniência têm prioridade sobre uma “memória universal” sem origem.
- **Cidade/universo:** renderer e perfis de avatar, camadas de edifícios/interiores e sync com dados existem em múltiplos módulos. Backlog ainda marca problemas de fidelidade, câmera, atores, hierarquia e performance; não tratar animação de idle como tarefa ativa.
- **Agente executável:** testes de worker, jobs, chat, browser, IDE e runtime existem, mas a própria matriz aponta falhas/provider indisponível e ciclos não comprovados na versão servida. Capacidade declarada não substitui execução autorizada com evidência.
- **Voz:** depende da cadeia provider real; não declarar pronta na VPS até validar captura/ASR/transcrição/chat/TTS/interrupção/falha com logs reais.

## 5. Mapa de paralelismo e prioridade de evolução

| Ordem / ID | Entrega verificável | Dependências / risco | Critério de encerramento |
|---|---|---|---|
| P0 · AUD-001 | Congelar baseline e identificar checkout/versão local e servida; corrigir primeira pintura/rota antes de mudança visual ampla. | Não há hash/runtime comprovado equivalente na VPS; assets e fontes já divergem. | Matriz local/VPS com SHA/build e screenshots limpas; `city`, legado `command`, sem hash, login e refresh passam sem flash/loop. |
| P0 · AUD-002 | Estabilizar carregamento/custo da Cidade e desligar polling/render fora de rota. | Dados globais, SSE, WebGL, refresh e painéis sobrepostos. | Perfil de CPU/requests e testes de lifecycle; sem renderer/refresh duplicado ao alternar telas/recarregar no browser. |
| P1 · AUD-003 | Unificar a gramática visual (tipos, escala, espaçamento, hierarquia, estados, ícones monocromáticos). | Tokens existentes estão divididos entre CSS base, patches e estilos da Cidade. | Tokens documentados; captura 375/768/1280/1920, sem overflow/colisão; menu e chat dimensionáveis preservam ação essencial. |
| P1 · AUD-004 | Reestruturar Cidade: enquadramento inicial, ruas/quadras, prédios com andares/salas, rótulos e seleção. | Coordenadas backend vs estimadas e modelo BAI ainda por parear. | Plantas/volumes vinculados a dados do projeto; selecionar agente/prédio abre um Inspector único no viewport; nenhum ator solto sem estado de coordenada. |
| P1 · AUD-005 | Agentes vivos com atividade legível e telemetria sem simulação. | Runtime precisa fornecer atualizações, tarefas e sessões correlacionadas. | Evento real atualiza agente→tarefa→run→resultado; ocioso fica parado; logs reproduzem a sessão no Inspector. |
| P1 · AUD-006 | Fast Lane/delegação como ciclo de agente: contexto→pergunta→plano→confirmação→job→stream/log→resultado. | Provider real, auth, JobEngine/MissionKernel e isolamento do workspace. | Conversa não cria job; intenção ambígua pergunta; execução só após aceite; ID/status/resultado canônicos persistem; erros viram estado de recuperação. |
| P1 · AUD-007 | Project Hub orientado a repositório: logo/nome/versão/host/path/porta/estado e telas agrupadas por rotas/ramificações. | Catálogo Windows vs workspaces VPS; captura Screen DNA obsoleta. | Origem medida para cada endpoint e build; links abrem a IDE/preview do mesmo projeto; ações respeitam disponibilidade real. |
| P1 · AUD-008 | Modo de edição estilo agente de código, sempre revisável: context prompt, plan, branch/worktree, patch, terminal/testes, preview, aprovação, histórico. | Sandbox, Git e gates existentes; risco de gravação cruzada. | Teste adversarial de isolamento; diff aplicado só em workspace escolhido; saída de comando/log/teste vinculada ao commit/draft; rollback demonstrado. |
| P2 · AUD-009 | Canvas Screen DNA/Flow Graph com protótipo navegável e variantes; manter evidência e navegação separadas de execução. | Identificadores screen/route, capturas e relações com confiança. | Nós com origem/hash/viewport; arestas com evidência; protótipo clicável importado/exportado; variante não altera código até aprovação. |
| P2 · AUD-010 | Organizar Projetos em coleções/seções/recentes/favoritos e layouts lista/grade/canvas persistidos no servidor. | Miro-inspired; auth/tenant, ACL e sincronização. | Preferências por usuário/projeto sobrevivem a nova sessão; busca e filtro reproduzíveis; compartilhamento respeita ACL. |
| P2 · AUD-011 | Conectar BAI como adaptador white-label, incluindo instâncias de browser/emulador. | Ainda sem runtime pareado conforme BAI-001 e INT-002; cookie/proxy/VPN requerem política. | Health/version/host/runtime pareados; sessão isolada e consentida; gravação de atividade com retenção explícita; fechar/revogar sessão; sem exposição de credenciais. |
| P2 · AUD-012 | Voz contínua e memória contextual compartilhadas. | ASR, LLM, TTS e browser permission reais. | Mensagem de áudio → transcrição → resposta falada; interrupção, perda de conexão e fallback textual; nenhuma retenção de áudio bruto por padrão. |
| P3 · AUD-013 | Colaboração, presença, comentários, templates de boards/Spaces e atividade resumida. | Persistência/autoria/permissões e entrega em tempo real. | Dois usuários/atores autorizados alteram o mesmo quadro; presença/evento auditável; versão/undo e ACL testados. |

## 6. Estado da primeira fatia de integração

- O Flow Graph recebeu resolução explícita de seleção visual para tela absorvida: requer mesmo `projectId`, prefere `screenId` exato e só usa `route` quando a correspondência é única. Isso liga o nó de seleção observado à tela do mesmo projeto sem inventar uma relação ambígua.
- TDD puro: `node --test --test-force-exit test/flow-graph-evidence-truth.test.js` passou (2/2), incluindo isolamento entre projeto, screenId exato e fallback/ambiguidade de rota.
- A integração Playwright `test/rea-project-workflow-ui.test.js` iniciou o backend, registrou um GET 404 para a análise inexistente do fixture e não retornou resumo de conclusão no limite da chamada. Resultado de integração: `PENDING`, não PASS. Static check/diff review ainda obrigatórios.
- Essa mudança fecha uma lacuna precisa do fluxo REA/Screen DNA/Flow Graph; não torna o Fênix equivalente completo a Lovable, Miro ou Stitch.
- No ciclo de continuação, `city-first-paint.test.js` falhou porque esperava um cache-buster antigo da folha responsiva. O HTML atual carrega versões com cache-buster das folhas responsive e City Composition; o teste foi alinhado para verificar ambas as referências versionadas. A composição do HUD passou 4 viewports em fixture, mas a colisão vista na VPS segue pendente de reprodução no checkout local.
- Corrigido o default incorreto da Pattern Library: registros novos sem avaliação ficam `CANDIDATE/UNASSESSED`; `PROVEN` requer status de validação, testes e timestamp; `CORE` requer também aprovador. O cascade só consulta padrões com evidência elegível. Testes TDD reproduziram a promoção indevida e o uso de candidato antes da correção.
- Corrigidos relatórios de reconstrução: “cold” agora usa template local sem Screen DNA absorvido; “warm” identifica quando reusa Screen DNA. Uso de tokens, economias e chamadas de provider ausentes não viram zeros inventados nem `LEARNING_PROVEN`. Resposta factual do CEO informa que valores do Token Economy são estimativas, não economia validada.
- Evidência local deste ciclo: primeira pintura/HUD/métricas `3/3`; Pattern Library `4/4`; filtro Token Economy `2/2`; métricas de reconstrução `4/4`; proveniência Screen DNA/Flow Graph `4/4`; absorção local `10/10`; absorção de projeto externo e fluxo Playwright `10/10`. `node --check` e `git diff --check` dos arquivos de código tocados passaram. Os testes de absorção reportaram storage relacional em memória, Redis ausente e vetor local no ambiente de teste; isso não certifica persistência de produção.
- A matriz de realidade, o índice de padrões, scorecard e log de continuidade estão em [`FENIX_SYSTEM_REALITY_MATRIX.md`](FENIX_SYSTEM_REALITY_MATRIX.md), [`FENIX_PATTERN_LIBRARY_INDEX.md`](FENIX_PATTERN_LIBRARY_INDEX.md), [`FENIX_EVOLUTION_SCORECARD.md`](FENIX_EVOLUTION_SCORECARD.md) e [`FENIX_CONTINUOUS_RUN_LOG.md`](FENIX_CONTINUOUS_RUN_LOG.md). O plano canônico `FENIX_EVOLUTION_PLAN.md` recebeu checkpoint e o backlog registra `MEM-001`.

## 7. Fontes

- [Lovable Plan mode](https://docs.lovable.dev/features/plan-mode) e dashboard carregado na sessão do operador em 22/10/2026.
- [Miro Home](https://help.miro.com/hc/en-us/articles/360017571294-Home-page), [Spaces](https://help.miro.com/hc/en-us/articles/21040490154898-Spaces), [templates](https://help.miro.com/hc/en-us/articles/360019018899-Custom-templates), sessão aberta inacessível ao extrator DOM nesta auditoria.
- Google Labs: [Stitch — canvas/agent/design systems](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) e [updates — design em tempo real/exportação](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/); sessão aberta inacessível ao extrator de tela nesta auditoria.
- Código/testes: `grg/public/index.html`, `unified-app.js`, `fenix-flow-graph.js`, `test/flow-graph-evidence-truth.test.js`, `test/rea-project-workflow-ui.test.js`.
- Backlog: `grg/docs/GRG_SPACE_VISUAL_BUG_BACKLOG.md`; fluxo REA pré-existente: `grg/docs/GRG_SPACE_REA_REFERENCE_WORKFLOW_2026-10-21.md`.

## 8. Reauditoria com as três abas abertas — 22/10/2026

### Evidência direta e limites

- **Lovable:** DOM autenticado lido em `lovable.dev/dashboard`. Sidebar: workspace/account, New, Search, Connectors, Projects, Recents e ações de projeto. Área principal: prompt de criação com anexos, modo Build e transcrição; abas Search, My projects, Recently viewed, Shared with me, Templates; cards com favorito, seleção e menu. Um projeto recente (“Billiard Bliss”) era visível. Não criei/editei projeto nem testei publish; isso comprova affordances, não funcionamento ponta a ponta. A tela enviada pelo operador corrobora o dashboard.
- **Miro:** aba aberta foi identificada, mas a automação do browser expirou antes de ler o DOM; não fiz login nem alterei quadro. A captura fornecida em turno anterior e documentação oficial sustentam o mapa de dashboard, board infinito, frames como páginas, layers, templates, toolbar reordenável, zoom/minimap, colaboração e permissões — não prova a sessão autenticada específica. Fontes: [UI e toolbar simplificadas](https://help.miro.com/hc/en-us/articles/20967864443410-Miro-s-new-simplified-user-interface), [frames](https://help.miro.com/hc/en-us/articles/360018261813-Frames), [layers](https://help.miro.com/hc/en-us/articles/20258488000786-Layers), [toolbar editável](https://help.miro.com/hc/en-us/articles/360017730553-Toolbars).
- **Stitch:** aba aberta foi identificada, mas o controle de foco/CDP expirou; não gerei design nem interagi com projeto. Documentação pública oficial descreve entradas por prompt/imagem, variantes iterativas, refinamento conversacional e saídas HTML/CSS/Figma; isso sustenta um fluxo de referência, não prova estado/recursos habilitados da conta atual. Fonte: [Google Developers — Stitch](https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/).

### Comparação funcional para acoplamento no Fênix

| Referência / comportamento observado | Fênix existente | Lacuna e acoplamento REA recomendado | Evidência de aceite |
|---|---|---|---|
| Lovable: diretório e recents, busca, seleção/favorito, conectores, prompt de criação; documentação aponta edição visual, preview, código e sincronização GitHub. | Project Kernel/Hub, Screen DNA, IDE, Live Browser, REA, drafts/diff, Fast Lane e Git aparecem no código e na matriz; algumas jornadas permanecem `PENDING`. | Um **workspace por projeto**: rota/tela selecionada → evidência/hash → plano → draft isolado → diff → testes → aceite → job/commit. Não importar GitHub, aplicar mudança nem publicar sem confirmação. | Testar cada ação segura; mutações têm preview, alvo, diff, aprovação e resultado/ID. Reabrir projeto conserva contexto e build/branch identificáveis. |
| Miro: board amplo, frames navegáveis, layers, objetos agrupáveis, templates, toolbar que usuário reordena, mapa/zoom e permissões. | Flow Graph/Screen DNA mapeiam relações; Cidade é canvas espacial; Project Hub organiza repositórios. | Aproveitar a estrutura: frames por rota/jornada; layers por DOM/API/dados/agentes; nós vinculados a origem/ID e confiança; favoritos/recentes e toolbar configurável por usuário. Canvas/diagramas continuam referência até haver edição/persistência e ACL demonstradas. | Frame abre tela correlata; mudar seleção não altera produção; persistência por usuário; zoom/undo/ACL e atividade testados. |
| Stitch: prompt+imagem gera alternativas de UI; chat refina, temas e exportações conectam design com Figma/código. | Intake visual, REA, memória de design, blueprint, Screen DNA e IDE podem alimentar sugestões e comparar screenshots. | Pipeline rastreável **imagem/vídeo → frames → mapa de controles/estados → screen spec/tokens → variantes em draft → comparação → revisão → implementação**. O REA armazena timestamps, viewport, hash e distinção OBSERVED/INFERRED/IMPLEMENTED/VERIFIED. | Nenhum padrão visual é aceito só por semelhança; cada fluxo tem origem, hipótese, arquivo-alvo, regressões e aprovação antes de aplicar. |

### Diferenças reais do Fênix vistas nas capturas

A captura atual do operador mostra header `Online —`, `Missões 0`, `Jobs 0`, `READY`, mapa com “61 no mapa” e footer `DEGRADED` com CPU 97%, RAM 96%, disco 90%. É sinal de fontes/status que precisam ser reconciliados por proveniência e horário, não prova de 61 agentes online. O canvas está visualmente carregado: muitos labels sobre as mesmas quadras, edifícios com escala/material diferentes, toolbar e minimapa concorrendo, além de espaço sem função legível. Isso se soma à sobreposição já medida no backlog. A seleção de agente visível em capturas anteriores abre um card de runtime sobre o canvas; é distinta do Inspector lateral e não há evidência que o layout se adapte sem cobrir cena/controles.

### QA de controles e situação de execução

O manifesto de telas local declara 15 views, finalidade e endpoints de leitura; ações que escrevem/abrem terminal são identificadas separadamente. Uma navegação Playwright autenticada foi tentada em `127.0.0.1:4400`; o ensaio excedeu o limite inicial, registrou 401 durante a inicialização e não produziu inventário de controles. A repetição com timeout maior não finalizou dentro do limite da sessão. Resultado deste QA: `PENDING`, zero telas certificadas nessa tentativa. Não relatar esse ensaio como sucesso e não clicar botões externos que criam, alteram, apagam, publicam ou compartilham dados. As suítes automatizadas específicas anteriores continuam válidas apenas nos seus escopos declarados; a navegação geral de todos os botões ainda requer execução controlada e inventário individual.

### Fila por dependência (sem clonar as plataformas)

1. Parear hash/build local e VPS e publicar versão de teste com rollback demonstrável; atualizar os indicadores de contagem/saúde somente com contratos e timestamps reais.
2. Estabilizar composição Cidade e reduzir sobreposições; perfil local `PERF-001` já foi corrigido no renderer, mas falta repetir nas demais larguras e host representativo.
3. Executar QA por rota e por controle: classificar botões em navegação, leitura, mutação reversível e mutação/externo; verificar seguros, simular mutações com fixtures locais e exigir aprovação para efeitos reais.
4. Fechar uma jornada REA vertical em projeto de teste: vídeo/screenshot → mapa → alternativa de UI → diff → regressão visual → aprovação → execução no workspace isolado.
5. Só depois integrar Cidade/atores ao runtime de agente: estado de job, logs, sessão de browser, prédio/andar/sala e animação devem compartilhar IDs e eventos reais. Movimento decorativo não será usado como telemetria.

**Estado da reauditoria:** Lovable dashboard `OBSERVED` direto (somente leitura); Miro/Stitch `PENDING` para inspeção direta, com comportamento documentado por fontes oficiais; Fênix visual/indicadores `OBSERVED`; QA geral de rotas/controles `PENDING`; nenhuma gravação nas plataformas externas e nenhuma publicação na VPS.

## 9. Atualização de evidências diretas — 22/10/2026

- **Stitch:** inspeção DOM read-only da sessão autenticada em `stitch.withgoogle.com/projects/10100603439629535839`, viewport interno 1920×889. O projeto visível “EcoSync” tinha previews de múltiplas telas (Main Dashboard, Usage History/Trends, Automations), painel contextual Export à direita (export desabilitado sem telas selecionadas), prompt/Remix e Agent log na faixa inferior. Medições observadas: botão “Main Dashboard” x88/y54, 112×23; Export x1671/y49, 104×32; Remix x1782/y49, 74×32. Não cliquei em geração, Remix ou Export; os números do exemplo EcoSync não são telemetria. Isso comprova organização espacial e affordances visíveis, não funcionamento ponta a ponta.
- **Miro:** nova tentativa de anexar a aba excedeu o timeout de foco/CDP; manter inspeção da sessão `PENDING`. Não inferir comportamento direto a partir dessa falha.
- **Fênix VPS:** `http://209.50.241.22:3000/app#city`, viewport 1033×1088, sessão autenticada. `.fw3-pulse` está visível (`display:flex`, x88/y935, 350×53); HUD x220/y923, 660×57. A interseção medida é 218×45 px (9.810 px²). Footer mostra ONLINE/FAST LANE; cabeçalho READY; mapa informa 39 agentes/9 prédios medidos. Esses estados são snapshots de fontes distintas, sem equivalência presumida.
- **Navegação/Project Hub:** botão lateral Build foi identificado pelo `title` do controle, clicado sem mutação e levou a `#projects`. Com FÊNIX OS selecionado, botão Screen DNA abriu a seção do catálogo; catálogo mostra sete projetos e cinco workspaces. A árvore do Screen DNA declara 718 telas. A medição DOM da página contou 32.173 elementos, 6.341 botões, 718 filhos no grid e 320.722 px de scrollHeight em 578 px visíveis; registre como excesso estrutural reproduzido (PERF-002), ainda sem FPS/long tasks ou teste de impacto causal.
- **Comparação de versão:** HTML inicial em `#city` tanto local quanto VPS; os SHA-256 dos assets `fenix-core-controller.js`, `fenix-responsive.css`, `city-runtime-composition.css`, `unified-app.js` e `fenix-world-ui.js` diferem entre checkout e VPS. Isso confirma divergência de bytes, mas não identifica a causa nem uma build/commit compatível. A correção CSS local que oculta `.fw3-pulse` não está refletida no resultado visual VPS.
- **Verificação local:** testes de first paint/auth: 5/5; `city-hud-chat-composition.test.js`: 1/1, exit 0. O teste de composição cobre quatro larguras e estado do chat, mas não substitui inspeção visual VPS. Nenhuma alteração/deploy remoto.
- **Estado atualizado:** Stitch `OBSERVED` (affordances); Lovable `OBSERVED` (dashboard); Miro direto `PENDING`; colisão VPS `REPRODUCED`; paridade/build e rollback VPS `PENDING`; QA comportamental de todos os botões segue `PENDING`.

## Atualização RUN-12 — aplicação no catálogo Fênix

A observação de 718 telas no VPS virou um caso de escala local: catálogo renderiza 48 itens iniciais, preserva filtro e pesquisa no conjunto integral e acrescenta novos lotes de 48. A fixture de 718 e larguras 375/768/1280/1920 passou em teste Playwright. Isso reduz montagem inicial de cartões no checkout; não representa benchmark de FPS, não prova melhora global de velocidade e não altera o servidor publicado. Miro permanece pendente; affordances de Stitch/Lovable continuam como referências observadas, sem equivalência funcional presumida.

## RUN-13 — Memória e seleção de projeto na IDE — 22/10/2026

- **Referência de Memória:** V02 (`1001656590.mp4`) tem 129,634 s, 720×1280 e 3.885 frames. O storyboard desta reauditoria amostrou uma imagem a cada 10 s; a inspeção da referência anterior registrou constelação/grafo, exploração, busca e filtros. Isso não equivale a inspeção humana de cada frame nem comprova a implementação inteira da ferramenta de origem.
- **Defeito reproduzido no código local:** a shell reescrevia `#view-memory` e removia o elemento canvas que o renderer tentava localizar. A tela podia cair para o diagrama 2D e um nó isolado aparentava grafo quebrado, apesar de a API retornar milhares de nós/arestas. Renderer agora monta canvas/2D na shell viva, destaca arestas reais e informa isolamento; teste local com fixture passou.
- **IDE:** as capturas do operador mostram Split inicial e preview parado em carregamento. A correção local passa a iniciar em Code; os modos Preview/Split são explícitos, a seleção usa binding frontend compatível com a porta, a ausência de endereço tem estado explícito, e o divisor pode ser arrastado ou ajustado pelo teclado. ZapAI e API Platform são fixtures/contratos locais; portas remotas e preview real ainda dependem de validação autenticada.
- **Verificação desta fatia:** suíte focada Memory + IDE + Avatar: 38/38 PASS. Não prova renderer com grafo real, qualidade 3D equivalente à referência, todas as interações nem regressão de todas as telas.
- **Deployment:** nenhum. A sessão da VPS permanece em uma versão de assets divergente do checkout; identificação de build e rollback verificável seguem pré-requisitos antes de publicar.

## RUN-14 — Revisão visual da Memória — 22/10/2026

- A captura autenticada na VPS ainda mostra a Memória como mapa radial 2D com 2.828 nós, 13.528 relações e `600` conexões selecionadas. O 3D/canvas do checkout não está no conjunto de assets servido. Os hashes de `index.html`, `unified-app.js`, `project-ide-live.js`, `memory-live.js` e `fenix-world-3d.js` diferem local/VPS; a etiqueta visível `v2.5.0` não identifica commit nem prova paridade.
- No teste local, a captura Playwright da fixture mostrou hemisférios/lobos determinísticos ampliados para preencher melhor o canvas, contagens de arestas e vizinhos, canvas em estado estável e Inspector agrupado. Fixture: 200 nós, 601 registros e 15 vizinhos; 14 IDs sob `memory:node:*` mais a tarefa observada. Agregar registros repetidos reduz linhas e controles, sem descartar a contagem de origem.
- Reproduzida a divergência semântica: 601 registros apareciam como relação/conexão visível embora representassem somente 15 vizinhos distintos. A interface local agora informa os dois totais, desenha uma ligação por par e agrupa o Inspector por entidade vizinha com tipos/contagem.
- Verificação: `memory-graph-renderer`, `project-ide-preview-url` e `city-agent-visual-profile`: 39/39 PASS; `node --check` e `git diff --check` nos arquivos alterados passaram. Screenshot local foi inspecionado após mudança.
- Limites: layout determinístico por entidade ainda não usa comunidades/semântica do grafo; seleção global pode continuar parecendo estrela se o nó selecionado for hub real. Não há benchmark de grafo real, verificação visual autenticada local nem deploy. VPS segue versão anterior.

## RUN-15 — Reprodução de rotas, estado de autenticação e versão servida — 22/10/2026

- Sessão autenticada da VPS: entrada em `/app#city` ficou na Cidade, com `39 AGENTES · 9 PRÉDIOS MEDIDOS` e status `READY`; entrada sem hash reescreveu para `#city` e manteve os dados; `#command` mostrou a Cidade e READY, mas preservou alias na URL. A aba foi restaurada para `?designboard=1.3#memory` após QA.
- Isso é um reteste autenticado da sessão corrente, não sessão limpa, login/logout, nem prova contra o problema histórico. UI-024/025/026 permanecem abertos até reproduzir cold start/refresh e correspondência de IDs no renderer. Testes locais de auth/bootstrap/first-paint: 6/6.
- HTML VPS `:3000` retorna HTTP 200 e etiqueta `v2.5.0`, sem metadado de build/commit. O checkout também declara `v2.5.0`; essa igualdade de rótulo não identifica o artefato. Respostas servidas não têm `ETag` nem `Last-Modified` úteis para parear build; `Cache-Control: no-store` no HTML.
- SHA-256 checkout/VPS, todos diferentes: `index.html` `d8736cb5…` / `c414edce…`; `fenix-world-3d.js` `4181c346…` / `26ec089b…`; `unified-app.js` `48566faa…` / `5e5b2c88…`; `project-ide-live.js` `a7028605…` / `f8ba64ee…`; `memory-live.js` `67982557…` / `9b1444e5…`. Hashes completos em `FENIX_SYSTEM_REALITY_MATRIX.md` aditivo RUN-15.
- Implementação local desta rodada: alias hash no evento `hashchange` passa pela mesma tabela `ROUTE_ALIASES` do carregamento frio, reescreve URL canônica mantendo query/path/sub-rota. Teste primeiro falhou e depois passou. VPS ainda não tem essa mudança.
- Nenhuma publicação remota: identificação commit/build e rollback comprovado ainda faltam; não inferir paridade pelo rótulo `v2.5.0`.

## Atualização RUN-16 — engenharia reversa do cérebro de memória no vídeo — 22/10/2026

- Fonte: `C:\Users\Dell\Downloads\1001656590.mp4`, 720×1280, 30 fps, 129,63 s. Storyboard local por amostras de 10 s; são padrões de interface observados, não dimensões CSS confiáveis.
- Mapa da referência: (1) visão global com nuvem neural 3D luminosa e painéis laterais; (2) painel explicativo/conexões de clientes; (3) exemplos de configuração por cliente/arquivo (`config.toml` aparece no vídeo); (4) exploração interativa de entidades e relações, zoom e seleção; (5) busca híbrida e inspeção focada em subgrafo. A chamada “todas as IAs numa memória” é promessa visual do vídeo, não prova de conexão real.
- Paridade no checkout: canvas 3D interativo, rotação por arraste, zoom, seleção real, filtros e Inspector existem; aba de grafo por relações 2D, listagem de registros persistidos e snippets de integração existem. A UI declara explicitamente que snippets não comprovam conexão. Faltam: render 3D com forma/densidade mais próxima da nuvem neural, busca híbrida explícita, fluxo autenticado para configurar/testar/revogar provedores e explorar memória por contexto sem prometer conexão por template.
- Defeito comprovado no canvas checkout: DPR ausente, resize sem atualizar bitmap e nós sem proveniência cinza pouco legíveis. UI-193 corrige nitidez/responsividade, seleção em coordenadas CSS, glow e fallback de cor por tipo (origem permanece “não informada”); renderer focal passou 4/4 numa fixture sintética de escala com 2.828 nós e 13.528 relações, e screenshot foi inspecionado.
- Diferença VPS: captura da sessão autenticada mostrava o mapa radial 2D; versão/hash dos assets servidos diverge do checkout. Nenhuma mudança publicada.
- Limite: a captura após mudança é fixture sintética de 2.828 nós/13.528 relações/15 vizinhos; ainda não foi reproduzido o payload real no navegador local, nem medido frame time/RAM nesse volume. Não classificar equivalência ao cérebro do vídeo.

### Matriz tela → funcionalidade → paridade Fênix

| Tela/fluxo observado no vídeo | Comportamento que aparece | Fênix no checkout | Diferença aberta |
|---|---|---|---|
| Cérebro global | Nuvem densa luminosa, visão geral e painéis ao redor | Canvas rotacionável/zoomável com entidades reais, filtros e legenda de proveniência; até 500 pontos | Ainda não tem composição orgânica de cérebro e requer validação com payload real; UI-193 |
| Conexões de clientes | Explica acesso de diferentes assistentes à memória | Drawer “Como Conectar IAs” com exemplos/snippets e aviso de que snippet não comprova conexão | Falta estado por conector, testar/autenticar/revogar e telemetria real de sincronização |
| Configuração por cliente | Exemplo de arquivo/configuração (inclui `config.toml`) | Exemplos documentais existentes | Não há fluxo seguro para gerar/aplicar config ou validar conexão; requer contrato/API autenticados |
| Busca/exploração | Busca híbrida e exploração de partes do grafo | Filtro local por texto/tipo e aba de busca em registros persistidos | Busca híbrida e explicação da origem do resultado não estão comprovadas |
| Inspeção contextual | Seleção de ponto, vizinhos e relações | Clique/drag/zoom, relações agregadas por vizinho e Inspector | Subgrafo contextual, trilha de contexto e navegação em grafo real ainda pendentes |
| Estado unificado | Promessa de memória comum entre assistentes | Graph Brain e proveniência são consultados; origem ausente fica explicitamente desconhecida | “Memória única entre IAs” só deve ser exibida para conectores autenticados e medidos |

A matriz separa o que o vídeo mostra do que o Fênix de fato executa. A próxima fatia é carregar a topologia VPS real em QA local e medir renderer; depois priorizar busca contextual e contratos de conectores com teste de conexão, sincronização e revogação. Nenhum desses itens vira concluído por template visual.

## RUN-17 — Memory Brain WebGL local — 22/10/2026

- Implementado renderer Three.js/WebGL no canvas da tela Memória: pontos circulares com brilho, distribuição bilateral volumétrica, relações reais do payload, seleção, hit-test, rotação por arraste, zoom por roda, resize e DPR até 2. A forma bilateral serve de guia espacial; não é uma reconstrução anatômica Blender.
- Validação automatizada: fixture sintética com 2.828 entidades e 13.528 registros, rota integrada e renderer no Chromium/SwiftShader. Teste verifica que WebGL está ativo, DPR 2, estado selecionável, arraste agenda repaint e render inicial fica abaixo de 5 s. Suíte focal combinada: 49/49 PASS.
- Evidência visual da fixture: `%TEMP%\fenix-memory-webgl.png`. Contagens e seleção visual são do fixture, não do payload da VPS.
- Diferenças para o vídeo permanecem: configuração e teste real de provedores, busca/filtros semânticos, navegação por comunidades e grafo autenticado ainda não foram provados. A captura VPS anterior ainda apresentava visualização radial 2D.
- Release: nenhum deploy. Hash/build da VPS segue sem paridade demonstrada e rollback verificável ainda é pré-requisito.

## RUN-18 — cobertura do grafo e leitura autenticada da VPS — 22/10/2026

- Na sessão autenticada aberta em `?designboard=1.3#memory`, a interface carregou `/api/v2/graph/data` com 2.828/2.828 nós; estatísticas mostram 13.528 registros, e Fênix selecionado exibe 600 registros para 14 vizinhos. A chamada direta sem sessão retorna 401; foi respeitado o controle de acesso.
- Teste de carga evidenciou que 2.400 nodes de desktop deixavam 428 entidades fora da nuvem. Cobertura desktop agora eleva o limite a 4.000 (portanto todos os 2.828 observados); tablets e mobile mantêm orçamento adaptado. Essa mudança é local.
- Desenhar 12.942 pares únicos da fixture ao mesmo tempo saturou visualmente o centro do grafo. Renderer limita linhas de contexto a 2.400 e coloca as relações do selecionado primeiro. Indicador mostra `renderizadas/pares únicos` e registros totais; no teste de estresse: 2.400/12.942 ligações visuais e 13.528 registros.
- Evidência visual após ajuste: `%TEMP%\fenix-memory-webgl-full-graph.png` (Playwright, topologia de estresse sintética). Suíte focada integrada: 49/49 PASS. O payload real está visível na VPS, mas o renderer local ainda não foi executado contra ele por falta de uma sessão de QA autenticada no browser de teste.
- A UI da VPS apresentou os dados quando observada autenticada e segue no renderer anterior. Nenhum deploy; build e rollback de produção ainda sem pareamento comprovado.

## RUN-19 — deploy e cobertura integral do payload Memory Brain — 23/10/2026 UTC

- O frontend passou a pedir `/api/v2/graph/data?full=true`, eliminando a lista truncada de 200 no estado servido. A sessão autenticada confirmou 2.828/2.828 nós e 13.528 relações.
- WebGL visível na VPS: no viewport observado, 500 nós renderizados (limite responsivo atual), 2.018 arestas visuais, 499 vizinhos para o nó Fênix selecionado; total de 4.055 registros de relação para Fênix.
- Deploy estático: `memory-live.js` SHA-256 `f776dd8a71ea9d4598e2eb94c7504c1af843998832aa223f16962c88f7137f9b`; `index.html` SHA-256 `131c1601523b7f70ad60dd2d587b643bc05b7ba204e13cdd84e6f469bed12778`. Backup e rollback guardados em `/home/deploy/.fenix-release-backups/memory-webgl-20261022-b86wmw37`; sem reiniciar backend.
- 50/50 testes focados passaram; URLs `/health`, `/app` e JS versionado retornaram 200. UI-193 permanece FIXED: são necessárias capturas em 375/768/1280/1920 para certificação `VERIFIED`; a cobertura integral de entidades não significa desenhar todas as arestas simultaneamente.

## RUN-2026-10-23-04 — continuação do REA da referência de memória

- Modelo visual confirmado no vídeo: objeto principal é uma nuvem volumétrica de pontos coloridos com navegação/seleção, ligada a uma lista e a um inspector; configuração e conectores aparecem em fluxo/tela próprios. A referência demonstra hierarquia e exploração, não comprova os provedores do Fênix.
- Comparação VPS autenticada após a correção: nuvem WebGL renderiza dados verdadeiros e responde à seleção. FÊNIX OS: 1.531 vizinhos/4.055 registros no Inspector; viewport atual renderiza 700 de 2.828 entidades e 45 ligações; total persistido 13.528 registros. API Platform pode ser selecionada e o detalhe muda, mas possui zero relações registradas.
- Divergências restantes: forma ainda é uma nuvem abstrata de duas regiões, sem layout de comunidades comprovado; orçamento visual menor que o total carregado; controles e painel de conexão não foram comparados por viewport; não foi certificada navegação mobile nem performance/frame time.
- Conclusão deste ciclo: melhora real publicada, ainda não equivalente à referência. UI-193 permanece FIXED, não VERIFIED.

## RUN-2026-10-23-05 — contexto de arestas e foco da entidade

- Resultado visual após reservar no máximo 8 spokes para o nó selecionado: 40 das 45 ligações visuais do conjunto atual aparecem, com o restante preservando ligações entre outras entidades visíveis. A amostra segue relações reais em vez de preencher apenas com nós desconectados; Inspector conserva a contagem completa do Fênix (1.531 vizinhos/4.055 registros).
- Comparação: o vídeo usa uma nuvem luminosa com rede mais integrada. A versão publicada agora reduz o aspecto de estrela, mas ainda não mostra comunidades semânticas nem equivalência de densidade, controles e responsividade. REA não atesta equivalência.
