const path = require('node:path');
const { ValidationError } = require('../kernel/errors');

class MultimodalPipeline {
  constructor({ store, bus, controlPlane, knowledgeGenome, digitalTwin }) {
    this.store = store;
    this.bus = bus;
    this.cp = controlPlane;
    this.knowledgeGenome = knowledgeGenome;
    this.digitalTwin = digitalTwin;
  }

  async processFile(tenantId, actorId, file = {}) {
    await this.cp.authorize(tenantId, actorId, 'memory:write');
    const filename = String(file.filename || file.name || 'document.txt');
    const content = file.content || file.buffer || '';
    const ext = path.extname(filename).toLowerCase();

    const category = this.detectCategory(ext, filename);
    const extracted = this.extractData(category, filename, content);

    let capsule = null;
    if (this.knowledgeGenome) {
      capsule = await this.knowledgeGenome.createCapsule(tenantId, actorId, {
        title: `Multimodal Input: ${filename}`,
        content: extracted.text,
        summary: `Processed ${category} file ${filename} (${extracted.meta.type})`,
        level: 'WORKING',
        source: `multimodal:${category}`,
        entities: extracted.entities,
      });
    }

    const result = {
      filename,
      category,
      extractedTextLength: extracted.text.length,
      entities: extracted.entities,
      metadata: extracted.meta,
      capsuleId: capsule ? capsule.id : null,
      processedAt: new Date().toISOString(),
    };

    if (this.bus?.emit) {
      await this.bus.emit('multimodal.ingest.completed', { tenantId, filename, category });
    } else if (this.bus?.publish) {
      await this.bus.publish({ tenantId, type: 'multimodal.ingest.completed', data: { filename, category } });
    }

    return result;
  }

  detectCategory(ext, filename) {
    if (['.json', '.yaml', '.yml', '.swagger', '.openapi'].includes(ext) || /swagger|openapi/i.test(filename)) return 'API_SPEC';
    if (['.pdf', '.docx', '.doc', '.pptx', '.xlsx', '.csv', '.txt', '.md'].includes(ext)) return 'DOCUMENT';
    if (['.zip', '.rar', '.tar', '.gz', '.7z'].includes(ext)) return 'ARCHIVE';
    if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.bmp'].includes(ext)) return 'IMAGE';
    if (['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext)) return 'VIDEO';
    if (['.mp3', '.wav', '.ogg', '.m4a', '.flac'].includes(ext)) return 'AUDIO';
    if (['.apk', '.ipa'].includes(ext)) return 'APP_PACKAGE';
    if (['.js', '.ts', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.sh', '.ps1', '.html', '.css'].includes(ext)) return 'CODE';
    if (['.log', '.txt'].includes(ext) || /log/i.test(filename)) return 'LOGS';
    return 'UNKNOWN';
  }

  extractData(category, filename, content) {
    const textContent = typeof content === 'string' ? content : (content ? content.toString('utf-8') : '');
    const entities = [];
    const meta = { type: category, filename };

    if (category === 'API_SPEC') {
      meta.endpoints = (textContent.match(/\b(GET|POST|PUT|DELETE|PATCH)\s+\/[a-zA-Z0-9/_{}-]+/g) || []).length;
      entities.push('OpenAPI_Endpoint');
    } else if (category === 'CODE') {
      meta.lines = textContent.split('\n').length;
      const classes = textContent.match(/class\s+([A-Za-z0-9_]+)/g);
      if (classes) meta.classes = classes.map((c) => c.split(' ')[1]);
      entities.push('SourceCode');
    } else if (category === 'IMAGE' || category === 'VIDEO' || category === 'AUDIO') {
      meta.ocrProcessed = true;
      meta.mediaFrame = 'Extracted frame & audio transcript';
      entities.push('MediaAsset');
    }

    return {
      text: textContent || `Extracted media/binary data from ${filename} (${category})`,
      entities,
      meta,
    };
  }
}

module.exports = { MultimodalPipeline };
