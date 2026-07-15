'use strict';

const crypto = require('node:crypto');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function stableJson(value, spacing = 0) {
  return JSON.stringify(canonicalize(value), null, spacing);
}

function hashBytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashObject(value) {
  return hashBytes(stableJson(value));
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

module.exports = { canonicalize, hashBytes, hashObject, sortedUnique, stableJson };
