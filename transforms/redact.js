'use strict';

const secretPatterns = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[A-Z0-9]{16}\b/g,
];

function redact(content) {
  return secretPatterns.reduce((result, pattern) => result.replace(pattern, '[REDACTED]'), content);
}

module.exports = { redact, secretPatterns };
