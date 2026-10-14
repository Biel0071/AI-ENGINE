'use strict';
const error = new Error('Legacy administrator password reset is disabled. Use the supported authenticated account recovery flow.');
error.code = 'LEGACY_ADMIN_RESET_DISABLED';
throw error;