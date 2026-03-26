function improveSpacing(content = '') {
  return String(content || '')
    .replace(/\bp-2\b/g, 'p-3')
    .replace(/\bpx-2\b/g, 'px-3')
    .replace(/\bpy-2\b/g, 'py-2.5')
    .replace(/\bspace-y-2\b/g, 'space-y-3');
}

function improveHierarchy(content = '') {
  return String(content || '')
    .replace(/\btext-sm\b/g, 'text-base')
    .replace(/\bfont-medium\b/g, 'font-semibold');
}

function improveColorContrast(content = '') {
  return String(content || '')
    .replace(/\btext-slate-500\b/g, 'text-slate-700')
    .replace(/\bbg-slate-100\b/g, 'bg-white')
    .replace(/\btext-gray-500\b/g, 'text-gray-700');
}

function applyPremiumPolish(content = '') {
  let next = String(content || '');
  next = improveSpacing(next);
  next = improveHierarchy(next);
  next = improveColorContrast(next);
  return next;
}

function refactorGeneratedUI(files = []) {
  const enhancedFiles = [];

  for (const file of files) {
    const isUI = /\.(tsx|jsx|html|css|scss)$/i.test(file.path || '');
    if (!isUI) {
      enhancedFiles.push(file);
      continue;
    }

    enhancedFiles.push({
      ...file,
      content: applyPremiumPolish(file.content || ''),
    });
  }

  return {
    files: enhancedFiles,
    improvements: [
      'spacing-consistency',
      'color-contrast-adjustment',
      'visual-hierarchy-polish',
    ],
  };
}

module.exports = {
  refactorGeneratedUI,
};
