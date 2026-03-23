class OpenAIProvider {
  constructor({ client = null, model = null } = {}) {
    this.client = client;
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  }

  async generate(prompt, payload = {}) {
    if (!this.client || !this.client.responses?.create) {
      return '';
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: String(payload?.message || ''),
          },
        ],
      });

      return String(response?.output_text || '').trim();
    } catch {
      return '';
    }
  }
}

module.exports = {
  OpenAIProvider,
};
