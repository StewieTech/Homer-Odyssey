'use strict';

function classifyArtifact(sourcePath) {
  const match = /^packages\/(characters|skills)\/([^/]+)\/(.+)$/.exec(sourcePath);
  if (!match) return { portable: false, packageType: null, packageId: null, surface: 'other' };
  const relative = match[3];
  let surface = 'reference';
  if (relative === 'passport.json' || relative === 'manifest.json') surface = 'manifest';
  else if (relative === 'core.md') surface = 'core';
  else if (relative.startsWith('helpers/')) surface = 'helper';
  else if (relative.startsWith('commands/')) surface = 'command';
  else if (relative.startsWith('workflows/')) surface = 'workflow';
  else if (relative.startsWith('templates/')) surface = 'template';
  else if (relative.startsWith('evals/')) surface = 'eval';
  return { portable: true, packageType: match[1], packageId: match[2], surface };
}

module.exports = { classifyArtifact };
