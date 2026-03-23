const {
  extractColorsFromContent,
  extractSpacingFromContent,
  extractTypographyFromContent,
  extractComponentsFromContent,
} = require('./extractors');

const FRONTEND_FILE_REGEX = /\.(html|css|scss|sass|less|js|jsx|ts|tsx|vue|svelte)$/i;

function mergeCounter(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + Number(value || 0);
  }
}

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
        const filePath = String(entry.path || entry.filePath || entry.name || `inline-${index}.txt`);
        const content = typeof entry.content === 'string' ? entry.content : String(entry.code || entry.source || '');
        return {
          path: filePath,
          content,
        };
      }

      return null;
    })
    .filter((item) => Boolean(item && item.content) && FRONTEND_FILE_REGEX.test(item.path));
}

function deduplicateComponents(components = []) {
  const map = new Map();

  for (const component of components) {
    const key = `${component.name}::${component.kind}`;
    if (!map.has(key)) {
      map.set(key, component);
    }
  }

  return Array.from(map.values());
}

function countKeys(objectValue = {}) {
  return Object.keys(objectValue || {}).length;
}

function topEntries(counter = {}, limit = 8) {
  return Object.entries(counter || {})
    .sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0))
    .slice(0, limit)
    .map(([token, usage]) => ({ token, usage }));
}

function buildStabilizationInsights({ colors = {}, spacing = {}, typography = {}, components = [] }) {
  const inconsistencies = [];
  const normalizationSuggestions = [];
  const componentStandardization = [];

  const colorCount = countKeys(colors);
  const spacingCount = countKeys(spacing.tailwindScale || {}) + countKeys(spacing.cssValues || {});
  const fontFamilyCount = countKeys(typography.fontFamilies || {});

  if (colorCount > 14) {
    inconsistencies.push({
      type: 'palette-fragmentation',
      severity: 'medium',
      message: 'Color token count is high and may indicate visual inconsistency.',
    });
    normalizationSuggestions.push('Consolidate colors into semantic tokens (primary, surface, text, success, warning, danger).');
  }

  if (spacingCount > 16) {
    inconsistencies.push({
      type: 'spacing-drift',
      severity: 'low',
      message: 'Spacing token distribution is broad and may hurt rhythm consistency.',
    });
    normalizationSuggestions.push('Normalize spacing values to a compact scale such as 0,1,2,3,4,6,8,12.');
  }

  if (fontFamilyCount > 2) {
    inconsistencies.push({
      type: 'typography-drift',
      severity: 'medium',
      message: 'Multiple font families detected across files.',
    });
    normalizationSuggestions.push('Standardize typography into heading/body/mono families and enforce usage by token.');
  }

  const componentByName = {};
  for (const component of components) {
    componentByName[component.name] = (componentByName[component.name] || 0) + 1;
  }

  for (const [name, occurrences] of Object.entries(componentByName)) {
    if (occurrences > 1) {
      componentStandardization.push({
        component: name,
        recommendation: 'Review duplicate implementations and consolidate into shared component module.',
        occurrences,
      });
    }
  }

  const penalty = Math.min(85, inconsistencies.length * 14 + Math.max(0, colorCount - 10) + Math.max(0, spacingCount - 12));
  const uiScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    inconsistencies,
    normalizationSuggestions,
    componentStandardization,
    uiScore,
    topColorTokens: topEntries(colors),
    topSpacingTokens: topEntries(spacing.tailwindScale || {}),
    topTypographyTokens: topEntries(typography.typeScale || {}),
  };
}

class DesignSystemEngine {
  analyze(input = {}) {
    try {
      const normalizedFiles = normalizeFiles(input.files || []);
      const colors = {};
      const spacing = {
        tailwindScale: {},
        cssValues: {},
      };
      const typography = {
        typeScale: {},
        fontWeights: {},
        fontFamilies: {},
        cssSizes: {},
        lineHeights: {},
      };
      const components = [];

      for (const file of normalizedFiles) {
        mergeCounter(colors, extractColorsFromContent(file.content));

        const spacingData = extractSpacingFromContent(file.content);
        mergeCounter(spacing.tailwindScale, spacingData.tailwindScale);
        mergeCounter(spacing.cssValues, spacingData.cssValues);

        const typeData = extractTypographyFromContent(file.content);
        mergeCounter(typography.typeScale, typeData.typeScale);
        mergeCounter(typography.fontWeights, typeData.fontWeights);
        mergeCounter(typography.fontFamilies, typeData.fontFamilies);
        mergeCounter(typography.cssSizes, typeData.cssSizes);
        mergeCounter(typography.lineHeights, typeData.lineHeights);

        components.push(...extractComponentsFromContent(file.content, file.path));
      }

      const dedupedComponents = deduplicateComponents(components);
      const stabilization = buildStabilizationInsights({
        colors,
        spacing,
        typography,
        components: dedupedComponents,
      });

      return {
        designSystem: {
          colors,
          spacing,
          typography,
          components: dedupedComponents,
          inconsistencies: stabilization.inconsistencies,
          normalizationSuggestions: stabilization.normalizationSuggestions,
          componentStandardization: stabilization.componentStandardization,
          uiScore: stabilization.uiScore,
          topColorTokens: stabilization.topColorTokens,
          topSpacingTokens: stabilization.topSpacingTokens,
          topTypographyTokens: stabilization.topTypographyTokens,
        },
      };
    } catch (error) {
      return {
        designSystem: {
          colors: {},
          spacing: {},
          typography: {},
          components: [],
          inconsistencies: [],
          normalizationSuggestions: [],
          componentStandardization: [],
          uiScore: 0,
        },
        error: String(error && error.message ? error.message : error),
      };
    }
  }
}

function generateDesignSystem(input = {}) {
  const engine = new DesignSystemEngine();
  return engine.analyze(input);
}

module.exports = {
  DesignSystemEngine,
  generateDesignSystem,
};
