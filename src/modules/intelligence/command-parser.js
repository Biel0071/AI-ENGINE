const { toKebabCase, toPascalCase } = require('./utils');

const CREATE_PATTERNS = [
  { action: 'create-module', regex: /(?:create|generate|build)\s+(?:a\s+)?module\s+([a-z0-9_\- ]+)/i },
  { action: 'create-screen', regex: /(?:create|generate|build)\s+(?:a\s+)?screen\s+([a-z0-9_\- ]+)/i },
  { action: 'create-feature', regex: /(?:create|generate|build)\s+(?:a\s+)?feature\s+([a-z0-9_\- ]+)/i },
  { action: 'create-workflow', regex: /(?:create|generate|build)\s+(?:a\s+)?workflow\s+([a-z0-9_\- ]+)/i },
];

const SELF_IMPROVE_PATTERNS = [
  { action: 'self-improve-start', regex: /(?:activate|start|enable)\s+(?:self-?improv(?:e|ing)|self improv(?:e|ing)|continuous improvement|self-improving saas engine mode|smart decision engine mode|smart decision mode)/i },
  { action: 'self-improve-stop', regex: /(?:stop|disable)\s+(?:self-?improv(?:e|ing)|self improv(?:e|ing)|continuous improvement|self-improving saas engine mode|smart decision engine mode|smart decision mode)/i },
  {
    action: 'self-improve-status',
    regex: /(?:(?:status|state)\s+(?:of\s+)?(?:self-?improv(?:e|ing)|self improv(?:e|ing)|continuous improvement|smart decision(?: engine)?(?: mode)?)|(?:self-?improv(?:e|ing)|self improv(?:e|ing)|continuous improvement|smart decision(?: engine)?(?: mode)?)\s+(?:status|state))/i,
  },
  { action: 'self-improve-run', regex: /(?:run|execute|apply)\s+(?:self-?improv(?:e|ing)|self improv(?:e|ing)|continuous improvement|improvement cycle|smart decision(?: engine)?(?: mode)?)(?:\s+now|\s+once)?/i },
];

function parseCommand(rawCommand = '') {
  const command = String(rawCommand || '').trim();
  if (!command) {
    return {
      recognized: false,
      action: 'none',
      command,
      reason: 'empty-command',
    };
  }

  const premiumUI = /premium\s+ui|linear|vercel|stripe|notion|supabase/i.test(command);
  const smartDecisionMode = /smart\s+decision(?:\s+engine)?(?:\s+mode)?/i.test(command);
  const sanitizedCommand = command
    .replace(/\bpremium\s+ui\b/gi, ' ')
    .replace(/\bstyle\s+(linear|vercel|stripe|notion|supabase)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pattern of SELF_IMPROVE_PATTERNS) {
    if (!pattern.regex.test(sanitizedCommand)) {
      continue;
    }

    return {
      recognized: true,
      action: pattern.action,
      command,
      options: {
        premiumUI,
        smartDecisionMode,
      },
    };
  }

  for (const pattern of CREATE_PATTERNS) {
    const match = sanitizedCommand.match(pattern.regex);
    if (!match) {
      continue;
    }

    const entityLabel = String(match[1] || '').trim();
    const normalized = toKebabCase(entityLabel);

    if (!normalized) {
      break;
    }

    return {
      recognized: true,
      action: pattern.action,
      command,
      entity: {
        label: entityLabel,
        name: normalized,
        pascalName: toPascalCase(entityLabel),
      },
      options: {
        premiumUI,
        smartDecisionMode,
      },
    };
  }

  return {
    recognized: false,
    action: 'unknown',
    command,
    options: {
      premiumUI,
      smartDecisionMode,
    },
  };
}

module.exports = {
  parseCommand,
};
