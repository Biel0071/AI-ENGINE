/**
 * FÊNIX AI Orchestrator Central Kernel
 * Integrates CEO Brain, CTO Brain, Intent Engine, Estimator Engine, Resource Router, Job DAG Orchestrator & Quality Gate
 */
const { AICeoEngine } = require('./ai-ceo-engine');
const { AICtoEngine } = require('./ai-cto-engine');
const { IntentEngine } = require('./intent-engine');
const { EstimatorEngine } = require('./estimator-engine');
const { ResourceModelRouter } = require('./resource-model-router');
const { JobOrchestrator } = require('./job-orchestrator');
const { QualityGate } = require('./quality-gate');
const { MissionDNA } = require('../missions/mission-dna');
const { ProjectDNA } = require('../product/project-dna');

class AIOrchestratorKernel {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.ceo = new AICeoEngine({ eventBus: this.eventBus });
    this.cto = new AICtoEngine({ eventBus: this.eventBus });
    this.intent = new IntentEngine({ eventBus: this.eventBus });
    this.estimator = new EstimatorEngine({ eventBus: this.eventBus });
    this.router = new ResourceModelRouter({ eventBus: this.eventBus });
    this.jobOrchestrator = new JobOrchestrator({ eventBus: this.eventBus });
    this.qualityGate = new QualityGate({ eventBus: this.eventBus });
    this.projectDna = new ProjectDNA();
    this.activeMissions = new Map();
  }

  async processRequest(userPrompt) {
    // 1. Intent Engine
    const intentSpec = await this.intent.parseIntent(userPrompt);

    // 2. AI CEO Engine (Strategic Alignment & ROI)
    const ceoApproval = await this.ceo.evaluateStrategy(intentSpec);

    // 3. AI CTO Engine (Technical Architecture)
    const architectureBlueprint = await this.cto.designTechnicalSolution(intentSpec, ceoApproval);

    // 4. Estimator Engine
    const estimation = await this.estimator.calculateEstimation(intentSpec, architectureBlueprint);

    // 5. Job Orchestrator (DAG Graph)
    const dagGraph = await this.jobOrchestrator.createJobGraph(intentSpec, architectureBlueprint);

    // 6. Resource Model Router
    const routingPlan = await this.router.buildTaskRoutingPlan(dagGraph.jobs);

    // 7. Mission DNA
    const missionDna = new MissionDNA({
      missionId: intentSpec.id,
      objective: intentSpec.objective,
      scope: intentSpec.requirements,
      risks: intentSpec.risks,
      stack: architectureBlueprint.stack,
      dependencies: dagGraph.jobs.map((j) => j.id),
    });

    this.projectDna.recordMissionExecution(missionDna);

    const missionPackage = {
      mission: intentSpec,
      ceoApproval,
      architectureBlueprint,
      estimation,
      dagGraph,
      routingPlan,
      missionDna: missionDna.toJSON(),
      status: 'AWAITING_BUILD_CONFIRMATION',
    };

    this.activeMissions.set(intentSpec.id, missionPackage);

    if (this.eventBus) {
      await this.eventBus.emit('orchestrator.mission.created', missionPackage);
    }
    return missionPackage;
  }

  async approveAndStartBuild(missionId) {
    const pkg = this.activeMissions.get(missionId);
    if (!pkg) throw new Error(`Mission ${missionId} not found`);

    pkg.status = 'BUILDING';

    // Simulate Job Execution & Quality Gate Audit
    const qualityResult = await this.qualityGate.verifyQuality(pkg.dagGraph, { passed: 100, failed: 0 });
    pkg.qualityResult = qualityResult;
    pkg.status = qualityResult.approved ? 'RELEASE_READY' : 'QUALITY_REJECTED';

    if (this.eventBus) {
      await this.eventBus.emit('orchestrator.build.updated', { missionId, status: pkg.status });
    }
    return pkg;
  }

  getMissionStatus(missionId) {
    return this.activeMissions.get(missionId) || null;
  }

  getProjectDna() {
    return this.projectDna.toJSON();
  }
}

module.exports = { AIOrchestratorKernel };
