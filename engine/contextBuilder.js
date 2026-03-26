function buildSummary(scanResult, architecture) {
  const stack = (scanResult.detectedStack || []).map((item) => item.name).join(', ') || 'nao identificado';
  const entryPoints = (scanResult.entryPoints || []).map((item) => item.path);
  const layers = (architecture.layers || []).map((item) => item.name).join(', ') || 'sem camadas claras';

  return [
    `Projeto analisado com ${scanResult.files.length} arquivos e stack detectada: ${stack}.`,
    `Camadas encontradas: ${layers}.`,
    entryPoints.length
      ? `Entrypoints principais: ${entryPoints.slice(0, 5).join(', ')}.`
      : 'Nenhum entrypoint classico identificado automaticamente.',
  ].join(' ');
}

function buildCriticalPoints(architecture, diagnostics) {
  const points = [];

  for (const bottleneck of architecture.bottlenecks || []) {
    points.push({
      type: 'bottleneck',
      message: `Alta densidade de arquivos em ${bottleneck.area} (${bottleneck.count} arquivos).`,
      confidence: bottleneck.confidence,
      sources: bottleneck.sources,
    });
  }

  for (const issue of diagnostics.issues || []) {
    if (issue.severity !== 'high' && issue.severity !== 'critical') {
      continue;
    }
    points.push({
      type: issue.type,
      message: issue.message,
      confidence: issue.confidence,
      sources: issue.sources,
    });
  }

  return points;
}

function buildContext({ scanResult, architecture, diagnostics }) {
  return {
    summary: buildSummary(scanResult, architecture),
    mainFlows: architecture.flows || [],
    criticalPoints: buildCriticalPoints(architecture, diagnostics),
    confidence: 0.86,
    sources: [
      ...(scanResult.entryPoints || []).map((item) => item.path),
      ...(architecture.flows || []).flatMap((flow) => flow.sources || []),
      ...(diagnostics.issues || []).flatMap((issue) => issue.sources || []),
    ],
  };
}

module.exports = {
  buildContext,
};
