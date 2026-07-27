# ADR-0013: Capability Registry sobre o Service Fabric

## Status

Aceito em 2026-07-27 como fundação da V1.5.

## Decisão

Capability é um recurso operacional independente, não lógica adicionada ao Kernel. O catálogo
legado `capabilities` continua descrevendo capacidades encontradas em projetos; o novo
`capabilityDefinitions` descreve módulos operacionais da plataforma e evita misturar esses dois
conceitos.

Cada Capability possui identidade, versão semântica, owner, permissões, recursos, quotas
declaradas, estado, saúde, última execução, métricas, documentação, testes e changelog. Registro e
upgrade criam snapshots append-only. Downgrade e dependência ausente são recusados.

Uma Capability também é registrada no Service Registry com `kind=capability`, identidade interna
estável e evento durável. Version Engine e AI City recebem a mudança pelo Fabric. Resultados do
Runtime atualizam saúde e métricas por eventos `runtime.job.*`; Capability Registry não chama outra
Capability.

## Capacidades iniciais

Somente módulos comprovadamente existentes são ativados automaticamente: Memory, Knowledge,
Runtime, Security, Discovery, Software Factory, AI City e Version Engine. Reasoning, Recovery,
Self Test, Telemetry, Analysis, Evolution, GitHub, MCP e Avatar serão adicionados quando seus
contratos e testes reais existirem; não são anunciados como implementados antecipadamente.

## Migração

O schema v13 adiciona `capabilityDefinitions`, `capabilityVersions` e `capabilityLogs`. A criação de
tenant registra os built-ins pelo evento existente `tenant.created`. Repetição na mesma versão é
idempotente.
