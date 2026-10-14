# FÊNIX — Reconciliação zero regressão (2026-09-14)

Estado: censo em andamento; recuperação NÃO concluída. Nenhum código de produto alterado nesta etapa.

## Evidência executável
- Workspace externo não é repositório Git. Repositório: `ai-engine/`, branch `main-1.0.0`, HEAD `af107515331181a8e5671db8365544bda347cd97`.
- Baseline possui 61 arquivos versionados alterados e arquivos não rastreados. Preservar tudo; snapshot estrutural ainda pendente.
- Launcher `START-FENIX-OS.bat` entra em `ai-engine/grg` e executa `src/server.js`.
- `ai-engine/package.json` start/dev apontam ao mesmo servidor.
- Servidor canônico usa http.createServer e handleUniversalSystemRoutes; PUBLIC aponta ao próprio ../public.
- Aliases `/app`, `/app.html`, `/office`, `/office.html` servem index.html; `/`, `/login`, `/GRG-login` apontam a login.html.
- Não havia listener local em 3000, 4400 ou 4401 na inspeção.
- GET remoto http://209.50.241.22:3000/GRG-login respondeu 200, 263437 bytes, SHA256 bd69379a6df6501935979c2f5c27cd6e1f8562daffef413466fe6814f1275525. Esse hash é idêntico a `public/index.html` externo; contém 98% (VERIFIED REAL) fixo. Não é o shell canônico local.
- Hash do shell `ai-engine/grg/public/index.html`: d0ce8af318d42f5be99e8b003998038ad839229b929083af80e551fe34a00b68. `grg/public/index.html` externo é igual, mas seus scripts não são todos iguais/disponíveis.

## Mapa inicial (não confundir com integração validada)
- Frontend canônico por launcher, package scripts e servidor: ai-engine/grg/public.
- Backend: ai-engine/grg/src/server.js; composição: src/app.js; rotas adicionais: src/api/universal-system-routes.js.
- Shell: index.html -> fenix-bootstrap.js -> runtime-cockpit.js, live-runtime.js, unified-app.js, ide-enhancer.js, cockpit-app.js, visual-inspector.js, jobs-app.js, fenix-command-bridge.js.
- O AGENTS.md antigo descreve vários desses scripts como não carregados: documentação contradita pelo código atual.
- API: caminhos relativos à origem; sessão usa grg_token, cookie e refresh OIDC. Estado inicial FENIX.state em bootstrap; verificar sobreposição em unified-app e cockpit.
- City: iso-city e scripts Pixi carregados; ainda requer rastreamento de ownership/eventos.
- Existem 426 arquivos em src. Grafo histórico possui 3314 nós; consulta frontend/server/router/runtime/city/memory aponta app, event bus, job engine, gateway, provider registry e memory engine. Conferir fontes atuais antes de usar conclusões históricas.
- Deploy externo docker-compose.yml define frontend separado :3000 e backend :4400; deploy canônico enterprise executa node src/server.js. Topologia remota ainda não auditada.

## Inventário inicial e falhas
`frontend-inventory.json` registra 7 cópias, views, navegação, scripts e referências literais de API. Referências contadas NÃO equivalem a endpoints únicos ou funcionais. Scripts ausentes são ausências na cópia local, não prova de 404 remoto.
- externo public: 16 views, 14 destinos; vários scripts ausentes; mock score/status/eventos fixos.
- externo grg/public: 14 views, 14 destinos; cópia incompleta de assets.
- canônico: 14 views, 14 destinos, nenhum script diretamente referenciado ausente.
- vps_source/public e qa/remote-snapshot: cópias arqueológicas; não promover automaticamente.
- temp_backup e temp_backup2: 5 views, 8 destinos; comparar capacidades antes de descartar.

## Baseline de testes
Comando: node --test ai-engine/grg/test/frontend-honesty.test.js ai-engine/grg/test/frontend-runtime-safety.test.js ai-engine/grg/test/operational-console-ui.test.js
Resultado: 31 testes, 26 passam, 5 falham. Log: baseline-tests.tap.
Falhas: valores fabricados; autenticação WebSocket; atividade City determinística; legibilidade/tema; ciclo autônomo de mensagens.
Cada falha exige leitura do contrato e da implementação: detecção textual pode conter falsos positivos (dimensões gráficas, por exemplo). Não alterar testes para esconder regressões.

## Próximas ações obrigatórias
1. Completar censo de módulos, endpoints, mocks, capacidades perdidas e ownership do shell com fontes atuais e histórico Git.
2. Inspecionar topologia/arquivos remotos por acesso existente sem exibir secrets.
3. Apresentar mapa completo antes de edição de produto; criar backup versionado incluindo alterações pré-existentes.
4. Recuperar/conectar capacidades no frontend canônico, consolidar deploy e remover mocks classificados.
5. Executar sintaxe/typecheck/build/health/API, browser autenticado e interações, persistência após restart.
6. Fortalecer guards e auditar todos os 28 critérios do pedido; nenhum está declarado concluído por este documento.
