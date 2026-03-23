import { BusinessRule, FeatureAction, FeatureDefinition, FeatureEntity, FeatureUIScreen } from './types';

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function toSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/\s+/g, '_');
}

function parseEntities(prompt: string): FeatureEntity[] {
  if (hasAny(prompt, ['campaign', 'campanha'])) {
    return [
      {
        name: 'Campaign',
        fields: ['id', 'name', 'message', 'status', 'createdAt', 'updatedAt'],
        description: 'Marketing campaign with message payload and lifecycle status.',
      },
      {
        name: 'Contact',
        fields: ['id', 'name', 'phone', 'segment', 'createdAt'],
        description: 'Audience contact eligible to receive campaign messages.',
      },
      {
        name: 'MessageDispatch',
        fields: ['id', 'campaignId', 'contactId', 'status', 'sentAt'],
        description: 'A message dispatch execution for campaign recipients.',
      },
    ];
  }

  const knownEntityMap: Array<{ hints: string[]; entity: FeatureEntity }> = [
    {
      hints: ['campaign', 'campanha'],
      entity: {
        name: 'Campaign',
        fields: ['id', 'name', 'message', 'status', 'createdAt', 'updatedAt'],
        description: 'Marketing campaign with message payload and lifecycle status.',
      },
    },
    {
      hints: ['contact', 'lead', 'cliente'],
      entity: {
        name: 'Contact',
        fields: ['id', 'name', 'phone', 'segment', 'createdAt'],
        description: 'Audience contact eligible to receive campaign messages.',
      },
    },
    {
      hints: ['message', 'dispatch', 'delivery', 'envio'],
      entity: {
        name: 'MessageDispatch',
        fields: ['id', 'campaignId', 'contactId', 'status', 'sentAt'],
        description: 'A message dispatch execution for campaign recipients.',
      },
    },
  ];

  const matches = knownEntityMap
    .filter((candidate) => hasAny(prompt, candidate.hints))
    .map((candidate) => candidate.entity);

  if (matches.length > 0) {
    return matches;
  }

  return [
    {
      name: 'Item',
      fields: ['id', 'name', 'createdAt', 'updatedAt'],
      description: 'Generic business entity inferred from the requested feature.',
    },
  ];
}

function parseActions(prompt: string): FeatureAction[] {
  if (hasAny(prompt, ['campaign', 'campanha'])) {
    return [
      {
        name: 'create_campaign',
        description: 'Create a new campaign draft.',
        method: 'POST',
        route: '/campaigns',
      },
      {
        name: 'list_campaigns',
        description: 'List campaigns ordered by creation date.',
        method: 'GET',
        route: '/campaigns',
      },
      {
        name: 'send_messages',
        description: 'Dispatch campaign messages to selected contacts.',
        method: 'POST',
        route: '/campaigns/:id/send',
      },
      {
        name: 'track_status',
        description: 'Track campaign delivery status and timestamps.',
        method: 'GET',
        route: '/campaigns/:id/status',
      },
    ];
  }

  const actions: FeatureAction[] = [];

  if (hasAny(prompt, ['create', 'new', 'criar'])) {
    actions.push({
      name: 'create_campaign',
      description: 'Create a new campaign draft.',
      method: 'POST',
      route: '/campaigns',
    });
  }

  if (hasAny(prompt, ['list', 'history', 'listar'])) {
    actions.push({
      name: 'list_campaigns',
      description: 'List campaigns ordered by creation date.',
      method: 'GET',
      route: '/campaigns',
    });
  }

  if (hasAny(prompt, ['send', 'dispatch', 'enviar'])) {
    actions.push({
      name: 'send_messages',
      description: 'Dispatch campaign messages to selected contacts.',
      method: 'POST',
      route: '/campaigns/:id/send',
    });
  }

  if (hasAny(prompt, ['status', 'track', 'monitor', 'acompanhar'])) {
    actions.push({
      name: 'track_status',
      description: 'Track campaign delivery status and timestamps.',
      method: 'GET',
      route: '/campaigns/:id/status',
    });
  }

  if (actions.length > 0) {
    return actions;
  }

  return [
    {
      name: 'create_item',
      description: 'Create a generic entity.',
      method: 'POST',
      route: '/items',
    },
    {
      name: 'list_items',
      description: 'List generic entities.',
      method: 'GET',
      route: '/items',
    },
  ];
}

function parseUiScreens(prompt: string): FeatureUIScreen[] {
  if (hasAny(prompt, ['campaign', 'campanha'])) {
    return [
      {
        name: 'campaign_list',
        description: 'List campaigns with status and quick actions.',
        components: ['DataTable', 'StatusBadge', 'ActionButton'],
      },
      {
        name: 'campaign_builder',
        description: 'Compose campaign content and targeting setup.',
        components: ['FormCard', 'TextInput', 'TextareaInput'],
      },
      {
        name: 'preview_panel',
        description: 'Preview outbound message payload before send.',
        components: ['PreviewCard', 'DeviceMock'],
      },
      {
        name: 'history_panel',
        description: 'Display delivery timeline and previous runs.',
        components: ['TimelineList', 'StatusBadge'],
      },
    ];
  }

  return [
    {
      name: 'list_page',
      description: 'Primary listing screen for generated entities.',
      components: ['DataTable', 'EmptyState'],
    },
    {
      name: 'create_modal',
      description: 'Creation modal for new records.',
      components: ['Modal', 'FormActions'],
    },
  ];
}

function parseBusinessRules(prompt: string): BusinessRule[] {
  const rules: BusinessRule[] = [];

  if (hasAny(prompt, ['campaign', 'campanha'])) {
    rules.push({
      id: 'campaign_requires_message',
      description: 'A campaign cannot be created without a non-empty message body.',
    });
    rules.push({
      id: 'campaign_name_min_length',
      description: 'Campaign name must have at least 3 characters.',
    });
  }

  if (hasAny(prompt, ['whatsapp', 'wpp', 'zap'])) {
    rules.push({
      id: 'phone_must_be_e164',
      description: 'Contacts must use E.164 compatible phone format.',
    });
    rules.push({
      id: 'send_only_draft_or_paused',
      description: 'Only campaigns in draft or paused status can be sent.',
    });
  }

  if (rules.length > 0) {
    return rules;
  }

  return [
    {
      id: 'default_validation_required',
      description: 'Generated entities must pass DTO validation before persistence.',
    },
  ];
}

export function interpretFeature(prompt: string): FeatureDefinition {
  const normalizedPrompt = prompt.trim().toLowerCase();

  if (!normalizedPrompt) {
    throw new Error('Prompt is required to interpret a feature.');
  }

  const isCampaign = hasAny(normalizedPrompt, ['campaign', 'campanha']);
  const isWhatsapp = hasAny(normalizedPrompt, ['whatsapp', 'wpp', 'zap']);
  const featureName = prompt.trim();

  const feature = isCampaign && isWhatsapp
    ? 'campaign_system'
    : toSlug(featureName);

  const actions = parseActions(normalizedPrompt);
  const uiScreens = parseUiScreens(normalizedPrompt);

  return {
    feature,
    featureName,
    modules: isCampaign ? ['campaigns', 'contacts', 'messages'] : ['core'],
    backend: actions.map((action) => action.name),
    frontend: uiScreens.map((screen) => screen.name),
    entities: parseEntities(normalizedPrompt),
    actions,
    uiScreens,
    businessRules: parseBusinessRules(normalizedPrompt),
    style: {
      theme: 'dark',
      lookAndFeel: 'modern_saas_linear_stripe',
    },
  };
}
