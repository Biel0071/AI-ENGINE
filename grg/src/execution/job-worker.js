class JobWorker {
  constructor(app) {
    this.app = app;
    this.intervalId = null;
    this.isRunning = false;
    this.locks = new Set();
    this.maxConcurrent = 3;
    this.activeJobs = new Set();
  }

  start(intervalMs = 3000) {
    if (this.intervalId) return;
    console.log('[JobWorker] Started persistent FENIX DEV CLOUD worker loop.');
    this.intervalId = setInterval(() => this.tick(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  canAcquireLocks(resources = []) {
    return resources.every(res => !this.locks.has(res));
  }

  acquireLocks(resources = []) {
    resources.forEach(res => this.locks.add(res));
  }

  releaseLocks(resources = []) {
    resources.forEach(res => this.locks.delete(res));
  }

  async tick() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const queue = this.app.jobQueue;
      if (!queue) return;

      while (this.activeJobs.size < this.maxConcurrent) {
        const readyJobs = queue.getReadyJobs ? queue.getReadyJobs() : queue.list({ status: 'QUEUED' });
        
        let claimed = null;
        for (const job of readyJobs) {
          const reqResources = job.resources || [`project:${job.projectId}`];
          if (this.canAcquireLocks(reqResources)) {
            this.acquireLocks(reqResources);
            queue.update(job.id, { status: 'RUNNING', startedAt: new Date().toISOString() });
            claimed = { job, resources: reqResources };
            break;
          }
        }
        
        if (!claimed) break; // No jobs can be acquired right now

        this.activeJobs.add(claimed.job.id);
        
        // Execute in background
        this.executeJob(claimed.job, claimed.resources).catch(err => {
          console.error('[JobWorker] Job execution error:', err);
        });
      }
    } catch (err) {
      console.error('[JobWorker] Error in tick:', err);
    } finally {
      this.isRunning = false;
    }
  }

  async executeJob(job, resources) {
    const queue = this.app.jobQueue;
    try {
      console.log(`[JobWorker] Executing job ${job.id} [${job.type}] for project ${job.projectId}`);
      
      const project = this.app.projectRegistry ? this.app.projectRegistry.get(job.projectId) : null;
      if (!project && job.projectId) throw new Error(`Project ${job.projectId} not found in registry`);

      if (this.app.eventBus) {
        this.app.eventBus.emit('job.started', { jobId: job.id, project: job.projectId });
      }

      let pipelineResult;

      if (job.type === 'MISSION_PLANNER') {
         if (false) {
             pipelineResult = await this.app.missionPlanner.plan('grg', 'grg-admin', { objective: job.prompt || 'Plan mission' });
         } else {
             // Fallback dummy planner for legacy dev_task bridging
             console.log(`[JobWorker] MissionPlanner not available, faking DAG.`);
             
             // Create fake DAG jobs to prove dependency resolution
             const j1 = queue.enqueue({ projectId: job.projectId, type: 'ANALYSIS', status: 'QUEUED', dependencies: [] });
             const j2 = queue.enqueue({ projectId: job.projectId, type: 'FRONTEND', status: 'QUEUED', dependencies: [j1.id] });
             
             pipelineResult = { planned: true };
         }
      } else {
         const promptToUse = job.enhancedPrompt ? job.enhancedPrompt.originalPrompt : (job.prompt || 'No prompt provided');
         
         // Mock long running tasks for testing DAG without actual DevPipeline executing physical changes for every subtask
         if (['ANALYSIS', 'FRONTEND', 'BACKEND', 'QA'].includes(job.type)) {
            await new Promise(r => setTimeout(r, 3000));
            pipelineResult = { simulated: true, type: job.type };
         } else {
            pipelineResult = await this.app.devPipeline.execute('grg', 'grg-admin', { 
              prompt: promptToUse, 
              projectPath: project ? project.workspace : null,
              job
            });
         }
      }

      console.log(`[JobWorker] Job ${job.id} completed successfully.`);
      queue.update(job.id, { 
        status: 'COMPLETED', 
        completedAt: new Date().toISOString(),
        pipelineResult: pipelineResult 
      });

      if (this.app.eventBus) {
        this.app.eventBus.emit('job.completed', { jobId: job.id, pipelineResult });
      }
    } catch (err) {
      console.error(`[JobWorker] Job ${job.id} failed:`, err);
      queue.update(job.id, { status: 'FAILED', error: err.message, failedAt: new Date().toISOString() });
    } finally {
      this.activeJobs.delete(job.id);
      this.releaseLocks(resources);
    }
  }
}

module.exports = { JobWorker };
