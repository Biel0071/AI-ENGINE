# FÊNIX Ω∞ — CONNECTOR RUNTIME (Contrato)

**Estado: PLANNED.** Nenhum conector concreto existe. Zero `oauth2|access_token|
refresh_token|client_secret` em `src/`. O único conector real é `repo-intel/github-connector.js`.
Este documento é o **contrato** que qualquer conector futuro deve satisfazer — não uma
implementação. Escrevê-lo agora prepara a ativação sem simular existência (MISSION-0003B).

## Por que contrato antes de conector

O elo que falta para "o FÊNIX construir o FÊNIX" é o GitHub de saída autenticado: sem ele,
a missão não abre PR no próprio repo. Mas OAuth de saída exige guarda de credencial por
tenant, e credencial real toca as regras de segurança do projeto. O contrato define a forma;
a implementação de cada conector é decisão do dono, com credenciais que só ele fornece.

## Interface obrigatória de um conector

Todo conector, para ser registrado, deve declarar:

| Campo | Significado |
|---|---|
| `id` | identificador único (ex.: `github`, `google-ads`) |
| `auth` | tipo (`oauth2` / `api-key` / `none`) + escopos exigidos |
| `scopes` | permissões mínimas, nunca mais que o necessário |
| `businessObjects` | os substantivos que o conector expõe (ex.: Meta: Campanha→Conjunto→Anúncio→Pixel) |
| `webhooks` | eventos que ele recebe, se houver |
| `rateLimits` | limites da fonte, para o runtime respeitar |
| `docs` | referência à documentação da API |
| `selfTest()` | prova de vida sem efeito colateral (ping autenticado) |

## Estados de um conector

```
UNREGISTERED → REGISTERED (contrato aceito) → CREDENTIALED (segredo por tenant, cifrado)
→ VERIFIED (selfTest passou) → ACTIVE (em uso) → DEGRADED (fonte falhando) → REVOKED
```

Nenhum conector passa de REGISTERED sem credencial real por tenant. A credencial **nunca**
vive no código nem em log — guarda cifrada por tenant, chave fora do repositório (NÃO a de
`security/cognitive-encryption.js:9`, que deriva de literal — dívida técnica registrada).

## Eventos

- `connector.registered` — contrato aceito.
- `connector.verified` — selfTest passou.
- `connector.credential.rotated` — segredo trocado (valor nunca no evento).
- `connector.degraded` — fonte falhando; runtime reduz chamadas.

## Critério de promoção (por conector)

`REGISTERED` → contrato + testes de contrato verdes. `VERIFIED` → selfTest real contra a
fonte. `ACTIVE` → autorização humana + credencial por tenant. Nenhuma promoção automática.

## Roadmap de ativação (MISSION-0003C)

| Conector | Estado | Pré-requisito | Risco |
|---|---|---|---|
| GitHub (saída) | PARTIAL | token; já existe conector | baixo |
| Google (Ads/Analytics) | PLANNED | app credentials + OAuth de saída | médio (credencial) |
| Meta (Marketing) | PLANNED | app credentials + business objects | médio |
| WhatsApp | PLANNED | conta business + webhook | médio |
| Supabase / Cloudflare | PLANNED | api-key por tenant | baixo |
| OpenRouter / Claude / GPT / Gemini | PARTIAL | já plugáveis via ai-gateway routes | baixo |

Critério de medição comum: cada conector reporta chamadas, latência e falhas via
`measured()`; ausência de dado é `unknown`, nunca zero. Critério de evolução: um conector
só sobe de estado por evidência de selfTest real, não por declaração.
