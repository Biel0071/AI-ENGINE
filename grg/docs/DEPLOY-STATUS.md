# DEPLOY-STATUS — missao chat de voz ao vivo

Arquivo de retomada. Se a sessao cair, ler daqui e continuar da primeira fase nao concluida.
Nada nesta tabela e declarado sem comando executado e saida observada.

| Fase | Estado | Commit | Evidencia |
|---|---|---|---|
| 0 — Diagnostico | CONCLUIDA | dd13142a | ver "Realidade medida" |
| 1 — Bugs conhecidos | CONCLUIDA (local) | pendente | 9/9 testes verdes em `test/live-chat-stream.test.js` |
| 2 — Ollama provider real | CONCLUIDA (local) | pendente | `available()` faz inferencia real; stream NDJSON com abort |
| 3 — Streaming ao vivo (SSE) | CONCLUIDA (local) | pendente | 8/8 em `test/live-chat-sse.test.js`; progressividade medida por timing |
| 4 — Persistencia | CONCLUIDA (local) | pendente | 9/9 em `test/conversation-store.test.js`; schema v33 aditivo |
| 5 — Voz (4 modos) | PENDENTE | | |
| 6 — Mobile/tablet/web | PENDENTE | | |
| 7 — Merge e deploy | PENDENTE | | |
| 8 — Inventario de capacidades | EM ANDAMENTO | | workflow paralelo |

## Realidade medida na Fase 0 (2026-07-29)

URL real do sistema: **https://fenix.209-50-241-22.sslip.io** (nao havia URL documentada).

- `main` = `dd13142a`, tree limpo, schema v32.
- Health: `{"ok":true,"status":"ready"}`, 7/7 checks.
- 8 containers FENIX up (rootless, usuario `fenix`); postgres/redis/qdrant/minio `healthy`.
- Host: 5.8Gi RAM total, **1.3Gi livre, swap 3.7/4.0Gi** — pressao de memoria real.
- TLS: Let's Encrypt valido (`ssl_verify=0`), expira 2026-10-25. `getUserMedia` viavel.
- OpenResty ja tem `10_grg_fenix.conf` com `proxy_buffering off` e `proxy_read_timeout 300s`.

### Divergencias entre o briefing e a realidade (o briefing estava errado nestes pontos)

1. **Nao existe container `ollama` no stack do FENIX.** O Ollama vive no stack `ai-platform`,
   sob root, na rede `ai-platform_default` (172.19.0.5). Provado:
   `wget http://ollama:11434` -> `bad address`; `wget http://172.17.0.1:11434` -> `refused`.
   O caminho real e `AIPlatformProvider` -> `http://209.50.241.22:3000/v1/text` (x-api-key).
   Inferencia medida: `qwen2.5:1.5b`, 1.3s, 39 tokens, `result.text = "OK"`.
2. **Porta 11434 ja esta fechada.** Nao exposta no host, ausente do firewall. Nada a fazer.
3. **HTTPS ja existe** (ver acima) — o bloqueio que eu havia anunciado nao procede.
4. **`ai-providers: ok` era falso positivo**: `available()` fazia `GET /v1/health` (ping), que
   responde 200 com todos os modelos descarregados. Corrigido para inferencia real.
5. `ops/healthcheck.sh` **ja e** fail-closed (`curl --fail` + `set -eu`). O script que reportava
   "DEPLOY OK" com `ok:false` era ad-hoc da sessao anterior, nao o do repo. Gap real:
   `upgrade.sh` nao arma rollback automatico.

Modelos disponiveis: `qwen2.5:1.5b` (986MB), `qwen2.5:3b` (1.9GB), `nomic-embed-text`
(embeddings — serve a Fase 4), `moondream` (visao). Escolha para voz: **`qwen2.5:1.5b`**,
porque com 1.3Gi livres e swap saturado a latencia manda mais que a qualidade.

## Fase 1 — o que foi corrigido, e o que era falso alarme

