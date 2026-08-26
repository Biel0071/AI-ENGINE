const fs = require('fs');
let code = fs.readFileSync('grg/src/execution/job-worker.js', 'utf8');
code = code.replace(
  'pipelineResult = await this.app.missionPlanner.plan(job, project);',
  'pipelineResult = await this.app.missionPlanner.plan(\'grg\', \'grg-admin\', { objective: job.prompt || \'Plan mission\' });'
);
fs.writeFileSync('grg/src/execution/job-worker.js', code, 'utf8');
console.log('Fixed JobWorker missionPlanner call');
