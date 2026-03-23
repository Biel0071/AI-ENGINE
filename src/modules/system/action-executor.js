class ActionExecutor {
  constructor({ messagingAdapter, crmAdapter, automationAdapter }) {
    this.messagingAdapter = messagingAdapter;
    this.crmAdapter = crmAdapter;
    this.automationAdapter = automationAdapter;
  }

  async execute(actions = [], event = {}) {
    const results = [];

    for (const action of actions) {
      if (!action || typeof action !== 'object') {
        continue;
      }

      if (action.type === 'send_response') {
        const text = action.payload?.text || event.response || '';
        const phone = event.phone || event.context?.phone;

        if (text && phone) {
          const sent = await this.messagingAdapter.sendMessage(phone, text, event);
          results.push({ type: action.type, ok: !!sent });
        }

        continue;
      }

      if (action.type === 'automation_decision' || action.type === 'campaign_analysis') {
        const ok = await this.automationAdapter.execute(action, event);
        results.push({ type: action.type, ok: !!ok });
        continue;
      }

      const ok = await this.crmAdapter.updateConversationContext(
        event.conversationId,
        action.payload || {}
      );
      results.push({ type: action.type, ok: !!ok });
    }

    return results;
  }
}

module.exports = {
  ActionExecutor,
};
