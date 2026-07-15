'use strict';

const API_VERSION = 'homer.odyssey/v1';
const VERSION = '0.1.0';

const EXIT = Object.freeze({
  OK: 0,
  USAGE: 2,
  INVALID_CONTRACT: 10,
  MISSING_DEPENDENCY: 11,
  PROTECTED_CONFLICT: 12,
  UNSAFE_PRIVILEGE: 13,
  CUSTOMIZATION_CONFLICT: 14,
  INTERNAL: 70,
});

module.exports = { API_VERSION, EXIT, VERSION };
