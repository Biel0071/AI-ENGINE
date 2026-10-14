/**
 * ExecutableSkillSchema & SkillProgram — Fênix OS Agent Operating System
 * 
 * Regra Suprema: Skill ≠ Prompt.
 * Uma Skill no Fênix OS é um programa executável, determinístico e verificável,
 * dotado de manifesto, pré-condições, ferramentas vinculadas, bateria de testes,
 * rotinas de recuperação e rastreabilidade evolutiva.
 */

class ExecutableSkill {
  constructor({
    id,
    name,
    version = '1.0.0',
    description = '',
    domain = 'engineering',
    inputs = {},
    outputs = {},
    preconditions = {},
    steps = [],
    tools = [],
    permissions = [],
    verification = [],
    failureRecovery = [],
    telemetry = {},
    evolutionHistory = []
  }) {
    if (!id || !name) throw new Error('Skill requires id and name');
    this.id = id;
    this.name = name;
    this.version = version;
    this.description = description;
    this.domain = domain;
    this.inputs = inputs;
    this.outputs = outputs;
    this.preconditions = {
      toolsRequired: tools,
      minMemoryMb: preconditions.minMemoryMb || 64,
      supportedPlatforms: preconditions.supportedPlatforms || ['linux', 'win32', 'darwin'],
      ...preconditions
    };
    this.steps = steps;
    this.tools = tools;
    this.permissions = permissions;
    this.verification = verification; // Bateria de testes de aceitação da skill
    this.failureRecovery = failureRecovery; // Rollbacks e rotinas de contingência
    this.telemetry = {
      executionCount: telemetry.executionCount || 0,
      successCount: telemetry.successCount || 0,
      averageDurationMs: telemetry.averageDurationMs || 0,
      lastExecutedAt: telemetry.lastExecutedAt || null,
      ...telemetry
    };
    this.evolutionHistory = evolutionHistory;
  }

  validatePreconditions(env = {}) {
    const platform = env.platform || process.platform;
    if (this.preconditions.supportedPlatforms && !this.preconditions.supportedPlatforms.includes(platform)) {
      return { ok: false, reason: `Platform ${platform} not supported by skill ${this.id}` };
    }
    return { ok: true };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      domain: this.domain,
      inputs: this.inputs,
      outputs: this.outputs,
      preconditions: this.preconditions,
      steps: this.steps,
      tools: this.tools,
      permissions: this.permissions,
      verificationCount: this.verification.length,
      telemetry: this.telemetry,
      evolutionCount: this.evolutionHistory.length
    };
  }
}

module.exports = { ExecutableSkill };
