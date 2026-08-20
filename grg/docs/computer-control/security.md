# FÊNIX OS — COMPUTER CONTROL & PERMISSION SECURITY MATRIX

## 1. Princípio Zero-Trust
O controle de computador e navegador pelo FÊNIX é regido por uma matriz estrita de 3 níveis:

| Nível de Política | Ações Permitidas | Requer Confirmação Humana? |
|---|---|---|
| **SAFE** | `OPEN_BROWSER`, `NAVIGATE_URL`, `INSPECT_DOM`, `READ_CONSOLE_LOGS`, `CAPTURE_SCREENSHOT`, `INSPECT_WORKSPACE`, `RUN_TESTS` | **NÃO** (Execução automática) |
| **CONFIRM** | `EDIT_PROJECT_FILE`, `DELETE_FILE`, `RUN_SHELL_COMMAND`, `RESTART_SERVICE`, `INSTALL_NPM_PACKAGE` | **SIM** (Apenas com consentimento) |
| **BLOCKED** | `SHUTDOWN_SYSTEM`, `ACCESS_RAW_SECRETS`, `EXPOSE_PRIVATE_KEYS`, `DISABLE_REALITY_GATE` | **PROIBIDO** (Bloqueio irrestrito por código) |

## 2. Auditoria e Rastreabilidade
Cada ação executada emite um evento no EventBus e é registrada no `auditLog` com timestamp, identidade do operador, parâmetros e status.
