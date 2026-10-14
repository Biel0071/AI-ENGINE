const { execSync } = require('child_process');
const list = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
const backend = list.find(p => p.name === 'fenix-backend');
if (backend) {
  console.log('Backend pm2 info:');
  console.log('script:', backend.pm2_env.pm_exec_path);
  console.log('cwd:', backend.pm2_env.pm_cwd);
  console.log('args:', backend.pm2_env.args);
}
