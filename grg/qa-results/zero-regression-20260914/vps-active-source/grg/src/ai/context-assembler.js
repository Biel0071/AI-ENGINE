/**
 * FÊNIX OS — CONTEXT INTELLIGENCE & CONTEXT ASSEMBLER (LEVEL 10)
 * 
 * Objective: Assemble surgical, minimal, non-bloated context packages for LLMs.
 * Never send the entire repository when a targeted slice suffices.
 */

class ContextAssembler {
  constructor({ tokenEconomyEngine = null } = {}) {
    this.economy = tokenEconomyEngine;
  }

  /**
   * 1. Minimal Context for general intent classification / routing
   */
  buildMinimalContext({ projectDna = {}, userRequest = '', intent = 'GENERAL' } = {}) {
    return {
      intent,
      project: {
        id: projectDna.id || 'default',
        name: projectDna.name || 'Fênix Project',
        stack: projectDna.stack || 'React 18 + Vite + TypeScript'
      },
      summary: `Requisição do usuário: "${userRequest.slice(0, 200)}"`
    };
  }

  /**
   * 2. Coding Context for code synthesis & modifications
   */
  buildCodingContext({
    projectDna = {},
    targetFiles = [],
    relevantSymbols = [],
    diff = '',
    styleGuide = 'Tailwind + TypeScript strict'
  } = {}) {
    return {
      architecture: projectDna.architecture || 'React 18 + TypeScript',
      entrypoint: projectDna.entrypoint || 'src/App.tsx',
      files: targetFiles.map(f => ({
        path: f.path,
        symbols: f.symbols || relevantSymbols.filter(s => s.file === f.path).map(s => s.name),
        content: f.content ? (f.content.length > 2500 ? f.content.slice(0, 2500) + '\n/* [TRUNCATED FOR TOKEN ECONOMY] */' : f.content) : undefined
      })),
      diff: diff || undefined,
      constraints: [
        'Preservar contratos de tipos TypeScript existentes',
        'Zero mocks em produção (Reality Gate)',
        'Read-After-Write persistence'
      ]
    };
  }

  /**
   * 3. Architecture Context for system design & scaffolding
   */
  buildArchitectureContext({
    projectDna = {},
    dependencyGraph = {},
    knownModules = []
  } = {}) {
    return {
      stack: projectDna.stack || 'React + Vite',
      modules: knownModules,
      dependencies: Object.keys(dependencyGraph || {}).slice(0, 15),
      patterns: ['Modular Context + Hooks', 'Zero-Mock Strict Invariant']
    };
  }

  /**
   * 4. Debug Context for targeted bug fixing (error + line context only)
   */
  buildDebugContext({
    error = '',
    stackTrace = '',
    targetFile = '',
    lineNumber = null,
    surroundingCode = '',
    knownBugSolutions = []
  } = {}) {
    return {
      error: error.slice(0, 400),
      location: {
        file: targetFile,
        line: lineNumber
      },
      relevantSnippet: surroundingCode,
      pastSolutions: knownBugSolutions.slice(0, 2),
      instruction: 'Corrigir apenas o ponto causador sem reescrever módulos não afetados.'
    };
  }

  /**
   * 5. Visual Context for UI & Screen modifications
   */
  buildVisualContext({
    screenId = '',
    route = '/',
    component = 'Dashboard',
    visualHash = '',
    designSystem = { colors: ['#0a0f1c', '#38bdf8', '#10b981'], radius: '0.75rem' }
  } = {}) {
    return {
      screenId,
      route,
      component,
      designSystem,
      visualHash
    };
  }

  /**
   * 6. Deployment Context for CI/CD & Production
   */
  buildDeploymentContext({
    environment = 'production',
    services = ['vps', 'qwen', 'docker'],
    health = { ok: true }
  } = {}) {
    return {
      environment,
      activeServices: services,
      healthStatus: health.ok ? 'HEALTHY' : 'DEGRADED'
    };
  }

  /**
   * 7. Research Context for web & documentation
   */
  buildResearchContext({
    topic = '',
    cachedSummary = '',
    sources = []
  } = {}) {
    return {
      topic,
      cachedSummary,
      sourcesCount: sources.length
    };
  }
}

module.exports = { ContextAssembler };
