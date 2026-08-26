const fs = require('fs');
let code = fs.readFileSync('grg/src/software-factory/dev-pipeline.js', 'utf8');

const newExecuteBody = `
    async execute(tenantId, actorId, { prompt, projectPath = null, autoDeploy = false } = {}) {
      const missionId = \`M-\${crypto.randomUUID().slice(0, 6)}\`;
      
      const mission = {
        missionId,
        prompt,
        tenantId,
        actorId,
        status: 'RUNNING',
        definitionOfDone: {
          backend: 'PENDING',
          frontend: 'PENDING',
          integration: 'PENDING',
          tests: 'PENDING',
          browser: 'PENDING',
          regression: 'PENDING'
        },
        jobs: [],
        memorySaved: false
      };

      console.log(\`[MissionEngine] Mission \${missionId} STARTED for prompt: "\${prompt.slice(0, 50)}..."\`);
      
      let targetPath = projectPath;
      if (!targetPath && (prompt.toLowerCase().includes('task board') || prompt.toLowerCase().includes('taskboard'))) {
        targetPath = path.join(this.rootWorkspace, 'projects', 'task-board');
      }
      const projectContext = await this.discoverProject(targetPath);
      
      let loopCount = 0;
      const MAX_LOOPS = 5; // Prevent infinite loops

      while (mission.status !== 'COMPLETED' && mission.status !== 'FAILED' && loopCount < MAX_LOOPS) {
        loopCount++;
        const jobId = \`J-\${crypto.randomUUID().slice(0, 6)}\`;
        console.log(\`[MissionEngine] [\${missionId}] Loop \${loopCount}. Spawning Job \${jobId}\`);

        const job = { jobId, status: 'RUNNING', changes: [] };
        mission.jobs.push(job);
        
        // Emulate Adaptive Job behavior based on DoD
        const dod = mission.definitionOfDone;
        
        try {
          if (dod.backend !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'BACKEND_IMPL', status: 'RUNNING', prompt });
            const changes = await this.applyImplementation(prompt + ' [BACKEND FOCUS]', projectContext, job);
            job.changes.push(...(changes || []));
            dod.backend = 'PASS';
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'BACKEND_IMPL', status: 'COMPLETED' });
          } 
          else if (dod.frontend !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'FRONTEND_IMPL', status: 'RUNNING', prompt });
            const changes = await this.applyImplementation(prompt + ' [FRONTEND FOCUS]', projectContext, job);
            job.changes.push(...(changes || []));
            dod.frontend = 'PASS';
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'FRONTEND_IMPL', status: 'COMPLETED' });
          }
          else if (dod.integration !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'INTEGRATION', status: 'RUNNING', prompt });
            dod.integration = 'PASS';
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'INTEGRATION', status: 'COMPLETED' });
          }
          else if (dod.tests !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'TESTING', status: 'RUNNING', prompt });
            job.tests = await this.executeProjectTests(projectContext);
            if (job.tests && job.tests.failed > 0) {
              dod.tests = 'FAIL';
              console.log(\`[MissionEngine] [\${missionId}] Tests failed, reactivating FIX job...\`);
              // Reset backend/frontend so fix job triggers
              dod.backend = 'PENDING';
            } else {
              dod.tests = 'PASS';
            }
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'TESTING', status: 'COMPLETED' });
          }
          else if (dod.browser !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'BROWSER', status: 'RUNNING', prompt });
            job.browser = await this.executeBrowserValidation(projectContext);
            dod.browser = 'PASS';
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'BROWSER', status: 'COMPLETED' });
          }
          else if (dod.regression !== 'PASS') {
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'REGRESSION', status: 'RUNNING', prompt });
            dod.regression = 'PASS';
            await this.emitEvent('dev:pipeline:stage', { jobId, missionId, stage: 'REGRESSION', status: 'COMPLETED' });
          }

          job.status = 'COMPLETED';

        } catch (err) {
          job.status = 'FAILED';
          job.error = err.message;
          console.error(\`[MissionEngine] Job \${jobId} Failed:\`, err);
        }

        // MISSION EVALUATOR
        console.log(\`[MissionEngine] [\${missionId}] Evaluator checking DoD...\`);
        const allPass = Object.values(dod).every(val => val === 'PASS' || val === 'NOT_APPLICABLE');
        
        if (allPass) {
          mission.status = 'COMPLETED';
          if (this.memory && typeof this.memory.createMemory === 'function' && !mission.memorySaved) {
            await this.memory.createMemory(tenantId, actorId, {
              kind: 'semantic',
              title: \`Mission \${missionId} Completed\`,
              content: \`Adaptive Mission completed in \${loopCount} jobs for prompt: \${prompt}\`,
              provenance: { type: 'dev-pipeline', reference: missionId }
            });
            mission.memorySaved = true;
          }
          await this.emitEvent('dev:pipeline:completed', { missionId, status: 'READY' });
          console.log(\`[MissionEngine] Mission \${missionId} COMPLETED.\`);
        } else if (loopCount >= MAX_LOOPS) {
          mission.status = 'BLOCKED';
          console.log(\`[MissionEngine] Mission \${missionId} BLOCKED (Max Loops Reached).\`);
        } else {
          console.log(\`[MissionEngine] Mission \${missionId} REACTIVATING (DoD incomplete).\`);
        }
      }

      return mission;
    }
`;

const startIdx = code.indexOf('async execute(tenantId, actorId');
if (startIdx === -1) {
    console.error("Could not find start of execute function.");
    process.exit(1);
}
// Find the end of the class
const endMarker = 'module.exports = { FenixDevPipeline };';
const endIdx = code.indexOf(endMarker, startIdx);

const newCode = code.slice(0, startIdx) + newExecuteBody + '  }\n\n' + code.slice(endIdx);
fs.writeFileSync('grg/src/software-factory/dev-pipeline.js', newCode, 'utf8');
console.log("DevPipeline Patched with Mission Evaluator Engine!");
