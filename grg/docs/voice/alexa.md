# FÊNIX OS — ALEXA CUSTOM SKILL INTEGRATION

> **Protocolo Oficial de Comunicação por Voz para o Fênix OS**

## 1. Visão Geral
A integração com a Amazon Alexa transforma a voz em uma interface natural de primeira classe para o **FÊNIX OS**. A Alexa não executa comandos diretamente no sistema operacional; ela se comunica através do **FÊNIX VOICE GATEWAY**, que normaliza, valida a segurança e despacha a requisição para o **FÊNIX MIND**.

```
  ALEXA (Echo / App)
         │
         ▼ (HTTPS POST /api/v2/voice/alexa)
  ALEXA VOICE GATEWAY
         │
         ▼ (POST /api/v2/mind/ingest - source: "alexa")
  FÊNIX MIND CONTROL PLANE
         │
         ▼
  AUTONOMOUS JOB ORCHESTRATOR & AGENT SWARM
```

## 2. Validação de Segurança Amazon ASK
O endpoint `POST /api/v2/voice/alexa` implementa validação estrita:
* **Application ID**: Valida se o ID da skill pertence à lista autorizada (`amzn1.ask.skill...`).
* **Timestamp**: Tolerância máxima de 150 segundos para prevenção contra ataques de replay.
* **SignatureCertChainUrl**: Garante que o certificado SSL procede estritamente do domínio `*.amazonalexa.com`.
* **Zero Secret Leak**: Redação automática de credenciais e tokens em logs.

## 3. Respostas Dinâmicas
Todas as respostas faladas pela Alexa refletem dados reais do runtime (projetos monitorados, jobs em execução, progresso das microtarefas, scores do Reality Gate).
