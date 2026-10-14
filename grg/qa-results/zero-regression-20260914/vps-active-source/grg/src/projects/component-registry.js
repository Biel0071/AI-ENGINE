'use strict';
/**
 * FÊNIX OS V8.3 — Component Registry & Cross-Project Reuse Engine
 * Indexes UI and architectural components across all registered projects,
 * evaluates AST/stack compatibility, and guides intelligent adaptation.
 */

const COMPONENTS = [
  {
    id: 'zapai-active-chat-pane',
    name: 'ActiveChatPane',
    origin: 'zapai-crm',
    project: 'zapai-crm',
    file: 'frontend-official/src/pages/Inbox/components/ActiveChatPane.tsx',
    category: 'Chat',
    stack: 'React 18 + Tailwind CSS + Lucide Icons',
    dependencies: ['lucide-react', 'clsx', 'tailwind-merge'],
    behavior: 'Realtime message streaming, typing indicator, quick reply trigger, media attachment preview',
    design: 'Tailwind dark-mode slate/emerald theme, rounded-2xl, auto-scrolling virtualized list',
    tests: ['frontend-official/tests/ui/hardening-stress.spec.ts'],
    compatibility: {
      'fenix-os': 'Requires React root or Web Component wrapper (Fênix core is Vanilla + PixiJS)',
      'api-platform': 'Directly adaptable to Vite/React dashboard'
    }
  },
  {
    id: 'zapai-quick-response-modal',
    name: 'QuickResponseModal',
    origin: 'zapai-crm',
    project: 'zapai-crm',
    file: 'frontend-official/src/pages/Inbox/components/QuickResponseModal.tsx',
    category: 'Modal',
    stack: 'React 18 + Radix UI Dialog + Tailwind CSS',
    dependencies: ['@radix-ui/react-dialog', 'lucide-react'],
    behavior: 'Keyboard shortcuts (Cmd+K), category filtering, inline variable interpolation ({name}, {ticket})',
    design: 'Floating modal, blur backdrop, search input with instant debounce filter',
    tests: ['frontend-official/tests/ui/hardening-stress.spec.ts'],
    compatibility: {
      'fenix-os': 'Adaptable to Command Palette',
      'api-platform': 'Reusable for Prompt Template Selector'
    }
  },
  {
    id: 'zapai-conversation-row',
    name: 'ConversationRow',
    origin: 'zapai-crm',
    project: 'zapai-crm',
    file: 'frontend-official/src/pages/Inbox/components/ConversationRow.tsx',
    category: 'Card',
    stack: 'React 18 + Tailwind CSS',
    dependencies: ['lucide-react'],
    behavior: 'Contact avatar with consistent fallback, unread badge, last message snippet, channel badge (WhatsApp)',
    design: 'Compact list item with hover state, active border indicator',
    tests: ['frontend-official/tests/ui/hardening-stress.spec.ts'],
    compatibility: {
      'fenix-os': 'High compatibility for Agent Feed list',
      'api-platform': 'High compatibility for Request Log items'
    }
  },
  {
    id: 'fenix-city-canvas',
    name: 'CityCanvas',
    origin: 'fenix-os',
    project: 'fenix-os',
    file: 'public/iso-city.js',
    category: 'Engine',
    stack: 'Vanilla ES6 + PixiJS 8 (WebGL / WebGPU)',
    dependencies: ['pixi.js'],
    behavior: '2.5D Isometric rendering, pan, semantic zoom, building interior drill-down, agent walking pathfinding',
    design: 'Cyberpunk glassmorphism UI overlay on isometric grid',
    tests: ['test_v82_verification.js'],
    compatibility: {
      'zapai-crm': 'Embeddable as iframe or canvas widget in AdminHub',
      'api-platform': 'Embeddable in Observability tab'
    }
  },
  {
    id: 'fenix-fast-lane-bar',
    name: 'FastLaneBar',
    origin: 'fenix-os',
    project: 'fenix-os',
    file: 'public/fenix-v8-ui.js',
    category: 'Navigation',
    stack: 'Vanilla ES6 + CSS Variables',
    dependencies: [],
    behavior: 'Instant model switching chips ([FAST] [QWEN] [AUTO]), live token accounting, latency monitor',
    design: 'Sleek neon border, monospace telemetry, non-intrusive topbar integration',
    tests: ['test_v82_verification.js'],
    compatibility: {
      'zapai-crm': 'Adaptable to AI Assistant Header',
      'api-platform': '100% compatible for Provider Switcher'
    }
  },
  {
    id: 'ap-provider-card',
    name: 'ProviderCard',
    origin: 'api-platform',
    project: 'api-platform',
    file: 'apps/dashboard/public/app.js',
    category: 'Card',
    stack: 'Vanilla JS + Modern CSS',
    dependencies: [],
    behavior: 'Displays latency gauge, cost per 1M tokens, active status toggle, health check indicator',
    design: 'Dark glassmorphic card with gradient borders',
    tests: ['tests/api.test.ts'],
    compatibility: {
      'fenix-os': 'Can be directly integrated into Fênix Connections / Models view',
      'zapai-crm': 'Reusable for AI Providers configuration'
    }
  }
];

function searchComponents(query, stackFilter) {
  if (!query && !stackFilter) return COMPONENTS;
  const q = (query || '').toLowerCase();
  const s = (stackFilter || '').toLowerCase();
  return COMPONENTS.filter(c => {
    const matchQuery = !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.behavior.toLowerCase().includes(q);
    const matchStack = !s || c.stack.toLowerCase().includes(s);
    return matchQuery && matchStack;
  });
}

function analyzeCompatibility(componentId, targetProjectId) {
  const component = COMPONENTS.find(c => c.id === componentId || c.name.toLowerCase() === componentId.toLowerCase());
  if (!component) return { ok: false, error: 'Component not found' };

  const targetCompat = (component.compatibility || {})[targetProjectId];
  return {
    ok: true,
    component: component.name,
    originProject: component.project,
    targetProject: targetProjectId,
    originStack: component.stack,
    assessment: targetCompat || 'Compatible with standard bundler translation',
    recommendedAction: component.project === targetProjectId ? 'DIRECT_USE' : 'ADAPT_AND_IMPORT',
    requiredDependencies: component.dependencies,
  };
}

module.exports = { COMPONENTS, searchComponents, analyzeCompatibility };
