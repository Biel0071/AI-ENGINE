# FÊNIX AI City — validação

Validação mínima: iniciar servidor, consultar `/health`, executar `npm run qa:screen-map`, `npm run qa:screen-contracts` e `npm run qa:frontend:fast`; conferir screenshots em 1920/1440/1366/1024/390 px.

Os testes devem verificar snapshot após refresh, navegação sem sobreposição, seleção de agente, autenticação, reconexão e ausência de `Math.random()`/dados fake na cidade live. O modo de simulação, se existir, deve estar explicitamente rotulado `SIMULATION`.
