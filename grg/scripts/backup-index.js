const fs = require('fs');
const { execSync } = require('child_process');

const backupDir = '/opt/fenix-os/backups';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = `${backupDir}/frontend_v15_pre_city_${timestamp}.html`;
fs.copyFileSync('/opt/fenix-os/public/index.html', backupPath);
console.log('Created backup:', backupPath);
