require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { runImprovementLoop } = require('./engine/improvementLoop');

const app = express();
app.use(cors());
app.use(express.json());

function normalizeAnalyzeBody(body = {}) {
  return {
    projectContext: String(body.projectContext || ''),
    files: Array.isArray(body.files) ? body.files : [],
    structure: body.structure && typeof body.structure === 'object' ? body.structure : null,
    currentGoal: String(body.currentGoal || 'Analyze project quality and suggest safe improvements.'),
  };
}

function buildAnalysisPayload(input = {}) {
  const contextSize = input.projectContext.length;
  const fileCount = input.files.length;
  const hasStructure = Boolean(input.structure);

  const analysis = [
    `Goal: ${input.currentGoal}`,
    `Context chars: ${contextSize}`,
    `Files received: ${fileCount}`,
    `Structure provided: ${hasStructure ? 'yes' : 'no'}`,
    'Focus on safe, incremental improvements that preserve runtime behavior.',
  ].join(' ');

  const problems = [];
  const improvements = [];
  const refactorPlan = [];

  if (fileCount === 0) {
    problems.push('No files were provided; analysis depth may be limited.');
    improvements.push('Provide key backend and frontend files for more precise suggestions.');
  }

  if (!hasStructure) {
    improvements.push('Send project structure map to improve architecture-level diagnostics.');
  }

  refactorPlan.push('Map high-risk modules and prioritize non-breaking refactors.');
  refactorPlan.push('Add focused tests before each refactor increment.');
  refactorPlan.push('Apply changes in small batches and validate runtime behavior each step.');

  return {
    analysis,
    problems,
    improvements,
    refactorPlan,
  };
}

app.get('/health', (_req, res) => {
  return res.status(200).json({ status: 'ok' });
});

app.post('/analyze', async (req, res) => {
  try {
    const input = normalizeAnalyzeBody(req.body || {});
    const payload = buildAnalysisPayload(input);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[AI ENGINE] Analyze failed:', error.message || error);
    return res.status(200).json({
      analysis: 'Fallback analysis: request could not be fully processed.',
      problems: ['Analyze request failed internally.'],
      improvements: ['Retry with smaller payload and valid JSON body.'],
      refactorPlan: ['Keep existing behavior unchanged and apply safe incremental fixes.'],
    });
  }
});

app.post('/dev/analyze', async (req, res) => {
  try {
    const input = normalizeAnalyzeBody(req.body || {});
    const payload = await runImprovementLoop(input, {
      mode: 'suggest-only',
      engineMode: String(process.env.ENGINE_MODE || 'standard').toLowerCase(),
    });

    return res.status(200).json({
      analysis: payload.analysis || {},
      problems: Array.isArray(payload.problems) ? payload.problems : [],
      improvements: Array.isArray(payload.improvements) ? payload.improvements : [],
      microtasks: Array.isArray(payload.microtasks) ? payload.microtasks : [],
      designSystem: payload.designSystem && typeof payload.designSystem === 'object' ? payload.designSystem : {},
      tests: payload.tests && typeof payload.tests === 'object' ? payload.tests : { smokeTests: [], e2eTests: [] },
      refactorPlan: Array.isArray(payload.refactorPlan) ? payload.refactorPlan : [],
      suggestedCode: Array.isArray(payload.suggestedCode) ? payload.suggestedCode : [],
      validation: payload.validation || { ok: true, safeMode: true, fallbackUsed: false, errors: [] },
      engineMode: payload.engineMode || String(process.env.ENGINE_MODE || 'standard').toLowerCase(),
    });
  } catch (error) {
    console.error('[AI ENGINE] Dev analyze failed:', error.message || error);
    return res.status(200).json({
      analysis: {
        summary: {},
        metadata: {
          fallback: true,
          generatedAt: new Date().toISOString(),
        },
      },
      problems: [
        {
          code: 'DEV_ANALYZE_FAILURE',
          severity: 'high',
          message: 'Dev analyze endpoint failed and fallback response was returned.',
          recommendation: 'Retry with a smaller payload and inspect logs.',
        },
      ],
      improvements: [
        {
          type: 'safe-refactor',
          priority: 'high',
          impact: 'high',
          confidenceScore: 0.6,
          title: 'Preserve behavior and retry incrementally',
          description: 'Keep current API contracts and retry analysis with smaller input chunks.',
          safe: true,
        },
      ],
      microtasks: [],
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
      tests: {
        smokeTests: [],
        e2eTests: [],
      },
      refactorPlan: [
        {
          step: 1,
          title: 'Stabilize request payload',
          objective: 'Ensure projectContext and files are valid before rerunning analysis.',
          guardrails: ['Never apply destructive changes.'],
          safeType: 'safe-refactor',
        },
      ],
      suggestedCode: [],
      validation: {
        ok: false,
        safeMode: true,
        engineMode: String(process.env.ENGINE_MODE || 'standard').toLowerCase(),
        freezeMode: String(process.env.ENGINE_MODE || 'standard').toLowerCase() === 'freeze',
        fallbackUsed: true,
        errors: [String(error && error.message ? error.message : error)],
      },
      engineMode: String(process.env.ENGINE_MODE || 'standard').toLowerCase(),
    });
  }
});

app.use((error, _req, res, _next) => {
  console.error('[AI ENGINE] Unhandled error:', error && (error.stack || error.message || error));
  return res.status(200).json({
    analysis: 'Fallback analysis: internal middleware error handled safely.',
    problems: ['Internal middleware error.'],
    improvements: ['Review request payload and server logs.'],
    refactorPlan: ['Retry request after correcting payload.'],
  });
});

const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, () => {
  console.log('AI ENGINE running on port ' + PORT);
});
