# READY_FOR_REMOTE_AI_PLATFORM

Como a nova VPS do AI Platform se conecta ao FENIX. **Nenhuma mudanca de arquitetura e
necessaria** — o adaptador que o FENIX usa hoje (`src/ai-runtime/aiplatform-provider.js`) ja
fala HTTP com um endereco configuravel. Trocar o endereco basta.

## O contrato que a nova VPS precisa cumprir

Lido de `src/ai-runtime/aiplatform-provider.js`, nao suposto. Tres endpoints, autenticacao por
header `x-api-key`, corpo JSON:

### `GET /v1/health`
Usado por `available()` como pre-checagem. Qualquer 2xx serve.

### `POST /v1/text` — obrigatorio
```json
// requisicao
{ "prompt": "texto", "model": "qwen2.5:1.5b" }   // model e opcional

// resposta esperada
{ "result": { "text": "..." },
  "model": "qwen2.5:1.5b",
  "tokens": { "prompt": 37, "completion": 2 } }
```
O FENIX aceita `res.result.text` **ou** `res.text`. Sem `tokens`, ele estima por
`length / 4` — funciona, mas a telemetria fica aproximada.

### `POST /v1/chat` — obrigatorio para o chat
```json
// requisicao
{ "messages": [ { "role": "user", "content": "oi" } ],
  "temperature": 0.3,
  "format": "json" }        // format so aparece quando o FENIX precisa saida JSON estrita

// resposta esperada
{ "result": { "text": "..." } }   // aceita tambem result.message.content ou res.text
```

Timeout do lado do FENIX: 120 s por chamada (20 s no `available()`).

## Prove ANTES de subir o app: `ops/llm-preflight.js`

Antes existia um vao: para saber se o LLM respondia era preciso subir o FENIX inteiro (que
exige Postgres, Redis, Qdrant, MinIO e Keycloak de pe). Se a config estivesse errada, a
descoberta vinha como restart loop em producao — foi exatamente o que aconteceu nesta limpeza.

O preflight carrega **o mesmo codigo que o app carrega** (`buildProvidersFromEnv` +
`loadRoutes`) e exercita rota -> `available()` -> `complete()` -> `stream()`, sem tocar em
banco nenhum:

```bash
node ops/llm-preflight.js --env .env.production
```

| exit | significado |
|---|---|
| **0** | provider resolvido e **inferencia real medida** |
| **1** | config invalida (rota aponta para provider nao registrado, env faltando) — **e o mesmo erro que derruba o boot, so que antes do deploy** |
| **2** | configurado mas nao respondeu (rede, chave invalida, modelo descarregado) |
| 3 | erro do proprio preflight |

Ele imprime latencia de cada etapa, tokens, o texto gerado, e se o streaming e **progressivo
de verdade** (mede o intervalo entre chunks). Chaves nunca aparecem: so `SET (n chars)` ou
`absent`. O provider `echo` **nunca** conta como sucesso — gera texto, e por isso mesmo e o
falso positivo que o preflight existe para pegar (`exit 2`).

Provado localmente contra o contrato medido do gateway (saida real, gateway de teste na 18099):
```
provider resolvido: aiplatform    available() ok, 34 ms
complete() ok, 4 ms, qwen2.5:1.5b, 11 prompt / 2 completion, texto "OK"
stream() chunks 1, progressivo false -- gateway /v1/text nao suporta stream
veredito ok=true (inferencia real medida)                                   exit 0
```
E no caminho Ollama (NDJSON de teste na 18434): `chunks 3, progressivo true, spread 134 ms`.

Falhas provadas fail-closed: chave errada -> exit 2; endereco morto -> exit 2; provider nao
registrado em producao -> **exit 1** com `rota "default" aponta para provider "aiplatform" que
nao esta registrado`.

## Configuracao no FENIX (3 linhas, 1 restart)

Em `/opt/grg-fenix/source/grg/.env.production`:

```
FENIX_AI_DEFAULT_PROVIDER=aiplatform
FENIX_AI_DEFAULT_MODEL=qwen2.5:1.5b
GRG_AIPLATFORM_URL=https://<nova-vps>            # sem barra no fim
```

