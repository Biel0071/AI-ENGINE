const fs = require('fs/promises');
const path = require('path');
const { TemplateEngine } = require('../../engine/generators/template-engine');
const { generateUIWithAI } = require('../../intelligence/ai');

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

class UIGenerator {
  constructor(options = {}) {
    this.templateEngine = options.templateEngine || new TemplateEngine();
    this.aiOptions = options.aiOptions || {};
  }

  buildTemplateMap() {
    return [
      {
        path: 'frontend/src/components/layout/AppSidebar.tsx',
        content: [
          "import { Home, LayoutGrid, Settings, Users } from 'lucide-react';",
          '',
          'const items = [',
          "  { label: 'Dashboard', icon: Home },",
          "  { label: 'Modules', icon: LayoutGrid },",
          "  { label: 'Customers', icon: Users },",
          "  { label: 'Settings', icon: Settings },",
          '];',
          '',
          'export function AppSidebar() {',
          '  return (',
          '    <aside className="w-72 border-r border-slate-200 bg-white/80 p-5 backdrop-blur">',
          '      <h1 className="mb-8 text-lg font-semibold tracking-tight">{{featureTitle}} Console</h1>',
          '      <nav className="space-y-2">',
          '        {items.map(({ label, icon: Icon }) => (',
          '          <button',
          '            key={label}',
          '            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"',
          '          >',
          '            <Icon size={16} />',
          '            <span>{label}</span>',
          '          </button>',
          '        ))}',
          '      </nav>',
          '    </aside>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        path: 'frontend/src/components/layout/AppHeader.tsx',
        content: [
          'export function AppHeader() {',
          '  return (',
          '    <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-4 backdrop-blur">',
          '      <div>',
          '        <h2 className="text-xl font-semibold">{{featureTitle}} Dashboard</h2>',
          '        <p className="text-sm text-slate-500">Generated with reusable AI Engine patterns</p>',
          '      </div>',
          '      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">',
          '        New {{featureTitle}}',
          '      </button>',
          '    </header>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        path: 'frontend/src/components/ui/UiCard.tsx',
        content: [
          'export function UiCard({ title, value, hint }: { title: string; value: string; hint: string }) {',
          '  return (',
          '    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">',
          '      <p className="text-sm text-slate-500">{title}</p>',
          '      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>',
          '      <p className="mt-1 text-xs text-slate-500">{hint}</p>',
          '    </article>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        path: 'frontend/src/components/ui/UiDataTable.tsx',
        content: [
          'export function UiDataTable({ rows }: { rows: Array<{ id: string; name: string; status: string }> }) {',
          '  return (',
          '    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">',
          '      <table className="min-w-full text-sm">',
          '        <thead className="bg-slate-50">',
          '          <tr>',
          '            <th className="px-4 py-3 text-left">Name</th>',
          '            <th className="px-4 py-3 text-left">Status</th>',
          '          </tr>',
          '        </thead>',
          '        <tbody>',
          '          {rows.map((row) => (',
          '            <tr key={row.id} className="border-t border-slate-100">',
          '              <td className="px-4 py-3">{row.name}</td>',
          '              <td className="px-4 py-3">{row.status}</td>',
          '            </tr>',
          '          ))}',
          '        </tbody>',
          '      </table>',
          '    </div>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        path: 'frontend/src/components/forms/{{featureSlug}}Form.tsx',
        content: [
          "import { useState } from 'react';",
          '',
          'export function {{featureComponent}}Form({ onSubmit }: { onSubmit: (payload: { name: string; description: string }) => Promise<void> | void }) {',
          '  const [name, setName] = useState(\'\');',
          '  const [description, setDescription] = useState(\'\');',
          '',
          '  return (',
          '    <form',
          '      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"',
          '      onSubmit={async (event) => {',
          '        event.preventDefault();',
          '        await onSubmit({ name, description });',
          '      }}',
          '    >',
          '      <div className="space-y-1">',
          '        <label className="text-sm text-slate-600">Name</label>',
          '        <input className="w-full rounded-lg border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />',
          '      </div>',
          '      <div className="space-y-1">',
          '        <label className="text-sm text-slate-600">Description</label>',
          '        <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />',
          '      </div>',
          '      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" type="submit">',
          '        Save {{featureTitle}}',
          '      </button>',
          '    </form>',
          '  );',
          '}',
        ].join('\n'),
      },
      {
        path: 'frontend/src/pages/{{featureSlug}}/index.tsx',
        content: [
          "import { AppSidebar } from '../../components/layout/AppSidebar';",
          "import { AppHeader } from '../../components/layout/AppHeader';",
          "import { UiCard } from '../../components/ui/UiCard';",
          "import { UiDataTable } from '../../components/ui/UiDataTable';",
          "import { {{featureComponent}}Form } from '../../components/forms/{{featureSlug}}Form';",
          '',
          'const demoRows = [',
          "  { id: '1', name: '{{featureTitle}} A', status: 'active' },",
          "  { id: '2', name: '{{featureTitle}} B', status: 'draft' },",
          '];',
          '',
          'export default function {{featureComponent}}Page() {',
          '  return (',
          '    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">',
          '      <div className="flex min-h-screen">',
          '        <AppSidebar />',
          '        <div className="flex-1">',
          '          <AppHeader />',
          '          <section className="space-y-6 p-6">',
          '            <div className="grid gap-4 md:grid-cols-3">',
          '              <UiCard title="Active {{featureTitle}}" value="12" hint="+14% this week" />',
          '              <UiCard title="Automation Health" value="98%" hint="Stable" />',
          '              <UiCard title="Open Tasks" value="7" hint="Needs review" />',
          '            </div>',
          '            <div className="grid gap-6 lg:grid-cols-2">',
          '              <UiDataTable rows={demoRows} />',
          '              <{{featureComponent}}Form onSubmit={async () => undefined} />',
          '            </div>',
          '          </section>',
          '        </div>',
          '      </div>',
          '    </main>',
          '  );',
          '}',
        ].join('\n'),
      },
    ];
  }

  async generate(input = {}) {
    const feature = String(input.feature || 'feature').trim();
    const featureSlug = feature.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const featureTitle = toPascalCase(feature).replace(/([a-z])([A-Z])/g, '$1 $2');
    const featureComponent = toPascalCase(feature);

    const outputRoot = path.resolve(input.outputRoot || process.cwd());
    const templateMap = this.buildTemplateMap();
    const files = this.templateEngine.renderFileMap(templateMap, {
      feature,
      featureSlug,
      featureTitle,
      featureComponent,
    });

    await writeFiles(outputRoot, files);

    let aiUI = {
      enabled: false,
      skipped: true,
      uiGuidance: {
        layout: 'sidebar-header',
        theme: 'neutral-saas',
        components: [],
        uxNotes: [],
      },
    };

    try {
      aiUI = await generateUIWithAI(
        {
          feature,
          patterns: input.patterns || [],
          projectSummary: input.projectData || {},
        },
        this.aiOptions,
      );
    } catch {
      aiUI = {
        enabled: false,
        skipped: true,
        uiGuidance: {
          layout: 'sidebar-header',
          theme: 'neutral-saas',
          components: [],
          uxNotes: [],
        },
      };
    }

    return {
      files,
      uiPattern: {
        layout: aiUI.uiGuidance.layout || 'sidebar-header',
        style: 'react-tailwind-shadcn-inspired',
        components: [
          'AppSidebar',
          'AppHeader',
          'UiCard',
          'UiDataTable',
          `${featureComponent}Form`,
          ...(aiUI.uiGuidance.components || []),
        ],
        aiNotes: aiUI.uiGuidance.uxNotes || [],
      },
      ai: aiUI,
    };
  }
}

module.exports = {
  UIGenerator,
};
