const fs = require('node:fs');
const file = process.argv[2];
if (!file) throw new Error('FileSystemService path required');
let source = fs.readFileSync(file, 'utf8');
const anchor = "  if (parsed.protocol !== 'https:') throw new Error('repository url must use https');";
if (!source.includes(anchor)) throw new Error('Clone URL validation anchor missing');
if (!source.includes('repository URL must not contain credentials')) {
  source = source.replace(anchor, `${anchor}\n  if (parsed.username || parsed.password) throw new Error('repository URL must not contain credentials');`);
  fs.writeFileSync(file, source);
}
