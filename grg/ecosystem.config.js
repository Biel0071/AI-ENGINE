'use strict';

const error = new Error(
  'This PM2 ecosystem configuration is retired. The active VPS uses a Docker-based runtime.'
);
error.code = 'LEGACY_PM2_CONFIG_DISABLED';
throw error;
