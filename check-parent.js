
const { exec } = require('child_process');
exec('wmic process where processid=21300 get commandline', (err, stdout, stderr) => {
  console.log(JSON.stringify({ err, stdout, stderr }, null, 2));
});
