# CURRENT_DEPLOY_MAP — VPS 209.50.241.22

Auditoria executada em 2026-07-29. Tudo abaixo vem de comando rodado na VPS com saida
observada. Nada inferido, nada assumido.

Host: AlmaLinux 9.7 | 5.8Gi RAM (1.3Gi livre, **swap 3.7/4.0Gi**) | 99G disco, 59% usado
Uptime: 28 dias | load 0.34

## Fato central: existem TRES sistemas independentes nesta VPS

| Sistema | Docker daemon | Origem | Estado |
|---|---|---|---|
| **FENIX** | rootless, usuario `fenix` | `/opt/grg-fenix/source/grg/docker-compose.enterprise.yml` | 8 containers up |
| **ZapFlow / zapai** | nenhum (processo Node nativo) | `/opt/zapai`, porta 4025 | up |
| **AI Platform** | root | `/opt/ai-platform/docker-compose.yml` | 7 containers up |

Os dois daemons Docker sao separados: as redes do FENIX nao existem para o daemon root e
vice-versa. Isso ja foi medido — de dentro do container da api do FENIX:
`wget http://ollama:11434` -> `bad address`; `wget http://172.17.0.1:11434` -> `refused`.

## Containers

### FENIX (rootless, usuario `fenix`)
| Nome | Imagem | Status |
|---|---|---|
| grg-fenix-enterprise-api-1 | grg/fenix:1.0.0-rc.7 | Up (healthy) |
| grg-fenix-enterprise-worker-1 | e6f77b888b94 | **Created** (nunca subiu) |
| grg-fenix-keycloak-edge-runtime | nginx:1.29.0-alpine | Up |
| grg-fenix-enterprise-keycloak-1 | quay.io/keycloak/keycloak:26.7.0 | Up |
| grg-fenix-enterprise-keycloak-bootstrap-1 | keycloak:26.7.0 | Exited (0) — normal, e job |
| grg-fenix-enterprise-redis-1 | redis:7.2.14-alpine | Up (healthy) |
| grg-fenix-enterprise-postgres-1 | postgres:17.9-alpine | Up (healthy) |
| grg-fenix-enterprise-qdrant-1 | qdrant/qdrant:v1.18.3-unprivileged | Up (healthy) |
| grg-fenix-enterprise-minio-1 | minio:RELEASE.2025-04-22 | Up (healthy) |
| grg-fenix-enterprise-prometheus-1 | prom/prometheus:v3.4.1 | Up |

### AI Platform (daemon root)
| Nome | Imagem | Status | Portas |
|---|---|---|---|
| ai-platform-api-1 | ai-platform-api | Up 8d (healthy) | **0.0.0.0:3000** |
| ai-platform-worker-1 | ai-platform-worker | Up 8d (healthy) | — |
| ai-platform-dashboard-1 | ai-platform-dashboard | Up 8d (healthy) | **0.0.0.0:8080** |
| ai-platform-postgres-1 | postgres:16-alpine | Up 2w (healthy) | **0.0.0.0:5433** |
| ai-platform-redis-1 | redis:7-alpine | Up 2w (healthy) | **0.0.0.0:6380** |
| ai-platform-ollama-1 | ollama/ollama:latest | Up 2w (healthy) | 11434 (interno) |
| ai-platform-comfyui-1 | ai-platform-comfyui | Up 9h (healthy) | 8188 (interno) |

### Infra compartilhada (nao pertence a nenhum dos tres)
| Nome | Imagem | Papel |
|---|---|---|
| ic-openresty-4M98 | icontainer/openresty:1.29.2.3 | **reverse proxy 80/443 de TUDO** |

## Networks

FENIX (rootless): `grg-fenix-enterprise_fenix-backend`, `grg-fenix-enterprise_fenix-runtime`
AI Platform (root): `ai-platform_default`
Infra (root): `icontainer-network`

## Volumes

### FENIX — 667 MB
| Volume | Tamanho |
|---|---|
| grg-fenix-enterprise_fenix-postgres | 526.5 MB |
| grg-fenix-enterprise_fenix-qdrant | 138.5 MB |
| grg-fenix-enterprise_fenix-redis | 1.77 MB |
| grg-fenix-enterprise_fenix-prometheus | 556 kB |
| grg-fenix-enterprise_fenix-minio | 18.8 kB |

### AI Platform — 5.16 GB
| Volume | Tamanho | Observacao |
|---|---|---|
| ai-platform_ollamadata | **4.929 GB** | os 4 modelos LLM |
| ai-platform_pgdata | 139.5 MB | banco proprio, sem relacao com o do FENIX |
| ai-platform_redisdata | 56.08 MB | |
| ai-platform_image-storage | 38.96 MB | saidas do ComfyUI |

## Imagens

AI Platform: `ollama/ollama` 8.06 GB, `ai-platform-comfyui` 3.76 GB, `ai-platform-worker`
840 MB, `ai-platform-api` 574 MB, `ai-platform-dashboard` 92.8 MB, `postgres:16-alpine`
420 MB, `redis:7-alpine` 57.8 MB. **Subtotal ~13.8 GB.**

