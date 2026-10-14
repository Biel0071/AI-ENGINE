/**
 * FÊNIX OS — Reverse Engineering Engine
 * Automated pipeline: IMPORT -> SCAN -> RUN/DETECT -> OBSERVE -> ANALYZE -> UNDERSTAND -> MAP -> INDEX -> FÊNIX PROJECT
 */

const { ProjectUnderstandingScanner } = require('./project-understanding-scanner');
const { GenomeBuilder } = require('../intelligence/genome-builder');
const path = require('path');

class ReverseEngineeringEngine {
  constructor({ scanner = null, genomeBuilder = null, eventBus = null } = {}) {
    this.scanner = scanner || new ProjectUnderstandingScanner();
    this.genomeBuilder = genomeBuilder || new GenomeBuilder();
    this.eventBus = eventBus;
  }

  /**
   * Runs the complete reverse engineering pipeline on a target repository
   */
  async ingestAndAnalyze(projectPath, { projectName = null, projectId = null } = {}) {
    const root = path.resolve(projectPath);
    const inferredName = projectName || path.basename(root);
    const pId = projectId || `prj_${inferredName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    // 1. SCAN & ANALYZE
    const scanResult = await this.scanner.scan(root);

    // 2. UNDERSTAND & EXTRACT TOPOLOGY
    const totalComponents = scanResult.components.length;
    const totalRoutes = scanResult.routes.length;
    const totalSchemas = scanResult.database.schemaFiles.length;
    const totalIntegrations = scanResult.integrations.length;
    const stackSummary = scanResult.detectedStack.map(s => s.name).join(', ');

    // 3. GENERATE INITIAL PROJECT DNA (v1.0.0)
    const gb = new GenomeBuilder({ projectId: pId });
    const initialDna = gb.compile({
      projectDna: {
        stack: scanResult.detectedStack.map(s => s.name),
        architecture: scanResult.detectedStack.some(s => s.name.includes('next')) ? 'FullStack Framework' : 'Client-Server Architecture',
        modules: ['Core', 'Views', 'API', 'Data'],
        features: scanResult.routes.map(r => r.file),
        apiRoutes: scanResult.routes.map(r => r.file),
        databaseSchemas: scanResult.database.schemaFiles,
        integrations: scanResult.integrations.map(i => i.name)
      },
      operationalDna: {
        workflows: ['Initial_Project_Ingestion'],
        actionSequences: [],
        decisions: [`Project ${inferredName} imported and scanned`],
        learnedRules: []
      },
      visualDna: {
        layouts: ['DefaultLayout'],
        componentTree: scanResult.components.map(c => c.componentName),
        designTokens: {},
        breakpoints: ['sm', 'md', 'lg', 'xl']
      },
      agentDna: {
        activeAgents: ['Orchestrator', 'Developer'],
        skillsInventory: ['project-scanner'],
        taskSuccessRate: 100.0
      }
    });

    // 4. PRODUCE PROJECT UNDERSTANDING REPORT
    const report = {
      projectId: pId,
      projectName: inferredName,
      rootPath: root,
      stackSummary,
      detectedStack: scanResult.detectedStack,
      metrics: {
        totalFiles: scanResult.totalFiles,
        totalComponents,
        totalRoutes,
        totalDatabaseSchemas: totalSchemas,
        totalIntegrations,
        estimatedTotalFunctions: (totalComponents * 3) + (totalRoutes * 2) + 10
      },
      entryPoints: scanResult.entryPoints,
      database: scanResult.database,
      components: scanResult.components,
      routes: scanResult.routes,
      integrations: scanResult.integrations,
      initialDna,
      ingestedAt: new Date().toISOString(),
      readyForEdit: true
    };

    return report;
  }
}

module.exports = { ReverseEngineeringEngine };
