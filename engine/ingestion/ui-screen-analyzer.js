function normalizePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/');
}

function extractButtons(content = '') {
  const text = String(content || '');
  const buttonRegex = /<(button|Button)\b[^>]*>([^<]*)/g;
  const buttons = [];
  let match = buttonRegex.exec(text);

  while (match) {
    const label = String(match[2] || '').trim() || 'Unnamed Action';
    buttons.push({
      type: /<Button\b/.test(match[0]) ? 'component-button' : 'native-button',
      label,
    });
    match = buttonRegex.exec(text);
  }

  return buttons;
}

function extractStates(content = '') {
  const text = String(content || '');
  return {
    hasLoadingState: /isLoading|loading\b|setLoading|skeleton|spinner/i.test(text),
    hasErrorState: /error\b|setError|alert\(|toast\(|catch\s*\(/i.test(text),
    hasSuccessFeedback: /success\b|setSuccess|toast\.success|status\s*=\s*['\"]ok['\"]/i.test(text),
  };
}

function buildFlowMap(files = []) {
  const flows = [];

  for (const file of files) {
    const filePath = normalizePath(file.path);
    const content = String(file.content || '');
    const links = [...content.matchAll(/(?:href|to)=['\"]([^'\"]+)['\"]/g)].map((item) => item[1]);

    if (!links.length) {
      continue;
    }

    flows.push({
      from: filePath,
      to: Array.from(new Set(links)),
    });
  }

  return flows;
}

function classifyScreens(files = []) {
  return files
    .filter((file) => /(page|screen|view|route|layout|app)\.(jsx|tsx|js|ts|html|vue|svelte)$/i.test(file.path) || /pages?|screens?|views?/i.test(file.path))
    .map((file) => {
      const states = extractStates(file.content);
      return {
        path: normalizePath(file.path),
        buttons: extractButtons(file.content),
        states,
      };
    });
}

function detectMissingUX(screens = []) {
  const findings = [];

  for (const screen of screens) {
    if (screen.buttons.length === 0) {
      findings.push({
        type: 'missing-action-buttons',
        severity: 'medium',
        screen: screen.path,
        message: 'Screen appears to have no actionable buttons.',
      });
    }

    if (!screen.states.hasLoadingState) {
      findings.push({
        type: 'missing-loading-state',
        severity: 'medium',
        screen: screen.path,
        message: 'Screen does not declare a loading state.',
      });
    }

    if (!screen.states.hasErrorState) {
      findings.push({
        type: 'missing-error-state',
        severity: 'medium',
        screen: screen.path,
        message: 'Screen does not expose error feedback.',
      });
    }

    if (!screen.states.hasSuccessFeedback) {
      findings.push({
        type: 'missing-success-feedback',
        severity: 'low',
        screen: screen.path,
        message: 'Screen does not expose success confirmation feedback.',
      });
    }
  }

  return findings;
}

function analyzeUIScreens(files = []) {
  const screens = classifyScreens(files);
  const flows = buildFlowMap(files);
  const missingUX = detectMissingUX(screens);

  return {
    screens,
    flows,
    missingUX,
    summary: {
      screenCount: screens.length,
      flowCount: flows.length,
      missingUXCount: missingUX.length,
      totalButtons: screens.reduce((total, screen) => total + screen.buttons.length, 0),
    },
  };
}

module.exports = {
  analyzeUIScreens,
};
