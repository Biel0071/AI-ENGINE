const crypto = require('node:crypto');

function hashEmbedding(text, dimensions = 64) {
  const vector = new Array(dimensions).fill(0);
  const terms = String(text).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [];
  for (const term of terms) {
    const bytes = crypto.createHash('sha256').update(term).digest();
    const index = bytes.readUInt32BE(0) % dimensions;
    const sign = bytes[4] % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function lexicalScore(query, text) {
  const terms = new Set(String(query).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []);
  if (!terms.size) return 0;
  const words = new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || []);
  let overlap = 0;
  for (const term of terms) if (words.has(term)) overlap += 1;
  return overlap / terms.size;
}

module.exports = { hashEmbedding, lexicalScore };
