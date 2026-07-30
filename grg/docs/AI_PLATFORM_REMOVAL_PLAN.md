# AI_PLATFORM_REMOVAL_PLAN

Base: `CURRENT_DEPLOY_MAP.md` (auditoria de 2026-07-29, tudo medido).
Objetivo: VPS exclusiva de **FENIX + ZapFlow**. AI Platform migra para outra VPS.

## BLOQUEIO: ler antes de executar

O AI Platform e **o unico provedor de LLM do FENIX hoje**. Uma linha:

```
/opt/grg-fenix/source/grg/.env.production:15
GRG_AIPLATFORM_URL=http://209.50.241.22:3000     (+ FENIX_AI_DEFAULT_PROVIDER=aiplatform)
```

Prova de que e o caminho vivo, e nao configuracao morta: `POST /v1/text` respondeu
`{"provider":"ollama","model":"qwen2.5:1.5b","result":{"text":"OK"},"tokens":{"total":39}}`
em 1.3 s. Prova de que nao existe caminho alternativo: de dentro do container da api do
FENIX, `wget http://ollama:11434` -> `bad address`, `wget http://172.17.0.1:11434` ->
`Connection refused` (daemons Docker distintos, redes que nao se veem).

**Executar a remocao antes de existir outra origem de LLM torna o FENIX incapaz de:**
chat (texto e voz), decomposicao de objetivo em programa pelo Executive Brain, sumarizacao de
conversa, e qualquer capability que dependa de inferencia. O health nao vai reprovar por isso
(`ai-providers` e `critical:false`), entao a degradacao seria **silenciosa** — o dashboard
seguiria verde com o chat morto. Isto e exatamente o tipo de falso positivo que a regra
REALITY FIRST existe para impedir.

Ordem correta, portanto: **primeiro apontar o FENIX para a nova origem, provar com inferencia
medida, e so depois remover.** A Fase 4 abaixo assume que isso ja aconteceu.

## Duas saidas possiveis (ambas medidas, o dono escolhe)

### Opcao A — remover tudo, FENIX passa a usar LLM remoto
`GRG_AIPLATFORM_URL` passa a apontar para a nova VPS. Ganha ~29 GB e alivia o swap.
Custo: **toda inferencia vira chamada de rede entre VPS** (hoje sao 1.3 s em loopback), e o
FENIX fica sem cerebro enquanto a nova VPS nao estiver de pe. Para chat de VOZ, latencia de
rede somada ao tempo do modelo e o que decide se a conversa parece viva ou travada.

### Opcao B — remover o AI Platform, PRESERVAR so o Ollama (recomendada)
Medido: o container `ai-platform-ollama-1` tem `restart=unless-stopped` e monta apenas
`ai-platform_ollamadata:/root/.ollama` — **nao depende de nenhum outro servico do stack**.
Da para desacopla-lo do compose e mante-lo como servico proprio:

1. `docker network create fenix-llm` e conectar o container do Ollama nela
2. expor `127.0.0.1:11434` (so loopback; **nunca 0.0.0.0** — Ollama nao tem autenticacao) —
   medido agora: a 11434 esta fechada, e de dentro do container do FENIX
   `wget http://209.50.241.22:11434` -> `Connection refused`
3. `FENIX_OLLAMA_URL=http://host.containers.internal:11434` — o alias **existe** e resolve
   para `172.17.0.1` de dentro do container da api (medido)
4. remover os outros 6 containers, o pgdata, o redisdata, o image-storage e as imagens
   proprias; **preservar `ai-platform_ollamadata` (4.9 GB) e a imagem `ollama/ollama`**

Ganho: ~24 GB em vez de ~29 GB, 6 containers a menos em vez de 7, e o FENIX **mantem
inferencia local com latencia de loopback**, sem depender da outra VPS para conversar.
Perde-se o gateway multi-provider, o cache de rotas e o ComfyUI — que e justamente o que
migra. O `OllamaProvider` do FENIX ja aceita `FENIX_OLLAMA_URL` e ja faz streaming token a
token, entao esta opcao nao exige codigo novo.

Recomendo B: mantem o chat de voz viavel durante a migracao e ainda entrega a limpeza.

## Inventario de remocao (Fase 2 — marcacao)

Criterio: pertence ao AI Platform quem tem label `com.docker.compose.project=ai-platform`,
vive sob `/opt/ai-platform`, ou e unidade systemd `ai-platform-*` / `ollama` / `comfyui`.
Nada com `grg-fenix`, `zapai`, `icontainer` ou nativo do host entrou na lista.

### Containers (7) — daemon root
`ai-platform-api-1`, `ai-platform-worker-1`, `ai-platform-dashboard-1`,
`ai-platform-postgres-1`, `ai-platform-redis-1`, `ai-platform-ollama-1`,
`ai-platform-comfyui-1`

### Volumes (4) — 5.16 GB
`ai-platform_ollamadata` (4.929 GB), `ai-platform_pgdata` (139.5 MB),
`ai-platform_redisdata` (56.08 MB), `ai-platform_image-storage` (38.96 MB)

**Dado que morre com eles:** os 4 modelos LLM (qwen2.5:1.5b, qwen2.5:3b, nomic-embed-text,
moondream — re-baixaveis), o banco proprio do AI Platform (**cache de rotas + memoria de
aprendizado de provider: a resposta do `/v1/text` traz `"memory":{"learned":true}`, ou seja
ha estado acumulado que so existe ali**), e as imagens geradas pelo ComfyUI.

