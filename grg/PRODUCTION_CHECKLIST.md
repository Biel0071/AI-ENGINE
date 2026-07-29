# FÊNIX Ω∞ — PRODUCTION CHECKLIST (RC1)

O que separa **READY** (deploy funcionou) de **PRODUCTION_PROVEN** (o sistema se sustenta em
produção). O `GO_LIVE_CHECKLIST.md` cobre o READY; este cobre o resto — a evidência que só a
produção real gera, ao longo de uma janela de observação.

## Provas de GA (as 4 que nenhuma variável resolve — exigem operação registrada)

- [ ] **backup** — `ops/backup.sh` gravou prova (caminho + sha256) via `record-assurance.js`.
- [ ] **restore** — `ops/restore.sh` testado (destrutivo) e prova gravada após healthcheck.
- [ ] **rollback** — `ops/rollback.sh` exercitado e prova gravada.
- [ ] **centralized-logs** — driver externo (loki/fluentd) enviando para FORA do host + `record-log-sink.sh`.

Sem as 4, o gate de readiness (`production-readiness.js`) mantém o deploy como READY, não PROVEN.

## Segurança (verificar em produção)

- [ ] Nenhum segredo em log: os connectors medem só presença de credencial, nunca o valor.
- [ ] **Rotacionar a senha root da VPS** — foi exposta em texto puro anteriormente; a chave
      ed25519 passwordless garante que rotacionar não quebra o acesso.
- [ ] Chave de cripto NÃO deriva de literal para dados sensíveis novos (dívida registrada em
      `cognitive-encryption.js:9` — não usar esse módulo para credencial de tenant).
- [ ] API atrás do reverse proxy TLS; `ports` fixado em `127.0.0.1` (não exposta direto).

## Observabilidade (janela de produção)

- [ ] `/api/observability/metrics` reporta cobertura de medição real (não valores fixos).
- [ ] Prometheus: `fenix_living_runtime_role_last_tick_age_seconds` por role — os 6 vivos.
- [ ] `aiCalls` e `aiRouterDecisions` acumulando com tráfego real (não vazios).
- [ ] Dead-letter queue vigiada (alerta em `observability-center` se > 0).

## Capacidade e custo

- [ ] Budget de tokens/custo configurado (`aiGateway.setBudget` / `setCostBudget`) se aplicável.
- [ ] AI Router escolhendo local-first sob carga real (ollama antes de pago) — verificar em `aiRouterDecisions`.
- [ ] Retenção do documento único sob controle (o store reserializa a cada escrita; tetos em `retention.js`).

## Assisted Mode (o caminho para PRODUCTION_PROVEN)

- [ ] Janela de observação de 48h aberta; evidência colhida DENTRO da janela, com origem e timestamp.
- [ ] Somente então um objetivo pode ser marcado PRODUCTION_PROVEN (não pelo deploy em si).

## Riscos remanescentes (aceitos ou a mitigar)

| Risco | Estado | Mitigação |
|---|---|---|
| chat-agent bypassa o Router | conhecido, documentado | MISSION-1008 (v32), pós-deploy |
| Memória apertada na VPS (medido: ~1 GB livre) | aberto | monitorar; ollama+comfyui pesam |
| 4 outras superfícies chamam gateway direto (não o router) | conhecido | fora do fluxo de missão; missão futura por chamador |
| Cobertura por módulo não instrumentada (c8 ausente) | aberto | próximo ciclo: c8 para número real |
| PRODUCTION_PROVEN exige janela de 48h | por design | Assisted Mode |

## Veredito

READY = deploy verde + GO_LIVE_CHECKLIST completo. PRODUCTION_PROVEN = este checklist +
janela do Assisted Mode. A promoção final é autorização humana sobre evidência medida.
