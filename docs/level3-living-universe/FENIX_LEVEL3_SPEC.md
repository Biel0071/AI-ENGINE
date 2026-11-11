# FÊNIX LEVEL 3 — Universo Empresarial Vivo — ESPECIFICAÇÃO (2026-11-11)

Proposta para aprovação do dono. Nada aqui foi implementado ainda. Baseada no super prompt "Infinite Living Business Universe" e nas referências visuais (andares temáticos tipo "Floor 03 — Strategy", cidade isométrica clara, prédio em corte com andares, escritórios de agentes).

## Princípio

Cada elemento visual representa uma estrutura operacional real: prédio = empresa/sistema, andar = departamento, personagem = funcionário virtual identificável, reunião = decisão registrada, número = medição com origem. Animação só representa estado real (ou é marcada claramente como "ambiente").

## O que já existe e deve ser reaproveitado (auditado por nome em 2026-11-11)

| Peça | Onde | A verificar na Fase A |
|---|---|---|
| Empresas | `src/api/company-brain-routes.js` (`/api/v2/company`, `/list`, `/info/:id`) | Se os dados são reais ou fabricados |
| Força de trabalho com andares | `src/workforce/workforce.js` | Idem |
| Reuniões / comunicação | `src/api/office-communication-routes.js`, `src/communication/*` | Se reuniões têm objetivo e registro real |
| Agente CEO | `src/company/ceo-agent.js` | Se decide algo real ou gera texto fixo |
| Mundo: andares, estações, distritos | `src/world-model/*`, `living-city-routes.js` (`floorNum`, `workstationId`, `department`) | Coerência com o registro de agentes |
| Agentes com dados reais | `/api/v2/agents/live` (LEVEL 2) | Base dos funcionários virtuais |
| Diretor + aprovação | `/api/v2/director/*` (LEVEL 2) | Base de "propostas para o dono" |
| Memória e rede de IAs | Hub universal + MCP (LEVEL 2) | Base da Central de Ideias |

Na auditoria de 2026-11-10 vários módulos antigos usavam valores sorteados (`Math.random`) ou textos fixos; o catálogo de agentes era um deles e foi corrigido no LEVEL 2. A Fase A repete esse trabalho para as peças acima antes de construir em cima delas.

## Restrição medida: desempenho

Medido em 2026-11-11: a Cidade desenha **3.489 chamadas por quadro com 7.679 objetos**, e o motor (`fenix-world-3d.js`) **não usa instancing**. Sem GPU, a página fica ~30–40 % ocupada mesmo após o orçamento de luzes. Adicionar andares, interiores e dezenas de personagens sem resolver isso tornaria o universo inutilizável. Por isso a Fase B vem antes de qualquer conteúdo novo.

## Fases (cada uma com critério de "pronto")

**A — Auditoria das peças existentes.** Classificar cada endpoint/módulo da tabela como real, parcial ou fabricado; corrigir fabricação (zero ou "—" honesto). *Pronto:* relatório + testes de honestidade estendidos às rotas de empresa, workforce e reuniões.

**B — Motor de renderização.** `InstancedMesh` para prédios, janelas, árvores e personagens repetidos; LOD por distância; culling; animação só perto da câmera. *Pronto:* ≤ 400 chamadas de desenho na visão geral; página sem GPU < 15 % ocupada; teste `level23` < 30 s.

**C — Cidade expansível em regiões.** Grade de quadras com ruas conectadas (validador de conectividade), regiões carregadas sob demanda (chunks), posicionamento sem colisão, etiquetas sem sobreposição. *Pronto:* cadastrar uma empresa nova cria quadra/prédio sem sobrepor nada; validador de ruas passa.

**D — Prédio em corte com andares.** Clicar no prédio → câmera entra, corte isométrico, lista de andares (configurável, sem limite fixo), breadcrumb Universo › Empresa › Andar › Departamento › Funcionário. *Pronto:* entrar e sair de 3 níveis com retorno à posição anterior.

**E — Departamentos e funcionários virtuais.** Modelo: Empresa → Prédio → Andar → Departamento → Equipe → Funcionário → Estação, persistido no estado (migração de esquema). Funcionário = identidade persistente ligada a um agente real (modelo, provedor, tokens, tarefa vêm de `/api/v2/agents/live`). Cargos instanciados conforme objetivos da empresa, nunca para "preencher". *Pronto:* criar empresa, andar, departamento e funcionário pela interface; dados sobrevivem a reinício.

**F — Estação de trabalho e animações por estado.** Personagem só "digita" quando há job RUNNING; ocioso = parado/circulando marcado como ambiente. Estação mostra tarefa, arquivos, logs, modelo, tokens, resultado. *Pronto:* teste que liga estado do job ↔ animação.

**G — Reuniões registradas.** Sala física; reunião = objetivo, participantes, agenda, decisões, próximas ações, persistida; convocada por um gestor ou pelo diretor a partir de uma missão real. *Pronto:* uma missão real gera reunião com decisões gravadas e visíveis.

**H — Telemetria por nível.** Universo, empresa, andar, departamento, funcionário — tudo derivado de jobs/missões/aiCalls/hub. Receita só com integração autorizada. *Pronto:* cada número com origem clicável.

**I — Central de Ideias.** Ideias do dono e das IAs (hub: IDEA/CODE_PROPOSAL), agrupamento de duplicadas, divergências registradas, ideia aprovada vira missão pelo diretor. *Pronto:* ideia → análise por 2 ferramentas → missão aprovada.

**J — Workforce dinâmico com limites.** Agente pede especialista; sistema verifica existente, capacidade e orçamento; cria temporário com supervisor; encerra ao fim. Limites de agentes, jobs, tokens, custo, CPU. *Pronto:* pedido acima do orçamento é negado com motivo.

**K — Inteligência empresarial contínua e relatório diário.** Só com dados autorizados; sem dado, declarar a limitação. Depende de integrações por empresa.

**L — Certificação.** Roteiro do super prompt (criar empresa → … → recuperar estado após reinício), com capturas e testes.

## Dependências do dono

- Provedor de nuvem na API Platform (Groq/OpenRouter/Gemini já suportados; falta a chave) — necessário para agentes "pensarem" de verdade (Fases G, I, K).
- Quais empresas reais entram primeiro e quais integrações/dados estão autorizados (Fase K).
- Aprovação desta ordem de fases.

## Ordem recomendada

A → B → C → D → E → F, depois G–L. A e B são pré-requisitos: sem honestidade dos dados e sem desempenho, o universo vira uma animação bonita e travada.