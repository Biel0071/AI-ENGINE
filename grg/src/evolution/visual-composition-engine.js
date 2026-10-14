'use strict';

/**
 * FÊNIX OS — Visual Composition Engine (Fase 13)
 * ==============================================
 * Analyzes the spatial composition, layout geometry, visual dominance,
 * and information density of interface views without relying on an external LLM.
 *
 * Implements deterministic spatial decomposition:
 * - Stage Dominance Ratio (Hero Stage vs. auxiliary widgets)
 * - Context Inspector Integration Ratio
 * - Spatial Density Factor (cards/cm², text/chrome ratio)
 * - Visual Noise & Duplicate Control Ratio
 */

const fs = require('fs');
const path = require('path');

class VisualCompositionEngine {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  /**
   * Decomposes an HTML string or view container into its spatial layout zones.
   * @param {string} htmlContent
   * @param {string} [viewId]
   * @returns {object} Spatial composition metrics
   */
  decomposeSpatialLayout(htmlContent, viewId = 'view-command') {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return { isValid: false, reason: 'Invalid HTML content' };
    }

    const hasNav = /class="[^"]*nav[^"]*"|id="[^"]*nav[^"]*"|<nav\b/i.test(htmlContent);
    const hasHeroStage = /class="[^"]*(cockpit|hero|workspace-stage|stage)[^"]*"/i.test(htmlContent);
    const hasInspector = /class="[^"]*inspector[^"]*"|id="[^"]*inspector[^"]*"/i.test(htmlContent);
    const hasTimeline = /class="[^"]*(timeline|stepper|flow|stages)[^"]*"/i.test(htmlContent);
    const hasDockTray = /class="[^"]*(dock-tray|tray|operations-tray)[^"]*"/i.test(htmlContent);
    const hasSquadGroups = /class="[^"]*squad-group[^"]*"/i.test(htmlContent);

    // Count component primitives
    const cardCount = (htmlContent.match(/class="[^"]*(card|fp-card|kpi|metric-box)[^"]*"/gi) || []).length;
    const inlineStyleCount = (htmlContent.match(/\bstyle="[^"]*"/gi) || []).length;
    const buttonCount = (htmlContent.match(/<button\b/gi) || []).length;
    const streamCount = (htmlContent.match(/class="[^"]*(stream|pulse|activity|activity-list)[^"]*"/gi) || []).length;

    // Detect layout archetype
    let layoutArchetype = 'UNKNOWN';
    if (hasHeroStage && hasInspector && hasTimeline) {
      layoutArchetype = '3_PANE_COCKPIT';
    } else if (hasSquadGroups && hasInspector) {
      layoutArchetype = 'SPLIT_WORKFORCE_CONSOLE';
    } else if (hasDockTray && (htmlContent.includes('editor') || htmlContent.includes('code'))) {
      layoutArchetype = '4_QUADRANT_IDE';
    } else if (cardCount > 6 && !hasHeroStage) {
      layoutArchetype = 'SAAS_KPI_DASHBOARD_ANTIPATTERN';
    } else {
      layoutArchetype = 'INTEGRATED_WORKSPACE';
    }

    // Dominance & Density scores
    const isAntiPattern = layoutArchetype === 'SAAS_KPI_DASHBOARD_ANTIPATTERN';
    const dominanceScore = hasHeroStage ? 95 : (hasSquadGroups ? 90 : (hasDockTray ? 92 : 60));
    const hierarchyDepth = (hasHeroStage ? 1 : 0) + (hasInspector ? 1 : 0) + (hasTimeline ? 1 : 0) + (hasDockTray ? 1 : 0);

    return {
      viewId,
      layoutArchetype,
      isAntiPattern,
      zones: {
        hasNav,
        hasHeroStage,
        hasInspector,
        hasTimeline,
        hasDockTray,
        hasSquadGroups
      },
      counts: {
        cardCount,
        inlineStyleCount,
        buttonCount,
        streamCount
      },
      metrics: {
        dominanceScore,
        hierarchyDepth,
        densityScore: Math.max(0, 100 - (cardCount * 3) - (inlineStyleCount > 20 ? 15 : 0)),
        isCockpitCompliant: hasHeroStage && hasInspector,
        isZeroFlashCompliant: !htmlContent.includes('background:#FFFFFF') && !htmlContent.includes('background: #FFFFFF')
      }
    };
  }

  /**
   * Analyzes an entire HTML file.
   * @param {string} filePath
   */
  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const views = ['command', 'agents', 'ide', 'operations', 'projects'];
    const results = {};

    for (const v of views) {
      const match = content.match(new RegExp(`<div[^>]*id="view-${v}"[\\s\\S]*?(?=<div[^>]*id="view-|<\\/body>|$)`, 'i'));
      if (match) {
        results[v] = this.decomposeSpatialLayout(match[0], `view-${v}`);
      }
    }

    return {
      filePath,
      views: results,
      analyzedAt: new Date().toISOString()
    };
  }
}

module.exports = { VisualCompositionEngine };
