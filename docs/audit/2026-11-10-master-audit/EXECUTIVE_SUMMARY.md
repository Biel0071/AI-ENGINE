# EXECUTIVE_SUMMARY — FÊNIX OS

**Data:** 2026-11-10 · **Tipo:** auditoria de descoberta (nenhuma correção implementada) · **Escopo:** `ai-engine/` (foco em `grg/`) + produção `https://209.50.241.22` (somente leitura, sem login).

## Diagnóstico em uma frase

O FÊNIX tem um núcleo real e por vezes bem desenhado (JobEngine com DLQ, MissionKernel, gateway de IA com circuit breaker, agente que edita código e roda testes, cidade 3D com A* alimentada pelo backend), mas está **inseguro para estar na internet hoje**, **sem suíte verde**, e **diluído em duplicações** — vários sistemas paralelos fazem a mesma coisa e alguns fingem sucesso.

## Nota de maturidade: **32 / 100**

### Metodologia

Seis dimensões, pontuadas apenas por **funcionamento comprovado, confiabilidade, integração e qualidade**. Quantidade de código, arquivos, módulos, testes ou relatórios **não** soma pontos.

| Dimensão | Peso | Nota | Evidência principal |
|---|---|---|---|
| Funcionamento real | 25 | **11** | ✔ produção `ready` com Postgres/Redis/Qdrant/BullMQ; JobEngine, MissionKernel, agente `agent.execute`, cidade 3D reais. Mas: provedor de geração externo **offline**, `echo` ativo em produção, ≥9 pontos de sucesso fabricado, pool de agentes simulado, RAG por hash |
| Segurança | 20 | **2** | ✔ backdoor de senha; ✔ sessão anônima herda admin; ✔ execução de comando sem autorização; ✔ 9 segredos no git; produção em `development`; teste OIDC falhando |
| Confiabilidade / estabilidade | 20 | **7** | ✔ 1.485/1.879 testes (79%); 301 falhas por uma alteração local não commitada; estado inteiro num documento JSON (~25 s/escrita sob disputa, registrado no código); exceções globais engolidas; 71 `.tmp` + 1 `.corrupt` em `.data`; perda de atualização em 9 pontos |
| Integração arquitetural | 15 | **5** | caminhos canônicos existem, mas: 2 filas, 8 roteadores de IA, 5 registros de projetos, ≥4 produtores de estado da cidade, ~15 diretórios mortos carregados no boot, 9 endpoints sombreados, isolamento de tenant incompleto |
| Engenharia e operação | 10 | **3** | CI com CodeQL/Trivy existe; mas 707 entradas sujas na árvore, 460 MB de binários versionados, 95 scripts de remendo, deploy documentado aponta para script desativado, container roda código montado do host |
| Experiência do usuário | 10 | **4** | cidade 3D com A* e inspeção real; estados vazios honestos em vários lugares. Mas valores fictícios (`98%`, `\|\| 4`), ≥10 chamadas a endpoints inexistentes, 8.270 `!important`, E2E de navegação não passa |
| **Total** | 100 | **32** | |

Leitura da nota: **protótipo avançado com núcleo real**, não produto de produção. A segurança sozinha impede qualquer nota acima de ~40 até o LEVEL 1 do roadmap estar concluído.

### Fatos × hipóteses
Tudo marcado ✔ foi verificado diretamente (código, execução de testes ou `curl` à produção). Nos relatórios detalhados, inferências estão marcadas **[HIPÓTESE]**. A cadeia de ataque foi confirmada **no código**; **não foi testada contra a produção**, de propósito.

---

## Os 20 problemas mais importantes (por impacto)

