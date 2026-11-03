# FÊNIX OS — 150-SCENARIO CERTIFICATION SPECIFICATION
> **Matriz de Certificação Holística & Bateria de Validação Automatizada**  
> Identificadores: `TEST-001` a `TEST-150` | Cobertura: 11 Categorias

---

## 1. Single Source of Truth & Architecture Guards (TEST-001 a TEST-015)
- **TEST-001**: O único shell canônico oficial reside em `ai-engine/grg/public/index.html`.
- **TEST-002**: Ausência de arquivos `index.html` concorrentes ou paralelos na raiz do repositório.
- **TEST-003**: Ausência de shells experimentais em subdiretórios de `scratch/` ou temporários.
- **TEST-004**: Todas as 14 views canônicas (`#view-command`, `#view-city`, `#view-agents`, etc.) estão integradas no shell oficial.
- **TEST-005**: Contrato canônico de frontend documentado em `CANONICAL_FRONTEND_CONTRACT.md`.
- **TEST-006**: Preservação de IDs de controle do DOM esperados por testes automatizados (`#orchHeatmapGrid`, `#cityCanvas`).
- **TEST-007**: Roteador baseado em hash (`#city`, `#command`, `#ide`) atualiza estado sem recarregar página.
- **TEST-008**: Proibição de inclusão de Tailwind CSS via CDN externo concorrente.
- **TEST-009**: Preservação dos design tokens canônicos em `unified.css` e `command-center.css`.
- **TEST-010**: Execução bem-sucedida do auditor `grg/test/architecture-guard.test.js` (5/5 checks).
- **TEST-011**: Resposta HTTP do servidor rejeita requisições sem autenticação para rotas protegidas.
- **TEST-012**: Headers de resposta do shell HTML proíbem cache estático (`Cache-Control: no-cache, no-store`).
- **TEST-013**: Assets estáticos (CSS, JS, imagens) servidos com cache apropriado sem onerar quotas de API.
- **TEST-014**: WebSocket de eventos exige mesmo token de autenticação do runtime principal.
- **TEST-015**: Proibição estrita de dashboards standalone criados para simular capacidades fora do shell.

---

## 2. Three.js 3D WebGL City & Spatial Reality (TEST-016 a TEST-030)
- **TEST-016**: Canvas WebGL 3D inicializa com contexto Three.js v152 ativo.
- **TEST-017**: Canvas 3D dimensionado proporcionalmente ao container (`clientWidth` e `clientHeight` > 0).
- **TEST-018**: Fallback 2.5D desativado quando o motor 3D WebGL é compatível com o dispositivo.
- **TEST-019**: Iluminação balanceada de 4 pontos (Directional, Hemisphere, Bounce, Fill) ativa.
- **TEST-020**: Complexo Depósito Mais posicionado nas coordenadas canônicas do distrito de Logística.
- **TEST-021**: Torre da API Platform renderizada com 3 andares e cobertura estruturada.
- **TEST-022**: Raycaster de interação ativo e disparando eventos em `onPointerDown` e `onPointerMove`.
- **TEST-023**: Hover sobre entidades (agentes, prédios, distritos) altera cursor do mouse para `pointer`.
- **TEST-024**: Clique em distrito aciona câmera isométrica focada nas coordenadas do distrito.
- **TEST-025**: Zoom suave com roda do mouse respeita limites mínimos e máximos de distância.
- **TEST-026**: Rotação orbital com botão esquerdo do mouse mantém target centralizado.
- **TEST-027**: Pan horizontal com botão direito ou Shift+clique desloca target de visualização.
- **TEST-028**: Modo noturno (`nightMode`) altera iluminação e acende janelas emissivas procedurais.
- **TEST-029**: Labels flutuantes de distritos projetadas em tela sem sobreposição ou colisões de texto.
- **TEST-030**: Loop de renderização com limitação para 60 FPS e pausa automática quando aba fica oculta.

---

