# FÊNIX AI City — arquitetura

A AI City é uma projeção visual do runtime canônico. Ela não possui estado de missão, agente, job ou memória próprio.

Fluxo: FÊNIX API → snapshot/event stream → adaptador da cidade → renderização. O `iso-city.js` lê agentes reais de `window.FENIX.live`, do snapshot e dos painéis já hidratados. Toda ação operacional continua sendo enviada pelos endpoints canônicos.

## Regra de verdade

Sem agente real, a cidade não cria agente. Sem evento ou estado de trabalho, não cria movimento, mensagem ou partícula. Falhas, indisponibilidade e reconexão são estados visíveis, nunca substituídos por dados demonstrativos.
