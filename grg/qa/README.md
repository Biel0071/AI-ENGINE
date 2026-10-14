# FÊNIX frontend QA

O frontend canônico mantém 14 views agrupadas em cinco domínios funcionais. A auditoria é somente leitura por padrão: não cria missão, job, commit ou deploy.

## Comandos

```bash
npm run qa:screen-map
npm run qa:screen-contracts
npm run qa:frontend
npm run qa:frontend:fast
npm run qa:frontend:all
```

Para uma instância remota, forneça a URL em `FENIX_URL`. A auditoria visual exige uma sessão autenticada; sem ela, o resultado correto é `BLOCKED/authentication`.

## Evidências

- `screen-function-map.json`: domínios, propósitos e contratos frontend/backend.
- `screen-control-inventory.json`: menus, views, botões, formulários e endpoints.
- `frontend-navigation-qa.json`: navegação, scroll, controles seguros, erros e screenshots.
- `frontend-full-audit.json`: resumo consolidado dos três passos.

O QA nunca transforma timeout, redirecionamento para login ou rota sem resposta em `PASS`.
