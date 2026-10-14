const crypto = require('crypto');

class PatternLibrary {
  constructor() {
    this.patterns = [];
  }

  extractPatterns(projectContext) {
    console.log('[PatternLibrary] Extracting patterns');
    const newPatterns = [];
    
    // Abstract extraction logic
    if (projectContext.files && projectContext.files.some(f => f.includes('admin') || f.includes('auth'))) {
      newPatterns.push({
        id: `PTN-${crypto.createHash('sha1').update(`${projectContext.projectName || 'unknown'}:ADMIN_USER_MANAGEMENT`).digest('hex').slice(0, 12)}`,
        type: 'ADMIN_USER_MANAGEMENT',
        scope: 'ORGANIZATION',
        sourceProject: projectContext.projectName,
        confidence: 'HIGH',
        concept: 'Role-based access control with visual dashboard',
        doNotCopy: ['visual identity', 'branding', 'colors'],
        usageCount: 0,
        status: 'CANDIDATE',
        lastValidated: null
      });
    }

    if (projectContext.files && projectContext.files.some(f => f.includes('sidebar') || f.includes('nav'))) {
      newPatterns.push({
        id: `PTN-${crypto.createHash('sha1').update(`${projectContext.projectName || 'unknown'}:CONTEXTUAL_NAVIGATION`).digest('hex').slice(0, 12)}`,
        type: 'CONTEXTUAL_NAVIGATION',
        scope: 'ORGANIZATION',
        sourceProject: projectContext.projectName,
        confidence: 'MEDIUM',
        concept: 'Left sidebar with dynamic contextual routes',
        doNotCopy: ['visual identity'],
        usageCount: 0,
        status: 'CANDIDATE',
        lastValidated: null
      });
    }

    this.patterns.push(...newPatterns);
    return newPatterns;
  }

  listPatterns(scopeFilter = null) {
    if (!scopeFilter) return this.patterns;
    return this.patterns.filter(p => p.scope === scopeFilter || p.scope === 'GLOBAL');
  }
}

module.exports = { PatternLibrary };
