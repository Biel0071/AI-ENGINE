const crypto = require('crypto');

function hashText(value = '') {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex');
}

function buildChunkId(documentId, index, content) {
  return `${documentId}-${index}-${hashText(content).slice(0, 12)}`;
}

function chunkText(text = '', options = {}) {
  const chunkSize = Number(options.chunkSize || process.env.KNOWLEDGE_CHUNK_SIZE || 1400);
  const overlap = Number(options.overlap || process.env.KNOWLEDGE_CHUNK_OVERLAP || 180);
  const normalized = String(text || '').trim();

  if (!normalized) {
    return [];
  }

  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(cursor + chunkSize, normalized.length);
    const piece = normalized.slice(cursor, end).trim();
    if (piece) {
      chunks.push(piece);
    }

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(0, end - overlap);
  }

  return chunks;
}

function createChunks(structuredDocument = {}, options = {}) {
  const sections = Array.isArray(structuredDocument.sections) ? structuredDocument.sections : [];
  const documentId = hashText(`${structuredDocument.title || 'document'}:${structuredDocument.text || ''}`).slice(0, 16);

  if (!sections.length) {
    const generic = chunkText(structuredDocument.text || '', options);
    return generic.map((content, index) => ({
      id: buildChunkId(documentId, index, content),
      content,
      metadata: {
        sectionHeading: 'Content',
        sectionIndex: index,
      },
    }));
  }

  const chunks = [];
  let count = 0;

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const sectionChunks = chunkText(section.text || '', options);

    for (const content of sectionChunks) {
      chunks.push({
        id: buildChunkId(documentId, count, content),
        content,
        metadata: {
          sectionHeading: section.heading || `Section ${sectionIndex + 1}`,
          sectionIndex,
        },
      });
      count += 1;
    }
  }

  return chunks;
}

module.exports = {
  chunkText,
  createChunks,
};
