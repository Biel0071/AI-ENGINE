const fs = require('fs');
let code = fs.readFileSync('grg/src/execution/job-queue.js', 'utf8');
code = code.replace(
  'this.jobs.set(j.id, j);\\r\\n          }\\r\\n        }',
  'this.jobs.set(j.id, j);\\n          }\\n          this.save();\\n        }'
);
code = code.replace(
  'this.jobs.set(j.id, j);\\n          }\\n        }',
  'this.jobs.set(j.id, j);\\n          }\\n          this.save();\\n        }'
);
fs.writeFileSync('grg/src/execution/job-queue.js', code, 'utf8');
