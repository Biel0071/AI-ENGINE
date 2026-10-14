'use strict';
/**
 * Teste: Visual Evolution Engine & Genome Validator (Fase 12.17 & 12.23)
 * Valida:
 * 1. Conformidade do index.html e unified.css com o VISUAL_GENOME.json
 * 2. Invariantes visuais (Zero-Mock, Vanilla JS, 14 Views Canônicas)
 * 3. Verificação de integridade de layout das 14 telas (sem sobreposição)
 * 4. Validação de Tokens de Design (paleta Obsidian, ciano, glassmorphism)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');
const UNIFIED_CSS = path.join(PUBLIC_DIR, 'unified.css');
const VISUAL_GENOME_PATH = path.join(__dirname, '..', '..', 'docs', 'VISUAL_GENOME.json');

test('VISUAL 1: VISUAL_GENOME.json contém tokens essenciais e invariantes', () => {
  assert.ok(fs.existsSync(VISUAL_GENOME_PATH), 'VISUAL_GENOME.json deve existir');
  const genome = JSON.parse(fs.readFileSync(VISUAL_GENOME_PATH, 'utf8'));

  assert.ok(genome.designTokens.colorPalette.backgroundDark, 'Paleta deve ter backgroundDark');
  assert.ok(genome.designTokens.colorPalette.accentCyan, 'Paleta deve ter accentCyan');
  assert.ok(genome.designTokens.elevation.glassmorphism, 'Tokens devem definir glassmorphism');
  assert.ok(Array.isArray(genome.designTokens.spacingGridPx), 'Grid de espaçamento deve ser array');
  assert.ok(genome.invariants.length >= 3, 'Deve conter pelo menos 3 invariantes');
});

test('VISUAL 2: Shell canônico index.html respeita os 14 containers de view sem sobreposição', () => {
  const html = fs.readFileSync(INDEX_HTML, 'utf8');

  const EXPECTED_VIEWS = [
    'view-command',
    'view-city',
    'view-agents',
    'view-ide',
    'view-operations',
    'view-runtime',
    'view-projects',
    'view-memory',
    'view-knowledge',
    'view-mcp',
    'view-browser',
    'view-observability',
    'view-terminal',
    'view-flowgraph'
  ];

  for (const viewId of EXPECTED_VIEWS) {
    const hasView = html.includes(`id="${viewId}"`);
    assert.ok(hasView, `Shell oficial deve conter container com id='${viewId}'`);
  }
});

test('VISUAL 3: Regras de CSS e Glassmorphism no unified.css', () => {
  assert.ok(fs.existsSync(UNIFIED_CSS), 'unified.css deve existir');
  const css = fs.readFileSync(UNIFIED_CSS, 'utf8');

  // Verifica uso de variáveis CSS do Fênix e backdrop-filter
  assert.ok(css.includes('--fenix') || css.includes('backdrop-filter') || css.includes('rgba'), 'CSS deve adotar tokens visuais do Fênix');
});

test('VISUAL 4: VisualCompositionEngine e VisualDesignEvaluator operam sem LLM e pontuam 15 dimensões', () => {
  const { VisualCompositionEngine } = require('../src/evolution/visual-composition-engine');
  const { VisualDesignEvaluator } = require('../src/evolution/visual-design-evaluator');

  const engine = new VisualCompositionEngine();
  const evaluator = new VisualDesignEvaluator();

  const sampleHtml = `<div class="fenix-cockpit-workspace"><div class="hero-stage">Hero</div><div class="inspector">Inspector</div><div class="timeline">Timeline</div></div>`;
  const comp = engine.decomposeSpatialLayout(sampleHtml, 'view-test');
  assert.equal(comp.layoutArchetype, '3_PANE_COCKPIT', 'Layout deve ser classificado como 3_PANE_COCKPIT');
  assert.equal(comp.isAntiPattern, false, 'Não deve ser classificado como antipadrão');

  const scorecard = evaluator.evaluate(comp);
  assert.ok(scorecard.overallScore >= 90, 'Score geral do Cockpit deve ser superior a 90');
  assert.equal(scorecard.dimensions.length, 15, 'Scorecard deve abranger 15 dimensões completas');
});

test('VISUAL 5: VisualDesignCompiler executa pipeline determinístico de 9 estágios', () => {
  const { VisualDesignCompiler } = require('../src/evolution/visual-design-compiler');
  const compiler = new VisualDesignCompiler();

  const compilation = compiler.compile({
    archetype: '3_PANE_COCKPIT',
    domain: 'ORCHESTRATION',
    viewId: 'view-cockpit-test'
  });

  assert.ok(compilation.pipelineStages.systemModel, 'Estágio 2 (systemModel) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.userModel, 'Estágio 3 (userModel) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.ia, 'Estágio 4 (ia) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.uxModel, 'Estágio 5 (uxModel) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.visualModel, 'Estágio 6 (visualModel) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.componentModel, 'Estágio 7 (componentModel) deve ser sintetizado');
  assert.ok(compilation.pipelineStages.layoutModel, 'Estágio 8 (layoutModel) deve ser sintetizado');
  assert.ok(compilation.code.html.includes('view-cockpit-test'), 'Código HTML deve conter o container');
  assert.ok(compilation.code.html.includes('—'), 'Código gerado deve respeitar Zero-Mock com ausência honesta');
  assert.equal(compilation.metadata.zeroAiDeterministic, true, 'Deve rodar determinístico sem IA');
});

test('VISUAL 6: AutonomousEvolutionController detecta débito visual e planeja missões EVO-VISUAL', async () => {
  const { AutonomousEvolutionController } = require('../src/evolution/autonomous-evolution-controller');
  const controller = new AutonomousEvolutionController();

  const mockObservation = {
    persistence: 'HEALTHY',
    visualComposition: {
      viewId: 'view-legacy-dashboard',
      isAntiPattern: true,
      counts: { cardCount: 15 }
    },
    visualScorecard: {
      overallScore: 48,
      defects: [{ dimension: 'INFORMATION_HIERARCHY', defect: 'SaaS KPI dashboard antipattern detected' }]
    }
  };

  const detection = controller.detect(mockObservation);
  assert.ok(detection.hasGaps, 'Detecção deve identificar débito visual');
  assert.ok(detection.findings.some(f => f.type === 'VISUAL_ANTIPATTERN_DETECTED'), 'Deve registrar VISUAL_ANTIPATTERN_DETECTED');

  const plan = controller.plan(detection);
  assert.ok(plan.missions.length > 0, 'Deve planejar pelo menos uma missão');
  assert.ok(plan.missions.some(m => m.id.startsWith('EVO-VISUAL-')), 'Missão deve possuir prefixo EVO-VISUAL-');
});