- **1.3 git no container**: confirmado `NO_GIT` (`git: not found`). `apk add git` no Dockerfile.
- **1.2 probe do qdrant**: a causa nao era o healthcheck do compose (TCP, passa). Era
  `QdrantVectorStore.health()` sem retry + teto **global** de 2s no `HealthRegistry`. Um retry
  sozinho seria inutil: o `Promise.race` cortaria antes da 2a tentativa. Corrigido nos dois
  lugares — retry 2s/4s + `timeoutMs` por probe (15s para o vector-store).
- **1.1 health-gate**: ver divergencia 5.

### Dois bugs de producao que os testes encontraram (nao estavam no briefing)

- `req.destroy()` dentro de um handler `res.on('data')` nao garante `end` nem `error`: a
  promise do stream ficava **pendente para sempre**. Em producao: request pendurada por
  conexao interrompida, vazando handles a cada "interromper" que o usuario aperta. Agora o
  abort resolve no proprio listener.
- Com `signal` ja abortado, a request era criada e destruida em seguida, emitindo
  `ECONNRESET` e gastando uma conexao com o Ollama para nada — justamente no caso mais
  comum (cancelar antes do primeiro token). Agora nenhum socket e aberto.

## Pronto para conectar com a API — provado sem subir o app (2026-07-29)

Objetivo: deixar a camada de conexao com LLM real, configuravel so por env e **provada antes
do deploy**. Quatro lacunas fechadas, todas no codigo — nenhuma dependia de VPS nova.

### 1. `ops/llm-preflight.js` (novo) — prova sem Postgres/Keycloak

Antes, a unica forma de saber se o LLM respondia era subir o FENIX inteiro. Config errada
aparecia como restart loop em producao — foi o que aconteceu nesta sessao (~2 min de 502).
O preflight carrega o **mesmo** `buildProvidersFromEnv` + `loadRoutes` do app e exercita
rota -> `available()` -> `complete()` -> `stream()`, sem tocar banco.

Exit codes fail-closed, todos provados com servidor de teste local:

| cenario | exit | saida medida |
|---|---|---|
| gateway ok (contrato `/v1/text`) | **0** | `available 34ms`, `complete 4ms`, `11/2 tokens`, texto `"OK"` |
| Ollama NDJSON | **0** | `chunks 3, progressivo true, spread 134ms` |
| chave errada, gateway de pe | **2** | `estagio available` |
| endereco morto | **2** | `estagio available` |
| provider nao registrado (producao) | **1** | `rota "default" aponta para provider "aiplatform" que nao esta registrado` |
| nenhum env (cai no echo) | **2** | `provider echo responde deterministicamente: nao ha LLM real` |

O exit 1 e **o mesmo erro de `app.js:109` que derruba o boot**, so que antes do deploy.
O `echo` gera texto e passaria por "geracao real": e o falso positivo que este script existe
para pegar, e por isso `verdict.ok=false` acompanha o exit 2. Chaves nunca sao impressas —
so `SET (n chars)` / `absent`, com teste dedicado provando que o relatorio nao vaza o valor.

### 2. Bug silencioso no registry (corrigido)

`buildProvidersFromEnv(env)` ignorava `env.FENIX_OLLAMA_URL`: o `DEFAULT_BASE_URL` do
`OllamaProvider` e resolvido de `process.env` **no require do modulo**. Um env injetado
(teste, preflight) criava provider apontando para outro endereco, sem erro nenhum. Agora
`baseUrl` e passado explicitamente. Regressao coberta: o teste afirma
`report.provider.baseUrl === http://127.0.0.1:<porta do servidor de teste>`.

### 3. `ops/container-entrypoint.sh` bloqueava a troca de provider (corrigido)

O `case` matava o boot com `unsupported FENIX_AI_DEFAULT_PROVIDER` para qualquer nome fora de
4 — incluindo `ollama`, justamente o caminho **sem chave**. A "troca em uma linha" era
impossivel. Agora: `ollama` aceito sem chave mas exigindo `FENIX_OLLAMA_URL` (dentro do
container `127.0.0.1` e o proprio container, onde nao ha Ollama); `anthropic` e `gemini`
adicionados; chave obrigatoria falha nomeando o provider. `sh -n` limpo, 6 cenarios provados.

### 4. Documentacao das variaveis REAIS

