# GRG SPACE — auditoria incremental de estabilidade

Data: 2026-10-21  
Escopo: Cidade 3D, viewport compacto, catálogo local de projetos e versão aberta na VPS. Em 20:50 UTC foi publicado um patch estático mínimo; não houve restart nem reboot.

## Achados confirmados

| ID | Estado | Evidência | Correção / próximo passo |
|---|---|---|---|
| UI-143 | FIXED no checkout | Teste reproduziu pixel ratio `1.25` depois do resize em viewport compacto, apesar do limite de inicialização `1`. | `resize()` mantém o orçamento por classe de viewport e ignora geometria inalterada. Publicação e medição na VPS pendentes. |
| UI-144 | FIXED no checkout | Portas e caminhos `C:\` do catálogo apareciam sem indicar em qual máquina eram válidos. | Project Hub nomeia `Host do catálogo` e explica que a VPS não acessa pastas do PC. Publicação pendente. |
| UI-142 | PARCIALMENTE CORRIGIDO | Antes do patch, World 3D público `A78F09F494E0819A`; o checkout contém outras diferenças amplas. CSS do modal e IDE ainda diferem. | Patch estreito publicado com cache-buster; bundle público completo ainda não corresponde ao checkout. |
| UI-145 | VERIFIED na VPS (21/10) | O modal de aprovação inativo aparecia na árvore acessível. | CSS cache-busted publicado; depois da recarga, o modal fechado sumiu da árvore acessível. A abertura com uma aprovação real ainda não foi exercitada. |
| UI-146 | FIXED no checkout | O drawer V8 oculto carregava jobs/projetos ao iniciar e continuava polling de jobs a cada 20 s e projetos a cada 60 s. | Cargas passam a iniciar na abertura do drawer e polling só ocorre enquanto aberto e documento visível. VPS pendente. |
| UI-147 | FIXED na VPS; medição prolongada pendente | Em 0 jobs, o renderer público movia elementos decorativos; viewport Codex usava DPR ~1,1 e 24 FPS compactos. | Movimentos agora dependem de estado real; 16 FPS e DPR 1 no compacto. Render/fps por cinco minutos permanece pendente. |
| UI-148 | VERIFIED na VPS | Evento obsoleto de navegação iniciava o Project Hub em `#city`, gerando seis chamadas detalhadas por workspace. | A hidratação agora exige hash e view ativos coerentes; catálogo carrega ao entrar em Projetos. |
| UI-149 | VERIFIED na VPS | Cockpit carregava projetos, jobs e missões mesmo na Cidade. | Listas ficam restritas ao dashboard; a Cidade mantém health e snapshot. |

## Estado ao vivo observado

Na aba aberta em `http://209.50.241.22:3000/app#city`, o canvas 3D permaneceu na Cidade por mais de 15 segundos, com 39 agentes, 9 prédios medidos e 0 jobs ativos. O loop de carregamento relatado pelo operador não apareceu nessa janela. Antes do patch, o canvas media 716×969 CSS e tinha buffer 786×1065. Depois, `readyState=complete`, sem avisos de carregamento visíveis, e o buffer passou a 715×969. Duas capturas após a publicação, separadas por 3 s, mostraram o mapa estável. O console não teve erros; manteve apenas o aviso de depreciação do Three.js. Isso não mede FPS, long tasks, heap ou estabilidade por cinco minutos.

## Mudanças locais desta fatia

- `public/fenix-world-3d.js`: resize mantém limite compacto de pixel ratio; repetições com dimensões e escala idênticas não repetem `setSize`/`setPixelRatio` nem recalculam câmera.
- `public/fenix-v8-ui.js`: drawer escondido deixou de buscar jobs/projetos em segundo plano; atualiza ao abrir e somente mantém polling se visível.
- `public/index.html`: cache-busters atualizados para as mudanças de Cidade e Project Hub.
- `public/project-hub-live.js`: origem das portas locais e limite de acesso a pastas do PC ficam explícitos.
- `docs/GRG_SPACE_VISUAL_BUG_BACKLOG.md`: bugs UI-143 e UI-144 adicionados com critérios objetivos de fechamento.
- Publicação VPS: patch isolado de `fenix-world-3d.js` e cache-buster em `index.html`. O arquivo servido passou a hash `0857EDB42E57A0408ED4835399956E9B648F1EF303E6BE3AE35ADFB7AD2A9194`; o HTML passou a `9AC7C0D33CA340E677E7D4E63982A5ECBF8D9272CFE9919630D795BF2E0C7632`. Backup prévio e rollback: `/home/deploy/grg-space-rollback/2026-10-21T2050-idle-city/`.

