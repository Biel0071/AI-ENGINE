function buildComponent(name, description, tokensUsed = [], variants = []) {
  return {
    name,
    description,
    tokensUsed,
    variants,
    reusable: true,
  };
}

function generateReusableComponents(designTokens = {}) {
  const colorTokens = Object.keys(designTokens.colors || {});
  const spacingTokens = Object.keys(designTokens.spacing || {});

  return [
    buildComponent('Button', 'Primary action button with semantic states and accessible contrast.', ['colors.primary', 'spacing.12', 'radius.md', 'typography.fontWeight.semibold'], ['primary', 'secondary', 'ghost']),
    buildComponent('Card', 'Surface container for grouped information blocks.', ['colors.surface', 'colors.border', 'radius.lg', 'shadows.md', 'spacing.16'], ['default', 'elevated']),
    buildComponent('Input', 'Text input field with clear focus and validation states.', ['colors.surface', 'colors.border', 'colors.text.primary', 'radius.md', 'spacing.12'], ['default', 'error', 'success']),
    buildComponent('Badge', 'Small status label for quick contextual signals.', ['colors.primary', 'colors.text.primary', 'spacing.8', 'radius.sm', 'typography.fontSize.xs'], ['info', 'success', 'warning', 'danger']),
    buildComponent('Avatar', 'Profile image with fallback initials and status ring.', ['radius.xl', 'colors.border', 'shadows.sm'], ['sm', 'md', 'lg']),
    buildComponent('ChatBubble', 'Message bubble used in conversation streams.', ['colors.surface', 'colors.primary', 'spacing.12', 'radius.lg', 'typography.lineHeight.normal'], ['incoming', 'outgoing']),
    buildComponent('SidebarItem', 'Navigation item for left-side navigation stacks.', ['colors.text.secondary', 'colors.hover.surface', 'spacing.12', 'radius.md'], ['default', 'active']),
    buildComponent('Header', 'Top header container for actions, title and context.', ['layout.headerHeight', 'colors.surface', 'colors.border', 'spacing.16'], ['default', 'with-search']),
  ].map((component) => ({
    ...component,
    detectedTokenCount: colorTokens.length + spacingTokens.length,
  }));
}

function createComponentStandardizationPlan(components = []) {
  return components.map((component) => ({
    component: component.name,
    action: 'standardize',
    recommendation: `Adopt ${component.name} as a shared component with token-only styling.`,
  }));
}

module.exports = {
  generateReusableComponents,
  createComponentStandardizationPlan,
};
