# FÊNIX OS — DESIGN SYSTEM & TOKEN SPECIFICATION
> **GUIA OFICIAL DE DESIGN TOKENS E COMPONENTES**  
> **Tema**: Obsidian Dark Glassmorphism + Cyberpunk Neon  
> **Arquivo de Estilos**: [`ai-engine/grg/public/unified.css`](file:///c:/projetos/ai-engine-core/ai-engine/grg/public/unified.css)  

---

## 1. DESIGN TOKENS (PALETA & CORES)

```css
:root {
  /* Obsidian Base Palette */
  --bg-primary: #06090e;
  --bg-secondary: #0a0f18;
  --bg-card: rgba(18, 27, 43, 0.7);
  --bg-card-hover: rgba(28, 41, 65, 0.85);

  /* Fênix Neon Identity */
  --orange: #f97316;
  --flame: #ea580c;
  --flame-glow: rgba(249, 115, 22, 0.4);
  --cyan: #38bdf8;
  --cyan-glow: rgba(56, 189, 248, 0.35);
  --emerald: #10b981;
  --emerald-glow: rgba(16, 185, 129, 0.3);
  --amber: #f59e0b;
  --purple: #a78bfa;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-display: 'Orbitron', 'Inter', sans-serif;
  --font-code: 'JetBrains Mono', 'Fira Code', monospace;

  /* Glassmorphism & Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-glow: rgba(56, 189, 248, 0.4);
  --border-amber: rgba(249, 115, 22, 0.4);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 2. COMPONENTES PADRÃO DO SHELL

1. **Botão Primário (`action-btn-primary`)**:
   - Gradiente de fundo: `linear-gradient(135deg, var(--orange), var(--flame))`
   - Texto: `#ffffff`, peso `700`, cantos arredondados `4px`.
2. **Botão Fantasma (`action-btn-ghost`)**:
   - Fundo transparente, borda `1px solid var(--border-subtle)`.
3. **Pills e Badges (`pill-tag`, `badge-status`)**:
   - Cores contextuais: `.text-cyan`, `.text-emerald`, `.text-amber`, `.text-purple`.
4. **Cards e Painéis (`dash-card`)**:
   - Fundo `rgba(18, 27, 43, 0.7)` com `backdrop-filter: blur(12px)`.
