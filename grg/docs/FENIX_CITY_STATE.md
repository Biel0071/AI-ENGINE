# FÊNIX AI City — estado

O estado visual é derivado de `agents`, `missions`, `jobs`, `events`, `health` e `connection` persistidos/emitidos pelo FÊNIX. A posição inicial é determinística a partir de departamento/estação; a posição de trabalho só muda quando o runtime fornece destino ou evento de execução.

Estados suportados: `IDLE`, `THINKING`, `WORKING`, `MOVING`, `WAITING`, `BLOCKED`, `HANDOFF`, `ERROR`, `VALIDATING`, `COMPLETED` e `OFFLINE`.

Após refresh, a cidade reconstrói o mapa do snapshot. Não há armazenamento paralelo de entidades.