`.env.example` nao tinha `FENIX_ENABLE_OLLAMA`, `FENIX_OLLAMA_URL`, `GRG_AIPLATFORM_MODEL`
nem `GRG_OLLAMA_DIRECT_URL`. Agora tem, com a armadilha do `app.js:109` escrita ao lado.
`docs/READY_FOR_REMOTE_AI_PLATFORM.md` ganhou a tabela de troca/rollback em uma linha.

### Verificacao

- `test/llm-preflight.test.js` (novo): **9/9**.
- Provider/gateway/chat/stream: **6 arquivos, 6/6**.
- Suite completa: **72 arquivos, 67 pass, 5 fail**. As 5 sao **pre-existentes**, provado por
  isolamento: revertendo a mudanca do registry elas falham igual. Causas alheias a esta
  missao — `cognitiveCouncil.assignSeat is not a function` (metodo inexistente),
  `ERR_TAP_LEXER_ERROR` do lexer TAP do Node 18 com non-ASCII (`chat.test.js`,
  `keos-uios-coverage`), e assercoes em `omega-infinity-coverage` / `v61-operation-genesis`.
- `simulation-audit`: **0 sinais falsos** nos 4 arquivos de producao.

### Nao verificado (nomeado, nao resolvido)

- **Nenhuma inferencia contra LLM real** nesta rodada: o contrato foi exercitado contra
  servidores locais que falam o protocolo medido. A prova com modelo de verdade exige uma
  origem de LLM, que **esta VPS nao tem** desde a remocao do AI Platform.
- **Nada do estado de uma VPS-B** — nao existe (medido: so `eth0`, `wg` ausente).
- **Streaming pelo gateway degrada** para uma emissao unica: `/v1/text` nao faz stream. Para
  chat de voz progressivo e preciso `GRG_OLLAMA_DIRECT_URL`. O preflight reporta isso em
  `NAO VERIFICADO`, nao finge progressividade.
- **Chat de voz (schema v33) segue nao deployado**: producao roda `1.0.0-rc.7` no v32.

## Uniao das duas VPS: FENIX (.22) -> AI-PLATFORM (.215) — CONECTADO (2026-07-29)

Primeira vez que o FENIX aponta para um endereco de LLM **vivo** desde a remocao do AI Platform.
Camada de LLM apenas; o app FENIX inteiro nao foi subido (schema v33 e outra missao).

### Pre-requisitos: confirmados por medicao, nao por confianca

- `.215` de pe com **7 containers healthy**, reboot real (`up 2 min`, `uptime: 30` no health).
- Exposicao correta: **so a 3000** na interface publica. Postgres (5433), Redis (6380) e
  dashboard (8080) em **127.0.0.1**; Ollama (11434) e ComfyUI (8188) **sem publicacao**.
- Origem `.22` autorizada: TCP 3000 abre da `.22` e `GET /v1/health` -> 200 em 5.8 ms.
- 4 modelos restaurados: `qwen2.5:1.5b`, `qwen2.5:3b`, `nomic-embed-text`, `moondream`.

### Bloqueio encontrado e resolvido: chave de API

Primeira tentativa de `/v1/text` da `.22`: **401 `INVALID_API_KEY`**. A rede estava liberada
(health 200); a chave e que era do gateway antigo, morto com o AI Platform removido. A `.215` e
instalacao nova, banco novo, tabela `ApiKey` com **1 chave `default` ativa** criada 17:09.

Diagnosticado comparando **hashes**, sem imprimir valor: `.22` = `ap_2c7…`/`e82816f5…` vs
`.215` = `ap_0c2…`/`284dbbf2…`. Chaves distintas, mesmo tamanho (51 bytes) — dai o 401.
A chave da `.215` foi instalada em `/opt/grg-fenix/secrets/ai_provider_key` com
`install -o fenix -g fenix -m 600` (dono/modo preservados: o container le como `fenix`),
e o arquivo temporario destruido com `shred`. **Nenhum valor de chave foi ecoado em momento
algum** — so prefixo de 6 chars, tamanho e sha256 truncado.

Backup antes de qualquer escrita: `/var/backups/fenix-llm-switch-20260729T184326Z/` (0700,
com `SHA256SUMS`) contendo `ai_provider_key.bak` e `.env.production.bak`.

