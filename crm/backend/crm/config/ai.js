const OpenAI = require('openai');
const { DEFAULT_SYSTEM_PROMPT } = require('./basePrompt');
const { getActivePrompt } = require('./promptManager');

let client;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

function formatConversationMessages(messages = []) {
  return messages
    .slice(-20)
    .map((message) => `${message.from === 'agent' ? 'Atendente' : 'Cliente'}: ${message.text || `[${message.mediaType || 'mensagem'}]`}`)
    .join('\n');
}

async function generateAutoReply(store, { phone, name, text }) {
  const openai = getClient();

  if (!openai) {
    return null;
  }

  const activePrompt = store ? getActivePrompt(store) : DEFAULT_SYSTEM_PROMPT;

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content: activePrompt,
      },
      {
        role: 'user',
        content: `Contact: ${name || 'Unknown'}\nPhone: ${phone}\nMessage: ${text}`,
      },
    ],
  });

  return response.output_text?.trim() || null;
}

async function generateConversationSummaryWithAI(store, messages = []) {
  const openai = getClient();

  if (!openai || !Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    input: [
      {
        role: 'system',
        content:
          'Resuma conversas comerciais de WhatsApp em português do Brasil com no máximo 18 palavras. Retorne apenas o resumo final.',
      },
      {
        role: 'user',
        content: `Gere um resumo curto da conversa abaixo:\n${formatConversationMessages(messages)}`,
      },
    ],
  });

  return response.output_text?.trim() || null;
}

module.exports = {
  getClient,
  SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
  generateAutoReply,
  generateConversationSummaryWithAI,
};
