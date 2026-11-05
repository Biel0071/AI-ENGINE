# GRG SPACE — inventário vivo de projetos e portas

**Coleta:** 21/10/2026, aproximadamente 21:02–21:16 BRT  
**Escopo:** leitura da VPS `209.50.241.22`, checkout local e launcher `C:\Users\Dell\Desktop\PROJETOS`.  
**Método:** HTTP/TLS, SSH em modo somente leitura, `ss`, `docker ps`, hashes SHA-256 e inspeção do catálogo local. Nenhuma porta, processo ou dado foi alterado.

## Estado confirmado

| Produto/serviço | Porta e origem | Evidência nesta coleta | Leitura correta |
|---|---|---|---|
| GRG SPACE | `:3000` público | `/health` HTTP 200; página `/app#city` aberta e autenticada | Frontend Gateway ativo. O processo backend Fênix atende `/health` em `127.0.0.1:4410`; `:4400` não tinha listener. |
| Entrada HTTPS principal | `:443` | HTTPS HTTP 200; `:80` redireciona (308) | OpenResty encaminha o acesso principal ao gateway. |
| ZapAI CRM | HTTPS `:1000` | HTTPS HTTP 200; HTTP sem TLS responde 400 | Porta é TLS, não HTTP simples. API `:4025/health` responde HTTP 200 no próprio host, mas não foi acessível deste cliente externo durante a coleta; requer investigação de firewall/ACL/rota. |
| API Platform | `:3001` | `/health` HTTP 200 externamente; container API ativo | Porta pública direcionada ao container API. |
| API Platform Dashboard | `:8081` | `/` e `/health` HTTP 200; container ativo | Dashboard exposto em porta própria. |
| Gerar Ficha | `:8000` | `/docs` e `/health` HTTP 200; `gerar-ficha.service` ativo | Serviço FastAPI/Uvicorn ativo. |
| Keycloak | `172.17.0.1:4402` | listener observado no bridge do host | Não equivale a uma porta pública. |
| Serviços ainda sem identidade confirmada | `:4401`, `:4420`, `:4430`, `:2090`, `:11434` | listeners observados; `:4420` e `:4430` retornam 200 em `/health`; `:4401` sem resposta HTTP em `/health`; `:2090` responde 400 em `/`; `:11434` não responde a `/health` | Manter como **não mapeados** até identificar processo, dono, protocolo e consumidores. Não reaproveitar essas portas. |

## Processos e confiabilidade do release

- O host executa `/opt/fenix-os/grg/src/server.js`, `/opt/fenix-os/frontend-gateway.js` e `/opt/fenix-os/grg/src/runtime/worker.js` como processos Node no host; o `docker ps` não mostrou container de aplicação Fênix. Bancos/Redis/Qdrant/MinIO e serviços da API Platform estão em containers.
- O gateway define `PUBLIC_DIR=/opt/fenix-os/public`; essa é a raiz dos assets ativos (não `/opt/fenix-os/grg/public`). SHA-256 observado na VPS: `index.html` `3750eab6ce0aaba660e68ea3d5cf1f1820a4c6b24cbccbb4d6d1336431db083e`, `project-hub-live.js` `7e248f6d91c5349f45b523bc87e1adaec42adba33753b8a0ef0c3191cd1c129e`, `unified-app.js` `5e5b2c88342a5a1ea138951fa2efc4fabbb9e97b54f07f742868de8099b70aba`. Esses hashes não correspondem aos arquivos locais `grg/public/`; a página servida usa `project-hub-live.js?v=20261022-lazy-viewguard-2`.
- `/opt/fenix-os` não contém metadados Git. O checkout de referência local está na branch `fenix/operational-os-20260924`, commit `bb57b6ad` (14/10/2026). Os SHA-256 do `server.js` e `frontend-gateway.js` locais diferem dos arquivos em execução no diretório de produção. **Não há base para publicar o checkout local por cima do runtime atual sem reconciliação e rollback.**
- O processo Fênix respondeu no loopback `127.0.0.1:4410`; o catálogo ainda contém o campo legado `containerPort: 4400`. Essa porta antiga não está ativa nesta instalação.
- As rotas `/api/v2/living-city/state`, `/api/v2/living-city/world-state`, `/api/v2/agents/agent-api-ops/inspector` e `/api/v2/projects-registry` responderam `401` sem sessão. Isso confirma que o caminho está protegido, não que esteja quebrado; na aba autenticada atual a Cidade renderizou 39 agentes e o Inspector abriu `agent-api-ops`.
- O Inspector autenticado ainda deixa projeto, missão, ação recente e último evento como “Não informado”. Não foi possível associar esses campos a telemetria real nesta coleta.
- Disco raiz: 89 GB usados de 99 GB, 5,5 GB livres (95%). Uma amostra de monitoramento variou entre 83% e 94% de RAM durante a inspeção. São sinais para medir novamente antes de implantação, reinício ou adicionar renderização pesada no servidor.

## Catálogo de projetos: lacuna de integração

- `C:\Users\Dell\Desktop\PROJETOS\projetos.json` contém **41 entradas**. O Project Hub ativo informa **7 projetos registrados**.
- O catálogo local é resolvido por `os.homedir()/Desktop/PROJETOS/projetos.json`; no host Linux isso significa o diretório do usuário da VPS. O arquivo esperado `/root/Desktop/PROJETOS/projetos.json` não existe. Portanto, o catálogo Windows não está ligado ao Project Hub remoto nesta instalação.
- O launcher local contém projetos, variantes e atalhos sem porta, versão ou comando de execução medidos. A interface deve preservar a distinção entre **principal**, **variante**, **pasta sem runtime**, **configurado** e **verificado ao vivo**.
- Portas pretendidas confirmadas para serviços atuais: Fênix UI `3000`; ZapAI UI TLS `1000` e API `4025`; Gerar Ficha `8000`; API Platform API `3001` e Dashboard `8081`. Não é necessário mover essas portas para satisfazer esse mapa. O estado externo de `4025` permanece discrepante.

