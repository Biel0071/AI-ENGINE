# Engenharia reversa dos sistemas dos vídeos — 2026-11-11

Para cada grupo: **o que o sistema faz por trás da tela**, a lógica que vale absorver, e onde isso encaixa no Fênix. Não é para copiar a aparência; é para entender o mecanismo e implementar de forma nativa.

## 1. Escritórios virtuais de agentes (V04, V06–V11, V15, V17)

**Sistemas:** team.ai.id, Bravurax HQ, Talvexa Virtual HQ, 3D Dashboard, escritório 3D realista.

**Mecanismo comum (o que dá vida à tela):**
- **O agente é a unidade da interface.** Cada agente tem: avatar, nome, cargo/setor, **modelo de IA próprio**, status (disponível/ocupado/executando/ocioso) e uma mesa no mapa. O mapa é só a forma de enxergar a lista de agentes.
- **Faixa inferior de cartões** (team.ai.id): uma linha rolável com todos os agentes; clicar abre o chat daquele agente na lateral. É o atalho principal, mais usado que o mapa.
- **Setores e andares:** os agentes ficam agrupados por divisão (Atendimento, Vendas, TI, RH, Financeiro, Diretoria). Andares (Lantai 1/2) e 2D/3D mudam só a visão, não os dados.
- **Diretor + ordens (Bravurax):** o usuário fala com um único agente "diretor" ("Enviar orden"), que distribui o trabalho entre as salas. A tela mostra quem está "en ejecución".
- **Fila "Te necesitan" (precisam de você):** entregas que dependem de aprovação humana aparecem numa lista com o botão **Aprobar**. Contadores: trabalhando / em espera / precisam de você.
- **Mensagem para todos** (team.ai.id): "@Clara, @Eko… o que está fazendo agora? Responda Available/Busy" — uma checagem de status coletiva.
- **Respostas com documento da empresa** (V08): o agente de TI responde "conforme o documento QA-SOP-Garansi.txt" — é RAG sobre arquivos enviados, com a fonte citada.
- **Rotinas da cena** (Talvexa): Pause, Routines on, Lunch, Rooftop, Back to work — botões que mudam o comportamento de todos os agentes de uma vez.

**O que o Fênix já tem:** cidade 3D com agentes reais do registro, faixa de agentes no dock, chat por agente (`openSpatialAgentChat`), interior de prédio, minimapa 2D/3D, aprovação de passos de missão no backend (`missions.approveStep`), contexto real no prompt (camada 1).
**O que falta:** modelo/tokens/tarefa real no cartão do agente; fila "precisa de você" visível; diretor recebendo ordens e criando missões; setores dentro do prédio; checagem de status coletiva; citação de fonte nas respostas; rotinas ligadas a controles reais (pausar fila, ligar/desligar loop autônomo).

## 2. Cidades de operação (V02, V24)

- **Cidade de bots de trading:** cada torre é um bot; a altura, a luz e a placa mostram o resultado; um **feixe de luz** dispara quando o bot executa uma ordem; dá para **entrar na sala** do bot e ver o robô com o gráfico e o log de sinais. Lição: o edifício precisa refletir dados vivos, e cada evento real precisa de uma reação visual curta.
- **Tiny Living City:** ruas, carros, semáforos, pedestres e ciclo dia/noite. É ambientação; o valor está na leitura rápida (ruas organizadas, distância entre prédios), não nos dados.

**Fênix:** prédios = projetos/sistemas reais; eventos chegam por SSE. Falta: placa viva por prédio (jobs ok/falha, tokens, último evento), reação visual a job concluído/falho, e a sala do prédio mostrando o log real.

## 3. Memória unificada entre ferramentas (V01, V23)

- **AI Brain:** uma memória só, conectada por MCP ao Claude, ChatGPT e Codex; visualização do grafo de memórias.
- **gbrain e similares:** "joga tudo (áudio, notas) → uma memória" lida por Claude Code, Codex e outros; formatos simples (markdown) para pessoas e agentes.

**Fênix:** Memory Fabric, índice de memória do projeto, servidor MCP (`bin/fenix-mcp.js`) e a proposta do **Livro de Atividades** (spec de 2026-11-10). Falta: as ferramentas MCP `fenix_record_activity` / `fenix_get_project_history` e a ingestão do Git — exatamente o pedido "tudo que for feito pelo Codex, Antigravity ou API vira job/missão".

## 4. Agentes que operam software e governança de gasto (V05, V18, V22)

- **Agente no navegador:** o cursor e as caixas de destaque mostram o que o agente está fazendo — confiança vem de ver a ação.
- **Operação de Meta Ads:** campanhas criadas pelos agentes **nascem pausadas, sem gasto**, e ficam enfileiradas até alguém aprovar. Funil de conversão como tela principal.
- **Craft Anything:** aplicativos pensados para serem operados por agentes.

**Fênix:** instâncias de navegador (BAI), portão central de escrita (LEVEL 1), governança da autoevolução ("aprender nunca promove"). Falta: linha do tempo de ações do agente com capturas de tela; regra geral "ação que gasta dinheiro ou publica nasce pausada e vai para a fila de aprovação".

## 5. Segurança com agentes (V12)

- **Strix:** agentes de pentest que geram relatório com local exato, **prova de conceito** e correção, e analisam PRs no CI.

**Fênix:** tela Defesa, Bug Tracker. Falta: varredura dos próprios repositórios em sandbox gerando bugs com prova de conceito — somente nos projetos do dono, nunca em alvos de terceiros.

## 6. Design e geração de interface (V03, V13, V16, V19–V21)

- **Kindra:** navegação por abas em pílula, kanban de etapas, agenda semanal, gráficos de crescimento — padrão limpo para as telas Work/Jobs.
- **Jarvis / gpt-image / skills de design:** referência visual + rascunho de layout → interface gerada fiel à referência; tipografia, espaçamento e layout definidos como "skills" para fugir do visual genérico.
- **Skills de vídeo, sites 3D:** pacotes de instruções reutilizáveis para gerar mídia e páginas.

**Fênix:** Studio, intake de referências de design (memória `design-reference-intake`), estúdio de vídeo (`media/video-production-studio.js`), Software Factory. Uso: **integrar** como modelos e skills da fábrica, prioridade menor que a operação.

## 7. Descartado

- **Escritório 3D realista (V09):** pesado demais — a página da cidade já trava o navegador sem GPU (medido em 2026-11-11: 3–25 s por operação). Fica a ideia da lista de agentes com status ao lado do mapa.
- **Zip do WhatsApp (V14):** não é sistema; é um app malicioso (falso "JADLOG Rastreio") pedindo acessibilidade. Nada disso entra no Fênix.