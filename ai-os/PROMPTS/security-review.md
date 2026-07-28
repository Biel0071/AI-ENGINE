# PROMPT — Revisão de Segurança

> Cole `_HEADER.md` antes. Preencha [ESCOPO] (repo, módulo ou diff).

## Tarefa

Revise a segurança de **[ESCOPO]**.

## Checklist

- Multi-tenant: `tenant_id` em toda entidade/query? RLS ativo?
- Autorização antes de cada operação (RBAC/ABAC)?
- Entrada validada na fronteira? SQL/shell parametrizados (sem interpolação)?
- Segredos fora do código e do banco principal, por tenant? Chave de IA nunca no cliente?
- Endpoints expostos exigem auth? Rate limit? Algum serviço aberto em silêncio?
- Audit log em ações com efeito?
- Dependências: versões fixas? Alguma suspeita de typosquatting?
- LGPD: PII tratada corretamente?

## Execução

1. Analisar o escopo contra o checklist (evidência: arquivo:linha).
2. Classificar achados por severidade (crítico/alto/médio/baixo).
3. Propor correção por achado. Corrigir os críticos/altos se autorizado.
4. Registrar em `ai-os/MEMORY/lessons/` padrões de risco recorrentes.

## Saída esperada

Relatório priorizado com evidência, correções dos itens críticos, memória de lições.
