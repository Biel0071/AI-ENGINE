# FÊNIX — Registro de execução autônoma

Estados: PENDING · RUNNING · DELEGATED · REVIEW_REQUIRED · BLOCKED · PASSED · FAILED.

## Integração com a API Platform — PASSED (2026-11-11)

Ver `API_PLATFORM_INTEGRATION_AUDIT.md`. Teste real de código: rodada 1 errada (2 modelos), rodada 2 com feedback da revisão correta e validada (2/2 asserts). Bloqueio do dono: não há provedor de nuvem configurado na API Platform; só modelos locais ≤ 3 B em CPU.

## Fase 0 — Desempenho — PASSED (critérios abaixo), suíte completa em verificação

**Início:** 2026-11-11 · **Fim:** 2026-11-11

### Medições antes / depois

| Medida | Antes | Depois | Como foi medido |
|---|---|---|---|
| Leitura do store (SQLite, 3,9 MB) | 57 ms | 0,6 ms | benchmark sobre cópia do banco |
| Uma gravação | 308 ms | 128 ms | idem |
| 10 gravações simultâneas | 5.420 ms | 183 ms | idem |
| Maior bloqueio do servidor durante gravações | 538 ms | 61 ms | idem |
| Pergunta no chat (resposta real do Ollama) | 10–20 s | 2,2–2,6 s | servidor local, 2 perguntas |
| `/health` mediana / pior caso | 375 / 2.229 ms | 2 / 323 ms | 47 pedidos em 25 s, com chat em paralelo |
| Página da Cidade ocupada (sem GPU), por 15 s | 17,4 s | 4,3–5,9 s | Chromium headless, métricas CDP |
| Luzes dinâmicas acesas por quadro | 60 | 8 (0 sem GPU) | `scene.traverse` |
| Pedidos de `/health` por ~55 s de página | 34–55 | 10 | contagem de rede no Playwright |
| Teste `level23-city-adaptive-dock` | estourava 240 s | **passa em 42 s** | — |

### O que foi feito

- `SqliteStore`: leitura rasa e gravações agrupadas, no desenho do `PostgresStore` (que já era assim em produção). `postgres-store.js` só passou a exportar `normalizePersistedState` e `cloneReadSnapshot`.
- Cidade (`fenix-world-3d.js`): custo de cada quadro medido; qualidade baixa automática acima de 50 ms (respeita a escolha manual "alto"); detecção de renderizador por software (SwiftShader/llvmpipe) com meia resolução, sem sombras e ~1 quadro/s; **orçamento de luzes** (máx. 8 pontuais acesas; causa principal medida).
- Cabeçalho do dock (`city-adaptive-dock.css`): botões de janela sempre clicáveis (antes só no hover: inalcançáveis no toque).
- `fenix-request-guard.js`: `GET /health` compartilhado por 4 s entre os 7 scripts que o consultavam.
- Teste `level23`: atualizado para os IDs e controles atuais (modal renomeado antes desta sessão, barra City Control removida a pedido do dono, gavetas abaixo de 820 px).

### Delegação à VPS

| Tarefa | Modelo | Tokens | Resultado |
|---|---|---|---|
| `_recordFrameCost` + `_adaptiveFrameIntervalMs` | `qwen2.5-coder:1.5b` | 651 + 1.331 | Rodada 1: 2 bugs (sem limiar de 50 ms; NaN na 1ª amostra). Rodada 2: devolveu o mesmo código ignorando o feedback. **Escalado ao Claude**; aproveitada a parte correta (intervalo e leitura da preferência). |

### Testes novos

`sqlite-store-snapshot` (4), `city-adaptive-quality` (9), `health-fetch-share` (4). `level23-city-adaptive-dock` passa.

### Pendências

- Sem GPU a página ainda fica ~30–40 % ocupada (3.489 chamadas de desenho e 7.679 objetos por quadro). Reduzir de verdade exige juntar geometria (instancing) — tarefa maior.
- Abrir conversa ainda grava o store várias vezes; agora custa ~130 ms por gravação, não mais segundos.
## Rede universal de IAs (prioridade pedida pelo dono no meio da execução) — PASSED

