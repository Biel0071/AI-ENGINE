'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VisualIntelligenceEngine,
  ReferenceIntelligenceEngine,
  ProfessionalDesignSystemEngine,
  ArtDirectionEngine,
  Cinematic3DEngineering,
  ProfessionalInteractionEngine,
  ExperienceFactory,
  VisualAcceptanceEngine,
  MultiAgentDesignReview
} = require('../src/design/visual-intelligence-engine');

test('FÊNIX OS — Visual Intelligence & Professional Design Engineering Verification Suite', async (t) => {
  const engine = new VisualIntelligenceEngine();

  // ── 1. Reference Intelligence Engine ──
  await t.test('1. Reference Intelligence Engine registers and decomposes design references', () => {
    const refEngine = new ReferenceIntelligenceEngine();
    const ref = refEngine.analyzeReference('aia_library_hero');

    assert.equal(ref.referenceId, 'aia_library_hero');
    assert.equal(ref.archetype, 'HERO_ASYMMETRIC_SHOWCASE');
    assert.equal(ref.observedRules.negativeSpaceCompliant, true);
    assert.equal(ref.observedRules.contrastWcagCompliant, true);
    assert.equal(ref.observedRules.lightingRigComplete, true);
    assert.ok(ref.specs.lightingDepth.rimLight.includes('orange-red'));
  });

  // ── 2. Professional Design System Engine ──
  await t.test('2. Professional Design System Engine supplies versioned tokens and CSS variables', () => {
    const ds = new ProfessionalDesignSystemEngine();
    const tokens = ds.getTokens();

    assert.equal(ds.version, '4.0.0-canonical');
    assert.ok(tokens.palette.bgDark.startsWith('#'));
    assert.equal(tokens.palette.accentCyan, '#00D9FF');
    assert.ok(tokens.typography.scale.display);

    const cssVars = ds.generateCssVariables();
    assert.ok(cssVars.includes('--fnx-accent-cyan: #00D9FF;'));
    assert.ok(cssVars.includes('--fnx-radius-lg: 12px;'));
  });

  // ── 3. Art Direction Engine & Anti-Clutter Linter ──
  await t.test('3. Art Direction Engine validates composition and penalizes clutter', () => {
    const ds = new ProfessionalDesignSystemEngine();
    const ad = new ArtDirectionEngine(ds);

    // Clean, balanced composition
    const cleanEval = ad.evaluateComposition({
      primaryFocalPoint: 'AI Living City Central Canvas',
      negativeSpaceRatio: 0.32,
      neonAccentCount: 2,
      cardDensityPerArea: 4
    });
    assert.equal(cleanEval.passed, true);
    assert.ok(cleanEval.score >= 80);
    assert.equal(cleanEval.findings.length, 0);

    // Cluttered, neon-abusive composition
    const badEval = ad.evaluateComposition({
      primaryFocalPoint: '',
      negativeSpaceRatio: 0.10,
      neonAccentCount: 5,
      cardDensityPerArea: 12
    });
    assert.equal(badEval.passed, false);
    assert.ok(badEval.score < 50);
    assert.ok(badEval.findings.some(f => f.rule === 'FOCAL_HIERARCHY'));
    assert.ok(badEval.findings.some(f => f.rule === 'NEGATIVE_SPACE'));
    assert.ok(badEval.findings.some(f => f.rule === 'ANTI_CLUTTER_NEON'));
  });

  // ── 4. Cinematic 3D Engineering ──
  await t.test('4. Cinematic 3D Engineering provides all 7 camera presets and lighting rigs', () => {
    const c3d = new Cinematic3DEngineering();

    const requiredPresets = [
      'hero_cinematic',
      'product_showcase',
      'architectural_visualization',
      'isometric_city',
      'character_portrait',
      'mechanical_engineering',
      'technical_exploded_view'
    ];

    for (const presetName of requiredPresets) {
      const preset = c3d.getCameraPreset(presetName);
      assert.ok(preset.position && preset.position.length === 3, `Preset ${presetName} must have 3D position`);
      assert.ok(preset.fov, `Preset ${presetName} must specify FOV`);
    }

    const rig = c3d.getLightingRig('three_point_cinematic');
    assert.equal(rig.keyLight.type, 'Directional');
    assert.equal(rig.rimLight.castShadow, false);
    assert.ok(rig.ambientLight.intensity > 0);
  });

  // ── 5. Professional Interaction Engine ──
  await t.test('5. Professional Interaction Engine establishes state transition contracts', () => {
    const ie = new ProfessionalInteractionEngine();
    const contract = ie.createInteractionContract('selectBuilding', {
      targetComponent: '#spatialBuildingInspectorPanel'
    });

    assert.equal(contract.actionName, 'selectBuilding');
    assert.equal(contract.expectedTiming.clickMs, 80);
    assert.equal(contract.stateTransitions.onExecute, 'loading');
    assert.equal(contract.stateTransitions.onResolve, 'success');
  });

  // ── 6. Experience Factory ──
  await t.test('6. Experience Factory composes multi-page blueprints', () => {
    const ds = new ProfessionalDesignSystemEngine();
    const ad = new ArtDirectionEngine(ds);
    const factory = new ExperienceFactory(ds, ad);

    const bp = factory.composeProductBlueprint('ZapAI CRM', {
      layout: '4_QUADRANT_OPERATIONAL_COCKPIT',
      focalPoint: 'ZapAI Conversational Inbox'
    });

    assert.equal(bp.productName, 'ZapAI CRM');
    assert.equal(bp.architecture.layoutType, '4_QUADRANT_OPERATIONAL_COCKPIT');
    assert.equal(bp.responsiveBreakpoints.desktop, '1920px');
    assert.equal(bp.responsiveBreakpoints.mobile, '390px');
  });

  // ── 7. Visual Acceptance Engine (Quality Gate >= 85/100) ──
  await t.test('7. Visual Acceptance Engine scores across 7 weighted dimensions', () => {
    const vae = new VisualAcceptanceEngine();

    const passingAudit = vae.evaluate({
      artDirectionScore: 92,
      designSystemScore: 95,
      visualQualityScore: 90,
      uxScore: 94,
      functionalityScore: 100,
      performanceScore: 90,
      a11yScore: 90,
      criticalDefects: 0
    });

    assert.equal(passingAudit.approved, true);
    assert.ok(passingAudit.finalScore >= 85.0);
    assert.equal(passingAudit.verdict, 'CERTIFIED_PRODUCTION_QUALITY');

    // Reject on critical defects
    const failingAudit = vae.evaluate({
      artDirectionScore: 90,
      criticalDefects: 1
    });
    assert.equal(failingAudit.approved, false);
    assert.equal(failingAudit.verdict, 'REJECTED_BELOW_ACCEPTANCE_BAR');
  });

  // ── 8. Multi-Agent Design Review (9 Specialists) ──
  await t.test('8. Multi-Agent Design Review executes 9 specialized reviews', () => {
    const madr = new MultiAgentDesignReview();
    const review = madr.runReview({ target: 'view-city' });

    assert.equal(review.reviewerCount, 9);
    assert.equal(review.unanimousApproval, true);
    assert.ok(review.consensusScore >= 90);

    const roles = review.reviews.map(r => r.specialist);
    assert.ok(roles.includes('ArtDirector'));
    assert.ok(roles.includes('Artist3D'));
    assert.ok(roles.includes('FrontendEngineer'));
    assert.ok(roles.includes('BackendEngineer'));
    assert.ok(roles.includes('AccessibilityReviewer'));
    assert.ok(roles.includes('VisualQAEngineer'));
  });

  // ── 9. Pilot Project Certification (AI Living City & Universal 3D Studio) ──
  await t.test('9. VisualIntelligenceEngine certifies Pilot Project with full manifesto', () => {
    const manifesto = engine.certifyViewQuality('view-city', {
      viewName: 'AI Living City Spatial Workspace',
      composition: {
        primaryFocalPoint: 'Living 3D City Viewport (70% screen area)',
        negativeSpaceRatio: 0.30,
        neonAccentCount: 2,
        cardDensityPerArea: 4
      }
    });

    assert.equal(manifesto.certified, true);
    assert.equal(manifesto.viewId, 'view-city');
    assert.ok(manifesto.score >= 85.0);
    assert.equal(manifesto.verdict, 'CERTIFIED_PRODUCTION_QUALITY');
    assert.equal(manifesto.reviews.length, 9);
  });
});
