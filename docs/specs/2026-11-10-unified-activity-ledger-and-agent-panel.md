# Histórico unificado de atividades + painel flutuante do agente — PROPOSTA

Data: 2026-11-10 · Status: **aguardando aprovação** · Nada implementado ainda.

## 1. Objetivo (palavras do proprietário, resumidas)

1. Tudo que for feito no sistema e nos projetos acoplados — pelo Codex, Antigravity, Claude Code, pela API ou pelos próprios agentes do FÊNIX — aparece como **job / tarefa / missão**, fica **gravado**, e qualquer ferramenta consegue **entender e continuar** de onde a outra parou. Vale para **todos os projetos**.
2. Ao abrir um agente: **painel flutuante** com **mini-chat**, **boneco de corpo inteiro**, **tokens gastos**, **jobs e missões feitos** e as **instâncias** ligadas a ele (celulares/navegador) com as atividades realizadas.

## 2. O que já existe (verificado no código)

| Peça | Onde | Serve para |
|---|---|---|
| JobEngine com origem do job (`codex`, `claude`, `antigravity`, `windsurf`, `vscode`, `mcp`, `cli`, `api`, `web`) | `grg/src/runtime/job-engine.js` (`JOB_SOURCES`) | registrar quem pediu |
| Servidor MCP `fenix-universal-orchestrator` | `grg/bin/fenix-mcp.js` | Codex/Antigravity/Claude já podem **enviar** jobs e ler status |
| Tokens por job (`aiCalls.jobId`) | entregue hoje | custo e tokens por job/missão |
| Eventos persistidos + filtros por tipo | entregue hoje | linha do tempo |
| MissionKernel, Project Kernel | `grg/src/missions`, `grg/src/projects` | agrupar por missão/projeto |
| Chat com agente (`fenixCityWorkflow.openChat`) e instâncias de navegador (BAI) | `public/fenix-city-workflow.js`, `src/api/bai-instance-routes.js` | base do mini-chat e das instâncias |

**Lacuna principal:** hoje as ferramentas externas só conseguem *pedir* trabalho ao FÊNIX. Não existe forma de *relatar* trabalho que elas mesmas fizeram, nem de o FÊNIX descobrir mudanças feitas fora dele.

## 3. Proposta A — Livro de atividades (Activity Ledger)

### 3.1 Registro
Um registro por atividade, ligado a job/missão quando houver:

```
Activity {
  id, tenantId, projectId,
  source: codex | antigravity | claude | api | fenix-agent | git,
  actor,                      // usuário ou agente
  kind: code_change | analysis | test | deploy | plan | review,
  summary,                    // o que foi feito, em uma linha
  missionId?, jobId?, parentActivityId?,
  filesChanged: [{ path, added, removed }],
  repo: { branch, commit, previousCommit },
  ai: { model, provider, promptTokens, completionTokens, costUsd }?,
  tests?: [{ name, status }],
  startedAt, finishedAt,
  evidence: { diffStat, logsRef }
}
```
Armazenado em coleção própria com retenção por bytes (não no documento único, por causa do custo de escrita já documentado).

### 3.2 Três portas de entrada
1. **MCP (Codex, Antigravity, Claude Code):** novas ferramentas `fenix_record_activity` (relatar o que fez) e `fenix_get_project_history` (ler o histórico para continuar). Cada ferramenta externa passa a abrir e fechar a sua sessão de trabalho com um registro.
2. **API:** `POST /api/v2/activities` (com a mesma autorização do gate de escrita) e `GET /api/v2/projects/:id/history`.
3. **Git (pega o que ninguém relatou):** um job periódico lê `git log` dos projetos registrados e cria uma atividade `source: git` para cada commit desconhecido, com arquivos e estatísticas do diff. Assim, mudanças feitas por qualquer ferramenta, mesmo sem MCP, entram no histórico.

### 3.3 "Continuar de qualquer sistema"
`fenix_get_project_history` devolve, por projeto: últimas N atividades, missões abertas, jobs pendentes ou falhos, decisões registradas e o último commit conhecido. Um agente no Antigravity lê isso antes de começar e registra ao terminar; o próximo (Codex, FÊNIX) continua daí.

### 3.4 Análise automática
Cada atividade nova pode disparar um job `development.analyze` (somente leitura) que resume impacto e riscos. **Desligado por padrão** até existir provedor de IA real e orçamento na VPS (ver plano da fábrica de código).

### 3.5 Telas
- Botão **Eventos** ganha a aba **Atividades** (linha do tempo filtrável por projeto, origem e tipo).
- Detalhe do job mostra a atividade relacionada, e vice-versa.
- Calendário de jobs passa a incluir as atividades externas.

## 4. Proposta B — Painel flutuante do agente

- Janela flutuante arrastável (não modal), com várias abertas ao mesmo tempo.
- **Corpo inteiro:** renderização do mesmo avatar 3D do mundo (Three.js) numa mini-cena girável, no lugar da foto do rosto.
- **Mini-chat:** reaproveita o chat existente com o agente (`openChat`) dentro do painel, com histórico persistido por agente.
- **Números reais:** tokens gastos (soma de `aiCalls` dos jobs do agente), jobs feitos (por status), missões participadas, última atividade.
- **Instâncias:** lista de instâncias de navegador/celular ligadas ao agente (dados do BAI), com as atividades registradas no Livro (Proposta A). Celular depende de um conector de dispositivo que ainda não existe; o painel mostrará "nenhuma instância" até lá.

