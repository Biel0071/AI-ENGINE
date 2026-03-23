const axios = require('axios');
const { getAIConfig } = require('./aiConfig');

function normalizeBaseURL(value) {
  return String(value || '').replace(/\/$/, '');
}

function extractText(responseData = {}) {
  const content = responseData?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        return item?.text || '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

class AIProvider {
  constructor(options = {}) {
    this.config = getAIConfig(options);
  }

  isEnabled() {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  async prompt(inputPrompt, options = {}) {
    if (!this.isEnabled()) {
      return {
        enabled: false,
        skipped: true,
        provider: this.config.provider,
        model: this.config.model,
        text: '',
      };
    }

    const baseURL = normalizeBaseURL(this.config.baseURL);
    const payload = {
      model: options.model || this.config.model,
      messages: [
        {
          role: 'system',
          content:
            options.systemPrompt ||
            'You are an expert AI architect for SaaS engineering. Be concise and practical.',
        },
        {
          role: 'user',
          content: String(inputPrompt || ''),
        },
      ],
      temperature: typeof options.temperature === 'number' ? options.temperature : 0.2,
    };

    const response = await axios.post(`${baseURL}/chat/completions`, payload, {
      timeout: this.config.timeoutMs,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      enabled: true,
      skipped: false,
      provider: this.config.provider,
      model: payload.model,
      text: extractText(response.data),
      raw: response.data,
    };
  }
}

module.exports = {
  AIProvider,
};
