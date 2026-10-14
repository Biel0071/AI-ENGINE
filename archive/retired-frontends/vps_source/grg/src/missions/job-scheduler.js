const { JOB_STATES, InvalidStateTransitionError } = require('./mission-schema');

class JobScheduler {
  constructor(options = {}) {
    this.workerRegistry = options.workerRegistry || null;
  }

  async runDAG(mission) {
    if (mission.state !== 'QUEUED') {
      throw new InvalidStateTransitionError(mission.id, mission.state, 'RUNNING');
    }

    mission.transitionTo('RUNNING');

    let completedJobIds = [];
    let jobsToRun = [...mission.jobs];
    
    while (completedJobIds.length < mission.jobs.length) {
      let progressMade = false;

      for (let job of jobsToRun) {
        if (job.status === JOB_STATES.COMPLETED || job.status === JOB_STATES.FAILED) {
          continue;
        }

        if (job.canRun(completedJobIds)) {
          job.status = JOB_STATES.RUNNING;
          
          try {
            // Find a worker that can handle this job's capability
            // Default mapping: the job's target capability is the worker name lowercase,
            // or we look up by worker type. For now, since jobs specify worker name, we fetch by name directly.
            // In a fully capability-driven approach, the job would specify a required capability.
            let worker = null;
            if (this.workerRegistry) {
              // Try exact name match first
              worker = this.workerRegistry.getWorkerByName(job.worker);
              
              if (!worker) {
                 // Try mapping the worker name to a capability (fallback for legacy definitions)
                 const capMap = {
                   'Planner': 'planning',
                   'Architect': 'architecture',
                   'Backend': 'backend',
                   'Frontend': 'ui',
                   'Database': 'crud',
                   'DevOps': 'routing',
                   'QA': 'audit',
                   'Security': 'security',
                   'Documentation': 'summaries',
                   'Deploy': 'release'
                 };
                 const requiredCap = capMap[job.worker] || job.worker.toLowerCase();
                 worker = this.workerRegistry.getWorkerByCapability(requiredCap);
              }
            }
            
            if (worker) {
              job.result = await worker.execute(job);
            } else {
              throw new Error(`No worker available to handle job ${job.id} (requested worker: ${job.worker})`);
            }
            
            job.status = JOB_STATES.COMPLETED;
            completedJobIds.push(job.id);
            progressMade = true;
          } catch (err) {
            job.status = JOB_STATES.FAILED;
            job.result = { error: err.message };
            mission.transitionTo('VALIDATING'); // Let QualityGate handle failures
            return;
          }
        }
      }

      if (!progressMade && completedJobIds.length < mission.jobs.length) {
        throw new Error('DAG execution blocked: no jobs can run. Check dependencies.');
      }
    }

    mission.transitionTo('VALIDATING');
  }
}

module.exports = { JobScheduler };