## Verificação

`node --test test/fenix-v8-polling.test.js test/local-project-catalog-ui.test.js test/project-ide-preview-url.test.js test/city-world3d-view-lifecycle.test.js test/city-render-budget.test.js test/city-world3d-refresh-single-flight.test.js test/task-modal-no-placeholder.test.js` — 30/30 aprovados.

Depois da correção de movimento ocioso, a suíte focada passou 19/19 (`city-render-budget`, `city-codex-viewport-performance`, `city-world3d-view-lifecycle` e `city-world3d-refresh-single-flight`). O bundle publicado passou `node --check`; asset e aplicação retornaram HTTP 200. Não foi executado perfil de navegador de cinco minutos.

`node --check public/project-hub-live.js` e `node --check public/fenix-world-3d.js` — aprovados. O teste de navegador do catálogo percorreu 375, 768, 1280 e 1920 px sem overflow horizontal no detalhe do projeto.

## Limites e próxima prioridade

O frontend estático servido em `/opt/fenix-os/public` foi identificado; o usuário `deploy` escreve os dois arquivos publicados e a restauração usa os backups citados. A publicação não reiniciou serviços. Próxima prioridade: medir por cinco minutos FPS, long tasks e heap em sessão limpa e autenticada, repetir Cidade → Projetos → Cidade, e validar um job real sem mudar a representação idle.

## Atualização — 21/10/2026, validação no Codex

- `#city` permaneceu aberta após navegação Projetos → Cidade. A cena apresentou 39 agentes, 9 prédios medidos, zero jobs ativos, minimapa e controles; não houve loader visível nesta observação curta. A geometria ainda precisa de correção: a torre central está cortada pelo limite superior e o mapa ocupa quase todo o viewport compacto.
- UI-145 foi publicado e verificado: após recarga, o modal inativo não aparece mais na árvore acessível. Cache-buster público `fenix-task-modal.css?v=20261022-modal-a11y-1`; SHA `b7b3cd18a67face5aa5260b6229c690d6a554ed69af9230c4ffecff48514bab2`.
- Project Hub não inicia mais hidratação pesada fora de `#projects`. O browser autenticado abriu o catálogo sob demanda e mostrou sete projetos, cinco workspaces vinculados e 718 entradas Screen DNA no Fênix OS. Asset `project-hub-live.js?v=20261022-lazy-init-1`; SHA `1322ca228e755680b7b1619268e43073a2f8a99375c604cd9d09533f31c20fa1`.
- A lista `/api/fenix/projects` ainda apareceu no console aproximadamente a cada 15 segundos enquanto a Cidade estava visível. É um consumidor distinto do Project Hub; origem precisa ser rastreada antes de remover, pois o mapa usa snapshots de projetos.
- Testes nesta rodada: Project Hub lazy startup, navegação/Screen DNA do catálogo e modal sem placeholder — 8/8 passaram. O teste RED reproduziu seis chamadas ocultas antes da correção.
- Nenhum restart/reboot. Backups em `/home/deploy/grg-space-rollback/2026-10-21T2105-hidden-modal/`, `2026-10-21T2115-modal-cache/` e `2026-10-21T2130-projecthub-lazy/`.
- Estabilidade completa continua pendente: não houve perfil de cinco minutos de FPS/heap/long tasks, validação em 375/768/1280/1920 nesta build nem atribuição confirmada do polling residual. O backlog registra UI-148; as portas e escopos de host estão documentados em `GRG_SPACE_VPS_PORT_INVENTORY_2026-10-21.md`.
- Atualização posterior que substitui as observações preliminares acima: após detectar e corrigir o evento obsoleto do Project Hub e a hidratação do cockpit, dois ciclos de 15 s em `#city` mostraram somente `/runtime/snapshot` (224–409 ms), sem `/api/fenix/projects`, `/api/v2/jobs` ou `/api/missions`. Abrir Projetos continuou trazendo os sete projetos, cinco workspaces e 718 telas Screen DNA. A recarga manteve 39 agentes, 9 prédios medidos e 0 jobs; a torre ainda fica cortada no topo em viewport compacto.
- Os testes do Project Hub, Screen DNA e modal passaram 8/8; o novo teste do cockpit passou 1/1. RED reproduziu tanto as seis consultas ocultas quanto o evento de navegação obsoleto. Rollbacks: `/home/deploy/grg-space-rollback/2026-10-21T2140-city-cockpit-poll/` e `/home/deploy/grg-space-rollback/2026-10-21T2150-projecthub-viewguard/`. Nenhum restart/reboot.
- Leitura da VPS às 21:29 UTC: disco 95% (5,6 GB livres), RAM disponível ~797 MB, swap usado ~2,3 GB. `llama-server` ocupava ~1,8 GB RSS; dois Node Fênix, ~406/384 MB. CPU não estava saturada na amostra. Docker reportou 9,8 GB de imagens potencialmente reclaimable, mas nada foi removido; `/` tinha 89 GB reportados por `df` e ~30 GB contabilizados por `du` como `deploy`, divergência pendente de inspeção com permissões adequadas.

