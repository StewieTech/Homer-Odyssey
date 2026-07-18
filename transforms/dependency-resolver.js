'use strict';

const { sortedUnique } = require('../src/stable');

function allowedKeys(profile) {
  return new Set([
    ...profile.packageAllowlist.characters.map((id) => `character:${id}`),
    ...profile.packageAllowlist.skills.map((id) => `skill:${id}`),
  ]);
}

function resolveDependencies(catalog, profile) {
  const byKey = new Map(catalog.packages.map((item) => [item.key, item]));
  const allowed = allowedKeys(profile);
  const issues = [...catalog.conflicts, ...catalog.packages.flatMap((item) => item.issues)];
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];
  const cycles = new Set();

  function visit(key, stack = []) {
    if (visiting.has(key)) {
      const cycle = [...stack.slice(stack.indexOf(key)), key];
      const signature = cycle.join(' -> ');
      if (!cycles.has(signature)) {
        cycles.add(signature);
        issues.push({ type: 'circular-dependency', package: key, paths: cycle, message: signature });
      }
      return;
    }
    if (visited.has(key)) return;
    const item = byKey.get(key);
    if (!item) {
      issues.push({ type: 'missing-delegate', package: stack.at(-1) || 'profile', dependency: key, message: `Missing package ${key}` });
      return;
    }
    if (!allowed.has(key)) {
      issues.push({ type: 'target-incompatible', package: key, message: `Package is not allowlisted by profile ${profile.id}` });
      return;
    }
    if (!item.descriptor.compatibility.targets.includes(profile.id)) {
      issues.push({ type: 'target-incompatible', package: key, message: `Package does not declare compatibility with ${profile.id}` });
      return;
    }
    visiting.add(key);
    for (const dependency of item.dependencies) visit(dependency, [...stack, key]);
    visiting.delete(key);
    visited.add(key);
    ordered.push(item);
  }

  for (const key of [...allowed].sort()) visit(key);
  return {
    packages: ordered,
    issues: issues.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    packageIds: sortedUnique(ordered.map((item) => item.key)),
  };
}

module.exports = { resolveDependencies };
