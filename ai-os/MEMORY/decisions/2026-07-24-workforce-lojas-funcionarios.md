---
type: decision
title: Workforce — cada loja vira empresa virtual (dono IA + funcionários) com templates por nicho
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/workforce/workforce.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/workforce.test.js
confidence: 0.9
supersedes: null
---

## Contexto
Visão do usuário: cada loja/projeto gera um "funcionário de IA" (dono) subordinado ao sistema, com
sub-agentes por função, relatórios diários, e experiência que replica para lojas do mesmo nicho.
Vista de "escritório" com personagens clicáveis, insights, reports, telemetria.

## Conteúdo
Criado **WorkforceService** (`grg/src/workforce/workforce.js`):
- hire(): cada projeto vira uma workforce = DONO (gerente IA) + FUNCIONÁRIOS derivados das
  capabilities REAIS detectadas (CAPABILITY_ROLE: whatsapp-crm→atendente, ecommerce→vendedor,
  analytics→analista, ai-gateway→assistente-ia, payments→financeiro, auth-rbac→segurança, etc).
- dailyReport(): o dono agrega insights REAIS (digital twin: saúde/riscos + evolução + memória),
  gera achados + recomendações, e narra em linguagem natural via LLM (ancorado nos fatos).
  Dono ganha experiência (level 1..5) a cada relatório.
- promoteToTemplate(): experiência de um funcionário vira template do NICHO. Nova loja do mesmo
  nicho → funcionário nasce já com o level/skills do template (evolução acumulada por nicho).
- office(): vista de escritório — lojas com dono, headcount, roles, último relatório.
Estado: workforces, employees, dailyReports, employeeTemplates. Endpoints: /api/office,
/api/workforces, /api/projects/:id/hire, /workforce, /daily-report.

## Validação REAL (servidor + Ollama)
ZAPAI-FINAL acoplado (clone real) → hire criou 9 personagens: dono + atendente, assistente-ia,
financeiro, segurança, analista, operações, vendedor, gestor-dados (todos de capabilities reais).
dailyReport do dono: narração natural via Ollama ANCORADA no twin real (saúde 78/100, 2 riscos
concretos, recomendações). Template replica p/ swift-wa-assist no teste (atendente nasce nível 4).
16 arquivos de teste verdes.

## Escopo honesto
NÚCLEO real e testado: geração de equipe por capability, relatório diário ancorado em dados reais,
templates por nicho com replicação, vista de escritório (dados). NÃO feito (roadmap): UI visual do
escritório com personagens clicáveis (só dados/API hoje), sub-agentes que EXECUTAM tarefas sozinhos
(hoje são perfis + o dono relata; não agem autonomamente), telemetria em tempo real, agendamento
automático dos relatórios diários (hoje é sob demanda via endpoint). A espinha existe; a UI de
escritório e a autonomia dos funcionários são os próximos saltos.