## 3. AgentCraft Workstation & Live Monitors (TEST-031 a TEST-045)
- **TEST-031**: Estação de trabalho da API Platform possui metadados interativos (`type: 'workstation'`).
- **TEST-032**: Estação de despacho do Depósito Mais possui metadados interativos (`type: 'workstation'`).
- **TEST-033**: Raycaster prioriza estações de trabalho e agentes em relação a edifícios genéricos.
- **TEST-034**: Clique na estação abre o `#fenixWorldWorkstationInspector` no canto inferior direito.
- **TEST-035**: Inspetor da estação exibe nome da bancada e departamento correspondente.
- **TEST-036**: Inspetor da estação exibe agente atribuído com avatar e cargo especialista.
- **TEST-037**: Status do agente na estação reflete telemetria viva (`RUNNING`, `PAUSED`, `IDLE`).
- **TEST-038**: Exibição da branch ativa do worktree Git associada à estação de trabalho.
- **TEST-039**: Sumário de diff (+ / -) exibido com formatação numérica estilizada.
- **TEST-040**: Lista de arquivos em modificação ativa com atalhos de navegação direta.
- **TEST-041**: Console ao vivo da estação exibe logs do stream sem truncamento indevido.
- **TEST-042**: Botão `[Abrir no IDE]` redireciona operador para `#view-ide` com o arquivo carregado.
- **TEST-043**: Botão `[Pausar / Retomar]` aciona endpoint `/api/v2/jobs/:id/pause` ou `resume`.
- **TEST-044**: Atualização automática do console da estação ao receber evento SSE `agent.tool.called`.
- **TEST-045**: Fechamento do inspetor de estação através do botão `✕` sem retenção de memória.

---

## 4. Human-in-the-Loop Decision Center (TEST-046 a TEST-060)
- **TEST-046**: Container `#fenixWorldDecisionAlert` posicionado centralmente sobre o canvas 3D.
- **TEST-047**: Modal permanece oculto (`display: none`) enquanto não há decisões pendentes.
- **TEST-048**: Evento SSE `approval.requested` dispara automaticamente a abertura do modal de decisão.
- **TEST-049**: Modal exibe nome do agente solicitante e descrição clara da operação pretendida.
- **TEST-050**: Nível de risco da decisão (`CRITICAL`, `HIGH`, `MEDIUM`) destacado com cores de alerta.
- **TEST-051**: Lista de arquivos ou recursos impactados renderizada de forma auditável.
- **TEST-052**: Botão `[✓ AUTORIZAR EXECUÇÃO]` presente e destacado com design neon esmeralda.
- **TEST-053**: Clique em autorizar dispara requisição `POST /api/v2/jarvis/jobs/:id/approve`.
- **TEST-054**: Resposta bem-sucedida de aprovação oculta o modal e exibe notificação de sucesso.
- **TEST-055**: Botão `[Rejeitar / Abortar]` presente com estilo de advertência carmesim.
- **TEST-056**: Clique em rejeitar dispara requisição `POST /api/v2/jarvis/jobs/:id/reject`.
- **TEST-057**: Rejeição de operação cancela o job pendente e registra auditoria no ledger.
- **TEST-058**: Evento SSE `approval.granted` oculta o modal em todas as instâncias conectadas.
- **TEST-059**: Evento SSE `approval.denied` oculta o modal e desbloqueia o operador.
- **TEST-060**: Timeout de segurança expira decisões sem resposta humana após período configurado.

---

## 5. Fast Lane Chat, Whisper & Voice (TEST-061 a TEST-075)
- **TEST-061**: Campo `#masterPrompt` envia mensagens conversacionais com resposta em menos de 1.5s.
- **TEST-062**: Rota primária de conversa utiliza `/api/v2/conversation` com fallback para API Platform.
- **TEST-063**: Respostas conversacionais exibem balões estilizados com timestamp e avatar do Fênix.
- **TEST-064**: Histórico de chat persistido localmente e restaurado entre sessões.
- **TEST-065**: Botão de microfone presente no Mascot Sidebar (`fsbCompanyChatInput`).
- **TEST-066**: Botão de microfone presente no formulário mestre do Command Center (`masterCmdForm`).
- **TEST-067**: Invocação de `window.fenixToggleVoiceInput()` ativa a Web Speech API no navegador.
- **TEST-068**: Ícone do microfone fica vermelho pulsante durante a captura de áudio.
- **TEST-069**: Transcrição de fala em português brasileiro (pt-BR) preenche o campo de texto alvo.
- **TEST-070**: Término do reconhecimento de voz restaura ícone e placeholder originais.
- **TEST-071**: Fallback gracioso exibido caso o navegador não possua suporte a reconhecimento de voz.
- **TEST-072**: Endpoint de inferência conversacional `/api/v2/ai-platform/chat` responde HTTP 200.
- **TEST-073**: Endpoint de ingestão de voz `/api/v2/voice/desktop/ingest` processa payload de comando.
- **TEST-074**: Comandos rápidos de prompt (`/fast`, `/qwen`, `/auto`) ativados por botões inline.
- **TEST-075**: Botão de limpar histórico de conversa remove mensagens e redefine contexto.

