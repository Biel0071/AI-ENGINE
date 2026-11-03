# VPS RUNTIME CERTIFICATION (CERTIFICAÇÃO DE PRODUÇÃO NA VPS)

**Status:** ONLINE E HOMOLOGADO EM PRODUÇÃO (`209.50.241.22`)
**Host:** `root@209.50.241.22`
**Webroots Sincronizados (Paridade 100%):**
- `/opt/fenix-os/public/`
- `/opt/fenix-os/grg/public/`

---

## 1. Topologia de Processos PM2 e Serviços na VPS

| Serviço / Processo | Identificador | Porta | Papel Operacional | Estado Certificado |
|---|---|---|---|---|
| **Fênix Backend** | PM2 `#16` (`fenix-backend`) | `4410` | Servidor principal GRG (`server.js`), APIs v1/v2, SSE, `FenixAutonomousLoop` V6 e `StorageManager` | `online` (HTTP 200) |
| **Fênix Frontend / Proxy** | PM2 `#17` (`fenix-frontend`) | `3000` | Reverse proxy e servidor do shell canônico unificado | `online` (HTTP 200) |
| **Fênix API Platform** | Gateway LLM | `3001` | Roteamento multi-modelo, cache semântico e contabilidade de tokens | `online` (HTTP 200) |
| **PostgreSQL** | Container `postgres` | `5432` | Persistência relacional primária (`StorageManager`) | `HEALTHY` |
| **Redis** | Container `redis` | `6379` | Cache distribuído, sessões e filas de workers | `HEALTHY` |
| **Qdrant** | Container `qdrant` | `6333` | Memória vetorial semântica e embeddings | `HEALTHY` |

---

## 2. Rotas V6 Verificadas em Produção

- `GET /api/v1/system/health` -> `200 OK`
- `GET /api/v2/autonomous/dashboard` -> `200 OK` (inclui `evolutionReport`, `v6Subsystems` e `schedules`)
- `GET /api/v2/autonomous/evolution-report` -> `200 OK`
- `GET /api/v2/autonomous/v6/subsystems` -> `200 OK` (`12/12 OPERATIONAL`)
- `GET /api/v2/autonomous/v6/schedules` -> `200 OK` (`health` 5m, `quality` 30m, `evolution` 2h)
- `POST /api/v2/autonomous/v6/execute-mission` -> `200 OK` (`exitCode === 0`, `validatorAgentId !== authorAgentId`)
