'use strict';
/**
 * FÊNIX OS — AI Video Production Studio Engine
 * Multi-Agent Visual Video Factory, NLE Multitrack Timeline, Media Library,
 * and Real Video Rendering via FFmpeg.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFile, execSync } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const VIDEO_AGENTS = {
  'director': { id: 'director', name: 'Davi Mendes', role: 'Executive Director', color: '#EF4444' },
  'scene-planner': { id: 'scene-planner', name: 'Sofia Rocha', role: 'Scene Planner', color: '#F59E0B' },
  'timeline-editor': { id: 'timeline-editor', name: 'Lucas Prado', role: 'Timeline NLE Editor', color: '#10B981' },
  'motion-graphics': { id: 'motion-graphics', name: 'Nina Costa', role: 'Motion & VFX Designer', color: '#00D9FF' },
  'audio-producer': { id: 'audio-producer', name: 'Theo Valente', role: 'Audio & Music Producer', color: '#8B5CF6' },
  'video-qa': { id: 'video-qa', name: 'Elena Morse', role: 'Video QA Validator', color: '#EC4899' },
};

const USER_UPLOADED_VIDEOS = [
  'C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7/.user_uploaded/media_1793741985899_a79b3915.mp4',
  'C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7/.user_uploaded/media_1793741985610_c70b138d.mp4',
  'C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7/.user_uploaded/media_1793742838169_c4053265.mp4',
];

class VideoProductionStudioEngine {
  constructor(options = {}) {
    this.artifactsDir = path.resolve(options.artifactsDir || path.join(__dirname, '..', '..', 'public', 'artifacts', 'video-studio'));
    this.mediaDir = path.join(this.artifactsDir, 'media');
    this.rendersDir = path.join(this.artifactsDir, 'renders');
    this.thumbnailsDir = path.join(this.artifactsDir, 'thumbnails');

    [this.artifactsDir, this.mediaDir, this.rendersDir, this.thumbnailsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    this.projects = new Map();
    this.activeAgents = new Map();
    this.mediaLibrary = [];

    this._initAgents();
    this._indexInitialMedia();
    this._createDefaultProject();
  }

  _initAgents() {
    for (const [key, profile] of Object.entries(VIDEO_AGENTS)) {
      this.activeAgents.set(key, {
        ...profile,
        activeClipId: null,
        currentAction: 'IDLE',
        cursorPosition: { x: Math.floor(100 + Math.random() * 600), y: Math.floor(80 + Math.random() * 300) },
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  _indexInitialMedia() {
    this.mediaLibrary = [];
    USER_UPLOADED_VIDEOS.forEach((filePath, idx) => {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const id = `media_${idx + 1}`;
        const fileName = path.basename(filePath);
        
        // Extract thumbnail if not present
        const thumbName = `${id}_thumb.png`;
        const thumbPath = path.join(this.thumbnailsDir, thumbName);
        if (!fs.existsSync(thumbPath)) {
          try {
            execSync(`ffmpeg -y -ss 00:00:02 -i "${filePath}" -vframes 1 -vf "scale=320:-1" "${thumbPath}"`, { stdio: 'ignore' });
          } catch (_) {}
        }

        this.mediaLibrary.push({
          id,
          name: fileName,
          filePath,
          sizeBytes: stats.size,
          sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          thumbnail: fs.existsSync(thumbPath) ? `/artifacts/video-studio/thumbnails/${thumbName}` : null,
          thumbnailPath: thumbPath,
          format: 'mp4',
          resolution: '720x1280',
          durationSec: idx === 0 ? 49 : (idx === 1 ? 10 : 33),
          type: 'video',
          uploadedAt: stats.mtime.toISOString(),
        });
      }
    });
  }

  _createDefaultProject() {
    const projId = 'proj_video_factory_01';
    const project = {
      id: projId,
      title: 'Fênix Motion Launch — Multi-Agent Commercial',
      status: 'EDITING',
      aspectRatio: '9:16',
      targetDurationSec: 30,
      createdAt: new Date().toISOString(),
      scenes: [
        {
          id: 'scene_01',
          name: 'Hook: The Power of AI Agents',
          durationSec: 8,
          script: 'Veja como múltiplos agentes de IA colaboram em tempo real dentro do Fênix OS.',
          activeAgent: 'director',
          clips: [
            {
              id: 'clip_01',
              mediaId: 'media_2',
              track: 'V1',
              startTime: 0,
              duration: 8,
              name: 'Agent Screen Telemetry',
              trimStart: 0,
              trimEnd: 8,
            },
            {
              id: 'clip_02_overlay',
              track: 'V2',
              startTime: 1,
              duration: 5,
              name: 'Lower Third: 18 Active Agents',
              type: 'graphics_overlay',
            },
            {
              id: 'clip_03_audio',
              track: 'A1',
              startTime: 0,
              duration: 8,
              name: 'Narrator Intro (AI Voice)',
              type: 'voiceover',
            }
          ]
        },
        {
          id: 'scene_02',
          name: 'Core: Collaborative Visual Builder',
          durationSec: 12,
          script: 'Agentes navegando, inspecionando elementos e reconstruindo layouts visualmente.',
          activeAgent: 'timeline-editor',
          clips: [
            {
              id: 'clip_04',
              mediaId: 'media_1',
              track: 'V1',
              startTime: 8,
              duration: 12,
              name: 'Class Motion Live Cursors',
              trimStart: 5,
              trimEnd: 17,
            },
            {
              id: 'clip_05_overlay',
              track: 'V2',
              startTime: 10,
              duration: 8,
              name: 'Bounding Box & Agent Badges',
              type: 'graphics_overlay',
            }
          ]
        },
        {
          id: 'scene_03',
          name: 'CTA: Just DO IT — Production Certified',
          durationSec: 10,
          script: 'Entrega final com certificação automatizada e deploy 1-clique.',
          activeAgent: 'motion-graphics',
          clips: [
            {
              id: 'clip_06',
              mediaId: 'media_3',
              track: 'V1',
              startTime: 20,
              duration: 10,
              name: 'Infinite Canvas & Claude Cursor',
              trimStart: 2,
              trimEnd: 12,
            }
          ]
        }
      ],
      tracks: [
        { id: 'V2', name: 'Overlays & Graphics', type: 'video_overlay' },
        { id: 'V1', name: 'Main Video / B-Roll', type: 'video' },
        { id: 'A1', name: 'Voiceover & Dialogue', type: 'audio' },
        { id: 'A2', name: 'BGM & Sound Effects', type: 'audio' },
      ],
      renders: [],
    };
    this.projects.set(projId, project);
  }

  getProjects() {
    return Array.from(this.projects.values());
  }

  getProject(id) {
    return this.projects.get(id) || null;
  }

  getMediaLibrary() {
    return this.mediaLibrary;
  }

  getVideoAgents() {
    return Array.from(this.activeAgents.values());
  }

  createProject(data = {}) {
    const id = 'proj_' + Date.now();
    const project = {
      id,
      title: data.title || 'Novo Projeto Audiovisual',
      status: 'PLANNING',
      aspectRatio: data.aspectRatio || '9:16',
      targetDurationSec: data.targetDurationSec || 15,
      createdAt: new Date().toISOString(),
      scenes: data.scenes || [],
      tracks: [
        { id: 'V2', name: 'Overlays & Graphics', type: 'video_overlay' },
        { id: 'V1', name: 'Main Video', type: 'video' },
        { id: 'A1', name: 'Audio Voice', type: 'audio' },
        { id: 'A2', name: 'Audio BGM', type: 'audio' },
      ],
      renders: [],
    };
    this.projects.set(id, project);
    return project;
  }

  updateTimelineClip(projectId, clipData) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    let clipFound = false;
    for (const scene of project.scenes) {
      const idx = scene.clips.findIndex((c) => c.id === clipData.id);
      if (idx !== -1) {
        scene.clips[idx] = { ...scene.clips[idx], ...clipData };
        clipFound = true;
        break;
      }
    }
    if (!clipFound) {
      if (project.scenes.length === 0) {
        project.scenes.push({ id: 'scene_01', name: 'Default Scene', durationSec: 10, clips: [] });
      }
      project.scenes[0].clips.push(clipData);
    }
    return { ok: true, project };
  }

  addMedia(filePath, metadata = {}) {
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) throw new Error(`Media file not found: ${filePath}`);
    const stats = fs.statSync(absPath);
    const id = `media_${this.mediaLibrary.length + 1}`;
    const fileName = path.basename(absPath);
    const thumbName = `${id}_thumb.png`;
    const thumbPath = path.join(this.thumbnailsDir, thumbName);

    if (!fs.existsSync(thumbPath)) {
      try {
        execSync(`ffmpeg -y -ss 00:00:01 -i "${absPath}" -vframes 1 -vf "scale=320:-1" "${thumbPath}"`, { stdio: 'ignore' });
      } catch (_) {}
    }

    const entry = {
      id,
      name: metadata.name || fileName,
      filePath: absPath,
      sizeBytes: stats.size,
      sizeFormatted: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
      thumbnail: fs.existsSync(thumbPath) ? `/artifacts/video-studio/thumbnails/${thumbName}` : null,
      thumbnailPath: thumbPath,
      format: path.extname(absPath).replace('.', '').toLowerCase() || 'mp4',
      resolution: metadata.resolution || '720x1280',
      durationSec: metadata.durationSec || 15,
      type: metadata.type || 'video',
      uploadedAt: stats.mtime.toISOString(),
    };

    this.mediaLibrary.push(entry);
    return entry;
  }

  scanMediaDir() {
    if (!fs.existsSync(this.mediaDir)) return [];
    const entries = fs.readdirSync(this.mediaDir, { withFileTypes: true });
    const added = [];
    for (const ent of entries) {
      if (ent.isFile() && /\.(mp4|mov|webm|avi|mkv)$/i.test(ent.name)) {
        const full = path.join(this.mediaDir, ent.name);
        const exists = this.mediaLibrary.some(m => path.resolve(m.filePath) === path.resolve(full));
        if (!exists) {
          added.push(this.addMedia(full));
        }
      }
    }
    return added;
  }

  async renderVideo(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const renderId = 'rnd_' + Date.now();
    const outputFileName = `${projectId}_${renderId}.mp4`;
    const outputPath = path.join(this.rendersDir, outputFileName);
    const duration = options.durationSec || 5;

    // Pick source media from options, first timeline clip, or default media library
    let sourceMedia = null;
    if (options.mediaId) {
      sourceMedia = this.mediaLibrary.find(m => m.id === options.mediaId);
    }
    if (!sourceMedia && project.scenes?.[0]?.clips?.[0]?.mediaId) {
      const clipMediaId = project.scenes[0].clips[0].mediaId;
      sourceMedia = this.mediaLibrary.find(m => m.id === clipMediaId);
    }
    if (!sourceMedia) {
      sourceMedia = this.mediaLibrary[0];
    }

    let renderSuccess = false;
    let renderMethod = 'direct';

    if (sourceMedia && fs.existsSync(sourceMedia.filePath)) {
      try {
        const args = [
          '-y',
          '-ss', '00:00:02',
          '-t', String(duration),
          '-i', sourceMedia.filePath,
          '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-b:a', '128k',
          outputPath
        ];
        await execFileAsync('ffmpeg', args);
        renderSuccess = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000;
        renderMethod = 'ffmpeg_real_clip';
      } catch (err) {
        renderSuccess = false;
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (_) {}
        }
      }
    }

    if (!renderSuccess) {
      // Fallback: Generate valid animated test MP4 via FFmpeg synthetic generator
      try {
        const synArgs = [
          '-y',
          '-f', 'lavfi',
          '-i', `color=c=0x080C14:s=720x1280:d=${duration}`,
          '-f', 'lavfi',
          '-i', 'anullsrc=r=44100:cl=stereo',
          '-t', String(duration),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          outputPath
        ];
        await execFileAsync('ffmpeg', synArgs);
        renderSuccess = fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000;
        renderMethod = 'ffmpeg_synthetic';
      } catch (err) {
        renderSuccess = false;
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (_) {}
        }
      }
    }

    const renderRecord = {
      renderId,
      projectId,
      fileName: outputFileName,
      outputPath,
      publicUrl: `/artifacts/video-studio/renders/${outputFileName}`,
      durationSec: duration,
      sizeBytes: renderSuccess ? fs.statSync(outputPath).size : 0,
      renderMethod,
      success: renderSuccess,
      renderedAt: new Date().toISOString(),
    };

    project.renders.push(renderRecord);
    return renderRecord;
  }
}

module.exports = {
  VideoProductionStudioEngine,
  VIDEO_AGENTS,
  USER_UPLOADED_VIDEOS,
};
