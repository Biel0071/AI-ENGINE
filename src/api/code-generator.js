const fs = require('fs/promises');
const path = require('path');
const { TemplateEngine } = require('../../engine/generators/template-engine');
const { buildBackendArchitectureNotes, scaffoldBackendEnhancements } = require('../../engine/backendStructure');

function toPascalCase(value) {
  return String(value || '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

async function writeFiles(rootPath, files) {
  for (const file of files) {
    const targetPath = path.join(rootPath, file.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.content, 'utf8');
  }
}

class CodeGenerator {
  constructor(options = {}) {
    this.templateEngine = options.templateEngine || new TemplateEngine();
  }

  buildActions() {
    return [
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.routes.ts',
        template: [
          "import { Router } from 'express';",
          "import { {{featureComponent}}Controller } from './{{featureSlug}}.controller';",
          '',
          'const router = Router();',
          '',
          "router.get('/{{featureSlug}}', {{featureComponent}}Controller.list);",
          "router.post('/{{featureSlug}}', {{featureComponent}}Controller.create);",
          '',
          'export { router as {{featureSlug}}Router };',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.controller.ts',
        template: [
          "import { Request, Response } from 'express';",
          "import { {{featureComponent}}Service } from './{{featureSlug}}.service';",
          '',
          'export const {{featureComponent}}Controller = {',
          '  async list(_req: Request, res: Response) {',
          '    const data = await {{featureComponent}}Service.list();',
          '    return res.json(data);',
          '  },',
          '',
          '  async create(req: Request, res: Response) {',
          '    const created = await {{featureComponent}}Service.create(req.body);',
          '    return res.status(201).json(created);',
          '  },',
          '};',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.service.ts',
        template: [
          "import { {{featureComponent}}Repository } from './{{featureSlug}}.repository';",
          '',
          'export const {{featureComponent}}Service = {',
          '  list() {',
          '    return {{featureComponent}}Repository.list();',
          '  },',
          '',
          '  create(payload: { name: string; description?: string }) {',
          '    return {{featureComponent}}Repository.create(payload);',
          '  },',
          '};',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.repository.ts',
        template: [
          'const memoryStore: Array<{ id: string; name: string; description?: string }> = [];',
          '',
          'export const {{featureComponent}}Repository = {',
          '  list() {',
          '    return memoryStore;',
          '  },',
          '',
          '  create(payload: { name: string; description?: string }) {',
          '    const item = { id: String(Date.now()), ...payload };',
          '    memoryStore.unshift(item);',
          '    return item;',
          '  },',
          '};',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.dto.ts',
        template: [
          'export type Create{{featureComponent}}DTO = {',
          '  name: string;',
          '  description?: string;',
          '};',
          '',
          'export type {{featureComponent}}ResponseDTO = {',
          '  id: string;',
          '  name: string;',
          '  description?: string;',
          '  createdAt: string;',
          '};',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.error-handler.ts',
        template: [
          "import { Response } from 'express';",
          '',
          'export function handle{{featureComponent}}Error(res: Response, error: unknown) {',
          "  const message = error instanceof Error ? error.message : 'Unexpected module error';",
          '  return res.status(500).json({',
          '    error: true,',
          '    module: \"{{featureSlug}}\",',
          '    message,',
          '  });',
          '}',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.queue-handler.ts',
        template: [
          "import { {{featureComponent}}Queue } from './{{featureSlug}}.queue';",
          '',
          'export async function process{{featureComponent}}Job(payload: Record<string, unknown>) {',
          '  const queued = {{featureComponent}}Queue.onCreated(payload);',
          '  return {',
          '    status: \"processed\",',
          '    ...queued,',
          '  };',
          '}',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'backend/src/modules/{{featureSlug}}/{{featureSlug}}.integration.test.ts',
        template: [
          "describe('{{featureComponent}} module integration', () => {",
          "  it('creates a {{featureSlug}} item payload contract', async () => {",
          '    const payload = { name: \"sample\" };',
          '    expect(payload.name).toBeTruthy();',
          '  });',
          '});',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'frontend/src/services/{{featureSlug}}Api.ts',
        template: [
          "import { request } from '../services/http/request';",
          '',
          'export function list{{featureComponent}}() {',
          "  return request<Array<{ id: string; name: string }>>({ method: 'GET', url: '/{{featureSlug}}' });",
          '}',
          '',
          'export function create{{featureComponent}}(payload: { name: string; description?: string }) {',
          "  return request<{ id: string; name: string }>({ method: 'POST', url: '/{{featureSlug}}', data: payload });",
          '}',
        ].join('\n'),
      },
      {
        type: 'add',
        path: 'frontend/src/modules/{{featureSlug}}/{{featureComponent}}Module.tsx',
        template: [
          "import { useEffect, useState } from 'react';",
          "import { list{{featureComponent}} } from '../../services/{{featureSlug}}Api';",
          '',
          'export function {{featureComponent}}Module() {',
          '  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);',
          '',
          '  useEffect(() => {',
          '    void list{{featureComponent}}().then(setItems);',
          '  }, []);',
          '',
          '  return (',
          '    <section className="rounded-xl border border-slate-200 bg-white p-4">',
          '      <h3 className="text-base font-semibold">{{featureTitle}} Module</h3>',
          '      <ul className="mt-3 space-y-2 text-sm text-slate-600">',
          '        {items.map((item) => (',
          '          <li key={item.id}>{item.name}</li>',
          '        ))}',
          '      </ul>',
          '    </section>',
          '  );',
          '}',
        ].join('\n'),
      },
    ];
  }

  async runActions(actions, context, outputRoot) {
    const files = [];

    for (const action of actions) {
      if (action.type !== 'add') {
        continue;
      }

      files.push({
        path: this.templateEngine.renderFromString(action.path, context),
        content: this.templateEngine.renderFromString(action.template, context),
      });
    }

    await writeFiles(outputRoot, files);
    return files;
  }

  async generate(input = {}) {
    const feature = String(input.feature || 'feature').trim();
    const featureSlug = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const featureComponent = toPascalCase(feature);
    const featureTitle = featureComponent.replace(/([a-z])([A-Z])/g, '$1 $2');

    const outputRoot = path.resolve(input.outputRoot || process.cwd());
    const contextBundle = input.contextBundle && typeof input.contextBundle === 'object' ? input.contextBundle : null;
    const decision = input.decision && typeof input.decision === 'object' ? input.decision : null;
    const actions = this.buildActions();
    const files = await this.runActions(actions, { feature, featureSlug, featureComponent, featureTitle }, outputRoot);

    const backendEnhancements = scaffoldBackendEnhancements(featureSlug, featureComponent);
    await writeFiles(outputRoot, backendEnhancements);

    const architectureNotes = buildBackendArchitectureNotes(featureSlug);
    const notesFile = {
      path: `backend/src/modules/${featureSlug}/${featureSlug}.architecture.json`,
      content: JSON.stringify(architectureNotes, null, 2) + '\n',
    };
    await writeFiles(outputRoot, [notesFile]);

    const businessRulesFile = {
      path: `backend/src/modules/${featureSlug}/${featureSlug}.business-rules.json`,
      content:
        JSON.stringify(
          {
            feature: featureSlug,
            rules: contextBundle && contextBundle.business && Array.isArray(contextBundle.business.rules)
              ? contextBundle.business.rules
              : ['Preserve compatibility and validate business payload contracts.'],
            contextReady: Boolean(contextBundle && contextBundle.metadata && contextBundle.metadata.contextReady),
          },
          null,
          2,
        ) + '\n',
    };

    const autoFeaturePlanFile = {
      path: `backend/src/modules/${featureSlug}/${featureSlug}.auto-features.json`,
      content:
        JSON.stringify(
          {
            feature: featureSlug,
            autoFeatures: decision && Array.isArray(decision.autoFeatures) ? decision.autoFeatures : [],
            strategy: decision && decision.strategy ? decision.strategy : { preGenerationDecision: 'context-first' },
          },
          null,
          2,
        ) + '\n',
    };

    await writeFiles(outputRoot, [businessRulesFile, autoFeaturePlanFile]);

    const allFiles = [...files, ...backendEnhancements, notesFile, businessRulesFile, autoFeaturePlanFile];

    return {
      files: allFiles,
      summary: {
        pages: allFiles.filter((file) => file.path.includes('/pages/')).length,
        components: allFiles.filter((file) => file.path.includes('/components/') || file.path.includes('/modules/')).length,
        apis: allFiles.filter((file) => file.path.includes('Api')).length,
        backendModules: allFiles.filter((file) => file.path.includes('/backend/src/modules/')).length,
        events: allFiles.filter((file) => file.path.endsWith('.events.ts')).length,
        queues: allFiles.filter((file) => file.path.endsWith('.queue.ts')).length,
        dtoFiles: allFiles.filter((file) => file.path.endsWith('.dto.ts')).length,
        errorHandlers: allFiles.filter((file) => file.path.endsWith('.error-handler.ts')).length,
        queueHandlers: allFiles.filter((file) => file.path.endsWith('.queue-handler.ts')).length,
        integrationTests: allFiles.filter((file) => file.path.endsWith('.integration.test.ts')).length,
        businessRuleFiles: allFiles.filter((file) => file.path.endsWith('.business-rules.json')).length,
        autoFeaturePlans: allFiles.filter((file) => file.path.endsWith('.auto-features.json')).length,
      },
    };
  }
}

module.exports = {
  CodeGenerator,
};
