# Plano de execução — Fundação Knowledge Pack

## Feito
1. MASTER.md — missão + princípios não-negociáveis
2. CONTEXT.md — ciclo de trabalho do agente
3. ARCHITECTURE.md — 5 planos, DDD/hexagonal/event-driven, grafo, fluxos
4. ROADMAP.md — 5 fases + critérios de conclusão
5. CODING_STANDARDS.md + TECH_STACK.md — padrões e stack Enterprise
6. CAPABILITIES/ — schema + capability whatsapp-crm seed
7. REPOSITORIES/ — schema + zapai-final seed + tabela dos 10 repos
8. MEMORY/ — schema append-only + decisão inicial registrada
9. PROMPTS/ — header + Master Build Prompt + 8 prompts operacionais
10. WORKSPACE/ — estrutura de estado entre sessões
11. CLAUDE.md raiz — ordem de leitura obrigatória

## Próxima fase (ver ROADMAP Fase 1 → 2)
- Fechar Fase 1: Postgres+RLS (adapter), auth real (OAuth/OIDC/JWT), observabilidade base.
- Iniciar Fase 2: GitHub App + webhooks + worker de sync + scanner AST.
- Iniciar Fase 3: AI Gateway (padrão LiteLLM) para economia de tokens.
