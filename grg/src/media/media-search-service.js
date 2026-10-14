'use strict';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const ALLOWED_MEDIA_HOSTS = new Set(['upload.wikimedia.org']);

class MediaSearchError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'MediaSearchError';
    this.code = code;
    this.status = status;
  }
}

function safeMediaUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !ALLOWED_MEDIA_HOSTS.has(url.hostname) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function plainMetadataValue(value, maxLength = 240) {
  if (!value || typeof value.value !== 'string') return null;
  return value.value.replace(/<[^>]*>/g, '').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim().slice(0, maxLength) || null;
}

function normalizePage(page, type) {
  const info = page?.imageinfo?.[0];
  if (!info || (type === 'video' ? info.mediatype !== 'VIDEO' : !String(info.mime || '').startsWith('image/'))) return null;
  const url = safeMediaUrl(info.url);
  if (!url) return null;
  const thumbnailUrl = safeMediaUrl(info.thumburl) || (type === 'image' ? url : null);
  const title = String(page.title || '').slice(0, 300);
  const metadata = {
    mime: String(info.mime || '').slice(0, 100),
    width: Number.isFinite(Number(info.width)) ? Number(info.width) : null,
    height: Number.isFinite(Number(info.height)) ? Number(info.height) : null,
    bytes: Number.isSafeInteger(Number(info.size)) ? Number(info.size) : null,
    timestamp: typeof info.timestamp === 'string' ? info.timestamp : null,
    license: plainMetadataValue(info.extmetadata?.LicenseShortName),
    artist: plainMetadataValue(info.extmetadata?.Artist),
  };
  if (Number.isFinite(Number(info.duration))) metadata.durationSeconds = Number(info.duration);
  if (metadata.width && metadata.height) metadata.resolution = `${metadata.width}×${metadata.height}`;
  const pageTitle = title.replace(/^File:/i, '').replace(/ /g, '_');
  return {
    id: `wikimedia-commons:${type}:${String(page.pageid)}`,
    type,
    source: 'Wikimedia Commons',
    title: title.replace(/^File:/i, ''),
    url,
    thumbnailUrl,
    pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${pageTitle}`)}`,
    metadata,
  };
}

class MediaSearchService {
  constructor({ fetchImpl = globalThis.fetch, cacheTtlMs = 300_000, timeoutMs = 8_000, maxCacheEntries = 200, now = Date.now } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
    this.fetchImpl = fetchImpl;
    this.cacheTtlMs = Math.max(0, Number(cacheTtlMs) || 0);
    this.timeoutMs = Math.min(15_000, Math.max(1_000, Number(timeoutMs) || 8_000));
    this.maxCacheEntries = Math.min(1_000, Math.max(1, Number(maxCacheEntries) || 200));
    this.now = now;
    this.cache = new Map();
  }

  async search({ query, type = 'image', limit = 8, source = 'wikimedia-commons' } = {}) {
    const normalizedQuery = typeof query === 'string' ? query.trim().replace(/\s+/g, ' ') : '';
    const normalizedType = String(type).toLowerCase();
    const normalizedSource = String(source).toLowerCase();
    if (normalizedQuery.length < 2 || normalizedQuery.length > 120 || !['image', 'video'].includes(normalizedType) || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 20 || !['wikimedia-commons', 'commons'].includes(normalizedSource)) {
      throw new MediaSearchError('INVALID_MEDIA_SEARCH', 'Informe uma busca de 2 a 120 caracteres, tipo image/video, limite de 1 a 20 e fonte Wikimedia Commons.', 400);
    }

    const count = Number(limit);
    const cacheKey = `${normalizedType}:${count}:${normalizedQuery.toLocaleLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.now()) return { ...cached.result, cached: true };
    if (cached) this.cache.delete(cacheKey);

    const url = new URL(COMMONS_API);
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');
    url.searchParams.set('generator', 'search');
    url.searchParams.set('gsrnamespace', '6');
    url.searchParams.set('gsrsearch', normalizedType === 'video' ? `${normalizedQuery} filetype:video` : normalizedQuery);
    url.searchParams.set('gsrlimit', String(count));
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|size|mime|mediatype|timestamp|duration|extmetadata');
    url.searchParams.set('iiurlwidth', '640');
    let response;
    try {
      response = await this.fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'FenixOS/1.0 (media search)' }, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (error) {
      throw new MediaSearchError('MEDIA_PROVIDER_UNAVAILABLE', `Wikimedia Commons não respondeu: ${error.name === 'TimeoutError' ? 'tempo limite excedido' : 'falha de conexão'}.`);
    }
    if (!response?.ok) throw new MediaSearchError('MEDIA_PROVIDER_UNAVAILABLE', `Wikimedia Commons respondeu HTTP ${response?.status || 'inválido'}.`);

    let payload;
    try { payload = await response.json(); } catch { throw new MediaSearchError('MEDIA_PROVIDER_INVALID_RESPONSE', 'Wikimedia Commons retornou uma resposta inválida.'); }
    if (payload?.error) throw new MediaSearchError('MEDIA_PROVIDER_INVALID_RESPONSE', 'Wikimedia Commons não aceitou a busca.');
    const pages = Array.isArray(payload?.query?.pages) ? payload.query.pages : Object.values(payload?.query?.pages || {});
    const items = pages.map((page) => normalizePage(page, normalizedType)).filter(Boolean).slice(0, count);
    const result = { source: 'Wikimedia Commons', query: normalizedQuery, type: normalizedType, items, fetchedAt: new Date(this.now()).toISOString(), cached: false };
    if (this.cacheTtlMs > 0) {
      this.cache.set(cacheKey, { result, expiresAt: this.now() + this.cacheTtlMs });
      while (this.cache.size > this.maxCacheEntries) this.cache.delete(this.cache.keys().next().value);
    }
    return result;
  }
}

module.exports = { MediaSearchService, MediaSearchError, safeMediaUrl };
