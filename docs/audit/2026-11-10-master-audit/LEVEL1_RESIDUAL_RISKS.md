# LEVEL1_RESIDUAL_RISKS — FÊNIX OS

Data: 2026-11-10. O que continua aberto depois do LEVEL 1, com motivo e dono.

| # | Risco | Por que não foi fechado no LEVEL 1 | Dono | Onde fecha |
|---|---|---|---|---|
| R1 | **Produção não verificada.** A VPS respondia `environment: development`; nada foi implantado | regra do LEVEL 1: sem deploy, sem testes contra a VPS | proprietário | `LEVEL1_DEPLOYMENT_PLAN.md` |
| R2 | **Segredos comprometidos continuam válidos** até a rotação | rotação externa é do proprietário | proprietário | `LEVEL1_SECRET_ROTATION_CHECKLIST.md` |
| R3 | **Histórico do git ainda contém os segredos** (commit `58a934c9` e anteriores) | reescrita de histórico exige force-push e decisão do dono | proprietário | checklist §2 |
| R4 | A senha do `grg-admin` pode ter sido regravada por terceiros via backdoor | só verificável nos `auditEvents` da produção | proprietário | checklist item 1 |
| R5 | Rotas de **leitura** antes da autenticação vazam dados entre tenants (`/api/runtime/ai/usage`, `/api/estimates`, `/api/v2/health/*`, `/api/runtime/services`) | são leitura, não escrita/execução (Gate C); estavam no LEVEL 2 do roadmap (BUG-008) | LEVEL 2 | BUG-008 |
| R6 | Admin (`runtime:admin`) ainda pode rodar `npm test` / `npm run <script>` num projeto do workspace, o que executa código do `package.json` desse projeto | é a funcionalidade legítima do Reality Operator; agora exige admin, sem shell, sem metacaracteres e dentro do workspace | aceito | — |
| R7 | `projects/add` do Reality Operator permite a um admin registrar um projeto em qualquer pasta, e essa pasta passa a ser "workspace" | ação administrativa; protegida por `runtime:admin` | LEVEL 3 (registro de projetos único) | BUG-015 do roadmap |
| R8 | `unhandledRejection` é registrado mas **não derruba** o processo por padrão (`FENIX_FATAL_ON_UNHANDLED_REJECTION=1` torna fatal) | evitar loop de reinício por rejeições antigas ainda não mapeadas (há 272 `catch {}` vazios) | LEVEL 2 | ST2 |
| R9 | `runtime/worker.js` não instala o tratador fatal (usa o comportamento padrão do Node, que já encerra em exceção não tratada) | o worker não tinha tratador que engolia exceções; nada a corrigir no LEVEL 1 | — | — |
| R10 | O gate central de escrita autoriza pelo **papel** (viewer/employee nunca escrevem). Rotas de escrita sem `authorize` específico ainda aceitam qualquer papel com alguma permissão de escrita (ex.: subadmin) | granularidade por rota é trabalho de LEVEL 2/3 (34 arquivos, ~533 pontos de escrita) | LEVEL 2 | BUG-008 |
| R11 | Varredura de rotas cobre **341 rotas literais**; rotas por regex são cobertas pelo gate central (provado por amostra), não individualmente | extração estática de regex de rota não é confiável | aceito | — |
| R12 | (ver R16) | — | — | — |
| R13 | Bootstrap em produção **regrava a senha do admin a cada boot** com `FENIX_BOOTSTRAP_ADMIN_PASSWORD` (alteração local preexistente, preservada) | é o mecanismo de recuperação escolhido pelo dono; agora exige senha forte | aceito, documentado | — |
| R14 | Senha root da VPS registrada como exposta em sessão anterior | fora do repositório | proprietário | checklist item 10 |
| R15 | Arquivos de credenciais na raiz `C:\projetos\ai-engine-core` (fora do git) | apagar é irreversível; decisão do dono | proprietário | checklist itens 6–9 |
| R16 | **OIDC por HTTP no IP público.** Emissor e JWKS em `http://<IP público>` (`.env.production` local); o verificador aceita HTTP por decisão anterior (commit `ba2285df`). Login do navegador e busca de chaves sem TLS: risco de interceptação e de chaves forjadas. Token sem assinatura já é rejeitado | mudar o código sem TLS no Keycloak quebraria o login de produção | proprietário (publicar Keycloak por HTTPS no openresty da porta 443, depois exigir HTTPS no verificador) | P1 |
| R17 | `agents/agent-workspace-executor.js:46-57` faz `git init` + commit em qualquer pasta de projeto sem `.git` própria (criou `grg/.git` durante a suíte) | não é segurança de acesso; correção é de estabilidade | LEVEL 2 | BUG-039 |
| R18 | 101 testes ainda falham (preexistentes) | LEVEL 2 | LEVEL 2 | — |
