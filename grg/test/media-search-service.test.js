'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MediaSearchService, MediaSearchError } = require('../src/media/media-search-service');

function mediaResponse(pages, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return { query: { pages } }; },
  };
}

test('searches Wikimedia Commons and returns normalized, attribution-safe image metadata', async () => {
  let requestUrl;
  const service = new MediaSearchService({
    cacheTtlMs: 0,
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return mediaResponse([
        {
          pageid: 42,
          title: 'File:City skyline.jpg',
          imageinfo: [{
            url: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/City.jpg',
            thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/City.jpg/640px-City.jpg',
            mime: 'image/jpeg', mediatype: 'BITMAP', size: 1234, width: 1920, height: 1080,
            timestamp: '2026-01-02T03:04:05Z',
            extmetadata: {
              LicenseShortName: { value: '<a href="/wiki/CC">CC BY 4.0</a>' },
              Artist: { value: '<script>alert(1)</script>Jane Doe' },
            },
          }],
        },
        {
          pageid: 43, title: 'File:not-an-image.pdf',
          imageinfo: [{ url: 'https://upload.wikimedia.org/file.pdf', mime: 'application/pdf', mediatype: 'OFFICE' }],
        },
      ]);
    },
  });

  const result = await service.search({ query: '  isometric city  ', type: 'image', limit: 8 });
  assert.equal(requestUrl.hostname, 'commons.wikimedia.org');
  assert.equal(requestUrl.searchParams.get('action'), 'query');
  assert.equal(requestUrl.searchParams.get('generator'), 'search');
  assert.equal(requestUrl.searchParams.get('gsrnamespace'), '6');
  assert.match(requestUrl.searchParams.get('gsrsearch'), /isometric city/);
  assert.equal(requestUrl.searchParams.get('gsrlimit'), '8');
  assert.equal(requestUrl.searchParams.get('iiurlwidth'), '640');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'wikimedia-commons:image:42');
  assert.equal(result.items[0].type, 'image');
  assert.equal(result.items[0].thumbnailUrl, 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/City.jpg/640px-City.jpg');
  assert.equal(result.items[0].metadata.license, 'CC BY 4.0');
  assert.equal(result.items[0].metadata.artist, 'alert(1)Jane Doe');
  assert.equal(result.items[0].metadata.width, 1920);
  assert.equal(result.items[0].pageUrl, 'https://commons.wikimedia.org/wiki/File%3ACity_skyline.jpg');
});

test('video search requests and keeps real video media only', async () => {
  let requestUrl;
  const service = new MediaSearchService({
    cacheTtlMs: 0,
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return mediaResponse([
        { pageid: 7, title: 'File:City.webm', imageinfo: [{ url: 'https://upload.wikimedia.org/city.webm', thumburl: 'https://upload.wikimedia.org/city.jpg', mime: 'video/webm', mediatype: 'VIDEO', duration: 12.5, width: 1280, height: 720 }] },
        { pageid: 8, title: 'File:Photo.jpg', imageinfo: [{ url: 'https://upload.wikimedia.org/photo.jpg', mime: 'image/jpeg', mediatype: 'BITMAP' }] },
      ]);
    },
  });

  const result = await service.search({ query: 'city activity', type: 'video' });
  assert.match(requestUrl.searchParams.get('gsrsearch'), /filetype:video/i);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'wikimedia-commons:video:7');
  assert.equal(result.items[0].metadata.durationSeconds, 12.5);
  assert.equal(result.items[0].metadata.resolution, '1280×720');
});

test('rejects invalid search input and unsupported sources before network access', async () => {
  let calls = 0;
  const service = new MediaSearchService({ fetchImpl: async () => { calls += 1; } });
  await assert.rejects(service.search({ query: 'x', type: 'image' }), { code: 'INVALID_MEDIA_SEARCH' });
  await assert.rejects(service.search({ query: 'city', type: 'audio' }), { code: 'INVALID_MEDIA_SEARCH' });
  await assert.rejects(service.search({ query: 'city', type: 'image', source: 'user-url' }), { code: 'INVALID_MEDIA_SEARCH' });
  await assert.rejects(service.search({ query: 'city', type: 'image', limit: 100 }), { code: 'INVALID_MEDIA_SEARCH' });
  assert.equal(calls, 0);
});

test('provider failures are explicit and successful responses are cached', async () => {
  const unavailable = new MediaSearchService({ fetchImpl: async () => mediaResponse([], 503) });
  await assert.rejects(unavailable.search({ query: 'city', type: 'image' }), (error) => {
    assert.ok(error instanceof MediaSearchError);
    assert.equal(error.code, 'MEDIA_PROVIDER_UNAVAILABLE');
    return true;
  });

  let calls = 0;
  const cached = new MediaSearchService({
    fetchImpl: async () => { calls += 1; return mediaResponse([]); },
  });
  const params = { query: 'city', type: 'image' };
  const first = await cached.search(params);
  const second = await cached.search(params);
  assert.equal(calls, 1);
  assert.deepEqual(second.items, first.items);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
});
