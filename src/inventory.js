'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { API_VERSION } = require('./constants');
const { matchesAny, normalizePath } = require('./glob');
const { assertContract } = require('./schema');
const { hashBytes, hashObject, sortedUnique } = require('./stable');

const ignoredDirectories = new Set(['.git', '.next', 'coverage', 'dist', 'node_modules']);

function walkFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...walkFiles(root, child));
    } else if (entry.isFile()) {
      files.push(normalizePath(child));
    }
  }
  return files;
}

function gitCommit(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

function readRecord(root, relativePath) {
  const absolutePath = path.join(root, ...relativePath.split('/'));
  const bytes = fs.readFileSync(absolutePath);
  const binary = bytes.includes(0);
  const text = binary || bytes.length > 2_000_000 ? '' : bytes.toString('utf8');
  let parsed = null;
  if (text && relativePath.endsWith('.json')) {
    try { parsed = JSON.parse(text); } catch { /* Contract validation owns malformed package files. */ }
  }
  return { absolutePath, binary, bytes, hash: hashBytes(bytes), parsed, size: bytes.length, text };
}

function localReference(rawReference) {
  let value = rawReference.trim().replace(/^<|>$/g, '').split(/\s+["']/)[0];
  if (!value || value.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(value)) return null;
  value = value.split('#')[0].split('?')[0];
  try { value = decodeURIComponent(value); } catch { return null; }
  return value || null;
}

function resolveReference(root, fromPath, rawReference) {
  const candidate = localReference(rawReference);
  if (!candidate) return null;
  const fromDirectory = path.dirname(path.join(root, ...fromPath.split('/')));
  const direct = candidate.startsWith('/')
    ? path.resolve(root, candidate.slice(1))
    : path.resolve(fromDirectory, candidate);
  const rootPrefix = `${path.resolve(root)}${path.sep}`.toLowerCase();
  if (direct.toLowerCase() !== path.resolve(root).toLowerCase() && !direct.toLowerCase().startsWith(rootPrefix)) return null;
  const candidateRoots = [direct];
  if (!candidate.startsWith('.') && !candidate.startsWith('/')) candidateRoots.push(path.resolve(root, candidate));
  const extensions = ['', '.js', '.jsx', '.json', '.mjs', '.cjs', '.ts', '.tsx'];
  const variants = candidateRoots.flatMap((candidateRoot) => [
    ...extensions.map((extension) => `${candidateRoot}${extension}`),
    ...extensions.slice(1).map((extension) => path.join(candidateRoot, `index${extension}`)),
  ]);
  const existing = variants.find((variant) => fs.existsSync(variant));
  const resolved = existing || direct;
  return {
    exists: Boolean(existing),
    path: normalizePath(path.relative(root, resolved)),
  };
}

function discoverMetadata(root, relativePath, record) {
  const references = [];
  const dependencies = [];
  const capabilities = [];
  const addReference = (value) => {
    const resolved = resolveReference(root, relativePath, value);
    if (resolved) references.push(resolved);
  };

  if (record.text) {
    for (const match of record.text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) addReference(match[1]);
    for (const match of record.text.matchAll(/(?:from\s+|require\s*\(|import\s*\()\s*["']([^"']+)["']/g)) {
      if (match[1].startsWith('.') || match[1].startsWith('/')) addReference(match[1]);
    }
    for (const match of record.text.matchAll(/^\s*(?:homer-capability|capability):[\t ]*([a-z0-9.-]+)[\t ]*$/gim)) {
      capabilities.push(match[1].toLowerCase());
    }
  }

  const parsed = record.parsed;
  if (parsed?.kind === 'SkillManifest') {
    for (const item of parsed.corePaths || []) addReference(item);
    for (const item of parsed.dependencies?.helpers || []) addReference(item);
    dependencies.push(...(parsed.dependencies?.packages || []));
    capabilities.push(...(parsed.capabilities || []));
  } else if (parsed?.kind === 'CharacterPassport') {
    for (const item of parsed.dependencies?.helpers || []) addReference(item);
    dependencies.push(...(parsed.dependencies?.characters || []), ...(parsed.dependencies?.skills || []));
    capabilities.push(...(parsed.capabilities || []), ...(parsed.permissions?.requested || []));
  } else if (path.basename(relativePath) === 'package.json' && parsed) {
    dependencies.push(...Object.keys(parsed.dependencies || {}).map((item) => `npm:${item}`));
  }

  return {
    capabilities: sortedUnique(capabilities),
    dependencies: sortedUnique(dependencies),
    references: references
      .sort((left, right) => left.path.localeCompare(right.path))
      .filter((item, index, values) => index === 0 || item.path !== values[index - 1].path),
  };
}

function repositoryRecords(root) {
  return walkFiles(root).map((relativePath) => ({ relativePath, ...readRecord(root, relativePath) }));
}

function packageIdentity(record) {
  if (record.parsed?.kind === 'SkillManifest' || record.parsed?.kind === 'CharacterPassport') return record.parsed.id;
  return null;
}

function detectCycles(edges) {
  const adjacency = new Map();
  for (const edge of edges.filter((item) => item.type === 'package')) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  }
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(node, stack) {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of (adjacency.get(node) || []).sort()) visit(next, [...stack, node]);
    visiting.delete(node);
    visited.add(node);
  }
  for (const node of [...adjacency.keys()].sort()) visit(node, []);
  return cycles
    .map((cycle) => cycle.map((item) => item.replace(/^package:/, '')))
    .sort((left, right) => left.join('\0').localeCompare(right.join('\0')));
}

function buildDependencyGraph(allRecords) {
  const packageLocations = new Map();
  for (const item of allRecords) {
    const id = packageIdentity(item.record);
    if (!id) continue;
    if (!packageLocations.has(id)) packageLocations.set(id, []);
    packageLocations.get(id).push(`${item.repository}:${item.record.relativePath}`);
  }

  const nodes = allRecords.map((item) => ({ id: `${item.repository}:${item.record.relativePath}`, type: 'file' }));
  for (const id of packageLocations.keys()) nodes.push({ id: `package:${id}`, type: 'package' });
  const edges = [];
  const missing = [];
  for (const item of allRecords) {
    const from = `${item.repository}:${item.record.relativePath}`;
    for (const reference of item.metadata.references) {
      const edge = { from, to: `${item.repository}:${reference.path}`, type: 'reference' };
      (reference.exists ? edges : missing).push(edge);
    }
    const ownerId = packageIdentity(item.record);
    for (const dependency of item.metadata.dependencies.filter((value) => !value.startsWith('npm:'))) {
      const edge = { from: ownerId ? `package:${ownerId}` : from, to: `package:${dependency}`, type: 'package' };
      (packageLocations.has(dependency) ? edges : missing).push(edge);
    }
  }
  const conflicts = [...packageLocations.entries()]
    .filter(([, locations]) => locations.length > 1)
    .map(([id, paths]) => ({ id, paths: paths.sort() }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const uniqueObjects = (values) => [...new Map(values.map((value) => [JSON.stringify(value), value])).values()]
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const graph = {
    apiVersion: API_VERSION,
    kind: 'DependencyGraph',
    nodes: uniqueObjects(nodes),
    edges: uniqueObjects(edges),
    missing: uniqueObjects(missing),
    cycles: detectCycles(edges),
    conflicts,
  };
  return assertContract('dependency-graph', graph);
}

function classify(repository, relativePath, record, oppositeByPath, profile) {
  const statuses = [];
  const opposite = oppositeByPath.get(relativePath);
  statuses.push(opposite ? (opposite.hash === record.hash ? 'identical' : 'divergent') : `${repository}-only`);
  if (repository === 'source' && /^(?:\.agents\/(?:characters|skills)|packages\/(?:characters|skills))\//.test(relativePath)) {
    statuses.push('portable-candidate');
  }
  if (repository === 'target') {
    if (matchesAny(relativePath, profile.paths.protected)) statuses.push('protected', 'target-owned');
    else if (matchesAny(relativePath, profile.paths.managed)) {
      statuses.push(record.text.startsWith(profile.projection.generatedMarker) ? 'managed-generated' : 'managed-customization');
    } else statuses.push('target-owned');
  }
  return sortedUnique(statuses);
}

function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    for (const key of selector(item)) counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function blockingMissingDependencies(entries, dependencyGraph) {
  const byId = new Map(entries.map((entry) => [`${entry.repository}:${entry.path}`, entry]));
  return dependencyGraph.missing.filter((missing) => {
    if (missing.from.startsWith('package:')) return true;
    const owner = byId.get(missing.from);
    return owner?.statuses.includes('portable-candidate') || owner?.statuses.includes('managed-generated');
  });
}

function buildInventory(config) {
  const sourceRecords = repositoryRecords(config.sourceRoot);
  const targetRecords = repositoryRecords(config.targetRoot);
  const sourceByPath = new Map(sourceRecords.map((record) => [record.relativePath, record]));
  const targetByPath = new Map(targetRecords.map((record) => [record.relativePath, record]));
  const combined = [];
  for (const [repository, root, records, opposite] of [
    ['source', config.sourceRoot, sourceRecords, targetByPath],
    ['target', config.targetRoot, targetRecords, sourceByPath],
  ]) {
    for (const record of records) {
      const metadata = discoverMetadata(root, record.relativePath, record);
      combined.push({ repository, root, record, metadata, statuses: classify(repository, record.relativePath, record, opposite, config.profile) });
    }
  }
  combined.sort((left, right) => `${left.repository}:${left.record.relativePath}`.localeCompare(`${right.repository}:${right.record.relativePath}`));
  const dependencyGraph = buildDependencyGraph(combined);
  const entries = combined.map((item) => ({
    repository: item.repository,
    path: item.record.relativePath,
    hash: item.record.hash,
    size: item.record.size,
    references: item.metadata.references.map((reference) => reference.path),
    dependencies: item.metadata.dependencies,
    capabilities: item.metadata.capabilities,
    statuses: item.statuses,
  }));
  const blockingMissing = blockingMissingDependencies(entries, dependencyGraph);
  const repositoryHash = (records) => hashObject(records.map((record) => ({ path: record.relativePath, hash: record.hash, size: record.size })));
  const inventory = {
    apiVersion: API_VERSION,
    kind: 'OdysseyInventory',
    inputs: {
      source: { root: config.sourceRoot, commit: config.declaration.sourceCommit || gitCommit(config.sourceRoot), hash: repositoryHash(sourceRecords) },
      target: { root: config.targetRoot, commit: config.declaration.targetCommit || gitCommit(config.targetRoot), hash: repositoryHash(targetRecords) },
      profile: { id: config.profile.id, version: config.profile.version, hash: config.profileHash },
    },
    entries,
    dependencyGraph,
    summary: {
      files: { source: sourceRecords.length, target: targetRecords.length, total: entries.length },
      statuses: countBy(entries, (entry) => entry.statuses),
      missingDependencies: dependencyGraph.missing.length,
      blockingMissingDependencies: blockingMissing.length,
      cycles: dependencyGraph.cycles.length,
      packageConflicts: dependencyGraph.conflicts.length,
    },
  };
  inventory.inventoryHash = hashObject(inventory);
  return assertContract('inventory', inventory);
}

function treeFingerprint(root) {
  const records = repositoryRecords(root);
  return hashObject(records.map((record) => ({ path: record.relativePath, hash: record.hash, size: record.size })));
}

module.exports = { blockingMissingDependencies, buildInventory, discoverMetadata, gitCommit, treeFingerprint, walkFiles };
