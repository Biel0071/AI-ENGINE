---
type: decision
title: Integração com AI Platform Enterprise (a "API GRATIS" / gateway da VPS) + fallback
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/ai-runtime/aiplatform-provider.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/app.js
confidence: 0.9
supersedes: null
---

## Contexto
Usuário tem em C:/Users/Dell/Documents/API GRATIS/ o "AI Platform Enterprise" = o AI-LLM gateway
do portfólio (Fastify+Prisma+BullMQ, multi-provider: Ollama/Groq/Gemini/Claude/Cloudflare/OpenRouter,
cache, filas, multi-tenant). Exposto via cloudflared quick-tunnel na VPS. Pediu para o GRG usar essa
API como cérebro, ligada à VPS, evoluindo com o tempo.

## Conteúdo
Criado **AIPlatformProvider** (`grg/src/ai-runtime/aiplatform-provider.js`): fala com o gateway via
POST /v1/chat {messages} e /v1/text {prompt}, header x-api-key. http E https. available() checa /v1/health.
Mesma interface do Ollama/Echo → plugável no AI Gateway e no ChatAgent.

app.js agora resolve o LLM em CADEIA DE FALLBACK resiliente:
1. AI Platform (se GRG_AIPLATFORM_URL + GRG_AIPLATFORM_KEY setados e /v1/health responde)
2. Ollama local (se disponível)
3. modo regras (sem LLM)
app.llmSource expõe qual venceu. server.js loga. start.sh (grg/) já traz a config.

## FATO IMPORTANTE sobre a VPS
No momento do teste a VPS/túnel estava FORA DO AR (HTTP 000). O cloudflared quick-tunnel
(trycloudflare.com) é EFÊMERO: a URL muda a cada reinício. tunnel-url.txt tinha
https://template-atlanta-breeds-fired.trycloudflare.com (morto). GROQ_API_KEY vazia no .env.
→ Para o gateway ser útil de verdade: subir a VPS (docker compose up na API GRATIS), pegar a URL
nova do tunnel-url.txt, e setar GRG_AIPLATFORM_URL. OU usar um cloudflared named tunnel (URL fixa).

## Validação
- 14 arquivos de teste verdes (aiplatform.test.js com mock HTTP do gateway: health/chat/text/auth).
- Servidor real apontado pra VPS: health falhou → CAIU AUTOMATICAMENTE no Ollama local
  ("LIGADO via ollama:qwen2.5:3b"). Chat respondeu natural. Resiliência provada.

## Config (start)
GRG_LLM=1 GRG_AIPLATFORM_URL=<url do tunnel> GRG_AIPLATFORM_KEY=ap_... (DEFAULT_API_KEY do .env da
API GRATIS) → grg/start.sh. Sem VPS, funciona no Ollama.

## Escopo honesto
A PONTE está pronta e testada. Mas o gateway só entra em ação quando a VPS estiver no ar com URL
atualizada. Não configurei nada dentro da "API GRATIS" (não subi a VPS nem mexi no .env dela).
"Sistema evoluindo/construindo API própria de respostas" = a memória evolutiva + cache já fazem
parte disso; construir endpoints próprios do GRG a partir do aprendizado é roadmap.
