# GRG SPACE — Backlog Visual e Operacional (Living World & UI)

> **Data de Atualização:** 30 de Outubro de 2026  
> **Status:** GS-001, GS-003, GS-006 e GS-009 VERIFICADOS em Produção VPS (`209.50.241.22:3000`).

---

## 1. Itens e Status do Ciclo Atual

| ID | Prioridade | Estado | Área / Evidência | Reprodução e Critério de Fechamento |
|---|---|---|---|---|
| **GS-001** | **P1** | **VERIFIED** | Inicialização direta na Cidade (`#city`) sem flash do cockpit ou desvio de rota. | Validado via Playwright em `capture_12_required_visual_proofs.js`. Carga direta na URL `/app#city`, resolução limpa de rota e renderização 3D estável. |
| **GS-002** | **P1** | **IN_PROGRESS** | Cidade: controle de viewport responsivo e compensação do dock inferior de 3 cartões. | Dock inferior calibrado (`Math.min(48, Math.floor(h * 0.055))`) liberando 100% da visualização da cena 3D. |
| **GS-003** | **P1** | **VERIFIED** | Personagens e Escala Canônica: avatares articulados de 1.76m de altura com silhuetas, cabeças proporcionais, crachá, aura no solo e roupas temáticas. | Validado via `proof_12_f_agentes_caminhando.png` e `proof_12_i_pavimento_trabalho.png` no runtime de produção. |
| **GS-004** | **P1** | **OBSERVED** | Catálogo de Projetos: visualização dual Local/VPS com galeria Screen DNA e telemetria de portas. | Em observação na aba `#projects`. |
| **GS-006** | **P2** | **VERIFIED** | Polling dos painéis da Cidade respeitando `document.hidden` e coalescência de frames. | Teste `test/city-runtime-performance.test.js` passou e FPS estabilizado em 60 FPS na VPS. |
| **GS-009** | **P2** | **VERIFIED** | Project Hub com carregamento lazy de `/state` para evitar rajada concorrente. | Teste `project-hub-lazy-startup.test.js` passou (10/10) sem impacto na Cidade. |

---

## 2. Evidências Factualmente Comprovadas em Produção (VPS `209.50.241.22`)

- **Protocolo de 12 Capturas Aprovado:**
  - `[A]` Cidade completa: `proof_12_a_cidade_completa.png`
  - `[B]` Região comercial / Marina: `proof_12_b_regiao_comercial.png`
  - `[C]` Região tecnológica: `proof_12_c_regiao_tecnologica.png`
  - `[D]` Praça central: `proof_12_d_praca_central.png`
  - `[E]` Rua com veículos: `proof_12_e_rua_veiculos.png`
  - `[F]` Agentes caminhando: `proof_12_f_agentes_caminhando.png`
  - `[G]` Fachada de edifício: `proof_12_g_fachada_edificio.png`
  - `[H]` Interior do edifício em corte: `proof_12_h_interior_edificio.png`
  - `[I]` Pavimento com agentes trabalhando: `proof_12_i_pavimento_trabalho.png`
  - `[J]` Elevador em movimentação: `proof_12_j_elevador_movimento.png`
  - `[K]` Comunicação entre departamentos: `proof_12_k_comunicacao_departamentos.png`
  - `[L]` Retorno à cidade: `proof_12_l_retorno_cidade.png`