### FASE 1 — latencia medida (prompts ineditos, `cached:false`)

| caminho | req 1 | req 2 | req 3 |
|---|---|---|---|
| baseline interno `.215 -> .215` | 6.59 s (carga do modelo) | 0.93 s | 0.97 s |
| **`.22 -> .215` (internet)** | **1.19 s** | **0.84 s** | **0.80 s** |

**O custo de rede entre as VPS e praticamente nulo** — o RTT desaparece dentro do tempo do
modelo (as duas ficam no mesmo datacenter). E **mais rapido que o 1.3 s que a VPS antiga fazia
em loopback**. A premissa de que sair para a rede penalizaria o chat de voz nao se confirmou.

### FASE 2 — endereco trocado, rollback em uma linha

```
# ANTES: GRG_AIPLATFORM_URL=http://209.50.241.22:3000   (rollback: gateway antigo, morto)
GRG_AIPLATFORM_URL=http://209.50.241.215:3000
```
`FENIX_AI_DEFAULT_PROVIDER=aiplatform` mantido (nao houve troca de provider, so de endereco).
`.env.production` segue `mode=600 owner=fenix`.

`FENIX_AI_DEFAULT_MODEL=qwen2.5:1.5b` foi **verificado** contra a `.215`, nao assumido: pedido
explicitamente, respondeu 200 em 4.02 s com `model: qwen2.5:1.5b`. (Sem `model` no payload o
gateway escolhe `3b` — por isso a checagem.)

### FASE 3 — preflight contra o gateway REAL (exit 0)

```
provider resolvido  aiplatform      baseUrl http://209.50.241.215:3000
GRG_AIPLATFORM_KEY  SET (51 chars)          <- valor nunca impresso
available()  ok, 3385 ms  (inferencia real: carregou o modelo)
complete()   ok,   10 ms  model qwen2.5:1.5b, 37 prompt / 11 completion
             texto "OK, como posso ajudar voce hoje?"   <- geracao do modelo, nao deterministica
veredito     ok=true, inferencia real medida                              exit 0
```
Dupla sondagem, 20 s de intervalo: **exit 0 nas duas**.

**Achado no meio do caminho:** o primeiro preflight passou exit 0 com `stream() suportado
false`, o que expos que a `.22` rodava a versao **antiga** do `aiplatform-provider.js` — com
`available()` por **ping em `/v1/health`**, o falso positivo corrigido nesta sessao. Aquele
exit 0 teria vindo mesmo com todos os modelos descarregados; o que salvou a prova foi o
`complete()`. Os arquivos corrigidos foram enviados (`aiplatform-provider.js`,
`ollama-stream.js`, `ollama-provider.js`, `provider-registry.js`, `ops/llm-preflight.js`) e o
preflight repetido — agora as duas etapas dependem de inferencia real.

### FASE 4 — degradacao conhecida: streaming (DECISAO DO DONO, nao tomada aqui)

Medido: `stream() chunks 1, progressivo false`, motivo `gateway /v1/text nao suporta stream;
GRG_OLLAMA_DIRECT_URL ausente`. O chat funciona; a resposta chega **inteira de uma vez**, sem
efeito token a token. Duas saidas — **nao escolhi**:

- **Aceitar por ora**: conversa funciona, sem progressividade. Custo zero, nenhuma mudanca.
- **Exigir streaming**: precisa de `GRG_OLLAMA_DIRECT_URL` apontando ao Ollama da `.215`, o
  que exige **autorizar a 11434 para a `.22` no firewall** — decisao de rede que e sua.
  Ressalva de seguranca: **Ollama nao tem autenticacao**, entao a regra teria de ser restrita
  a origem `.22` por IP, nunca aberta.

### Aceites (todos verdes)

| criterio | resultado |
|---|---|
| `.22 -> .215:3000 /v1/text` | **200** |
| `node ops/llm-preflight.js --env .env.production` | **exit 0** (2 sondagens) |
| rollback em uma linha | **provado**: revertido -> veredito `ok=false` estagio `available`; restaurado -> exit 0 |
| `.215:3000` de IP nao autorizado (meu PC) | **000** em 2 sondagens, e **000** no POST; controle `https://.215` = **200** (host vivo, e a regra que barra) |

