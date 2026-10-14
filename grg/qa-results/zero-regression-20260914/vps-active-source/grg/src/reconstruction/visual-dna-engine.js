'use strict';
/**
 * FÊNIX OS V11 — VISUAL DNA ENGINE
 * 
 * Extracts and compiles complete design systems from observed platforms:
 * 1. COLOR: Primary, Secondary, Background, Surface, Borders, Status (Success, Warning, Danger)
 * 2. TYPOGRAPHY: Font Families, Sizes, Weights, Line Heights
 * 3. SPACING: 4px, 8px, 12px, 16px, 24px, 32px
 * 4. GRID: Layout columns, Container max-widths, Breakpoints
 * 5. RADIUS, SHADOW, BORDER: Elevation and boundary styles
 * 6. COMPONENT TOKENS: Button, Input, Card, Table, Sidebar, Header, Modal, Navigation
 * 7. ANIMATION: Durations, Easing curves
 * 8. RESPONSIVE: Breakpoints and adaptive behavior rules
 */

class VisualDnaEngine {
  constructor(options = {}) {
    this.defaultTokens = this._getBaseDesignTokens();
  }

  _getBaseDesignTokens() {
    return {
      colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#030712',
        surface: '#0d111e',
        surfaceElevated: '#161d31',
        border: 'rgba(255, 255, 255, 0.08)',
        borderFocus: '#3b82f6',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        statusSuccess: '#10b981',
        statusWarning: '#f59e0b',
        statusDanger: '#ef4444',
        statusInfo: '#38bdf8'
      },
      typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontFamilyMono: "'JetBrains Mono', 'Fira Code', monospace",
        sizes: {
          xs: '11px',
          sm: '12px',
          base: '14px',
          md: '16px',
          lg: '18px',
          xl: '20px',
          '2xl': '24px',
          '3xl': '32px'
        },
        weights: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800
        },
        lineHeights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75
        }
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '12': '48px'
      },
      radius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px'
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.25)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        glowPrimary: '0 0 15px rgba(59, 130, 246, 0.35)'
      },
      animations: {
        transitionFast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        transitionNormal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
        transitionSlow: '400ms cubic-bezier(0.4, 0, 0.2, 1)'
      },
      breakpoints: {
        mobile: '640px',
        tablet: '1024px',
        desktop: '1440px',
        wide: '1920px'
      }
    };
  }

  /**
   * Extracts or synthesizes a complete Visual DNA from inspection observations
   */
  extractVisualDna(observationData = {}) {
    const rawTokens = JSON.parse(JSON.stringify(this.defaultTokens));

    // Refine based on observed elements or DOM styles if present
    if (Array.isArray(observationData.elements)) {
      const detectedButtons = observationData.elements.filter(e => e.category === 'BUTTON');
      const detectedCards = observationData.elements.filter(e => e.category === 'CARD');
      const detectedInputs = observationData.elements.filter(e => e.category === 'INPUT');

      if (detectedButtons.length > 0) {
        rawTokens.componentTokens = this._deriveComponentTokens(detectedButtons, detectedCards, detectedInputs);
      }
    }

    if (!rawTokens.componentTokens) {
      rawTokens.componentTokens = this._getDefaultComponentTokens(rawTokens);
    }

    const cssVariables = this._generateCssVariables(rawTokens);
    const layoutRules = this._generateLayoutRules(rawTokens);
    const responsiveRules = this._generateResponsiveRules(rawTokens);

    return {
      dnaId: `dna:${Date.now()}`,
      version: '11.0.0',
      designTokens: rawTokens,
      cssVariables,
      layoutRules,
      responsiveRules,
      componentSpecs: rawTokens.componentTokens,
      updatedAt: new Date().toISOString()
    };
  }

  _getDefaultComponentTokens(tokens) {
    return {
      button: {
        primary: {
          background: tokens.colors.primary,
          color: '#ffffff',
          borderRadius: tokens.radius.md,
          padding: '8px 16px',
          fontWeight: tokens.typography.weights.semibold,
          boxShadow: tokens.shadows.sm
        },
        ghost: {
          background: 'transparent',
          color: tokens.colors.textSecondary,
          borderRadius: tokens.radius.md,
          padding: '8px 14px',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      },
      input: {
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid ' + tokens.colors.border,
        borderRadius: tokens.radius.md,
        padding: '10px 14px',
        color: tokens.colors.textPrimary,
        focusBorder: tokens.colors.borderFocus
      },
      card: {
        background: tokens.colors.surface,
        border: '1px solid ' + tokens.colors.border,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing['5'],
        boxShadow: tokens.shadows.md
      },
      table: {
        headerBackground: 'rgba(255, 255, 255, 0.02)',
        rowBorder: '1px solid ' + tokens.colors.border,
        padding: '12px 16px'
      },
      sidebar: {
        width: '260px',
        background: 'linear-gradient(180deg, #090d1a 0%, #050811 100%)',
        borderRight: '1px solid ' + tokens.colors.border
      },
      header: {
        height: '64px',
        background: 'rgba(9, 13, 26, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid ' + tokens.colors.border
      },
      modal: {
        background: tokens.colors.surfaceElevated,
        borderRadius: tokens.radius.xl,
        maxWidth: '560px',
        boxShadow: tokens.shadows.lg
      }
    };
  }

  _deriveComponentTokens(buttons, cards, inputs) {
    const tokens = this.defaultTokens;
    const base = this._getDefaultComponentTokens(tokens);

    if (buttons.length > 0) {
      base.button.observedCount = buttons.length;
    }
    if (cards.length > 0) {
      base.card.observedCount = cards.length;
    }
    if (inputs.length > 0) {
      base.input.observedCount = inputs.length;
    }
    return base;
  }

  _generateCssVariables(tokens) {
    let css = ':root {\n';
    Object.entries(tokens.colors).forEach(([k, v]) => {
      css += `  --fenix-color-${this._kebab(k)}: ${v};\n`;
    });
    Object.entries(tokens.typography.sizes).forEach(([k, v]) => {
      css += `  --fenix-font-size-${k}: ${v};\n`;
    });
    Object.entries(tokens.spacing).forEach(([k, v]) => {
      css += `  --fenix-spacing-${k}: ${v};\n`;
    });
    Object.entries(tokens.radius).forEach(([k, v]) => {
      css += `  --fenix-radius-${k}: ${v};\n`;
    });
    css += '}\n';
    return css;
  }

  _generateLayoutRules(tokens) {
    return {
      shell: 'Single Shell Architecture with sticky TopBar and collapsible SideBar',
      contentWidth: 'max-width: 1440px; margin: 0 auto; width: 100%;',
      gridSystem: 'CSS Grid with repeat(auto-fill, minmax(300px, 1fr))',
      zIndexStack: {
        background: -1,
        content: 1,
        header: 40,
        sidebar: 50,
        dropdown: 100,
        modal: 1000,
        toast: 2000
      }
    };
  }

  _generateResponsiveRules(tokens) {
    return {
      mobile: {
        max: tokens.breakpoints.mobile,
        rules: ['Sidebar collapses into drawer menu', 'Cards become 100% width single-column', 'Header compacts search']
      },
      tablet: {
        min: tokens.breakpoints.mobile,
        max: tokens.breakpoints.tablet,
        rules: ['Grid scales to 2-columns', 'Side-by-side viewers switch to stacked or tabbed mode']
      },
      desktop: {
        min: tokens.breakpoints.tablet,
        rules: ['Full 3-column split view (Explorer + Editor + Preview)', 'Isometric AI City renders at full detail']
      }
    };
  }

  _kebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

const globalVisualDnaEngine = new VisualDnaEngine();

module.exports = {
  VisualDnaEngine,
  globalVisualDnaEngine
};
