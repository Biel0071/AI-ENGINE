---
type: decision
title: LLM local real (Ollama) ligado no chat — entende linguagem aberta e fala
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/ai-runtime/ollama-provider.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/chat/chat-agent.js
confidence: 0.92
supersedes: null
---

## Contexto
Reclamação: o chat respondia "tudo bem" com menu de robô — era roteador de palavras-chave, não IA.
Descoberto que a máquina tem OLLAMA rodando (porta 11434) com modelos: qwen2.5:3b, gemma3:4b,
gemma4, moondream. LLM local real, sem chave, sem custo.

## Conteúdo
1. **OllamaProvider** (`grg/src/ai-runtime/ollama-provider.js`): http nativo p/ 127.0.0.1:11434.
   complete() (AI Gateway) + chat({messages,format,temperature}). available() detecta se está up.
2. **ChatAgent** ganhou modo LLM híbrido:
   - classifyWithLLM(): entende intenção em linguagem aberta (JSON forçado). Fallback nas regras.
   - speak(): redige resposta natural SÓ a partir dos fatos reais (anti-alucinação). Ações concretas
     (connect/generate/portfolio) mantêm texto estruturado exato; conversa/consulta passam pelo LLM.
   - history: memória progressiva de conversa (últimas 12 trocas).
3. **Estratégia híbrida**: regras determinísticas primeiro (URL, "todos repos do user X" reforçada
   com verbos pega/puxa/busca/baixa + username). LLM só quando regra cai em 'help'. Isso corrige o
   modelo 3b confundir ingest_portfolio com list.
4. app.js liga Ollama opt-in: options.llm (instância) OU env GRG_LLM=1. Testes ficam determinísticos.
   server.js liga por padrão (GRG_LLM=0 desliga).

## Validação REAL (servidor + Ollama qwen2.5:3b)
- "tudo bem" → "Tudo bem, como vai a sua tarde?" (natural, não menu). intent chitchat, llm:true.
- "o que esse sistema faz?" → resposta ancorada no estado real (leu métricas, não alucinou).
- "cara, pega la todos os meus repositorios do github do usuario Biel0071 pra mim" (linguagem 100%
  natural) → entendeu ingest_portfolio, buscou na API real do GitHub, clonou e analisou os 5 repos.
13 arquivos de teste verdes (chat-llm.test.js com LLM mock).

## Aprendizados operacionais
- Node 18.13 TAP lexer QUEBRA com acentos nos NOMES de test('...') → ERR_TAP_LEXER_ERROR. Manter
  títulos de teste sem acento.
- Sempre matar o server antigo (netstat :4400 + taskkill /F) antes de subir novo, senão EADDRINUSE
  e o navegador fala com código velho.

## Escopo honesto
Modelo local 3b é limitado: classifica bem com o system prompt, mas erra nuances (por isso as regras
determinísticas têm prioridade para comandos claros). Para conversa mais robusta: usar gemma3:4b/
gemma4 (mais lento) ou plugar um provider cloud (a interface OllamaProvider é a mesma). O "entende e
fala" é REAL agora; a qualidade escala com o modelo.
