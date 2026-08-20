# FÊNIX OS — ARCHITECTURE GUARD & GOVERNANCE DIRECTIVE
> **MECANISMO DE PROTEÇÃO ARQUITETURAL CONTRA RECRIAÇÃO DE FRONTENDS**  
> **Data**: 2026-08-20  

---

## 1. DIRETRIZ SUPREMA DE GOVERNANÇA

A partir desta consolidação, qualquer modelo de linguagem, subagente, processo autônomo ou desenvolvedor que proponha:
* Criar um novo arquivo `index.html` fora de `grg/public/`.
* Criar um novo roteador paralelo.
* Criar uma aplicação Vite/React/Next.js/Vue paralela dentro do repositório.
* Recriar um shell ou barra de navegação duplicada.
* Injetar dados simulados ou contadores fictícios (mocks) em produção.

**DEVE SER AUTOMATICAMENTE REJEITADO PELO CI E PELO SUPERVISOR.**

---

## 2. SUÍTE DE TESTE DE GUARDA AUTOMATIZADA

O teste executado em CI:
```bash
node grg/test/architecture-guard.test.js
```
Verifica:
1. Existência e integridade do entrypoint oficial `grg/public/index.html`.
2. Ausência de frontends paralelos fora de `/archive/`.
3. Integração de todas as 7 views principais dentro do shell único.
4. Validação do contrato Zero-Mock contra o runtime em tempo real.