### O que falta para subir o app FENIX inteiro (levantado, NAO resolvido)

1. **Schema v33 nao deployado**: producao roda `grg/fenix:1.0.0-rc.7` no **v32**. As
   colecoes `conversations`, `messages`, `chatPreferences` sao aditivas, mas exigem build de
   imagem nova + migracao + health-gate com rollback armado.
2. **Codigo desta sessao nao esta em imagem**: os 5 arquivos foram copiados para o **fonte** da
   `.22`; o container roda a imagem `rc.7`, que **nao os contem**. Enquanto nao houver rebuild,
   o app em execucao ainda tem o `available()` por ping.
3. **`ops/container-entrypoint.sh` corrigido tambem nao esta na imagem** — necessario para
   trocar para `ollama` sem quebrar o boot.
4. Fases 5 (4 modos de voz), 6 (PWA/mobile) e 7 (merge+deploy) da missao de voz seguem abertas.
5. Pendencias herdadas: 191 sinais falsos / 13 modulos simulados em `main` (SANEAMENTO-MAIN
   nunca autorizado); `ExternalSearchService` fabrica resultado de busca (`app.js:403` passa
   `searchClient` que o construtor em `external-search.js:4` descarta).

### NAO VERIFICADO — nomeado

- **O app FENIX nao foi subido** (regra 3 do comando): nenhuma prova de que o *chat* funciona
  ponta a ponta pela UI. O que esta provado e a **camada de LLM**, pelo mesmo codigo que o app
  carrega.
- **Nenhum teste de carga nem de estabilidade prolongada**: as medicoes sao de 3 requisicoes
  por caminho, minutos apos o boot da `.215`. Nao sei o comportamento sob concorrencia.
- **Persistencia da regra de firewall a reboot da `.215`**: o reboot foi testado antes desta
  sessao (relatado), nao por mim agora.
- **`quality.score: 100` vindo do gateway** e metrica do AI Platform, nao do FENIX: nao
  auditei como e calculada. `method: deterministic` sugere heuristica, nao avaliacao de modelo.
- **`memory.learned: true`** indica que a `.215` acumula estado de roteamento. Nao inspecionei.
- **Trafego `.22 -> .215` e HTTP puro pela internet publica**, autorizado por IP. A chave de
  API viaja em header **sem TLS**. Nao ha rede privada entre as VPS. Recomendo TLS ou tunel
  antes de tratar isso como definitivo — levantado, nao resolvido.

### ACHADO CRITICO no fechamento: o container em execucao nao tem o env

Medido dentro do `grg-fenix-enterprise-api-1` (imagem `grg/fenix:1.0.0-rc.7`):

```
url=            (GRG_AIPLATFORM_URL vazio)
key_len=0       (GRG_AIPLATFORM_KEY ausente)
```

O container subiu **antes** destas edicoes e carrega o env do momento do boot. Editar
`.env.production` e o arquivo de segredo **nao afeta um container ja em execucao** — o
`ai-providers: {"ok": false}` no health e honesto e coerente: *aquele processo* nao tem
provider, mesmo com o arquivo correto no disco.

Consequencia: **a uniao esta provada na camada de LLM, mas nao esta ativa no app.** O que falta
e uma unica acao — recriar o container para que ele leia o env novo:

```bash
cd /opt/grg-fenix/source/grg && docker compose --env-file .env.production -f docker-compose.enterprise.yml up -d api
```

**Nao executei**: recriar o container e subir o app, o que a regra 3 desta missao proibe
("Nao subir o app FENIX inteiro"). Fica como a primeira acao da proxima missao, e ela deve vir
acompanhada de rebuild da imagem — porque o `rc.7` **nao contem** os 5 arquivos corrigidos
(o `available()` dela ainda e o ping que da falso positivo).

## UNIAO ATIVA — rc.9 em producao, `ai-providers: ok:true` por inferencia real (2026-07-29)

Escopo executado: **ativar a uniao**. O schema v33 (chat de voz) **nao** foi migrado — decisao
tomada apos medir que o v33 exige **13 arquivos**, incluindo o kernel de estado
(`state-migrations`, `store`, `retention`, `app.js`, `server.js`), nao os 5 de LLM. Producao
segue no **v32**.

