'use strict';

const { HomerError } = require('./errors');
const { EXIT } = require('./constants');

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  return value;
}

function parseSimpleYaml(content, sourceName = 'homer.yaml') {
  const result = {};
  for (const [index, original] of content.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/.exec(line);
    if (!match || match[2] === '') {
      throw new HomerError(`${sourceName}:${index + 1}: only scalar top-level key/value pairs are supported`, EXIT.INVALID_CONTRACT);
    }
    if (Object.hasOwn(result, match[1])) {
      throw new HomerError(`${sourceName}:${index + 1}: duplicate key ${match[1]}`, EXIT.INVALID_CONTRACT);
    }
    result[match[1]] = unquote(match[2].replace(/\s+#.*$/, ''));
  }
  return result;
}

module.exports = { parseSimpleYaml };
