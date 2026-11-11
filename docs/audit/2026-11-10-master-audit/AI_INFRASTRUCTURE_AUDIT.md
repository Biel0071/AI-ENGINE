# AI_INFRASTRUCTURE_AUDIT — FÊNIX OS

Data: 2026-11-10 · Escopo: `ai-engine/grg/src` · Método: leitura de código + `/health` público de produção.
**[FATO]** = confirmado em código/execução · **[HIPÓTESE]** = inferência não verificada · ✔ = verificado pessoalmente pelo auditor principal.
Caminhos relativos a `ai-engine/grg/src/`.

## 1. Resumo

Existe **um caminho canônico real e bem construído** (`AIRouter` → `AIGateway` → adaptadores HTTP com circuit breaker, retry, cache e guarda anti-fabricação), cercado por **8 roteadores/gateways concorrentes**, vários com **sucesso fabricado**. RAG usa **embeddings por hash (não semânticos)**. Controle de custo existe no código mas **nunca é configurado**. Em produção o único provedor de geração externo (`aiplatform`) está **offline**; os provedores ativos são `echo` e `ollama`.

✔ Produção (`GET https://209.50.241.22/health`, 2026-11-10 14:11Z):
```
"ai-providers": { echo: ok, ollama: ok, aiplatform: { ok:false, error:"no generation provider is online" } }
"environment": "development"
```

## 2. Provedores chamados por HTTP

| Provedor | Call site | Endpoint | Env (só nome) | Status |
|---|---|---|---|---|
| OpenAI / Codex | `ai-runtime/http-providers.js:66` | `/v1/responses` | `OPENAI_API_KEY`, `FENIX_CODEX_API_KEY` | REAL se configurado |
| Anthropic (Claude) | `ai-runtime/http-providers.js:118` | `/v1/messages` | `ANTHROPIC_API_KEY` | REAL se configurado |
| Gemini | `ai-runtime/http-providers.js:142` | `generateContent` | `GEMINI_API_KEY` (Imagen põe a chave na query string: `services/image-generation-engine.js:372`) | REAL |
| Groq | `ai-runtime/http-providers.js:90` | `/openai/v1/chat/completions` | `GROQ_API_KEY` | REAL |
| OpenAI-compatível genérico | mesma classe | `FENIX_OPENAI_COMPATIBLE_URL` | `FENIX_OPENAI_COMPATIBLE_KEY` | REAL |
| **OpenRouter** | nenhum | — | — | **AUSENTE** (só nome em `ai-runtime/ai-router.js:35`) |
| API Platform (VPS própria) | `ai-runtime/aiplatform-provider.js:13-66` | `/v1/text`, `/v1/chat`, `/v1/jobs/:id` | `GRG_AIPLATFORM_URL/KEY` | REAL, **offline em produção** |
| API Platform — clientes paralelos | `ai/model-router.js:81`, `ai/provider-registry.js:55`, `cognition/cognitive-bus.js:70` (sem auth), `api/universal-system-routes.js:930` | IP fixo `http://209.50.241.22:3001` (`routing/model-router.js:35`) | — | DUPLICADO |
| Ollama | `ai-runtime/ollama-provider.js:62-99`, `ollama-stream.js:45`, `routing/model-router.js:491`, `execution/fenix-worker.js:96` | `/api/generate`, `/api/chat` | `FENIX_ENABLE_OLLAMA` | REAL |
| "Qwen", "Antigravity", "Claude executor" | `agents/dynamic-pool-manager.js:16-29`, `reconstruction/dynamic-workforce.js:19` | — | — | **RÓTULO APENAS** |

## 3. Seleção e roteamento

Canônico [FATO]: `ai-runtime/ai-router.js` escolhe tier local → free → paid (`:33-38`), pegando o primeiro conector com `selfTest` CONNECTED (`:96-171`); `ai-runtime/ai-gateway.js:46-67` executa.
Fraquezas: sem ranking por latência/custo medidos (`selectLane` devolve estimativas fixas, `ai-router.js:371-372`); `classifyTask` por palavra-chave (`:288-345`); `invoke` não repassa `lane` (`:223`).

Roteadores concorrentes [FATO]:

| # | Módulo | Comportamento | Quem usa |
|---|---|---|---|
| 1 | `ai-runtime/ai-router.js` | canônico (`app.aiRouter`, `app.js:835`) | chat, agentes, factory |
| 2 | `ai-runtime/ai-gateway.js` | canônico (`app.js:171`) | idem |
| 3 | `ai/model-router.js` + `ai/provider-registry.js` | `route()` sempre qwen2.5:3b (`:11-16`) | `orchestrator/autonomous-job-orchestrator.js:50,575`, FenixMind, `product-experience-routes.js:150` |
| 4 | `routing/model-router.js` | singleton de módulo, não por tenant (`:18`) | conversation-routes, fast lane, fenix-worker, health |
| 5 | `cognition/cognitive-bus.js` | não instanciado | morto |
| 6 | `infrastructure/ai-gateway/ai-gateway.js` | só `runtime/daemon.js` (nunca iniciado) | morto |
| 7 | `orchestrator/resource-model-router.js` | matriz estática | só plano |
| 8 | `ai-runtime/model-orchestrator.js` | `selectModel` ignorado (`:43`) | `app.modelOrchestrator` |

