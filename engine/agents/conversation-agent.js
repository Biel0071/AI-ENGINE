class ConversationAgent {
  constructor({ llmProvider, promptBuilder }) {
    this.llmProvider = llmProvider;
    this.promptBuilder = promptBuilder;
  }

  async handle(event) {
    const prompt = this.promptBuilder({
      agent: event.agent || {},
      context: event.context || {},
      eventType: event.type,
      message: event.message || '',
    });

    const response = await this.llmProvider.generate(prompt, {
      context: event.context || {},
      message: event.message || '',
    });

    return {
      actions: [{ type: 'send_response', payload: { text: response } }],
      response,
      updatedContext: {
        ...(event.context || {}),
        lastInboundMessage: event.message || '',
        lastResponse: response,
      },
    };
  }
}

module.exports = {
  ConversationAgent,
};
