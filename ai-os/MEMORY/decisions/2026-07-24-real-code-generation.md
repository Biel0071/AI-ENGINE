---
type: decision
title: Geração de código REAL — Software Factory escreve app executável no disco
date: 2026-07-24
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/software-factory/software-factory.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/test/software-factory.test.js
confidence: 0.95
supersedes: null
---

## Contexto
Reclamação do usuário: "quero real funcional, não sistema básico só tela sem função". O chat dizia
"Gerei o projeto" mas NÃO existia projeto no disco — só resposta em memória. O scaffold antigo
gerava require('@grg/x') de pacotes inexistentes (não rodava).

## Conteúdo
1. **scaffold()** reescrito: gera app Node REAL e executável (http nativo, zero deps). package.json,
   src/index.js (servidor HTTP com roteador), um módulo funcional por capability (rotas GET/POST
   reais com store em memória), test/smoke.test.js real, README, .gitignore.
2. **generate()** agora ESCREVE os arquivos no disco (this.outputDir, default grg/generated/<id>).
   Persiste outputPath + fileCount no projeto.
3. **validate()** agora faz parse de sintaxe (vm.Script) de cada .js gerado — garante que roda.
4. Orchestrator e ChatAgent propagam e mostram o outputPath + comando para rodar.

## Validação REAL
- Teste automatizado escreve no disco, carrega o app gerado, sobe servidor e faz fetch real
  (/dashboard/health → {ok:true}). 12 arquivos de teste verdes.
- Via chat no servidor: "gerar um sistema com dashboard, login e analytics" → escreveu 9 arquivos
  em grg/generated/. Rodei `node src/index.js` do app gerado: GET / lista módulos, POST /auth-rbac
  cria item, GET /auth-rbac persiste. FUNCIONA de verdade.

## Aprendizado operacional (bug de processo, não de código)
Ao reiniciar o servidor, a porta 4400 ficou presa por um node de sessão ANTERIOR (código velho),
causando EADDRINUSE e respostas com formato antigo. Solução: matar o PID via
`netstat -ano | grep :4400` + `taskkill /F /PID`. Sempre matar o server antigo antes de subir novo.

## Escopo honesto
O app gerado é um esqueleto Node executável real (rotas por capability, CRUD em memória), não um
produto completo. É "real e roda" — não "tela sem função" — mas ainda é ponto de partida, não
sistema final. Reutilização real de capability = quando extrairmos código real do repo acoplado
para dentro do módulo (hoje o módulo é um stub funcional marcado reused:true/false).