### Duas premissas do comando corrigidas antes de agir

- **Nao existe `tsc` neste build.** Sem `tsconfig.json`, sem TypeScript no `package.json`; o
  Dockerfile faz `npm ci` + `COPY src`. "Erro de tipo aparece no build" nao se aplica — **o
  build nao valida nada**. Por isso escrevi `ops/import-closure.js`: varre todo require
  relativo alcancavel de `src/server.js` e `src/app.js`, resolve contra o disco, exit 1 se
  algum nao tem destino. Provado nos dois sentidos (require quebrado plantado -> exit 1
  nomeando; integro -> exit 0, **166 modulos, 0 pendencias**). Dois falsos positivos iniciais
  eram codigo que a Software Factory **emite como texto** (`software-factory.js:191` e `:223`,
  template literal aninhado) — o parser agora rastreia `${...}` com pilha.
- **Nao havia endereco HTTPS documentado.** A unica mencao a `https://.215` no DEPLOY-STATUS
  era o *controle* da porta 443. Confirmei antes de recriar, como o comando pediu.

### O TLS foi concluido DURANTE esta sessao (pela .215) e mudou o endereco

Meio da execucao, a `.215:3000` parou de responder — **inclusive para o host da `.22`**, que
funcionava minutos antes. Nao era minha mudanca: outra sessao subiu `ai-platform-caddy` e
recriou a api, movendo a exposicao de `209.50.241.215:3000` para **`127.0.0.1:3000`**.

Caddyfile medido: `209-50-241-215.sslip.io:8443`, TLS com cert proprio, `@allowed remote_ip
209.50.241.22 127.0.0.1` -> `reverse_proxy 127.0.0.1:3000`, resto **403**. Isso resolve o
"HTTP puro pela internet" que eu havia levantado como pendencia. Endereco novo aplicado:

```
# ANTES: GRG_AIPLATFORM_URL=http://209.50.241.215:3000   (rollback: HTTP direto, agora so loopback na .215)
GRG_AIPLATFORM_URL=https://209-50-241-215.sslip.io:8443
```
Preflight sobre TLS: **exit 0**, `available` 76 ms, `complete` 21 ms, 37/11 tokens.

### Rebuild e ativacao

`rc.8` construida e **validada antes de recriar**: `git 2.49.1` presente (mata o
`git: not found` do repo-intel), `available()` por inferencia, `stream()`, registry corrigido,
entrypoint aceitando `ollama`, e `require('./src/app.js')` carrega sem crash.

Container recriado. **Env DENTRO do processo em execucao** (lido de `/proc/<pid do node>/environ`):
```
GRG_AIPLATFORM_URL=https://209-50-241-215.sslip.io:8443
GRG_AIPLATFORM_KEY_len=51
```
Cuidado de metodo: `docker exec printenv` mostrou `key_len=0` e **isso era artefato** — o exec
cria processo novo que nao herda os exports do entrypoint. O processo do node (PID 1) tem a
chave. Confirmado por inferencia real **de dentro do container** pelo endpoint TLS:
`executionTime: 763 ms`, `cached:false`, texto `"OK"` — primeira prova do caminho completo
container -> TLS -> gateway -> Ollama -> modelo.

Health: `ai-providers.ok: **true**` (era `false`), dupla sondagem, e **true tambem apos
`restart`**. `/health`, `/app`, `/login` em 200.

### BUG DE PRODUCAO ENCONTRADO PELA CARGA (corrigido, rc.9)

A Fase 6 revelou o achado mais importante. Com 5 simultaneas, o gateway respondeu **HTTP 202**
com `{jobId, queue:{queue:"text", concurrency:4}}` em vez de gerar — **fila assincrona acima
de 4 concorrentes**:

| | req1 | req2 | req3 | req4 | req5 |
|---|---|---|---|---|---|
| status | 200 | 200 | **202** | **202** | 200 |
| tempo | 1.24 s | 3.36 s | 0.11 s | 0.10 s | 4.89 s |

Sequencial (baseline TLS): **1.07–1.12 s**, `executionTime` 1028–1077 ms.

