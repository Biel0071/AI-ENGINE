# Software Factory

Gera e evolui sistemas a partir de prompt, reutilizando o máximo do que já existe.

## Entrada

Prompt em linguagem natural + tenant/org/cliente + restrições (stack, prazo, orçamento de tokens).

## Pipeline (durável, orquestrado)

```
prompt
 → entender objetivo (requisitos func./não-func.)
 → LEMBRAR (MEMORY) + DESCOBRIR (CAPABILITIES + REPOSITORIES + grafo)
 → plano de arquitetura: módulos reutilizados vs código novo
 → [aprovação humana do plano]
 → gerar SÓ o inexistente (acoplar capabilities por seleção versionada)
 → banco + migrations + backend + frontend + admin + painel cliente + API + integrações
 → docs + testes + CI/CD
 → validar (build+testes) → corrigir falhas (auto-repair)
 → deploy preview → [aprovação] → produção
 → registrar memória + atualizar catálogo de capabilities
```

## O que a fábrica gera

Arquitetura · Banco de Dados · Backend · Frontend · Admin · Painel Cliente · Aplicativo · API ·
Integrações · Documentação · Testes · CI/CD · Deploy · Analytics · Monitoramento · Segurança ·
Backup · Escalabilidade.

## Contratos (ports)

- `CapabilitySelector` — resolve quais capabilities cobrem o objetivo (com versão + adaptações).
- `Scaffolder` — materializa a arquitetura em um repositório novo (independente).
- `CodeGenerator` — gera apenas o delta inexistente.
- `Validator` — build + testes + correção.
- `Deployer` — adaptadores por destino (ver App Factory / Universal Runtime).

## Regras

- Projeto gerado é **repositório independente** conectado ao cérebro (não subpasta do monólito).
- Nunca recriar o que já existe como capability. Reutilizar por seleção, não por cópia de árvore.
- Diferença de cliente = config/feature-flag/white-label, nunca fork da árvore.
- Toda geração registra `Run` + `MemoryEvent` com evidência.

## Saída

Repositório novo funcional (com preview), lista reutilizado-vs-criado, testes verdes, catálogo
e memória atualizados, pronto para White Label / App Factory sob demanda.
