'use strict';
/**
 * FÊNIX OS — Learning Engine
 * Connects: EXPERIENCE → LESSON → KNOWLEDGE → SKILL_CANDIDATE → SKILL (real cycle)
 * Tracks: knowledgeReuseRate, memoryHits, skillHits, externalAIAvoided
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = '/opt/fenix-os/grg/data';
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');
const EXPERIENCES_FILE = path.join(DATA_DIR, 'experiences.json');
const METRICS_FILE = path.join(DATA_DIR, 'learning-metrics.json');
const MODEL_MEMORY_FILE = path.join(DATA_DIR, 'model-memory.json');
const ERROR_MEMORY_FILE = path.join(DATA_DIR, 'error-memory.json');
const SKILL_CANDIDATES_FILE = path.join(DATA_DIR, 'skill-candidates.json');
const SKILLS_DIR = path.join('/opt/fenix-os/grg', 'skills');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

function readJSON(file, fallback = {}) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return fallback;
}

function writeJSON(file, data) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

class LearningEngine {
  constructor() {
    ensureDir();
    this._metrics = readJSON(METRICS_FILE, {
      totalTasks: 0,
      eligibleTasks: 0,
      reusedTasks: 0,
      memoryHits: 0,
      knowledgeHits: 0,
      skillHits: 0,
      workflowHits: 0,
      externalAIAvoided: 0,
      estimatedTokensSaved: 0,
      estimatedCostSaved: 0,
      learningEvents: 0,
    });
    this._saveMetricsTimer = null;
  }

  // ── Experience recording ──────────────────────────────────────────────────
  recordExperience(exp) {
    ensureDir();
    const experiences = readJSON(EXPERIENCES_FILE, []);
    const entry = {
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      task: exp.task || exp.taskType || 'unknown',
      taskType: exp.taskType || exp.task || 'general',
      model: exp.model || null,
      provider: exp.provider || null,
      agentId: exp.agentId || null,
      projectId: exp.projectId || null,
      result: exp.result || 'unknown',
      success: exp.success !== undefined ? Boolean(exp.success) : (exp.result === 'success'),
      durationMs: exp.durationMs || null,
      estimatedCost: exp.estimatedCost || 0,
      estimatedTokens: exp.estimatedTokens || 0,
      errors: exp.errors || [],
      lesson: exp.lesson || exp.description || '',
      reuseCandidate: false,
      knowledgeId: null,
      skillId: null,
    };

    // Determine reuseCandidate
    const lessonLen = (entry.lesson || '').length;
    entry.reuseCandidate = lessonLen >= 20 && entry.success;

    experiences.push(entry);
    if (experiences.length > 2000) experiences.splice(0, experiences.length - 2000);
    writeJSON(EXPERIENCES_FILE, experiences);

    this._metrics.totalTasks++;
    this._metrics.learningEvents++;
    this._saveMetrics();

    // Trigger distillation for reusable experiences
    if (entry.reuseCandidate) {
      setImmediate(() => this._distillExperience(entry, experiences));
    }

    return entry;
  }

  // ── Skill lookup BEFORE calling AI ────────────────────────────────────────
  lookupSkill(taskType, context = '') {
    const knowledge = readJSON(KNOWLEDGE_FILE, []);
    const candidates = readJSON(SKILL_CANDIDATES_FILE, []);
    this._metrics.eligibleTasks++;
    this._saveMetrics();

    // 1. Exact taskType match in validated knowledge
    const exactMatch = knowledge.find(k =>
      k.status === 'VALIDATED' &&
      (k.taskType === taskType || this._similarity(k.taskType, taskType) > 0.7)
    );
    if (exactMatch) {
      this._metrics.knowledgeHits++;
      this._metrics.reusedTasks++;
      this._metrics.externalAIAvoided++;
      this._metrics.estimatedTokensSaved += exactMatch.estimatedTokensSaved || 500;
      this._metrics.estimatedCostSaved += exactMatch.estimatedCostSaved || 0.002;
      exactMatch.successRate = Math.min(1, (exactMatch.successRate || 0.5) + 0.01);
      exactMatch.lastUsed = new Date().toISOString();
      writeJSON(KNOWLEDGE_FILE, knowledge);
      this._saveMetrics();
      return { hit: true, type: 'knowledge', knowledge: exactMatch, adapted: false };
    }

    // 2. Partial match / adaptation
    const partial = knowledge.find(k =>
      k.status === 'VALIDATED' &&
      this._similarity(k.taskType, taskType) > 0.4
    );
    if (partial) {
      this._metrics.knowledgeHits++;
      this._metrics.reusedTasks++;
      this._metrics.externalAIAvoided++;
      this._metrics.estimatedTokensSaved += 300;
      partial.lastUsed = new Date().toISOString();
      writeJSON(KNOWLEDGE_FILE, knowledge);
      this._saveMetrics();
      return { hit: true, type: 'knowledge', knowledge: partial, adapted: true };
    }

    return { hit: false, type: null };
  }

  // ── Knowledge distillation ────────────────────────────────────────────────
  _distillExperience(entry, allExperiences) {
    const taskType = entry.taskType;
    const similar = allExperiences.filter(e =>
      e.success &&
      e.reuseCandidate &&
      this._similarity(e.taskType, taskType) > 0.6
    );

    const THRESHOLD = Number(process.env.SKILL_THRESHOLD || 3);
    if (similar.length < THRESHOLD) return; // Not enough evidence yet

    const knowledge = readJSON(KNOWLEDGE_FILE, []);

    // Deduplication: check if knowledge for this taskType exists
    const existing = knowledge.find(k => this._similarity(k.taskType, taskType) > 0.7);
    if (existing) {
      // Update evidence count
      existing.evidenceCount = similar.length;
      existing.lastValidated = new Date().toISOString();
      existing.confidence = Math.min(0.99, 0.5 + (similar.length * 0.05));
      if (entry.lesson && !existing.lessons.includes(entry.lesson)) {
        existing.lessons.push(entry.lesson);
        if (existing.lessons.length > 20) existing.lessons.shift();
      }
      writeJSON(KNOWLEDGE_FILE, knowledge);
      this._promoteToSkill(existing);
      return;
    }

    // Create new knowledge entry
    const lessons = [...new Set(similar.map(e => e.lesson).filter(Boolean))];
    const avgTokens = similar.reduce((s, e) => s + (e.estimatedTokens || 500), 0) / similar.length;
    const newKnowledge = {
      id: 'know_' + Date.now(),
      taskType,
      status: 'VALIDATED',
      confidence: Math.min(0.99, 0.5 + (similar.length * 0.05)),
      evidenceCount: similar.length,
      successRate: similar.filter(e => e.success).length / similar.length,
      lessons,
      pattern: lessons[0] || 'Recurring pattern for ' + taskType,
      estimatedTokensSaved: avgTokens,
      estimatedCostSaved: avgTokens * 0.000002,
      models: [...new Set(similar.map(e => e.model).filter(Boolean))],
      createdAt: new Date().toISOString(),
      lastValidated: new Date().toISOString(),
      lastUsed: null,
      source: entry.id,
    };

    knowledge.push(newKnowledge);
    if (knowledge.length > 500) knowledge.splice(0, knowledge.length - 500);
    writeJSON(KNOWLEDGE_FILE, knowledge);
    this._promoteToSkill(newKnowledge);
  }

  _promoteToSkill(knowledge) {
    if (knowledge.confidence < 0.6 || knowledge.evidenceCount < 3) return;

    // Write as a .skill.md file in the skills directory
    const skillId = 'auto-' + knowledge.taskType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const skillDir = path.join(SKILLS_DIR, skillId);
    if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true });

    const skillContent = [
      '---',
      `name: ${knowledge.taskType}`,
      `description: Auto-generated skill from ${knowledge.evidenceCount} real executions`,
      `triggers:`,
      `  - ${knowledge.taskType.toLowerCase()}`,
      `domains:`,
      `  - general`,
      '---',
      '',
      `# ${knowledge.taskType}`,
      '',
      `**Evidence**: ${knowledge.evidenceCount} executions | **Confidence**: ${(knowledge.confidence * 100).toFixed(0)}%`,
      '',
      '## What Works',
      ...knowledge.lessons.slice(0, 5).map(l => `- ${l}`),
      '',
      `*Auto-generated: ${knowledge.lastValidated}*`,
    ].join('\n');

    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent, 'utf8');

    // Update skill candidates log
    const candidates = readJSON(SKILL_CANDIDATES_FILE, []);
    const existingCand = candidates.find(c => c.taskType === knowledge.taskType);
    if (existingCand) {
      existingCand.status = 'PROMOTED';
      existingCand.updatedAt = new Date().toISOString();
    } else {
      candidates.push({
        id: skillId,
        taskType: knowledge.taskType,
        status: 'PROMOTED',
        knowledgeId: knowledge.id,
        confidence: knowledge.confidence,
        evidenceCount: knowledge.evidenceCount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    writeJSON(SKILL_CANDIDATES_FILE, candidates);
    this._metrics.learningEvents++;
    this._saveMetrics();
  }

  // ── Model Memory ──────────────────────────────────────────────────────────
  recordModelPerformance({ taskType, model, provider, success, latencyMs, estimatedCost, quality }) {
    const mem = readJSON(MODEL_MEMORY_FILE, {});
    const key = `${taskType}::${model || 'unknown'}`;
    if (!mem[key]) {
      mem[key] = { taskType, model, provider, calls: 0, successes: 0, totalLatency: 0, totalCost: 0, quality: [] };
    }
    const entry = mem[key];
    entry.calls++;
    if (success) entry.successes++;
    entry.totalLatency += (latencyMs || 0);
    entry.totalCost += (estimatedCost || 0);
    if (quality) entry.quality.push(quality);
    if (entry.quality.length > 50) entry.quality.shift();
    entry.successRate = entry.successes / entry.calls;
    entry.avgLatency = entry.totalLatency / entry.calls;
    entry.avgCost = entry.totalCost / entry.calls;
    entry.lastUsed = new Date().toISOString();
    writeJSON(MODEL_MEMORY_FILE, mem);
  }

  getModelPerformance() {
    return readJSON(MODEL_MEMORY_FILE, {});
  }

  getBestModelForTask(taskType) {
    const mem = readJSON(MODEL_MEMORY_FILE, {});
    const relevant = Object.values(mem).filter(e => e.taskType === taskType && e.calls >= 2);
    if (!relevant.length) return null;
    return relevant.sort((a, b) => (b.successRate - a.successRate) || (a.avgLatency - b.avgLatency))[0];
  }

  // ── Error Memory ──────────────────────────────────────────────────────────
  recordError({ errorType, cause, fix, validated, context }) {
    const errors = readJSON(ERROR_MEMORY_FILE, []);
    const existing = errors.find(e => e.errorType === errorType);
    if (existing) {
      if (fix && !existing.fixes.includes(fix)) existing.fixes.push(fix);
      existing.occurrences++;
      existing.lastSeen = new Date().toISOString();
      if (validated !== undefined) existing.validated = validated;
    } else {
      errors.push({
        id: 'err_' + Date.now(),
        errorType,
        cause: cause || '',
        fixes: fix ? [fix] : [],
        validated: validated !== undefined ? validated : true,
        occurrences: 1,
        context: context || '',
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      });
    }
    if (errors.length > 1000) errors.splice(0, errors.length - 1000);
    writeJSON(ERROR_MEMORY_FILE, errors);
  }

  lookupError(errorType) {
    const errors = readJSON(ERROR_MEMORY_FILE, []);
    return errors.find(e => e.errorType === errorType && e.validated && e.fixes.length > 0) || null;
  }

  getErrors() { return readJSON(ERROR_MEMORY_FILE, []); }

  // ── Metrics ───────────────────────────────────────────────────────────────
  getMetrics() {
    const metrics = readJSON(METRICS_FILE, this._metrics);
    const reuseRate = metrics.eligibleTasks > 0
      ? (metrics.reusedTasks / metrics.eligibleTasks)
      : 0;
    return {
      ...metrics,
      knowledgeReuseRate: Math.round(reuseRate * 100) / 100,
      knowledgeReuseRatePct: (reuseRate * 100).toFixed(1) + '%',
    };
  }

  getKnowledge() { return readJSON(KNOWLEDGE_FILE, []); }
  getExperiences() { return readJSON(EXPERIENCES_FILE, []); }
  getSkillCandidates() { return readJSON(SKILL_CANDIDATES_FILE, []); }

  getMemoryTrail(experienceId) {
    const experiences = readJSON(EXPERIENCES_FILE, []);
    const exp = experiences.find(e => e.id === experienceId);
    if (!exp) return null;
    const knowledge = readJSON(KNOWLEDGE_FILE, []);
    const know = knowledge.find(k => k.taskType === exp.taskType);
    const candidates = readJSON(SKILL_CANDIDATES_FILE, []);
    const skill = candidates.find(c => c.taskType === exp.taskType);
    return { experience: exp, knowledge: know || null, skill: skill || null };
  }

  _saveMetrics() {
    if (this._saveMetricsTimer) return;
    this._saveMetricsTimer = setTimeout(() => {
      writeJSON(METRICS_FILE, this._metrics);
      this._saveMetricsTimer = null;
    }, 500);
  }

  // ── Text similarity (simple token overlap) ────────────────────────────────
  _similarity(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const tokA = new Set(a.toLowerCase().split(/[\s_\-\/]+/).filter(t => t.length > 2));
    const tokB = new Set(b.toLowerCase().split(/[\s_\-\/]+/).filter(t => t.length > 2));
    if (!tokA.size || !tokB.size) return 0;
    const intersection = [...tokA].filter(t => tokB.has(t)).length;
    return intersection / Math.max(tokA.size, tokB.size);
  }
}

// Singleton
let _instance = null;
function getLearningEngine() {
  if (!_instance) _instance = new LearningEngine();
  return _instance;
}

module.exports = { LearningEngine, getLearningEngine };
