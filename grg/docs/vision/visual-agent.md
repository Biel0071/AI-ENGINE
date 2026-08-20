# FÊNIX OS — VISION AGENT & VISUAL ↔ CODE BIDIRECTIONAL ENGINE

## 1. Visão Geral
O **Vision Agent** atua como os olhos do FÊNIX OS. Ele realiza o mapeamento bidirecional entre o DOM visual renderizado no preview da IDE e o código-fonte físico nos arquivos `.tsx`/`.ts`.

## 2. Fluxo de Inspeção e Mutação
1. **Inspeção de Elemento**: O usuário clica em qualquer componente no modo `Visual` ou `Split`.
2. **Mapeamento DOM $\to$ Código**:
   * Identifica tag DOM (`<button>`), seletor CSS e hierarquia.
   * Identifica componente React (`BuyButton` / `Dashboard`).
   * Localiza arquivo físico no disco (`src/components/Dashboard.tsx`) e número da linha.
   * Extrai estilos computados (Tailwind / Obsidian Tokens) e props.
3. **Aplicação de Modificações**:
   * Modificações visuais (texto, cores, espaçamento) geram alterações diretas no código físico via AST/Regex.
   * Validação de sintaxe e build antes de salvar no disco.
   * Geração de diff e atualização do preview em tempo real.
