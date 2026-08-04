# FÊNIX OS + API Platform — Arquitetura Viva e Grafos de Sistema

Este documento contém a memória arquitetural 100% atualizada do sistema. Ele servirá como fundação para a estabilização e testes automatizados. Os grafos abaixo descrevem o estado e dependências da aplicação.

---

## 1. SYSTEM GRAPH (Macro Arquitetura)

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [UI Layer (public/)]
        HTML[Telas HTML: app, office, index]
        CSS[Design System CSS]
        JS[App/Office JS]
        HTML --> CSS
        HTML --> JS
    end

    %% Fenix OS
    subgraph FenixOS [FÊNIX OS]
        ME[Mission Engine]
        CM[Capability Manager]
        AE[Autonomous Evolution]
    end

    %% API Platform (Backend)
    subgraph APIPlatform [API Platform]
        AG[API Gateway / Server.js]
        QR[Queue Engine / BullMQ]
        PR[Provider Resolver]
        SE[Streaming Engine]
    end

    %% Providers & Infra
    subgraph Infra [Infraestrutura e Provedores]
        LLM[OpenAI / Claude / Gemini / Ollama]
        DB[(PostgreSQL)]
        Cache[(Redis)]
        Mem[(Qdrant / Memory)]
    end

    %% Fluxo de Dados
    JS -- REST/WebSocket --> AG
    FenixOS -- Consome --> AG
    AG --> PR
    AG --> QR
    QR --> DB & Cache
    PR --> LLM
    PR --> Mem
```

---

## 2. UI GRAPH (Inventário Macro de Telas)

```mermaid
graph TD
    subgraph AppScreens [Telas Públicas e Autenticadas]
        L[login.html] --> |Auth via OIDC| A
        A[app.html - Dashboard Principal]
        O[office.html - Virtual Office]
        I[index.html - Landing]
    end

    subgraph AppComponents [Componentes Visuais]
        CM[City Map]
        CH[Chat Log]
        SM[System Metrics]
        TM[Telemetry]
    end

    A --> CM & CH & SM & TM
    O --> CH & SM
```

---

## 3. ROUTE GRAPH (Mapeamento de APIs)

```mermaid
graph LR
    subgraph Gateway [Express Router (server.js)]
        direction TB
        Auth[/api/oidc/*]
        Ops[/api/operations/*]
        Miss[/api/missions/*]
        Health[/health]
        Perf[/api/performance/*]
    end

    subgraph Controllers [Controllers / Handlers]
        AH[Auth Handler]
        OH[Operations State]
        MH[Mission Kernel]
        PH[Performance Engine]
    end

    Auth --> AH
    Ops --> OH
    Miss --> MH
    Perf --> PH
    Health --> |Ping| Infra
```

---

## 4. DEPENDENCY GRAPH (Bibliotecas e Serviços)

```mermaid
graph TD
    subgraph NodeDeps [Node.js Dependencies]
        Express
        BullMQ
        WS
        PG
        Redis
    end

    subgraph OS_Services [ICP Services]
        Docker
        Nginx
        PM2
    end

    Express --> WS
    Express --> BullMQ
    BullMQ --> Redis
    PG --> OS_Services
    Redis --> OS_Services
```

---

## 5. EXECUTION GRAPH (Ciclo de Vida de uma Missão)

```mermaid
sequenceDiagram
    participant User as Usuário (Frontend)
    participant APIGW as API Platform (Gateway)
    participant Queue as Redis Queue
    participant Fenix as FÊNIX OS (Worker)
    participant Provider as Provider (LLM/Service)

    User->>APIGW: POST /api/missions/action
    APIGW->>Queue: Enqueue Mission
    APIGW-->>User: 202 Accepted (Job ID)
    Queue->>Fenix: Dequeue Mission
    Fenix->>APIGW: Request Capability
    APIGW->>Provider: Roteia para OpenAI/Local
    Provider-->>APIGW: Retorna Resultado
    APIGW-->>Fenix: Capability Executada
    Fenix->>Queue: Atualiza Status (DONE)
    APIGW-->>User: (SSE / WS / Polling) Retorna Resposta Renderizada
```

---
*Graphfy Memory — Salvo com Sucesso no Registro Permanente.*
