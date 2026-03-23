const { ContextManager } = require('../../core/contextManager');
const { buildPrompt } = require('../prompts/promptBuilder');
const { AgentRuntime } = require('../../core/agentRuntime');
const { Orchestrator } = require('../../core/orchestrator');
const { ConversationAgent } = require('../../intelligence/agents/conversationAgent');
const { AutomationAgent } = require('../../intelligence/agents/automationAgent');
const { CampaignAgent } = require('../../intelligence/agents/campaignAgent');
const { ConversationMemory } = require('../../intelligence/memory/conversationMemory');
const { LLMProvider } = require('../../intelligence/providers/llmProvider');
const { OpenAIProvider } = require('../../intelligence/providers/openaiProvider');
const { ActionExecutor } = require('../../system/executor/actionExecutor');
const { DefaultMessagingAdapter } = require('../adapters/defaultMessagingAdapter');
const { DefaultCRMAdapter } = require('../adapters/defaultCRMAdapter');
const { DefaultAutomationAdapter } = require('../adapters/defaultAutomationAdapter');
const devEngine = require('../../intelligence/dev-engine');

function createEngine(options = {}) {
  const memory = options.memory || new ConversationMemory();
  const contextManager = new ContextManager(memory);

  const openaiProvider =
    options.openaiProvider ||
    new OpenAIProvider({
      client: options.openaiClient || null,
      model: options.model,
    });

  const llmProvider = options.llmProvider || new LLMProvider({ openaiProvider });

  const runtime = new AgentRuntime({
    conversationAgent:
      options.conversationAgent ||
      new ConversationAgent({
        llmProvider,
        promptBuilder: buildPrompt,
      }),
    automationAgent: options.automationAgent || new AutomationAgent(),
    campaignAgent: options.campaignAgent || new CampaignAgent(),
  });

  const orchestrator = new Orchestrator({
    contextManager,
    runtime,
  });

  const actionExecutor = new ActionExecutor({
    messagingAdapter: options.messagingAdapter || new DefaultMessagingAdapter(),
    crmAdapter: options.crmAdapter || new DefaultCRMAdapter(),
    automationAdapter: options.automationAdapter || new DefaultAutomationAdapter(),
  });

  function registerAgent(kind, agent) {
    const key = String(kind || '').trim().toLowerCase();

    if (!agent) {
      return false;
    }

    if (key === 'conversation') {
      runtime.conversationAgent = agent;
      return true;
    }

    if (key === 'automation') {
      runtime.automationAgent = agent;
      return true;
    }

    if (key === 'campaign') {
      runtime.campaignAgent = agent;
      return true;
    }

    return false;
  }

  async function processEvent(event = {}) {
    const result = await orchestrator.processEvent(event);
    const execution = await actionExecutor.execute(result.actions, {
      ...event,
      response: result.response,
    });

    return {
      ...result,
      execution,
    };
  }

  async function generateReply(payload = {}) {
    const result = await processEvent({
      type: 'incoming_message',
      conversationId: payload?.conversationId,
      message: payload?.text || '',
      text: payload?.text || '',
      metadata: payload?.metadata || {},
      context: {
        conversationId: payload?.conversationId,
        ...(payload?.metadata || {}),
      },
    });

    return result?.response || '';
  }

  async function generateFromPrompt(command, params = {}) {
    return devEngine.generateFromPrompt(command, params);
  }

  async function scanProject(commandOrEntityName, params = {}) {
    return devEngine.scan(commandOrEntityName, params);
  }

  return {
    generateReply,
    generateFromPrompt,
    processEvent,
    registerAgent,
    scanProject,
  };
}

module.exports = {
  createEngine,
};
