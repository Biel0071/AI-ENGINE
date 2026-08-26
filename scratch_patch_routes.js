const fs = require('fs');
let code = fs.readFileSync('grg/src/api/cloud-routes.js', 'utf8');
code = code.replace(
  /type: 'dev_task',/g,
  \	ype: 'MISSION_PLANNER',
          legacyType: 'dev_task',\
);
fs.writeFileSync('grg/src/api/cloud-routes.js', code, 'utf8');
console.log('Patched cloud routes');
