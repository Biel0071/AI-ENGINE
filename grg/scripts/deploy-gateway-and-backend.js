'use strict';

const error = new Error(
  'This PM2 deployment path is retired. The active VPS uses a Docker-based runtime; verify source parity and use the reviewed release procedure before deploying.'
);
error.code = 'LEGACY_DEPLOY_DISABLED';
throw error;
