function buildBackendArchitectureNotes(feature = '') {
  return {
    architecture: 'modular-service-event-queue',
    feature,
    modules: [
      'controller',
      'service',
      'repository',
      'events',
      'queue',
      'contracts',
    ],
    constraints: [
      'Keep controller thin and delegate business logic to services.',
      'Emit domain events from service layer.',
      'Use queue handlers for async workloads.',
      'Keep backward-compatible route contracts.',
    ],
  };
}

function scaffoldBackendEnhancements(featureSlug = '', featureComponent = '') {
  return [
    {
      path: `backend/src/modules/${featureSlug}/${featureSlug}.events.ts`,
      content: [
        `export const ${featureComponent}Events = {`,
        `  CREATED: '${featureSlug}.created',`,
        `  UPDATED: '${featureSlug}.updated',`,
        '};',
      ].join('\n'),
    },
    {
      path: `backend/src/modules/${featureSlug}/${featureSlug}.queue.ts`,
      content: [
        `import { ${featureComponent}Events } from './${featureSlug}.events';`,
        '',
        `export const ${featureComponent}Queue = {`,
        '  enqueue(eventType, payload) {',
        '    return { eventType, payload, queuedAt: new Date().toISOString() };',
        '  },',
        '',
        '  onCreated(payload) {',
        `    return this.enqueue(${featureComponent}Events.CREATED, payload);`,
        '  },',
        '};',
      ].join('\n'),
    },
  ];
}

module.exports = {
  buildBackendArchitectureNotes,
  scaffoldBackendEnhancements,
};
