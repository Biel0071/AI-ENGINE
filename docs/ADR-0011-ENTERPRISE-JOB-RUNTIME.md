# ADR-0011: Enterprise Job Runtime

## Status

Aceito incrementalmente em 2026-07-27. O núcleo M2 está ativo; isolamento por container
efêmero ainda é obrigatório antes de declarar o marco completo.

## Decisão

Trabalho assíncrono entra no `JobEngine` somente por tipos registrados no composition root.
Payloads com formato de segredo são recusados. Jobs possuem tenant, autor, prioridade,
tentativas, agendamento, timeout e limites declarados de CPU/memória. Claim é atômico no store.
Sucesso, retry, cancelamento e DLQ são persistidos e publicados no Fabric, alimentando
versionamento e AI City automaticamente.

O scheduler suporta execução única e intervalos recorrentes. Workers registram heartbeat;
jobs abandonados podem ser reabertos ou enviados para DLQ. Cancelamento de trabalho em curso é
cooperativo pelo contexto do handler. Trabalho enfileirado pode ser cancelado imediatamente.

Desenvolvimento e testes podem chamar `runBatch`. Produção configura Redis/BullMQ como transporte.
As APIs síncronas antigas permanecem por compatibilidade, mas novos fluxos longos devem usar
`/api/runtime/jobs`.

## Limites e próximo incremento

Os limites de CPU e memória são validados e registrados, mas só poderão ser impostos pelo SO
quando o executor Docker efêmero for conectado. Timeout impede que o Runtime aceite o resultado,
mas JavaScript em processo exige cooperação para interromper efeitos laterais. Portanto comandos
não confiáveis não devem usar o executor em processo. O próximo incremento M2 deve adicionar:

- executor Docker rootless com rede negada por padrão e filesystem temporário;
- consumidor BullMQ dedicado e shutdown gracioso;
- leases distribuídos e reaper periódico;
- métricas de lag, duração, retries, DLQ e saturação.

## Migração

O schema v12 adiciona `runtimeJobs`, `runtimeSchedules`, `deadLetters` e `workerHeartbeats`.
Essas coleções são preservadas em upgrades. Antes de downgrade, drene workers e restaure um
backup compatível; kernels antigos recusam o schema mais novo.
