# GRG SPACE — lacunas priorizadas

Atualizado em 2026-10-20 com base em [GRG_SPACE_CURRENT_STATE.md](./GRG_SPACE_CURRENT_STATE.md).

| Prioridade | Lacuna | Impacto | Próxima evidência necessária |
|---|---|---|---|
| P0 | Identificar o processo e o bundle da API GRG ativos em `:3000`; containers GRG estão parados, mas o endpoint protegido responde. | Correções podem atingir o arquivo errado ou exigir restart sem plano. | PID/cwd/entrypoint ou configuração do proxy e hash do módulo carregado, com acesso operacional autorizado. |
| P0 | Resolver o workspace do projeto `api-platform` no chat sem abrir acesso arbitrário. | A conversa da sidebar rejeita até pergunta simples ou tarefa válida. | Teste autenticado read-only após correção, com provider/modelo e project ID registrados. |
| P0 | Comprovar worker real, heartbeat e ciclo job persistido. | UI pode sugerir atividade sem processamento. | Job de teste aprovado percorrendo criação, fila, worker, resultado e persistência; atualmente não iniciar até identificar runtime/capacidade. |
| P1 | Verificar Cidade no Chrome normal e tratar WebGL indisponível no navegador embutido. | A API retorna 39 registros, mas o renderer Three.js lança antes da sincronização no IAB em sandbox. O efeito no Chrome real ainda não foi verificado. | Reproduzir no Chrome normal; se WebGL for indisponível em ambiente suportado, fallback explícito sem simular dados. |
| P1 | Completar telemetria e eventos do Inspector/SSE. | A seleção segue o mesmo ID, mas missão/job/evento recente não são medidos; projeção de 39 cadastros não prova workers ativos. | Mesmo agent ID com heartbeat/evento persistido e atualizações correlacionadas no Inspector. |
| P1 | Medir conectores e chat end-to-end. | Ollama/provider aparece online sem latência medida; probe ficou preso. | Chamada com timeout, provider/modelo identificados, resultado e custo/latência reais. |
| P1 | Explicitar origem e cobertura do Graph Brain/índice. | Contagem de grafo não prova proveniência, busca ou relações úteis. | Auditoria de schema, endpoint, filtros e relações do nó selecionado. |
| P1 | Reduzir risco operacional da VPS. | 94% de disco e memória/swap pressionadas limitam workers e multimodal. | Inventário de espaço por diretório, retenção/logs/backups e orçamento seguro antes de qualquer carga. |
| P2 | Verificar responsividade, anexos e consistência visual ponta a ponta. | Já há correções CSS e testes locais, mas não equivalem à prova visual em viewport real. | Capturas e interação em 375/768/1280/1920 px após runtime estável. |

## Bloqueios e decisão

- Sem restart ou deploy de backend até mapear o processo servido por `:3000`, validar o workspace e ter rollback executável.
- Sem jobs de longa duração ou processamento multimodal na VPS enquanto disco, memória e workers não passarem os gates.
- A alteração local de allowlist deve ser reduzida/inspecionada contra o diff já existente antes de qualquer publicação; não copiar o arquivo inteiro.
