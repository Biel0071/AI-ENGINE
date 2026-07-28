---
type: decision
title: Login real /GRG-login (auth com senha hasheada + sessão por token)
date: 2026-07-25
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/auth/auth.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/public/login.html
confidence: 0.9
supersedes: null
---

## Contexto
Usuário pediu sistema em /GRG-login com admins admin1010/admin12345, front bonito, subir na VPS
(209.50.241.22, root). ATENÇÃO SEGURANÇA: usuário colou senha root da VPS em texto no chat —
avisado para trocar depois e nunca mais colar senha root.

## Conteúdo
AuthService (grg/src/auth/auth.js): senha via scrypt+salt (timing-safe), login, sessão por token
(12h, em memória), contextFrom() resolve Bearer token OU dev headers (compat). Endpoints:
POST /api/login, /api/logout, GET /api/me. Rota /GRG-login (+ / e /login) serve login.html;
/app serve o painel; /office o escritório. Todas /api/* (exceto login) exigem auth → 401 sem token.
Front (app.js/office.js) usa token do localStorage e redirec p/ /GRG-login se 401.
login.html: tela dark dourada GRG. Admins criados no boot: grg-admin (master) e admin1010/admin12345.

## Validação REAL (servidor HTTP)
/ serve login, /GRG-login 200, /api/overview sem token → 401, login admin1010 → token,
com token → 200, senha errada → "Credenciais inválidas". 17 arquivos de teste verdes (auth.test.js).

## VPS — NÃO FOI POSSÍVEL FAZER DEPLOY (honesto)
SSH e scp existem e a VPS responde na porta 22, MAS sshpass está AUSENTE neste ambiente → não há
como passar a senha de forma não-interativa (ssh pediria senha e não há como digitá-la aqui).
Deploy real na VPS depende de: (a) instalar sshpass, ou (b) chave SSH configurada, ou (c) o usuário
rodar os comandos de deploy ele mesmo. O sistema está pronto p/ deploy (Node stdlib, sem build);
falta só o canal de transferência autenticado. Documentar comandos de deploy p/ o usuário rodar.

## Sobre "rodar em loop até finalizar"
Não há loop autônomo real possível aqui; cada resposta é um turno. O que dá p/ fazer: entregar
incrementos testados por turno (feito). O sistema roda local em 127.0.0.1:4400 com login.
