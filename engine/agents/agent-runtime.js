class AgentRuntime {
  constructor({ conversationAgent, automationAgent, campaignAgent }) {
    this.conversationAgent = conversationAgent;
    this.automationAgent = automationAgent;
    this.campaignAgent = campaignAgent;
  }

  async run(event) {
    const type = String(event?.type || '').trim().toLowerCase();

    if (type === 'incoming_message') {
      return this.conversationAgent.handle(event);
    }

    if (type === 'automation_decision') {
      return this.automationAgent.handle(event);
    }

    if (type === 'campaign_analysis') {
      return this.campaignAgent.handle(event);
    }

    return {
      actions: [],
      response: '',
      updatedContext: event?.context || {},
    };
  }
}

module.exports = {
  AgentRuntime,
};
