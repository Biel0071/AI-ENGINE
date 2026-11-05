# GRG SPACE — mapa de projetos e portas da VPS

Levantamento somente leitura em 2026-10-21. Não contém segredos. Estados descrevem o que respondeu durante a inspeção, não certificam disponibilidade contínua.

## Resumo do roteamento observado

| Endereço/porta | Serviço observado | Origem/processo | Estado observado | Notas |
| --- | --- | --- | --- | --- |
| `https://209.50.241.22/` | GRG SPACE / Fênix | OpenResty → `127.0.0.1:3000` | HTTP 200; `X-GRG-Route: fenix-os` | Raiz pública principal atual; `/v1` segue para API Platform e `/auth` para Keycloak. |
| `https://209.50.241.22:1000/` | Frontend ZapAI | OpenResty TLS → `/www/zapai` | HTTP 200; título ZapAI | Nova porta HTTPS com o mesmo certificado IP. Firewalld aberto em runtime e permanentemente. |
| `http://209.50.241.22:3000/` | GRG SPACE / Fênix frontend gateway | `/opt/fenix-os/frontend-gateway.js`, PM2 `fenix-frontend` | HTTP 200 | Porta principal atual do Fênix. |
| `https://fenix.209-50-241-22.sslip.io/` | Fênix | OpenResty → `127.0.0.1:3000` | HTTP 200 após correção em 2026-10-21 | O proxy usava `:4400`, sem listener. A configuração foi atualizada e recarregada; backup em `/root/codex-grg-routing-20261021/10_grg_fenix.pre-upstream-switch.conf`. |
| `209.50.241.22:3001` | API Platform | Docker `api-platform-api-1` | HTTP 200 JSON | Separada do frontend Fênix. |
| `:4025` | Backend ZapAI | `/opt/zapai/backend/server.js`, PM2 `zapflow-api` | `/health` HTTP 200, banco online | Atende hoje a API e recursos usados pelo site ZapAI. |
| `:8000` | Gerar Ficha | `/root/gerar-ficha/backend`, Uvicorn | Listener ativo; raiz HTTP 404 JSON | Projeto Python separado; a rota raiz não é uma página. |
| `:8081` | Dashboard API Platform | Docker `api-platform-dashboard-1` | HTTP 200 | Mantém porta própria. |
| `127.0.0.1:4410` | Backend Fênix | `/opt/fenix-os/grg/src/server.js`, PM2 `fenix-backend` | HTTP 200 HTML na raiz | Vinculado ao loopback; conferir rotas próprias antes de documentar como health. |
| `0.0.0.0:4420` | Worker/supervisor Fênix | `/opt/fenix-os`, PM2 `fenix-evolution-worker` | Listener ativo | Exposição externa precisa de revisão de autenticação/firewall. |
| `0.0.0.0:4430` | Supervisor Fênix | `/opt/fenix-os`, PM2 `fenix-supervisor` | Listener ativo | Exposição externa precisa de revisão de autenticação/firewall. |
| `:1000` | Frontend ZapAI HTTPS | OpenResty → `/www/zapai`, API para backend `:4025` | HTTP 200; health `/health` HTTP 200 | CORS atualizado para `https://209.50.241.22:1000`; HTTPS preserva cookies `Secure`. |
| `:4400` | Sem serviço observado | — | Porta livre | É o destino inválido do proxy do subdomínio Fênix. |
| `:4401` | Proxy Docker/rootless | `rootlesskit` | Listener ativo | Ainda sem aplicação atribuída com segurança. |
| `172.17.0.1:4402` | Keycloak GRG | Docker `grg-fenix-enterprise-keycloak-1` | Listener ativo | Serviço interno da infraestrutura GRG. |
| `:2090` | Painel iContainer | Processo `icontainer` | Listener ativo | Painel de hospedagem; não classificado como projeto de produto. |

## Processos e repositórios

- `/opt/fenix-os` não possui metadados Git no diretório observado. `package.json`: `ai-engine@1.0.0`.
- `/opt/fenix-os/grg` não possui metadados Git no diretório observado. `package.json`: `grg-services-os@0.1.0`.
- `/opt/zapai` tem Git HEAD curto `1369f2d`; backend PM2 `zapflow-api`, frontend em `/www/zapai` via OpenResty.
- `/opt/AI-ENGINE` tem Git HEAD curto `dbbf617b`, mas não foi identificado como dono dos processos web ativos.
- `/root/gerar-ficha/backend` tem Git HEAD curto `3c846cb`; serviço Uvicorn na porta `8000`.
- Infraestrutura Docker ativa: API Platform API/worker/dashboard; Keycloak, PostgreSQL, Redis, Qdrant e MinIO do GRG. Nenhum container serve o frontend Fênix.
- O catálogo em `C:\Users\Dell\Desktop\PROJETOS\projetos.json` registra 41 entradas e todos os 41 caminhos absolutos existem no PC. Há 7 marcados como `Principal`, 10 como `Cópia/variante`, 5 como `Relacionado`, 1 como `Projeto local` e 18 sem `versionRole`. A pasta também contém `MAPA-PROJETOS.md`, atalhos, scripts de inicialização, `logos` e `logs`.
- O catálogo descreve portas locais de desenvolvimento; elas não são portas da VPS. No momento da leitura, havia listeners locais em `4025` (ZapAI API), `8080`, `8787` e `127.0.0.1:4400` (instância Fênix local de QA deste workspace). As outras portas consultadas do catálogo não estavam escutando. Uma porta declarada não deve ser apresentada como serviço ativo.
- O Project Hub local já mescla `projetos.json`, mas a aplicação hospedada na VPS não consegue acessar o disco `C:` do PC: o catálogo padrão baseado no diretório home do servidor Linux não contém esse manifesto. Os 41 caminhos locais não são workspaces remotos e precisam ser copiados/sincronizados conscientemente para a VPS antes de abrir os mesmos arquivos pela instalação pública.

