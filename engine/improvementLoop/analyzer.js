const { generateDesignSystem } = require('../designSystem');

function normalizeFiles(files = []) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .map((entry, index) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === 'string') {
        return {
          path: `inline-${index}.txt`,
          content: entry,
        };
      }

      if (typeof entry === 'object') {
        return {
          path: String(entry.path || entry.filePath || entry.name || `inline-${index}.txt`),
          content: typeof entry.content === 'string' ? entry.content : String(entry.code || entry.source || ''),
        };
      }

      return null;
    })
    .filter((item) => Boolean(item && item.content));
}

function summarizeFiles(files = []) {
  const summary = {
    totalFiles: files.length,
    frontendFiles: 0,
    backendFiles: 0,
    testFiles: 0,
    tailwindHits: 0,
    reactHits: 0,
  };

  for (const file of files) {
    const normalized = file.path.toLowerCase();
    const content = file.content;

    if (/\.(jsx|tsx|html|css|scss|sass|less|vue|svelte)$/i.test(file.path)) {
      summary.frontendFiles += 1;
    }

    if (/\.(js|ts|mjs|cjs)$/i.test(file.path) && /(server|api|controller|service|backend)/i.test(normalized)) {
      summary.backendFiles += 1;
    }

    if (/\b(test|spec)\b/i.test(normalized)) {
      summary.testFiles += 1;
    }

    if (/tailwind|className\s*=\s*["'`][^"'`]*\b(?:p|m|bg|text)-/i.test(content)) {
      summary.tailwindHits += 1;
    }

    if (/from ['\"]react['\"]|import React|function\s+[A-Z][A-Za-z0-9_]*\s*\(/.test(content)) {
      summary.reactHits += 1;
    }
  }

  return summary;
}

function analyzeProject(projectContext = {}, options = {}) {
  const files = normalizeFiles(projectContext.files || []);
  const summary = summarizeFiles(files);
  const designSystem = generateDesignSystem({ files });

  return {
    metadata: {
      currentGoal: String(projectContext.currentGoal || ''),
      projectContextSize: String(projectContext.projectContext || '').length,
      generatedAt: new Date().toISOString(),
      mode: options.mode || 'suggest-only',
    },
    summary,
    designSystem,
    fileMap: files.map((file) => ({
      path: file.path,
      size: file.content.length,
    })),
  };
}

module.exports = {
  analyzeProject,
  normalizeFiles,
};
