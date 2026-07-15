'use strict';

const { EXIT } = require('./constants');

class HomerError extends Error {
  constructor(message, exitCode = EXIT.INTERNAL, details = []) {
    super(message);
    this.name = 'HomerError';
    this.exitCode = exitCode;
    this.details = details;
  }
}

module.exports = { HomerError };
