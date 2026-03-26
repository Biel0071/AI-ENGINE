const SCREEN_FILE_REGEX = /(page|screen|view|route|layout|app)\.(jsx|tsx|js|ts|html|vue|svelte)$/i;
const UI_FILE_REGEX = /\.(jsx|tsx|html|css|scss|sass|less|vue|svelte)$/i;

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

function mapScreens(files = []) {
  return files
    .filter((file) => SCREEN_FILE_REGEX.test(file.path) || /pages?|screens?|views?/i.test(file.path))
    .map((file) => ({
      id: file.path.replace(/\\/g, '/'),
      path: file.path,
      hasUI: UI_FILE_REGEX.test(file.path),
      hasNavigation: /<Link|navigate\(|router\.|href=|to=/.test(file.content),
      hasApiCall: /fetch\(|axios\.|http\.|api\//i.test(file.content),
    }));
}

function detectBrokenFlows(files = [], screens = []) {
  const issues = [];
  const hasBackendEndpointHints = files.some((file) => /app\.(get|post|put|patch|delete)|router\.(get|post|put|patch|delete)/i.test(file.content));

  for (const screen of screens) {
    if (screen.hasApiCall && !hasBackendEndpointHints) {
      issues.push({
        type: 'broken-flow',
        severity: 'medium',
        screen: screen.path,
        message: 'Screen performs API calls but no endpoint signatures were detected in provided files.',
      });
    }

    if (!screen.hasNavigation && screens.length > 1) {
      issues.push({
        type: 'orphan-screen',
        severity: 'low',
        screen: screen.path,
        message: 'Screen has no visible navigation signal and may be isolated from user flow.',
      });
    }
  }

  return issues;
}

function detectMissingComponents(files = [], screens = []) {
  const componentImports = new Set();
  const declaredComponents = new Set();

  for (const file of files) {
    const importMatches = file.content.match(/import\s+([A-Z][A-Za-z0-9_]*)\s+from/g) || [];
    for (const match of importMatches) {
      const comp = match.replace(/import\s+/, '').replace(/\s+from$/, '').trim();
      if (comp) {
        componentImports.add(comp);
      }
    }

    const declMatches = file.content.match(/(?:function|const|class)\s+([A-Z][A-Za-z0-9_]*)/g) || [];
    for (const match of declMatches) {
      const parts = match.split(/\s+/);
      const name = parts[1];
      if (name) {
        declaredComponents.add(name);
      }
    }
  }

  const missing = [];
  for (const imported of componentImports) {
    if (!declaredComponents.has(imported)) {
      missing.push({
        type: 'missing-component',
        severity: 'medium',
        component: imported,
        message: `Imported component ${imported} was not detected in provided payload.`,
        affectedScreens: screens.filter((screen) => new RegExp(`\\b${imported}\\b`).test(String(screen.id || ''))).map((screen) => screen.path),
      });
    }
  }

  return missing.slice(0, 30);
}

function detectUIInconsistencies(files = []) {
  const inconsistentSignals = [];
  const hasManyInlineStyles = files.filter((file) => /style=\{\{|style="|style='/.test(file.content)).length;
  const hasManyTailwind = files.filter((file) => /className=|class=/.test(file.content)).length;

  if (hasManyInlineStyles > 4 && hasManyTailwind > 0) {
    inconsistentSignals.push({
      type: 'ui-inconsistency',
      severity: 'medium',
      message: 'Mixed inline styles and utility classes indicate unstable UI composition patterns.',
    });
  }

  return inconsistentSignals;
}

function ingestProject(projectContext = {}, options = {}) {
  const files = normalizeFiles(projectContext.files || []).slice(0, Number(options.maxFiles || 1200));
  const screens = mapScreens(files);
  const brokenFlows = detectBrokenFlows(files, screens);
  const missingComponents = detectMissingComponents(files, screens);
  const uiInconsistencies = detectUIInconsistencies(files);

  return {
    project: {
      currentGoal: String(projectContext.currentGoal || ''),
      contextSize: String(projectContext.projectContext || '').length,
      fileCount: files.length,
    },
    files,
    screens,
    flowIssues: brokenFlows,
    missingComponents,
    uiInconsistencies,
    ingestedAt: new Date().toISOString(),
  };
}

module.exports = {
  ingestProject,
  normalizeFiles,
};
