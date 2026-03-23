function buildPrompt({ eventType, context = {}, message = '', agent = {} }) {
  const identity = `${agent.name || 'Agent'} | tone=${agent.tone || 'professional'} | style=${agent.responseStyle || 'clear_short'}`;
  const personality = agent.personality || 'Helpful assistant that drives clear next actions.';

  return [
    `Event: ${eventType}`,
    `Agent: ${identity}`,
    `Personality: ${personality}`,
    `Context: ${JSON.stringify(context)}`,
    `Message: ${message}`,
    'Return concise business-safe response.',
  ].join('\n');
}

module.exports = {
  buildPrompt,
};
