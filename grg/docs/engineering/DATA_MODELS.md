# Modelos de Dados (Data Models)

Este documento define os grafos e estruturas primárias de domínio que governam as operações cognitivas e sistêmicas no FÊNIX OS v2.0.

## 1. Mission Object (O motor do OS)
Uma missão não é um script; é uma meta que a Mission Engine decompõe e alcança.

```json
{
  "missionId": "msn-uuid",
  "goal": "Levantar ambiente de staging para o projeto CRM",
  "priority": "HIGH",
  "status": "EXECUTING", // BOOT, PLANNING, EXECUTING, VALIDATING, COMPLETED, FAILED, LEARNING
  "plan": {
    "subtasks": [
      { "id": "t1", "action": "Provisionar DB", "capabilityId": "cap:postgres:provision", "status": "DONE" },
      { "id": "t2", "action": "Subir Container", "capabilityId": "cap:docker:deploy", "status": "PENDING" }
    ]
  },
  "constraints": {
    "maxCost": 0.50, // USD
    "maxDurationMs": 30000,
    "requiredCapabilities": ["cap:postgres", "cap:docker"]
  },
  "validation": {
    "expectedOutput": "http://staging.crm.local respondendo 200",
    "result": null
  },
  "learningContext": "msn-learning-uuid" // Link para a memória gravada pós-missão
}
```

## 2. Cognitive Bank / Memory (Estrutura Arquitetada)
Diferente da versão antiga que armazenava "fatos", a V2 modela Problema e Resolução de forma indexável.

```json
{
  "memoryId": "mem-uuid",
  "type": "CORRECTION", // INSIGHT, CORRECTION, PATTERN, CONTEXT
  "vectorRef": "vec-qdrant-id",
  "problem": {
    "description": "Banco de dados atingiu max_connections em pico",
    "symptoms": ["Timeout na rota /api/users", "Logs do postgres reportam FATAL"]
  },
  "hypothesis": "O pool de conexões do microsserviço X não está limitando as conexões ou está vazando conexões.",
  "solution": {
    "action": "Configurar PgBouncer e reduzir o pool max no cliente para 10",
    "capabilitiesUsed": ["cap:docker:restart", "cap:config:update"]
  },
  "metrics": {
    "timeToResolveMs": 45000,
    "costUsd": 0.002, // custo LLM e compute
    "efficiencyScore": 0.95,
    "confidenceLevel": 0.98
  },
  "timestamp": "2026-08-03T12:00:00Z"
}
```

## 3. Knowledge Graph Entity
Um nó no cérebro semântico relacionando a empresa, projetos, APIs, etc.

```json
{
  "nodeId": "kg-node-uuid",
  "type": "PROJECT", // ORGANIZATION, USER, PROJECT, API, SERVER, PLUGIN
  "label": "AI Engine Core",
  "attributes": {
    "status": "production",
    "techStack": ["Node.js", "Redis", "Postgres"]
  },
  "relationships": [
    { "type": "DEPENDS_ON", "targetId": "kg-node-uuid-redis", "weight": 1.0 },
    { "type": "OWNED_BY", "targetId": "kg-node-uuid-user", "weight": 1.0 },
    { "type": "MONITORED_BY", "targetId": "kg-node-uuid-plugin-vps", "weight": 0.8 }
  ]
}
```

## 4. Capability Graph Node
Uma funcionalidade no ecossistema, pre-calculada antes de ser executada.

```json
{
  "capabilityId": "cap:docker:deploy",
  "name": "Docker Deploy Service",
  "pluginSource": "plugin-docker-core",
  "dependencies": ["cap:docker:health", "cap:vault:read"],
  "permissions": ["runtime:admin", "network:write"],
  "evaluationMetrics": {
    "averageCost": 0.00,
    "averageLatencyMs": 450,
    "riskLevel": "HIGH", // Porque altera o sistema
    "recommendedLlm": "null" // Não requer inteligência artificial para executar
  }
}
```