---

## 6. MissionKernel & Autonomous Job Queue (TEST-076 a TEST-090)
- **TEST-076**: MissionKernel inicializado em modo autônomo com detecção de incidentes ativa.
- **TEST-077**: Enfileiramento de missão gera identificador canônico e registra passos sequenciais.
- **TEST-078**: Fila de execução gerenciada pelo BullMQ com suporte a Redis e fallback em memória.
- **TEST-079**: Status da missão transita corretamente: `QUEUED` -> `RUNNING` -> `SUCCESS` / `FAILED`.
- **TEST-080**: Tentativas de retry automático respeitam backoff exponencial configurado.
- **TEST-081**: Endpoint `POST /api/v2/jobs/:id/pause` suspende execução sem perda de estado.
- **TEST-082**: Endpoint `POST /api/v2/jobs/:id/resume` reativa execução pausada.
- **TEST-083**: Endpoint `GET /api/v2/jarvis/jobs/queue` retorna lista honesta de jobs ativos.
- **TEST-084**: Timeline visual de 5 etapas da missão (`Sensor`, `Plan`, `Execução`, `Gates`, `Deploy`) sincronizada.
- **TEST-085**: Indicador percentual de progresso reflete steps completados de fato pelo Kernel.
- **TEST-086**: Disparo do evento `mission.step.dispatched` ao delegar subtarefa para agente.
- **TEST-087**: Atribuição de missão move personagem 3D correspondente para a estação da tarefa.
- **TEST-088**: Falha de teste no gate da missão bloqueia avanço para a etapa de deploy.
- **TEST-089**: Missão completada com sucesso emite evento `runtime.job.succeeded` e libera agente.
- **TEST-090**: Recuperação pós-reinício restaura missões incompletas sem duplicação de execução.

---

## 7. Monaco IDE, Project Mirror & Git Worktrees (TEST-091 a TEST-105)
- **TEST-091**: Monaco IDE inicializa na view `#view-ide` com syntax highlighting ativo.
- **TEST-092**: Project Mirror lista árvore completa de arquivos do projeto sem vazamento de dados.
- **TEST-093**: Leitura de arquivo via REST carrega conteúdo integral no editor Monaco.
- **TEST-094**: Salvamento de arquivo (`Ctrl+S`) persiste modificação no disco com retorno 200.
- **TEST-095**: Bloqueio de gravação de arquivos fora dos diretórios de workspace permitidos.
- **TEST-096**: Visualizador de Diffs compara versão do arquivo atual contra a branch Git principal.
- **TEST-097**: Terminal interativo integrado executa comandos no contexto do workspace do projeto.
- **TEST-098**: Sessão de terminal persiste buffer de saída e permite polling seguro.
- **TEST-099**: Criação de branch isolada em Git worktree executada com sucesso.
- **TEST-100**: Commit de alterações pelo IDE atualiza status do repositório local.
- **TEST-101**: Troca de branch no editor atualiza arquivos visíveis no Project Mirror.
- **TEST-102**: Histórico de commits exibido com autor, hash SHA e mensagem de commit.
- **TEST-103**: Tentativa de push para repositório remoto exige autorização humana do Decision Center.
- **TEST-104**: Arquivos binários ou de mídia grandes protegidos contra abertura inadvertida no editor de texto.
- **TEST-105**: Fechamento de abas do editor solicita confirmação caso haja alterações não salvas.

---

