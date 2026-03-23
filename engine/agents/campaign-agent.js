class CampaignAgent {
  async handle(event) {
    const campaignData = event.campaignData || {};

    return {
      actions: [
        {
          type: 'campaign_analysis',
          payload: {
            campaignId: campaignData.id || null,
            confidence: campaignData.confidence || 0.5,
          },
        },
      ],
      response: '',
      updatedContext: {
        ...(event.context || {}),
        lastCampaignAnalysisAt: new Date().toISOString(),
      },
    };
  }
}

module.exports = {
  CampaignAgent,
};
