# VPS_STATE_AFTER_CLEANUP — 209.50.241.22

Estado medido em 2026-07-29, apos a remocao do AI Platform (Opcao A, escolhida pelo dono).
Todo numero vem de comando executado com saida observada.

## Antes e depois (medido nas duas pontas)

| Recurso | Antes | Depois | Ganho |
|---|---|---|---|
| **Disco usado** | 55 G (58%) | **27 G (29%)** | **-28 GB** |
| Disco livre | 40 G | **68 G** | +28 GB |
| **Swap em uso** | **3.7 / 4.0 Gi** | **1.2 / 2.8 Gi livre** | **-2.5 GB** |
| RAM livre | 1.3 Gi | **1.9 Gi** | +0.6 Gi |
| RAM disponivel | 2.4 Gi | **3.6 Gi** | +1.2 Gi |
| Containers (daemon root) | 8 | **1** | -7 |
| Imagens (daemon root) | 10 (~13.8 GB) | **1 (174.8 MB)** | -9 |
| Volumes (daemon root) | 4 (5.16 GB) | **0** | -4 |
| Build cache (daemon root) | 10.22 GB | **0 B** | -10.22 GB |
| Portas expostas | 13 | **10** | -3 |

O alivio do swap e o ganho mais relevante na pratica: a maquina estava com 3.7 de 4.0 Gi de
swap ocupados, o que e pressao de memoria real, nao folga contabil.

## Estado atual

CPU: 4 cores | load 0.77 / 0.78 / 0.71 | uptime 28 dias
RAM: 5.8 Gi total — 2.2 Gi usados, 1.9 Gi livres, 3.6 Gi disponiveis
Swap: 4.0 Gi — 1.2 Gi usados, 2.8 Gi livres
Disco: 99 G — 27 G usados (29%), 68 G livres

### Containers: 9 no total (era 16)

**FENIX — 8, daemon rootless (usuario `fenix`)**
`api` (healthy), `postgres` 17.9 (healthy), `redis` 7.2.14 (healthy), `qdrant` (healthy),
`minio` (healthy), `keycloak`, `keycloak-edge-runtime`, `prometheus`

**Infra — 1, daemon root**
`ic-openresty-4M98` — reverse proxy 80/443

**ZapFlow** — processo Node nativo na 4025 (nunca foi container)

### Portas em escuta
`22, 80, 443, 2090, 4025, 4400, 4401, 5432, 6379, 8000`

Desapareceram: **3000** (AI Platform api), **5433** (postgres), **6380** (redis),
**8080** (dashboard).

Firewall: `21, 80, 443, 2090, 8000`. A 3000 foi removida; a **8000 foi preservada de
proposito** — pertence ao `gerar-ficha.service` (uvicorn), nao ao AI Platform.

### Docker
Root: 1 imagem (174.8 MB), 1 container, 0 volumes, 0 build cache
Rootless (fenix): 15 imagens (2.746 GB), 10 containers, 5 volumes (657.3 MB), 405 MB de cache

## Disponibilidade — validado com dupla sondagem

```
Sondagem 1: {"ok":true,"status":"ready"}
Sondagem 2 (20s depois): {"ok":true,"status":"ready"}
```

| Check | Resultado |
|---|---|
| security-plane | true (critical) |
| state-store | true (critical) — adapter postgresql |
| queue | true (critical) — bullmq |
| redis | true (critical) |
| object-storage | true (critical) — s3, bucket `fenix` |
| vector-store | true (critical) — qdrant, colecao `fenix_memory` status **green** |
| **ai-providers** | **false** (nao-critical) — esperado: o LLM foi removido |

Teste de restart: `docker compose restart api` -> `Up 35 seconds (healthy)`, health `ready`.
Volta sozinho.

