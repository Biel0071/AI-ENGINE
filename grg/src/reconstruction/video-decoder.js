'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const SUPPORTED_FORMATS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.avi']);
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 6 * 60 * 60;
const MAX_FRAME_COUNT = 24;
const MAX_TRANSCRIPT_BYTES = 1024 * 1024;

class VideoSystemDecoder {
  constructor(options = {}) {
    this.ffprobePath = options.ffprobePath || 'ffprobe';
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg';
    this.whisperCliPath = options.whisperCliPath || process.env.FENIX_WHISPER_CLI || 'whisper-cli';
    this.whisperModelPath = options.whisperModelPath || process.env.FENIX_WHISPER_MODEL || '';
    this.minimumWhisperFreeMemoryMb = boundedInteger(options.minimumWhisperFreeMemoryMb ?? process.env.FENIX_WHISPER_MIN_FREE_MEMORY_MB, 1536, 512, 65536);
    this.getAvailableMemoryBytes = options.getAvailableMemoryBytes || (() => os.freemem());
    this.transcriptionQueue = Promise.resolve();
    this.runCommand = options.runCommand || runCommand;
    this.artifactsDir = path.resolve(options.artifactsDir || path.join(__dirname, '..', '.data', 'reconstruction', 'videos'));
    const defaultLibrary = path.join(__dirname, '..', '.data', 'references', 'videos');
    this.allowedRoots = (options.allowedRoots || [defaultLibrary]).map((root) => path.resolve(root));
    if (!options.allowedRoots) fs.mkdirSync(defaultLibrary, { recursive: true });
  }

