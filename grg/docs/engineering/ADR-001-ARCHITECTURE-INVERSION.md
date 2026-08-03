# ADR 001: Inversão de Arquitetura - O Runtime como Sistema Operacional (v2.0)

## Contexto
O FÊNIX nasceu como um projeto e CLI onde a execução do comando instanciaria o Kernel, subiria os serviços em memória e executaria o script, encerrando-se em seguida (ou mantendo um servidor HTTP exposto, mas com forte acoplamento). Isso limitava a autonomia real (autocura, aprendizado de longo prazo e agendamento contínuo).

## Decisão
Mudança radical de paradigma para o **FÊNIX Platform Runtime v2.0**.
1. O Runtime passa a ser um daemon/serviço que reside permanentemente (24/7) no sistema hospedeiro (Windows/Linux/Mac).
2. A CLI, o VS Code Extension, o Cliente Web e a AI City passam a ser **apenas clientes**. Eles se conectam via Socket/IPC ao Kernel.
3. O Runtime orquestra a própria existência, executando missões ativas em background, lidando com filas, roteando solicitações de LLM via AI Gateway e armazenando a telemetria no Event Store.

## Consequências
- O Kernel não é mais destruído e recriado; sua memória é quente e durável.
- Falhas na CLI não afetam os workers de inteligência.
- Obriga o desenvolvimento de um `ServiceManager` (para registros no OS) e de um `Supervisor` (para reinicializar partes do Kernel que morram, sem derrubar o processo inteiro).
