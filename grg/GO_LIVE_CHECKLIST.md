# FÊNIX Ω∞ — GO LIVE CHECKLIST (RC1)

Executado pelo dono na VPS após `docker compose up -d` (ver `DEPLOY_RC1.md`). Cada item é
uma **verificação medida** — marque só com evidência real, nunca por suposição.

## Antes de subir

- [ ] Backup gravado: `bash ops/backup.sh` imprimiu caminho + sha256.
- [ ] Código RC1 presente em `/opt/grg-fenix/source` (schema v31 em `state-migrations.js`).
- [ ] `.env.production` com as variáveis mínimas (ver `.env.enterprise.example`).

## Migração e boot

- [ ] `docker compose up -d` recriou os containers sem erro.
- [ ] Log do boot mostra `schemaVersion` chegando a **31**.
- [ ] `curl -s http://127.0.0.1:4400/health` → `{"ok":true,"status":"ready"}`.
- [ ] Checks críticos verdes: state-store (postgresql), queue (bullmq), redis, object-storage (s3/minio).

## Identidade e conectores (capacidades novas do RC1)

- [ ] `GET /api/organism/identity` → organismId estabelecido; linhagem inclui schema 31.
- [ ] `GET /api/connectors` → github + providers de IA com estado **derivado** (não literal).
- [ ] `GET /api/ai/router/select` → escolhe um provider CONNECTED por evidência (ou unknown honesto se nenhum tiver credencial).

## Runtime permanente

- [ ] `node scripts/runtime-roles.js` → os 6 serviços com tick recente (não só "running").
- [ ] `node scripts/verify-infrastructure.js` → 26 probes, readiness gravado.

## Fluxo de missão ponta a ponta

- [ ] Uma missão real (via painel ou `/api/missions/plan`) executa e grava em `aiCalls` E `aiRouterDecisions`.
- [ ] Painel: seção de conectores reflete o estado real; console bar sem literais congelados.

## Known Limitation (aceita conscientemente)

- [ ] Confirmado que o chat-agent usa `this.llm` direto — comportamento idêntico ao v24,
      integração com o Router agendada para MISSION-1008. **Não bloqueia o go-live.**

## Veredito

Todos os itens acima verdes = **READY em produção**. Ainda **não** é PRODUCTION_PROVEN —
isso exige a janela de observação (Assisted Mode). Se qualquer item falhar, ver `ROLLBACK.md`.
