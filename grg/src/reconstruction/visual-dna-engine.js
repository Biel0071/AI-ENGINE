'use strict';

/** Extracts design values only when the browser supplied computed styles. */
class VisualDnaEngine {
  extractVisualDna(observationData = {}) {
    const observedElements = collectStyledElements(observationData);
    const designTokens = observedElements.length ? collectTokens(observedElements) : null;
    const viewport = isViewport(observationData.viewport) ? observationData.viewport : null;

    return {
      dnaId: `dna:${Date.now()}`,
      version: '11.0.0',
      status: designTokens ? 'PARTIAL' : 'NOT_MEASURED',
      source: designTokens ? 'BROWSER_COMPUTED_STYLE' : null,
      evidenceCount: observedElements.length,
      designTokens,
      cssVariables: null,
      layoutRules: null,
      responsiveRules: null,
      componentSpecs: null,
      viewport,
      updatedAt: new Date().toISOString()
    };
  }
}

function collectStyledElements(observationData) {
  const allElements = [
    ...(Array.isArray(observationData.elements) ? observationData.elements : []),
    ...['buttons', 'headings', 'inputs'].flatMap((key) =>
      Array.isArray(observationData[key]) ? observationData[key] : [])
  ];

  return allElements
    .filter((element) => element && element.evidenceLevel !== 'HTML_SOURCE' &&
      element.computedStyle && typeof element.computedStyle === 'object')
    .slice(0, 500);
}

function collectTokens(elements) {
  const colors = {};
  const typography = {};
  const spacing = {};
  const radius = {};
  const shadows = {};

  addValues(colors, 'text', elements, 'color');
  addValues(colors, 'borders', elements, 'borderColor');
  for (const category of ['BUTTON', 'CARD', 'INPUT', 'HEADER', 'SIDEBAR']) {
    const key = `${category.toLowerCase()}Backgrounds`;
    addValues(colors, key, elements.filter((element) => element.category === category), 'backgroundColor');
  }

  for (const [key, property] of Object.entries({
    fontFamilies: 'fontFamily',
    fontSizes: 'fontSize',
    fontWeights: 'fontWeight',
    lineHeights: 'lineHeight'
  })) addValues(typography, key, elements, property);

  for (const property of ['padding', 'margin', 'gap']) addValues(spacing, property, elements, property);
  addValues(radius, 'borderRadius', elements, 'borderRadius');
  addValues(shadows, 'boxShadow', elements, 'boxShadow');

  const tokens = {};
  for (const [key, value] of Object.entries({ colors, typography, spacing, radius, shadows })) {
    if (Object.keys(value).length) tokens[key] = value;
  }
  return tokens;
}

function addValues(target, key, elements, property) {
  const values = [...new Set(elements
    .map((element) => element.computedStyle[property])
    .filter((value) => typeof value === 'string' && value.trim() && value !== 'none' && value !== 'normal')
    .map((value) => value.trim()))].slice(0, 50);
  if (values.length) target[key] = values;
}

function isViewport(value) {
  return value && Number.isFinite(value.width) && Number.isFinite(value.height) &&
    value.width > 0 && value.height > 0;
}

const globalVisualDnaEngine = new VisualDnaEngine();

module.exports = {
  VisualDnaEngine,
  globalVisualDnaEngine
};
