class AgentExecutionRuntime {
  constructor({ aiGateway, workspaceExecutor, events, skillRegistry = null }) { this.ai = aiGateway; this.workspace = workspaceExecutor; this.events = events; this.skills = skillRegistry; }
  setSkillRegistry(skillRegistry) { this.skills = skillRegistry; return this; }
  async execute(tenantId, actorId, input = {}) {
    const agent = input.agent || {}; const context = input.context || {}; await this.#emit(tenantId, 'agent.selected', input.jobId, { agentId: agent.agentId, provider: agent.provider, model: agent.model });
    await this.#emit(tenantId, 'agent.context.ready', input.jobId, { projectId: input.projectId, missionId: input.missionId, files: context.relevantFiles || [] });
    let skillContext = null;
    if (this.skills) {
      skillContext = await this.skills.contextForAgent(tenantId, actorId, agent, { objective: input.prompt || input.type || agent.role, prompt: input.prompt, maxTokens: input.maxSkillTokens || 900 });
      for (const skill of skillContext.selectedSkills) await this.#emit(tenantId, 'skill.started', input.jobId, { skillId: skill.id, skillName: skill.name, source: skill.source });
    }
    let currentPrompt = [
      `You are ${agent.name || agent.agentId || 'software agent'}.`,
      'You MUST return valid JSON ONLY. No text outside the JSON object.',
      'For test execution: the tests will be executed with "node <filename>". Always use standard Node.js built-ins ("node:assert/strict" or "assert"). If using describe/it, import them: const { describe, it } = require("node:test");',
      'Required JSON schema:',
      '{',
      '  "operations": [',
      '    { "operation": "create", "path": "index.js", "content": "..." },',
      '    { "operation": "create", "path": "index.test.js", "content": "..." },',
      '    { "operation": "create", "path": "README.md", "content": "..." }',
      '  ],',
      '  "tests": ["node index.test.js"],',
      '  "validationPassed": true,',
      '  "commit": true,',
      '  "commitMessage": "..."',
      '}',
      `Job: ${input.prompt || input.type || ''}`,
      `Project context: ${JSON.stringify(context)}`
    ].join('\n');
    let maxAttempts = 3;
    let attempt = 1;
    let lastError = null;
    let finalResult = null;

    while (attempt <= maxAttempts) {
      if (attempt > 1) {
        currentPrompt += `\n\nExecution attempt ${attempt - 1} failed with error:\n${lastError}\n\nPlease analyze the error, fix your operations, and try again. Return JSON only.`;
        await this.#emit(tenantId, 'agent.retry', input.jobId, { attempt, error: String(lastError).slice(0, 500) });
      }

      const lane = agent.lane || (attempt > 1 ? 'deep' : (input.type === 'fix' ? 'fast' : 'standard'));
      const model = await this.ai.invoke(tenantId, actorId, { taskType: 'generate', prompt: currentPrompt, lane, provider: agent.provider && agent.provider !== 'configured-runtime' ? agent.provider : null, model: agent.model || null, format: { type: 'json_object' } });
      await this.#emit(tenantId, 'agent.provider.responded', input.jobId, { provider: model.provider, model: model.model });
      
      const rawPlan = String(model.text || '').trim();
      const fenced = rawPlan.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      let jsonCandidate = fenced ? fenced[1].trim() : rawPlan;
      let plan = null; 
      try { 
        plan = JSON.parse(jsonCandidate); 
      } catch { 
        const jsonMatch = jsonCandidate.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { 
            plan = JSON.parse(jsonMatch[0]); 
          } catch {
            try {
              const sanitized = jsonMatch[0].replace(/\\([^"\\/bfnrtu])/g, '$1');
              plan = JSON.parse(sanitized);
            } catch {}
          }
        }
      }
      if (!plan) { 
        lastError = 'agent provider did not return the required JSON tool plan'; 
        attempt++; 
        continue; 
      }
      
      if (!plan || typeof plan !== 'object' || Array.isArray(plan) || (!Array.isArray(plan.operations) && !Array.isArray(plan.tests)) || !(plan.operations?.length || plan.tests?.length)) {
        lastError = 'agent provider returned an empty execution plan'; 
        attempt++; 
        continue;
      }
      if (plan.operations?.length && !plan.tests?.length) { 
        lastError = 'agent provider returned file changes without validation tests'; 
        attempt++; 
        continue; 
      }
      
      const toolCalls = (plan.operations || []).map((operation) => ({
        tool: operation.tool || operation.toolId || 'git.workspace.write',
        operation: operation.operation,
        path: operation.path || operation.to || null,
      }));
      for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.call', input.jobId, call);
      
      try {
        const result = await this.workspace.execute(tenantId, actorId, {
          ...plan,
          projectId: input.projectId,
          missionId: input.missionId,
          jobId: input.jobId,
          agentId: agent.agentId,
          validationPassed: plan.validationPassed !== false,
          policyAllows: plan.policyAllows !== false,
          commit: plan.commit !== false,
          context: { ...context, skillContext }
        });
        if (result.testsPassed === false) {
          const testErrors = (result.tests || []).filter(t => !t.passed).map(t => t.error || t.stderr || t.stdout).join('\n');
          throw new Error(`agent execution tests failed${testErrors ? `:\n${testErrors}` : ''}`);
        }
        if (skillContext) for (const skill of skillContext.selectedSkills) await this.#emit(tenantId, 'skill.completed', input.jobId, { skillId: skill.id, skillName: skill.name });
        for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.result', input.jobId, { ...call, status: 'SUCCEEDED' });
        finalResult = { ...result, toolCalls, provider: model.provider, model: model.model, lane: model.lane || lane, agentResponse: { text: model.text, cached: model.cached === true } };
        if (this.ai && typeof this.ai.handoff === 'function') {
          await this.ai.handoff(tenantId, actorId, { jobId: input.jobId, parentJobId: input.parentJobId || null, agentId: agent.agentId || 'agent', model: model.model, input: input.prompt || input.type, output: 'operations executed and verified', status: 'SUCCEEDED' }).catch(() => {});
        }
        break;
      } catch (error) {
        for (const call of toolCalls) await this.#emit(tenantId, 'agent.tool.result', input.jobId, { ...call, status: 'FAILED', error: String(error.message || error).slice(0, 500) });
        lastError = String(error.message || error);
        attempt++;
      }
    }

    if (!finalResult) {
      if (skillContext) for (const skill of skillContext.selectedSkills) await this.#emit(tenantId, 'skill.failed', input.jobId, { skillId: skill.id, skillName: skill.name, error: String(lastError).slice(0, 500) });
      await this.#emit(tenantId, 'agent.execution.failed', input.jobId, { error: String(lastError).slice(0, 500) });
      throw new Error(`Execution failed after ${maxAttempts} attempts. Last error: ${lastError}`);
    }

    return finalResult;
  }
  async #emit(tenantId, type, jobId, data) { if (this.events) await this.events.publish({ tenantId, stream: `agent:${jobId}`, type, source: 'fenix-agent-runtime', subject: jobId, data: { ...data, jobId } }); }
}
module.exports = { AgentExecutionRuntime };
