# GRG SPACE ↔ BAI — mapa de integração (21/10/2026)

Leitura de código local em `C:\projetos\BROWSER INSTANCE` e no backend GRG. Nenhuma instância, perfil, cookie, proxy, processo ou configuração foi alterado.

## Capacidades observadas no BAI desktop

| Área | Implementação encontrada | O que comprova | Limite atual |
|---|---|---|---|
| Navegador | `src/main/browser.ts` usa Playwright `launchPersistentContext`, mantém `contexts` e `jobs`, aplica proxy/configuração local e restaura o perfil Chromium | O BAI pode abrir e controlar navegadores no próprio host | Contexto e janela não são acessíveis ao GRG remoto; não há stream remoto de imagem/janela comprovado |
| UI nativa | `src/main/preload.ts` expõe `window.bai` por IPC: `snapshot`, `create`, `start`, `stop`, `runFlow`, `cancelFlow`, diagnósticos e operações de perfil | O desktop tem contrato local para listar/criar/operar instâncias e fluxos | API Electron não é uma API HTTP/WebSocket do GRG e só existe dentro da aplicação BAI |
| Persistência | Perfis Chromium usam pasta persistente; o BrowserService captura cookies ativos e agenda gravação local | A sessão do navegador pode continuar no BAI entre execuções | Cookies são credenciais; não devem ser incluídos em logs, telemetria, screenshots compartilhadas ou sincronização GRG |
| Android/Windows | `server/agent.ts` aceita tipos `browser`, `windows`, `android`, ação `start`/`stop`, UUID e expiração de lease | Há um contrato restrito para despachar operações a um host autenticado | O callback exige mapear UUID a recurso local; não foi encontrado callback integrado ao Electron/driver nem supervisor persistente de lease |
| Equipe/API | `server/api.ts` autentica tokens Bearer, rejeita origem de browser e permite retirar tarefa/registrar resultado | A API é destinada a clientes nativos autenticados e opera com payload limitado | Não é uma API de controle direto do navegador; não expõe heartbeat de runtime, lista de janelas, screenshots ou viewer |
| Fênix | `grg/src/browser/bai-adapter.js` consulta status/metadados de perfis e declara `runningInstances`, heartbeat, automações e jobs como `NOT_EXPOSED_BY_BAI_API` | O GRG sabe distinguir capacidades ausentes | O adapter do backend não pode ver o estado em memória do BAI desktop |

## Fluxo atual e lacunas

```text
Operador → BAI Electron → IPC → BrowserService/driver local → perfil e janela no PC

Fênix → BaiAdapter → API metadata do BAI → perfis/configuração

API de equipe → fila de tarefas com lease → pollAgentOnce → callbacks locais obrigatórios
                                                     └─ sem integração com BrowserService comprovada
```

Não existe, neste checkout, um caminho comprovado entre a janela local BAI e o Inspector/Cidade da VPS. `pollAgentOnce` é uma rodada explícita; não é um daemon, não reconstrói sessões e não tem mecanismo de screenshot/viewer. Portanto, o Fênix não deve exibir instância BAI como ativa ou controlável apenas por conhecer o perfil.

## Próxima implementação segura

1. Criar um conector local opt-in no BAI, com pareamento revogável e conexão de saída autenticada; sem abrir um endpoint HTTP de controle para a rede.
2. Mapear IDs remotos a instâncias locais já cadastradas e validar tipo/host/lease antes de start/stop. Rejeitar caminhos, argumentos, URLs, configuração e comandos enviados pelo servidor.
3. Persistir no host o prazo de lease e o estado da tarefa; após reinício, reconciliar e parar uma instância cujo lease venceu antes de reportar resultado.
4. Publicar somente metadados seguros (ID opaco, estado observado, timestamps, tarefa correlacionada). Nunca enviar cookies, storage state, proxy com credenciais, senha, perfil bruto ou token de sessão.
5. Para visualização, começar com captura sob demanda redigida e autorizada, com retenção curta; um viewer remoto contínuo exige desenho separado de transporte, ACL e auditoria.
6. Adicionar estados `CONFIGURED`, `PAIRED`, `ONLINE`, `RUNNING`, `STOPPED`, `LEASE_EXPIRED`, `ERROR` e `UNKNOWN` com fonte/timestamp. Ausência de heartbeat é `UNKNOWN`, não `OFFLINE` presumido.
7. Testar start/stop reais, duplicação, lease expirado, perda de conexão, restart do BAI e redaction antes de habilitar qualquer operação pela VPS.

## Aceite da integração

- O Fênix só indica runtime online após heartbeat assinado do conector pareado.
- Um comando remoto só conclui depois de ACK do host e observação do estado do BrowserService/driver.
- Ao expirar ou perder lease, o host aplica a política de stop persistente e registra o resultado.
- Operador consegue abrir uma instância/viewer autorizada sem expor a sessão em URLs, logs ou eventos gerais.
- Controles ficam ocultos/desabilitados e indicam motivo quando o BAI não está pareado ou o host está ausente.

## Estado

- Leitura de código BAI e Fênix: **PASS**.
- Leitura local em 22/10/2026: `globalBaiAdapter.getStatus()` respondeu **UNCONFIGURED** sem chamar o BAI; a API não está pareada/configurada neste ambiente. O workspace `C:\projetos\BROWSER INSTANCE` está em `feat/browser-agent-instance`, com os arquivos do projeto ainda não rastreados no Git; nenhum arquivo desse workspace foi alterado.
- Pareamento Fênix↔BAI: **PENDING** (não implementado).
- Execução remota real no BrowserService: **PENDING** (callbacks não integrados).
- Heartbeat e telemetria de instância: **PENDING**.
- Viewer/screenshot remoto: **PENDING**.
- Compartilhamento/armazenamento de cookies: **FORBIDDEN** para a integração padrão.
