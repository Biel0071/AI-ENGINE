---
type: decision
title: UI do Escritório GRG — salas por loja, funcionários conversando, front+back integrado
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/public/office.html
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/workforce/workforce.js
confidence: 0.9
supersedes: null
---

## Contexto
Pedido: UI completa do sistema — escritório GRG com salas por empresa, funcionários dentro
conversando entre si, clicável, front+back integrado, usando a API da VPS.

## Conteúdo
Backend (workforce.js):
- standup(): reunião de equipe — cada funcionário fala do seu ângulo sobre os dados REAIS
  (twin: saúde/riscos/capabilities); dono abre. LLM narra cada fala (ancorada). Evento standup.held.
- askEmployee(): clicar num funcionário e perguntar; resposta via LLM ancorada nos fatos da loja.
- Endpoints: POST /api/projects/:id/standup, /ask (role+question).

Frontend (novo, 3 arquivos):
- public/office.html — escritório com salas (grid), header GRG, modal por sala.
- public/office.css — salas visuais, personagens (avatares por role com emoji + estrelas de nível),
  badges de saúde, modal com lista de equipe + log de conversa + form de pergunta.
- public/office.js — carrega /api/office, desenha salas com personagens, abre modal, botões
  "Reunião de equipe" e "Relatório do dono", select+input p/ perguntar a um funcionário.
- Link "🏢 Escritório" adicionado no index.html (Painel).

## Validação REAL (servidor + Ollama)
office.html/css/js servem 200. Projeto gerado → hire (dono + 5 funcionários) → standup: 6 turnos,
cada funcionário falou via LLM (Gerente abre, Atendente/IA/Financeiro/Segurança/Analista opinam).
askEmployee(financeiro) respondeu. /api/office lista a sala. 15 arquivos de teste verdes.

## Escopo honesto
REAL e testado: UI de escritório navegável (salas+personagens+modal), reunião com funcionários
"conversando" (falas geradas por LLM, ancoradas), pergunta a funcionário, front+back integrado,
usa o LLM configurado (VPS AI Platform se GRG_AIPLATFORM_URL setado; senão Ollama local).
Limitações: (1) projetos GERADOS têm dados rasos ("métricas n/d") — a riqueza vem de repos
ACOPLADOS com twin real (ex ZAPAI: saúde 78, riscos concretos). (2) A "conversa entre si" é cada
um falando seu ângulo em turnos, não um diálogo multi-turno reativo entre eles. (3) Não abri a UI
no navegador (preview in-app desabilitado) — validei por curl; usuário abre em 127.0.0.1:4400/office.html.
(4) Sem animação de personagens andando; é layout de salas com avatares estáticos.
