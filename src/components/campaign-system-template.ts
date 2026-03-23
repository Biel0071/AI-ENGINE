import { FeatureDefinition, GeneratedFile } from '../../core/types';

export function frontendTemplate(feature: FeatureDefinition): GeneratedFile[] {
  return [
    {
      path: 'frontend/.env',
      content: 'VITE_API_BASE_URL=http://localhost:4000/api',
    },
    {
      path: 'frontend/.env.example',
      content: 'VITE_API_BASE_URL=http://localhost:4000/api',
    },
    {
      path: 'frontend/README.md',
      content: [
        `# ${feature.feature} frontend`,
        '',
        '## Run',
        '1. npm install',
        '2. npm run dev',
      ].join('\n'),
    },
  ];
}