## Riscos e próximos passos

1. Rotas públicas verificadas em 2026-10-21: raiz HTTPS → Fênix; `:1000` HTTPS → ZapAI; subdomínio sslip.io → Fênix; `:3000` HTTP continua servindo o gateway. As três rotas HTTPS retornaram HTTP 200; a raiz incluiu `X-GRG-Route: fenix-os`.
2. OpenResty passou `-t` e foi recarregado. Cópias anteriores estão em `/root/codex-grg-routing-20261021/root-switch`; a configuração anterior do subdomínio está em `/root/codex-grg-routing-20261021/10_grg_fenix.pre-upstream-switch.conf`.
3. Firewalld `public` tem `1000/tcp` em configuração runtime e permanente. CORS da API ZapAI inclui `https://209.50.241.22:1000`; health externo retornou status e banco online e WhatsApp conectado.
4. O processo da API ZapAI permaneceu no mesmo PID (`3960590`) e tinha mais de quatro minutos de tempo ativo durante a observação. O comando PM2 executado como `deploy` não listou `zapflow-api`, portanto estado e contador PM2 não foram confirmados nesta checagem; não interpretar a saída vazia como processo parado.
5. Autenticação interativa e conversa ZapAI em `:1000` ainda precisam ser verificadas no navegador. A resposta HTTP 200 e o health endpoint não certificam esses fluxos.
6. O Project Hub local agora mostra portas declaradas, versão encontrada em `package.json`, modo, workspace e URLs cadastradas; o estado de listener segue explicitamente como não verificado. Para projetos do registro VPS, mostra frontend/API, caminhos e nome PM2 cadastrados sob aviso de que listener e health não foram medidos. Status `ACTIVE`/`READY` não vira health de 100%; sem fonte e timestamp de uma medição, a UI indica “Não medido”.
7. A versão local ainda não foi sincronizada com a instalação VPS; hashes dos principais arquivos diferem e o módulo local `city-agent-visual-profile.js` não existe no destino. A cópia integral desses arquivos não é segura sem merge de versão.
8. Rechecagem somente leitura em 2026-10-21: `/app` na raiz HTTP e em `:3000` retornou HTTP 200 e o mesmo título do GRG SPACE. Ambos ainda carregam `fenix-world-3d.js?v=20261020-city-cookie-world-1` e `iso-city.js?v=4`, anteriores ao workspace local. SHA-256 dos arquivos VPS: `fenix-world-3d.js` `eb5006ebef74f524f036d5706bcc89cb1ba31d54c40d268cb41af915750cd066`; `living-city-routes.js` `11f5776e5fecc6fdd094bed6dc26cdb4e0e112ce768fba8b42c0e5abcc2fbe29`. Workspace local nesta fatia: bundle 3D `20261021-world-activity-motion-1`, SHA-256 `b2cd7e52198c9a86f6247b93be5bab8029c78c310a040c602413cfc17a1cfae6`; API SHA-256 `40027da150aa0a8b4b2112f663b6544691f7873e5235212dd2c1a9834342574c`. `ss` confirmou listeners em `:80`, `:3000` e `127.0.0.1:4410`; a sessão `deploy` não expôs PIDs/owners. `/opt/fenix-os` ainda não tem metadados Git, então esse caminho não identifica por si só um commit implantado.

## Evidências reproduzíveis

## Rechecagem de navegação e catálogo — 2026-10-21

- A rota raiz HTTPS termina no gateway Fênix em `127.0.0.1:3000`; `:1000` serve ZapAI; `:3001` é API Platform; `:4025` é backend ZapAI; `:8000/docs` é Gerar Ficha; `:8081` é dashboard API Platform. Não houve alteração de portas ou serviços nesta rechecagem.
- Project Hub hospedado mostrou 7 projetos e 5 workspaces. O resumo de cada cartão agora inclui portas cadastradas de entrada, UI e API; o detalhe continua diferenciando configuração de listener/health medidos. Teste de UI cobre `VPS: 443 · UI: 3000 · API: 4410` no Fênix.
- `C:\Users\Dell\Desktop\PROJETOS\projetos.json` contém 41 caminhos presentes no Windows. Isso não torna esses caminhos acessíveis no Linux da VPS. A instância Windows local do catálogo não estava escutando em `127.0.0.1:4400` durante a checagem; a aplicação publicada não consegue mostrar nem abrir esses projetos sem uma ponte local autenticada.
- Regressão de sincronização: asset público ainda corresponde ao SHA antigo e continua executando `syncRealData()` no caminho de recuperação do loop de animação. Correção e testes estão apenas no checkout; a tentativa de atualização do asset em produção foi bloqueada antes da execução.
- Rechecagem do runtime: `127.0.0.1:3000/app` e `127.0.0.1:4410/health` responderam HTTP 200; `/api/v2/living-city/state` sem autenticação respondeu 401, confirmando proteção da rota, não 404. Na sessão autenticada, a Cidade mostrou 30 agentes e 9 edifícios medidos, 39 agentes registrados e nenhum job ativo.
- Recursos observados: disco raiz em 94% (5,8 GB livres). O asset público `fenix-world-3d.js` continua na versão anterior e contém nova tentativa de sincronização dentro do ciclo de animação. O checkout corrige esse caminho e o layout tablet; essas correções não estão publicadas.
- Incremento de performance e fidelidade no checkout: o fallback 2D agora limita renderização a 24/30 fps e o minimapa atualiza na própria cadência de 2 Hz. Também foram removidas rotas e falas aleatórias de agentes ociosos; esses itens estão cobertos por testes locais, mas ainda precisam entrar em uma versão publicada para afetar a URL pública.
- Operações feitas: somente leitura na VPS e navegação no navegador; sem reinício, reboot, mudança de firewall, alteração de portas ou gravação em produção.

