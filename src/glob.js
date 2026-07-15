'use strict';

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function globToRegExp(pattern) {
  const normalized = normalizePath(pattern);
  let expression = '^';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '*' && normalized[index + 1] === '*') {
      expression += '.*';
      index += 1;
    } else if (character === '*') {
      expression += '[^/]*';
    } else if (character === '?') {
      expression += '[^/]';
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${expression}$`);
}

function matchesAny(candidate, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(normalizePath(candidate)));
}

function mapPath(candidate, mapping) {
  const source = normalizePath(mapping.source);
  const target = normalizePath(mapping.target);
  if (!globToRegExp(source).test(normalizePath(candidate))) return null;
  if (source.endsWith('/**') && target.endsWith('/**')) {
    return `${target.slice(0, -3)}/${normalizePath(candidate).slice(source.length - 2)}`.replaceAll('//', '/');
  }
  return target.replace('/**', '');
}

module.exports = { globToRegExp, mapPath, matchesAny, normalizePath };
