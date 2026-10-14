/**
 * FÊNIX OS — DEVELOPMENT MEMORY & LEARNING ENGINE (LEVEL 10)
 * 
 * Objective: Learn from every task, bug fix, decision, and solution.
 * Use learned patterns to reduce token waste and reprocessing on future tasks.
 * 
 * Categories:
 * PROJECT, ARCHITECTURE, BUG, DECISION, PATTERN, PREFERENCE,
 * INTEGRATION, DEPLOYMENT, SECURITY, PERFORMANCE, FAILED_ATTEMPT, SUCCESSFUL_SOLUTION
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DevelopmentMemory {
  constructor({ memoryDir = null } = {}) {
    this.memoryDir = memoryDir || path.join(__dirname, '..', '..', 'memory');
    this.memoryFile = path.join(this.memoryDir, 'development-memory.json');
    this.entries = [];
    this.patterns = new Map(); // patternHash -> PatternRecord
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const data = JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
        this.entries = data.entries || [];
        for (const p of (data.patterns || [])) {
          this.patterns.set(p.hash, p);
        }
      }
    } catch {
      this.entries = [];
    }
  }

  _persist() {
    try {
      if (!fs.existsSync(this.memoryDir)) fs.mkdirSync(this.memoryDir, { recursive: true });
      const data = {
        version: '5.0.0',
        totalEntries: this.entries.length,
        totalPatterns: this.patterns.size,
        entries: this.entries.slice(-500), // Keep last 500 entries
        patterns: Array.from(this.patterns.values()),
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.memoryFile, JSON.stringify(data, null, 2));
    } catch {
      // Fallback in-memory
    }
  }

  /**
   * Record a development memory entry
   */
  record({
    category = 'PROJECT', // PROJECT | ARCHITECTURE | BUG | DECISION | PATTERN | PREFERENCE | INTEGRATION | DEPLOYMENT | SECURITY | PERFORMANCE | FAILED_ATTEMPT | SUCCESSFUL_SOLUTION
    projectId = 'default',
    title = '',
    description = '',
    context = {},
    solution = null,
    filesAffected = [],
    tags = [],
    confidence = 1.0,
    source = 'fenix_mind'
  } = {}) {
    const entry = {
      id: `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      category,
      projectId,
      title,
      description,
      context,
      solution,
      filesAffected,
      tags,
      confidence,
      source,
      usedCount: 0,
      createdAt: new Date().toISOString()
    };

    this.entries.push(entry);

    // Auto-detect patterns
    if (category === 'BUG' && solution) {
      this._learnPattern(entry);
    }
    if (category === 'SUCCESSFUL_SOLUTION') {
      this._learnPattern(entry);
    }

    this._persist();
    return entry;
  }

  /**
   * Retrieve relevant memories for a given context
   */
  retrieve({
    projectId = null,
    category = null,
    keywords = [],
    limit = 5
  } = {}) {
    let candidates = this.entries;

    if (projectId) {
      candidates = candidates.filter(e => e.projectId === projectId || e.projectId === 'default');
    }
    if (category) {
      candidates = candidates.filter(e => e.category === category);
    }

    // Score by keyword relevance
    if (keywords.length > 0) {
      const lowerKeywords = keywords.map(k => k.toLowerCase());
      candidates = candidates.map(entry => {
        const text = `${entry.title} ${entry.description} ${(entry.tags || []).join(' ')}`.toLowerCase();
        const score = lowerKeywords.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
        return { ...entry, relevanceScore: score };
      }).filter(e => e.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    const results = candidates.slice(-limit).reverse();
    
    // Mark as used
    for (const r of results) {
      const original = this.entries.find(e => e.id === r.id);
      if (original) original.usedCount = (original.usedCount || 0) + 1;
    }

    return results;
  }

  /**
   * Retrieve previously learned patterns for a given domain/project
   */
  getPatterns(projectId = null) {
    const allPatterns = Array.from(this.patterns.values());
    if (!projectId) return allPatterns;
    return allPatterns.filter(p => p.projectId === projectId || p.projectId === 'default');
  }

  /**
   * Learn a pattern from a successful resolution
   */
  _learnPattern(entry) {
    const key = `${entry.category}::${entry.title}`.toLowerCase().replace(/[^a-z0-9:]/g, '_');
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);

    if (this.patterns.has(hash)) {
      const existing = this.patterns.get(hash);
      existing.occurrences++;
      existing.lastSeen = new Date().toISOString();
      return;
    }

    this.patterns.set(hash, {
      hash,
      category: entry.category,
      projectId: entry.projectId,
      title: entry.title,
      solution: entry.solution,
      filesAffected: entry.filesAffected,
      tags: entry.tags,
      occurrences: 1,
      lastSeen: new Date().toISOString()
    });
  }

  /**
   * Get learning statistics
   */
  getStats() {
    const byCategory = {};
    for (const e of this.entries) {
      byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    }

    const totalUsed = this.entries.filter(e => (e.usedCount || 0) > 0).length;
    const totalEntries = this.entries.length;

    return {
      totalEntries,
      totalPatterns: this.patterns.size,
      totalUsed,
      reuseRate: totalEntries > 0 ? `${Math.round((totalUsed / totalEntries) * 100)}%` : '0%',
      byCategory,
      topPatterns: Array.from(this.patterns.values())
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 5)
        .map(p => ({ title: p.title, category: p.category, occurrences: p.occurrences }))
    };
  }
}

module.exports = { DevelopmentMemory };
