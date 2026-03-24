const fs = require('fs/promises');
const path = require('path');
const { UIGenerator } = require('../generators/uiGenerator');
const { buildDefaultDesignSystemUsage } = require('../designSystem/default-usage');
const { enhanceUIWithStates } = require('../generators/ui-state-generator');
const { refactorGeneratedUI } = require('../uiRefactor');

function toSlug(value = '') {
  return String(value || 'feature')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toPascalCase(value = '') {
  return String(value || 'Feature')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

async function writeGeneratedFiles(outputRoot = '', files = []) {
  for (const file of files) {
    const targetPath = path.join(outputRoot, file.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.content, 'utf8');
  }
}

function buildExpandedScreens(feature = '', autoFeatures = []) {
  const featureSlug = toSlug(feature);
  const component = toPascalCase(feature);
  const files = [];

  for (const item of autoFeatures.slice(0, 3)) {
    const screenSlug = toSlug(item.id || item.title || 'expansion');
    files.push({
      path: `frontend/src/pages/${featureSlug}/${screenSlug}.tsx`,
      content: [
        `export default function ${component}${toPascalCase(screenSlug)}Page() {`,
        '  return (',
        '    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">',
        '      <section className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">',
        `        <h1 className="text-2xl font-semibold">${item.title || 'Expansion Module'}</h1>`,
        `        <p className="mt-3 text-sm text-slate-600">${item.rationale || 'Generated from contextual decision engine.'}</p>`,
        '      </section>',
        '    </main>',
        '  );',
        '}',
      ].join('\n'),
    });
  }

  return files;
}

class FrontendAgent {
  constructor(options = {}) {
    this.uiGenerator = options.uiGenerator || new UIGenerator();
    this.designSystemOptions = options.designSystemOptions || {};
  }

  async run(input = {}) {
    const designSystemUsage = await buildDefaultDesignSystemUsage(
      {
        projectPath: input.projectPath,
        projectData: input.projectData,
        files: input.files,
        needsImprovement: input.needsImprovement,
      },
      this.designSystemOptions,
    );

    const generated = await this.uiGenerator.generate({
      feature: input.feature,
      patterns: input.patterns,
      outputRoot: input.outputRoot,
      designSystemUsage,
      designTokens: designSystemUsage.designTokens || {},
      uiConstraints: designSystemUsage.uiConstraints,
    });

    const stateEnhancedFiles = enhanceUIWithStates(generated.files || []);
    const expandedFiles = buildExpandedScreens(input.feature, input.decision && input.decision.autoFeatures ? input.decision.autoFeatures : []);
    await writeGeneratedFiles(input.outputRoot, expandedFiles);
    const uiRefactor = refactorGeneratedUI([...stateEnhancedFiles, ...expandedFiles]);

    return {
      ...generated,
      files: uiRefactor.files,
      uiStatesApplied: true,
      expandedScreens: expandedFiles.length,
      uiRefactor,
    };
  }
}

module.exports = {
  FrontendAgent,
};
