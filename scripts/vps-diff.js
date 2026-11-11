#!/usr/bin/env node
// Read-only content diff between a local pull of the VPS tree and the local ai-engine tree.
// Usage: node scripts/vps-diff.js <vpsPullDir> [outJson]
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const vpsRoot = process.argv[2];
const out = process.argv[3];
const localRoot = path.resolve(__dirname, '..');
const ROOTS = ['grg/src', 'grg/public', 'platform'];
const SKIP = /(^|\/)node_modules(\/|$)|\.(png|mp4|webm|jpg|glb)$/i;

function walk(base, rel, acc) {
  const abs = path.join(base, rel);
  if (!fs.existsSync(abs)) return acc;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = rel + '/' + e.name;
    if (SKIP.test(r)) continue;
    if (e.isDirectory()) walk(base, r, acc);
    else if (e.isFile()) acc.add(r);
  }
  return acc;
}
const hash = (p) => crypto.createHash('sha1').update(fs.readFileSync(p).toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

const v = new Set(); const l = new Set();
for (const r of ROOTS) { walk(vpsRoot, r, v); walk(localRoot, r, l); }
const res = { vpsOnly: [], localOnly: [], differ: [], same: 0 };
for (const f of v) {
  if (!l.has(f)) res.vpsOnly.push(f);
  else if (hash(path.join(vpsRoot, f)) !== hash(path.join(localRoot, f))) res.differ.push(f);
  else res.same++;
}
for (const f of l) if (!v.has(f)) res.localOnly.push(f);
for (const k of ['vpsOnly', 'localOnly', 'differ']) res[k].sort();
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 2));
console.log(`same=${res.same} differ=${res.differ.length} vpsOnly=${res.vpsOnly.length} localOnly=${res.localOnly.length}`);