  async decodeVideo(videoInput, options = {}) {
    const inputPath = typeof videoInput === 'string' ? videoInput.trim() : videoInput?.path;
    if (typeof inputPath !== 'string' || !inputPath.trim()) throw decoderError('VIDEO_SOURCE_REQUIRED', 'Informe o caminho de um vídeo enviado para a biblioteca de referências.', 400);

    const extension = path.extname(inputPath).toLowerCase();
    if (!SUPPORTED_FORMATS.has(extension)) {
      throw decoderError('VIDEO_FORMAT_UNSUPPORTED', 'Formato de vídeo não suportado.', 415);
    }

    let sourcePath;
    let stat;
    try {
      sourcePath = fs.realpathSync(inputPath);
      stat = fs.statSync(sourcePath);
    } catch {
      throw decoderError('VIDEO_NOT_FOUND', 'O arquivo de vídeo informado não existe na biblioteca acessível ao Fênix.', 404);
    }
    if (!stat.isFile()) throw decoderError('VIDEO_NOT_FOUND', 'O caminho informado não aponta para um arquivo.', 404);
    if (stat.size <= 0 || stat.size > MAX_VIDEO_BYTES) {
      throw decoderError('VIDEO_SIZE_UNSUPPORTED', 'O vídeo precisa ter conteúdo e no máximo 250 MB.', 413);
    }
    if (!this._isAllowedPath(sourcePath)) {
      throw decoderError('VIDEO_PATH_NOT_ALLOWED', 'O vídeo precisa estar dentro da biblioteca de referências autorizada.', 403);
    }

    const sampleIntervalSeconds = boundedInteger(options.sampleIntervalSeconds, 10, 1, 600);
    const maxFrames = boundedInteger(options.maxFrames, 12, 1, MAX_FRAME_COUNT);
    const probe = await this._probe(sourcePath);
    if (probe.durationSeconds > MAX_VIDEO_SECONDS) {
      throw decoderError('VIDEO_DURATION_UNSUPPORTED', 'Vídeos acima de seis horas não podem ser processados.', 413);
    }

    const sourceSha256 = await sha256File(sourcePath);
    const artifactId = `video-${sourceSha256.slice(0, 12)}-${Date.now()}`;
    const artifactPath = path.join(this.artifactsDir, artifactId);
    const artifactUrl = `/api/v2/system-reconstruction/video/${artifactId}`;
    fs.mkdirSync(artifactPath, { recursive: true });
    const outputPattern = path.join(artifactPath, 'frame-%03d.jpg');

    try {
      await this.runCommand(this.ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-i', sourcePath,
        '-map', '0:v:0', '-vf', `fps=1/${sampleIntervalSeconds},scale=640:960:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        '-frames:v', String(maxFrames), '-q:v', '3', '-y', outputPattern
      ], { timeout: 120000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    } catch (error) {
      fs.rmSync(artifactPath, { recursive: true, force: true });
      if (error?.code === 'ENOENT') {
        throw decoderError('VIDEO_TOOL_UNAVAILABLE', 'FFmpeg/FFprobe não estão instalados ou não estão acessíveis neste servidor.', 503);
      }
      throw decoderError('VIDEO_EXTRACTION_FAILED', 'FFmpeg não conseguiu extrair quadros válidos do vídeo.', 422);
    }

    const frameNames = fs.readdirSync(artifactPath)
      .filter((name) => /^frame-\d{3}\.jpg$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!frameNames.length) {
      fs.rmSync(artifactPath, { recursive: true, force: true });
      throw decoderError('VIDEO_FRAMES_NOT_EXTRACTED', 'O vídeo foi lido, mas nenhum quadro pôde ser extraído.', 422);
    }

    const keyframes = frameNames.slice(0, maxFrames).map((file, index) => ({
      index,
      requestedAtSeconds: index * sampleIntervalSeconds,
      timestampEvidence: 'UNIFORM_SAMPLE_POSITION',
      file,
      url: `${artifactUrl}/frames/${file}`,
      status: 'EXTRACTED'
    }));
    const transcription = await this._enqueueTranscription(sourcePath, artifactPath, probe.audio);
    const report = {
      artifactId,
      artifactUrl,
      status: 'FRAMES_EXTRACTED',
      analysisStatus: 'NOT_VERIFIED',
      createdAt: new Date().toISOString(),
      source: { sha256: sourceSha256, byteLength: stat.size },
      media: probe,
      transcription,
      sampling: { method: 'FFMPEG_FPS_FILTER', intervalSeconds: sampleIntervalSeconds, requestedMaximumFrames: maxFrames },
      keyframes,
      sceneChanges: { status: 'NOT_MEASURED', items: [] },
      observations: [],
      interactionTimeline: { status: 'NOT_VERIFIED', items: [] },
      limitations: [
        'Quadros foram extraídos em intervalos uniformes; as posições registradas são pontos de amostragem, não timestamps exatos do frame original.',
        'Nenhum conteúdo visual, ação ou estrutura da aplicação foi inferido sem um analisador de visão conectado.',
        ...(transcription.status === 'PENDING' ? [`Transcrição pendente: ${transcription.reason}.`] : [])
      ]
    };
    if (transcription.status === 'TRANSCRIBED') {
      transcription.captions = {
        srt: `${artifactUrl}/captions/transcript.srt`,
        vtt: `${artifactUrl}/captions/transcript.vtt`
      };
    }
    this._persistReport(artifactPath, report);
    return report;
  }

  _enqueueTranscription(sourcePath, artifactPath, audio) {
    const task = this.transcriptionQueue.then(() => this._transcribeAudio(sourcePath, artifactPath, audio));
    this.transcriptionQueue = task.catch(() => {});
    return task.catch((error) => ({ status: 'PENDING', reason: error.code || 'TRANSCRIPTION_FAILED', text: null, segments: [] }));
  }

  async _transcribeAudio(sourcePath, artifactPath, audio) {
    if (!audio) return { status: 'PENDING', reason: 'AUDIO_TRACK_NOT_FOUND', text: null, segments: [] };
    if (!this.whisperModelPath) return { status: 'PENDING', reason: 'WHISPER_MODEL_NOT_CONFIGURED', text: null, segments: [] };
    let modelStat;
    try { modelStat = fs.statSync(this.whisperModelPath); } catch { return { status: 'PENDING', reason: 'WHISPER_MODEL_NOT_FOUND', text: null, segments: [] }; }
    if (!modelStat.isFile() || modelStat.size <= 0) return { status: 'PENDING', reason: 'WHISPER_MODEL_NOT_FOUND', text: null, segments: [] };
    const availableMemoryMb = Number(this.getAvailableMemoryBytes()) / (1024 * 1024);
    if (!Number.isFinite(availableMemoryMb) || availableMemoryMb < this.minimumWhisperFreeMemoryMb) {
      return { status: 'PENDING', reason: 'INSUFFICIENT_FREE_MEMORY', text: null, segments: [], minimumFreeMemoryMb: this.minimumWhisperFreeMemoryMb };
    }

    const audioPath = path.join(artifactPath, 'audio-16khz-mono.wav');
    try {
      await this.runCommand(this.ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-i', sourcePath, '-map', '0:a:0',
        '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-y', audioPath
      ], { timeout: 180000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    } catch (error) {
      return { status: 'PENDING', reason: error?.code === 'ENOENT' ? 'FFMPEG_UNAVAILABLE' : 'AUDIO_EXTRACTION_FAILED', text: null, segments: [] };
    }

    const outputPrefix = path.join(artifactPath, 'transcript');
    try {
      await this.runCommand(this.whisperCliPath, [
        '-m', path.resolve(this.whisperModelPath), '-f', audioPath,
        '-osrt', '-ovtt', '-of', outputPrefix
      ], { timeout: 1800000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
    } catch (error) {
      return { status: 'PENDING', reason: error?.code === 'ENOENT' ? 'WHISPER_CLI_UNAVAILABLE' : 'WHISPER_EXECUTION_FAILED', text: null, segments: [] };
    }

    const srtPath = `${outputPrefix}.srt`;
    const vttPath = `${outputPrefix}.vtt`;
    try {
      const stat = fs.statSync(srtPath);
      if (!stat.isFile() || stat.size > MAX_TRANSCRIPT_BYTES) return { status: 'PENDING', reason: 'TRANSCRIPT_SIZE_UNSUPPORTED', text: null, segments: [] };
      const srt = fs.readFileSync(srtPath, 'utf8');
      const segments = parseSrt(srt);
      const text = segments.map((segment) => segment.text).join('\n');
      if (!text.trim()) return { status: 'PENDING', reason: 'WHISPER_RETURNED_NO_SEGMENTS', text: null, segments: [] };
      if (!fs.existsSync(vttPath)) fs.writeFileSync(vttPath, srtToVtt(segments), 'utf8');
      return {
        status: 'TRANSCRIBED', engine: 'whisper.cpp', model: path.basename(this.whisperModelPath),
        text, segments, captionFiles: ['transcript.srt', 'transcript.vtt'],
        measuredAt: new Date().toISOString(), availableMemoryMb: Math.floor(availableMemoryMb)
      };
    } catch (error) {
      return { status: 'PENDING', reason: error?.code === 'ENOENT' ? 'WHISPER_OUTPUT_NOT_FOUND' : 'WHISPER_OUTPUT_INVALID', text: null, segments: [] };
    }
  }

  readArtifact(artifactId) {
    const directory = this._artifactDirectory(artifactId);
    let report;
    try { report = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8')); }
    catch { throw decoderError('VIDEO_ARTIFACT_NOT_FOUND', 'Relatório de vídeo não encontrado.', 404); }
    return report;
  }

  readFrame(artifactId, fileName) {
    const directory = this._artifactDirectory(artifactId);
    if (typeof fileName !== 'string' || !/^frame-\d{3}\.jpg$/i.test(fileName)) {
      throw decoderError('VIDEO_FRAME_NOT_FOUND', 'Quadro não encontrado.', 404);
    }
    const framePath = path.join(directory, fileName);
    try {
      const realDirectory = fs.realpathSync(directory);
      const realFramePath = fs.realpathSync(framePath);
      if (!isWithinDirectory(realDirectory, realFramePath)) throw new Error('outside artifact directory');
      const frame = fs.readFileSync(realFramePath);
      if (frame.length < 3 || frame[0] !== 0xff || frame[1] !== 0xd8 || frame[2] !== 0xff) throw new Error('invalid jpeg');
      return frame;
    } catch {
      throw decoderError('VIDEO_FRAME_NOT_FOUND', 'Quadro não encontrado.', 404);
    }
  }

  readCaption(artifactId, fileName) {
    const directory = this._artifactDirectory(artifactId);
    if (!['transcript.srt', 'transcript.vtt'].includes(fileName)) {
      throw decoderError('VIDEO_CAPTION_NOT_FOUND', 'Legenda não encontrada.', 404);
    }
    const captionPath = path.join(directory, fileName);
    try {
      const realDirectory = fs.realpathSync(directory);
      const realCaption = fs.realpathSync(captionPath);
      if (!isWithinDirectory(realDirectory, realCaption)) throw new Error('outside artifact directory');
      const stat = fs.statSync(realCaption);
      if (!stat.isFile() || stat.size > MAX_TRANSCRIPT_BYTES) throw new Error('caption size unsupported');
      return fs.readFileSync(realCaption);
    } catch {
      throw decoderError('VIDEO_CAPTION_NOT_FOUND', 'Legenda não encontrada.', 404);
    }
  }

  _artifactDirectory(artifactId) {
    if (typeof artifactId !== 'string' || !/^video-[a-f0-9]{12}-\d{13}$/.test(artifactId)) {
      throw decoderError('VIDEO_ARTIFACT_NOT_FOUND', 'Relatório de vídeo não encontrado.', 404);
    }
    const directory = path.resolve(this.artifactsDir, artifactId);
    if (!isWithinDirectory(this.artifactsDir, directory)) throw decoderError('VIDEO_ARTIFACT_NOT_FOUND', 'Relatório de vídeo não encontrado.', 404);
    try {
      const realRoot = fs.realpathSync(this.artifactsDir);
      const realDirectory = fs.realpathSync(directory);
      if (!isWithinDirectory(realRoot, realDirectory) || !fs.statSync(realDirectory).isDirectory()) throw new Error('not directory');
    } catch {
      throw decoderError('VIDEO_ARTIFACT_NOT_FOUND', 'Relatório de vídeo não encontrado.', 404);
    }
    return directory;
  }

  async _probe(sourcePath) {
    let stdout;
    try {
      const result = await this.runCommand(this.ffprobePath, [
        '-v', 'error', '-show_entries', 'format=duration,format_name:stream=codec_type,codec_name,width,height,avg_frame_rate,duration,channels,sample_rate',
        '-of', 'json', sourcePath
      ], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
      stdout = result?.stdout;
    } catch (error) {
      if (error?.code === 'ENOENT') throw decoderError('VIDEO_TOOL_UNAVAILABLE', 'FFprobe não está instalado ou não está acessível neste servidor.', 503);
      throw decoderError('VIDEO_PROBE_FAILED', 'FFprobe não conseguiu ler os metadados do vídeo.', 422);
    }

    let metadata;
    try { metadata = JSON.parse(stdout); } catch {
      throw decoderError('VIDEO_PROBE_INVALID', 'FFprobe retornou metadados inválidos.', 422);
    }
    const streams = Array.isArray(metadata.streams) ? metadata.streams : [];
    const stream = streams.find((item) => item.codec_type === 'video');
    const audioStream = streams.find((item) => item.codec_type === 'audio');
    const durationSeconds = finitePositive(metadata.format?.duration || stream?.duration);
    if (!stream || !durationSeconds || !Number.isFinite(Number(stream.width)) || !Number.isFinite(Number(stream.height))) {
      throw decoderError('VIDEO_METADATA_INCOMPLETE', 'O arquivo não expõe duração e dimensões de uma faixa de vídeo válidas.', 422);
    }
    return {
      durationSeconds,
      width: Number(stream.width),
      height: Number(stream.height),
      codec: typeof stream.codec_name === 'string' ? stream.codec_name : null,
      format: typeof metadata.format?.format_name === 'string' ? metadata.format.format_name : null,
      framesPerSecond: parseFrameRate(stream.avg_frame_rate),
      audio: audioStream ? {
        codec: typeof audioStream.codec_name === 'string' ? audioStream.codec_name : null,
        channels: Number.isFinite(Number(audioStream.channels)) ? Number(audioStream.channels) : null,
        sampleRate: Number.isFinite(Number(audioStream.sample_rate)) ? Number(audioStream.sample_rate) : null
      } : null
    };
  }

  _isAllowedPath(sourcePath) {
    return this.allowedRoots.some((root) => {
      try { return isWithinDirectory(fs.realpathSync(root), sourcePath); } catch { return false; }
    });
  }

  _persistReport(artifactPath, report) {
    const finalPath = path.join(artifactPath, 'manifest.json');
    const temporaryPath = `${finalPath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(report, null, 2), 'utf8');
    fs.renameSync(temporaryPath, finalPath);
  }
}

function runCommand(binary, args, options = {}) {
  return execFileAsync(binary, args, options);
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseFrameRate(value) {
  if (typeof value !== 'string') return null;
  const [numerator, denominator] = value.split('/').map(Number);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  const fps = numerator / denominator;
  return Number.isFinite(fps) && fps > 0 ? Number(fps.toFixed(3)) : null;
}

function parseSrt(value) {
  return String(value).replace(/^\uFEFF/, '').split(/\r?\n\s*\r?\n/).map((block) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) return null;
    const [start, end] = lines[timingIndex].split('-->').map((part) => parseCaptionTime(part.trim().split(/\s+/)[0]));
    const text = lines.slice(timingIndex + 1).join(' ').replace(/<[^>]*>/g, '').trim();
    if (start == null || end == null || end < start || !text) return null;
    return { startSeconds: start, endSeconds: end, text };
  }).filter(Boolean);
}

function parseCaptionTime(value) {
  const match = String(value).match(/^(\d{2,}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

function srtToVtt(segments) {
  const time = (seconds) => {
    const millis = Math.round(seconds * 1000);
    const hours = Math.floor(millis / 3600000);
    const minutes = Math.floor(millis / 60000) % 60;
    const remainder = millis % 60000;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(Math.floor(remainder / 1000)).padStart(2, '0')}.${String(remainder % 1000).padStart(3, '0')}`;
  };
  return `WEBVTT\n\n${segments.map((segment) => `${time(segment.startSeconds)} --> ${time(segment.endSeconds)}\n${segment.text}`).join('\n\n')}\n`;
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function isWithinDirectory(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath === '' || (relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath));
}

function decoderError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

const globalVideoSystemDecoder = new VideoSystemDecoder();

module.exports = { VideoSystemDecoder, globalVideoSystemDecoder };
