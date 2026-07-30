#!/usr/bin/env node
// import-closure: prova que todo require() relativo alcancavel a partir de src/server.js
// resolve para um arquivo que existe. Rodar ANTES de build/recriar container.
//
// Por que existe: o build desta imagem e `npm ci` + `COPY src` -- nao ha compilador, linter
// nem checagem de tipo. Um require apontando para arquivo inexistente passa o build inteiro
// e so explode no boot do container, como restart loop. Este script e a unica barreira.
//
// Exit 0 = grafo fechado. Exit 1 = ha require sem destino (nomeado).

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const entries = process.argv.slice(2).length ? process.argv.slice(2) : ['src/server.js'];

const seen = new Set();
const missing = [];

function resolveLocal(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Remove template literals, inclusive ANINHADOS. Regex nao serve: em software-factory.js:191
// um `${modules.map((m) => `  require('./modules/${m}')`)}` tem template dentro de template,
// e qualquer regex fecha no primeiro backtick interno. Aqui a profundidade e contada.
function stripTemplates(source) {
  // Pilha: 'tpl' = dentro de template literal, 'expr' = dentro de ${...} (onde codigo real
  // volta a valer e outro template pode abrir). Sem a pilha, contar backticks fecha o
  // template externo no primeiro backtick interno.
  const stack = [];
  const inTemplate = () => stack.length > 0 && stack[stack.length - 1] === 'tpl';
  let out = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '\\') { if (!inTemplate()) out += source.slice(i, i + 2); i += 1; continue; }
    if (ch === '`') {
      if (inTemplate()) stack.pop();
      else stack.push('tpl');
      out += '`';
      continue;
    }
    if (inTemplate() && ch === '$' && next === '{') { stack.push('expr'); out += '${'; i += 1; continue; }
    if (!inTemplate() && ch === '}' && stack[stack.length - 1] === 'expr') { stack.pop(); out += '}'; continue; }
    if (!inTemplate()) out += ch;
    else if (ch === '\n') out += '\n'; // preserva linhas para o relatorio nao mentir
  }
  return out;
}

function walk(file, from) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (seen.has(rel)) return;
  seen.add(rel);
  if (rel.endsWith('.json')) return;
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    missing.push({ from, spec: rel, reason: 'ilegivel' });
    return;
  }
  // Template literals sao removidos antes da varredura: a Software Factory EMITE codigo como
  // texto (`require('./modules/${m}')` dentro de uma string, medido em software-factory.js:191
  // e :223). Aquilo nao e require do FENIX, e o arquivo que ele gera para o cliente -- contar
  // como pendencia daria alarme falso e faria a barreira ser ignorada por ruido.
  const code = stripTemplates(source);
  const rx = /require\((['"])(\.[^'"]+)\1\)/g;
  let match = rx.exec(code);
  while (match) {
    const spec = match[2];
    const target = resolveLocal(file, spec);
    if (!target) missing.push({ from: rel, spec, reason: 'nao resolve' });
    else walk(target, rel);
    match = rx.exec(code);
  }
}

for (const entry of entries) walk(path.join(root, entry), '(entry)');

console.log(`entradas: ${entries.join(', ')}`);
console.log(`modulos alcancaveis: ${seen.size}`);
console.log(`requires locais nao resolvidos: ${missing.length}`);
for (const item of missing) console.log(`  FALTA ${item.spec} (${item.reason}) referenciado em ${item.from}`);

process.exit(missing.length ? 1 : 0);
