const COLOR_HEX_REGEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const COLOR_FUNC_REGEX = /\b(?:rgb|rgba|hsl|hsla)\([^\)]+\)/g;
const TAILWIND_COLOR_REGEX = /\b(?:bg|text|border|from|to|via|ring|stroke|fill)-([a-z]+(?:-[a-z]+)?-\d{2,3}|black|white|transparent|current)\b/g;
const TAILWIND_SPACING_REGEX = /\b(?:m|mx|my|mt|mr|mb|ml|p|px|py|pt|pr|pb|pl|gap|space-x|space-y)-([\d.]+|px)\b/g;
const CSS_SPACING_REGEX = /\b(?:margin|padding|gap|row-gap|column-gap)\s*:\s*([^;}{]+)[;}]?/gi;
const TAILWIND_TYPE_SIZE_REGEX = /\btext-(xs|sm|base|lg|xl|\d+xl)\b/g;
const TAILWIND_FONT_WEIGHT_REGEX = /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g;
const CSS_FONT_FAMILY_REGEX = /\bfont-family\s*:\s*([^;}{]+)[;}]?/gi;
const CSS_FONT_SIZE_REGEX = /\bfont-size\s*:\s*([^;}{]+)[;}]?/gi;
const CSS_LINE_HEIGHT_REGEX = /\bline-height\s*:\s*([^;}{]+)[;}]?/gi;
const REACT_COMPONENT_REGEX = /(?:export\s+default\s+function\s+|export\s+function\s+|function\s+|const\s+)([A-Z][A-Za-z0-9_]*)\s*(?:=\s*\(|\()/g;
const HTML_COMPONENT_REGEX = /<([A-Z][A-Za-z0-9]*)\b/g;

function incrementCounter(map, key) {
  if (!key) {
    return;
  }

  map[key] = (map[key] || 0) + 1;
}

function extractColorsFromContent(content = '') {
  const counter = {};

  for (const match of content.match(COLOR_HEX_REGEX) || []) {
    incrementCounter(counter, match.toLowerCase());
  }

  for (const match of content.match(COLOR_FUNC_REGEX) || []) {
    incrementCounter(counter, match.replace(/\s+/g, ' ').trim().toLowerCase());
  }

  let twMatch = TAILWIND_COLOR_REGEX.exec(content);
  while (twMatch) {
    incrementCounter(counter, twMatch[1]);
    twMatch = TAILWIND_COLOR_REGEX.exec(content);
  }
  TAILWIND_COLOR_REGEX.lastIndex = 0;

  return counter;
}

function extractSpacingFromContent(content = '') {
  const tailwindScale = {};
  const cssValues = {};

  let twMatch = TAILWIND_SPACING_REGEX.exec(content);
  while (twMatch) {
    incrementCounter(tailwindScale, twMatch[1]);
    twMatch = TAILWIND_SPACING_REGEX.exec(content);
  }
  TAILWIND_SPACING_REGEX.lastIndex = 0;

  let cssMatch = CSS_SPACING_REGEX.exec(content);
  while (cssMatch) {
    const raw = String(cssMatch[1] || '')
      .replace(/\s+/g, ' ')
      .trim();
    incrementCounter(cssValues, raw);
    cssMatch = CSS_SPACING_REGEX.exec(content);
  }
  CSS_SPACING_REGEX.lastIndex = 0;

  return {
    tailwindScale,
    cssValues,
  };
}

function extractTypographyFromContent(content = '') {
  const typeScale = {};
  const fontWeights = {};
  const fontFamilies = {};
  const cssSizes = {};
  const lineHeights = {};

  let sizeMatch = TAILWIND_TYPE_SIZE_REGEX.exec(content);
  while (sizeMatch) {
    incrementCounter(typeScale, sizeMatch[1]);
    sizeMatch = TAILWIND_TYPE_SIZE_REGEX.exec(content);
  }
  TAILWIND_TYPE_SIZE_REGEX.lastIndex = 0;

  let weightMatch = TAILWIND_FONT_WEIGHT_REGEX.exec(content);
  while (weightMatch) {
    incrementCounter(fontWeights, weightMatch[1]);
    weightMatch = TAILWIND_FONT_WEIGHT_REGEX.exec(content);
  }
  TAILWIND_FONT_WEIGHT_REGEX.lastIndex = 0;

  let familyMatch = CSS_FONT_FAMILY_REGEX.exec(content);
  while (familyMatch) {
    incrementCounter(fontFamilies, String(familyMatch[1] || '').replace(/\s+/g, ' ').trim());
    familyMatch = CSS_FONT_FAMILY_REGEX.exec(content);
  }
  CSS_FONT_FAMILY_REGEX.lastIndex = 0;

  let cssSizeMatch = CSS_FONT_SIZE_REGEX.exec(content);
  while (cssSizeMatch) {
    incrementCounter(cssSizes, String(cssSizeMatch[1] || '').replace(/\s+/g, ' ').trim());
    cssSizeMatch = CSS_FONT_SIZE_REGEX.exec(content);
  }
  CSS_FONT_SIZE_REGEX.lastIndex = 0;

  let lineHeightMatch = CSS_LINE_HEIGHT_REGEX.exec(content);
  while (lineHeightMatch) {
    incrementCounter(lineHeights, String(lineHeightMatch[1] || '').replace(/\s+/g, ' ').trim());
    lineHeightMatch = CSS_LINE_HEIGHT_REGEX.exec(content);
  }
  CSS_LINE_HEIGHT_REGEX.lastIndex = 0;

  return {
    typeScale,
    fontWeights,
    fontFamilies,
    cssSizes,
    lineHeights,
  };
}

function extractComponentsFromContent(content = '', filePath = '') {
  const components = [];

  let reactMatch = REACT_COMPONENT_REGEX.exec(content);
  while (reactMatch) {
    components.push({
      name: reactMatch[1],
      source: filePath,
      kind: 'react-component',
    });
    reactMatch = REACT_COMPONENT_REGEX.exec(content);
  }
  REACT_COMPONENT_REGEX.lastIndex = 0;

  let htmlMatch = HTML_COMPONENT_REGEX.exec(content);
  while (htmlMatch) {
    components.push({
      name: htmlMatch[1],
      source: filePath,
      kind: 'jsx-tag',
    });
    htmlMatch = HTML_COMPONENT_REGEX.exec(content);
  }
  HTML_COMPONENT_REGEX.lastIndex = 0;

  return components;
}

module.exports = {
  extractColorsFromContent,
  extractSpacingFromContent,
  extractTypographyFromContent,
  extractComponentsFromContent,
};
