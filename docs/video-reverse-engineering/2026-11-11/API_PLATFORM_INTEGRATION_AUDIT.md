# Auditoria da integração com a API Platform — 2026-11-11

Tudo abaixo foi medido na VPS `209.50.241.22` nesta data. Chaves não aparecem neste documento: os testes rodaram na própria VPS, lendo a chave do ambiente do processo `fenix-backend` (`GRG_AIPLATFORM_KEY`, 56 caracteres).

## Onde está e como o Fênix a usa

| Item | Valor medido |
|---|---|
| Serviço | `api-platform-Engine`, em Docker, `http://209.50.241.22:3001` (código em `/opt/grg-fenix/workspaces/AI-PLATFORM`) |
| Ligação com o Fênix | `GRG_AIPLATFORM_URL` no `fenix-backend` (PM2); `FENIX_AI_DEFAULT_PROVIDER=aiplatform`, modelo padrão `qwen2.5:0.5b` |
| Autenticação | `Authorization: Bearer <GRG_AIPLATFORM_KEY>` |
| Saúde | `GET /health` e `/v1/health` → 200, `ONLINE`, Postgres e Redis ok |
| Documentação | Swagger em `/docs` (JSON em `/docs/json`): **183 rotas** |

## Rotas relevantes (do Swagger, não inventadas)

- Geração: `POST /v1/chat/completions` (formato OpenAI), `POST /v1/messages`, `POST /v1/chat`, `POST /v1/text`
- Fila e jobs: `POST /v1/jobs`, `GET /v1/jobs/{id}`, `POST /v1/jobs/status`, `GET /v1/jobs/stats`, `POST /v1/queue/enqueue`, `GET /v1/queue/status`
- Missões: `GET,POST /v1/missions`, `GET /v1/missions/{id}`, passos, `complete`, `cancel`
- Código: `POST /v1/ide/files`, `/v1/ide/file`, `/v1/ide/patch`, `/v1/ide/save`; repositórios e pipelines em `/v1/repositories/*`
- Observabilidade: `GET /v1/providers`, `/system/ai-capacity`, `/v1/monitoring/workers`, `/v1/monitoring/ai-usage`, `/v1/monitoring/jobs`, `/metrics`
- Não existem: `/openapi.json`, `/v1/capabilities`, `/api/health` (404).

## Provedores e modelos (medido)

- **Chat:** só Ollama local na VPS — `qwen2.5:3b`, `qwen2.5-coder:1.5b`, `deepseek-r1:1.5b`, `llama3.2:1b`, `gemma3:1b`, `qwen3.5:0.8b`, `qwen2.5:0.5b`.
- `jev` (`jev-cloud`): saudável, mas só para **decisão**. `laya`: offline (`LAYA_BASE_URL` não configurado). `mission-engine`: orquestrador.
- **Nenhum provedor de nuvem** (Groq, OpenAI, OpenRouter, Anthropic) está configurado.
- Workers: 1 ativo, concorrência 1 (outros 3 registros são antigos, sem heartbeat desde outubro). Fila `text`: tempo médio 52 s por job.
- Uso nas últimas 24 h antes do teste: 0 requisições.

## Teste real de geração de código

Tarefa: corrigir `average(xs)` para que `average([]) === 0` e `average([2,4]) === 3`.

| Rodada | Modelo | Tempo | Tokens | Resultado | Validação local |
|---|---|---|---|---|---|
| 1 | `qwen2.5-coder:1.5b` | 18,6 s | 168 | Lança `TypeError` para vetor vazio | **Falha** (contraria o teste) |
| 1 | `qwen2.5:3b` | 27,8 s | 168 | Mesmo erro | **Falha** |
| 2 (com feedback da revisão) | `qwen2.5-coder:1.5b` | ~20 s | 311 | `if (xs.length === 0) return 0;` | **Passa (2/2)** |

Comprovado: enviar tarefa → receber → ler o código → revisar → pedir correção → validar. A resposta é real (rastreio do gateway, provedor `ollama`, uso de tokens), não o texto de fallback visto na outra VPS.

## Conclusão para a delegação

- Os modelos disponíveis são pequenos (≤ 3 B) e rodam em CPU: servem para **tarefas pequenas e isoladas com teste de aceitação** (uma função, um teste unitário, resumo de log, documentação curta). Erraram um bug trivial na primeira tentativa.
- Não servem para as mudanças das Fases 0–3, que atravessam frontend, backend e store. Essas ficam com o Claude, que delega à VPS só as peças isoladas.
- Para a VPS gerar código de verdade em escala, o dono precisa configurar um provedor de nuvem na API Platform (por exemplo Groq ou OpenRouter) e definir orçamento. **Bloqueio que depende do dono.**
- Orçamento e limites já existentes no Fênix: `AIGateway` tem reserva de tokens e custo por tenant, circuit breaker, retry e cache; o roteador agora tem teto de saída por pedido (`maxOutputTokens`).