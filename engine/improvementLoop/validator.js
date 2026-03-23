function validateChanges({
  analysis = {},
  problems = [],
  improvements = [],
  microtasks = [],
  designSystem = {},
  tests = {},
  refactorPlan = [],
  suggestedCode = [],
  freezeMode = false,
  engineMode = 'standard',
} = {}) {
  const errors = [];

  if (!analysis || typeof analysis !== 'object') {
    errors.push('analysis must be an object.');
  }

  if (!Array.isArray(problems)) {
    errors.push('problems must be an array.');
  }

  if (!Array.isArray(improvements)) {
    errors.push('improvements must be an array.');
  }

  if (!Array.isArray(microtasks)) {
    errors.push('microtasks must be an array.');
  }

  if (!designSystem || typeof designSystem !== 'object') {
    errors.push('designSystem must be an object.');
  }

  if (!tests || typeof tests !== 'object') {
    errors.push('tests must be an object.');
  }

  if (!Array.isArray(refactorPlan)) {
    errors.push('refactorPlan must be an array.');
  }

  if (!Array.isArray(suggestedCode)) {
    errors.push('suggestedCode must be an array.');
  }

  const destructivePattern = /rm\s+-rf|drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;/i;
  const unsafeSnippet = suggestedCode.find((item) => destructivePattern.test(String(item.snippet || '')));

  if (unsafeSnippet) {
    errors.push('unsafe suggested code detected and blocked.');
  }

  if (freezeMode === true || String(engineMode).toLowerCase() === 'freeze') {
    for (const improvement of improvements) {
      if (String(improvement.mode || '').includes('apply')) {
        errors.push('freeze mode blocks apply actions; only suggestion mode is allowed.');
        break;
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    safeMode: true,
    engineMode,
    freezeMode: freezeMode === true || String(engineMode).toLowerCase() === 'freeze',
    fallbackUsed: false,
  };
}

module.exports = {
  validateChanges,
};
