const { Job, InvalidStateTransitionError } = require('./mission-schema');

class MissionPlanner {
  constructor(options = {}) {
    this.router = options.router || null;
    this.estimator = options.estimator || null;
  }

  async plan(mission) {
    if (mission.state !== 'ANALYZED') {
      throw new InvalidStateTransitionError(mission.id, mission.state, 'PLANNED');
    }

    const intent = mission.intent;
    
    // In Reality First, call LLM to generate the plan.
    // Planner Output: Objective -> Dependencies -> Risks -> Estimate -> Plan -> Validation
    
    let planData = {
      objective: intent.type,
      dependencies: [],
      risks: [],
      plan: [],
      validation: []
    };

    if (this.router && this.router.isAvailable('architecture')) {
      try {
        const result = await this.router.execute('architecture', {
          prompt: `Create a DAG execution plan for this objective: ${intent.type}. Output in JSON format containing: objective, dependencies, risks, plan (array of jobs), validation.`
        });
        if (result) {
          planData = typeof result === 'string' ? JSON.parse(result) : result;
        }
      } catch (err) {
        console.warn('[MissionPlanner] LLM planning failed, falling back to heuristic:', err.message);
      }
    }

    // Heuristic fallback: create a standard sequence of Jobs (DAG)
    // DAG path: Planner (this step) -> Architect -> Backend -> Frontend -> Database -> DevOps -> QA -> Security -> Documentation -> Deploy
    
    const jobs = [];
    
    const architectJob = new Job({ missionId: mission.id, worker: 'Architect', payload: { action: 'design' }});
    jobs.push(architectJob);
    
    const databaseJob = new Job({ missionId: mission.id, worker: 'Database', dependencies: [architectJob.id] });
    jobs.push(databaseJob);
    
    const backendJob = new Job({ missionId: mission.id, worker: 'Backend', dependencies: [databaseJob.id] });
    jobs.push(backendJob);
    
    const frontendJob = new Job({ missionId: mission.id, worker: 'Frontend', dependencies: [backendJob.id] });
    jobs.push(frontendJob);
    
    const devOpsJob = new Job({ missionId: mission.id, worker: 'DevOps', dependencies: [frontendJob.id] });
    jobs.push(devOpsJob);
    
    const qaJob = new Job({ missionId: mission.id, worker: 'QA', dependencies: [devOpsJob.id] });
    jobs.push(qaJob);
    
    const securityJob = new Job({ missionId: mission.id, worker: 'Security', dependencies: [qaJob.id] });
    jobs.push(securityJob);
    
    const docJob = new Job({ missionId: mission.id, worker: 'Documentation', dependencies: [securityJob.id] });
    jobs.push(docJob);
    
    const deployJob = new Job({ missionId: mission.id, worker: 'Deploy', dependencies: [docJob.id] });
    jobs.push(deployJob);

    mission.jobs = jobs;
    mission.planData = planData;
    
    // Transition to PLANNED
    mission.transitionTo('PLANNED');

    // Call Estimator if available
    if (this.estimator) {
      mission.estimate = await this.estimator.estimate(mission);
      mission.transitionTo('ESTIMATED');
    }

    return mission;
  }
}

module.exports = { MissionPlanner };
