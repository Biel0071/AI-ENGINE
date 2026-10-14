'use strict';

/**
 * FÊNIX OS — Visual Pattern Memory (Fase 13)
 * =========================================
 * Persistent repository of proven spatial compositions, layout archetypes,
 * and design patterns synchronized with VISUAL_GENOME.json.
 */

const fs = require('fs');
const path = require('path');

const GENOME_PATH = path.resolve(__dirname, '../../../docs/VISUAL_GENOME.json');

class VisualPatternMemory {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.genomePath = options.genomePath || GENOME_PATH;
    this._memory = new Map();
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.genomePath)) {
        const raw = fs.readFileSync(this.genomePath, 'utf8');
        const genome = JSON.parse(raw);
        if (genome.spatialArchitecture && genome.spatialArchitecture.patterns) {
          for (const [key, pat] of Object.entries(genome.spatialArchitecture.patterns)) {
            this._memory.set(key, pat);
          }
        }
      }
    } catch (e) {
      this.logger.warn?.(`[VisualPatternMemory] Could not load genome: ${e.message}`);
    }
  }

  /**
   * Retrieves a proven spatial pattern by name.
   * @param {string} patternName
   */
  getPattern(patternName) {
    return this._memory.get(patternName) || null;
  }

  /**
   * Stores an approved pattern into memory and optionally writes to the Genome.
   * @param {string} patternName
   * @param {object} patternDef
   */
  savePattern(patternName, patternDef) {
    this._memory.set(patternName, patternDef);
    try {
      if (fs.existsSync(this.genomePath)) {
        const raw = fs.readFileSync(this.genomePath, 'utf8');
        const genome = JSON.parse(raw);
        if (!genome.spatialArchitecture) genome.spatialArchitecture = { patterns: {} };
        if (!genome.spatialArchitecture.patterns) genome.spatialArchitecture.patterns = {};
        genome.spatialArchitecture.patterns[patternName] = patternDef;
        fs.writeFileSync(this.genomePath, JSON.stringify(genome, null, 2), 'utf8');
      }
    } catch (e) {
      this.logger.error?.(`[VisualPatternMemory] Failed to persist pattern: ${e.message}`);
    }
  }

  /**
   * Lists all available patterns.
   */
  listPatterns() {
    return Array.from(this._memory.entries()).map(([name, def]) => ({ name, ...def }));
  }
}

module.exports = { VisualPatternMemory };
