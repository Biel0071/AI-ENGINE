# FÊNIX PRODUCTION STATE

> **REALITY FIRST:** This file represents the actual verifiable state of the VPS deployment.

## Deployment Details
- **Timestamp:** 2026-07-30T14:55:00-03:00
- **Branch:** `feat/fenix-rc20-reality-first-flows`
- **Commit:** `cd8238cd` (feat(ui): unify dashboards and enforce reality first data fetching)
- **Frontend Node (VPS):** `209.50.241.22`
- **Backend Node (VPS):** `209.50.241.22` (Port 4400) / `209.50.241.215` (Isolated)

## System Health
- **API Runtime:** `ONLINE` (Port 4400 is active on VPS 22)
- **Frontend Containers:** `fenix_frontend` deployed via docker-compose.
- Reality First Validation: Phase 1 (Runtime & Boot)

The system successfully booted in the production container (`fenix_backend`) following the Reality First protocol, with missing legacy infrastructure gracefully degraded instead of causing crashes.

## 1. `GET /api/system/boot-status` (HTTP 200 OK)

```json
{
  "ok": true,
  "status": "ready",
  "details": {
    "completedSteps": 15,
    "totalSteps": 15,
    "log": [
      { "step": "Configuration", "success": true, "durationMs": 1 },
      { "step": "Secrets", "success": true, "durationMs": 0 },
      { "step": "Database", "success": true, "durationMs": 0 },
      { "step": "Redis", "success": true, "durationMs": 0 },
      { "step": "Event Bus", "success": true, "durationMs": 0 },
      { "step": "Service Registry", "success": true, "durationMs": 0 },
      { "step": "Capability Registry", "success": true, "durationMs": 0 },
      { "step": "Workers", "success": true, "durationMs": 0 },
      { "step": "Mission Engine", "success": true, "durationMs": 0 },
      { "step": "Knowledge", "success": true, "durationMs": 0 },
      { "step": "AI Router", "success": true, "durationMs": 0 },
      { "step": "Telemetry", "success": true, "durationMs": 1 },
      { "step": "Health", "success": true, "durationMs": 0 },
      { "step": "API", "success": true, "durationMs": 0 },
      { "step": "Frontend Streams", "success": true, "durationMs": 0 }
    ]
  },
  "requestId": "e6868727-b2c1-46d0-ab01-0d2253b163e3"
}
```

## 2. `GET /api/runtime` (HTTP 200 OK)

```json
{
  "status": "running",
  "uptime_ms": 131575,
  "hardware": {
    "cpu_usage": { "user": 1433606, "system": 522030 },
    "memory_usage": { "rss": 77811712, "heapTotal": 27906048, "heapUsed": 15474192 }
  },
  "subsystems": {
    "service_registry": { "status": "running", "uptime_ms": 131579 }
  }
}
```

## 3. `GET /health` (Legacy Equivalent to `/api/system/health`) (HTTP 200 OK)

```json
{
  "ok": true,
  "status": "ready",
  "checks": {
    "state-store": { "ok": true, "critical": true, "adapter": "file" },
    "ai-providers": { "ok": false, "critical": false, "degraded": "sem provider de LLM" }
  },
  "service": "grg-services-os",
  "environment": "production",
  "boot": {
    "ok": true,
    "status": "ready"
  },
  "activation": {
    "status": "completed"
  }
}
```