## Comandos reproduzíveis

Comandos usados na VPS: `ss -ltnp`, `docker ps --format`, `docker inspect`, `pm2 show`, `curl` nos endpoints acima, leitura dos arquivos OpenResty `00_zapai.conf` e `10_grg_fenix.conf`, e inspeção dos `cwd`/command line dos PIDs identificados. Nenhuma variável de ambiente com valores, token, cookie ou senha foi incluída neste relatório.

## Rechecagem da instalação e do catálogo (2026-10-21)

- Catálogo desktop relido em `C:\Users\Dell\Desktop\PROJETOS\projetos.json`: 41 projetos; todos os 41 caminhos cadastrados existem no computador. No início da checagem o Fênix local respondeu em `127.0.0.1:4400` (`/health` e `/app` HTTP 200) e `/api/v2/projects` sem sessão retornou 401. Na última checagem da rodada, a porta local já estava sem listener e `/health` não respondia. Nenhuma credencial foi lida para contornar a autenticação.
- Rotas públicas rechecadas: `https://209.50.241.22/`, `/login` e `/app` retornam HTTP 200 com `X-GRG-Route: fenix-os`; `http://209.50.241.22:3000/app` retorna 200; `https://209.50.241.22:1000/` retorna 200; `http://209.50.241.22:8000/` retorna 404 e `/docs` retorna 200; `http://209.50.241.22:3001/health` retorna 200/ONLINE. O 404 de `/` em Gerar Ficha é rota não publicada, não prova que o serviço esteja parado.
- Na sessão local, `/app` inclui `fenix-world-3d.js?v=20261021-world-activity-motion-1`, `avatar-studio-presets.js?v=20261021-zai-avatar-presets-1` e `iso-city.js?v=20261021-zai-avatar-presets-1`. A mesma sessão entrega a página local e os arquivos estáticos em 200.
- Hashes SHA-256 atuais (local → VPS): `public/index.html` `c72adf19bb109520dfa4fcfb9046f7a033021cd6fdd928e12f883c9ec9c2a479` vs `5bf296b403274983c076931462e5125b49fa037d9f1739bc6aa6c57463324d61`; `public/iso-city.js` `884e6eadbd4302b196b58ad5381446176df0b4cbd32baf13597d4c80bee7fe07` vs `c761a4c096cc087c02730d9031800c1cb71cad76a337a3871ccd6585ff05be9a`; `public/fenix-world-3d.js` `b2cd7e52198c9a86f6247b93be5bab8029c78c310a040c602413cfc17a1cfae6` vs `eb5006ebef74f524f036d5706bcc89cb1ba31d54c40d268cb41af915750cd066`; `src/api/living-city-routes.js` `40027da150aa0a8b4b2112f663b6544691f7873e5235212dd2c1a9834342574c` vs `11f5776e5fecc6fdd094bed6dc26cdb4e0e112ce768fba8b42c0e5abcc2fbe29`. A VPS ainda serve bundles antigos e não contém o preset recém-criado.
- A aba Chrome já existente no computador mostrava o título antigo `ZAI — Plataforma Inteligente de Atendimento` em `https://209.50.241.22/login`, enquanto uma nova requisição HTTP ao mesmo URL devolveu `GRG Serviços — Login` com `X-GRG-Route: fenix-os`. A navegação automatizada em aba nova expirou, então cache/aba antiga é hipótese, não causa confirmada; verificar em sessão limpa antes de alterar cache ou proxy.
- Inspeção autenticada no Chrome em `https://209.50.241.22/app#projects` mostrou o Fênix carregado: Project Hub com 7 projetos VPS, 5 workspaces conectados e o detalhe de Fênix OS com 718 telas registradas no Screen DNA. O catálogo “Meus Projetos” do PC não aparece na instalação remota, conforme esperado sem sincronização/bridge. Um modal de aprovação real estava aberto; não foi aprovado nem rejeitado.
- Embora o endpoint atual por HTTP e a aba autenticada mostrem Fênix, a aba antiga de login continua exibindo ZapAI. A causa ainda não está confirmada; não foram apagados cookies/cache nem alteradas rotas. A verificação de sessão limpa permanece pendente.
- Não houve alteração em produção. O checkout local contém ampla divergência e alterações não commitadas; os scripts encontrados `deploy-gateway-and-backend.js` e `bundle-and-deploy.ps1` são caminhos legados explicitamente desativados. Próximo release precisa comparar os arquivos por feature, criar backup fora da árvore servida, staged rollout e rollback validado antes de qualquer cópia/restart.

## Release incremental do Project Hub — 2026-10-21

Foi publicado somente o patch de autenticação do Project Hub (`20261021-projecthub-auth-2`), derivado do arquivo que estava ativo na VPS, com backup validado e atualização atômica de JS/HTML. Nenhum processo foi reiniciado. O Chrome autenticado carregou a nova URL e apresentou 7 projetos, 5 workspaces e o detalhe de Fênix OS; a interface está servida e operacional na sessão autenticada. O comportamento de sessão expirada não foi provocado na VPS, portanto essa parte do aceite continua pendente. Backup disponível em `/home/deploy/grg-projecthub-auth-20261021-01/`.

## Release da sidebar e verificação visual da Cidade — 2026-10-21

A origem realmente servida por `:3000` é `/opt/fenix-os/public` (o `frontend-gateway.js` define esse `PUBLIC_DIR`). A instalação anterior em `/opt/fenix-os/grg/public` foi revertida aos hashes-base; não é a pasta que atende a página pública.

