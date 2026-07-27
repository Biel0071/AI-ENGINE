# ADR-0004: Model-independent enterprise AI Gateway

- Status: accepted
- Date: 2026-07-27
- Scope: inference routing, provider isolation, budgets and telemetry

## Decision

FÊNIX owns routing, policy, memory and telemetry. Model providers remain replaceable processors behind one `complete` contract.

The gateway now supports:

- OpenAI Responses with provider-side storage disabled by default;
- Anthropic Messages;
- Gemini `generateContent`;
- Groq and local OpenAI-compatible endpoints;
- Ollama and the GRG AI Platform adapters through the same provider registry;
- an ordered fallback chain per task route;
- bounded retry only for explicitly retryable failures;
- one circuit breaker per provider;
- semantic cache with expiration and tenant/route isolation;
- atomic token and cost reservations before inference;
- Redis-backed per-tenant AI rate limiting when Redis is enabled;
- provider/model/token/cost/latency telemetry without prompt contents or API keys;
- live provider health details exposed as an optional health probe.

Routes are configuration, not code. `FENIX_AI_ROUTES_JSON` can define `default`, task-specific provider/model choices, `maxOutputTokens`, and ordered `fallback` candidates. Environment-specific secrets are read only during provider construction and stored in private fields; configuration examples contain no credentials.

## Failure semantics

Authentication and non-retryable client failures immediately move to the next provider. HTTP 429 and server failures may receive one bounded retry before fallback. When all candidates fail, token/cost reservations are released and a sanitized failure event is emitted. Provider response bodies, prompts and secrets are not included in failure events.

## Cost policy

Prices are injected as a model catalog (`inputPerMillion`, `outputPerMillion`). Before a call, the gateway reserves the maximum configured candidate cost and output-token capacity. It reconciles reservations against actual provider usage atomically. Unknown models retain the Alpha estimator until the price catalog service is implemented; production routes must supply reviewed prices.

## Limitations

Streaming, embeddings, batch inference, multimodal payload normalization and provider price synchronization remain separate increments. The older Ollama transport is currently loopback-only and will receive configurable TLS/network policy in a later hardening increment.
