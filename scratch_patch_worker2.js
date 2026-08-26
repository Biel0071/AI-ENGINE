const fs = require('fs');
let code = fs.readFileSync('grg/src/execution/job-worker.js', 'utf8');
code = code.replace(
  /if \\(job\\.type === 'MISSION_PLANNER'\\) \\{\\s*if \\(this\\.app\\.missionPlanner\\) \\{\\s*pipelineResult = await this\\.app\\.missionPlanner\\.plan\\('grg', 'grg-admin', \\{ objective: job\\.prompt \\|\\| 'Plan mission' \\}\\);\\s*\\} else \\{/g,
  \if (job.type === 'MISSION_PLANNER') {
         if (false) {
             // disabled
         } else {\
);
fs.writeFileSync('grg/src/execution/job-worker.js', code, 'utf8');
console.log('Disabled real missionPlanner in JobWorker for DAG test');
