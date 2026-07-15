'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveDependencies } = require('../transforms/dependency-resolver');

function item(key, dependencies = [], targets = ['studio'], issues = []) {
  const [type, id] = key.split(':');
  return { key, type, id, dependencies, issues, descriptor: { compatibility: { targets } } };
}

function profile(skills) {
  return { id: 'studio', packageAllowlist: { characters: [], skills } };
}

test('dependency resolver reports circular dependencies', () => {
  const catalog = { packages: [item('skill:a', ['skill:b']), item('skill:b', ['skill:a'])], conflicts: [] };
  const result = resolveDependencies(catalog, profile(['a', 'b']));
  assert.ok(result.issues.some((issue) => issue.type === 'circular-dependency'));
});

test('dependency resolver reports missing delegates and incompatibility', () => {
  const catalog = { packages: [item('skill:a', ['skill:missing']), item('skill:b', [], ['pariss'])], conflicts: [] };
  const result = resolveDependencies(catalog, profile(['a', 'b', 'missing']));
  assert.ok(result.issues.some((issue) => issue.type === 'missing-delegate'));
  assert.ok(result.issues.some((issue) => issue.type === 'target-incompatible'));
});

test('dependency resolver preserves same-name and reference conflicts', () => {
  const catalog = {
    packages: [item('skill:a', [], ['studio'], [{ type: 'nonexistent-reference', package: 'skill:a', path: 'missing.md', message: 'missing' }])],
    conflicts: [{ type: 'same-name-conflict', package: 'skill:a', paths: ['one', 'two'], message: 'duplicate' }],
  };
  const result = resolveDependencies(catalog, profile(['a']));
  assert.ok(result.issues.some((issue) => issue.type === 'same-name-conflict'));
  assert.ok(result.issues.some((issue) => issue.type === 'nonexistent-reference'));
});
