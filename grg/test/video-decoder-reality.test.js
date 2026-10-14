'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VideoSystemDecoder, globalVideoSystemDecoder } = require('../src/reconstruction/video-decoder');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

const decoder = new VideoSystemDecoder();

test('video decoder rejects missing input instead of synthesizing a walkthrough', async () => {
  await assert.rejects(decoder.decodeVideo(), { code: 'VIDEO_SOURCE_REQUIRED', status: 400 });
});

test('video decoder rejects missing files and unsupported extensions before extraction', async () => {
  await assert.rejects(decoder.decodeVideo('missing-fenix-reference.mp4'), { code: 'VIDEO_NOT_FOUND', status: 404 });
  await assert.rejects(decoder.decodeVideo(__filename), (error) => {
    assert.equal(error.code, 'VIDEO_FORMAT_UNSUPPORTED');
    assert.equal(error.status, 415);
    return true;
  });
});

test('video decoder rejects paths outside the configured reference library', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-allowed-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-outside-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  const source = path.join(outside, 'reference.mp4');
  fs.writeFileSync(source, 'video');
  const engine = new VideoSystemDecoder({ allowedRoots: [root] });

  await assert.rejects(engine.decodeVideo(source), { code: 'VIDEO_PATH_NOT_ALLOWED', status: 403 });
});

test('video decoder extracts bounded frames and persists evidence metadata', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-decode-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'reference.mp4');
  fs.writeFileSync(source, 'test video bytes');
  const artifactsDir = path.join(root, 'artifacts');
  const commands = [];
  const engine = new VideoSystemDecoder({
    allowedRoots: [root],
    artifactsDir,
    runCommand: async (binary, args) => {
      commands.push({ binary, args });
      if (binary === 'ffprobe') {
        return { stdout: JSON.stringify({
          format: { duration: '21.4', format_name: 'mov,mp4' },
          streams: [{ codec_type: 'video', codec_name: 'h264', width: 720, height: 1280, avg_frame_rate: '30/1' }]
        }) };
      }
      const pattern = args.at(-1);
      const frameDir = path.dirname(pattern);
      for (let i = 1; i <= 3; i += 1) {
        fs.writeFileSync(path.join(frameDir, `frame-${String(i).padStart(3, '0')}.jpg`), Buffer.from([0xff, 0xd8, 0xff, i]));
      }
      return { stdout: '' };
    }
  });

  const report = await engine.decodeVideo(source, { sampleIntervalSeconds: 10, maxFrames: 3 });

  assert.equal(commands.length, 2);
  assert.equal(report.status, 'FRAMES_EXTRACTED');
  assert.equal(report.analysisStatus, 'NOT_VERIFIED');
  assert.equal(report.media.durationSeconds, 21.4);
  assert.equal(report.media.width, 720);
  assert.deepEqual(report.keyframes.map((frame) => frame.requestedAtSeconds), [0, 10, 20]);
  assert.ok(report.keyframes.every((frame) => fs.existsSync(path.join(artifactsDir, report.artifactId, frame.file))));
  assert.equal(JSON.parse(fs.readFileSync(path.join(artifactsDir, report.artifactId, 'manifest.json'), 'utf8')).analysisStatus, 'NOT_VERIFIED');
  assert.equal(JSON.stringify(report).includes(source), false);
  assert.deepEqual(engine.readFrame(report.artifactId, report.keyframes[0].file), Buffer.from([0xff, 0xd8, 0xff, 1]));
  assert.equal(engine.readArtifact(report.artifactId).artifactId, report.artifactId);
});

test('video decoder reports unavailable tooling without claiming extraction', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-no-ffmpeg-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'reference.mp4');
  fs.writeFileSync(source, 'test video bytes');
  const engine = new VideoSystemDecoder({ allowedRoots: [root], runCommand: async () => { const error = new Error('ffprobe not found'); error.code = 'ENOENT'; throw error; } });

  await assert.rejects(engine.decodeVideo(source), (error) => {
    assert.equal(error.code, 'VIDEO_TOOL_UNAVAILABLE');
    assert.equal(error.status, 503);
    return true;
  });
});

test('video evidence API serves the persisted report and extracted JPEG with safe content headers', async () => {
  const originalReadArtifact = globalVideoSystemDecoder.readArtifact;
  const originalReadFrame = globalVideoSystemDecoder.readFrame;
  globalVideoSystemDecoder.readArtifact = (id) => ({ artifactId: id, status: 'FRAMES_EXTRACTED' });
  globalVideoSystemDecoder.readFrame = (id, name) => Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  try {
    let jsonResponse;
    const handled = await handleUniversalSystemRoutes(
      { method: 'GET' },
      {},
      new URL('http://localhost/api/v2/system-reconstruction/video/video-0123456789ab-1791943182865'),
      (_res, statusCode, payload) => { jsonResponse = { statusCode, payload }; return true; },
      async () => ({}),
      { tenantId: 'test', actorId: 'test' },
      {}
    );
    assert.equal(handled, true);
    assert.equal(jsonResponse.statusCode, 200);
    assert.equal(jsonResponse.payload.report.status, 'FRAMES_EXTRACTED');

    let headers;
    let frameBody;
    const response = {
      writeHead(statusCode, value) { headers = { statusCode, ...value }; },
      end(value) { frameBody = value; }
    };
    await handleUniversalSystemRoutes(
      { method: 'GET' }, response,
      new URL('http://localhost/api/v2/system-reconstruction/video/video-0123456789ab-1791943182865/frames/frame-001.jpg'),
      () => { throw new Error('Expected the image response path.'); },
      async () => ({}),
      { tenantId: 'test', actorId: 'test' },
      {}
    );
    assert.equal(headers.statusCode, 200);
    assert.equal(headers['content-type'], 'image/jpeg');
    assert.equal(headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(frameBody, Buffer.from([0xff, 0xd8, 0xff, 0x00]));
  } finally {
    globalVideoSystemDecoder.readArtifact = originalReadArtifact;
    globalVideoSystemDecoder.readFrame = originalReadFrame;
  }
});