A chave **nao** vai no `.env`. Ela e lida de um arquivo de segredo montado no container:
`AI_PROVIDER_KEY_FILE` -> `/run/secrets/ai_provider_key` (modo 0600). O
`ops/container-entrypoint.sh` le esse arquivo e exporta `GRG_AIPLATFORM_KEY` conforme o
provider escolhido. Para trocar a chave: escrever no arquivo de segredo e recriar o container.

Aplicar:
```bash
cd /opt/grg-fenix/source/grg && docker compose --env-file .env.production -f docker-compose.enterprise.yml up -d api
```

### ARMADILHA MEDIDA — nao deixe a URL vazia

`src/app.js:109` recusa subir em producao se uma rota de IA aponta para provider nao
configurado:
```
Error: production AI routes require configured real providers
```
Isso aconteceu de verdade nesta limpeza: esvaziar `GRG_AIPLATFORM_URL` colocou o FENIX em
restart loop e o site em 502 por ~2 minutos. **Mantenha a variavel preenchida.** Enquanto a
nova VPS nao existir, ela aponta para o endereco antigo (morto) e o health reporta
`ai-providers: {"ok": false}` — degradado e honesto, em vez de nao subir.

## Prova de que funcionou (rodar do FENIX, nao do seu laptop)

A ordem importa: os dois primeiros comandos podem passar e o terceiro falhar, porque so ele
testa o caminho que o FENIX realmente usa (de dentro do container, com a chave real).

```bash
# 1. alcance e saude
curl -s -m 10 -H "x-api-key: $KEY" https://<nova-vps>/v1/health

# 2. INFERENCIA real — a unica prova que conta
curl -s -m 60 -X POST https://<nova-vps>/v1/text \
  -H "content-type: application/json" -H "x-api-key: $KEY" \
  -d '{"prompt":"Responda exatamente: OK"}'
# deve devolver result.text = "OK"

# 3. de DENTRO do container do FENIX (rede rootless, chave montada)
su - fenix -c 'export XDG_RUNTIME_DIR=/run/user/$(id -u); export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock;
docker exec grg-fenix-enterprise-api-1 wget -qO- --timeout=10 https://<nova-vps>/v1/health'

# 4. veredito do proprio FENIX
su - fenix -c 'curl -s http://127.0.0.1:4400/health' | grep -o '"ai-providers":{[^}]*}'
# ok:true  -> conectado (available() faz INFERENCIA real, nao ping: nao da falso positivo)
```

O passo 4 e confiavel porque `available()` foi corrigido nesta sessao para fazer uma geracao
minima em vez de `GET /v1/health`. Antes, o health dizia `ok:true` com todos os modelos
descarregados.

## Requisitos da nova VPS (dimensionados pelo que foi medido aqui)

| Recurso | Minimo | Por que |
|---|---|---|
| RAM | 8 GB | `qwen2.5:3b` + `moondream` nao caberam com folga em 5.8 GB — esta VPS ficou com swap em 3.7/4.0 Gi |
| Disco | 40 GB | 4.9 GB de modelos + 3.76 GB (ComfyUI) + 13.8 GB de imagens + banco |
| TLS | obrigatorio | o FENIX chama por HTTPS na internet publica |
| Portas | 443 apenas | **nunca exponha 11434 (Ollama nao tem autenticacao) nem 8188** |

Modelos a re-baixar (`ollama pull`), da lista salva no backup:
`qwen2.5:1.5b` (986 MB), `qwen2.5:3b` (1.9 GB), `nomic-embed-text` (274 MB),
`moondream` (1.7 GB).

## Restauracao do AI Platform na nova VPS

Codigo: `git clone https://github.com/Biel0071/AI-LLM.git` (HEAD conhecido: `bba24e8`)
Backups em `/var/backups/ai-platform-migration-20260729T160538Z/` desta VPS:

```bash
# 1. config e segredos (0600 — contem ANTHROPIC/OPENAI/GEMINI/GROQ/CLOUDFLARE/
#    HUGGINGFACE/OPENROUTER/REPLICATE keys, JWT_SECRET, ADMIN_PASSWORD)
tar xzf ai-platform-config.tar.gz          # revisar .env antes de subir

# 2. banco (contem o cache de rotas e a memoria de aprendizado de provider)
docker compose up -d postgres
docker exec -i <postgres> pg_restore -U aiplatform -d aiplatform --clean < aiplatform-postgres.dump

# 3. redis (opcional — e cache, reconstroi sozinho)
docker cp aiplatform-redis.rdb <redis>:/data/dump.rdb   # antes de iniciar o container

# 4. modelos
docker compose up -d ollama
for m in qwen2.5:1.5b qwen2.5:3b nomic-embed-text moondream; do docker exec <ollama> ollama pull $m; done

# 5. resto
docker compose up -d
```

Confirmar checksums com `sha256sum -c SHA256SUMS` antes de restaurar.

**Atencao aos segredos:** `ai-platform-config.tar.gz` carrega chaves de API reais. Transferir
por canal seguro (`scp`), nunca por e-mail/chat, e considerar rotacionar as chaves depois da
migracao — elas estiveram num arquivo com permissao `rw-rw-rw-` em `/opt/ai-platform/.env`.

## Troca de fonte em uma linha (e rollback em uma linha)

O provider e escolhido **so por env** — nenhuma edicao de codigo. As variaveis reais sao estas;
`LLM_SOURCE`, `AIPLATFORM_BASE_URL` e `AIPLATFORM_API_KEY` **nao existem em `src/`** (0
ocorrencias medidas) e escrever qualquer uma delas seria no-op silencioso.

| fonte | linhas em `.env.production` | chave |
|---|---|---|
| gateway remoto | `FENIX_AI_DEFAULT_PROVIDER=aiplatform` + `GRG_AIPLATFORM_URL=https://<vps>` | `/run/secrets/ai_provider_key` |
| Ollama (loopback) | `FENIX_AI_DEFAULT_PROVIDER=ollama` + `FENIX_ENABLE_OLLAMA=1` + `FENIX_OLLAMA_URL=http://host.containers.internal:11434` | nenhuma |

O `ops/container-entrypoint.sh` foi corrigido nesta sessao: antes ele matava o boot com
`unsupported FENIX_AI_DEFAULT_PROVIDER` para qualquer nome fora de 4 (openai/groq/local/
aiplatform), o que tornava a troca para `ollama` impossivel. Agora aceita tambem `ollama`
(sem chave, por design — mas **exige** `FENIX_OLLAMA_URL`, porque o default `127.0.0.1` dentro
do container e o proprio container), `anthropic` e `gemini`, e falha com mensagem nomeando o
provider quando a chave obrigatoria falta.

Rollback: mantenha o valor anterior comentado na linha de cima e restaure-o.
```
#FENIX_AI_DEFAULT_PROVIDER=aiplatform      <- valor anterior, rollback em 1 linha
FENIX_AI_DEFAULT_PROVIDER=ollama
```
Depois: `docker compose --env-file .env.production -f docker-compose.enterprise.yml up -d api`.
Se preferir rollback de arquivo inteiro, o backup usado no incidente real desta sessao esta em
`/var/backups/ai-platform-migration-20260729T160538Z/fenix-env.production.bak`.

**Sequencia segura, na ordem:** editar o `.env` -> `node ops/llm-preflight.js --env
.env.production` (exit 0) -> so entao `up -d api`. Invertida, a config errada aparece como
restart loop com o site em 502.

## Alternativa: Ollama local em vez de remoto

Se a latencia entre VPS incomodar no chat de voz (aqui a inferencia local era **1.3 s em
loopback**), o FENIX ja suporta Ollama direto — `src/ai-runtime/ollama-provider.js` aceita
`FENIX_OLLAMA_URL` e faz streaming token a token. Instalar Ollama nesta VPS, expor **somente
em loopback** (`127.0.0.1:11434`) e apontar
`FENIX_OLLAMA_URL=http://host.containers.internal:11434` — o alias existe e resolve para
`172.17.0.1` de dentro do container (medido). Custa ~1 GB de RAM com `qwen2.5:1.5b` e nao
exige codigo novo. As duas origens podem coexistir: o AI Router escolhe por evidencia medida.
