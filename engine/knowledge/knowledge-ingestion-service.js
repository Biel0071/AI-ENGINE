const { DoclingService } = require('./docling-service');
const { createChunks } = require('./chunking-service');
const { EmbeddingService } = require('./embedding-service');
const { QdrantService } = require('./qdrant-service');
const fs = require('fs/promises');
const path = require('path');

function safeFileName(value) {
  return String(value || 'document').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function detectMimeType(fileName = '') {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.md')) {
    return 'text/markdown';
  }
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return 'text/html';
  }
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  return 'application/octet-stream';
}

function normalizeArtifacts(artifacts = {}) {
  return {
    code: Array.isArray(artifacts.code) ? artifacts.code : [],
    documents: Array.isArray(artifacts.documents) ? artifacts.documents : [],
    uiPatterns: Array.isArray(artifacts.uiPatterns) ? artifacts.uiPatterns : [],
  };
}

class KnowledgeIngestionService {
  constructor(options = {}) {
    this.docling = options.docling || new DoclingService(options.doclingOptions || {});
    this.embedding = options.embedding || new EmbeddingService(options.embeddingOptions || {});
    this.qdrant = options.qdrant || new QdrantService(options.qdrantOptions || {});
    this.fallbackFile = options.fallbackFile || path.join(__dirname, '..', 'memory', 'knowledge-fallback.json');
  }