## Prioridades de evolução

1. **P0 — Release e VPS:** preservar backup verificável; relacionar hash de cada arquivo servido ao commit/build; medir disco/RAM novamente; explicar os listeners sem identidade; resolver a divergência de `4025`.
2. **P1 — Project Hub e IDE:** adicionar pareamento local autenticado para o launcher Windows. Sincronizar metadados mínimos (ID, nome, versão declarada, tipo, logo, portas, origem e caminho permitido); executar `abrir pasta` e IDE no agente local, sem fingir que a VPS acessa `C:\`.
3. **P1 — Portas:** modelar separadamente endereço de bind, porta do host, porta de container, protocolo, URL, health check, processo/proprietário, ambiente (PC/VPS), origem da evidência e horário de medição. Configuração não é status.
4. **P1 — Cidade:** gerar prédio/andar/sala a partir de dados reais de projeto e tarefas. Hoje andares/cômodos são em parte conteúdo estático da cena; a maioria dos prédios é exterior genérico. Vincular a posição e o estado do avatar ao agente/job reais.
5. **P2 — Avatar e telemetria:** pipeline GLB/glTF/rig compatível com a engine atual e uma timeline com timestamps, correlação da missão/job, ferramenta, resultado e instância BAI. Movimento só acompanha transições reais; sem execução, mostrar estado ocioso.
6. **P2 — Capacidade:** manter renderização 3D no navegador e fazer benchmark em cenas representativas. Não adicionar carga 3D/IA à VPS com disco acima de 90% e amostras de RAM acima de 80% sem medir headroom.

## Itens que continuam pendentes

- Identificar proprietário e protocolo dos listeners `2090`, `4401`, `4420` e `4430`.
- Investigar por que `4025` responde no próprio host mas não neste cliente externo.
- Revalidar a identidade e a atividade do agente no Inspector autenticado; dados ausentes devem continuar indisponíveis até a fonte real publicá-los.
- Obter manifesto/build id e hash dos assets estáticos servidos por `:3000`; correlacionar com o bundle e backend em execução.
- Desenhar e implementar pareamento local do Project Launcher/IDE, com escopo de pastas permitido e autenticação revogável.
- Resolver previamente a exposição de segredos encontrada na interface/exportação do Browser Instance e criptografar backups de sessões antes de sincronizar perfis ou cookies.
- Reproduzir o fluxo de agente e instância BAI ponta a ponta antes de mostrar janela ou atividade ao vivo na Cidade.

## Correção local associada a este inventário

O catálogo estático não deve apresentar respostas HTTP de uma leitura antiga como disponibilidade atual. O Project Hub agora rotula leituras vencidas como **históricas** e configurações sem leitura como **não medidas**. A checagem de saúde da aplicação permanece separada do teste de cada binding.

O runtime da Cidade também preserva agora o andar numérico `0` e mantém `WORKING` somente quando existe um alvo de movimento medido; um agente `WORKING` sem job ativo nem rota publicada continua sendo normalizado para `AVAILABLE`.

## Adendo de evolução — estrutura e atividade (21/10/2026)

- O mapeamento completo do catálogo `C:\Users\Dell\Desktop\PROJETOS` está em [`GRG_SPACE_PROJECT_CATALOG_2026-10-21.md`](GRG_SPACE_PROJECT_CATALOG_2026-10-21.md): 41 IDs únicos, caminhos locais, presença de pastas, versão de pacote, portas e URLs configuradas. A amostra de listeners é datada e não equivale à disponibilidade atual.
- O limite da integração entre Fênix e Browser Instance (BAI) está em [`GRG_SPACE_BAI_INTEGRATION_MAP_2026-10-21.md`](GRG_SPACE_BAI_INTEGRATION_MAP_2026-10-21.md): UI local de browser funciona por IPC, enquanto pareamento, heartbeat e viewer remoto ainda estão pendentes.

- O Inspector de edifícios agora apresenta andares e salas que existirem no registro canônico, com “Sem salas cadastradas” para lacunas; o foco de andar chama `fenixCity.enterBuilding` com o ID real do edifício e o índice persistido. É projeção de dados, não nova geometria 3D nem cadastro automático de salas.
- A camada 2.5D tinha fallback silencioso que abria `dev-loft` para edifício sem blueprint. O fallback foi removido localmente; só há aliases para `bld-fenix-hq` e `bld-dev-loft`, e andares além da planta visual são indicados sem botão de foco. `bld-api-platform` não tem planta visual medida nesta versão.
- O Inspector de agentes agora consulta a trilha autenticada do EventBus e só associa eventos quando o payload traz explicitamente o ID do agente selecionado. Eventos ausentes permanecem ausentes; a chamada tem timeout de 3 segundos.
- As capturas de 21/10 mostram um dashboard de QA com 16 telas e 17 aprovadas. O snapshot local da mesma data informa 15 telas e bloqueio de navegação em `127.0.0.1:4400`. São execuções/builds não reconciliados; nenhuma certificação global pode ser inferida desses números.
- O adapter BAI local ainda não expõe instâncias em execução, heartbeat do executor, jobs nem viewer. Cookies são dados privados do perfil e não devem ser mostrados na Cidade nem enviados ao backend Fênix.
- Mudanças acima são somente locais. O bundle que atende a VPS diverge do checkout; publicação permanece pendente de reconciliação de versão e rollback verificável.