No diretório ativo foram publicados dois patches estáticos, sem restart:

- `20261021-projecthub-auth-2`: JS mínimo do Project Hub passa a usar `window.FENIX.api`; o HTML usa cache-buster `projecthub-auth-2`. A sessão autenticada abriu 7 projetos e 5 workspaces.
- `20261021-mobile-drawer-2`: chat aberto em viewport até 760 px vira gaveta inferior; até 600 px úteis começa em x=8, após a navegação horizontal. Medições autenticadas: 375×813 (gaveta 359×471, navegação no topo), 758×1156 (gaveta 674×560), 768×1024, 1280×801 e 1920×1080 sem interseção Cidade/sidebar. Capturas visuais observadas em 375 e 758; geometria DOM nos demais. Console sem erros. A cena 3D exibiu os indicadores da UI: 39 agentes listados, 0 jobs ativos, 6 máquinas e 0 falhas; isso não prova heartbeat/execução dos 39 agentes.

Backups verificáveis do estado anterior ao patch de autenticação: `/home/deploy/grg-projecthub-auth-20261021-01/active-public/`. Estado anterior à gaveta (já com Project Hub corrigido): `/home/deploy/grg-projecthub-auth-20261021-01/mobile-drawer/`. A expiração de sessão em produção ainda não foi exercitada.

## Snapshot de portas e serviços · leitura remota 2026-10-21 14:14 UTC

| Porta/URL | Serviço identificado | Estado observado agora | Decisão |
| --- | --- | --- | --- |
| `http://209.50.241.22/` → `https://209.50.241.22/` | Entrada principal Fênix via OpenResty; `/` HTTP redireciona 308 e HTTPS responde 200 | Ativo | Manter como entrada pública principal. |
| `:3000` HTTP | Gateway frontend Fênix, `PORT=3000`, `BACKEND_PORT=4410`, `PUBLIC_DIR=/opt/fenix-os/public` | `/app` 200; gateway Node atende a UI e proxy `/api/*` | Manter como frontend principal, sem remapear. |
| `127.0.0.1:4410` | Backend Fênix configurado pelo gateway | Listener ativo; rota autenticada de Cidade respondeu JSON no navegador | Interno; identificar processo/gerenciador antes de restart. |
| `209.50.241.22:3001` | API Platform em `api-platform-api-1` Docker | `/health` 200; container Up 5 dias | Serviço separado, não reutilizar. |
| `:1000` | Frontend ZapAI por OpenResty TLS, API ZapAI em `:4025` | HTTPS `/` e `/health` 200; HTTP sem TLS retorna 400 | Serviço distinto, não reutilizar. |
| `:8000` | Gerar Ficha / FastAPI | `/docs` e `/openapi.json` 200; raiz `/` retorna 404 | Serviço está ativo; 404 da raiz não significa porta livre. |
| `:8081` | Dashboard API Platform | Docker ativo, mapeado para container | Serviço separado. |

A leitura do host confirmou disco raiz em 94% (5,9 GiB livres), RAM disponível de 1,1 GiB e API Platform em execução. O container GRG `grg-fenix-enterprise-api-1` está Exited (137) há 6 dias e o worker/Fenix containers permanecem Created; a aplicação pública Fênix é servida por processo host. `pm2 list` como `deploy` não mostrou apps; o daemon PM2 visível pertence a outro contexto, e não foi possível atribuir com segurança o PID de `:3000`/`:4410`. Nenhum serviço foi reiniciado e nenhuma porta foi alterada.

O catálogo desktop tem 41 caminhos válidos. `localPort` e `apiPort` são metadados de desenvolvimento do PC; não são bindings da VPS. A UI do Project Hub já mostra `UI:` e `API:` por projeto. A máquina VPS não consegue abrir `C:\Users\Dell\Desktop\PROJETOS` sem um conector local autenticado; os caminhos locais não devem ser cadastrados como workspace Linux.
## Rechecagem de portas e catálogo do Project Hub · 2026-10-21T14:35Z

Leitura somente de SSH/HTTP: filesystem `/` 94% usado (5.9 GiB livres); listeners observados em `:80`, `:443`, `:1000`, `:3000`, `:3001`, `:4025`, `:8000`, `:8081`, loopback `127.0.0.1:4410`. `docker ps` confirma API Platform API/worker/dashboard, Keycloak e bancos; `systemctl` confirma `gerar-ficha.service`. Não alterei listeners nem reiniciei serviço.

| Projeto | Bindings verificados nesta leitura | Destino/processo observado | Resultado |
| --- | --- | --- | --- |
| Fênix | `https://209.50.241.22/` (`:443`); `http://209.50.241.22:3000/app` | OpenResty → frontend gateway na `:3000`; backend Fênix em `127.0.0.1:4410` | 200, 200; `:4410` loopback |
| ZapAI | `https://209.50.241.22:1000/`; `http://209.50.241.22:4025/health` | OpenResty TLS → `/www/zapai`; API ZapAI `:4025` | 200, 200 |
| API Platform | `http://209.50.241.22:3001/health`; `http://209.50.241.22:8081/` | Container API `api-platform-api-1`; dashboard `api-platform-dashboard-1` | 200, 200 |
| Gerar Ficha | `http://209.50.241.22:8000/docs` | `gerar-ficha.service` / FastAPI + Uvicorn | 200 na documentação; raiz `/` não é health e responde 404 |

O inventário canônico local do Project Hub foi corrigido: antes ZapAI associava o frontend à porta API `4025`, e Gerar Ficha não existia no catálogo do Fênix. Agora a porta pública web do ZapAI é `1000`, sua API fica em `4025`, e Gerar Ficha aparece em `8000` com serviço systemd e docs OpenAPI. Cada binding traz destino, URL, status HTTP e timestamp; a interface o chama de observação pontual, não de saúde contínua.

