---
type: decision
title: Rebrand para GRG Services OS + expansão de escopo (produto) mantendo arquitetura
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: ai-os/MASTER.md
  - repo: AI-ENGINE
    commit: 785cae5e
    location: ai-os/ARCHITECTURE.md
  - repo: AI-ENGINE
    commit: 785cae5e
    location: platform/docs/ARCHITECTURE.md
confidence: 0.95
supersedes: null
---

## Contexto
O usuário forneceu a especificação "GRG Services OS — The Software Engineering Operating System",
ampliando o escopo do AI ENGINE. A recomendação final do próprio usuário confirmou a arquitetura
que já estava documentada: Control Plane como cérebro; sistemas gerados como repositórios
independentes conectados (nunca monólito gigante).

## Conteúdo
Decisões tomadas:
1. **Nome do produto = GRG Services OS.** AI ENGINE passa a ser o codinome do motor interno
   (control plane + inteligência). O repo git continua `AI-ENGINE` (histórico, não muda produto).
2. **Missão expandida**: criar, evoluir, administrar, IMPLANTAR, VENDER e OPERAR qualquer software.
   Regra de ouro reforçada: nunca desenvolver para um único cliente; sempre pensar no ecossistema.
3. **Novos motores de produto** documentados em `ai-os/domains/`: Software Factory, White Label
   Engine, App Factory (APK/AAB/iOS/desktop/PWA/extensões), Design Engine.
4. **AI Orchestrator** formalizado em `ai-os/AGENTS.md`: Meta-Agente coordenador + 18/19 agentes
   especializados; mapeados para subagentes do Claude Code (Explore/Plan/general-purpose/Workflow).
5. **Novos bounded contexts**: WhiteLabel, Build, Design, Billing. **Painel Master** detalhado no
   ARCHITECTURE. **Fases 6–7** adicionadas ao roadmap (produto GRG + App Factory/operações).
6. **TECH_STACK** ampliado com App Factory (RN/Expo, Tauri, MV3) e tabela de adapters plugáveis
   (git host, cloud, bancos, IA, comunicação, pagamentos, analytics).

## Impacto
A arquitetura-núcleo NÃO muda (DDD + hexagonal + control-plane-as-brain já suportava tudo).
A expansão é aditiva: novos motores são plugins do microkernel via ports; integrações são adapters.
Prioridade de adapters segue demanda do portfólio (WhatsApp, PIX/Mercado Pago, Supabase, OpenAI/
Anthropic primeiro). Fundação técnica (Fases 1–3) continua sendo o caminho crítico antes do produto.
