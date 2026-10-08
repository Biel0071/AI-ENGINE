# Fênix Reality Upgrade — relatório de execução

Data da verificação: 2026-10-08

## Escopo realizado

- A Cidade passou a projetar máquinas de runtime e edifícios de projetos a partir do estado recebido, com posições determinísticas, atividade derivada de jobs vinculados, seleção contextual e retorno à câmera anterior.
- O mapa deixa de inventar agentes canônicos quando a API não os fornece. Os estados sem telemetria agora aparecem como indisponíveis em indicadores selecionados.
- O painel de eventos deixou de exibir cinco alertas de exemplo. Ele renderiza os eventos presentes no estado da aplicação, com contagens por severidade e navegação para os registros relacionados.
- Os indicadores de disponibilidade removem valores otimistas de exemplo em estados sem snapshot. A atualização de sessão da Cidade usa o helper de fetch autenticado disponível no front.
- Foram adicionados testes focados para projeção de projetos/máquinas, eventos reais, estado indisponível, memória e o fluxo local de missão/job.

## Evidências

- 33 testes direcionados de Cidade, eventos, dados sem mock e fluxo local passaram.
- 36 testes direcionados de `JobEngine`, `MissionKernel`, reconciliação, API de missão/job e memória passaram.
- Na execução final combinada, 64 testes passaram sem falhas (10,8 s); as duas contagens acima incluem a mesma suíte de fluxo vertical.
- `node --check` passou nos nove arquivos JavaScript alterados verificados.
- A API Fênix da VPS respondeu `200` em `/health`; a API Platform respondeu `200` em `/health` e `/v1/models`.
- A chamada de chat da API Platform retornou `500` com classificação de erro do provedor. O Fênix configurado na VPS aponta para um endereço antigo/inacessível; ao testar o endereço atual da API Platform, a credencial configurada no Fênix recebeu `401`. Uma inferência mínima no Ollama excedeu o limite de 20 segundos e foi interrompida no cliente.
- A VPS foi observada com disco em 96% de uso e cerca de 925 MiB de RAM disponíveis. Não houve medição contínua nem reinício controlado dos serviços.
- O armazenamento local dos testes registrou modo degradado (relacional e cache em memória, vetor local). A persistência do job e da memória na VPS após reinício ainda não foi comprovada.
- O bundle servido pela VPS não corresponde aos arquivos locais e ao conjunto de scripts da Cidade. Substituir apenas o `index.html` deixaria referências sem os arquivos correspondentes.
- A navegação autenticada e o percurso visual ponta a ponta não foram validados no navegador nesta execução. A ferramenta de automação disponível recusou a interação com a interface; não há evidência suficiente para declarar E2E aprovado.
- A busca de código não encontrou uma rota/serviço de busca de mídia nem componentes de reprodução de vídeo ligados ao fluxo do produto. A capacidade de imagem também não foi exercitada de ponta a ponta.

## Limites desta entrega

O commit local e o push não equivalem a um deploy funcional. O deploy público foi bloqueado porque a integração real de IA falha por configuração de endereço/credencial e o chat do provedor retorna erro. O host também está com pouco espaço e pouca memória livre para um rebuild seguro. Nenhum serviço da VPS foi reiniciado ou substituído durante esta validação.

## Próximas ações necessárias

1. Corrigir, no ambiente de servidor, o endereço e a chave da API Platform para que o Fênix receba autenticação válida; corrigir o provedor/modelo Ollama até `/v1/chat` retornar uma resposta real.
2. Liberar espaço e capacidade de memória na VPS antes de rebuild ou aumento de workers.
3. Publicar o bundle completo e compatível de `grg/public/` e o backend de `grg/src/` como uma unidade versionada, com rollback preparado.
4. Executar no navegador autenticado o percurso conversa → missão → fila → job → IDE → Cidade → eventos → memória; validar expiração, reconexão, retry e atualização da página.
5. Reiniciar API e worker de forma controlada e confirmar que job, resultado e memória sobrevivem ao reinício.

## Status exigido

FENIX REALITY UPGRADE

BACKEND: PARTIAL
FRONTEND: PARTIAL
WORLD: PARTIAL
AGENTS: PARTIAL
PROJECTS: PARTIAL
JOBS: PARTIAL
EVENTS: PARTIAL
AI: FAIL
MEDIA SEARCH: FAIL
VIDEO: FAIL
IMAGE: PARTIAL
PERSISTENCE: PARTIAL
RECONNECTION: PARTIAL
PERFORMANCE: PARTIAL
E2E: PARTIAL
MOCKS: PARTIAL

REALITY SCORE: 45/100

BLOCKERS:
- API Platform `/v1/chat` retorna HTTP 500; a credencial do Fênix recebe HTTP 401 quando apontada para o endpoint atual.
- Inferência Ollama excedeu 20 segundos; não foi possível validar resposta rápida nem processamento real de IA.
- Disco da VPS em 96% e aproximadamente 925 MiB de RAM disponíveis.
- Bundle remoto diverge dos arquivos locais; deploy parcial pode deixar a interface inconsistente.
- E2E autenticado, sobrevivência após reinício, reconexão real e recursos de mídia não foram comprovados.

NEXT REQUIRED ACTION:
Corrigir a configuração segura de API Platform/Ollama e liberar capacidade na VPS; então publicar frontend e backend como um release atômico e executar E2E autenticado, incluindo persistência após reinício, antes de declarar o Fênix operacional 24/7.
