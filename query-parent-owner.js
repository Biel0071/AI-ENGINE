
const { exec } = require('child_process');
exec('wmic process where processid=57856 get commandline,name', (err, stdout, stderr) => {
  console.log(JSON.stringify({ err, stdout, stderr }, null, 2));
});
