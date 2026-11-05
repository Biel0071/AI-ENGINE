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
          streams: [
            { codec_type: 'video', codec_name: 'h264', width: 720, height: 1280, avg_frame_rate: '30/1' },
            { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '44100' }
          ]
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
  assert.deepEqual(report.media.audio, { codec: 'aac', channels: 2, sampleRate: 44100 });
  assert.deepEqual(report.keyframes.map((frame) => frame.requestedAtSeconds), [0, 10, 20]);
  assert.ok(report.keyframes.every((frame) => fs.existsSync(path.join(artifactsDir, report.artifactId, frame.file))));
  assert.equal(JSON.parse(fs.readFileSync(path.join(artifactsDir, report.artifactId, 'manifest.json'), 'utf8')).analysisStatus, 'NOT_VERIFIED');
  assert.equal(JSON.stringify(report).includes(source), false);
  assert.deepEqual(engine.readFrame(report.artifactId, report.keyframes[0].file), Buffer.from([0xff, 0xd8, 0xff, 1]));
  assert.equal(engine.readArtifact(report.artifactId).artifactId, report.artifactId);
});

test('video decoder produces timestamped captions when a Whisper.cpp model is configured', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-whisper-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'reference.mp4');
  const model = path.join(root, 'whisper.bin');
  fs.writeFileSync(source, 'test video bytes');
  fs.writeFileSync(model, 'model placeholder');
  const artifactsDir = path.join(root, 'artifacts');
  const engine = new VideoSystemDecoder({
    allowedRoots: [root], artifactsDir, whisperModelPath: model, getAvailableMemoryBytes: () => 2 * 1024 * 1024 * 1024,
    runCommand: async (binary, args) => {
      if (binary === 'ffprobe') return { stdout: JSON.stringify({
        format: { duration: '21.4', format_name: 'mov,mp4' },
        streams: [
          { codec_type: 'video', codec_name: 'h264', width: 720, height: 1280, avg_frame_rate: '30/1' },
          { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '44100' }
        ]
      }) };
      if (args.includes('-vn')) { fs.writeFileSync(args.at(-1), 'wav'); return { stdout: '' }; }
      if (args.includes('-osrt')) {
        const prefix = args[args.indexOf('-of') + 1];
        fs.writeFileSync(`${prefix}.srt`, '1\n00:00:01,000 --> 00:00:02,400\nEstado real confirmado.\n');
        fs.writeFileSync(`${prefix}.vtt`, 'WEBVTT\n\n00:00:01.000 --> 00:00:02.400\nEstado real confirmado.\n');
        return { stdout: '' };
      }
      const frameDir = path.dirname(args.at(-1));
      fs.writeFileSync(path.join(frameDir, 'frame-001.jpg'), Buffer.from([0xff, 0xd8, 0xff, 1]));
      return { stdout: '' };
    }
  });

  const report = await engine.decodeVideo(source, { maxFrames: 1 });
  assert.equal(report.transcription.status, 'TRANSCRIBED');
  assert.equal(report.transcription.engine, 'whisper.cpp');
  assert.equal(report.transcription.segments[0].startSeconds, 1);
  assert.equal(report.transcription.segments[0].endSeconds, 2.4);
  assert.match(report.transcription.text, /Estado real confirmado/);
  assert.equal(report.transcription.captions.vtt, `${report.artifactUrl}/captions/transcript.vtt`);
  assert.equal(fs.existsSync(path.join(artifactsDir, report.artifactId, 'transcript.srt')), true);
  assert.equal(fs.existsSync(path.join(artifactsDir, report.artifactId, 'transcript.vtt')), true);
  assert.match(engine.readCaption(report.artifactId, 'transcript.srt').toString('utf8'), /00:00:01,000/);
  assert.throws(() => engine.readCaption(report.artifactId, '..\\manifest.json'), { code: 'VIDEO_CAPTION_NOT_FOUND' });
});

test('video decoder marks speech transcription pending when no Whisper model is configured', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-video-whisper-pending-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'reference.mp4');
  fs.writeFileSync(source, 'test video bytes');
  const engine = new VideoSystemDecoder({
    allowedRoots: [root], artifactsDir: path.join(root, 'artifacts'),
    runCommand: async (binary, args) => {
      if (binary === 'ffprobe') return { stdout: JSON.stringify({ format: { duration: '2' }, streams: [
        { codec_type: 'video', codec_name: 'h264', width: 10, height: 10 },
        { codec_type: 'audio', codec_name: 'aac', channels: 2, sample_rate: '44100' }
      ] }) };
      fs.writeFileSync(path.join(path.dirname(args.at(-1)), 'frame-001.jpg'), Buffer.from([0xff, 0xd8, 0xff, 1]));
      return { stdout: '' };
    }
  });
  const report = await engine.decodeVideo(source, { maxFrames: 1 });
  assert.equal(report.transcription.status, 'PENDING');
  assert.equal(report.transcription.reason, 'WHISPER_MODEL_NOT_CONFIGURED');
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
  const originalReadCaption = globalVideoSystemDecoder.readCaption;
  globalVideoSystemDecoder.readArtifact = (id) => ({ artifactId: id, status: 'FRAMES_EXTRACTED' });
  globalVideoSystemDecoder.readFrame = (id, name) => Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  globalVideoSystemDecoder.readCaption = (id, name) => Buffer.from('WEBVTT\n', 'utf8');
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

    let captionHeaders;
    let captionBody;
    await handleUniversalSystemRoutes(
      { method: 'GET' }, { writeHead(status, value) { captionHeaders = { status, ...value }; }, end(value) { captionBody = value; } },
      new URL('http://localhost/api/v2/system-reconstruction/video/video-0123456789ab-1791943182865/captions/transcript.vtt'),
      () => { throw new Error('Expected the caption response path.'); },
      async () => ({}), { tenantId: 'test', actorId: 'test' }, {}
    );
    assert.equal(captionHeaders.status, 200);
    assert.equal(captionHeaders['content-type'], 'text/vtt; charset=utf-8');
    assert.equal(captionHeaders['x-content-type-options'], 'nosniff');
    assert.equal(captionBody.toString('utf8'), 'WEBVTT\n');
  } finally {
    globalVideoSystemDecoder.readArtifact = originalReadArtifact;
    globalVideoSystemDecoder.readFrame = originalReadFrame;
    globalVideoSystemDecoder.readCaption = originalReadCaption;
  }
});
