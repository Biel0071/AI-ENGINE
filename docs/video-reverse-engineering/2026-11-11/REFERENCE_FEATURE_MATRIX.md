# Matriz de funcionalidades de referência × Fênix — 2026-11-11

Classificação: **ADOTAR** (útil e compatível) · **ADAPTAR** (redesenhar) · **INTEGRAR** (ligar a módulo existente) · **DESCARTAR**.
"Estado no Fênix" foi conferido no código em 2026-11-11 (não é suposição).

| # | Funcionalidade | Referência | Estado no Fênix | Classe | Oportunidade | Prioridade |
|---|---|---|---|---|---|---|
| 1 | Fila "precisa de você" com Aprovar/Recusar | Bravurax (V10), Meta Ads (V18) | Backend tem `missions.approveStep` e `APPROVAL_REQUIRED`; **não há fila visível na tela** | ADOTAR | Caixa de aprovações na Cidade e no chat, ligada ao endpoint real | **Alta** |
| 2 | Diretor recebe uma ordem e distribui o trabalho | Bravurax (V10) | Mascote cria missões (`/api/v2/conversation` → MissionKernel); sem papel de "diretor" explícito | ADAPTAR | O Fênix vira o diretor: ordem → missão com passos por agente, visível nas salas | **Alta** |
| 3 | "Nasce pausado": ação que gasta ou publica espera aprovação | Meta Ads (V18) | Portão de escrita do LEVEL 1; governança da autoevolução nega promoção por padrão | ADOTAR | Regra geral de política: deploy, gasto, mensagem externa → pausado até aprovar | **Alta** |
| 4 | Cartão do agente com modelo, status, tarefa e tokens | team.ai.id (V04, V11), 3D Dashboard (V17) | Faixa de agentes existe; status e papel reais; **sem modelo, tokens e tarefa atual** | ADOTAR | Usar `aiCalls` (tokens por job) e o job em execução do agente | **Alta** |
| 5 | Painel flutuante do agente com chat e histórico | team.ai.id (V07, V08) | Chat por agente existe; Proposta B (spec 2026-11-10) aguardando aprovação | INTEGRAR | Implementar a Proposta B | **Alta** |
| 6 | Resposta com documento da empresa e fonte citada | team.ai.id (V08), AI Brain (V01) | Camada 1 coloca índice e runtime no prompt; **não cita a fonte** | ADOTAR | Mostrar "Fonte: arquivo/memória" abaixo da resposta | **Alta** |
| 7 | Memória única para Claude, Codex e outras ferramentas | AI Brain (V01), gbrain (V23) | Servidor MCP existe; Livro de Atividades proposto | INTEGRAR | Ferramentas MCP de registro/consulta + ingestão do Git | **Alta** |
| 8 | Setores (divisões) dentro do prédio | team.ai.id (V08), Talvexa (V15) | Interior existe; agentes não agrupados por setor | ADAPTAR | Zonas por papel do agente (dev, QA, segurança, operação) | Média |
| 9 | Placa viva no prédio + reação visual ao evento | Cidade de trading (V02) | Prédios = projetos; eventos chegam por SSE; placa mostra só nome e porta | ADOTAR | Jobs ok/falha, tokens e último evento por prédio; pulso curto ao concluir/falhar | Média |
| 10 | Rotinas da cena ligadas a controles reais | Talvexa (V15) | Fila pode ser pausada/retomada; loop autônomo tem liga/desliga | ADAPTAR | Botões "Pausar fila", "Rotinas on/off" na barra — sem botões decorativos (Lunch, Rooftop) | Média |
| 11 | Checagem de status de todos os agentes | team.ai.id (V04) | Não existe | ADAPTAR | Responder pelo runtime (heartbeat/job atual), não perguntando ao modelo | Média |
| 12 | Linha do tempo das ações do agente no navegador | Agente no navegador (V05) | Instâncias BAI existem (sem simulação de PID desde o LEVEL 1) | INTEGRAR | Capturas e passos registrados por instância | Média |
| 13 | Varredura de segurança com prova de conceito | Strix (V12) | Tela Defesa e Bug Tracker | INTEGRAR | Só nos repositórios do dono, em sandbox; achado vira bug | Média |
| 14 | Kanban de missões por etapa + agenda | Kindra (V03) | Calendário de jobs existe (2026-11-10); missões sem kanban | ADAPTAR | Kanban na tela Work: planejada → executando → aguardando aprovação → concluída | Média |
| 15 | Funil como tela principal de uma operação | Meta Ads (V18) | Não aplicável hoje | INTEGRAR | Modelo para projetos de cliente (ZAPAI, campanhas) | Baixa |
| 16 | Referência + rascunho → UI gerada; skills de design | Jarvis (V13, V21), skills (V16) | Intake de referências de design e Studio existem | INTEGRAR | Pipeline do Studio com referência obrigatória | Baixa |
| 17 | Skills de vídeo; sites 3D | V19, V20 | Estúdio de vídeo e Software Factory existem | INTEGRAR | Modelos de projeto na fábrica | Baixa |
| 18 | Aplicativos operados por agentes | Craft Anything (V22) | MCP + Page Registry | INTEGRAR | Expor ações de cada tela como ferramenta | Baixa |
| 19 | Dia/noite, trânsito, pedestres | Tiny Living City (V24) | Comandos de horário no world-model | ADAPTAR | Só se não pesar: a página já trava sem GPU | Baixa |
| 20 | Escritório 3D realista | V09 | — | DESCARTAR | Pesado demais para o navegador comum | — |
| 21 | App "JADLOG Rastreio" (`com.droidview.agent`) | Zip V14 | — | DESCARTAR | Malware: não é referência de produto | — |