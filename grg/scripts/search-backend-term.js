const { execSync } = require('child_process');

try {
  const res = execSync('grep -rn "terminal" /opt/fenix-os/grg/src/ --include="*.js" | head -n 30', { encoding: 'utf8' });
  console.log('grep terminal:\n', res);
} catch (e) {
  console.log('grep error or none found:', e.message);
}

try {
  const res2 = execSync('grep -rn "execSync\\|exec(" /opt/fenix-os/grg/src/ --include="*.js" | head -n 30', { encoding: 'utf8' });
  console.log('grep exec:\n', res2);
} catch (e) {
  console.log('grep error or none found:', e.message);
}
