# FÊNIX AI City — validação

## Evidência automatizada atual

- `test/architecture-guard.test.js`: shell único, 13 views, telemetria real e
  operações ONLINE;
- `test/frontend-honesty.test.js`: contrato sem mock visual;
- `test/runtime-tick-http.test.js`: tick assíncrono sem bloquear HTTP;
- `npm run qa:playwright`: carregamento autenticado e snapshot live;
- `node scripts/frontend-navigation-qa.js --fast`: navegação das telas e erros
  de console/rede;
- `npm run qa:playwright:viewports`: screenshots desktop e mobile.

## Validação manual recomendada

1. autenticar e abrir `#city`;
2. iniciar um job real e confirmar evento, contagem e movimento;
3. provocar falha controlada e confirmar FAILED/Live Activity;
4. atualizar a página e confirmar reconciliação do snapshot;
5. desconectar/reconectar o canal `/events` e confirmar recuperação;
6. executar a suíte completa e separar falhas legadas de regressões atuais.

Qualquer afirmação de produção deve citar uma execução reproduzível e não
apenas a aparência do canvas.
