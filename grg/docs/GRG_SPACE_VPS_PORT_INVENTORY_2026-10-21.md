# GRG SPACE — inventário de portas e hosts (21/10/2026)

Levantamento somente de leitura da VPS e do catálogo local. Este inventário descreve o que foi observado; uma porta configurada não comprova que todos os fluxos da aplicação estejam funcionais. Nenhuma porta foi reatribuída.

## Entradas confirmadas

| Entrada | Serviço/host | Evidência observada | Estado |
|---|---|---|---|
| `:80` | OpenResty; host público sem porta `209.50.241.22` | Página de login GRG. `/app` responde com o shell SPA. O host padrão encaminha o root para `/www/zapai-acme`. | `OBSERVED` |
| `:3000` | Frontend GRG SPACE | `http://209.50.241.22:3000/app` responde HTTP 200; assets servidos de `/opt/fenix-os/public`. `#city` autenticado apresenta 39 agentes, 9 edifícios medidos e zero jobs ativos durante a captura. | `OBSERVED` |
| `:3001` | API Platform (Docker, porta interna 3000) | `/health` responde; API autenticada exige sessão/token. | `OBSERVED` |
| `:8081` | Dashboard API Platform (Docker, porta interna 80) | Binding publicado no host. Não confundir com o frontend GRG. | `CONFIGURED` |
| `:1000` | ZAI via TLS/OpenResty para upstream `127.0.0.1:4025` | HTTP simples retorna 400, consistente com listener SSL; `/attendants` está aberto em sessão do navegador. Catálogo Windows associa esta porta ao host local, escopo distinto da VPS. | `CONFIGURED`; upstream direto inconclusivo |
| `:4025` | Upstream ZAI observado na configuração OpenResty | Conexão direta do usuário `deploy` expirou; não permite concluir que o proxy esteja indisponível. | `UNKNOWN` |
| `:8000` | Backend Gerar Ficha no catálogo local | `GET /health` respondeu 200, serviço `projeto-ficha-backend`, versão `1.1.0`; raiz `/` retorna 404. | `OBSERVED` |
| `:5432`, `:5433`, `:6379`, `:6380`, `:4401`, `:4402`, `:4410`, `:4420`, `:4430`, `:2090`, `:38197` | Listeners do host/container | Presentes em `ss -ltn` ou configuração. Mapeamento para produto/consumidor não foi comprovado neste levantamento. `:4402` aparece como upstream de identidade no OpenResty. | `UNKNOWN` salvo `:4402` configurada |

## Arquitetura e limites observados

- `:3000` serve o frontend existente; a porta pública sem sufixo usa outro virtual host e não deve ser tratada como substituta do frontend.
- OpenResty atende HTTPS `:443` e encaminha rotas selecionadas para API Platform (`:3001`), identidade (`:4402`) e frontend (`127.0.0.1:3000`). A porta `:1000` é TLS para ZAI.
- PM2 não listou processos gerenciados. A API Platform está em Docker. O usuário `deploy` não tem `sudo` não interativo; não foi feito restart nem alteração de firewall/portas.
- `C:\Users\Dell\Desktop\PROJETOS` é um catálogo no host Windows. A VPS não pode acessar diretamente seus caminhos `C:\`; o Project Hub deve identificar explicitamente o host em que cada porta/pasta existe. Integração local exige um connector/agente local autenticado, ainda não comprovado aqui.
- Medição 21/10/2026 21:29 UTC: raiz 89 GB/99 GB (~95%), 5,6 GB livres; memória disponível ~797 MB de 5,9 GB e swap usado ~2,3 GB. `llama-server` usava ~1,8 GB RSS; dois processos Node Fênix ~406 MB e ~384 MB. Container stats na amostra não mostraram CPU permanentemente saturada.
- `docker system df` reportou 23,44 GB em imagens e 9,8 GB como reclaimable; 19 GB em `/opt` (ZAP AI 10 GB, ComfyUI/modelos ~6,5 GB, Fênix OS 884 MB, AI Engine 445 MB). `df` reporta 89 GB usados, enquanto `du` visível ao usuário `deploy` soma ~30 GB em `/`; parte do uso não está acessível nessa conta ou em seus mounts. Não executar prune, limpeza ou compactação sem inspecionar propriedade, retenção e rollback dos artefatos.

## Mudanças seguras já publicadas nesta rodada

- Somente arquivos estáticos do frontend em `/opt/fenix-os/public` foram trocados atomicamente, com cópias prévias em `/home/deploy/grg-space-rollback/2026-10-21T2105-hidden-modal/`, `2026-10-21T2115-modal-cache/` e `2026-10-21T2130-projecthub-lazy/`.
- Nenhum serviço foi reiniciado; nenhum binding, firewall, segredo ou dado de usuário foi alterado.
- O modal de aprovação fechado deixou de aparecer na árvore acessível depois da recarga.
- O Project Hub carregou seus sete projetos ao entrar em `#projects`; as consultas detalhadas por workspace deixaram de iniciar quando `#city` está aberta.

## Pendências para evolução

1. Identificar os donos e consumidores das portas `UNKNOWN` antes de mapear ou alterar bindings.
2. Investigar o polling global `/api/fenix/projects` observado a cada ~15 s, mesmo na Cidade.
3. Medir FPS, long tasks, heap e chamadas de rede por cinco minutos na Cidade, em sessão limpa e autenticada.
4. Criar integração local segura para expor catálogo e workspaces Windows ao Project Hub sem fingir que estão montados na VPS.
5. Mitigar o risco de disco/RAM somente após análise de diretórios, volumes e política de retenção; preparar e testar rollback antes de qualquer limpeza.
