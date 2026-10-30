# GRG SPACE — CADERNO DE DIREÇÃO DE ARTE & ESPECIFICAÇÃO VISUAL DA AI CITY
> **Fênix OS Living World Engine V4 — Art Direction & Spatial Design Standard**  
> **Versão:** 4.0.0  
> **Classificação:** Norma Canônica Inviolável de Composição, Escala e Vida Urbana  
> **Data:** 30 de Outubro de 2026

---

## 1. Princípios Fundamentais & Visão Artística

O GRG SPACE não é uma maquete decorativa estática nem um tabuleiro simplificado de blocos. É a **materialização física e espacial do Fênix OS**: uma metrópole tecnológica viva, explorável em múltiplas profundidades, onde cada distrito, edifício, pavimento e agente representa um subsistema operacional real.

### Os 4 Pilares da Identidade Cyber-Obsidian
1. **Atmosfera Profunda (Twilight Nocturno):** Céu e névoa volumétrica em ardósia/obsidiana escura (`#0a1017` / `#0b151f`), rompendo completamente com tons pastéis ou névoas lavadas.
2. **Infraestrutura Realista:** Avenidas em asfalto carvão texturizado (`#11161d`), sinalização viária nítida (faixas amarelas duplas, faixas de pedestres zebradas, guias de meio-fio em ardósia), iluminação pública e áreas verdes exuberantes.
3. **Arquitetura Diferenciada com Transparência:** Fachadas contemporâneas de vidro, titânio escovado, brises arquitetônicos, terraços com painéis solares e interiores visíveis a partir da rua.
4. **Escala Humana e Proporção Canônica:** Personagens de 1.76m de altura com silhuetas proporcionais e articuladas, sem gigantismo ou discrepâncias em relação a portas, carros e mesas.

---

## 2. Escala Canônica e Matriz de Proporções

Todas as entidades no mundo 3D seguem uma métrica unificada onde **1 unidade 3D Three.js = 1 metro no mundo real**:

| Entidade | Largura (X) | Altura (Y) | Profundidade (Z) | Proporção / Referência |
| :--- | :--- | :--- | :--- | :--- |
| **Agente Humanoide** | 0.60m | **1.76m** | 0.38m | Cabeça: 0.22m, Tronco: 0.50m, Pernas: 0.85m |
| **Porta de Entrada** | 1.20m | **2.20m** | 0.15m | Passagem livre para agentes |
| **Pé-Direito do Pavimento** | — | **4.20m a 4.40m** | — | Espaço aéreo amplo com mezaninos |
| **Mesa de Trabalho (Workstation)** | 1.80m | **0.75m** | 0.90m | Ergonômica com monitores duplos |
| **Cadeira Ergonômica** | 0.55m | **0.95m** | 0.55m | Altura do assento a 0.45m |
| **Elevador Panorâmico** | 2.80m | **18.0m** (poço) | 2.80m | Cabine translúcida de 2.4m x 2.2m x 2.4m |
| **Veículo de Entrega (Van)** | 2.20m | **2.40m** | 4.80m | Rodas de diâmetro 0.70m |
| **Carro Sedan / Pickup** | 1.85m | **1.55m** | 4.40m | Rodas de diâmetro 0.65m |
| **Largura da Faixa Viária** | **3.60m** | — | — | Faixa dupla totalizando 7.20m de leito carroçável |
| **Calçada / Passeio Público** | **2.40m a 3.20m** | **0.18m** | — | Meio-fio de ardósia chanfrado |
| **Árvore Urbana (Copa)** | 3.50m a 5.00m | **4.80m a 7.20m** | 3.50m a 5.00m | Tronco de 0.40m de espessura |

---

## 3. Paleta de Materiais e Design Tokens de Luz

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CYBER-OBSIDIAN PALETTE                          │
├──────────────────┬─────────────────┬─────────────────┬─────────────────┤
│ Void Atmosphere  │ Asphalt Roadway │ Titanium Slabs  │ Emissive Cyan   │
│ #0a1017          │ #11161d         │ #1e293b         │ #00f0ff         │
├──────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ Grass Meadow     │ Sidewalk Slate  │ Phoenix Gold    │ Server Amber    │
│ #1e3a2f          │ #334155         │ #f59e0b         │ #fbbf24         │
└──────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Regras de Iluminação
1. **Luz Hemisférica (Sky/Ground):** `0xe0f2fe` (azul-celeste pálido superior) a `0x0f172a` (ardósia profunda inferior) com intensidade de `1.25` para preenchimento tridimensional sem sombras chapadas.
2. **Sol Direcional Principal:** `0xfff7ed` (luz quente suave a 45 graus) com sombras ativadas (`castShadow = true`) e mapa de sombra de alta resolução (2048x2048).
3. **Névoa de Profundidade:** `THREE.Fog(0x0a1017, 130, 480)`. Mantém o centro nítido e dissolve o horizonte suavemente na escuridão cósmica.
4. **Luzes Pontuais de Destaque:** Emissivos néon ciano (`#00f0ff`) nas marquises e poço de elevador, âmbar (`#f59e0b`) nos servidores e monumentos cívicos.

