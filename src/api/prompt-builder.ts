import { FeatureDefinition } from './types';

export function buildBackendPrompt(feature: FeatureDefinition): string {
  const entityLines = feature.entities.map((entity) => `${entity.name}(${entity.fields.join(', ')})`).join('; ');
  const actionLines = feature.actions
    .map((action) => `${action.method} ${action.route} => ${action.name}`)
    .join('; ');
  const rules = feature.businessRules.map((rule) => `[${rule.id}] ${rule.description}`).join('; ');

  return [
    `Generate backend for feature: ${feature.feature}`,
    `Modules: ${feature.modules.join(', ')}`,
    `Entities: ${entityLines}`,
    `Endpoints/actions: ${actionLines}`,
    `Business rules: ${rules}`,
    'Use clean architecture with modules, controllers, services, repositories, DTO validation and Prisma models.',
  ].join('\n');
}

export function buildFrontendPrompt(feature: FeatureDefinition): string {
  const screens = feature.uiScreens.map((screen) => `${screen.name}(${screen.components.join(', ')})`).join('; ');
  const rules = feature.businessRules.map((rule) => rule.description).join('; ');

  return [
    `Generate frontend for feature: ${feature.feature}`,
    `Views/components: ${screens}`,
    `Business constraints reflected in UI: ${rules}`,
    'Use React + TypeScript + TailwindCSS with dark mode and modern SaaS style.',
    'Include layout with sidebar + topbar, loading states, empty states and reusable UI components.',
  ].join('\n');
}
