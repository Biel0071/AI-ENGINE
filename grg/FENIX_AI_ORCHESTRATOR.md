# FÊNIX Ω∞ — AI ORCHESTRATOR (MISSION-1003, FASES 1–2)

Inventário e mapeamento antes de qualquer código, como a missão exige. REALITY FIRST: cada
linha foi medida do repo local e da VPS, não assumida. Correção honesta de reporte anterior:
eu havia dito que "a branch só tem echo" — **falso**. A branch local tem os 7 providers
reais, os mesmos da VPS. A divergência é menor do que reportei.

## FASE 1 — Inventário dos providers (medido)

Fonte: `src/ai-runtime/` (repo local, branch feature/fenix-living-organism-foundation) —
idêntico ao implantado na VPS para os providers (a VPS está em schema v24; a branch em v30
adiciona Connector Runtime e governança, mas os providers são os mesmos).

| Provider | Arquivo | Ativa quando | Interface real |
|---|---|---|---|
| echo | providers.js | dev only (proibido em produção) | complete/chat |
| openai | http-providers.js | `OPENAI_API_KEY` | complete/chat |
| anthropic (Claude) | http-providers.js | `ANTHROPIC_API_KEY` | complete/chat |
| gemini | http-providers.js | `GEMINI_API_KEY` | complete/chat |
| groq | http-providers.js (OpenAICompatible) | `GROQ_API_KEY` | complete/chat |
| local (LM Studio/OpenAI-compat) | http-providers.js | `FENIX_OPENAI_COMPATIBLE_URL` | complete/chat |
| aiplatform | aiplatform-provider.js | `GRG_AIPLATFORM_URL`+`KEY` | available/complete/chat, `/v1/health` |
| ollama | ollama-provider.js | `FENIX_ENABLE_OLLAMA=1` | complete/chat |

**Interface comum medida** (o que todo provider já expõe): `name`, `models` (array),
`complete({model,prompt})`, `chat({model,messages,format,temperature})`, e alguns
`available()` (aiplatform tem `/v1/health` real). Esta é a superfície que os adaptadores do
Connector Contract vestem.

**Roteamento já existente** (`provider-registry.js` + `ai-gateway.js`):
- `loadRoutes()` — rotas por taskType (default/plan/generate) com `provider`+`model`.
- **fallback já suportado** (`route.fallback`), **circuit breaker já existe** (`this.breakers`).
- Produção **proíbe echo** explicitamente (erro se default=echo ou fallback com echo).
- Cache exato por hash antes do modelo (medido na MISSION-0002).

**Estado na VPS (produção, medido via SSH):** provider `aiplatform` plugado e **healthy**,
circuit CLOSED, 0 falhas. A "System Fusion" com a AI Platform **já existe** nesta forma —
o AI Platform é consumido como provider externo, sem duplicar seu código.

## FASE 2 — Mapeamento: provider ↔ Connector Contract

O Connector Contract (MISSION-0004) exige 12 métodos. Mapeamento para a interface real dos
providers — **sem reimplementar**, só traduzindo:

| Connector Contract | Origem no provider existente |
|---|---|
| `authenticate()` | presença da API key / config (mede, não fabrica) |
| `selfTest()` | `available()` (aiplatform) ou um `complete()` mínimo; falha medida |
| `health()` | deriva de authenticate + selfTest |
| `capabilities()` | `['text','chat']` + `['json']` quando suportado |
| `invoke()` | `complete()` / `chat()` existentes |
| `metrics()` | `store:aiCalls` (já gravado por AIGateway.record) |
| `limits()` | declarado por provider; observado quando a API expõe |
| `version()` | nome+baseUrl do provider |
| register/connect/disconnect/authorize/events | lifecycle no runtime (como o GitHub adapter) |

**Equivalências, duplicações, lacunas:**
- **Equivalência forte:** o AI Gateway já faz o que o "AI Router" da FASE 4 pede — rotas,
  fallback, circuit breaker, cache, telemetria em `aiCalls`. **Não criar um Router paralelo:**
  o AI Router deve ser uma fina camada de *seleção por evidência* sobre o gateway existente,
  não um segundo motor de roteamento (Princípio 6: no duplicate intelligence).
- **Lacuna real:** a seleção hoje é por config (taskType→provider fixo). O que falta é a
  decisão **por evidência medida** (saúde/latência/custo do `aiCalls`) e o Learning Router
  (ranking após execução). Isso é adição legítima, não duplicação.
- **Lacuna:** Codex e OpenRouter não existem como provider. Entram como mais um provider
  OpenAI-compatible (Codex) e um provider dedicado (OpenRouter) — mesma interface, sem nada
  especial (ajuste correto do dono: Codex é só mais um provider).
- **Incompatibilidade:** nenhuma. Os providers já compartilham interface; o Connector
  Contract é uma casca por cima.

## FASE 3–7 — Plano (a implementar na branch, produção intocada)

3. **Adaptador** `src/connectors/ai-provider-adapter.js`: veste QUALQUER provider existente
   com os 12 métodos do contrato. Um adaptador genérico, não um por provider (eles já
   compartilham interface). Registrado no ConnectorRuntime como `ai:<name>`.
4. **AI Router** `src/ai-runtime/ai-router.js`: camada fina sobre o AI Gateway. Seleciona
   provider por evidência (health do connector + latência/custo de `aiCalls`), respeitando a
   política: **local (ollama/lm-studio) → grátis (groq/openrouter) → pago (claude/gpt)**.
   Nunca fixa provider; decide por medição. Reusa fallback/breaker do gateway.
5. **Orchestration:** o Mission Runtime passa a pedir via AI Router; cada execução registra
   provider/modelo/duração/tokens/custo/sucesso em `aiCalls` (já existe) + ranking.
6. **Testes** `test/ai-router.test.js`: seleção por evidência, fallback, breaker, failover,
   política local-first — com providers fake injetados (sem rede/credencial real no CI).
7. **Resultado:** produção intocada; PR só com testes+auditoria verdes.

## Fronteira

- Nada na VPS é alterado. A produção (schema v24) segue viva; o trabalho é na branch (v30).
- A reconciliação real (levar Connector Runtime + Router para a VPS) é **deploy**, decisão do
  dono, por PR e redeploy — não parte desta missão.
- Nenhum segredo lido/ecoado; chaves de provider só por env, presença medida.
