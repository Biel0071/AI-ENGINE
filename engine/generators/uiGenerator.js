const fs = require('fs/promises');
const path = require('path');

function toPascalCase(value) {
	return String(value || '')
		.split(/[^a-zA-Z0-9]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join('');
}

function resolveTokens(input = {}) {
	const tokens = input.designTokens || {};
	return {
		primary: (tokens.colors && tokens.colors.primary) || '#0f766e',
		background: (tokens.colors && tokens.colors.background) || '#f8fafc',
		text: (tokens.colors && tokens.colors.text && tokens.colors.text.primary) || '#0f172a',
	};
}

function createUILayout(feature = '', tokens = {}) {
	const component = toPascalCase(feature) || 'Feature';
	const primaryHex = tokens.primary;

	const page = [
		"import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';",
		"import { Button } from '@/components/ui/button';",
		`import { ${component}Widget } from '@/components/${component}Widget';`,
		'',
		`export default function ${component}Page() {`,
		'  return (',
		`    <main className=\"min-h-screen bg-slate-50 px-6 py-8 text-slate-900\">`,
		'      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[280px_1fr]">',
		'        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">',
		'          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Navigation</h2>',
		'          <ul className="mt-4 space-y-2 text-sm">',
		'            <li className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-900">Overview</li>',
		'            <li className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">Analytics</li>',
		'            <li className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">Automations</li>',
		'          </ul>',
		'        </aside>',
		'',
		'        <div className="space-y-6">',
		'          <Card className="border-slate-200 shadow-sm">',
		'            <CardHeader className="flex flex-row items-center justify-between">',
		`              <CardTitle className=\"text-2xl font-semibold\">${component} Control Center</CardTitle>`,
		`              <Button className=\"bg-[${primaryHex}] text-white hover:brightness-110\">Create ${component}</Button>`,
		'            </CardHeader>',
		'            <CardContent>',
		`              <${component}Widget />`,
		'            </CardContent>',
		'          </Card>',
		'        </div>',
		'      </section>',
		'    </main>',
		'  );',
		'}',
	].join('\n');

	const widget = [
		`export function ${component}Widget() {`,
		'  return (',
		'    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">',
		'      {Array.from({ length: 3 }).map((_, index) => (',
		'        <article key={index} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">',
		`          <h3 className=\"text-base font-semibold\">${component} Block {index + 1}</h3>`,
		'          <p className="mt-2 text-sm text-slate-600">Automatically generated premium SaaS layout block.</p>',
		'        </article>',
		'      ))}',
		'    </section>',
		'  );',
		'}',
	].join('\n');

	return {
		page,
		widget,
	};
}

class UIGenerator {
	async generate(input = {}) {
		const feature = String(input.feature || 'feature').trim();
		const outputRoot = path.resolve(input.outputRoot || process.cwd());
		const component = toPascalCase(feature) || 'Feature';
		const featureSlug = String(feature || 'feature')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');

		const tokens = resolveTokens(input.designSystemUsage || input);
		const layout = createUILayout(feature, tokens);

		const files = [
			{
				path: `frontend/src/pages/${featureSlug}/index.tsx`,
				content: layout.page,
			},
			{
				path: `frontend/src/components/${component}Widget.tsx`,
				content: layout.widget,
			},
		];

		for (const file of files) {
			const target = path.join(outputRoot, file.path);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, file.content, 'utf8');
		}

		return {
			files,
			uiPattern: {
				style: 'premium-saas',
				stack: 'shadcn-tailwind',
				tokenDriven: true,
			},
			constraints: input.uiConstraints || {
				enforceVisualConsistency: true,
			},
		};
	}
}

module.exports = {
	UIGenerator,
};