O 202 passava pelo teste `statusCode >= 200 && < 300` e `res.result` vinha `undefined`, entao
`complete()` devolvia **texto vazio em silencio**. Em uso multi-conversa o chat responderia
**em branco**, sem erro — exatamente o falso positivo que a regra REALITY FIRST proibe.

Corrigido: `assertNotEnqueued()` falha alto nomeando `jobId`, fila e concorrencia, em
`complete()` e `chat()`; `available()` passa a devolver `false` para 202 (fila nao e geracao).
**Nao** implementei polling do `jobId`: nao medi o endpoint de consulta, e escrever cliente
para contrato nao observado seria suposicao. Fica nomeado. Testes: `aiplatform` **8/8**
(2 novos, com o 202 medido como fixture), `llm-preflight` **9/9**.

### Chat provado ponta a ponta (pelo mesmo caminho de `POST /api/chat`)

`POST /api/chat` exige sessao OIDC (401 sem auth — rota existe e protege). Sem navegador,
exercitei o **mesmo** codigo que a rota chama, dentro do container:
```
llmSource: aiplatform:https://209-50-241-215.sslip.io:8443
llm: true   latencia 13.9 s (1a) / 5.3 s
reply: "O FENIX e meu nome e eu sou o cerebro da plataforma GRG, nao um assistente de chatbot tradicional."
```
Latencia do chat e ~5–14 s, nao os ~1 s do `/v1/text`, porque o `ChatAgent` faz **multiplas**
chamadas ao LLM (classificacao de intencao + resposta) com prompt maior. Numero honesto para
expectativa de UX.

### Rollback armado (uma linha cada)

`FENIX_VERSION=1.0.0-rc.8` (ou `rc.7`, anterior a uniao) e `GRG_AIPLATFORM_URL` anterior, ambos
comentados no `.env`. Imagens `rc.9/rc.8/rc.7/rc.6` preservadas. Backups:
`/var/backups/fenix-llm-activate-20260729T190923Z/` (0700, SHA256SUMS) com Dockerfile,
entrypoint, `.env.production` (pre e pos-TLS) e o segredo.

### NAO VERIFICADO — nomeado

- **Prova pela UI no navegador/celular NAO foi executada por mim** — nao tenho navegador. O que
  esta provado e o caminho de codigo que a UI usa. **Roteiro para voce validar** esta abaixo.
- **Os 4 modos de voz nao existem**: Fases 5 e 6 da missao de voz (modos + PWA) nunca foram
  implementadas. `public/app.js` tem apenas `micBtn`/`SpeechRecognition` antigos. Nao ha o que
  conferir na UI.
- **Chat de voz (v33) nao deployado**: producao no v32.
- **Polling de `jobId`**: nao implementado nem medido. Acima de 4 conversas simultaneas o
  provider **falha alto** em vez de enfileirar — melhor que branco, mas nao e suporte a fila.
- **Carga acima de 5 simultaneas** e comportamento sustentado nao medidos.
- **Persistencia do Caddy/TLS a reboot da `.215`** nao testada por mim (a `.215` mudou sozinha
  durante esta sessao, o que mostra que ha trabalho concorrente ali).
- **`quality.score: 100`** (metrica do gateway, `method: deterministic`) e **`memory.learned`**
  nao auditados.
- As **5 falhas de teste pre-existentes** seguem: `cognitiveCouncil.assignSeat` inexistente,
  lexer TAP do Node 18 com non-ASCII, assercoes em `omega-infinity` / `v61-genesis`.

### Roteiro para VOCE provar pela UI (2 minutos, no celular)

1. Abra `https://fenix.209-50-241-22.sslip.io/login` e entre.
2. Va em `/app`, mande **"o que voce e?"** no chat.
3. **Esperado:** resposta em 5–15 s, em texto livre (nao script fixo). Sinal de que veio da
   `.215`: a resposta varia entre tentativas.
4. **Se responder vazio ou em branco:** foi fila (>4 concorrentes) — a rc.9 agora falha com
   mensagem em vez de branco; me mande o texto do erro.
5. Voz: o botao de microfone existe (Web Speech API do navegador), mas **os 4 modos nao foram
   implementados** — nao os procure.
