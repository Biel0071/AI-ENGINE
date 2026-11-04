'use strict';

const crypto = require('node:crypto');

function hasValidationEvidence(evidence = {}) {
  return evidence.validationStatus === 'VERIFIED'
    && Array.isArray(evidence.testIds)
    && evidence.testIds.length > 0
    && Number.isFinite(Date.parse(evidence.validatedAt));
}

function mayPromote(status, evidence) {
  if (status === 'PROVEN') return hasValidationEvidence(evidence);
  if (status === 'CORE') return hasValidationEvidence(evidence) && Boolean(evidence.approvedBy);
  return true;
}

/**
 * FÊNIX OS — Pattern Library (Level 10)
 * 
 * Central Repository of Proven Architectural, UI, Visual, and Operational Patterns.
 * Features:
 * - Deduplication via structural hash (SHA-256)
 * - Status lifecycle: CANDIDATE -> PROVEN -> CORE -> ARCHIVED
 * - Decision ledger: REUSE (existing pattern), ADAPT (similar pattern), LEARN (new pattern)
 * - Usage tracking and confidence scoring
 */
class PatternLibrary {
  constructor(options = {}) {
    this.patterns = [];
    this.patternsById = new Map();
    this.patternsByHash = new Map();
    this.usageStats = {
      totalLearned: 0,
      totalReused: 0,
      totalAdapted: 0,
    };

    if (options.initialPatterns && Array.isArray(options.initialPatterns)) {
      for (const p of options.initialPatterns) {
        this.registerPattern(p);
      }
    }
  }

