
const { spawn } = require('child_process');
const child = spawn('node', ['restart-helper.js'], {
  detached: true,
  stdio: 'ignore'
});
child.unref();
console.log('Restart helper triggered successfully');
