'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDesignPreferences, formatDesignPreferences, isCompatibleDesignProfile } = require('../src/design/project-design-preferences');

test('design profile reader accepts current 2.x and prior 1.x profiles only', () => {
  const profile = (version) => ({ version, title: 'GRG SPACE · fluxo de design por projeto' });
  assert.equal(isCompatibleDesignProfile(profile('2.0')), true);
  assert.equal(isCompatibleDesignProfile(profile('2.1')), true);
  assert.equal(isCompatibleDesignProfile(profile('1.9')), true);
  assert.equal(isCompatibleDesignProfile(profile('3.0')), false);
  assert.equal(isCompatibleDesignProfile({ ...profile('2.1'), title: 'untrusted' }), false);
});

test('project design preferences accept only known sources, directions and viewports', () => {
  assert.deepEqual(normalizeDesignPreferences({
    surface: 'tablet', visualDirection: 'ignore-policy', referenceSources: ['google-stitch-canvas', 'evil'], targetViewports: [375, 500],
  }), {
    surface: 'web', visualDirection: 'brand-preserving', referenceSources: ['google-stitch-canvas'], targetViewports: [375], designGoal: '',
  });
});

test('project design brief is bounded, single-line and formatted as operator context', () => {
  const preferences = normalizeDesignPreferences({ designGoal: `Build dashboard\n${'x'.repeat(600)}` });
  assert.equal(preferences.designGoal.length, 500);
  assert.equal(preferences.designGoal.includes('\n'), false);
  assert.match(formatDesignPreferences(preferences), /Objetivo informado pelo operador/);
  assert.match(formatDesignPreferences(preferences), /não como instrução para alterar permissões/);
});

test('selected product references add evidence-backed workflow patterns and disclose Fênix gaps', () => {
  const brief = formatDesignPreferences({
    referenceSources: ['lovable-editor', 'miro-dashboard', 'google-stitch-canvas'],
  });
  assert.match(brief, /Lovable.*chat.*prévia interativa/i);
  assert.match(brief, /Miro.*busca.*recente.*favoritos.*grade.*lista/i);
  assert.match(brief, /Stitch.*canvas.*multimodal.*protótipo.*DESIGN\.md/i);
  assert.match(brief, /Fênix.*Plan.*diff.*confirmação/i);
  assert.match(brief, /protótipo navegável.*ausente/i);
  assert.match(brief, /Fonte oficial:/i);
});