## 8. Zero-Mock & Honest Telemetry Guards (TEST-106 a TEST-120)
- **TEST-106**: Nenhuma métrica ou contagem inventada presente no HTML estático inicial.
- **TEST-107**: Slots de telemetria não carregados exibem rigorosamente o caractere de ausência `—`.
- **TEST-108**: Auditor de mutação do `frontend-honesty.test.js` detecta e bloqueia mocks injetados.
- **TEST-109**: Métricas de CPU e RAM originam-se de chamadas reais ao SO via `os` e `process`.
- **TEST-110**: Heatmap de orquestração inicia vazio com texto "Aguardando amostras de telemetria".
- **TEST-111**: Contador de agentes no topo reflete exatamente a quantidade registrada no `AgentRegistry`.
- **TEST-112**: Ausência de agentes cadastrados exibe `0` ou `—` sem simulação de atividade.
- **TEST-113**: Tempo de uptime exibido deriva de métrica do runtime e não de `Date.now()` local.
- **TEST-114**: Status da API Platform no ribbon aguarda resposta do probe de saúde antes de exibir ONLINE.
- **TEST-115**: Falha em chamada de missão reporta erro real sem simular sucesso cosmético.
- **TEST-116**: Atividades do agente na cidade derivam de eventos determinísticos do EventBus.
- **TEST-117**: Reconexão de rede sincroniza snapshot completo antes de reativar eventos em tempo real.
- **TEST-118**: Deep links direcionam para entidades que comprovadamente existem no snapshot.
- **TEST-119**: Versão textual de acessibilidade (`#cityListView`) lista entidades sincronizadas reais.
- **TEST-120**: Execução de `grg/test/frontend-honesty.test.js` atinge 19/19 testes aprovados.

---

## 9. Multi-Tenant Security & Auth Resilience (TEST-121 a TEST-130)
- **TEST-121**: Autenticação via JWT com verificação de assinatura e expiração.
- **TEST-122**: Cookies de sessão configurados com `HttpOnly` e `SameSite=Lax`.
- **TEST-123**: Isolamento estrito entre dados de diferentes tenants no banco de dados.
- **TEST-124**: Token expirado dispara renovação transparente uma única vez antes de redirecionar.
- **TEST-125**: Tentativa de acesso sem token a rotas protegidas retorna `HTTP 401 Unauthorized`.
- **TEST-126**: Tentativa de acesso a recurso de outro tenant retorna `HTTP 403 Forbidden`.
- **TEST-127**: Sanitização de entradas do usuário protege contra XSS em balões de chat e inputs.
- **TEST-128**: Execução de comandos no terminal sanitiza variáveis para prevenir Command Injection.
- **TEST-129**: Auditoria de segurança registra tentativas de acesso não autorizado no DecisionLedger.
- **TEST-130**: Zero segredos, chaves de API privadas ou certificados expostos no código client-side.

---

## 10. Performance, Asset Optimization & Caching (TEST-131 a TEST-140)
- **TEST-131**: Scripts pesados (Three.js, motores 3D) carregados com atributo `defer`.
- **TEST-132**: Compressão gzip ativa no servidor web resultando em payloads HTML menores que 100 KB.
- **TEST-133**: Chamadas HTTP desnecessárias eliminadas da fase de inicialização imediata.
- **TEST-134**: Carregamento da Knowledge View ocorre sob demanda estrita ao navegar para a aba.
- **TEST-135**: Texturas procedurais geradas via Canvas sem downloads adicionais de bitmaps pesados.
- **TEST-136**: Texturas e geometrias Three.js liberadas da memória (`dispose()`) ao desmontar visualização.
- **TEST-137**: Redução no consumo de memória do navegador mantendo FPS estável a 60 frames por segundo.
- **TEST-138**: Throttling inteligente em streams de eventos SSE para evitar congestionamento da thread de UI.
- **TEST-139**: Assets estáticos servidos com headers de cache imutável para arquivos com hash de versão.
- **TEST-140**: Tempo de montagem do DOM inicial do `#view-city` inferior a 250 milissegundos.

---

## 11. Production Deployment & VPS Health (TEST-141 a TEST-150)
- **TEST-141**: Deploy remoto para VPS (`root@209.50.241.22`) executado exclusivamente via pipeline canônica.
- **TEST-142**: Paridade dual absoluta de 100% entre `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`.
- **TEST-143**: Processo PM2 #5 (`fenix-backend`) online na porta 4410 reportando saúde positiva.
- **TEST-144**: Processo PM2 #6 (`fenix-frontend`) online na porta 3000 respondendo HTTP 200.
- **TEST-145**: API Platform online na porta 3001 atendendo requisições de inferência local.
- **TEST-146**: Instância PostgreSQL na VPS operacional e mantendo conexões ativas do backend.
- **TEST-147**: Instância Redis na VPS operacional processando mensagens do barramento.
- **TEST-148**: Instância Qdrant na VPS respondendo consultas de embeddings sem erros.
- **TEST-149**: Rota de teste da cidade `http://209.50.241.22:3000/app#city` acessível externamente.
- **TEST-150**: Captura de tela com Playwright comprova renderização visual 3D completa em produção.
