---
type: decision
title: UI do prédio GRG por andares/departamentos + 10 papéis da identidade visual
date: 2026-07-25
author: agente (Claude Opus)
tenant: biel0071-software-house
project: ai-engine
evidence:
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/src/workforce/workforce.js
  - repo: AI-ENGINE
    commit: 785cae5e
    location: grg/public/office.js
confidence: 0.88
supersedes: null
---

## Contexto
Usuário mandou a identidade visual "GRG SERVIÇOS Virtual Office" (prédio isométrico pixel-art com
andares por departamento: Térreo Recepção, 1º Suporte, 2º Financeiro, 3º Operacional, 4º Comercial,
5º Diretoria) + 10 personagens (Diretor Estratégico, Gerente Operacional, Agente Atendimento,
Analista Financeiro, Especialista TI, Coordenador Equipe, Agente Vendas, Analista Dados, Agente
Automação, Agente Reuniões). Spec pedia Three.js/Next/LangGraph/K8s — deixei explícito que é meses.

## Conteúdo
Backend (workforce.js): CAPABILITY_ROLE agora mapeia cada capability a title/department/floor/emoji
alinhados aos 10 papéis. FLOORS define os 6 andares. Owner = Diretor Estratégico (5º). Método
building() agrupa funcionários por andar + saúde do twin. Endpoint GET /api/projects/:id/building.

Frontend (office.html/css/js reescritos): visão de PRÉDIOS empilhados (não mais salas planas).
Cada empresa = um prédio com telhado (nome+saúde, antena com luz), andares por departamento com
janelas acesas e personagens (emoji + nível em estrelas). Clique no prédio → modal com organograma,
reunião de equipe, relatório do diretor, e perguntar a funcionário. Dark theme estilo da imagem.

## Validação (servidor + Ollama)
building() retornou os andares corretos: 5º Diretoria (Diretor+Analista), 3º Operacional (Automação+TI),
2º Financeiro, 1º Suporte. 4º Comercial vazio pois o projeto não tinha ecommerce (correto/honesto).
office.html/css/js servem 200. 15 arquivos de teste verdes.

## Escopo honesto — o que NÃO é (vs a spec/imagem)
- NÃO é isométrico 3D com Three.js/PixiJS nem personagens ANDANDO. É prédio em HTML/CSS (dark,
  andares empilhados, avatares emoji estáticos, janelas acesas). Integra com o backend Node puro;
  Three.js exigiria stack React/Next separada que não conversaria com este backend.
- NÃO tem: Orquestrador Master criando setores/andares sozinho, subagentes criando subagentes,
  telemetria de CPU/RAM/GPU/rede, multi-empresa com prédios simultâneos animados, A2A, LangGraph,
  Prometheus/Grafana/Loki/Tempo/Jaeger, Kubernetes. Isso é a plataforma completa = meses de time.
- Os "10 personagens" existem como PAPÉIS derivados de capabilities reais; nem toda loja terá os 10
  (só os que suas capabilities justificam). É honesto: popula o que existe de verdade.
- Preview in-app desabilitado → validei por curl; usuário abre 127.0.0.1:4400/office.html.

## Próximos saltos possíveis
Diálogo reativo entre agentes (um responde ao outro), animação CSS de "andando", multi-prédio no
mesmo canvas, telemetria real de processo (os dados de sistema que o Node consegue ler), agendador
de relatórios diários automáticos.
