const fs = require('fs');
let code = fs.readFileSync('grg/src/execution/job-queue.js', 'utf8');
if (!code.includes('this.save(); // ensure disk reflects recovery')) {
  code = code.replace(
    'this.jobs.set(j.id, j);\\n          }\\n        }\\n      } catch',
    'this.jobs.set(j.id, j);\\n          }\\n          this.save(); // ensure disk reflects recovery\\n        }\\n      } catch'
  );
  fs.writeFileSync('grg/src/execution/job-queue.js', code, 'utf8');
  console.log('Fixed job queue load');
}
