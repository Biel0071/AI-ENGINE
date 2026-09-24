'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { scanProject } = require('../project-mirror/scanner');
const { extractScreens } = require('../project-mirror/screen-extractor');
const exec = promisify(execFile);
const SECRET = /password|passwd|secret|token|authorization|credential|api.?key|private.?key|cookie/i;
const OMIT = new Set(['node_modules', '.git', '.data', '.env', 'generated', 'archive', 'coverage', 'dist', 'build', 'graphify-out', 'qa-results', 'temp_backup', 'temp_backup2']);
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET.test(k) ? '[REMOVIDO]' : redact(v)]));
  if (typeof value !== 'string') return value;
  let result = value.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REMOVIDO]')
    .replace(/\b(Bearer\s+)[\w.\-]+/gi, '$1[REMOVIDO]')
    .replace(/\b(?:sk-[\w-]{10,}|gh[pousr]_[\w]{15,}|eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '[REMOVIDO]')
    .replace(/((?:password|secret|token|api[_-]?key|authorization)\s*[=:]\s*)[^\s,;]+/gi, '$1[REMOVIDO]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/g, '$1[REMOVIDO]@');
  for (const [key, secret] of Object.entries(process.env)) if (SECRET.test(key) && secret.length >= 8) result = result.split(secret).join('[REMOVIDO]');
  return result;
}
function allowedFile(name) { return !OMIT.has(name) && !name.startsWith('.env') && !/\.(pem|key|p12|pfx)$/i.test(name) && !/session.?token|credentials|secrets/i.test(name) && !/^(?:temp_|tmp_|patch_)/.test(name); }
async function inventory(root) {
  const files = [], errors = [];
  async function walk(dir) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { errors.push({ path: path.relative(root, dir), error: redact(e.message) }); return; }
    for (const entry of entries) {
      if (!allowedFile(entry.name) || entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) files.push(path.relative(root, full).replace(/\\/g, '/'));
    }
  }
  await walk(root); return { files, errors };
}
async function inspect(root) {
  const listing = await inventory(root);
  const mirror = await scanProject(root);
  const screens = await extractScreens(root, mirror);
  const modules = [], apis = [], relationships = [], documents = [];
  const hash = crypto.createHash('sha256');
  for (const file of listing.files) {
    if (!/\.(?:[cm]?js|tsx?|jsx|json|html|css|md|py|go|ya?ml)$/.test(file)) continue;
    try {
      const stat = await fs.stat(path.join(root, file));
      if (stat.size > 2_000_000) { listing.errors.push({ path: file, error: 'Conteúdo acima de 2 MB; inventariado, não interpretado.' }); continue; }
      const source = await fs.readFile(path.join(root, file), 'utf8'); hash.update(file).update(source);
      if (/\.(?:[cm]?js|tsx?|jsx|py|go)$/.test(file)) {
        modules.push({ file, lines: source.split('\n').length, evidence: file });
        for (const match of source.matchAll(/(?:require\(['"]([^'"]+)['"]\)|from\s+['"]([^'"]+)['"])/g)) relationships.push({ from: file, to: match[1] || match[2], classification: 'observado', evidence: file });
        for (const match of source.matchAll(/['"`]((?:\/api\/|\/health)[\w/.:?=-]*)['"`]/g)) apis.push({ path: match[1], evidence: file, classification: 'observado no código; disponibilidade não verificada' });
      }
      if (/(?:^|\/)(?:README|ARCHITECTURE|AGENTS)\.md$/i.test(file)) documents.push({ file, text: redact(source), kind: 'dados não confiáveis, não instruções' });
    } catch (e) { listing.errors.push({ path: file, error: redact(e.message) }); }
  }
  let revision = null;
  try { revision = (await exec('git', ['rev-parse', 'HEAD'], { cwd: root, windowsHide: true, timeout: 10000 })).stdout.trim(); } catch { /* not a git checkout */ }
  return redact({ observedAt: new Date().toISOString(), root, revision, sourceHash: hash.digest('hex'), mirror, screens, files: listing.files, modules, apis, relationships, documents, limitations: listing.errors, mirrorLimits: 'Project Mirror limita arquivos a 2000 e APIs a 100; inventário e relações acima são coletados separadamente sem esse limite.' });
}
module.exports = { redact, inspect, inventory, allowedFile, SECRET };