O catálogo Windows `C:\Users\Dell\Desktop\PROJETOS\projetos.json` continua com 41 caminhos existentes no computador. Suas portas `localPort`/`apiPort` são configuração local de desenvolvimento e não são confundidas com bindings da VPS. Ainda não há conector PC↔VPS para abrir esses diretórios locais no servidor.

Verificação local: `node --test test/project-registry-vps-bindings.test.js test/local-project-catalog-ui.test.js test/local-project-catalog-integration.test.js test/project-registry-canonical-identity.test.js test/project-registry-snapshot-performance.test.js test/screen-shell-assets.test.js` — 14/14 passaram. O teste browser grava capturas do painel de bindings em 375, 768, 1280 e 1920 px em `docs/visual-evidence/2026-10-21/project-vps-bindings-*-after.png`. Checkout local; nenhuma publicação na VPS.

## Rechecagem de runtime, portas e catálogo local · 2026-10-21

Leitura somente de HTTP/SSH. As rotas públicas responderam: `https://209.50.241.22/` 200 (GRG Serviços Login); `/app` 200 (shell GRG SPACE); `:3000/app` 200; `:3001/health` 200 (API Platform); `https://:1000/` 200 (ZAI); `:8000/docs` 200 (Gerar Ficha); `:8081/` 200 (dashboard API Platform). A API ZapAI respondeu `:4025/health` 200 pelo loopback da VPS, mas a leitura externa em `209.50.241.22:4025` expirou; exposição externa não está confirmada. O host mantém o processo Fênix PID 1657832 (`node /opt/fenix-os/grg/src/server.js`) e disco em 94% (5,9 GiB livres). Nenhum processo foi reiniciado.

O mount do OpenResty identifica o arquivo efetivo `/etc/icontainer/apps/openresty/openresty/conf/conf.d/users/01_grg_root.conf`: TLS `:443` encaminha `/v1/` para API Platform `:3001`, `/auth/` para Keycloak `172.17.0.1:4402`, e o restante para Fênix `127.0.0.1:3000`. A configuração de ZAI redireciona HTTP `:80` para HTTPS e serve o frontend em TLS `:1000`; `/api/`, `/auth/`, `/health` e WebSocket são encaminhados ao processo `127.0.0.1:4025`. Portanto, não remapear essas portas: a entrada principal sem porta já é Fênix via TLS e os serviços usam listeners distintos.

Em `:3000`, chamadas sem sessão para `/api/v2/living-city/state`, `/api/v2/living-city/world-state` e `/api/v2/agents` retornam 401, não 404. Isso confirma apenas a barreira de autenticação; o estado autenticado da Cidade ainda requer verificação no navegador. No checkout, o frontend 3D pede `/api/v2/living-city/state`, e `src/api/living-city-routes.js` registra `/api/v2/living-city/state` e `/api/v2/living-city/world-state`.

O catálogo Windows ainda contém 41 projetos e 41 caminhos existentes. As pastas listadas estão distribuídas em vários locais do disco, não necessariamente dentro de `Desktop\PROJETOS`. O backend do Project Hub lê `FENIX_LOCAL_PROJECT_CATALOG` ou `os.homedir()/Desktop/PROJETOS/projetos.json` e abre os workspaces no filesystem do processo que atende a API. Como esse processo está na VPS Linux, ele não pode resolver os caminhos `C:\...`; o painel remoto lista os 7 projetos que existem no Project Kernel, não os 41 do catálogo do PC. Isso é uma lacuna de integração real, não uma falha de mapeamento de porta.

Prova para escolher o próximo desenho de integração: conferir um protótipo de acesso local somente no navegador, com File System Access API sob HTTPS e seleção explícita de cada pasta, mantendo o conteúdo no PC; avaliar separadamente um agente local autenticado caso tarefas remotas precisem ler/alterar esses arquivos. Não transmitir os 41 projetos à VPS nem expor uma API local ampla sem aprovação específica de escopo e segurança.

## Revalidação pública e de bundles · 2026-10-21T15:16Z

Playwright sem sessão autenticada abriu `https://209.50.241.22/app#city` e recebeu HTTP 200, mas a aplicação redirecionou para `/GRG-login`; os cinco erros de console observados foram 401 de recursos protegidos. Isso confirma a barreira de sessão, não a falha das telas autenticadas.

Os arquivos públicos são diferentes dos arquivos do checkout: `fenix-world-3d.js` (299.502 bytes público / 329.506 local), `iso-city.js` (359.509 / 370.035), `index.html` (461.310 / 474.443). `avatar-studio-presets.js` retorna 404 na raiz pública, embora exista localmente. Os quatro hashes SHA-256 completos não foram persistidos; os prefixos observados foram respectivamente `a691d3ea04f1cc41`, `c761a4c096cc087c`, `c2124d563d02fd47` e `cb33a70d6d80581e` para os arquivos públicos, contra `63cdc5ff12980ecf`, `3bd0374e9b886abf`, `391f164a38d675ad` e `b68c7e3c9a6def47` locais.

SSH como `deploy` confirmou containers da API Platform e bancos em execução e listeners em `:1000`, `:3001`, `:4025`, `:8000`, `:8081`, `:4410`, `:4420`, `:4430` e `:4401`, entre outros. `ss` não expôs os donos dos sockets sem privilégio; `sudo -n` pediu senha. Não foi possível confirmar o processo dono de `:3000` nesta rechecagem. A publicação permanece pendente de sessão autenticada para QA, identificação privilegiada do processo e validação do rollback.

## Rechecagem de carregamento e roteamento · 2026-10-21 16:30 America/Sao_Paulo

