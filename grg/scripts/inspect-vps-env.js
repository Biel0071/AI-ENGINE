'use strict';
const cp = require('child_process');

try {
  const list = JSON.parse(cp.execSync('pm2 jlist').toString());
  const b = list.find(p => p.name === 'fenix-backend');
  const env = b?.pm2_env || {};
  const keys = Object.keys(env).filter(k => k.includes('FENIX') || k.includes('ADMIN') || k.includes('AUTH') || k.includes('USER') || k.includes('DEV'));
  console.log('Matched PM2 keys:', keys);
  for (const k of keys) {
    if (k.includes('PASSWORD') || k.includes('SECRET') || k.includes('KEY')) {
      console.log(`${k}: [SET: length ${String(env[k]).length}]`);
    } else {
      console.log(`${k}: ${env[k]}`);
    }
  }
} catch (e) {
  console.error(e);
}
