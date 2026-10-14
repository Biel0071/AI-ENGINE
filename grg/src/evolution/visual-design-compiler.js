'use strict';

/**
 * FÊNIX OS — Visual Design Compiler (Fase 13)
 * ============================================
 * Deterministic 9-Stage Design Compilation Pipeline:
 * DESIGN INTENT
 *   → SYSTEM MODEL
 *   → USER MODEL
 *   → INFORMATION ARCHITECTURE
 *   → UX MODEL
 *   → VISUAL MODEL
 *   → COMPONENT MODEL
 *   → LAYOUT MODEL
 *   → CODE (Semantic HTML + Obsidian CSS)
 *
 * Fully deterministic. Operates in Zero-AI mode without LLM calls.
 * Adheres strictly to Fênix Visual Genome 3.0 tokens and canonical layout rules.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_GENOME_PATH = path.join(__dirname, '..', '..', '..', 'docs', 'VISUAL_GENOME.json');

class VisualDesignCompiler {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.genomePath = options.genomePath || DEFAULT_GENOME_PATH;
    this.genome = this._loadGenome();
  }

  _loadGenome() {
    try {
      if (fs.existsSync(this.genomePath)) {
        return JSON.parse(fs.readFileSync(this.genomePath, 'utf8'));
      }
    } catch (err) {
      this.logger.warn?.(`Failed to load visual genome: ${err.message}`);
    }
    return {
      designTokens: {
        colorPalette: {
          backgroundDark: '#050811',
          surfaceCard: '#0A0F1D',
          surfaceElevated: '#0E1726',
          accentCyan: '#00E5FF',
          accentPurple: '#7928CA',
          borderSubtle: 'rgba(255, 255, 255, 0.08)',
          textMuted: '#64748B'
        }
      }
    };
  }

  /**
   * Stage 1: Resolve Design Intent
   * Normalizes the incoming intent or provides default archetype structure.
   */
  resolveIntent(intent = {}) {
    return {
      archetype: intent.archetype || '3_PANE_COCKPIT',
      domain: intent.domain || 'CORE_SYSTEM',
      viewId: intent.viewId || 'view-custom',
      title: intent.title || 'Fênix Operational View',
      primaryAction: intent.primaryAction || 'EXECUTE',
      zonesRequested: intent.zonesRequested || ['navigation', 'hero_stage', 'inspector'],
      density: intent.density || 'HIGH',
      telemetryRequirements: intent.telemetryRequirements || ['state', 'throughput', 'health']
    };
  }

  /**
   * Stage 2: Build System Model
   * Maps system entities, dependencies, operational primitives, and event feeds.
   */
  buildSystemModel(resolvedIntent) {
    return {
      intent: resolvedIntent,
      entities: [
        { type: 'WORKER_AGENT', role: 'EXECUTION', status: 'ACTIVE' },
        { type: 'SUPERVISOR', role: 'GOVERNANCE', status: 'SUPERVISED' },
        { type: 'PERSISTENT_QUEUE', role: 'STORAGE', status: 'HEALTHY' }
      ],
      telemetryStreams: resolvedIntent.telemetryRequirements.map(req => ({
        streamId: `stream_${req}`,
        source: 'CORE_KERNEL',
        initialValue: '—', // Invariant: Zero-Mock
        isMeasured: true
      })),
      capabilities: ['INSPECTION', 'TIMELINE_STEPPING', 'ACTION_DISPATCH']
    };
  }

  /**
   * Stage 3: Build User Model
   * Synthesizes operator personas, visual cognition flow, and interaction priorities.
   */
  buildUserModel(systemModel) {
    return {
      persona: 'AUTONOMOUS_SYSTEMS_ENGINEER',
      focusPriority: [
        'MISSION_STAGE_PROGRESS',
        'REALTIME_EXECUTION_TIMELINE',
        'DEEP_CONTEXT_INSPECTION'
      ],
      cognitiveLoadTarget: 'LOW_NOISE_HIGH_INFORMATION',
      primaryWorkflow: 'OBSERVE_AND_INTERVENE',
      systemModel
    };
  }

  /**
   * Stage 4: Synthesize Information Architecture (IA)
   * Allocates spatial dominance and sets up 3-pane or 4-quadrant layout zones.
   */
  synthesizeInformationArchitecture(userModel) {
    const archetype = userModel.systemModel.intent.archetype;
    let zones = [];

    if (archetype === '3_PANE_COCKPIT') {
      zones = [
        { id: 'zone-header', role: 'HEADER_TELEMETRY', dominancePercent: 10 },
        { id: 'zone-stage', role: 'HERO_STAGE_TIMELINE', dominancePercent: 60, isDominant: true },
        { id: 'zone-inspector', role: 'CONTEXT_INSPECTOR', dominancePercent: 30 }
      ];
    } else if (archetype === 'SPLIT_WORKFORCE_CONSOLE') {
      zones = [
        { id: 'zone-roster', role: 'SQUAD_ROSTER', dominancePercent: 55, isDominant: true },
        { id: 'zone-deep-inspector', role: 'AGENT_INSPECTOR', dominancePercent: 45 }
      ];
    } else if (archetype === '4_QUADRANT_IDE') {
      zones = [
        { id: 'zone-explorer', role: 'FILE_EXPLORER', dominancePercent: 20 },
        { id: 'zone-editor', role: 'CODE_EDITOR', dominancePercent: 40, isDominant: true },
        { id: 'zone-preview', role: 'DARK_LIVE_CANVAS', dominancePercent: 40 },
        { id: 'zone-dock', role: 'OPERATIONS_TRAY', dominancePercent: 25, isDock: true }
      ];
    } else {
      zones = [
        { id: 'zone-main', role: 'SYSTEM_MAP', dominancePercent: 70, isDominant: true },
        { id: 'zone-sidebar', role: 'STREAM_INSPECTOR', dominancePercent: 30 }
      ];
    }

    return {
      archetype,
      zones,
      hierarchyDepth: zones.length,
      userModel
    };
  }

  /**
   * Stage 5: Synthesize UX Model
   * Defines interaction state, micro-actions, tab selections, and zero-mock bindings.
   */
  synthesizeUxModel(ia) {
    return {
      ia,
      interactionStates: {
        activeTab: 'overview',
        isInspecting: true,
        selectedItemId: null
      },
      affordances: [
        { action: 'SELECT_NODE', feedback: 'HIGHLIGHT_INSPECTOR' },
        { action: 'FILTER_SQUAD', feedback: 'FILTER_ROSTER' },
        { action: 'DISPATCH_ACTION', feedback: 'MODAL_OR_DRAWER' }
      ],
      zeroMockPlaceholders: {
        activeCount: '—',
        throughput: '—',
        cpuPercent: '—',
        memoryMb: '—'
      }
    };
  }

  /**
   * Stage 6: Synthesize Visual Model
   * Maps design tokens, obsidian backgrounds, typography, and glass elevation.
   */
  synthesizeVisualModel(uxModel) {
    const palette = this.genome.designTokens.colorPalette;
    return {
      uxModel,
      styleTokens: {
        backgroundBase: palette.backgroundDark,
        surfaceCard: palette.surfaceCard,
        surfaceElevated: palette.surfaceElevated,
        borderSubtle: palette.borderSubtle,
        accentCyan: palette.accentCyan,
        accentPurple: palette.accentPurple,
        textMuted: palette.textMuted,
        fontPrimary: "system-ui, -apple-system, 'Inter', sans-serif",
        fontMono: "'JetBrains Mono', 'Fira Code', monospace",
        glassBackdrop: 'blur(12px)',
        borderRadius: '10px'
      }
    };
  }

  /**
   * Stage 7: Synthesize Component Model
   * Selects and configures concrete Fênix components for each zone.
   */
  synthesizeComponentModel(visualModel) {
    const zones = visualModel.uxModel.ia.zones;
    const components = zones.map(zone => {
      switch (zone.role) {
        case 'HEADER_TELEMETRY':
          return { zoneId: zone.id, component: 'FenixCockpitHeader', props: { telemetry: ['SYS_STATUS', 'ACTIVE_MISSIONS', 'HEALTH'] } };
        case 'HERO_STAGE_TIMELINE':
          return { zoneId: zone.id, component: 'FenixHeroStageStepper', props: { stepCount: 4, isDominant: true } };
        case 'CONTEXT_INSPECTOR':
          return { zoneId: zone.id, component: 'FenixContextInspector', props: { tabs: ['telemetry', 'logs', 'actions'] } };
        case 'SQUAD_ROSTER':
          return { zoneId: zone.id, component: 'FenixSquadRoster', props: { squads: ['ACTIVE', 'AVAILABLE', 'SUPERVISED'] } };
        case 'AGENT_INSPECTOR':
          return { zoneId: zone.id, component: 'FenixAgentDeepInspector', props: { tabs: ['metrics', 'memory', 'logs', 'actions'] } };
        case 'DARK_LIVE_CANVAS':
          return { zoneId: zone.id, component: 'FenixDarkPreviewCanvas', props: { zeroFlash: true } };
        case 'OPERATIONS_TRAY':
          return { zoneId: zone.id, component: 'FenixOperationsDockTray', props: { tabs: ['terminal', 'output', 'diagnostics', 'git'] } };
        default:
          return { zoneId: zone.id, component: 'FenixWorkspacePanel', props: { isDominant: zone.isDominant } };
      }
    });

    return {
      visualModel,
      components
    };
  }

  /**
   * Stage 8: Synthesize Layout Model
   * Produces concrete CSS Grid & Flexbox geometry with responsive media queries.
   */
  synthesizeLayoutModel(componentModel) {
    const archetype = componentModel.visualModel.uxModel.ia.archetype;
    let gridTemplate = '1fr';
    let layoutClass = 'fenix-generic-layout';

    if (archetype === '3_PANE_COCKPIT') {
      layoutClass = 'fenix-cockpit-workspace';
      gridTemplate = '1fr 340px';
    } else if (archetype === 'SPLIT_WORKFORCE_CONSOLE') {
      layoutClass = 'fenix-workforce-layout';
      gridTemplate = '1fr 380px';
    } else if (archetype === '4_QUADRANT_IDE') {
      layoutClass = 'fenix-ide-quad-layout';
      gridTemplate = '240px 1fr 1fr';
    }

    return {
      componentModel,
      layoutClass,
      gridTemplate,
      mediaQueries: {
        tablet: '@media (max-width: 1400px)',
        mobile: '@media (max-width: 1100px)'
      }
    };
  }

  /**
   * Stage 9: Generate Code (HTML + CSS)
   * Emits semantic, zero-mock HTML and styled CSS classes.
   */
  generateCode(layoutModel) {
    const { componentModel, layoutClass } = layoutModel;
    const { visualModel, components } = componentModel;
    const tokens = visualModel.styleTokens;
    const viewId = visualModel.uxModel.ia.userModel.systemModel.intent.viewId;

    let html = `<!-- FÊNIX OS CANONICAL VIEW: ${viewId} -->\n`;
    html += `<div id="${viewId}" class="fenix-compiled-view ${layoutClass}">\n`;

    for (const comp of components) {
      html += `  <section id="${comp.zoneId}" class="fenix-zone-panel fenix-component-${comp.component.toLowerCase()}">\n`;
      html += `    <div class="fenix-panel-header">\n`;
      html += `      <span class="fenix-panel-title">${comp.component.replace('Fenix', '')}</span>\n`;
      html += `      <span class="fenix-telemetry-badge">—</span>\n`;
      html += `    </div>\n`;
      html += `    <div class="fenix-panel-body">\n`;
      html += `      <!-- Zero-Mock Telemetry Slot -->\n`;
      html += `      <div class="fenix-metric-stream" data-source="${comp.component}">—</div>\n`;
      html += `    </div>\n`;
      html += `  </section>\n`;
    }

    html += `</div>\n`;

    const css = `/* Fênix Compiled Styles for ${layoutClass} */\n` +
      `.${layoutClass} {\n` +
      `  display: grid;\n` +
      `  gap: 16px;\n` +
      `  background: ${tokens.backgroundBase};\n` +
      `  color: #F8FAFC;\n` +
      `  font-family: ${tokens.fontPrimary};\n` +
      `  min-height: 100%;\n` +
      `  padding: 16px;\n` +
      `}\n` +
      `.fenix-zone-panel {\n` +
      `  background: ${tokens.surfaceCard};\n` +
      `  border: 1px solid ${tokens.borderSubtle};\n` +
      `  border-radius: ${tokens.borderRadius};\n` +
      `  backdrop-filter: ${tokens.glassBackdrop};\n` +
      `  overflow: hidden;\n` +
      `}\n`;

    return {
      html,
      css,
      metadata: {
        viewId,
        archetype: visualModel.uxModel.ia.archetype,
        compiledAt: new Date().toISOString(),
        compilerVersion: '3.0.0-canonical',
        zeroAiDeterministic: true
      }
    };
  }

  /**
   * Top-level compile pipeline executing all 9 stages sequentially.
   * @param {object} intent
   * @returns {object} Compiled artifact containing HTML, CSS, and stage traces
   */
  compile(intent = {}) {
    const resolvedIntent = this.resolveIntent(intent);
    const systemModel = this.buildSystemModel(resolvedIntent);
    const userModel = this.buildUserModel(systemModel);
    const ia = this.synthesizeInformationArchitecture(userModel);
    const uxModel = this.synthesizeUxModel(ia);
    const visualModel = this.synthesizeVisualModel(uxModel);
    const componentModel = this.synthesizeComponentModel(visualModel);
    const layoutModel = this.synthesizeLayoutModel(componentModel);
    const code = this.generateCode(layoutModel);

    return {
      intent: resolvedIntent,
      pipelineStages: {
        systemModel,
        userModel,
        ia,
        uxModel,
        visualModel,
        componentModel,
        layoutModel
      },
      code,
      metadata: code.metadata
    };
  }
}

module.exports = {
  VisualDesignCompiler
};