Ver `docs/universal-ai-network/FENIX_UNIVERSAL_AI_ARCHITECTURE.md` e `FENIX_MCP_INTEGRATION.md`.
- Identidade por ferramenta (token `fxc_`, só hash guardado, revogável, escopos); memória compartilhada sobre o `MemoryEngine` existente; protocolo de 15 tipos de mensagem; travas de arquivo (409); contexto compacto; 9 ferramentas novas no MCP existente; migração de esquema 43 → 44.
- Segurança: ferramenta de IA não aprova, não faz deploy, não administra conexões (403).
- Testes: `universal-hub` (9, HTTP real, inclui persistência após reinício) e `universal-hub-mcp` (3). Prova manual com o processo `bin/fenix-mcp.js` real.
- Correção encontrada no caminho: `app.memory` (MemoryGateway) devolvia sucesso mesmo quando a gravação falhava; o hub usa o `MemoryEngine` direto.

## Fase 1 — Diretor + fila de aprovação — PASSED

- `src/missions/fenix-director.js` + `/api/v2/director/*`: ordem → missão com etapas por agente (catálogo governado) → etapa RED (código/deploy) pausa até aprovação humana.
- Quem pede é o ator de sistema `fenix-director` (papel `system_agent`, sem senha nem token); quem aprova é o humano (política de aprovador separado). Antes, num sistema de um dono só, ninguém conseguia aprovar uma missão própria.
- Rejeitar agora cancela a missão (antes a etapa ficava "aguardando" para sempre); "pedir revisão" cancela e cria nova missão com o comentário; histórico de decisões.
- Tela: botão "Precisa de você (N)" na barra inferior e console do diretor (ordem, projeto real, fila, histórico; motivo no próprio cartão, sem janela nativa).
- Testes: `director-approvals` (6, HTTP real, jobs numa pasta temporária). Verificação na tela: ordem real → inspeção real → etapa na fila → rejeitada com motivo → missão cancelada → histórico.

## Fase 2 — Agentes com dados reais — PASSED

- Removidos números fabricados do catálogo de agentes (`dynamic-workforce.js`): efficiency/uptime/tarefas/qualidade sorteados, missão fictícia "System Optimization", status ONLINE e batimento "agora", latência fixa dos executores.
- `/api/v2/agents/live`: status (EXECUTANDO / OCIOSO / SEM_ATIVIDADE), jobs, missões, tokens e modelo das chamadas de IA, tarefa atual, última atividade, histórico; trabalho de quem está fora do catálogo ("Developer Agent", 30 jobs) aparece; ferramentas de IA conectadas.
- Detalhe do agente na Cidade lê esses dados (antes inventava modelo "qwen2.5:3b" e "DISPONÍVEL"); botões Conversar e Enviar ordem (abre o diretor com o agente já escrito).
- Testes: `agents-live-data` (4).

## Fase 3 — Respostas com fontes — PASSED (com limite conhecido)

- Fontes numeradas [F1]… (runtime, arquivos que existem no disco, rotas, telas, memórias) enviadas ao modelo e devolvidas com a resposta, marcando as citadas. Ruído (`test-results`, `node_modules`) e arquivos inexistentes ficam fora.
- Pergunta sobre o sistema → só fontes + "não encontrei"; pergunta geral → resposta normal sem fontes (decidido no código: o modelo 3B não seguia a regra condicional).
- Tela: bloco "Fontes (N citadas de M consultadas)" sob cada resposta do chat.
- Testes: `chat-system-context` (8). Verificação real: "Quais missões foram canceladas?" → missão real com [F1]; "capital da Austrália" → Canberra.
- **Limite:** o índice busca por palavras; pergunta em português sobre arquivo com nome em inglês ("painel de jobs" × `city-adaptive-dock.js`) não acha o arquivo e a resposta diz "não encontrei". Resolver é a camada 2 (mapa de telas e botões).

## Pendências gerais

- API Platform só tem modelos locais ≤ 3 B; delegação de código em escala depende de provedor de nuvem e orçamento (dono).
- `level27-self-healing` teste 8 é instável (arquivos de estado compartilhados em `grg/.data`), anterior a esta sessão.
- Criar ordem no diretor leva ~10–15 s (listar 45 projetos e resolver workspace).