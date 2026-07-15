'use strict';

const { assertContract } = require('./schema');

function runPackageEvals(packages, projections, profile) {
  const results = [];
  for (const item of packages) {
    const packageOutput = projections
      .filter((projection) => projection.sourcePath.startsWith(`${item.packageRoot}/`)
        && (projection.sourcePath.endsWith('/core.md') || projection.sourcePath.includes('/helpers/')))
      .map((projection) => projection.content)
      .join('\n');
    if (item.type === 'character') {
      for (const name of item.descriptor.evals) {
        const passed = name !== 'bounded-authority'
          || profile.capabilities.denied.every((capability) => item.descriptor.permissions.prohibited.includes(capability));
        results.push({ package: item.key, name, passed, message: passed ? 'Built-in character boundary passed' : 'Character does not prohibit every denied target capability' });
      }
      continue;
    }
    for (const evalPath of item.descriptor.evals) {
      const surface = item.surfaces.find((candidate) => candidate.path === evalPath);
      const evaluation = assertContract('package-eval', JSON.parse(surface.content));
      for (const assertion of evaluation.assertions) {
        const present = packageOutput.includes(assertion.value);
        const passed = assertion.type === 'contains' ? present : !present;
        results.push({ package: item.key, name: `${evaluation.name}:${assertion.type}:${assertion.value}`, passed, message: passed ? 'Assertion passed' : `Output ${assertion.type} assertion failed` });
      }
    }
  }
  return results.sort((left, right) => `${left.package}:${left.name}`.localeCompare(`${right.package}:${right.name}`));
}

module.exports = { runPackageEvals };
