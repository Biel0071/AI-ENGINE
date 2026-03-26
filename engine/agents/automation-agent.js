class AutomationAgent {
  async handle(event) {
    const flowState = event.flowState || {};

    return {
      actions: [
        {
          type: 'automation_decision',
          payload: {
            decision: flowState?.next || 'continue',
            flowState,
          },
        },
      ],
      response: '',
      updatedContext: {
        ...(event.context || {}),
        lastAutomationDecisionAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = {
  AutomationAgent,
};