- O navegador embutido abriu `/app#city`, mas a aplicação redirecionou para `/GRG-login`; a sessão estava expirada. Não usei credenciais nem validei interações autenticadas.
- Console observado após o redirecionamento mostrou polling repetido de `/api/v2/qwen-orchestrator/status` aproximadamente a cada 6 s e tentativas de `/api/skills` durante a sessão não autenticada. Correções locais de serialização/backoff estão em `public/qwen-project-orchestrator.js` e `public/command-center.js`; os bundles servidos diferem dos locais, portanto não estão ativos na VPS.
- Rotas públicas rechecadas: `http://209.50.241.22/` redireciona 308; HTTPS raiz responde 200 com título de login Fênix; `:3000/app` responde 200 com título GRG SPACE; `:1000/` responde 200 com título ZAI; `:8000/docs` responde 200 com Swagger do Gerar Ficha.
- Assets servidos em `:3000`: `qwen-project-orchestrator.js` e `command-center.js` retornam 200, mas seus hashes SHA-256 não correspondem ao checkout; `city-runtime-composition.css` retorna 404 e não foi implantado.
- A conta SSH `deploy` consegue ler `/etc/nginx/nginx.conf` e `/etc/nginx/conf.d/zapai.conf`. O primeiro inclui `conf.d/*.conf`; o arquivo legível define um server na porta 80 com `root /www/zapai` e proxy API para `127.0.0.1:4025`. Isso conflita com a rota HTTPS pública Fênix observada e não prova que esse arquivo seja a configuração ativa do processo OpenResty/HTTPS. Não encontrei `/etc/nginx/sites-enabled`; `nginx -T` não retornou configuração. Owners/PIDs da porta 3000 continuam indisponíveis ao usuário `deploy`.
- `df` anterior ainda aponta 94% de uso. Backups listados sob `/opt/fenix-backups` e `/opt/fenix-os/backups` não foram validados para restauração. Nenhum serviço, porta ou arquivo de produção foi alterado.
- Critério de publicação permanece: determinar a configuração efetiva e owner do listener, verificar backup/rollback, validar a instalação autenticada e reduzir/entender o espaço em disco antes de substituir assets.
- Após a primeira validação, a URL dos scripts foi versionada (`command-center.js?v=mission-latest-34` e `qwen-project-orchestrator.js?v=20261021-poll-backoff-1`) para evitar reutilização de cache. Hash final do `index.html` em staging e na VPS: `a8124dc963875d373976ced1a0d50ef15f90594d998ef2994621a4550d45c45d`. O Chrome autenticado carregou as duas URLs novas e permaneceu na Cidade após novo reload.

## Hotfix adicional de renderização 3D · 2026-10-21 16:47Z

- Cópia binária do bundle público antes da alteração tinha SHA-256 `a691d3ea04f1cc410f3abec1ccdf0f42934bfc71111a02522296ffb63bb604aa`; o mesmo hash foi confirmado na VPS e no diretório de rollback remoto.
- Publicado `fenix-world-3d.js` com `preserveDrawingBuffer=false`, pixel ratio até 1,5 e redução adaptativa para 30 FPS/sem sombras dinâmicas em viewport compacto ou dispositivos de até quatro núcleos. O script original não continha leitura do canvas para screenshot/exportação.
- `index.html` mudou para `/fenix-world-3d.js?v=20261021-city-gpu-adaptive-1`; o novo JS e index retornam HTTP 200, hashes conferem com staging, e o Chrome autenticado carregou a URL nova.
- Captura validada: Cidade em 1745×859 mostra a cena, minimapa, controles, 39 agentes e 9 prédios. Após 60 s, a rota permaneceu em `#city`; console sem erros, apenas aviso de depreciação do Three.js. Um `waitForLoadState(domcontentloaded)` excedeu 20 s, mesmo com a página já renderizada — tempo de reload permanece sob investigação.
- Testes locais `node --test test/city-runtime-performance.test.js test/frontend-polling-load.test.js` — 7/7; `node --check` no bundle remoto preparado passou. Rollback em `/home/deploy/grg-space-rollback/2026-10-21T1630/public/fenix-world-3d.js` e index anterior já preservado.
- Pendente: medir por 5 min e instrumentar FPS/long tasks nos viewports compactos; a telemetria da VPS segue com disco em 94%. Nenhum restart foi feito.

## Nota de sincronização — 2026-10-21

O hotfix de polling e grafo oculto descrito em `docs/GRG_SPACE_VPS_PROJECT_MAP.md` foi publicado depois das observações anteriores desta cópia. Os itens UI-110 e UI-111 no backlog da GRG registram o estado atual; continuam `FIXED`, sem `VERIFIED`, até validação autenticada por 5 minutos.

## Rechecagem de lag no GRG SPACE · 2026-10-21 17:39 UTC

- Chrome autenticado abriu `http://209.50.241.22:3000/app#city`; a Cidade 3D apareceu com 39 agentes e 9 prédios. A página reportou RAM do host entre 89–93%, disco 94% e CPU variando entre 4–28%. O screenshot mostra a cena pintada, mas chamadas CDP de clique e avaliação JS expiraram; isso registra lentidão na inspeção, sem inferir sozinho o FPS real.
- No checkout, o renderer da Cidade executava a simulação e o desenho em cada RAF de desktop (~60 FPS); a pausa só ocorria quando a rota/aba ficava oculta. O polling do HUD de agentes chamava a API a cada 4 s mesmo fora da Cidade e com o painel fechado. Scanner do cockpit percorria tabelas ocultas repetidamente.
- Correções aplicadas somente ao checkout: limitar renderer a 30 FPS desktop/24 compacto, delta máximo de 50 ms, minimapa a 4 atualizações/s, suspender polling do pool quando o painel fecha e restringir atualizações do cockpit à rota visível.
- Regressão local focada passou 21/21; sintaxe e diff check passaram. Não foi feito deploy ou restart.
- Bloqueio para produção: artefatos da VPS não correspondem ao checkout; RAM/disco ainda exigem medição do host e espaço de rollback. Critério de publicação permanece comparar hashes por arquivo, preservar backup/restauração, medir novamente em sessão autenticada e só então copiar patch estático compatível.