---

## 4. Tipologias Arquitetônicas

A cidade é dividida em 5 arquetipos distintos para eliminar repetição geométrica:

1. **Arquetipo 1 — Glass Cyber Tower (Fênix HQ / API Platform):**
   - Fachada de vidro cortina reflexivo com mullions de titânio escuro.
   - Brises horizontais de ventilação e anéis perimetrais de LED ciano.
   - Rooftop com heliponto, antenas de satélite e grelhas de HVAC.
2. **Arquetipo 2 — High-Tech Data Bunker (Memory Vault):**
   - Estrutura volumétrica escalonada em concreto polímero escuro.
   - Fendas verticais de luz e dutos de resfriamento líquido transparentes.
   - Portões de alta segurança e geradores auxiliares.
3. **Arquetipo 3 — Minimal White Cube (AI Nexus / Dev Loft):**
   - Geometria purista com recuos, balanços estruturais e amplas vitrines de vidro duplo.
   - Pátios internos ajardinados com cerejeiras e iluminação de piso.
4. **Arquetipo 4 — Logística & Industrial Hub:**
   - Coberturas em shed com telhado metálico e claraboias industriais.
   - Docas elevadas de carga e descarga com batentes de borracha e faixas zebradas.
   - Pátio de manobras para caminhões pesados e empilhadeiras funcionais.
5. **Arquetipo 5 — Pavilhões Tecnológicos e Átrios Abertos:**
   - Estruturas poligonais com terraços verdes acessíveis e pérgulas de titânio.
   - Escadas externas integradas ao relevo urbano.

---

## 5. Urbanismo, Ruas e Espaço Público

- **Traçado Orgânico Integrado:** A malha viária combina avenidas arteriais ortogonais com alamedas de acesso e praça cívica circular.
- **Praça Cívica do Fênix Dourado:** Plinto circular em degraus concêntricos, fonte luminosa e escultura dourada do Fênix com coroa de chamas.
- **Waterfront & Marina Náutica:** Borda leste banhada por canal navegável com deck de madeira naval, amarras em cabeços náuticos e iates atracados.
- **Vegetação Volumétrica:** Árvores com copas em icosaedro subdividido (evitando cones planos simples), variação de folhagens verdes e cerejeiras floridas em rosa e dourado.

---

## 6. Mobilidade e Tráfego Urbano

- **Veículos Disciplinados:** Todos os veículos transitam exclusivamente no leito das faixas de tráfego, respeitando seu sentido (+Z / -Z, +X / -X).
- **Rodas Articuladas:** Giro contínuo proporcional à velocidade de deslocamento.
- **Prevenção de Colisões:** Distância mínima de segurança entre veículos e pontos de parada controlados em cruzamentos.

---

## 7. Interiores dos Edifícios e Exploração por Pavimentos

- **Corte Arquitetônico Isométrico (Cutaway):** A parede frontal (+Z) e a laje superior são ocultadas dinamicamente ao aproximar a câmera, revelando a vida interna em múltiplos andares.
- **Piso 0 (Térreo):** Recepção com bancada curva, lounge de visitantes e o **Teleport Portal Pad `[ ]`** com circuitos luminosos e pilares emissores de partículas.
- **Piso 1 (Engenharia):** Estaçōes de trabalho com computadores, monitores curvos duplos, quadros brancos de arquitetura e sala de reunião circular.
- **Piso 2 (Infraestrutura):** Data Center com racks de servidores blade e LEDs piscantes indicando telemetria em tempo real.
- **Elevador Panorâmico de Vidro:** Posicionado no flanco esquerdo para não obstruir o campo visual dos pavimentos, com cabine translúcida móvel conectando os andares verticalmente.

---

## 8. Câmera e Navegação Semântica (4 Níveis)

1. **Nível 1 — Macro (Cidade Completa):** Distância 110m - 140m, ângulo de 45°, visão panorâmica de todos os distritos e marina.
2. **Nível 2 — Distrito (Zone Focus):** Distância 55m - 75m, enquadramento de clusters temáticos (Comercial, Tech, Industrial, Praça Central).
3. **Nível 3 — Fachada & Rua (Street Level):** Distância 28m - 40m, foco no nível do pedestre, fachadas e tráfego.
4. **Nível 4 — Pavimento & Interior (Cutaway Floor Focus):** Distância 14m - 20m, azimute calibrado a 1.30 - 1.55 radianos (visão desobstruída através do átrio frontal).

---

## 9. Diretriz de Aprovação Visual

Nenhuma alteração na AI City é homologada sem validação visual baseada na matriz de 12 capturas obrigatórias (A a L) no ambiente real de execução.
