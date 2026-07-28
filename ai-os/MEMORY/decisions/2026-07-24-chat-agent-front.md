---
type: decision
title: Camada de conversa (ChatAgent) + front do sistema — integrar projetos por chat
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/chat/chat-agent.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/repo-intel/cloning-git-host.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/public/app.js
confidence: 0.9
supersedes: null
---

## Contexto
Pedido: rodar o front do sistema com um agente para conversar e integrar projetos via chat,
completo e funcional.

## Conteúdo
Criado o **ChatAgent** (`grg/src/chat/chat-agent.js`): interpreta a mensagem (roteador de intenção
determinístico), CONSULTA estado real (twin, insights, memória, catálogo) e EXECUTA ações reais.
Intents: connect_repo (URL GitHub), generate, insights, memory, capabilities, twin, list, overview, help.
Cada turno é registrado na memória (kind chat:*). Resposta redigida em linguagem natural (com LLM
real, passaria facts+intent ao AI Gateway — hoje formata direto; adapter trocável sem mudar o arquivo).

Criado **CloningGitHostAdapter** (`grg/src/repo-intel/cloning-git-host.js`): clona repos reais sob
demanda (shallow, efêmero) e reusa o FsGitHostAdapter para ler a árvore. É o que permite acoplar
por conversa. Ligado no server.js.

Front: painel `grg/public/` ganhou um chat completo (bolhas user/bot, chips de sugestão, markdown
básico). Endpoint POST /api/chat.

## Validação (servidor real, HTTP)
Subi o server e conversei de verdade:
- "acople https://github.com/Biel0071/ZAPAI-FINAL" → clonou o repo REAL, analisou (1762 arq, 385 APIs,
  95 componentes, 50 tabelas, 9 capabilities, saúde 78, 2 riscos) e respondeu em linguagem natural.
- "o que você aprendeu?" → insights do loop evolutivo.
- "analise o twin" → saúde + conselhos do Digital Twin.
- "gerar um CRM de whatsapp com IA e PIX" → REUTILIZOU whatsapp-crm, ai-gateway, payments-pix
  (extraídos do ZAPAI real minutos antes), criou novo: nada. Ciclo OMEGA fechado.
12 arquivos de teste verdes (chat.test.js incluído).

## Escopo honesto
Real: interpretação de intenção, consulta de estado real, ações reais (clonar/analisar/gerar/
aconselhar), memória de conversa, front funcional. NÃO real: voz (spec pede texto OU voz — só texto),
compreensão de linguagem aberta (é roteador de padrões, não LLM). Trocar por LLM real = plugar
provider no AI Gateway e usar app.chat com o render via gateway; o resto não muda.

## Nota de ambiente
Front verificado por curl (preview in-app attach desabilitado neste install). git acessível ao node.
