'use strict';

const crypto = require('node:crypto');
const { isIP } = require('node:net');

function isPublicHttpsUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || url.username || url.password || !host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
    if (isIP(host)) return false;
    if (/^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host)) return false;
    if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:')) return false;
    return true;
  } catch { return false; }
}

function boundedMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try { return Buffer.byteLength(JSON.stringify(value)) <= 8_192; } catch { return false; }
}

class WorldAssetRegistry {
  constructor({ store, bus, events, now = () => new Date().toISOString(), idFactory } = {}) {
    if (!store || typeof store.update !== 'function' || typeof store.read !== 'function') throw new TypeError('persistent store is required');
    this.store = store;
    this.bus = bus;
    this.events = events;
    this.now = now;
    this.idFactory = idFactory || ((tenantId, sourceId) => `wasset_${crypto.createHash('sha256').update(`${tenantId}:${sourceId}`).digest('hex').slice(0, 24)}`);
  }

  async register(tenantId, actorId, input) {
    if (typeof tenantId !== 'string' || !tenantId.trim() || typeof actorId !== 'string' || !actorId.trim() || !input || typeof input !== 'object' || Array.isArray(input)) throw invalidAsset();
    const sourceId = typeof input.sourceId === 'string' ? input.sourceId.trim() : '';
    const type = typeof input.type === 'string' ? input.type.toLowerCase() : '';
    const source = typeof input.source === 'string' ? input.source.trim() : '';
    const url = input.url;
    const thumbnail = input.thumbnail == null ? null : input.thumbnail;
    if (!sourceId || sourceId.length > 300 || !source || source.length > 120 || !['image', 'video'].includes(type) || !isPublicHttpsUrl(url) || (thumbnail !== null && !isPublicHttpsUrl(thumbnail)) || !boundedMetadata(input.metadata)) throw invalidAsset();

    const timestamp = this.now();
    const candidate = {
      id: this.idFactory(tenantId, sourceId), tenantId, sourceId, type, source,
      title: typeof input.title === 'string' ? input.title.slice(0, 300) : sourceId,
      url, thumbnail, metadata: JSON.parse(JSON.stringify(input.metadata)),
      createdBy: actorId, createdAt: timestamp, updatedAt: timestamp,
    };
    let result;
    await this.store.update((state) => {
      if (!Array.isArray(state.worldAssets)) state.worldAssets = [];
      const existing = state.worldAssets.find((item) => item.tenantId === tenantId && item.sourceId === sourceId);
      if (existing) {
        result = { created: false, asset: existing };
        return state;
      }
      state.worldAssets.push(candidate);
      result = { created: true, asset: candidate };
      return state;
    });
    if (result.created) {
      const event = {
        tenantId,
        stream: `world-assets:${tenantId}`,
        type: 'world.asset.registered',
        source: 'media-library',
        subject: candidate.id,
        data: { assetId: candidate.id, sourceId, type, source, title: candidate.title, url, thumbnail },
        occurredAt: timestamp,
        actorId,
      };
      if (this.events?.publish) result.eventId = (await this.events.publish(event)).id;
      else if (this.bus?.emit) await this.bus.emit('world.asset.registered', event.data);
    }
    return result;
  }

  async list(tenantId, { limit = 100 } = {}) {
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > 200) throw invalidAsset('limit must be an integer from 1 to 200');
    const state = await this.store.read();
    return (state.worldAssets || []).filter((item) => item.tenantId === tenantId).slice(-count).reverse();
  }
}

function invalidAsset(message = 'Asset must contain a supported media type, public HTTPS URL, source and object metadata.') {
  const error = new Error(message);
  error.code = 'INVALID_WORLD_ASSET';
  error.status = 400;
  return error;
}

module.exports = { WorldAssetRegistry, isPublicHttpsUrl };