Mais registros de modelos em `omega/model-economy-engine.js` e `mind/fenix-mind.js:78-87`. `app.llm` (`app.js:670-696`) é cliente paralelo API Platform/Ollama usado pelo chat, que **contorna o gateway** (sem contabilidade) [HIPÓTESE forte].

## 4. Fallback: real × fabricado

Real [FATO]: breaker 3 falhas/30 s + `withRetry` 2× em 429/5xx (`ai-runtime/ai-gateway.js:144-165`); `ai-runtime/fabricated-response.js:23-48` rejeita marcadores de fallback — **só as 4 classes de `ai-runtime` usam essa guarda**.

| Local | O que faz |
|---|---|
| ✔ `execution/fenix-worker.js:164-175` | Qualquer falha da API Platform → `success:true`, texto fixo "Fênix Contingency Output…", `tokens:120`. Job vira COMPLETED e o texto vai para a memória (`:304-325`). Ativo quando o self-healing sobe esse worker (`reliability/self-healing-engine.js:597`). |
| `ai-runtime/model-orchestrator.js:49-56` | Falha → texto "Processed … task", `tokens:150`. |
| `cognition/cognitive-bus.js:227-241` | Devolve o próprio prompt como sucesso (morto). |
| `api/universal-system-routes.js:907-942` | test-chat sem checagem de fabricação, `ok:true`. |
| `missions/workers/*.js:20` (10 arquivos) | `{ success:true, simulatedLLM:true }` sem roteador. |
| `routing/model-router.js:633-647, 687-692` | Plano fixo de 3 passos; revisão afirma que tudo "foi executado pelas ferramentas reais". |
| `ai/model-router.js:20-35` | `tokensSaved = raw*0.75` inventado; ramo DETERMINISTIC devolve o prompt com sucesso. |
| `orchestrator/autonomous-job-orchestrator.js:706-716` | Sempre registra "Reality Gate aprovados com 100%", `testsExecuted += 4`. |
| `ai-runtime/providers.js:10-29` (`EchoProvider`) | Resposta "[echo-small] answer(N)"; registrado fora de produção e rota padrão (`ai-runtime/provider-registry.js:16,83`). Marcador fora da lista anti-fabricação. **Produção reporta `development` e `echo: ok`** ✔. |

## 5. Custo, tokens, cache, limites, timeouts, streaming

| Tema | Situação [FATO] | Evidência |
|---|---|---|
| Tokens | `usage` do provedor, senão chars/4 | `ai-runtime/providers.js:5-8` |
| Preço | `aiPrices` nunca passado → tabela fallback fictícia | `ai-runtime/ai-gateway.js:381-386` |
| Orçamento | reserva token/USD existe; `setBudget`/`setCostBudget` **sem chamadores** → infinito | `ai-gateway.js:265-319` |
| Limites diário/mensal | definidos, nunca checados | `ai/token-economy-engine.js:30-34` |
| Cache | sha256 do prompt, TTL 1 h, em `state.aiCache` (documento único), sem evicção | `ai-gateway.js:123-129,177-184` |
| Rate limit | só com Redis (60/min) | `app.js:233-239` |
| Concorrência | só Ollama (2 simultâneas, fila 10) | `routing/model-router.js:351-352` |
| Timeouts | gateway 120 s; API Platform 15 s + 1 retry; stream Ollama 300 s | `http-providers.js:14-16`, `aiplatform-provider.js:241-242` |
| Streaming | SSE real ao browser; NDJSON real do Ollama; nuvem **sem streaming** | `chat/live-chat-routes.js:67-84`, `aiplatform-provider.js:323-333` |
| Contexto | últimas N mensagens + resumo; snippets de 300 chars; **sem tokenizer** | `chat/conversation-store.js:146-234` |

## 6. Memória / RAG