## 5. Ordem sugerida

1. B sem instâncias (rápido, usa dados que já existem).
2. A.1 + A.2 (registro e API/MCP).
3. A.3 (Git).
4. Telas da linha do tempo.
5. A.4 (análise automática) depois do deploy do LEVEL 1 e das chaves de IA.

## 6. Decisões do proprietário

1. Aprovar a proposta A (livro de atividades) e a ordem acima.
2. Quais projetos entram primeiro na leitura de Git (sugestão: os do catálogo local `projects/`).
3. Tempo de retenção do histórico (sugestão: 180 dias ou limite de tamanho).

## 7. Proposta C — Super agente Fênix (adicionada em 2026-11-10)

Pedido do proprietário, resumido: um agente com memória e personalidade que entende tudo o que acontece no sistema, conversa sobre qualquer assunto, transforma requisitos em atividades, opera o ecossistema GRG com subagentes, conhece os botões de todas as telas (deste e de outros sistemas) e faz engenharia reversa, inclusive de vídeos.

### 7.1 Onde estamos (medido nesta sessão)

- O chat lateral passou a responder pelo modelo de verdade (Ollama `qwen2.5:3b` local, 10–20 s por resposta). Antes caía sempre num texto pronto ("Entendi sua solicitação sobre...").
- Causas corrigidas: o roteador retestava o provedor e gravava no store a cada pergunta; o tempo estourava e o provedor saudável virava DEGRADED. Também não havia limite de tamanho de resposta (2.048 tokens no chat).
- **As respostas ainda são genéricas** (ex.: "como acompanho os tokens?" recebe passos inventados, em vez de "clique no job na Cidade"). Motivo: o prompt do chat leva só ~1.100 caracteres de contexto (perfil de design e histórico). O índice de memória do projeto (`project-memory-index`) já encontra arquivos, rotas, telas e memórias relevantes para a pergunta, mas é calculado **depois** da resposta e só devolvido à tela; o modelo nunca o vê.
- O servidor local está lento em geral (`/health` com mediana de 375 ms e pico de 2,2 s). O store guarda tudo num documento JSON de 3,9 MB: cada leitura copia o documento inteiro e cada gravação o reescreve. Abrir a conversa custa 4–7 s. Isso limita qualquer agente que consulte o sistema várias vezes por pergunta.

### 7.2 Camadas propostas (cada uma entrega valor sozinha)

1. **Contexto real no prompt** (pequeno, alto impacto): antes de chamar o modelo, juntar o pacote do índice de memória (telas, rotas, arquivos, memórias) e um retrato vivo e curto do runtime (jobs recentes com status e tokens, missões abertas, agentes ativos, erros recentes). Limite fixo de tamanho. Teste: a pergunta dos tokens tem que citar o painel de job real.
2. **Mapa de telas e botões**: catálogo gerado a partir do `index.html` e dos scripts (id, rótulo, tela, ação, endpoint chamado), atualizado por um teste, nunca escrito à mão. Mesma ferramenta aplicada a outros sistemas via o Page Registry que já existe (ZAPAI-CRM etc.).
3. **Ferramentas em vez de texto**: o agente responde chamando funções já existentes (consultar job, abrir tela, criar missão, buscar arquivo), com aprovação humana para tudo o que muda estado — o mesmo portão do LEVEL 1.
4. **Requisito → atividades**: usa o `missionPlanner` existente; o agente propõe a missão com passos, o dono aprova, e tudo fica registrado no Livro de atividades (Proposta A).
5. **Memória e personalidade**: memória por usuário e por projeto sobre o `memory-engine` existente (fatos confirmados, preferências, decisões); a personalidade vira um perfil versionado, editável na tela, não texto fixo no código.
6. **Subagentes**: o Fênix delega para os agentes do registro (`agent-registry`) através de jobs, de modo que cada delegação aparece na Cidade e no calendário com tokens e tempo.
7. **Engenharia reversa e vídeo**: código e APK já têm caminhos (`/rea`, comando autônomo). Vídeo exige um modelo de visão; o local `moondream` serve para quadros soltos, não para vídeos longos. Depende das chaves de API pagas e do orçamento.

### 7.3 Pré-requisitos e riscos

- **Desempenho do store** é pré-requisito das camadas 3–6: sugiro uma tarefa própria (tabelas separadas para conversas, jobs e chamadas de IA no SQLite/Postgres, ou cache de leitura sem cópia profunda).
- **Modelo local pequeno** (3B) entende pouco de contexto longo; para o "super agente" de verdade, as camadas 3+ precisam de um modelo maior via API (decisão de custo do dono).
- Nada disso é implantado sem o deploy do LEVEL 1 e a rotação das chaves.

### 7.4 Decisões do proprietário

3. Aprovar a camada 1 (contexto real no prompt) para fazer já.
4. Aprovar a tarefa separada de desempenho do store.
5. Qual provedor e orçamento usar para as camadas 3+.