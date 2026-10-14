'use strict';
const error = new Error('Legacy API Platform patch/deploy script is disabled. Use the reviewed authenticated API and Docker release path.');
error.code = 'LEGACY_API_PLATFORM_PATCH_DISABLED';
throw error;