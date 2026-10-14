# FÊNIX OS — CITY VISUAL SYSTEM
## ESPECIFICAÇÃO DE RENDERIZAÇÃO 2.5D, PIXEL ART & PERFORMANCE

> **SISTEMA VISUAL DO SPATIAL OPERATING SYSTEM**
> Diretrizes para renderização isométrica de altíssima densidade visual, animação de personagens, cutaways prediais, iluminação noturna/diurna e pipelines Pixi.js 8 com 60 FPS garantidos.

---

## 1. Princípios de Renderização Isométrica

### 1.1 Projeção e Geometria
A cidade opera em projeção isométrica padrão `2:1`:
- `screenX = originX + (col - row) * (tileWidth / 2)`
- `screenY = originY + (col + row) * (tileHeight / 2)`
- Tamanho base do tile: `tileWidth = 64px`, `tileHeight = 32px`.
- Profundidade e z-index: `zIndex = (col + row) * 100 + heightOffset`.

### 1.2 Camadas de Desenho (Rendering Layers)
1. **Camada 0 (Terreno & Água)**: Malha de asfalto, grama, calçadas, areia da praia e superfície oceânica animada.
2. **Camada 1 (Vias & Trilhos)**: Faixas de trânsito, cruzamentos, rotatória central e ferrovia suspensa.
3. **Camada 2 (Edifícios & Estruturas)**: Fachadas completas, blocos modulares, entradas e letreiros neon.
4. **Camada 3 (Mobiliário Urbano & Props)**: Árvores, postes de luz, lixeiras, caixas de som, bancos e fontes de água.
5. **Camada 4 (Veículos & Trens)**: Carros, ônibus, caminhões e vagões em circulação viária.
6. **Camada 5 (Agentes & Pedestres)**: Sprites de personagens animados com sombra de contato e balões de fala.
7. **Camada 6 (Pins & Badges Espaciais)**: Placas de distrito flutuantes, indicadores de missões e pin de seleção.
8. **Camada 7 (HUD & Overlays)**: Minimapa, seletores de modo e breadcrumbs.

---

## 2. Sistema de Iluminação e Efeitos Visuais

- **Paleta de Iluminação**:
  - Diurna: Luz solar natural `#FFF7ED` com sombras projetadas em ângulo de 45°.
  - Noturna/Modo Foco: Cidade escurece para `#050810`, destacando o prédio selecionado com aura de emissão e projetando holofotes luminosos nas vias ativas.
- **Letreiros Neon de Distritos**:
  - Cada placa de distrito possui um brilho perimetral correspondente ao seu token de cor (ex.: `#00D9FF` para Fênix HQ, `#EF4444` para Security, `#10B981` para Engineering).
- **Indicadores de Tráfego de Dados e Deploy**:
  - Feixes de partículas luminosas fluem pelas vias quando deploys ou jobs de rede ocorrem entre distritos.

---

## 3. Orçamento de Performance (Performance Budget)

| Métrica | Limite Tolerado | Medida de Otimização |
| :--- | :--- | :--- |
| **Taxa de Quadros (FPS)** | 60 FPS estáveis | Sprite batching, frustum culling e throttling em inatividade. |
| **Consumo de Memória JS** | < 256 MB no cliente | Texture atlas consolidado, descarte de geometrias ocultas. |
| **Tempo de Boot Visual** | < 800 ms | Renderização progressiva: terreno primeiro, prédios em seguida, sprites por streaming. |
| **Escala de População** | Até 1000 agentes | Level of Detail (LOD) espacial: personagens distantes viram pontos com z-index simples. |
