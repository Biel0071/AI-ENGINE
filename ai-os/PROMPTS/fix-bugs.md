# PROMPT — Corrigir Bug

> Cole `_HEADER.md` antes. Preencha [BUG].

## Tarefa

Corrija: **[BUG]** (sintoma, onde ocorre, como reproduzir).

## Execução

1. Buscar `ai-os/MEMORY/bugs/` — esse bug (ou similar) já foi resolvido antes?
2. Reproduzir. Se não reproduzir, investigar causa-raiz — não aplicar patch às cegas.
3. Corrigir a **causa-raiz**, não o sintoma. Se uma abordagem falhar 2x, parar e repensar.
4. Escrever teste que falha antes e passa depois.
5. Rodar build + suíte relevante.
6. Registrar em `ai-os/MEMORY/bugs/YYYY-MM-DD-slug.md`: descrição, causa, correção, arquivos,
   commit, evidência.

## Regras

- Não introduzir refactor amplo junto do fix. Escopo mínimo.
- Não mascarar erro com try/catch genérico.

## Saída esperada

Bug corrigido na raiz, teste de regressão, memória registrada.
