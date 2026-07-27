# ADR-0022 — Mission Kernel e coordenação estruturada

## Status

Aceito para a primeira fatia do Mission Kernel.

## Contexto

Conversas extensas entre agentes aumentam custo, latência e risco de perda de contexto. O FÊNIX precisa coordenar trabalho distribuído usando eventos pequenos, filas duráveis e referências para memória e conhecimento. Linguagem natural deve permanecer na fronteira com o usuário e nas tarefas que realmente exigem raciocínio.

## Decisão

- Toda operação coordenada nasce como uma missão com objetivo, escopo, política e DAG de etapas.
- O cliente escolhe tipos governados de etapa; agente e `jobType` são definidos exclusivamente pelo catálogo do Kernel.
- Dependências são validadas como grafo acíclico antes da persistência.
- Etapas são encaminhadas somente ao Job Engine existente. O Mission Kernel não possui executor próprio.
- Comunicação interna usa eventos JSON com IDs, estado, hashes, métricas e referências `KG`, `MEMORY`, `TWIN`, `ARTIFACT`, `EVENT` ou `HASH`.
- Payloads, validações e eventos passam pelo bloqueio de segredos.
- Etapas amarelas exigem testes aprovados, risco baixo e impacto conhecido.
- Etapas vermelhas exigem aprovação consumível de outro ator autorizado.
- Pausa impede novos dispatches; retomada continua o DAG; cancelamento solicita cancelamento dos jobs e encerra etapas pendentes.
- Resultados do Runtime atualizam progresso e liberam etapas dependentes por eventos.
- Resumos finais são compactos e registram hashes, referências, duração, custo conhecido, uso conhecido de IA e quantidade de bytes estruturados.
- O estado visual do Avatar é derivado da missão e da etapa real: `SLEEPING`, `SCANNING`, `LEARNING`, `PROGRAMMING`, `BUILDING`, `DEPLOYING`, `RECOVERING`, `WAITING`, `WALKING` ou `CELEBRATING`.
- Eventos da missão informam o prédio operacional para projeção na AI City.

## Invariantes

1. Nenhum `jobType` arbitrário pode ser fornecido pelo cliente.
2. Nenhuma dependência cíclica pode entrar no estado.
3. Missões globais exigem administrador; missões com escopo obedecem aos grants cognitivos.
4. Objetivos completos não são copiados para eventos entre agentes.
5. Toda etapa mutável continua protegida também pelas políticas do executor final.
6. Orçamento e deadline interrompem novas etapas quando a telemetria disponível comprova violação.
7. Ausência de atribuição de tokens ou custo é registrada como `null`, nunca como zero inventado.

## Limites desta fatia

Ainda não há Mission Planner generativo para decompor automaticamente qualquer frase, atribuição universal de custo do AI Gateway por missão, SSE/WebSocket para progresso, voz, animações do personagem nem interface completa da cidade. O endpoint do Avatar declara `voice: false` até a camada STT/TTS ser implementada.
