'use strict';
// LEVEL 1 SECURITY: execucao de comandos do host sem shell e por allowlist.
//
// Antes, as rotas de terminal passavam o texto do cliente direto para
// child_process.execSync (interpretado por /bin/sh ou cmd.exe). Agora o texto
// vira { file, args } e so passa se o binario e os argumentos estiverem na lista.
// Qualquer metacaractere de shell e recusado antes do parse.
const path = require('node:path');
const { ForbiddenError } = require('../kernel/errors');

const SHELL_META = /[;&|`$<>(){}[\]*?!~\\\n\r"'%^]/;
const MAX_LENGTH = 512;

const NODE_FLAGS = new Set(['--version', '-v', '--test', '--check', '-c']);
const NPM_FORMS = [
  (a) => a.length === 1 && ['test', 'ls', '--version', '-v'].includes(a[0]),
  (a) => a.length === 2 && a[0] === 'run' && /^[A-Za-z0-9:._-]{1,64}$/.test(a[1]),
];
const GIT_READ_ONLY = new Set(['status', 'diff', 'log', 'show', 'rev-parse', 'ls-files', 'branch']);
const GIT_FORBIDDEN_ARG = /^(-c|--config|--exec|--upload-pack|--receive-pack|-o|--output|--ext-diff|--textconv|--git-dir|--work-tree|-C|-d|-D|-m|-M|--delete|--move|--set-upstream-to|--edit-description)/;

function isSafeRelativePath(arg) {
  if (!arg || arg.startsWith('-')) return false;
  if (path.isAbsolute(arg) || /^[A-Za-z]:/.test(arg)) return false;
  return !arg.split(/[\\/]/).includes('..');
}

function refuse(reason, command) {
  const err = new ForbiddenError(`Comando recusado pela allowlist do terminal: ${reason}`);
  err.reason = 'COMMAND_NOT_ALLOWED';
  err.command = String(command || '').slice(0, 120);
  return err;
}

function parseSafeCommand(command, { platform = process.platform, nodePath = process.execPath } = {}) {
  if (typeof command !== 'string' || !command.trim()) throw refuse('comando vazio', command);
  if (command.length > MAX_LENGTH || command.includes('\0')) throw refuse('comando longo demais', command);
  if (SHELL_META.test(command)) throw refuse('metacaractere de shell', command);
  const [bin, ...args] = command.trim().split(/\s+/);

  if (bin === 'node') {
    const ok = args.length > 0 && args.every((a) => NODE_FLAGS.has(a) || (isSafeRelativePath(a) && /\.(c|m)?js$/.test(a)));
    if (!ok) throw refuse('argumentos de node fora da allowlist', command);
    return { file: nodePath, args, shell: false };
  }
  if (bin === 'npm') {
    if (!NPM_FORMS.some((form) => form(args))) throw refuse('subcomando npm fora da allowlist', command);
    // No Windows o npm e um .cmd e exige shell; os argumentos ja foram validados sem metacaracteres.
    return platform === 'win32' ? { file: 'npm.cmd', args, shell: true } : { file: 'npm', args, shell: false };
  }
  if (bin === 'git') {
    const [sub, ...rest] = args;
    if (!GIT_READ_ONLY.has(sub)) throw refuse('subcomando git fora da allowlist (somente leitura)', command);
    if (rest.some((a) => GIT_FORBIDDEN_ARG.test(a))) throw refuse('opcao git proibida', command);
    if (sub === 'branch' && rest.some((a) => !['-a', '--all', '--list', '-v', '-r'].includes(a))) throw refuse('git branch so lista', command);
    return { file: 'git', args: ['--no-pager', sub, ...rest], shell: false };
  }
  throw refuse(`binario "${bin}" fora da allowlist`, command);
}

module.exports = { parseSafeCommand, isSafeRelativePath };