- ✔ **Embeddings não semânticos:** `memory/embedding.js:3-14` — 64 dimensões por hash sha256 de termos. A "busca vetorial" é sobreposição lexical com ruído de colisão.
- Cliente Qdrant real (`memory/qdrant-vector-store.js`); produção mostra `vector-store: qdrant ok`.
- Score híbrido 0,55 lexical + 0,35 vetor + 0,10 confiança (`memory/memory-engine.js:188`). Recuperação chega ao prompt do chat (`conversation-store.js:158-180`).
- ✔ **Bug:** `memory/knowledge-genome.js:56` chama `upsert(tenantId, id, summary, {...})`; assinatura real é `upsert(memory, vector)` (`memory/qdrant-vector-store.js:37`). Erro engolido por `catch {}` → **cápsulas de conhecimento nunca chegam ao Qdrant**.
- `memory/memory-fabric.js:31-42`: provedores Graphiti/Zep são stubs que devolvem `'mock'`; `app.js:244` desestrutura `MemoryFabric`, que o módulo não exporta (undefined).
- Sistemas de memória paralelos: `MemoryEngine`, `CognitiveMemoryEngine` (`app.js:453`), `EngineeringMemory` (`:266`), `KnowledgeGenome`, stores do `KnowledgeEngine`.

## 7. Agentes: executam ou simulam?

**Executam [FATO]:**
- `agents/agent-execution-runtime.js:37-118` (`agent.execute`): LLM → operações JSON → escrita via capability git → `node`/`npm test` em allowlist (`agents/agent-workspace-executor.js:67-110`) → commit se passar → até 3 retries. Riscos: `policyAllows` e `commit` vêm do JSON do próprio LLM (`:97-99`); o executor injeta shims em arquivos de teste (`:92-100`); `shell:true` no Windows (`:102`).
- `software-factory/safe-dev-pipeline.js:47-93`: worktree git, gates, diff. **Melhor desenho do sistema.**
- `orchestrator/autonomous-job-orchestrator.js:551-623`: escrita + `execSync` (`orchestrator/real-world-executor.js:40`). **PATCH sobrescreve o arquivo inteiro com a resposta do LLM sem enviar o conteúdo original no prompt (`:576, :596-604`) → destrutivo.**

**Simulam [FATO]:**
- ✔ `agents/dynamic-pool-manager.js:279-292`: `approveTask` marca COMPLETED após `setTimeout(3500)` ("Simulated execution completion"). `efficiency`/coordenadas via `Math.random` (`:64-71`).
- `api/dynamic-pool-routes.js:156`, `reconstruction/dynamic-workforce.js:83-86`, `execution/worker-scheduler.js:21` ("simulate work"), `missions/worker-base.js:155` (CPU% aleatório).

## 8. Sem chave de API

- Dev: providers = `{echo}`, gateway devolve texto echo. `app.llm` tenta API Platform → Ollama local (`app.js:676-695`, ligado por padrão). Se ambos falham, `ChatAgent` cai no gateway (`chat/chat-agent.js:13-15`) → **[HIPÓTESE] o usuário pode receber texto echo**.
- Fast lane exclui echo e falha honestamente (`execution/fast-lane-engine.js:141-147`) — padrão a replicar.
- Produção real (`FENIX_ENV=production`) recusa boot com echo (`app.js:162-168`), **mas a VPS roda como `development`**.

## 9. Arquitetura recomendada (Claude, Codex, Antigravity, Ollama, Groq, OpenRouter)

Princípio: **um ponto de decisão (`AIRouter`) e um executor (`AIGateway`)**. Nenhum provedor novo justifica um roteador novo.

| Lane | Uso | Primário | Fallback | Motivo |
|---|---|---|---|---|
| fast | classificar, resumir, status, intenção | Ollama local (qwen2.5) | Groq | custo zero, latência local |
| standard | chat, geração curta | Groq | OpenRouter (modelos baratos) | latência e preço |
| deep | planejamento, arquitetura, retry de agente (lane 'deep' já existe em `agent-execution-runtime.js:43`) | Claude | OpenAI/Codex | qualidade de raciocínio/código |
| code-agent | editar repositório | Claude/Codex via `safe-dev-pipeline` | — | diff revisável, worktree isolado |

"Antigravity" é IDE/agente, não API de modelo: integrar como **cliente do MCP** existente (`bin/fenix-mcp.js`), não como provedor.

Passos mínimos (sem módulos novos):
1. OpenRouter como `OpenAICompatibleProvider` em `ai-runtime/provider-registry.js:39`.
2. Passar `lane` ao `select()` em `AIRouter.invoke` + mapa provedor→modelo por lane.
3. Redirecionar roteadores 3, 4, 8, `app.llm` e `fenix-worker.callAI` para `app.aiRouter`; apagar 5 e 6.
4. Embeddings reais (Ollama `nomic-embed-text`), reindexar Qdrant, corrigir `knowledge-genome.js:56`.
5. Tabela de preços por env + `setBudget`/`setCostBudget` ativos + rate limit sem depender de Redis.

## 10. Não verificado

- Se o chat de produção hoje devolve texto do echo (exige login; não autenticamos em produção).
- Consumo real de tokens/custo em produção.
- Qualidade das respostas do Ollama em produção.
- Nenhum teste padrão exercita saída real de modelo (o único, `self-development-ai-platform.test.js`, é pulado sem `GRG_AIPLATFORM_*`).