  async loadFallbackEntries() {
    try {
      const raw = await fs.readFile(this.fallbackFile, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveFallbackEntries(entries = []) {
    await fs.mkdir(path.dirname(this.fallbackFile), { recursive: true });
    await fs.writeFile(this.fallbackFile, JSON.stringify(entries.slice(-1200), null, 2) + '\n', 'utf8');
  }

  scoreFallback(query = '', content = '') {
    const q = String(query || '').toLowerCase();
    const c = String(content || '').toLowerCase();
    if (!q || !c) {
      return 0;
    }

    const words = q.split(/\s+/).filter((item) => item.length > 2);
    if (!words.length) {
      return 0;
    }

    let score = 0;
    for (const word of words) {
      if (c.includes(word)) {
        score += 1;
      }
    }

    return score / words.length;
  }

  async ingestDocument({ buffer, fileName, mimeType, source = 'uploaded_document', metadata = {} } = {}) {
    const parsed = await this.docling.parseDocument({
      buffer,
      fileName,
      mimeType,
      source,
    });

    const structured = parsed.structured || {
      title: safeFileName(fileName),
      sections: [],
      text: '',
      parser: 'empty',
      metadata: {
        mimeType,
        fileName,
      },
    };

    const chunks = createChunks(structured, {});

    const points = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = await this.embedding.generateEmbedding(chunk.content);

      points.push({
        id: `${chunk.id}-${index}`,
        vector: embedding.vector,
        payload: {
          content: chunk.content,
          documentType: mimeType || 'application/octet-stream',
          source,
          metadata: {
            ...metadata,
            parser: structured.parser,
            title: structured.title,
            sectionHeading: chunk.metadata.sectionHeading,
            sectionIndex: chunk.metadata.sectionIndex,
            fileName: safeFileName(fileName),
          },
        },
      });
    }

    const storage = await this.qdrant.upsert(points);

    if (!storage.ok) {
      const fallbackEntries = await this.loadFallbackEntries();
      for (const point of points) {
        fallbackEntries.push({
          id: point.id,
          content: point.payload.content,
          documentType: point.payload.documentType,
          source: point.payload.source,
          metadata: point.payload.metadata,
          vector: point.vector,
        });
      }
      await this.saveFallbackEntries(fallbackEntries);
    }

    return {
      ok: true,
      parser: parsed.provider,
      doclingStatus: parsed.ok,
      warning: parsed.warning || storage.warning || null,
      structuredDocument: structured,
      chunks: chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata,
      })),
      vectorStorage: {
        ok: storage.ok,
        collection: this.qdrant.collectionName,
        storedPoints: storage.count,
        fallbackStored: storage.ok === false,
      },
    };
  }

  async indexArtifacts({ source = 'project-artifacts', artifacts = {}, metadata = {} } = {}) {
    const normalized = normalizeArtifacts(artifacts);
    const points = [];
    let count = 0;

    const pushPoint = async (type, item, content, itemMetadata = {}) => {
      const text = String(content || '').trim();
      if (!text) {
        return;
      }

      const embedding = await this.embedding.generateEmbedding(text);
      points.push({
        id: `${source}-${type}-${count}`,
        vector: embedding.vector,
        payload: {
          content: text,
          documentType: type,
          source,
          metadata: {
            ...metadata,
            ...itemMetadata,
          },
        },
      });
      count += 1;
    };

    for (const codeItem of normalized.code) {
      await pushPoint(
        'code',
        codeItem,
        codeItem.content || codeItem.summary || '',
        {
          path: codeItem.path || null,
          language: codeItem.language || null,
          kind: 'code-artifact',
        },
      );
    }

    for (const docItem of normalized.documents) {
      await pushPoint(
        'document',
        docItem,
        docItem.content || docItem.summary || '',
        {
          title: docItem.title || null,
          kind: 'document-artifact',
        },
      );
    }

    for (const uiItem of normalized.uiPatterns) {
      await pushPoint(
        'ui-pattern',
        uiItem,
        uiItem.content || uiItem.summary || uiItem.name || '',
        {
          name: uiItem.name || null,
          kind: 'ui-pattern-artifact',
        },
      );
    }

    if (!points.length) {
      return {
        ok: true,
        count: 0,
        warning: 'No artifacts received for vector indexing.',
      };
    }

    const storage = await this.qdrant.upsert(points);

    if (!storage.ok) {
      const fallbackEntries = await this.loadFallbackEntries();
      for (const point of points) {
        fallbackEntries.push({
          id: point.id,
          content: point.payload.content,
          documentType: point.payload.documentType,
          source: point.payload.source,
          metadata: point.payload.metadata,
          vector: point.vector,
        });
      }
      await this.saveFallbackEntries(fallbackEntries);
    }

    return {
      ok: true,
      count: points.length,
      warning: storage.ok ? null : storage.warning || 'Vector DB unavailable; fallback memory indexed.',
      vectorStorage: {
        ok: storage.ok,
        collection: this.qdrant.collectionName,
        fallbackStored: storage.ok === false,
      },
    };
  }

  async retrieveRelevantContext({ query = '', limit = 6, source = null } = {}) {
    const queryEmbedding = await this.embedding.generateEmbedding(query);
    const filter = source
      ? {
          must: [
            {
              key: 'source',
              match: {
                value: source,
              },
            },
          ],
        }
      : null;

    const search = await this.qdrant.search(queryEmbedding.vector, limit, filter);

    if (!search.ok) {
      const fallbackEntries = await this.loadFallbackEntries();
      const ranked = fallbackEntries
        .map((entry) => ({
          entry,
          score: this.scoreFallback(query, entry.content),
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, limit)
        .map((item) => item.entry);

      return {
        ok: true,
        warning: search.warning || queryEmbedding.warning || 'Qdrant unavailable; fallback context used.',
        provider: `${queryEmbedding.provider}-fallback`,
        contexts: ranked.map((entry) => ({
          score: this.scoreFallback(query, entry.content),
          content: entry.content || '',
          documentType: entry.documentType || null,
          source: entry.source || null,
          metadata: entry.metadata || {},
        })),
      };
    }

    return {
      ok: search.ok,
      warning: search.warning || queryEmbedding.warning || null,
      provider: queryEmbedding.provider,
      contexts: (search.results || []).map((entry) => ({
        score: entry.score,
        content: entry.payload && entry.payload.content ? entry.payload.content : '',
        documentType: entry.payload && entry.payload.documentType ? entry.payload.documentType : null,
        source: entry.payload && entry.payload.source ? entry.payload.source : null,
        metadata: entry.payload && entry.payload.metadata ? entry.payload.metadata : {},
      })),
    };
  }

  async ingest(filePath = '') {
    const parsed = await this.docling.parseDocument(String(filePath || ''));
    const structured = parsed.structured || {
      title: safeFileName(filePath),
      sections: [],
      text: '',
      parser: 'empty',
      metadata: {
        fileName: safeFileName(filePath),
      },
    };

    const chunks = createChunks(structured, {
      chunkSize: Number(process.env.KNOWLEDGE_CHUNK_SIZE || 500),
      overlap: Number(process.env.KNOWLEDGE_CHUNK_OVERLAP || 60),
    });

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = await this.embedding.generateEmbedding(chunk.content);
      await this.qdrant.storeVector(`${safeFileName(filePath)}-${index}`, embedding.vector, {
        content: chunk.content,
        source: filePath,
        parser: structured.parser || parsed.provider || 'fallback',
      });
    }

    return {
      ok: true,
      source: filePath,
      parser: parsed.provider,
      chunkCount: chunks.length,
      mimeType: detectMimeType(filePath),
    };
  }

  async retrieveContext(query = '') {
    const result = await this.retrieveRelevantContext({
      query,
      limit: 5,
    });

    return result.contexts || [];
  }
}

module.exports = {
  ingest: async function ingest(filePath) {
    const service = new KnowledgeIngestionService();
    return service.ingest(filePath);
  },
  KnowledgeIngestionService,
};
