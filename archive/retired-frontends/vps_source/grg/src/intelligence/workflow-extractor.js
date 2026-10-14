/**
 * FÊNIX OS — Workflow Extractor & Skill Generator
 * Detects recurring action sequences and synthesizes structured, reusable Skills.
 */

const { slugify } = require('../kernel/ids');

class WorkflowExtractor {
  constructor() {
    this.extractedWorkflows = [];
  }

  /**
   * Scans observation events and groups frequent action sequences into workflows
   */
  extractFromEvents(events = [], { minSteps = 2, workflowName = null } = {}) {
    if (events.length < minSteps) return null;

    const sequence = events.map(e => ({
      action: e.action,
      actor: e.actor,
      targetType: e.target.component ? 'component' : e.target.apiRoute ? 'api' : 'file',
      details: e.target
    }));

    const inferredName = workflowName || `Workflow_${sequence.map(s => s.action).slice(0, 3).join('_')}`;
    const id = slugify(inferredName);

    const workflow = {
      id,
      name: inferredName,
      description: `Auto-extracted workflow with ${sequence.length} sequential operations`,
      stepsCount: sequence.length,
      steps: sequence,
      extractedAt: new Date().toISOString()
    };

    this.extractedWorkflows.push(workflow);
    return workflow;
  }

  /**
   * Generates a reusable Markdown Skill definition from an extracted workflow
   */
  generateSkillFromWorkflow(workflow) {
    const triggers = workflow.steps.map(s => s.action.toLowerCase().replace(/_/g, ' '));
    const instructions = workflow.steps.map((s, idx) => `${idx + 1}. Execute ${s.action} on ${s.details.component || s.details.file || 'target'}`).join('\n');

    const markdown = `---
name: ${workflow.name}
description: ${workflow.description}
version: 1.0.0
triggers: [${[...new Set(triggers)].map(t => `"${t}"`).join(', ')}]
domains: ["engineering", "automation"]
---

# ${workflow.name}

## Objective
Execute the standard sequence of operations extracted from verified successful sessions.

## Execution Steps
${instructions}

## Expected Result
All steps completed with 100% build integrity.
`;

    return {
      id: workflow.id,
      name: workflow.name,
      version: '1.0.0',
      markdown,
      triggers: [...new Set(triggers)],
      steps: workflow.steps
    };
  }
}

module.exports = { WorkflowExtractor };
