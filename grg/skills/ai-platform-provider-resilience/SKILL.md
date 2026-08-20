---
name: ai-platform-provider-resilience
description: Inspect, maintain and enhance AI Platform Provider resilience with deterministic retry policies, exponential backoff, and zero-secret credential resolution.
triggers:
  - ai-platform
  - provider-resilience
  - retry-backoff
  - llm-timeout
  - ai-gateway-maintenance
domains:
  - ai-runtime
  - resilience
  - backend
  - observability
version: 1.1.0
---
# AI Platform Provider Resilience

Use this skill when maintaining, testing or enhancing the FÊNIX AI Platform Gateway connection (`AIPlatformProvider`).

Workflow:
1. Verify credential resolution using `resolveAIProviderKey()` across `/run/secrets/ai_provider_key`, `${VAR}_FILE`, and `GRG_AIPLATFORM_KEY`.
2. Inspect health using `available()` with real inference probe against `/v1/text` (1.3s probe, 39 tokens, zero mocks).
3. Enforce exponential backoff and timeout controllers on transient network errors (HTTP 502/503/504, `ECONNRESET`, `ETIMEDOUT`).
4. Handle HTTP 202 asynchronous job queues deterministically with `waitForJob()` polling and nested `result.result.text` parsing.
5. Record telemetry (`requestId`, `latencyMs`, `tokens`) with zero secret leakage in logs, frontend, or git checkpoints.

Context Budget:
- Never log, print or expose API keys (`GRG_AIPLATFORM_KEY` or secret file content).
- Always return honest `OFFLINE` status when the remote platform is unreachable.
