# FÊNIX Ω∞ — DEPLOY RC1

Procedimento de deploy da Release Candidate RC1 (branch
`feature/fenix-living-organism-foundation`, schema v31) sobre a VPS que hoje roda v24.
**Nada aqui é executado pelo agente** — o deploy é ação humana na VPS. Ver base técnica em
`FENIX_MIGRATION_v24_v31.md` e o veredito em `RELEASE_CANDIDATE_RC1.md`.

## Pré-condições (medidas)

- Produção viva: stack `grg-fenix-enterprise-*` (api healthy, worker, keycloak, redis,
  postgres, qdrant, minio, prometheus) sob o usuário `fenix`, docker rootless.
- Código em produção: schema v24, commit `38bbde3`. Não tem Connector Runtime, AI Router,
  organism-identity.
- RC1: 76/76 testes, 0 sinais falsos, code review sem defeito remanescente.

## Sequência (o dono executa na VPS, como `fenix`)

```
1. BACKUP        bash ops/backup.sh                 # dump + sha256 — a linha de retorno
2. TRAZER RC1    git fetch && git checkout <RC1>    # ou merge da branch em /opt/grg-fenix/source
3. BUILD         docker compose build                # imagem v31
4. UP            docker compose up -d                # migrateState roda v24->v31 no boot
5. CONFIRMAR     ver GO_LIVE_CHECKLIST.md
```

Passo 4: a migração é **aditiva** e roda sozinha no boot — sem comando manual. Confirmar no
log que `schemaVersion` chega a 31.

## Variáveis que ativam capacidades (opcionais, não bloqueiam o deploy)

- `GITHUB_TOKEN` → connector github passa de CONFIGURED a CONNECTED.
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `GROQ_API_KEY` /
  `GRG_AIPLATFORM_URL`+`KEY` / `FENIX_ENABLE_OLLAMA=1` → cada provider vira candidato do AI
  Router. Sem chave, o provider nem é registrado (nunca CONNECTED por configuração).

Nenhuma dessas bloqueia o boot. O sistema sobe com o que tiver e reporta o resto como
CONFIGURED/PLANNED — honesto por design.

## O que muda para o usuário após o deploy

- Novos endpoints: `/api/organism/identity`, `/api/connectors`, `/api/connectors/:id/health`,
  `/api/connectors/:id/selftest`, `/api/ai/router/select`.
- Painel ganha a seção de conectores (estado derivado real).
- O fluxo de missão (SoftwareFactory) passa a decidir provider pelo AI Router.

## Known Limitation levada a produção conscientemente

O `chat-agent` ainda usa `this.llm` direto (não passa pelo AI Router). **Não é segundo
runtime** — é integração pendente, agendada para a MISSION-1008 (v32) após este deploy. O
chat continua funcionando exatamente como em v24.

## Não faz parte deste deploy

Executive Brain, REBORN, roteamento por tipo de missão, e a integração do chat-agent. Tudo
pós-RC1, por missão própria.