### Imagens (7) — ~13.8 GB
`ai-platform-api`, `ai-platform-worker`, `ai-platform-dashboard`, `ai-platform-comfyui`,
`ollama/ollama`, e — **somente se nada mais usar** — `postgres:16-alpine`, `redis:7-alpine`.
O FENIX usa `postgres:17.9-alpine` e `redis:7.2.14-alpine` no daemon **rootless**, que tem
armazenamento separado; ainda assim a remocao deve ser por ID conferido, nao por nome.

### Network (1)
`ai-platform_default`

### Systemd (2 ativos + 2 inativos)
`ai-platform-watchdog.timer` (**enabled** — desabilitar primeiro, senao ressuscita o stack),
`ai-platform-watchdog.service`, `ollama.service` (disabled), `comfyui.service` (disabled)

### Filesystem (1)
`/opt/ai-platform/` — inclui `docker-compose.yml` e `.env`

### Firewall (2 regras)
Portas **3000** e **8000**. Cuidado: **8000 nao e do AI Platform** — e o
`gerar-ficha.service` (uvicorn). Remover somente **3000**. A 8080 (dashboard) nunca esteve
aberta no firewall.

## PRESERVAR — lista de intocaveis

| Item | Por que |
|---|---|
| Todos os 10 containers `grg-fenix-*` | o FENIX |
| Volumes `grg-fenix-enterprise_*` (5, 667 MB) | banco, vetores, cache, objetos, metricas |
| Redes `grg-fenix-enterprise_fenix-*` | |
| Imagens `grg/fenix:*` | inclui a de rollback |
| `/opt/grg-fenix/` | codigo e `.env.production` |
| `/opt/zapai/` + processo na 4025 + cron de auto-deploy | ZapFlow |
| `ic-openresty-4M98` + ambas as confs | **proxy 80/443 de tudo** |
| `/etc/letsencrypt/**` e certs montados | SSL do FENIX, expira 2026-10-25 |
| postgres nativo (5432), redis nativo (6379) | nao pertencem ao AI Platform |
| `icontainer`, `xvfb`, `gerar-ficha` (8000) | servicos alheios |
| Build cache do daemon rootless | do FENIX |

## Backup obrigatorio (antes de qualquer stop)

1. `pg_dump -Fc` do postgres do AI Platform (5433) — **contem a memoria de rotas aprendidas**
2. `RDB` do redis do AI Platform (6380)
3. Copia de `/opt/ai-platform/docker-compose.yml` e `.env` (segredos: 0600, nao ecoar)
4. `docker image save` das 4 imagens proprias, **ou** garantir que ha Dockerfile no repo de
   origem — sem isso a migracao para a outra VPS depende de rebuild que pode nao reproduzir
5. `ollama list` salvo em texto (a lista de modelos a re-baixar do outro lado)
6. **Backup do FENIX tambem** (`ops/backup.sh`), porque a validacao pos-remocao vai mexer
   com ele

Destino: fora da VPS, ou no minimo em `/var/backups/` com sha256 conferido.

## Ordem de execucao (Fase 4)

```
0. PRE-REQUISITO: nova origem de LLM configurada e provada com inferencia real
1. ops/backup.sh do FENIX                       (rollback do lado que importa)
2. backups 1-5 acima do AI Platform
3. systemctl disable --now ai-platform-watchdog.timer     <- PRIMEIRO, senao ele ressuscita
4. cd /opt/ai-platform && docker compose stop
5. VALIDAR O FENIX AQUI  (health + inferencia real + chat)  <- ponto de decisao
6. docker compose down --remove-orphans          (containers + network)
7. docker volume rm dos 4 volumes ai-platform_*  (IRREVERSIVEL sem os backups)
8. docker rmi das imagens conferidas por ID
9. mv /opt/ai-platform /opt/.ai-platform-removed-<data>   (nao rm -rf: recuperavel)
10. firewall-cmd --permanent --remove-port=3000/tcp && --reload
11. docker builder prune  (10.22 GB de cache no daemon root)
12. Validacao completa (Fase 5)
```

Passo 5 e o gate: com o AI Platform **parado mas nao destruido**, se o FENIX degradar, o
rollback e `docker compose start` — segundos, sem restaurar backup.

## Rollback

| Ponto | Como voltar |
|---|---|
| Depois do passo 4 (stop) | `cd /opt/ai-platform && docker compose start` |
| Depois do passo 6 (down) | `docker compose up -d` (volumes intactos) |
| Depois do passo 7 (volumes) | recriar + `pg_restore` do dump + `ollama pull` dos 4 modelos |
| Depois do passo 9 | `mv` de volta o diretorio |
| FENIX quebrado | `ops/rollback.sh 1.0.0-rc.6` + `ops/restore.sh` |

## Ganho medido esperado

Disco: ~5.16 GB (volumes) + ~13.8 GB (imagens) + ate 10.22 GB (build cache) = **~29 GB**
dos 56 GB usados. RAM: 7 containers a menos — relevante porque **o swap esta em 3.7/4.0 GB**,
que e a pressao real desta maquina hoje.

## O que NAO vou fazer sem ordem explicita

- Remover `postgres:16-alpine` / `redis:7-alpine` sem conferir ID contra o que o rootless usa
- `rm -rf /opt/ai-platform` (uso `mv`)
- Tocar em qualquer conf do openresty
- Remover a porta 8000 do firewall (**e do `gerar-ficha`, nao do AI Platform**)
