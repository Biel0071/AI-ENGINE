
const { exec } = require('child_process');
exec('wmic process where "name like \'%node%\'" get processid, parentprocessid, commandline', (err, stdout, stderr) => {
  console.log(JSON.stringify({ err, stdout, stderr }, null, 2));
});
