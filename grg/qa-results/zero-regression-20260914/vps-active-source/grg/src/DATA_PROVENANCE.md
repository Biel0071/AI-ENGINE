# FÊNIX OS V12 — DATA PROVENANCE & EPISTEMIC INTEGRITY MODEL

**Data do Documento:** 11 de Setembro de 2026  
**Sistema:** Fênix OS V12 Reality Engine  
**Módulo:** Data Provenance Matrix (`/api/v2/reality/provenance`)  
**Princípio Epistêmico:** Todo número, string ou estado exibido na interface deve ter sua linhagem rastreável até a fonte física no host AlmaLinux.

---

## 1. O Padrão de Envelope de Proveniência (Reality Provenance Envelope)

Cada ponto de dado trafegado pela API do Fênix OS V12 é encapsulado na estrutura formal `ProvenanceEnvelope`:

```typescript
interface ProvenanceEnvelope<T> {
  value: T;                          // O dado bruto ou estruturado real
  source: string;                     // Comando, arquivo ou chamada de sistema de origem
  sourceType: SourceType;             // Classificação da infraestrutura física
  endpoint: string;                   // Rota HTTP pela qual o dado é exposto
  timestamp: string;                  // ISO 8601 de captura exata no host
  freshness: string;                  // 'REALTIME' (<1s), 'CACHED' (<15s), 'NEAR_REALTIME' (<5s)
  confidence: number;                 // Grau de certeza epistêmica (0.00 a 1.00)
  status: 'LIVE' | 'STALE' | 'FALLBACK'; // Saúde da sonda de captura
  auditCommand?: string;              // Comando shell exato para o auditor reproduzir no terminal
}

type SourceType = 
  | 'KERNEL'            // /proc/loadavg, /proc/meminfo, /proc/uptime
  | 'PROCESS_TABLE'     // pm2 jlist, ps aux
  | 'CONTAINER_DAEMON'  // docker ps --format json
  | 'MESSAGE_BROKER'    // Redis bull:fenix-jobs:id
  | 'FILE_SYSTEM'       // df -P /, fs.statSync
  | 'VCS'               // git rev-parse HEAD, git status --porcelain
  | 'MODEL_RUNTIME';    // Ollama / OpenAI / Claude API response
```

---

## 2. Matriz Completa de Proveniência de Dados

### 2.1. Métricas Principais do Cockpit

| Ponto de Dado | Valor Live V12 | Fonte Física (`source`) | `sourceType` | Freshness | Confiança | Comando Shell de Reprodução Forense |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Agentes Online** | `14` | `DynamicWorkforce.getAllAgents()` | `MODEL_RUNTIME` | `REALTIME` | 100% | `node -e "console.log(require('/opt/fenix-os/grg/src/reconstruction/dynamic-workforce').getAllAgents().length)"` |
| **Sistemas Ativos** | `4 / 4` | `ProjectRegistry.getRegisteredProjects()` | `FILE_SYSTEM` | `NEAR_REALTIME` | 100% | `ls -d /opt/fenix-os/grg /opt/fenix-os/zapai /opt/fenix-os/api-platform /opt/fenix-os/ai-engine` |
| **Tarefas BullMQ** | `95` | Redis DB 0 (`bull:fenix-jobs:id`) | `MESSAGE_BROKER` | `NEAR_REALTIME` | 100% | `redis-cli llen bull:fenix-jobs:completed` |
| **Uptime do Host** | `71d 22h` | `/proc/uptime` (Kernel Linux) | `KERNEL` | `REALTIME` | 100% | `awk '{print int($1/86400)"d "int(($1%86400)/3600)"h"}' /proc/uptime` |
| **Uptime do Processo**| `11.5h` | `process.uptime()` | `PROCESS_TABLE`| `REALTIME` | 100% | `pm2 jlist \| jq '.[0].pm2_env.pm_uptime'` |
| **Uso de Memória RAM**| `81%` | `/proc/meminfo` (`MemTotal`, `MemAvailable`)| `KERNEL` | `REALTIME` | 100% | `free \| grep Mem \| awk '{print int(($2-$7)/$2 * 100)"%"}'` |
| **Carga de CPU** | `Load 7.6` | `/proc/loadavg` | `KERNEL` | `REALTIME` | 100% | `cat /proc/loadavg \| awk '{print $1}'` |
| **Uso de Disco Root**| `74%` | Linux `df -P /` | `FILE_SYSTEM` | `CACHED` (60s)| 100% | `df -P / \| tail -1 \| awk '{print $5}'` |

---

### 2.2. Proveniência da Fila de Operações (BullMQ)

| Atributo do Job | Exemplo Real (#274) | Origem | Chave no Redis |
| :--- | :--- | :--- | :--- |
| **Job ID** | `"274"` | Redis Key | `bull:fenix-jobs:274` |
| **Nome da Tarefa**| `"code_change"` | Job Data Hash | `HGET bull:fenix-jobs:274 name` |
| **Agente Atribuído**| `"Agente Leonardo"`| Payload `opts.agent` | `HGET bull:fenix-jobs:274 data` |
| **Latência Real** | `5200 ms` | Timestamp diff | `completedOn - processedOn` |
| **Tokens Consumidos**| `236 tokens` | LLM Usage Telemetry | Payload `returnvalue.tokens` |
| **Status** | `"COMPLETED"` | Redis Set Membership| `bull:fenix-jobs:completed` |

---

### 2.3. Proveniência do Ecossistema de Contêineres & Daemons

| Componente | Processo Host / Container | Porta | Status Live | Sonda |
| :--- | :--- | :--- | :--- | :--- |
| **Fênix Core** | PM2 `fenix-backend` (PID 16) | 4410 -> 3000 | ONLINE | `pm2 jlist` |
| **PostgreSQL** | Docker `fenix-postgres` | 5432 | HEALTHY | `docker inspect --format='{{.State.Status}}' fenix-postgres` |
| **Redis** | Docker `fenix-redis` | 6379 | HEALTHY | `redis-cli ping` -> PONG |
| **Keycloak** | Docker `fenix-keycloak` | 8080 | HEALTHY | HTTP `GET http://127.0.0.1:8080/health/ready` |
| **Ollama** | Local Daemon (Llama 3.3) | 11434 | RUNNING | HTTP `GET http://127.0.0.1:11434/api/tags` |

---

## 3. Política de Atualização e Cache

1. **Gauges de Telemetria (CPU / RAM)**: Atualizados via polling HTTP a cada **5.000 ms**.
2. **Contadores de Fila e Tarefas Recentes**: Atualizados a cada **5.000 ms** ou via evento WebSocket sob demanda.
3. **Métricas de Disco e Capacidade de Armazenamento**: Atualizadas a cada **60.000 ms** (cache de baixo overhead no kernel).
4. **Resolução de Conflitos**: Caso o backend fique inacessível, o frontend retém o último envelope válido marcando o atributo `status: 'STALE'` e exibe advertência âmbar na interface, sem jamais inventar números substitutos.