| # | Problema | Evidência | P |
|---|---|---|---|
| 1 | Qualquer pessoa obtém sessão de admin (`/api/v2/preview/dev-session` + papel do vínculo) e executa comandos no host (`reality-operator/terminal/exec` sem `authorize`) | ✔ `server.js:576-592`; ✔ `auth/auth.js:235-241`; ✔ `control-plane.js:105-108`; ✔ `universal-system-routes.js:687-695`; ✔ `reality-operator-kernel.js:1118` | P0 |
| 2 | Backdoor de senha fixa para `grg-admin`/`admin` — senhas triviais, adivinháveis sem ver o código | ✔ `auth/auth.js:107-115` | P0 |
| 3 | Segredos versionados no git (chave de IA, vault cifrado com chave padrão, senha em `diag.sh`) | ✔ `git ls-files grg/.secrets`; `security/secret-vault.js:15-20` | P0 |
| 4 | Produção rodando como `development` com provedor `echo` ativo | ✔ `/health` de produção | P0 |
| 5 | Alteração local não commitada em `security/config.js` quebra o boot sem senha e derruba 301 testes | ✔ `git diff`; ✔ execução da suíte | P1 |
| 6 | Verificador OIDC não rejeita endpoint inseguro / identidade sem assinatura | ✔ teste falhando | P1 |
| 7 | ~15 rotas atendidas antes da autenticação, incluindo uso e custo de IA de todos os tenants; identidade fabricada em 3 famílias de rotas | `server.js:241-282, 462-548, 597-612` | P1 |
| 8 | Estado inteiro num único documento JSON reescrito a cada escrita | `postgres-store.js:105-253`; comentário em `server.js:137-141` | P2 (risco P1 em escala) |
| 9 | Sucesso fabricado quando a IA falha (worker, model-orchestrator, mission workers, model-router) | ✔ `fenix-worker.js:164-175` + 5 locais | P1 |
| 10 | Perda de atualizações concorrentes (`store.write` fora de `update`) | 9 pontos em `project-*-routes.js` | P1 |
| 11 | Isolamento de tenant incompleto (GraphBrain, AgentRegistry, PatternLibrary, WebSocket fan-out) | `server.js:1888,1910-1928`; `graph-brain.js` | P2 |
| 12 | Dois sistemas de fila e dois consumidores (API e worker) | `job-queue-manager.js`; `server.js:1966-2001` | P2 |
| 13 | 8 roteadores de modelo; único provedor externo de geração offline; chat contorna o gateway | ✔ `/health`; AI_INFRASTRUCTURE_AUDIT §3 | P2 |
| 14 | PATCH do orquestrador autônomo sobrescreve arquivos inteiros sem ver o original | `autonomous-job-orchestrator.js:576,596-604` | P1 |
| 15 | Token do GitHub enviado a URL do usuário; injeção de opção no `git clone` | `project-git-routes.js:249-310`; `project-workspace-routes.js:103,131` | P1 |
| 16 | `uncaughtException`/`unhandledRejection` engolidos; 272 `catch {}` vazios | ✔ `server.js:41-42` | P1 |
| 17 | Deploy: instrução canônica aponta para script desativado; container roda código montado do host | `CLAUDE.md` Regra V; `docker-compose.enterprise.yml` | P2 |
| 18 | RAG sem semântica (embeddings por hash) e cápsulas de conhecimento nunca indexadas | ✔ `embedding.js:3-14`; ✔ `knowledge-genome.js:56` | P2 |
| 19 | Frontend com valores fictícios e ≥10 chamadas a endpoints inexistentes, contrariando a Regra II | ✔ `fenix-city-adaptive-dock.js:844`; ✔ `project-hub-controller.js:401` | P3 |
| 20 | Nenhum QA de navegação autenticado passa; testes escrevem em dados reais | `qa-results/frontend-navigation-qa.json`; ✔ efeito colateral observado | P3 |

## Os 20 maiores potenciais de evolução (por impacto)

| # | Oportunidade | Ganho |
|---|---|---|
| 1 | Fechar a superfície de ataque | sistema apto a ficar exposto |
| 2 | Produção em modo production | guardas existentes passam a valer |
| 3 | Suíte verde como gate de deploy | regressões param de chegar à produção |
| 4 | Um único caminho de IA (AIRouter + AIGateway) | toda chamada com custo e telemetria |
| 5 | Eliminar sucesso fabricado | falhas visíveis, memória sem lixo |
| 6 | Roteamento por lane: Ollama → Groq/OpenRouter → Claude/Codex | menor custo e maior disponibilidade |
| 7 | Orçamento por tenant real | custo previsível |
| 8 | Embeddings reais + KnowledgeGenome corrigido | RAG útil e mensurável |
| 9 | Coleções quentes fora do documento único | escrita rápida, sem runs presos |
| 10 | Uma fila, um consumidor | 0 jobs duplicados/perdidos |
| 11 | Isolamento de tenant completo | pronto para múltiplos clientes |
| 12 | Pool de agentes → `agent.execute` real | agentes deixam de simular |
| 13 | Todo PATCH via Safe Dev Pipeline | mudanças revisáveis e reversíveis |
| 14 | Política de commit fora do LLM | autonomia governada |
| 15 | Registro de projetos único (ProjectKernel) | uma verdade sobre projetos |
| 16 | Kernel explícito + poda de código morto | boot menor, menos superfície |
| 17 | Deploy por imagem imutável | rollback em 1 comando |
| 18 | Frontend honesto e conectado | UI confiável |
| 19 | Ciclo de vida por view | menos CPU/rede no navegador |
| 20 | Cidade como painel de operações real | o diferencial visual passa a ser ferramenta |

Detalhes: `IMPROVEMENT_OPPORTUNITIES.md` e `EVOLUTION_ROADMAP.md`.

## Ações imediatas recomendadas (antes de qualquer implementação de produto)

1. **Hoje, pelo dono do sistema:** rotacionar a chave do provedor de IA, a senha do `grg-admin` e as credenciais de banco/S3 citadas em `STABILITY_SECURITY_AUDIT.md` (S5–S8).
2. Autorizar o LEVEL 1 do roadmap (correções P0, esforço total estimado: 2–4 dias).
3. Decidir o destino da alteração local em `grg/src/security/config.js` (reverter é o recomendado).

## O que não foi possível verificar

- Fluxos autenticados em produção (não usamos credenciais).
- Se a cadeia de ataque funciona em produção (não testado de propósito).
- Se o repositório no GitHub é público (afeta a urgência da rotação).
- Status do CI no GitHub (`gh` sem autenticação).
- Perfil de memória/CPU em execução longa.
- Conteúdo de `grg/qa/vps-city-qa-credentials.js` (leitura bloqueada pelas permissões).