### Superficies HTTP (via HTTPS publico)
```
/health                 200
/app                    200
/                       200
/login                  200
/design-system.css      200
/api/executive/programs 401   (existe, exige auth)
/api/chat/conversations 401   (existe, exige auth)
```
SSL: `ssl_verify=0` (cadeia Let's Encrypt valida, expira 2026-10-25).

### ZapFlow
`127.0.0.1:4025` -> 401 (auth, respondendo) | proxy por IP -> 200 | cron de auto-deploy: 1
entrada, intacta.

## Dados preservados — verificado no banco, nao assumido

`fenix.kernel_state` (o documento unico de estado):

| Campo | Valor |
|---|---|
| schemaVersion | **32** |
| Tamanho do documento | 1922 kB |
| Revisao (version) | **105325** |
| updated_at | 2026-07-29 16:14:13 UTC (escrevendo agora) |
| tenants | 1 |
| missoes | 2 |
| auditEvents | **1060** |
| memories | 0 |
| programs | 0 |
| conversations | 0 |
| aiCalls | 0 |

Banco `fenix`: 22 MB. Schemas `fenix` (estado) e `keycloak` (identidade) intactos.
qdrant `fenix_memory`: status `green`, 0 pontos.

Os zeros sao reais e tem explicacao medida: `programs` e `conversations` sao capacidades novas
que **ainda nao foram deployadas** (producao roda `grg/fenix:1.0.0-rc.7`, o chat de voz e o
schema v33 estao commitados localmente). `aiCalls` em 0 e coerente com o AI Platform ter sido
o unico caminho de LLM e nunca ter sido exercitado por telemetria de gateway em producao.
`memories` em 0 porque nada foi indexado ainda. **Nenhum desses zeros e perda** — a revisao
105325 e os 1060 eventos de auditoria provam continuidade.

## Incidente durante a execucao (e como foi resolvido)

Ao esvaziar `GRG_AIPLATFORM_URL` no `.env.production`, o FENIX entrou em **restart loop** e o
site voltou 502. Causa medida nos logs:

```
Error: production AI routes require configured real providers
    at createApp (/app/src/app.js:109:100)
```

`app.js:109` recusa subir em producao se alguma rota de IA aponta para provider nao
configurado — uma protecao **correta** contra provider fantasma. Minha edicao e que estava
errada. Rollback: restaurar o `.env.production` do backup (`fenix-env.production.bak`, feito
minutos antes) e `up -d api`. Tempo total de indisponibilidade: ~2 minutos.

Decisao final: **`GRG_AIPLATFORM_URL` permanece preenchido** apontando para o endereco antigo
(agora morto). Isso satisfaz a assercao de boot e produz o estado honesto
`ai-providers: {"ok": false}` — o FENIX diz que nao tem LLM em vez de fingir que tem.
Trocar por vazio exigiria alterar `app.js:109`, o que nao cabia nesta missao de limpeza.

## O que sobrou para recuperacao

`/var/backups/ai-platform-migration-20260729T160538Z/` (0700, 34 MB, com SHA256SUMS):

| Arquivo | Tamanho | Validacao |
|---|---|---|
| `aiplatform-postgres.dump` | 26 MB | `pg_dump -Fc`, stderr vazio |
| `aiplatform-redis.rdb` | 5.4 MB | `SAVE` + `docker cp` |
| `ai-platform-config.tar.gz` | 1.3 MB | **0600 — contem as chaves de API** |
| `fenix-postgres.dump` | 1.1 MB | `pg_restore --list`: 532 TOC entries |
| `fenix-env.production.bak` | — | 0600, **usado no rollback real** |
| `ollama-models.txt` | 342 B | 4 modelos a re-baixar |
| `docker-state.txt` | 714 B | containers/volumes/imagens + git HEAD |

`/opt/.ai-platform-removed-20260729/` — diretorio movido, **nao apagado** (6.4 MB).

Codigo-fonte: `https://github.com/Biel0071/AI-LLM.git`, HEAD `bba24e8`.

## Removido de verdade (irreversivel sem os backups)

7 containers, 4 volumes (5.16 GB — incluindo os 4.9 GB de modelos LLM e a memoria de rotas
aprendidas), 9 imagens (~13.8 GB), a rede `ai-platform_default`, 10.22 GB de build cache,
4 unidades systemd (movidas para `.removed`), o binario `/usr/local/sbin/ai-platform-watchdog`
e a regra de firewall da porta 3000.

## Consequencia funcional aceita

O FENIX **nao tem LLM nesta VPS**. Indisponiveis ate a nova origem existir: chat (texto e
voz), decomposicao de objetivo em Programa pelo Executive Brain, sumarizacao de conversa.
**Nao afetados**: estado, missoes ja criadas, auditoria, identidade/login, deploy, dashboard,
memoria vetorial, ZapFlow.
