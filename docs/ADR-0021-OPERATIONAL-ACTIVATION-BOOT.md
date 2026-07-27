# ADR-0021 — Operational Activation Boot

## Status

Aceito para a fatia V2.5.4-A.

## Contexto

O FÊNIX precisa iniciar conhecendo o estado real dos seus componentes e distinguindo disponibilidade comprovada de mera configuração. Falhas devem produzir investigação e evidência, nunca reparos silenciosos ou afirmações otimistas.

## Decisão

- O servidor executa um Activation Boot para cada tenant com proprietário `master_admin` durante o startup.
- O mesmo boot é registrado como job recorrente, permitindo execução pelos workers e recuperação pelo Runtime.
- Cada probe produz estado, versão, dependências, latência, disponibilidade, heartbeat e evidência sanitizada.
- Estado atual e histórico append-only são persistidos separadamente.
- Componentes degradados abrem uma investigação deduplicada; recuperação comprovada resolve a investigação com referência ao novo histórico.
- Componentes externos ausentes são `UNCONFIGURED`, nunca apresentados como saudáveis.
- Em produção, PostgreSQL, Redis, Qdrant, MinIO, Docker Rootless, Sandbox, Workers, backup, restore, rollback e logs centralizados são bloqueadores.
- Provas de backup, restore, rollback e logs são registradas explicitamente, possuem proveniência e podem expirar.
- O Readiness Report é determinístico e inclui todos os bloqueadores e investigações relacionadas.
- O Daily Intelligence é derivado exclusivamente do estado persistido: componentes, investigações, agentes, projetos, twins e telemetria de IA.
- Nenhum probe executa correção, deploy, script ou alteração de infraestrutura.

## Invariantes

1. Falha de probe não interrompe a coleta dos demais componentes.
2. Segredos não podem entrar em estado, evidência ou eventos.
3. Ausência de prova operacional nunca equivale a sucesso.
4. Schedules são idempotentes por tenant e tipo de job.
5. Todo boot e relatório gera eventos duráveis e atualiza a AI City por projeção.
6. Readiness não concede autorização para executar mudanças.

## Limites desta fatia

O V2.5.4-A não implementa descoberta profunda de processos, portas, systemd, cron ou certificados; Model Observatory; seleção adaptativa de modelos; Centro de Controle com streaming; nem o pipeline completo de self-evolution. Essas capacidades permanecem em fatias posteriores e dependerão de probes e scripts assinados executados no Sandbox.
