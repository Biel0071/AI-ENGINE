const axios = require('axios');
const fs = require('fs/promises');

function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripHtml(html = '') {
  return String(html || '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function parseMarkdown(markdown = '') {
  const lines = String(markdown || '').split('\n');
  const sections = [];
  let current = { heading: 'Document', text: '' };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);
    if (headingMatch) {
      if (current.text.trim()) {
        sections.push({
          heading: current.heading,
          text: normalizeWhitespace(current.text),
        });
      }
      current = {
        heading: headingMatch[1].trim(),
        text: '',
      };
      continue;
    }

    current.text += `${line}\n`;
  }

  if (current.text.trim()) {
    sections.push({
      heading: current.heading,
      text: normalizeWhitespace(current.text),
    });
  }

  return sections;
}

function parseFallbackByType({ content = '', mimeType = '', fileName = '' } = {}) {
  const lowerName = String(fileName || '').toLowerCase();
  const lowerMime = String(mimeType || '').toLowerCase();

  if (lowerName.endsWith('.md') || lowerMime.includes('markdown')) {
    const sections = parseMarkdown(content);
    return {
      title: fileName || 'markdown-document',
      sections,
      text: normalizeWhitespace(content),
      parser: 'fallback-markdown',
    };
  }

  if (lowerName.endsWith('.html') || lowerMime.includes('html')) {
    const cleaned = normalizeWhitespace(stripHtml(content));
    return {
      title: fileName || 'html-document',
      sections: [{ heading: 'HTML Content', text: cleaned }],
      text: cleaned,
      parser: 'fallback-html',
    };
  }

  const generic = normalizeWhitespace(content);
  return {
    title: fileName || 'document',
    sections: [{ heading: 'Content', text: generic }],
    text: generic,
    parser: 'fallback-generic',
  };
}

function normalizeDoclingResponse(raw = {}, fileName = '', mimeType = '') {
  const text = normalizeWhitespace(raw.text || raw.content || raw.markdown || '');
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = sectionsRaw
    .map((section, index) => ({
      heading: String(section.heading || section.title || `Section ${index + 1}`),
      text: normalizeWhitespace(section.text || section.content || ''),
    }))
    .filter((section) => section.text.length > 0);

  return {
    title: String(raw.title || fileName || 'document'),
    sections: sections.length ? sections : [{ heading: 'Content', text }],
    text,
    parser: 'docling',
    metadata: {
      mimeType,
      fileName,
      pages: raw.pages || null,
    },
  };
}

class DoclingService {
  constructor(options = {}) {
    this.doclingUrl = options.doclingUrl || process.env.DOCLING_API_URL || 'http://localhost:8000/parse';
    this.timeoutMs = Number(options.timeoutMs || process.env.DOCLING_TIMEOUT_MS || 60000);
  }

  async parseDocument(payload = {}) {
    const isFilePathCall = typeof payload === 'string';
    const filePath = isFilePathCall ? payload : payload.filePath;
    const buffer = isFilePathCall ? null : payload.buffer;
    const fileName = isFilePathCall ? filePath : payload.fileName;
    const mimeType = isFilePathCall ? '' : payload.mimeType;
    const source = isFilePathCall ? 'file_path' : (payload.source || 'uploaded_document');

    if (isFilePathCall || filePath) {
      try {
        const response = await axios.post(
          this.doclingUrl,
          {
            file_path: String(filePath),
          },
          {
            timeout: this.timeoutMs,
          },
        );

        return {
          ok: true,
          provider: 'docling',
          structured: normalizeDoclingResponse(response.data || {}, String(fileName || ''), String(mimeType || '')),
        };
      } catch (error) {
        let fallbackText = '';
        try {
          fallbackText = await fs.readFile(String(filePath), 'utf8');
        } catch {
          fallbackText = String(filePath || '');
        }

        const structured = parseFallbackByType({
          content: fallbackText,
          mimeType,
          fileName,
        });

        return {
          ok: false,
          provider: 'fallback',
          warning: String(error && error.message ? error.message : error),
          structured: {
            ...structured,
            metadata: {
              mimeType,
              fileName,
              source,
            },
          },
        };
      }
    }

    const safeBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer || ''), 'utf8');

    try {
      const payload = {
        fileName,
        mimeType,
        source,
        contentBase64: safeBuffer.toString('base64'),
      };

      const response = await axios.post(process.env.DOCLING_BUFFER_API_URL || 'http://localhost:5002/parse-document', payload, {
        timeout: this.timeoutMs,
      });

      return {
        ok: true,
        provider: 'docling',
        structured: normalizeDoclingResponse(response.data || {}, fileName, mimeType),
      };
    } catch (error) {
      const fallbackText = safeBuffer.toString('utf8');
      const structured = parseFallbackByType({
        content: fallbackText,
        mimeType,
        fileName,
      });

      return {
        ok: false,
        provider: 'fallback',
        warning: String(error && error.message ? error.message : error),
        structured: {
          ...structured,
          metadata: {
            mimeType,
            fileName,
            source,
          },
        },
      };
    }
  }
}

module.exports = {
  parseDocument: async function parseDocument(filePath) {
    const service = new DoclingService();
    const response = await service.parseDocument(String(filePath || ''));
    return response.structured || {};
  },
  DoclingService,
};
