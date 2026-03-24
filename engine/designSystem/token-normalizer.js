function sortByUsage(counter = {}) {
  return Object.entries(counter || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
}

function pickToken(sortedEntries = [], fallback) {
  return (sortedEntries[0] && sortedEntries[0][0]) || fallback;
}

function normalizeSpacingScale(rawSpacing = {}) {
  const baseScale = [4, 8, 12, 16, 24, 32];
  const normalized = {};

  for (const value of baseScale) {
    normalized[String(value)] = `${value / 16}rem`;
  }

  const detected = Object.keys(rawSpacing.tailwindScale || {});
  for (const token of detected.slice(0, 12)) {
    normalized[`detected-${token}`] = token === 'px' ? '1px' : `${Number(token) * 0.25}rem`;
  }

  return normalized;
}

function normalizeTypographyScale(rawType = {}) {
  const defaultScale = {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  };

  const fontFamilies = Object.keys(rawType.fontFamilies || {});
  const family = fontFamilies[0] || 'system-ui, sans-serif';

  const fontWeights = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  };

  const lineHeights = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.65,
  };

  return {
    fontFamily: {
      body: family,
      heading: family,
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    },
    fontSize: {
      ...defaultScale,
    },
    fontWeight: fontWeights,
    lineHeight: lineHeights,
  };
}

function normalizeRadiusScale() {
  return {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  };
}

function normalizeShadowScale() {
  return {
    sm: '0 1px 2px rgba(0,0,0,0.08)',
    md: '0 8px 20px rgba(0,0,0,0.12)',
    lg: '0 16px 36px rgba(0,0,0,0.16)',
  };
}

function normalizeLayoutTokens(layoutPatterns = {}) {
  return {
    sidebarWidth: layoutPatterns.sidebar && layoutPatterns.sidebar.width ? layoutPatterns.sidebar.width : '280px',
    headerHeight: layoutPatterns.header && layoutPatterns.header.height ? layoutPatterns.header.height : '64px',
    contentMaxWidth: layoutPatterns.content && layoutPatterns.content.maxWidth ? layoutPatterns.content.maxWidth : '1200px',
    chatColumns: layoutPatterns.chat && layoutPatterns.chat.columns ? layoutPatterns.chat.columns : '320px 1fr',
  };
}

function normalizeColorTokens(rawColors = {}) {
  const sorted = sortByUsage(rawColors);

  const primary = pickToken(sorted, '#0f766e');
  const secondary = (sorted[1] && sorted[1][0]) || '#1f2937';
  const background = sorted.find(([token]) => /white|gray-50|slate-50|#f/i.test(token));
  const surface = sorted.find(([token]) => /gray-100|slate-100|zinc-100|#e/i.test(token));
  const border = sorted.find(([token]) => /gray-200|slate-200|border|#d/i.test(token));
  const muted = sorted.find(([token]) => /gray-500|slate-500|muted|#6/i.test(token));

  return {
    primary,
    secondary,
    background: background ? background[0] : '#f8fafc',
    surface: surface ? surface[0] : '#ffffff',
    hover: {
      primary: primary,
      surface: 'rgba(15, 23, 42, 0.06)',
    },
    border: border ? border[0] : '#e2e8f0',
    text: {
      primary: '#0f172a',
      secondary: '#334155',
      muted: muted ? muted[0] : '#64748b',
    },
  };
}

function normalizeDesignTokens({ colors = {}, spacing = {}, typography = {}, layoutPatterns = {} } = {}) {
  return {
    colors: normalizeColorTokens(colors),
    spacing: normalizeSpacingScale(spacing),
    typography: normalizeTypographyScale(typography),
    radius: normalizeRadiusScale(),
    shadows: normalizeShadowScale(),
    layout: normalizeLayoutTokens(layoutPatterns),
  };
}

module.exports = {
  normalizeDesignTokens,
};
