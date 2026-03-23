class PlannerAgent {
  run(input = {}) {
    const feature = String(input.feature || 'feature').trim();
    const hasFrontend = Boolean(input.projectData?.frontend?.detected);
    const hasBackend = Boolean(input.projectData?.backend?.detected);

    const basePlan = [
      { id: 'analyze', task: 'Analyze current project context and modules' },
      { id: 'reuse', task: 'Apply reusable patterns from memory' },
      { id: 'scaffold', task: `Scaffold feature ${feature}` },
    ];

    if (hasFrontend) {
      basePlan.push({ id: 'ui', task: 'Generate dashboard, table, form and layout components' });
    }

    if (hasBackend) {
      basePlan.push({ id: 'api', task: 'Generate API routes, services and module files' });
    }

    basePlan.push({ id: 'persist', task: 'Persist generated pattern for future reuse' });

    return {
      feature,
      steps: basePlan,
      confidence: input.patterns && input.patterns.length > 0 ? 'high' : 'medium',
    };
  }
}

module.exports = {
  PlannerAgent,
};
