'use strict';
// LEVEL 2 (2026-11-11): mapa de elementos da interface, gerado do próprio código (nada escrito à
// mão). Para cada elemento com id no index.html: rótulo em português (texto, title, aria-label,
// placeholder), tela (view-*) a que pertence e os arquivos JS que o controlam. A busca entende
// português: "painel de jobs da cidade" -> #dockWindowJobs (tela city, fenix-city-adaptive-dock.js).
const fs = require('node:fs');
const path = require('node:path');

const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const STOP = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'que', 'qual', 'quais', 'onde', 'fica', 'como', 'para', 'por', 'com', 'se', 'eu', 'me', 'meu', 'minha', 'esta', 'esse', 'essa', 'isso', 'codigo', 'arquivo', 'tem', 'ha', 'ver', 'vejo', 'abre', 'abrir', 'mostra', 'mostrar', 'the', 'of']);
// Português do dono -> termos usados nos ids e nomes do código.
const SYNONYMS = {
  painel: ['panel', 'dock', 'window', 'card', 'hud'], janela: ['window', 'modal', 'panel'], botao: ['btn', 'button'],
  tela: ['view', 'screen'], cidade: ['city', 'world'], agentes: ['agents', 'agent'], agente: ['agent'],
  tarefas: ['jobs', 'tasks'], tarefa: ['job', 'task'], trabalhos: ['jobs'], eventos: ['events', 'alert'], evento: ['event'],
  missoes: ['missions'], missao: ['mission'], memoria: ['memory'], memorias: ['memory'], mapa: ['map', 'minimap'],
  configuracoes: ['settings', 'config'], aprovacao: ['approval', 'director'], aprovacoes: ['approval', 'director'],
  aprovar: ['approve', 'director'], diretor: ['director'], ordem: ['order', 'director'], projetos: ['projects'], projeto: ['project'],
  rodape: ['footer'], topo: ['top', 'toolbar'], busca: ['search'], pesquisa: ['search'], pesquisar: ['search'], buscar: ['search'],
  qualidade: ['quality'], recentes: ['recent'], conversa: ['chat', 'mascot'], chat: ['chat', 'mascot', 'sidebar'],
  mascote: ['mascot'], fontes: ['sources'], camera: ['camera'], andar: ['floor'], andares: ['floors'], predio: ['building'],
  predios: ['buildings'], login: ['login'], senha: ['password'], fila: ['queue'], terminal: ['terminal'],
};

function words(text) {
  return fold(text).replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}
function idWords(id) {
  return String(id).replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}
const attr = (attrs, name) => (attrs.match(new RegExp(`\\b${name}="([^"]{1,200})"`)) || [])[1] || null;

function buildUiElementMap({ publicDir, maxFilesPerElement = 4 } = {}) {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const views = [];
  const viewRe = /<(?:section|div)\b[^>]*\bid="view-([a-z0-9-]+)"/gi;
  let vm;
  while ((vm = viewRe.exec(html))) views.push({ at: vm.index, name: vm[1] });
  // Rodape e barras globais ficam depois das telas: nao pertencem a ultima tela declarada.
  const footerAt = html.search(/<[^>]*\bid="fenixPresentationFooter"/);
  const viewAt = (pos) => {
    if (footerAt >= 0 && pos >= footerAt) return null;
    let v = null; for (const item of views) { if (item.at <= pos) v = item.name; else break; } return v;
  };

  const elements = [];
  const seen = new Set();
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)\bid="([A-Za-z][\w-]{2,80})"([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const [, tag, before, id, after] = m;
    if (seen.has(id)) continue;
    seen.add(id);
    const attrs = `${before} ${after}`;
    // Rótulo: atributos de acessibilidade, senão o primeiro texto visível logo depois da tag.
    const ahead = html.slice(m.index + m[0].length, m.index + m[0].length + 700);
    const text = (ahead.match(/>?\s*([^<>{}$`]{3,80}?)\s*</) || [])[1];
    const label = (attr(attrs, 'aria-label') || attr(attrs, 'title') || attr(attrs, 'placeholder') || (text && text.trim()) || '').replace(/\s+/g, ' ').trim();
    elements.push({ id, tag: tag.toLowerCase(), label: label.slice(0, 120), view: id.startsWith('view-') ? id.slice(5) : viewAt(m.index), files: [] });
  }

  // Arquivos JS que referenciam cada id (getElementById, querySelector('#id'), etc.).
  const jsFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith('.js'));
  const byId = new Map(elements.map((e) => [e.id, e]));
  for (const file of jsFiles) {
    let src;
    try { src = fs.readFileSync(path.join(publicDir, file), 'utf8'); } catch { continue; }
    const refRe = /(?:getElementById\(\s*['"`]|['"`]#)([A-Za-z][\w-]{2,80})/g;
    let r;
    const found = new Set();
    while ((r = refRe.exec(src))) found.add(r[1]);
    for (const id of found) {
      const el = byId.get(id);
      if (el && el.files.length < maxFilesPerElement && !el.files.includes(`public/${file}`)) el.files.push(`public/${file}`);
    }
  }
  return { generatedAt: new Date().toISOString(), elements };
}

// Pontua cada elemento pelas palavras da pergunta (e sinônimos) no rótulo, id e tela.
function searchUiElements(map, question, { limit = 5 } = {}) {
  const terms = words(question).filter((w) => !STOP.has(w));
  if (!terms.length) return [];
  const results = [];
  for (const el of map.elements) {
    const labelWords = new Set(words(el.label));
    const ids = new Set(idWords(el.id));
    const view = el.view ? fold(el.view) : '';
    let score = 0;
    let strong = 0;
    for (const term of terms) {
      const expansions = [term, ...(SYNONYMS[term] || [])];
      if (labelWords.has(term)) { score += 3; strong += 1; continue; }
      if (expansions.some((x) => ids.has(x))) { score += 2; strong += 1; continue; }
      if (view && expansions.includes(view)) score += 1;
    }
    if (strong === 0) continue;
    if (el.files.length) score += 0.5; // elementos controlados por código são mais úteis
    results.push({ ...el, score });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Cache por processo, invalidado quando o index.html muda.
let cached = null;
function getUiElementMap(publicDir) {
  const indexPath = path.join(publicDir, 'index.html');
  let mtime = 0;
  try { mtime = fs.statSync(indexPath).mtimeMs; } catch { return null; }
  if (!cached || cached.dir !== publicDir || cached.mtime !== mtime) cached = { dir: publicDir, mtime, map: buildUiElementMap({ publicDir }) };
  return cached.map;
}

module.exports = { buildUiElementMap, searchUiElements, getUiElementMap };