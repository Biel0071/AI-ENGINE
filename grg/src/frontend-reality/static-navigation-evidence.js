'use strict';

function routeKey(value) {
  return String(value || '').trim().replace(/^#\/?/, '').replace(/^view[-_]/i, '').replace(/\/$/, '').toLowerCase();
}

function sourceFileOf(screen) {
  return String(screen?.sourceFile || screen?.relPath || screen?.file || '').replace(/\\/g, '/');
}

function findNavTarget(screens, sourceFile, target) {
  const key = routeKey(target);
  return screens.find((screen) => {
    if (!key || sourceFileOf(screen) !== sourceFile || screen.screenId == null) return false;
    const id = String(screen.screenId).replace(/^screen[-_]/i, '').replace(/^view[-_]/i, '').toLowerCase();
    return id === key || routeKey(screen.route) === key;
  }) || null;
}

function navSelector(content, offset, navTarget) {
  const before = content.slice(0, offset);
  const open = [...before.matchAll(/<nav\b[^>]*\bid=["']([\w-]+)["'][^>]*>/gi)].at(-1);
  const closedAt = before.toLowerCase().lastIndexOf('</nav>');
  const prefix = open && open.index > closedAt ? `#${open[1]} ` : '';
  return `${prefix}[data-nav="${navTarget}"]`;
}

/**
 * Build only source-backed transitions from controls whose handler explicitly
 * calls a known screen-navigation function. Static evidence remains unverified.
 */
function deriveStaticNavigationEdges(content, sourceFile, screens = []) {
  const normalizedFile = String(sourceFile || '').replace(/\\/g, '/');
  const controls = [];
  const buttonPattern = /<button\b([^>]*)>([\s\S]*?)<\/button\s*>/gi;
  for (const match of content.matchAll(buttonPattern)) {
    const attrs = match[1];
    const dataNav = attrs.match(/\bdata-nav\s*=\s*["']([\w-]{1,80})["']/i)?.[1];
    const handler = attrs.match(/\bonclick\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const body = match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const accessibleLabel = attrs.match(/\b(?:aria-label|title)\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const call = String(handler?.[1] || handler?.[2] || '').match(/(?:window\.)?(?:showView|fenixSwitchNav)\s*\(\s*["']([\w-]{1,80})["']/i);
    if (!dataNav || !call || call[1] !== dataNav) continue;
    const target = findNavTarget(screens, normalizedFile, dataNav);
    if (!target) continue;
    const sourceLine = content.slice(0, match.index).split(/\r?\n/).length;
    controls.push({
      targetScreenId: String(target.screenId),
      action: (body || accessibleLabel?.[1] || accessibleLabel?.[2] || '').replace(/&amp;/gi, '&').slice(0, 120) || null,
      evidenceSource: 'STATIC_SOURCE',
      verificationStatus: 'NOT_VERIFIED',
      sourceFile: normalizedFile,
      sourceLine,
      selector: navSelector(content, match.index, dataNav),
    });
  }

  const edgesByScreen = new Map();
  for (const source of screens) {
    if (sourceFileOf(source) !== normalizedFile || source.screenId == null) continue;
    const edges = controls.filter((edge) => edge.targetScreenId !== String(source.screenId));
    if (edges.length) edgesByScreen.set(String(source.screenId), edges.map((edge) => ({ ...edge })));
  }
  return edgesByScreen;
}

module.exports = { deriveStaticNavigationEdges };
