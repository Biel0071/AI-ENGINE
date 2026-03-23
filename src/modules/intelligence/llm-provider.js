class LLMProvider {
  constructor({ openaiProvider = null } = {}) {
    this.openaiProvider = openaiProvider;
  }

  async generate(prompt, payload = {}) {
    if (this.openaiProvider) {
      const output = await this.openaiProvider.generate(prompt, payload);
      if (output) {
        return output;
      }
    }

    const inbound = String(payload?.message || '').trim();
    if (!inbound) {
      return 'Como posso te ajudar agora?';
    }

    return `Recebido: ${inbound}. Posso continuar seu atendimento agora.`;
  }
}

module.exports = {
  LLMProvider,
};