### Atualização 21/10/2026 — Cadência do renderer da Cidade

- A VPS servia uma versão antiga do bundle 3D: ela limitava o desenho, mas ainda acordava no refresh de tela. Publicado hotfix estático para 16 FPS compacto/24 FPS desktop, com um timer/RAF em voo e limpeza ao desmontar; cache-buster `20261021-cadence-stability-2`.
- Backup antes da publicação: `/home/deploy/grg-space-rollback/2026-10-21T2135-city-frame-scheduler/`; hashes de origem conferidos antes da substituição. Nenhum restart/reboot.
- Testes focados: 32/32 passaram, incluindo cadence, ciclo de vida, refresh compartilhado e carga de polling. Smoke test no browser recuperou dados da Cidade após uma leitura transitória: 39 agentes, 9 prédios, 0 jobs e 0 falhas; console sem erros JavaScript.
- A medição contínua de 5 minutos de FPS/heap/long tasks segue pendente; não inferir redução de lag com base em uma captura ou no CPU da VPS.
- Perfil curto adicional: 30 s contínuos sem loader recorrente e sem perda do snapshot (39 agentes/9 prédios). O ticker mostrou CPU 2% e RAM 82%, que são métricas do host; isso não mede FPS ou lag local.
- Teste de navegação após o soak curto: `#city` → Projetos (`#projects`) → World (`#city`) concluiu sem loader; o snapshot continuou em 39 agentes/9 prédios/0 jobs. A captura final mostra o mapa ativo. Esse ciclo cobre uma troca de rota, não uma sessão de cinco minutos.

## Atualização — controles da câmera WebGL (21/10/2026)

- Causa confirmada ao vivo: `iso-city.js` interrompia `bootIsoCity()` quando `FENIX_WORLD_3D` estava ativo antes de registrar os handlers usados pelos controles de escala. Os handlers de giro/reset também chamavam somente a instância 2D `fenixCity`, ausente no modo WebGL.
- Correção estática publicada em `/opt/fenix-os/public/iso-city.js`; o HTML versiona `iso-city.js?v=6-world-camera-controls` e encaminha giro/reset aos adaptadores WebGL. Backup reversível em `/home/deploy/grg-space-rollback/2026-10-21T-world-camera-controls/`; nenhum processo reiniciado.
- Teste local focado: 31/31 testes de câmera, escala, ciclo WebGL e cadência passaram. `node --check` e `git diff --check` passaram.
- No navegador autenticado foram acionados Universo, Ilha, De Perto, zoom +, rotação e reset. A câmera mudou em cada controle, o indicador mostrou distância atual e o reset marcou `1.00x`. O minimapa manteve 39 agentes e 9 prédios medidos; console sem erros.
- Limite: isso fecha os controles inoperantes; não mede FPS/heap por cinco minutos nem elimina a limitação visual do foco de perto em agente situado junto a uma fachada. A investigação de desempenho prolongado continua pendente.