## Hotfix de estabilidade da Cidade · 2026-10-21 17:55 UTC

- Publicados, sem restart: renderer 3D limitado a 30 FPS desktop/24 FPS compacto, delta máximo de 50 ms, minimapa a 4 atualizações/s e atualização de painéis do Command somente na rota ativa. O HTML aponta para `fenix-world-3d.js?v=20261021-city-30fps-stability-1` e `command-center.js?v=mission-latest-36-idle-render-guard`.
- Corrigido no runtime servido o fan-out de snapshots e o singleton WebSocket obsoleto: requisições concorrentes agora compartilham um fetch, há timeout/backoff, e o socket fechado libera o registro global. O shell aponta para `live-runtime.js?v=15-socket-cleanup-20261021`.
- Evidência da VPS: hashes dos três assets e `index.html` conferidos após publicação; os três assets versionados retornaram HTTP 200. Rollbacks anteriores preservados e hashes conferidos em `/home/deploy/grg-space-rollback/2026-10-21T1805-city-lag-budget/`, `/home/deploy/grg-space-rollback/2026-10-21T1820-snapshot-singleflight/` e `/home/deploy/grg-space-rollback/2026-10-21T1835-socket-cleanup/`.
- Evidência no navegador: reload autenticado permaneceu em `#city`; canvas 3D mediu 367×969 no viewport disponível, minimapa informou 30 agentes e 9 prédios medidos, telemetria exibiu ONLINE. Uma leitura pontual mostrou CPU 2% e RAM 82%. O modal de aprovação sem título útil reapareceu; foi recolhido pela ação Minimizar, sem aprovar/rejeitar/cancelar qualquer tarefa.
- Console: a nova sessão não apresentou erros na consulta após reload. Os avisos de singleton foram observados antes da limpeza do socket; a confirmação de ausência ao longo de 5 min permanece pendente porque a ferramenta de navegador excedeu seu limite ao aguardar 31 s.
- Testes focados: 35/35 passaram (`live-runtime-measured-state`, renderer/City reconciliation/fallback, performance e frontend polling). A E2E `e2e-event-city-realtime.test.mjs` não passou: há 13 falhas, incluindo `ECONNREFUSED 127.0.0.1:4400` e contrato de distritos que espera `public/iso-city.js`; o serviço local não está rodando e essa suíte não foi usada como prova de aprovação.
- Limitações: uso de disco permanece 94% (5.9 GB livres); o asset do pool é `root`-owned e não foi alterado. O timeout de `/api/v2/company/projects/fenix-os/absorption` e a sessão de 5 min continuam pendentes. Rollback ainda pode ser feito restaurando os arquivos dos diretórios indicados; não foi feito reboot nem restart do gateway.

## Rechecagem de projetos, portas e tarefas pendentes · 2026-10-21

- Rotas/portas conferidas do lado externo: `https://209.50.241.22/` 200 e `http://209.50.241.22:3000/app` 200 (Fênix); `https://209.50.241.22:1000/` 200 (ZapAI); `http://209.50.241.22:3001/health` 200 (API Platform); `http://209.50.241.22:4025/health` 200 (ZapAI API); `http://209.50.241.22:8000/docs` 200 (documentação Gerar Ficha); `http://209.50.241.22:8081/` 200 (dashboard API Platform).
- `docker ps` mostra `api-platform-api-1` mapeado especificamente em `209.50.241.22:3001->3000`; por isso o acesso a `127.0.0.1:3001` falha mesmo com o serviço público respondendo. A porta `:1000` é TLS: HTTP simples retornou 400 e HTTPS retornou 200. Fênix continua com HTTPS raiz em `:443` → gateway `:3000`; API Fênix `:4410/health` respondeu 200 no loopback. Não alterei portas.
- Estado do host nesta leitura: disco raiz 94%, 5,8 GiB livres; containers API Platform e dashboard estavam `Up 5 days`. A conta de deploy não tem acesso a todos os donos dos processos; não foi feito restart nem escrita.
- Na aba autenticada `#city`, o minimapa reportou 30 agentes e 9 prédios medidos; o HUD reportou 39 agentes registrados, 0 jobs ativos, 4 máquinas, CPU 17% e RAM 91%. Um modal de aprovação real, mas incompleto (título `3`, agente genérico e métricas não medidas), estava aberto. Não foi aprovado, rejeitado ou cancelado.
- O shell público ainda carrega `fenix-task-modal.js?v=20261020`; o asset público SHA-256 é `dcbd5d0eeb464d70fad355d637666355a8e1de159e4428f41b9218a1edd6b8e1`. O checkout contém o guard que recusa título numérico/ID-only e o cache-buster `20261021-task-id-guard-1`. A correção local e seu teste passaram; produção continua na implementação anterior.
- O Project Hub registra as portas solicitadas: GRG/Fênix público em `:443`, UI direta `:3000`, API `:4410`; ZapAI HTTPS `:1000` e API `:4025`; Gerar Ficha `:8000/docs`. API Platform fica em `:3001` e dashboard em `:8081`. Portas declaradas não substituem um health check; esta seção registra respostas da leitura desta data.
- A releitura do catálogo Windows encontrou 41 itens e 41 caminhos locais existentes; `127.0.0.1:4400` não tinha listener. A VPS não consegue abrir esses caminhos `C:\...`; a integração de catálogo local/remoto ainda exige uma ponte local autenticada e escopada.
- Nenhum deploy foi feito nesta rechecagem. Uma tentativa anterior de escrever asset de produção foi bloqueada pela revisão automática antes da execução. Os scripts PM2 legados continuam desativados; não contornei esse bloqueio.

