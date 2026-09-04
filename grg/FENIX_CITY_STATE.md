# FÊNIX AI City — contrato de estado

`GET /api/v2/city/state` é a leitura autenticada do estado operacional usado
pela AI City. O payload contém `projects`, `agents`, `missions`, `jobs`,
`buildings`, `summary` e metadados de geração/runtime.

## Invariantes

- contagens são derivadas das coleções retornadas;
- agente ocupado só é exibido quando há job/missão correspondente;
- métricas não medidas são `null`, nunca números plausíveis inventados;
- falha, bloqueio, espera de aprovação e ausência de atividade são estados
  distintos;
- após refresh, o shell reconcilia o snapshot antes de renderizar atividade.

O snapshot não substitui eventos: eventos atualizam a experiência em tempo
real e o snapshot corrige divergências após reconnect ou refresh.
