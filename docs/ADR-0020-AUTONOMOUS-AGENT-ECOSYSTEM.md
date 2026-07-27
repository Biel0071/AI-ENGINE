# ADR-0020 — Autonomous Agent Ecosystem

## Status

Aceito para a fatia V2.5.3-A.

## Contexto

O FÊNIX precisa coordenar agentes por empresa e projeto sem criar identidades privilegiadas, execução paralela ao Runtime ou compartilhamento implícito de memória. O Avatar Mestre deve consolidar e delegar, mas nunca executar código.

## Decisão

- Existe um único `master-avatar` por tenant, marcado com `coordinator: true` e `executionAllowed: false`.
- Empresas e projetos recebem equipes com papéis especializados e identidades ligadas ao escopo cognitivo.
- Toda tarefa usa uma ação presente no `ACTION_CATALOG`; o cliente não pode escolher um job arbitrário.
- A criação e a leitura de tarefas exigem autorização no escopo da entidade do agente.
- Verde pode ser encaminhado ao Runtime; amarelo exige testes aprovados, risco baixo e impacto conhecido; vermelho exige aprovação separada e consumível.
- Mesmo quando autoaprovada, a tarefa somente é enviada ao `JobEngine`. O ecossistema não chama ferramentas, scripts, sandbox ou deploy diretamente.
- Resultados terminais do Runtime são projetados de volta na tarefa e resumidos para o Avatar Mestre.
- Conhecimento nasce como proposta isolada. A promoção exige Avatar Mestre e uma política explícita de compartilhamento entre o escopo de origem e o escopo mestre.
- Padrões promovidos são imutáveis, versionados e não executáveis.
- Ciclos contínuos são jobs agendáveis, com evidências e etapas persistidas no Event Store.

## Invariantes

1. O Avatar Mestre nunca é aceito como executor de tarefa ou ciclo de especialista.
2. Um agente não pode criar tarefa fora de sua entidade cognitiva.
3. A ação e o tipo de job são ligados por catálogo fechado.
4. Nenhuma ação vermelha é despachada sem aprovação de outro ator autorizado.
5. Nenhum conhecimento cruza empresas por padrão.
6. Payloads, propostas e evidências não podem conter segredos.
7. Toda delegação, decisão de política, despacho, conclusão e promoção gera evento durável.

## Limites desta fatia

Esta entrega implementa coordenação, políticas, tarefas, ciclos, promoções e projeções operacionais. Ela não implementa planejamento generativo multiagente, edição autônoma de código, Git/PR automático nem deploy autônomo. Esses fluxos continuam dependentes do Sandbox e do Governed Change Engine.
