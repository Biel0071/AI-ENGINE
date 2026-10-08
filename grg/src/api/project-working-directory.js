'use strict';

const fs = require('node:fs');
const path = require('node:path');

function resolveProjectWorkingDirectory(projectRoot, requestedCwd) {
  if (typeof projectRoot !== 'string' || !projectRoot || (requestedCwd != null && typeof requestedCwd !== 'string')) return null;
  try {
    const root = fs.realpathSync(projectRoot);
    if (!fs.statSync(root).isDirectory()) return null;
    const candidate = requestedCwd ? path.resolve(root, requestedCwd) : root;
    const relative = path.relative(root, candidate);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    const real = fs.realpathSync(candidate);
    const realRelative = path.relative(root, real);
    if (realRelative === '..' || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) return null;
    if (!fs.statSync(real).isDirectory()) return null;
    return real;
  } catch {
    return null;
  }
}

module.exports = { resolveProjectWorkingDirectory };
