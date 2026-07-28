# PROMPT — Criar Projeto por Prompt (Software Factory)

> Cole `_HEADER.md` antes deste conteúdo. Preencha [OBJETIVO].

## Tarefa

Crie um novo sistema a partir desta descrição:

**[OBJETIVO]** — descreva em linguagem natural o que o sistema deve fazer, para quem,
e restrições (tenant, stack preferida, prazo).

## Execução obrigatória

1. **Entender**: reformule o objetivo, liste requisitos funcionais e não-funcionais, defina o tenant.
2. **Lembrar**: buscar em `ai-os/MEMORY/` decisões/padrões relacionados.
3. **Descobrir reutilização** (com evidência):
   - `ai-os/CAPABILITIES/` — quais capabilities cobrem partes do objetivo?
   - `ai-os/REPOSITORIES/` — algum repo já implementa isso?
   - Liste explicitamente: **o que vou reutilizar** vs **o que preciso criar**.
4. **Planejar arquitetura**: módulos, banco, APIs, telas, deploy — seguindo `ARCHITECTURE.md`.
5. **MOSTRAR o plano** e aguardar (não gerar código antes de mostrar).
6. **Executar**: gerar SÓ o código inexistente; acoplar capabilities existentes por seleção
   (não copiar árvore). Criar migrations, APIs, docs e testes.
7. **Validar**: rodar build + testes; corrigir falhas.
8. **Aprender**: registrar decisão em `ai-os/MEMORY/decisions/`; registrar novas capabilities
   em `ai-os/CAPABILITIES/`; atualizar `WORKSPACE/active-task/`.

## Saída esperada

Sistema funcional (ou preview), lista do que foi reutilizado vs criado, testes passando,
capability catalog atualizado e memória registrada.
