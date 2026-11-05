'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeReferenceImage } = require('../src/intent/reference-image-analysis');

const png = Buffer.from('89504e470d0a1a0a00000000', 'hex').toString('base64');

test('reference image is sent to the configured vision model and returned as unverified observations', async () => {
  let request;
  const result = await analyzeReferenceImage({
    llm: { name: 'ollama', chat: async (payload) => { request = payload; return { text: JSON.stringify({ layout: 'Duas colunas', visibleText: ['Projetos'], visibleComponents: [{ label: 'Busca', category: 'input', apparentState: 'ativa' }], inferredInteractions: ['Abrir projeto'], uncertainties: ['Não foi possível confirmar o comportamento'] }), model: 'llava:7b' }; } },
    model: 'llava:7b', imageBase64: png, projectId: 'project-a'
  });

  assert.equal(request.model, 'llava:7b');
  assert.deepEqual(request.messages[1].images, [png]);
  assert.match(request.messages[0].content, /não confiável|não confiáveis/i);
  assert.equal(result.provider, 'ollama');
  assert.equal(result.model, 'llava:7b');
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.analysis.layout, 'Duas colunas');
  assert.equal(result.status, 'MODEL_OBSERVATIONS_REQUIRES_VALIDATION');
  assert.equal(JSON.stringify(result).includes(png), false, 'image bytes must not be returned or persisted in the analysis result');
});

test('reference image analysis rejects invalid or oversized images and missing model configuration', async () => {
  await assert.rejects(() => analyzeReferenceImage({ llm: {}, model: '', imageBase64: png }), { code: 'VISION_MODEL_UNAVAILABLE' });
  await assert.rejects(() => analyzeReferenceImage({ llm: { chat() {} }, model: 'llava', imageBase64: Buffer.from('not an image').toString('base64') }), { code: 'REFERENCE_IMAGE_INVALID' });
  await assert.rejects(() => analyzeReferenceImage({ llm: { chat() {} }, model: 'llava', imageBase64: Buffer.alloc(1024 * 1024 + 1, 0x61).toString('base64') }), { code: 'REFERENCE_IMAGE_TOO_LARGE' });
});

test('malformed provider output fails explicitly instead of saving guessed visual findings', async () => {
  await assert.rejects(() => analyzeReferenceImage({
    llm: { name: 'ollama', chat: async () => ({ text: 'talvez tenha um botão' }) },
    model: 'llava:7b', imageBase64: png, projectId: 'project-a'
  }), { code: 'VISION_RESPONSE_INVALID' });
});
