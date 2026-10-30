# GRG SPACE — REGISTRO DE BUGS E RESOLUÇÕES (BUG REGISTER)

> **Data de Atualização:** 30 de Outubro de 2026  
> **Status:** 11/11 Bugs Críticos, Altos e Médios Resolvidos e Validados  
> **Severidades:** 2 Críticos, 2 Altos, 6 Médios, 1 Baixo

---

## 1. Tabela Consolidada de Bugs

| ID | Título | Severidade | Causa Raiz | Arquivo Alterado | Status |
|---|---|---|---|---|---|
| **BUG-01** | Crash de Anexos no Chat (`Cannot read properties of undefined reading digest`) | **CRÍTICO** | Inacessibilidade da W3C WebCrypto API (`window.crypto.subtle`) em conexões HTTP simples sobre IP público | `ai-engine/grg/public/fenix-mascot-sidebar.js` | **RESOLVIDO & TESTADO** |
| **BUG-02** | Cidade 3D com Tela Preta (Camera Perdida no Vazio) | **CRÍTICO** | Coordenadas orbitais salvas fora dos limites da cidade (`hypot > 130`) projetavam a cena no espaço vazio | `ai-engine/grg/public/fenix-world-3d.js` | **RESOLVIDO & TESTADO** |
| **BUG-03** | Erro 500 ao Salvar Arquivos na IDE | **ALTO** | `git rev-parse HEAD` executado compulsoriamente na raiz do projeto onde não existia `.git` | `ai-engine/grg/src/repo-intel/git-write-capability.js` e `project-workspace-routes.js` | **RESOLVIDO & TESTADO** |
| **BUG-04** | Botões Duplicados de Colapso na Sidebar (`<->`) | **MÉDIO** | Concorrência de dois botões `#fsbCompactBtn` e `#fsbMinimizeBtn` no cabeçalho | `ai-engine/grg/public/fenix-mascot-sidebar.js` e `fenix-mascot-sidebar.css` | **RESOLVIDO & TESTADO** |
| **BUG-05** | Botões de Navegação do Minimap Desalinhados | **MÉDIO** | Pílulas de texto longas flutuando fora da coroa do minimap | `ai-engine/grg/public/index.html` e `fenix-v11-phase6.css` | **RESOLVIDO & TESTADO** |
| **BUG-06** | Poluição de Tickers e Heartbeats na Cena 3D | **MÉDIO** | Eventos cíclicos de telemetria emitidos no timeline visual da cidade | `ai-engine/grg/public/iso-city.js` | **RESOLVIDO & TESTADO** |
| **BUG-07** | Metadados Ausentes/Hardcoded no Project Hub | **BAIXO** | Strings estáticas ("Não verificada", "Não medida") em vez de leitura de fatos do workspace | `ai-engine/grg/public/project-hub-live.js` | **RESOLVIDO & TESTADO** |
| **BUG-08** | Névoa Bege Desbotada e Vazio Visual na Inicialização | **ALTO (P1)** | Background estático e `THREE.Fog` fixados na cor bege pastel `0xd8dfcf` em vez da identidade Cyber-Obsidian | `ai-engine/grg/public/fenix-world-3d.js` | **RESOLVIDO & TESTADO** |
| **BUG-09** | Repetição de Edifícios Haussmannianos sem Identidade Tech | **MÉDIO (P2)** | Arquetipo 5 reutilizando malha neoclássica de Paris em lotes tecnológicos | `ai-engine/grg/public/fenix-world-3d.js` | **RESOLVIDO & TESTADO** |
| **BUG-10** | Elevador Panorâmico Central Obstruindo Visão dos Pavimentos | **MÉDIO (P2)** | Poço de elevador posicionado no eixo central (X = 0) colidindo visualmente com as bancadas | `ai-engine/grg/public/fenix-world-3d.js` | **RESOLVIDO & TESTADO** |
| **BUG-11** | Veículos Transitando Fora do Leito das Faixas Viárias | **MÉDIO (P2)** | Rotas veiculares sem amarração estrita aos eixos de tráfego arterial | `ai-engine/grg/public/fenix-world-3d.js` | **RESOLVIDO & TESTADO** |

---

## 2. Detalhes Técnicos e Correções

### BUG-01: Anexo de Imagens no Chat
- **Sintoma:** O usuário tentava arrastar ou selecionar um arquivo de imagem e a interface exibia um modal vermelho: `Falha ao processar arquivo "image.png": Cannot read properties of undefined (reading 'digest')`.
- **Correção:** Adicionada a função `sha256Fallback(buffer)` implementando a especificação FIPS PUB 180-4 em JavaScript puro bit-a-bit (utilizando `Math.imul` e arrays Uint32). Se `window.crypto?.subtle?.digest` for `undefined`, o sistema executa o fallback transparente e instantaneamente.

