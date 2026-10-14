'use strict';
const error = new Error('Legacy local restart helper is disabled; it killed a fixed process and injected development authentication.');
error.code = 'LEGACY_RESTART_DISABLED';
throw error;