FENIX: 8 tags `grg/fenix` (rc.1 a rc.7 + rollback), ~329 MB cada = ~2.6 GB, mais keycloak
755 MB, prometheus 427 MB, postgres 400 MB, qdrant 271 MB, minio 250 MB, node:20 194 MB,
nginx 80 MB, redis 57 MB.

Build cache: **10.22 GB no daemon root** + 405 MB no rootless.

## Portas em escuta

| Porta | Processo | Dono |
|---|---|---|
| 22 | sshd | host |
| 80, 443 | openresty | infra (proxy de tudo) |
| 2090 | icontainer | painel do provedor |
| 3000 | docker-proxy | **AI Platform api** |
| 4025 | node | **ZapFlow** |
| 4400 | rootlesskit | **FENIX api** |
| 4401 | rootlesskit | **FENIX keycloak edge** |
| 5432 | postmaster | **PostgreSQL nativo do host** (nao e de nenhum dos tres stacks) |
| 5433 | docker-proxy | AI Platform postgres |
| 6379 | redis-server | **Redis nativo do host** (127.0.0.1 apenas) |
| 6380 | docker-proxy | AI Platform redis |
| 8000 | uvicorn | **`gerar-ficha.service`** (servico Python nao relacionado) |
| 8080 | docker-proxy | AI Platform dashboard |

Firewall (`firewalld`, ativo): 22, 80, 443, 21, 2090, 3000, 8000.
**11434 e 8188 nunca foram expostos** — Ollama e ComfyUI so sao alcancaveis dentro da rede
`ai-platform_default`.

## Nginx / SSL

Duas confs dentro do container `ic-openresty-4M98`:

- `00_zapai.conf` — `listen 80`, `server_name 209.50.241.22 _` (catch-all) -> `127.0.0.1:4025`
- `10_grg_fenix.conf` — `listen 80` + `listen 443 ssl http2`,
  `server_name fenix.209-50-241-22.sslip.io` -> `172.17.0.1:4400` (app) e `:4401` (auth).
  Ja tem `proxy_buffering off` e `proxy_read_timeout 300s`.

SSL: Let's Encrypt real, `CN=fenix.209-50-241-22.sslip.io`, issuer `Let's Encrypt YE2`,
valido de 2026-07-27 a **2026-10-25**. Verificacao de cadeia passou (`ssl_verify=0`).
Arquivos em `/etc/letsencrypt/live/fenix.209-50-241-22.sslip.io` (host) e montados no
openresty em `conf.d/certs/grg-fenix/`.

**Nenhuma conf do nginx aponta para o AI Platform.** As portas 3000 e 8080 sao acessadas
direto pelo IP, sem passar pelo proxy.

## Cron

Uma unica entrada, do ZapFlow, e nao toca o AI Platform:
`* * * * * /bin/bash /opt/zapai/deploy/auto-pull-deploy.sh` (root)

## Systemd

Relacionados ao AI Platform: `ai-platform-watchdog.service` (static) +
**`ai-platform-watchdog.timer` (enabled)**, `ollama.service` (disabled),
`comfyui.service` (disabled).

Nao relacionados, ativos e a preservar: `docker`, `postgresql`, `redis`, `icontainer`,
`xvfb`, `gerar-ficha` (uvicorn:8000).

O FENIX nao tem unidade systemd — sobe por `restart: unless-stopped` do compose rootless.

## Banco e Redis

Quatro Postgres e tres Redis distintos nesta maquina:

| Instancia | Porta | Dono |
|---|---|---|
| postgres 17.9 (container rootless) | interno | **FENIX** |
| postgres 16 (container root) | 5433 | AI Platform |
| postgres nativo do host | 5432 | ZapFlow / outros |
| redis 7.2.14 (container rootless) | interno | **FENIX** |
| redis 7 (container root) | 6380 | AI Platform |
| redis nativo do host | 6379 (localhost) | ZapFlow / outros |

**O FENIX nao compartilha banco nem cache com o AI Platform.** Confirmado por
`docker-compose.enterprise.yml`: `DATABASE_URL` aponta para o servico `postgres` da rede
`fenix-backend`, `REDIS_URL` para o servico `redis` da mesma rede.

## A UNICA dependencia cruzada de todo o sistema

Varredura em `/opt/grg-fenix`, `/opt/zapai`, `/etc/nginx`, `/etc/icontainer` procurando
`ai-platform|aiplatform|:11434|ollama|comfyui|:5433|:6380`. Fora de codigo-fonte e
documentacao do proprio FENIX, existe exatamente **uma linha de configuracao**:

```
/opt/grg-fenix/source/grg/.env.production:15:GRG_AIPLATFORM_URL=http://209.50.241.22:3000
```

Junto com `FENIX_AI_DEFAULT_PROVIDER=aiplatform`, essa linha e o **unico caminho de LLM do
FENIX**. Inferencia medida por este caminho: `qwen2.5:1.5b`, 1.3 s, 39 tokens.

**O ZapFlow nao tem nenhuma referencia ao AI Platform.** Nenhuma.

Consequencia direta para a remocao: desligar o AI Platform **deixa o FENIX sem cerebro** ate
que outra origem de LLM exista. Nao e um efeito colateral obscuro — e o caminho principal.
