# FÊNIX Universal AI Network — arquitetura (2026-11-11)

Objetivo do dono: Claude, Codex, Antigravity, modelos locais e o próprio dono trabalham **com o FÊNIX**, não isolados. Uma descoberta feita por uma ferramenta fica disponível para as outras; tarefas e resultados circulam por mensagens registradas; ninguém sobrescreve o arquivo de outro em silêncio.

Este documento reúne os temas pedidos (arquitetura, memória compartilhada, protocolo, colaboração, segurança e testes) num só lugar. A conexão das IDEs está em `FENIX_MCP_INTEGRATION.md`.

## O que foi reaproveitado (nada duplicado)

| Peça existente | Papel na rede |
|---|---|
| `MemoryEngine` (`src/memory/memory-engine.js`) | Memória compartilhada: origem (`provenance`), confiança, tags, projeto, versões, permissões |
| Servidor MCP (`bin/fenix-mcp.js`) | Porta de entrada para IDEs; ganhou 9 ferramentas do hub |
| `FenixHttpClient` | Cliente HTTP usado pelo MCP |
| Autenticação (`AuthService.contextFromAsync`) | Ponto único onde o token de ferramenta é reconhecido |
| Portão de escrita do LEVEL 1 | Continua valendo para ferramentas (agem em nome do dono) |
| Event Bus | Eventos `hub.message`, `hub.knowledge.recorded`, `hub.lock.acquired`, `hub.client.created` |
| Feed universal de IDE (`universal-job-routes.js`) | Mantido; continua convertendo pedidos de IDE em jobs |

## O que é novo

`src/hub/universal-hub.js` + rotas `src/api/universal-hub-routes.js` + 3 coleções no estado (migração de esquema **43 → 44**: `aiClients`, `hubMessages`, `hubLocks`).

### 1. Identidade por ferramenta

- Provedores: `CLAUDE_CODE`, `OPENAI_CODEX`, `ANTIGRAVITY`, `FENIX_AGENT`, `USER_MANUAL`, `OLLAMA_AGENT`, `OTHER_LLM`.
- Cada conexão tem token próprio (`fxc_…`), guardado só como hash, revogável, com escopos: `memory:read`, `memory:write`, `messages:read`, `messages:write`, `locks:write` e, opcional, `jobs:submit`.
- A ferramenta age **em nome do dono** (as permissões do papel dele valem), mas a identidade registrada é a da ferramenta: autoria de memórias, remetente de mensagens, dono de travas.
- Presença: `lastSeenAt` gravado no máximo a cada 5 min (para não pesar o store).

### 2. Memória compartilhada

- Gravação vai para o `MemoryEngine` com as tags `hub`, `class:<classe>`, `provider:<ferramenta>`, `validation:<estado>` e `provenance.reference = <FERRAMENTA>:<id da conexão>`.
- Classes: `permanent`, `project_context`, `architecture_decision`, `technical_discovery`, `temporary_task`, `execution_evidence`, `unvalidated_suggestion`.
- Validação: `unvalidated` (sugestão), `evidence` (evidência de execução), `reported` (demais).
- Busca com texto usa o ranking do `MemoryEngine` e exige que o texto combine; sem texto, lista as mais recentes.
- Conversas não são gravadas automaticamente: só o que a ferramenta registra de propósito.

### 3. Protocolo de mensagens

Campos: `message_id`, `sender` (preenchido pelo servidor a partir do token), `receiver` (`FENIX`, `ALL`, um provedor ou uma conexão), `project_id`, `session_id`, `message_type`, `timestamp`, `context_reference`, `payload` (≤ 20 mil caracteres), `requested_action`, `permission_scope`, `correlation_id` (fio da conversa; padrão = o próprio `message_id`).

Tipos: `IDEA QUESTION DISCOVERY TASK_REQUEST TASK_ACCEPTED CODE_PROPOSAL PATCH_READY REVIEW_REQUEST REVIEW_RESULT TEST_RESULT BUG_REPORT DECISION KNOWLEDGE_UPDATE MISSION_COMPLETED BLOCKED`.

Proteções: mensagem idêntica do mesmo remetente em 10 min é unificada (`duplicate: true`); máximo de 30 mensagens por minuto por conexão (contra laço entre IAs); retenção de 500 mensagens por tenant. Nenhuma mensagem é simulada: todas vêm de uma chamada real de uma ferramenta ou do dono.

### 4. Colaboração sem sobrescrever

Travas por arquivo (`projectId` + `path`), com validade de 30 s a 1 h. Outra ferramenta recebe **409** com quem segura a trava e até quando. O dono pode liberar qualquer trava.

### 5. Contexto compacto

`GET /api/v2/hub/context?projectId=…&depth=compact|deep`: decisões, descobertas, sugestões abertas, evidências recentes, caixa de entrada, travas, presença das ferramentas e resumo do runtime (jobs e missões). Compacto ≈ 2–3 KB; `deep` traz o conteúdo completo.

### 6. Segurança e governança

- Ferramenta de IA só acessa `/api/v2/hub/*` e algumas leituras (`/api/v2/jobs` GET, status, project-mirror, memory-index, `/api/me`).
- **Somente humanos**: criar/revogar conexões, aprovar/rejeitar/desfazer jobs, deploy, exclusões e administração (403 `AI_CLIENT_SCOPE`).
- Enviar job exige o escopo `jobs:submit`, desligado por padrão.
- Token inválido ou revogado → 401.

## Rotas

| Método | Rota | Uso |
|---|---|---|
| GET | `/api/v2/hub/me` | Identidade, dono e escopos do token |
| GET/POST | `/api/v2/hub/clients` | Listar / criar conexão (criar: só humano admin) |
| POST | `/api/v2/hub/clients/{id}/revoke` | Revogar (só humano) |
| GET | `/api/v2/hub/context` | Contexto compacto |
| GET/POST | `/api/v2/hub/knowledge` | Buscar / registrar conhecimento |
| GET/POST | `/api/v2/hub/messages` | Caixa de entrada / enviar mensagem |
| GET/POST/DELETE | `/api/v2/hub/locks` | Listar / travar / liberar arquivo |

## Testes (reais)

- `test/universal-hub.test.js` (9, servidor HTTP real): identidade própria; Claude consulta, Codex registra, Antigravity recupera com autoria; tarefa Claude → Codex e resultado no mesmo fio; contexto compacto; trava 409; IA não aprova nem administra; mensagem duplicada unificada e tipo inválido rejeitado; dono vê tudo; **tudo persiste após reiniciar o servidor**; conexão revogada perde acesso.
- `test/universal-hub-mcp.test.js` (3): ferramentas MCP listadas e chamando as rotas reais com o token da ferramenta.
- Prova manual de ponta a ponta (2026-11-11): processo `bin/fenix-mcp.js` real contra o FÊNIX local — 21 ferramentas; registrar e buscar conhecimento; contexto de 2,3 KB; aprovação de job pela IA bloqueada.

## Ainda não feito (próximas fases)

- **Tela** do hub (presença das IAs, mensagens, travas) — entra na Fase 2 junto dos cartões de agente.
- **Evolution Controller**: transformar `BUG_REPORT`/`DISCOVERY` em missões automaticamente, com orçamento por projeto.
- Worker persistente na VPS consumindo `TASK_REQUEST` para o `FENIX_AGENT` (depende de um modelo capaz na API Platform — hoje só há modelos locais ≤ 3 B).
- Isolamento por organização além do tenant (hoje: por tenant e por projeto via `projectId`).