  /**
   * Generates a stable structural signature hash for a pattern
   */
  computeSignature(pattern = {}) {
    const raw = `${pattern.type || ''}::${pattern.category || 'UI'}::${pattern.concept || ''}::${JSON.stringify(pattern.structure || pattern.components || {})}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }

  /**
   * Registers a pattern with deduplication and usage tracking
   */
  registerPattern(patternInput = {}) {
    const signature = patternInput.signature || this.computeSignature(patternInput);
    
    // Check if exact pattern already exists
    if (this.patternsByHash.has(signature)) {
      const existing = this.patternsByHash.get(signature);
      existing.usageCount = (existing.usageCount || 0) + 1;
      existing.lastUsedAt = new Date().toISOString();
      if (['PROVEN', 'CORE'].includes(patternInput.status) && mayPromote(patternInput.status, patternInput.evidence)) {
        existing.status = patternInput.status;
        existing.confidence = patternInput.confidence || existing.confidence;
        existing.evidence = { ...(existing.evidence || {}), ...(patternInput.evidence || {}) };
      }
      if (patternInput.sourceProject && !existing.sourceProjects?.includes(patternInput.sourceProject)) {
        existing.sourceProjects = existing.sourceProjects || [existing.sourceProject];
        existing.sourceProjects.push(patternInput.sourceProject);
      }
      this.usageStats.totalReused++;
      return { status: 'REUSE', pattern: existing, isNew: false, signature };
    }

    // Check for similar pattern (same category and concept similarity)
    const similar = this.patterns.find(p => 
      p.type === patternInput.type || 
      (p.category === patternInput.category && p.concept === patternInput.concept)
    );

    if (similar && patternInput.allowAdaptation) {
      similar.usageCount = (similar.usageCount || 0) + 1;
      similar.lastUsedAt = new Date().toISOString();
      this.usageStats.totalAdapted++;
      return { status: 'ADAPT', pattern: similar, isNew: false, signature };
    }

    // Register new learned pattern
    const id = patternInput.id || `PTN-${signature.slice(0, 8)}`;
    const validated = hasValidationEvidence(patternInput.evidence);
    const status = mayPromote(patternInput.status, patternInput.evidence)
      ? (patternInput.status || 'CANDIDATE')
      : 'CANDIDATE';
    const pattern = {
      id,
      signature,
      type: patternInput.type || 'GENERAL_PATTERN',
      category: patternInput.category || 'ARCHITECTURE',
      scope: patternInput.scope || 'GLOBAL',
      sourceProject: patternInput.sourceProject || 'system',
      sourceProjects: [patternInput.sourceProject || 'system'],
      confidence: validated ? (patternInput.confidence || 'HIGH') : 'UNASSESSED',
      concept: patternInput.concept || 'Structural pattern',
      structure: patternInput.structure || {},
      components: patternInput.components || [],
      designTokens: patternInput.designTokens || {},
      codeTemplate: patternInput.codeTemplate || null,
      doNotCopy: patternInput.doNotCopy || ['branding', 'specific_secrets'],
      usageCount: 1,
      status,
      createdAt: patternInput.createdAt || new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      evidence: patternInput.evidence || null,
    };

    this.patterns.push(pattern);
    this.patternsById.set(id, pattern);
    this.patternsByHash.set(signature, pattern);
    this.usageStats.totalLearned++;

    return { status: 'LEARN', pattern, isNew: true, signature };
  }

  /**
   * Find pattern by ID
   */
  getPattern(id) {
    return this.patternsById.get(id) || null;
  }

  /**
   * Find pattern by signature hash
   */
  findBySignature(signature) {
    return this.patternsByHash.get(signature) || null;
  }

  /**
   * Search patterns by criteria or query
   */
  findPatterns(query = '') {
    const q = String(query).toLowerCase().trim();
    if (!q) return [...this.patterns];
    return this.patterns.filter(p => 
      p.id.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.concept && p.concept.toLowerCase().includes(q)) ||
      (p.sourceProject && p.sourceProject.toLowerCase().includes(q))
    );
  }

  findReusablePatterns(query = '') {
    return this.findPatterns(query).filter((pattern) => mayPromote(pattern.status, pattern.evidence)
      && ['PROVEN', 'CORE'].includes(pattern.status));
  }

  /**
   * Backward-compatible pattern extraction from project context
   */
  extractPatterns(projectContext = {}) {
    const newPatterns = [];
    const files = projectContext.files || [];

    if (files.some(f => (typeof f === 'string' ? f : f.path || '').includes('admin') || (typeof f === 'string' ? f : f.path || '').includes('auth'))) {
      const res = this.registerPattern({
        type: 'ADMIN_USER_MANAGEMENT',
        category: 'SECURITY',
        scope: 'ORGANIZATION',
        sourceProject: projectContext.projectName || 'unknown',
        confidence: 'HIGH',
        concept: 'Role-based access control with visual dashboard',
        doNotCopy: ['visual identity', 'branding', 'colors'],
      });
      newPatterns.push(res.pattern);
    }

    if (files.some(f => (typeof f === 'string' ? f : f.path || '').includes('sidebar') || (typeof f === 'string' ? f : f.path || '').includes('nav'))) {
      const res = this.registerPattern({
        type: 'CONTEXTUAL_NAVIGATION',
        category: 'UI',
        scope: 'ORGANIZATION',
        sourceProject: projectContext.projectName || 'unknown',
        confidence: 'MEDIUM',
        concept: 'Left sidebar with dynamic contextual routes',
        doNotCopy: ['visual identity'],
      });
      newPatterns.push(res.pattern);
    }

    return newPatterns;
  }

  /**
   * Cleanses private project details, branding, credentials and company secrets
   * before a pattern can be stored or promoted to GLOBAL scope.
   */
  anonymizePattern(patternInput = {}) {
    const sanitizeStr = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/https?:\/\/[^\s"'`]+/gi, 'https://example.local')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, 'user@domain.local')
        .replace(/(bearer\s+[a-zA-Z0-9_\-\.]+)/gi, 'bearer [REDACTED_TOKEN]')
        .replace(/(apiKey|password|secret|token|client_secret)\s*[:=]\s*['"][^'"]+['"]/gi, '$1: "[REDACTED_SECRET]"');
    };

    const deepSanitize = (val) => {
      if (val === null || val === undefined) return val;
      if (typeof val === 'string') return sanitizeStr(val);
      if (Array.isArray(val)) return val.map(deepSanitize);
      if (typeof val === 'object') {
        const res = {};
        for (const [k, v] of Object.entries(val)) {
          if (/password|secret|apiKey|token/i.test(k) && typeof v === 'string') {
            res[k] = '[REDACTED_SECRET]';
          } else {
            res[k] = deepSanitize(v);
          }
        }
        return res;
      }
      return val;
    };

    const anonymized = deepSanitize(JSON.parse(JSON.stringify(patternInput)));

    // Explicitly guarantee isolation boundaries in doNotCopy
    const baseDoNotCopy = Array.isArray(anonymized.doNotCopy) ? anonymized.doNotCopy : [];
    anonymized.doNotCopy = [...new Set([
      ...baseDoNotCopy,
      'branding',
      'proprietary_assets',
      'specific_secrets',
      'project_identifiers',
      'credentials'
    ])];

    return anonymized;
  }

  /**
   * Registers a pattern learned from studio execution (visual edit, reconstruction, QA defect fix, multitrack video)
   * with automatic privacy sanitization when scope is GLOBAL.
   */
  registerLearnedPattern(patternInput = {}) {
    const isGlobal = patternInput.scope === 'GLOBAL';
    const target = isGlobal ? this.anonymizePattern(patternInput) : { ...patternInput };

    target.isLearnedFromExecution = true;
    target.learnedAt = target.learnedAt || new Date().toISOString();

    return this.registerPattern(target);
  }

  /**
   * Query patterns strictly respecting multi-project isolation.
   * Returns GLOBAL patterns plus patterns belonging specifically to the requested projectId.
   * Project A NEVER sees private patterns from Project B.
   */
  findPatternsForProject(projectId = 'system', query = '') {
    const all = this.findPatterns(query);
    return all.filter((p) => {
      // Global patterns are visible to all projects (they are anonymized templates)
      if (p.scope === 'GLOBAL') return true;
      // Project-specific patterns are only visible to their owning project
      return p.sourceProject === projectId;
    });
  }

  /**
   * List patterns with optional scope filter
   */
  listPatterns(scopeFilter = null) {
    if (!scopeFilter) return [...this.patterns];
    return this.patterns.filter(p => p.scope === scopeFilter || p.scope === 'GLOBAL');
  }

  /**
   * Returns comprehensive statistics about learned vs reused patterns
   */
  getStats() {
    const byCategory = {};
    const byType = {};
    for (const p of this.patterns) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      byType[p.type] = (byType[p.type] || 0) + 1;
    }
    return {
      totalPatterns: this.patterns.length,
      totalLearned: this.usageStats.totalLearned,
      totalReused: this.usageStats.totalReused,
      totalAdapted: this.usageStats.totalAdapted,
      byCategory,
      byType,
    };
  }
}

const globalPatternLibrary = new PatternLibrary();

module.exports = { PatternLibrary, globalPatternLibrary };
