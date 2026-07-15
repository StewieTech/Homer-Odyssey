'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { assertContract } = require('./schema');
const { normalizePath } = require('./glob');
const { hashObject, sortedUnique } = require('./stable');

function walk(directory, relative = '') {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(path.join(directory, relative), { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const child = path.join(relative, entry.name);
      return entry.isDirectory() ? walk(directory, child) : [normalizePath(child)];
    });
}

function packageKey(kind, id) {
  return `${kind === 'CharacterPassport' ? 'character' : 'skill'}:${id}`;
}

function declaredDependencies(descriptor) {
  if (descriptor.kind === 'CharacterPassport') {
    return sortedUnique([
      ...(descriptor.dependencies.characters || []).map((id) => `character:${id}`),
      ...(descriptor.dependencies.skills || []).map((id) => `skill:${id}`),
    ]);
  }
  return sortedUnique((descriptor.dependencies.packages || []).map((id) => id.includes(':') ? id : `skill:${id}`));
}

function declaredSurfacePaths(descriptor) {
  if (descriptor.kind === 'CharacterPassport') {
    return sortedUnique([...(descriptor.corePaths || []), ...(descriptor.dependencies.helpers || [])]);
  }
  return sortedUnique([
    ...(descriptor.corePaths || []),
    ...(descriptor.dependencies.helpers || []),
    ...(descriptor.references || []),
    ...(descriptor.commands || []),
    ...(descriptor.workflows || []),
    ...(descriptor.templates || []),
    ...(descriptor.evals || []),
  ]);
}

function localMarkdownReferences(content) {
  return [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim().split('#')[0])
    .filter((value) => value && !/^(?:[a-z]+:|#|\/\/)/i.test(value));
}

function loadPackage(descriptorPath, sourceRoot) {
  const absoluteDescriptor = path.join(sourceRoot, ...descriptorPath.split('/'));
  const descriptor = JSON.parse(fs.readFileSync(absoluteDescriptor, 'utf8'));
  const schemaName = descriptor.kind === 'CharacterPassport' ? 'character-passport' : 'skill-manifest';
  assertContract(schemaName, descriptor);
  const packageRoot = path.dirname(absoluteDescriptor);
  const relativePackageRoot = normalizePath(path.relative(sourceRoot, packageRoot));
  const declared = declaredSurfacePaths(descriptor);
  const issues = [];
  const surfaces = [];
  for (const relativeSurface of declared) {
    const normalized = normalizePath(relativeSurface);
    const absoluteSurface = path.resolve(packageRoot, normalized);
    if (!absoluteSurface.toLowerCase().startsWith(`${packageRoot.toLowerCase()}${path.sep}`)) {
      issues.push({ type: 'nonexistent-reference', package: packageKey(descriptor.kind, descriptor.id), path: normalized, message: 'Reference escapes package root' });
      continue;
    }
    if (!fs.existsSync(absoluteSurface) || !fs.statSync(absoluteSurface).isFile()) {
      issues.push({ type: 'nonexistent-reference', package: packageKey(descriptor.kind, descriptor.id), path: normalized, message: 'Declared package surface does not exist' });
      continue;
    }
    const content = fs.readFileSync(absoluteSurface, 'utf8').replaceAll('\r\n', '\n');
    const sourcePath = normalizePath(path.relative(sourceRoot, absoluteSurface));
    surfaces.push({ path: normalized, sourcePath, content });
  }
  if (descriptor.kind === 'SkillManifest') {
    for (const adapter of descriptor.adapters) {
      const sourcePath = normalizePath(path.join('adapters', `${adapter}.js`));
      const absoluteSurface = path.join(sourceRoot, ...sourcePath.split('/'));
      if (!fs.existsSync(absoluteSurface) || !fs.statSync(absoluteSurface).isFile()) {
        issues.push({ type: 'nonexistent-reference', package: packageKey(descriptor.kind, descriptor.id), path: sourcePath, message: 'Declared adapter does not exist' });
        continue;
      }
      const content = fs.readFileSync(absoluteSurface, 'utf8').replaceAll('\r\n', '\n');
      surfaces.push({ path: `adapter:${adapter}`, sourcePath, content });
    }
  }
  const declaredSet = new Set(declared.map(normalizePath));
  for (const surface of surfaces) {
    if (!surface.path.endsWith('.md')) continue;
    for (const reference of localMarkdownReferences(surface.content)) {
      const resolved = normalizePath(path.relative(packageRoot, path.resolve(path.dirname(path.join(packageRoot, surface.path)), reference)));
      if (!fs.existsSync(path.resolve(packageRoot, resolved))) {
        issues.push({ type: 'nonexistent-reference', package: packageKey(descriptor.kind, descriptor.id), path: resolved, message: `Linked from ${surface.path}` });
      } else if (!declaredSet.has(resolved)) {
        issues.push({ type: 'undeclared-reference', package: packageKey(descriptor.kind, descriptor.id), path: resolved, message: `Linked from ${surface.path} but absent from the manifest` });
      }
    }
  }
  for (const evalPath of descriptor.kind === 'SkillManifest' ? descriptor.evals : []) {
    const evaluation = surfaces.find((surface) => surface.path === normalizePath(evalPath));
    if (evaluation) assertContract('package-eval', JSON.parse(evaluation.content));
  }
  return {
    key: packageKey(descriptor.kind, descriptor.id),
    type: descriptor.kind === 'CharacterPassport' ? 'character' : 'skill',
    id: descriptor.id,
    version: descriptor.version,
    descriptor,
    descriptorPath,
    packageRoot: relativePackageRoot,
    dependencies: declaredDependencies(descriptor),
    surfaces,
    issues,
    hash: hashObject({ descriptor, surfaces: surfaces.map(({ path: surfacePath, content }) => ({ path: surfacePath, content })) }),
  };
}

function loadCatalog(sourceRoot) {
  const packagesRoot = path.join(sourceRoot, 'packages');
  const descriptorPaths = walk(packagesRoot)
    .filter((file) => /\/(?:passport|manifest)\.json$/.test(`/${file}`))
    .map((file) => normalizePath(path.join('packages', file)));
  const packages = descriptorPaths.map((descriptorPath) => loadPackage(descriptorPath, sourceRoot));
  const locations = new Map();
  for (const item of packages) {
    if (!locations.has(item.key)) locations.set(item.key, []);
    locations.get(item.key).push(item.descriptorPath);
  }
  const conflicts = [...locations.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([id, paths]) => ({ type: 'same-name-conflict', package: id, paths: paths.sort(), message: 'Multiple package descriptors declare the same identity' }));
  return { packages, conflicts };
}

module.exports = { declaredDependencies, declaredSurfacePaths, loadCatalog, loadPackage, packageKey };
