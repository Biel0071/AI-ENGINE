const fs = require('fs/promises');
const path = require('path');
const { scanProject } = require('./projectScanner');
const { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } = require('./utils');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureFile(filePath, content, changes) {
  if (await exists(filePath)) {
    return { created: false, filePath };
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  changes.created.push(filePath);
  return { created: true, filePath };
}

async function patchFile(filePath, patchFn, changes) {
  if (!(await exists(filePath))) {
    return false;
  }

  const current = await fs.readFile(filePath, 'utf8');
  const updated = patchFn(current);

  if (updated === current) {
    return false;
  }

  await fs.writeFile(filePath, updated, 'utf8');
  changes.updated.push(filePath);
  return true;
}

function ensureLine(content, lineToInsert) {
  if (content.includes(lineToInsert)) {
    return content;
  }
  return `${content.trimEnd()}\n${lineToInsert}\n`;
}

function injectAfterLine(content, anchor, insertLine) {
  if (content.includes(insertLine)) {
    return content;
  }

  if (!content.includes(anchor)) {
    return content;
  }

  return content.replace(anchor, `${anchor}\n${insertLine}`);
}

function injectBeforeLine(content, anchor, insertLine) {
  if (content.includes(insertLine)) {
    return content;
  }

  if (!content.includes(anchor)) {
    return content;
  }

  return content.replace(anchor, `${insertLine}\n${anchor}`);
}

function backendRepositoryTemplate({ pascalName, camelName, tableName }) {
  return `const rows = [];
let nextId = 1;

function list${pascalName}() {
  return rows;
}

function get${pascalName}ById(id) {
  return rows.find((item) => item.id === Number(id)) || null;
}

function create${pascalName}(payload = {}) {
  const row = {
    id: nextId++,
    name: String(payload.name || '').trim() || '${pascalName} #' + nextId,
    status: String(payload.status || 'active'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  rows.push(row);
  return row;
}

function update${pascalName}(id, payload = {}) {
  const target = get${pascalName}ById(id);
  if (!target) {
    return null;
  }

  target.name = String(payload.name || target.name).trim() || target.name;
  target.status = String(payload.status || target.status || 'active');
  target.updatedAt = new Date().toISOString();
  return target;
}

function remove${pascalName}(id) {
  const index = rows.findIndex((item) => item.id === Number(id));
  if (index < 0) {
    return false;
  }

  rows.splice(index, 1);
  return true;
}

module.exports = {
  tableName: '${tableName}',
  list${pascalName},
  get${pascalName}ById,
  create${pascalName},
  update${pascalName},
  remove${pascalName},
};
`;
}

function backendServiceTemplate({ pascalName, camelName }) {
  return `const ${camelName}Repository = require('../repositories/${camelName}Repository');

function list${pascalName}(filters = {}) {
  const rows = ${camelName}Repository.list${pascalName}();

  if (!filters || !filters.search) {
    return rows;
  }

  const needle = String(filters.search || '').toLowerCase().trim();
  if (!needle) {
    return rows;
  }

  return rows.filter((row) =>
    String((row.name || '') + ' ' + (row.status || '')).toLowerCase().includes(needle)
  );
}

function get${pascalName}ById(id) {
  return ${camelName}Repository.get${pascalName}ById(id);
}

function create${pascalName}(payload = {}) {
  return ${camelName}Repository.create${pascalName}(payload);
}

function update${pascalName}(id, payload = {}) {
  return ${camelName}Repository.update${pascalName}(id, payload);
}

function remove${pascalName}(id) {
  return ${camelName}Repository.remove${pascalName}(id);
}

module.exports = {
  list${pascalName},
  get${pascalName}ById,
  create${pascalName},
  update${pascalName},
  remove${pascalName},
};
`;
}

function backendControllerTemplate({ pascalName, camelName }) {
  return `const ${camelName}Service = require('../services/${camelName}Service');

function list(req, res) {
  const rows = ${camelName}Service.list${pascalName}({
    search: req.query?.search,
  });
  return res.status(200).json(rows);
}

function getById(req, res) {
  const row = ${camelName}Service.get${pascalName}ById(req.params.id);
  if (!row) {
    return res.status(404).json({ error: '${pascalName} not found.' });
  }
  return res.status(200).json(row);
}

function create(req, res) {
  const created = ${camelName}Service.create${pascalName}(req.body || {});
  return res.status(201).json(created);
}

function update(req, res) {
  const updated = ${camelName}Service.update${pascalName}(req.params.id, req.body || {});
  if (!updated) {
    return res.status(404).json({ error: '${pascalName} not found.' });
  }
  return res.status(200).json(updated);
}

function remove(req, res) {
  const removed = ${camelName}Service.remove${pascalName}(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: '${pascalName} not found.' });
  }
  return res.status(200).json({ success: true });
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
`;
}

function backendRouteTemplate({ camelName, resource }) {
  return `const express = require('express');
const router = express.Router();
const ${camelName}Controller = require('../controllers/${camelName}Controller');

router.get('/api/${resource}', ${camelName}Controller.list);
router.get('/api/${resource}/:id', ${camelName}Controller.getById);
router.post('/api/${resource}', ${camelName}Controller.create);
router.put('/api/${resource}/:id', ${camelName}Controller.update);
router.delete('/api/${resource}/:id', ${camelName}Controller.remove);

module.exports = router;
`;
}

function backendModuleIndexTemplate({ pascalName, camelName, resource }) {
  return `module.exports = {
  name: '${resource}',
  label: '${pascalName}',
  repository: require('../../../repositories/${camelName}Repository'),
  service: require('../../../services/${camelName}Service'),
  controller: require('../../../controllers/${camelName}Controller'),
  routes: require('../../../routes/${resource}'),
};
`;
}

function schemaTemplate({ resource, tableName, pascalName }) {
  return JSON.stringify(
    {
      module: resource,
      table: tableName,
      title: `${pascalName} Schema`,
      columns: [
        { name: 'id', type: 'serial', primaryKey: true },
        { name: 'name', type: 'varchar(255)', nullable: false },
        { name: 'status', type: 'varchar(64)', default: 'active' },
        { name: 'created_at', type: 'timestamp', default: 'now()' },
        { name: 'updated_at', type: 'timestamp', default: 'now()' },
      ],
    },
    null,
    2
  ) + '\n';
}

function workflowTemplate({ pascalName, resource }) {
  return JSON.stringify(
    {
      name: `${resource}_default_lifecycle`,
      module: resource,
      steps: [
        { id: 'capture', title: `Capture ${pascalName} input`, type: 'manual' },
        { id: 'validate', title: 'Validate payload', type: 'service' },
        { id: 'persist', title: 'Persist record', type: 'repository' },
        { id: 'notify', title: 'Emit realtime event', type: 'event' },
      ],
    },
    null,
    2
  ) + '\n';
}

function frontendHookTemplate({ pascalName, camelName, resource }) {
  return `import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export type ${pascalName}Row = {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export function use${pascalName}() {
  const [rows, setRows] = useState<${pascalName}Row[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.get<${pascalName}Row[]>('/api/${resource}');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const create = async (payload: { name: string; status?: string }) => {
    await api.post('/api/${resource}', payload);
    await refresh();
  };

  const remove = async (id: number) => {
    await api.del('/api/${resource}/' + id);
    await refresh();
  };

  useEffect(() => {
    void refresh();
  }, []);

  return {
    rows,
    loading,
    refresh,
    create,
    remove,
  };
}
`;
}

function frontendComponentTemplate({ pascalName, camelName }) {
  return `type Props = {
  total: number;
  active: number;
  archived: number;
};

export function ${pascalName}StatsCard({ total, active, archived }: Props) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-slate-100">${pascalName} Snapshot</h3>
      <p className="mt-1 text-xs text-slate-400">Auto-generated module intelligence</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-slate-950/70 p-2">
          <p className="text-slate-400">Total</p>
          <p className="text-base font-semibold text-white">{total}</p>
        </div>
        <div className="rounded-md bg-emerald-950/40 p-2">
          <p className="text-emerald-300">Active</p>
          <p className="text-base font-semibold text-emerald-200">{active}</p>
        </div>
        <div className="rounded-md bg-amber-950/40 p-2">
          <p className="text-amber-300">Archived</p>
          <p className="text-base font-semibold text-amber-200">{archived}</p>
        </div>
      </div>
    </article>
  );
}
`;
}

function frontendModuleTemplate({ pascalName, camelName, resource, premiumUI }) {
  const shellClass = premiumUI
    ? 'rounded-2xl border border-amber-300/30 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_rgba(15,23,42,0.94)_55%)] p-4 md:p-6'
    : 'rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5';

  return `import { useMemo, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { use${pascalName} } from '../../hooks/use${pascalName}';
import { ${pascalName}StatsCard } from '../../components/${resource}/${pascalName}StatsCard';

export function ${pascalName}Module() {
  const [name, setName] = useState('');
  const { rows, loading, create, remove } = use${pascalName}();

  const metrics = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => String(row.status || '').toLowerCase() === 'active').length;
    return {
      total,
      active,
      archived: Math.max(total - active, 0),
    };
  }, [rows]);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">Module</p>
        <h2 className="text-xl font-semibold text-slate-100">${pascalName}</h2>
        <p className="text-sm text-slate-400">Generated ${premiumUI ? 'Premium UI' : 'SaaS'} experience for ${pascalName}.</p>
      </header>

      <div className="${shellClass}">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <article className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="New ${pascalName} name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={() => {
                  const trimmed = name.trim();
                  if (!trimmed) return;
                  void create({ name: trimmed });
                  setName('');
                }}
              >
                Create
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/90 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                        {loading ? 'Loading...' : 'No records found.'}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-800/80">
                        <td className="px-3 py-2 text-slate-100">{row.name}</td>
                        <td className="px-3 py-2 text-slate-300">{row.status}</td>
                        <td className="px-3 py-2 text-slate-400">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" size="sm" onClick={() => void remove(row.id)}>
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <${pascalName}StatsCard total={metrics.total} active={metrics.active} archived={metrics.archived} />
        </div>
      </div>
    </section>
  );
}
`;
}

function frontendPageEntryTemplate({ pascalName, resource }) {
  return `export { ${pascalName}Module as ${pascalName}Page } from '../../modules/${resource}/${pascalName}Module';
`;
}

function docsTemplate({ pascalName, camelName, resource, action, premiumUI }) {
  return `# ${pascalName} Module

- Generated by: ai-engine SaaS generator
- Action: ${action}
- Premium UI mode: ${premiumUI ? 'enabled' : 'disabled'}
- API Base: /api/${resource}

## Backend artifacts

- routes/${resource}.js
- controllers/${camelName}Controller.js
- services/${camelName}Service.js
- repositories/${camelName}Repository.js
- backend/modules/${resource}/${resource}.schema.json
- backend/modules/${resource}/${resource}.workflow.json

## Frontend artifacts

- frontend/src/modules/${resource}/${pascalName}Module.tsx
- frontend/src/pages/${resource}/index.tsx
- frontend/src/hooks/use${pascalName}.ts
- frontend/src/components/${resource}/${pascalName}StatsCard.tsx

## Notes

- Generated files are idempotent and skip existing artifacts.
- Server and frontend registries are patched automatically when anchors are found.
`;
}

async function patchBackendRegistries(projectRoot, meta, changes) {
  const { camelName, resource } = meta;

  await patchFile(path.join(projectRoot, 'backend', 'routes', 'index.js'), (content) => {
    return injectBeforeLine(content, '};', `  ${resource}: require('../../routes/${resource}'),`);
  }, changes);

  await patchFile(path.join(projectRoot, 'backend', 'controllers', 'index.js'), (content) => {
    return injectBeforeLine(content, '};', `  ${resource}: require('../../controllers/${camelName}Controller'),`);
  }, changes);

  await patchFile(path.join(projectRoot, 'backend', 'services', 'index.js'), (content) => {
    return injectBeforeLine(content, '};', `  ${camelName}Service: require('../../services/${camelName}Service'),`);
  }, changes);

  await patchFile(path.join(projectRoot, 'backend', 'repositories', 'index.js'), (content) => {
    return injectBeforeLine(content, '};', `  ${camelName}Repository: require('../../repositories/${camelName}Repository'),`);
  }, changes);

  await patchFile(path.join(projectRoot, 'server.js'), (content) => {
    let updated = content;
    updated = injectAfterLine(updated, "const integrationsRouter = require('./routes/integrations');", `const ${camelName}Router = require('./routes/${resource}');`);
    updated = injectAfterLine(updated, "app.use('/', integrationsRouter);", `app.use('/', ${camelName}Router);`);
    return updated;
  }, changes);
}

async function patchFrontendRegistries(projectRoot, meta, changes) {
  const { pascalName, resource } = meta;

  await patchFile(path.join(projectRoot, 'frontend', 'src', 'App.tsx'), (content) => {
    let updated = content;
    const importLine = `const ${pascalName}Page = lazy(() => import('./pages/${resource}').then((module) => ({ default: module.${pascalName}Page })));`;
    updated = injectAfterLine(updated, "const SettingsPage = lazy(() => import('./pages/settings').then((module) => ({ default: module.SettingsPage })));", importLine);
    updated = injectAfterLine(updated, "        {section === 'settings' ? <SettingsPage /> : null}", `        {section === '${resource}' ? <${pascalName}Page /> : null}`);
    return updated;
  }, changes);

  await patchFile(path.join(projectRoot, 'frontend', 'src', 'store', 'useAppStore.ts'), (content) => {
    let updated = content;
    updated = injectBeforeLine(updated, "  | 'settings';", `  | '${resource}'`);
    updated = injectBeforeLine(updated, "  | 'diagnostics';", `  | '${resource}'`);
    return updated;
  }, changes);

  await patchFile(path.join(projectRoot, 'frontend', 'src', 'layout', 'Sidebar.tsx'), (content) => {
    let updated = content;
    updated = updated.replace(
      "import { Activity, Contact, LayoutDashboard, Megaphone, MessageCircle, Settings, Shuffle } from 'lucide-react';",
      "import { Activity, Boxes, Contact, LayoutDashboard, Megaphone, MessageCircle, Settings, Shuffle } from 'lucide-react';"
    );
    updated = injectAfterLine(updated, "  { key: 'settings', label: 'Settings', icon: Settings },", `  { key: '${resource}', label: '${pascalName}', icon: Boxes },`);
    return updated;
  }, changes);

  await patchFile(path.join(projectRoot, 'frontend', 'src', 'layout', 'AppLayout.tsx'), (content) => {
    return injectAfterLine(content, "  settings: 'Settings',", `  '${resource}': '${pascalName}',`);
  }, changes);
}

async function generateSaaSArtifact({ projectRoot, action, entityName, premiumUI = false }) {
  const resource = toKebabCase(entityName);
  if (!resource) {
    throw new Error('entityName is required.');
  }

  const pascalName = toPascalCase(entityName);
  const camelName = toCamelCase(entityName);
  const snakeName = toSnakeCase(entityName);
  const tableName = `crm_${snakeName}`;

  const changes = {
    created: [],
    updated: [],
    skipped: [],
  };

  const scan = await scanProject({ projectRoot, entityName: resource });

  const files = {
    repository: path.join(projectRoot, 'repositories', `${camelName}Repository.js`),
    service: path.join(projectRoot, 'services', `${camelName}Service.js`),
    controller: path.join(projectRoot, 'controllers', `${camelName}Controller.js`),
    route: path.join(projectRoot, 'routes', `${resource}.js`),
    moduleIndex: path.join(projectRoot, 'backend', 'modules', resource, 'index.js'),
    schema: path.join(projectRoot, 'backend', 'modules', resource, `${resource}.schema.json`),
    workflow: path.join(projectRoot, 'backend', 'modules', resource, `${resource}.workflow.json`),
    hook: path.join(projectRoot, 'frontend', 'src', 'hooks', `use${pascalName}.ts`),
    component: path.join(projectRoot, 'frontend', 'src', 'components', resource, `${pascalName}StatsCard.tsx`),
    module: path.join(projectRoot, 'frontend', 'src', 'modules', resource, `${pascalName}Module.tsx`),
    pageEntry: path.join(projectRoot, 'frontend', 'src', 'pages', resource, 'index.tsx'),
    docs: path.join(projectRoot, 'docs', 'modules', `${resource}.md`),
  };

  const meta = {
    resource,
    pascalName,
    camelName,
    tableName,
  };

  await ensureFile(files.repository, backendRepositoryTemplate(meta), changes);
  await ensureFile(files.service, backendServiceTemplate(meta), changes);
  await ensureFile(files.controller, backendControllerTemplate(meta), changes);
  await ensureFile(files.route, backendRouteTemplate(meta), changes);
  await ensureFile(files.moduleIndex, backendModuleIndexTemplate(meta), changes);
  await ensureFile(files.schema, schemaTemplate(meta), changes);
  await ensureFile(files.workflow, workflowTemplate(meta), changes);
  await ensureFile(files.hook, frontendHookTemplate(meta), changes);
  await ensureFile(files.component, frontendComponentTemplate(meta), changes);
  await ensureFile(files.module, frontendModuleTemplate({ ...meta, premiumUI }), changes);
  await ensureFile(files.pageEntry, frontendPageEntryTemplate(meta), changes);
  await ensureFile(files.docs, docsTemplate({ ...meta, action, premiumUI }), changes);

  await patchBackendRegistries(projectRoot, meta, changes);
  await patchFrontendRegistries(projectRoot, meta, changes);

  for (const [name, filePath] of Object.entries(files)) {
    if (changes.created.includes(filePath) || changes.updated.includes(filePath)) {
      continue;
    }

    if (await exists(filePath)) {
      changes.skipped.push({ artifact: name, filePath, reason: 'already-exists-or-patched' });
    }
  }

  return {
    success: true,
    action,
    module: resource,
    premiumUI,
    scan,
    changes,
  };
}

module.exports = {
  generateSaaSArtifact,
};
