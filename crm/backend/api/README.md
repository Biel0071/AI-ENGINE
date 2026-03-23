# backend/api

Camada de entrada HTTP/API do sistema.

## Responsabilidade
- Expor endpoints HTTP e WebSocket.
- Fazer composition root (montagem de rotas e middlewares).
- Delegar regras de negocio para backend/crm.

## Regra
- Nao deve conter regra de negocio pesada.