### BUG-02: Tela Preta na Cidade 3D
- **Sintoma:** Ao alternar para a visão da cidade, a viewport WebGL ficava completamente escura com a mensagem de espera de agentes.
- **Correção:** Adicionado guardião no método `_loadState()` que valida se `Math.hypot(parsed.target.x, parsed.target.z) > 130` ou se `parsed.distance < 20 || parsed.distance > 300`. Em caso positivo, o estado é sanitizado para os valores padrão centrais `(0, 0, 0)` com raio 136.

### BUG-03: Salvamento de Arquivos na IDE
- **Sintoma:** Ao editar e tentar salvar arquivos na IDE pelo navegador, o servidor retornava `HTTP 500 Internal Server Error: fatal: not a git repository`.
- **Correção:** `git-write-capability.js` agora verifica se o diretório alvo está dentro de uma work tree do git (`git rev-parse --is-inside-work-tree`). Caso contrário, trata o diretório como filesystem padrão e executa a gravação atômica segura via `fs.promises.writeFile`.

### BUG-08: Névoa Bege Desbotada e Vazio Visual na Inicialização
- **Módulo:** `fenix-world-3d.js` (Scene Setup & Day/Night Toggle)
- **Severidade:** ALTO (P1)
- **Causa Raiz:** O renderizador Three.js inicializava `scene.background` e `scene.fog` com `0xd8dfcf` (tom bege dessaturado), criando um horizonte vazio e desbotado que contrastava negativamente com o design system escuro do Fênix OS.
- **Correção:** Atualizado para atmosfera Cyber-Obsidian Twilight (`0x0a1017`) com névoa volumétrica balanceada de `130m` a `480m`. O método `_setDayNight()` foi sincronizado para transitar entre `0x0b151f` (noite) e `0x1a2935` (crepúsculo tecnológico).
- **Validação:** Evidência capturada em `proof_12_a_cidade_completa.png` e validada em produção na VPS.

### BUG-09: Repetição de Edifícios Haussmannianos sem Identidade Tech
- **Módulo:** `fenix-world-3d.js` (Building Fabric & Archetypes)
- **Severidade:** MÉDIO (P2)
- **Causa Raiz:** O Arquetipo 5 gerava blocos clássicos parisienses em pedra calcária com telhados de mansarda, destoando da temática de agentes e servidores de IA.
- **Correção:** Arquetipo 5 reescrito como Pavilhão Tecnológico Contemporâneo com brises de titânio escovado, fitas de LED ciano nos pavimentos intermediários, terraço superior ajardinado e painéis solares inclinados.
- **Validação:** Evidência capturada em `proof_12_c_regiao_tecnologica.png` e `proof_12_g_fachada_edificio.png`.

### BUG-10: Elevador Panorâmico Central Obstruindo Visão dos Pavimentos
- **Módulo:** `fenix-world-3d.js` (ApiPlatformHeroComplex & Cutaway Floors)
- **Severidade:** MÉDIO (P2)
- **Causa Raiz:** O poço de elevador encontrava-se posicionado na coordenada central do edifício `x: 0, z: 0`, bloqueando a visualização em corte dos agentes trabalhando nas mesas do Piso 1 e racks de servidores do Piso 2.
- **Correção:** Poço e cabine deslocados cirurgicamente para o flanco esquerdo (`x: -bW / 2 + 2.4, z: -2.0`). O centro do Piso 0 recebeu o **Teleport Portal Pad `[ ]`** com circuito de piso, iluminação ciano e pilares de néon.
- **Validação:** Evidências capturadas em `proof_12_h_interior_edificio.png` e `proof_12_j_elevador_movimento.png`.

### BUG-11: Veículos Transitando Fora do Leito das Faixas Viárias
- **Módulo:** `fenix-world-3d.js` (Traffic System & Waypoints)
- **Severidade:** MÉDIO (P2)
- **Causa Raiz:** Os veículos `cyberShuttle` e `courierVan` possuíam rotas em diagonais não coincidentes com os eixos das ruas do loteamento.
- **Correção:** Amarração determinística dos eixos: `cyberShuttle` vinculado estritamente à rua leste `st_e1` (faixa norte `x = 41.8`, eixo Z) e `courierVan` vinculado à rua sul `st_s1` (faixa leste `z = -41.8`, eixo X).
- **Validação:** Evidência capturada em `proof_12_e_rua_veiculos.png`.
