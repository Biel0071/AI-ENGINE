class AgentExecutionRuntime {
  constructor({ aiGateway, workspaceExecutor, events }) { this.ai = aiGateway; this.workspace = workspaceExecutor; this.events = events; }
  async execute(tenantId, actorId, input = {}) {
    const agent = input.agent || {}; const context = input.context || {}; await this.#emit(tenantId, 'agent.selected', input.jobId, { agentId: agent.agentId, provider: agent.provider, model: agent.model });
    await this.#emit(tenantId, 'agent.context.ready', input.jobId, { projectId: input.projectId, missionId: input.missionId, files: context.relevantFiles || [] });
    const prompt = [`You are ${agent.name || agent.agentId || 'software agent'}.`, 'Return JSON only with operations, tests, validationPassed and commit.', `Job: ${input.prompt || input.type || ''}`, `Project context: ${JSON.stringify(context)}`].join('\n');
    const model = await this.ai.invoke(tenantId, actorId, { taskType: 'generate', prompt, provider: agent.provider && agent.provider !== 'configured-runtime' ? agent.provider : null, model: agent.model || null, format: { type: 'json_object' } });
    await this.#emit(tenantId, 'agent.provider.responded', input.jobId, { provider: model.provider, model: model.model });
    let plan; try { plan = JSON.parse(model.text); } catch { throw new Error('agent provider did not return the required JSON tool plan'); }
    const toolCalls = (plan.operations || []).map((operation) => ({
      tool: operation.tool || operation.toolId || 'git.workspace.write',
      operation: operation.operation,
      path: operation.path || operation.to || null,
    }));
    for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.call', input.jobId, call);
    try {
      const result = await this.workspace.execute(tenantId, actorId, { ...plan, projectId: input.projectId, missionId: input.missionId, jobId: input.jobId, agentId: agent.agentId, context });
      for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.result', input.jobId, { ...call, status: 'SUCCEEDED' });
      return { ...result, toolCalls, provider: model.provider, model: model.model, agentResponse: { text: model.text, cached: model.cached === true } };
    } catch (error) {
      for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.result', input.jobId, { ...call, status: 'FAILED', error: String(error.message || error).slice(0, 500) });
      await this.#emit(tenantId, 'agent.execution.failed', input.jobId, { error: String(error.message || error).slice(0, 500) });
      throw error;
    }
  }
  async #emit(tenantId, type, jobId, data) { if (this.events) await this.events.publish({ tenantId, stream: `agent:${jobId}`, type, source: 'fenix-agent-runtime', subject: jobId, data: { ...data, jobId } }); }
}
module.exports = { AgentExecutionRuntime };