## Leitura adicional de estabilidade · 2026-10-21 18:37 UTC

- Reconsulta remota dos health checks: `127.0.0.1:4410/api/health` e `127.0.0.1:4025/api/system/health` retornam HTTP 401; os endpoints medidos `127.0.0.1:4410/health` e `127.0.0.1:4025/health` retornam HTTP 200. O Registry local foi corrigido para usar `/health` nos projetos Fênix e ZapAI.
- Causa local adicional de carga: o renderer 3D mantinha polling independente de 15 s e fazia outra leitura ao trocar para a Cidade, enquanto `premium-world-live.js` já publica o snapshot autenticado no mesmo intervalo. O renderer agora usa a leitura inicial compartilhada e aplica os eventos `fenix:city-world`, sem uma segunda cadência. O cache-buster do bundle da Cidade foi atualizado no checkout.
- Verificação local após as correções: 18/18 testes focados de polling, orçamento de render, runtime da Cidade e bindings de projeto passaram. O teste de regressão foi executado em RED antes da correção e GREEN após.
- A página autenticada estava renderizada durante esta inspeção; não reproduzi um loop contínuo na sessão atual. A medição comparativa de CPU/RAM por 5 min e a confirmação visual após release continuam pendentes. Nenhuma alteração foi publicada na VPS nesta etapa.

## Reauditoria somente leitura de runtime e recursos · 2026-10-21 19:29 UTC

- HTTPS `/` redireciona à tela de login; `/app` serve GRG SPACE. OpenResty direciona UI para `127.0.0.1:3000`, API Fênix para `127.0.0.1:4410`, API Platform para `:3001`, ZapAI TLS/API para `:1000`/`:4025`, Gerar Ficha para `:8000` e dashboard para `:8081`. Nenhuma porta foi alterada.
- API Platform `:3001` usa mapeamento Docker para o container `:3000`; `:3001` público não é listener local loopback. A conta de deploy não consegue correlacionar todos os sockets com processos/root PM2. Não remapear nem reiniciar sem identificar proprietário e rollback verificável.
- Pressão observada: disco 94% (5,8 GB livres), memória disponível ~952 MiB de 5,8 GiB e swap em uso ~2,13/4 GiB. Isso limita aumentos de geometria/carga.
- O asset 3D servido tinha versão/hash diferentes do checkout; correções locais atuais, inclusive o anel inicial menor, não estão provadas na VPS. Nenhuma publicação/restart foi realizada nesta reauditoria.
- O catálogo `C:\...` continua local ao Windows e não é legível pela VPS sem ponte autenticada e escopada.

## Verificação pública de rotas e versão servida · 2026-10-21 19:49 UTC

- Responderam HTTP 200: `:3000/app`, `:3001/health`, `:8000/docs`, `:8081/` e `https://209.50.241.22:1000/`.
- `:4025/health` excedeu timeout em duas tentativas curtas (8 s e 15 s). Isso é observação de disponibilidade externa; não identifica a causa nem prova que o processo esteja parado.
- O HTML em `:3000/app` ainda referencia `fenix-world-3d.js?v=20261021-city-30fps-stability-1`; bundle servido SHA-256 `a78f09f494e0819acd4c95acc1f454e7743df8a5628c966d69332bf779557de9`. O checkout usa `20261021-city-init-near-ring-2`, portanto a otimização de expansão e a correção do rótulo do minimapa não estão publicadas.
- Nenhuma rota, porta ou processo foi alterado nesta verificação.

## Rechecagem de entrada HTTPS · 2026-10-21 19:51 UTC

- `http://209.50.241.22/` retorna 308 para HTTPS; `https://209.50.241.22/` e `/app` respondem 200. `curl` validou a cadeia TLS sem ignorar erros nesta tentativa. O root continua sendo a página de login; `/app` é a aplicação autenticada.
- O hostname de teste `fenix.grg.local` não resolveu DNS e não foi usado como alternativa.

## Rechecagem do Project Hub e das portas · 2026-10-21 22:17 UTC

- Responderam HTTP 200 nesta leitura: `https://209.50.241.22/`, `http://209.50.241.22:3000/app`, `https://209.50.241.22:1000/`, `http://209.50.241.22:8000/health` e `http://209.50.241.22:3001/health`.
- SSH somente leitura confirmou o processo do frontend PID `1720936` (`node /opt/fenix-os/frontend-gateway.js`). A raiz do host estava em 95%, com 5,6 GB livres; sem limpeza de disco nem restart.
- Os bindings seguem separados: GRG em `:443` e `:3000`; ZapAI TLS em `:1000`; API Platform em `:3001`; Gerar Ficha em `:8000`. Não alterei as portas, pois todas responderam e atendem serviços diferentes.
- O Project Hub desta VPS ainda não é o checkout atual: SHA-256 público/local diverge em `project-hub-live.js` (`7e248f6d…` / `3b49fb3c…`), `project-hub-live.css` (`519e0aa2…` / `c0c8044b…`) e `index.html` (`e8d05583…` / `dc7777fb…`). A nova galeria, as relações de família e o vínculo PC↔VPS estão apenas no checkout; a página servida continua sem expor `MEUS PROJETOS`.
- Nenhum deploy foi realizado. O catálogo Windows não está instalado na VPS e a ponte local autenticada ainda não existe; portanto, publicar somente a camada visual não faria os 41 workspaces aparecerem nem permitiria abrir as pastas do PC.
