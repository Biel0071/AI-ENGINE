function buildT3BaseTemplate(context = {}) {
  const projectName = context.projectName || 'saas-app';

  return [
    {
      path: 'starter/package.json',
      content: JSON.stringify(
        {
          name: projectName,
          private: true,
          version: '0.1.0',
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
          },
          dependencies: {
            next: '^15.0.0',
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            '@tanstack/react-query': '^5.59.0',
            zod: '^3.25.0',
            tailwindcss: '^3.4.17',
            clsx: '^2.1.1',
          },
        },
        null,
        2,
      ),
    },
    {
      path: 'starter/src/app/layout.tsx',
      content: [
        "import './globals.css';",
        '',
        'export default function RootLayout({ children }: { children: React.ReactNode }) {',
        '  return (',
        '    <html lang="en">',
        '      <body>{children}</body>',
        '    </html>',
        '  );',
        '}',
      ].join('\n'),
    },
    {
      path: 'starter/src/app/page.tsx',
      content: [
        'export default function HomePage() {',
        '  return <main className="p-8">AI Engine Starter</main>;',
        '}',
      ].join('\n'),
    },
  ];
}

module.exports = {
  buildT3BaseTemplate,
};
