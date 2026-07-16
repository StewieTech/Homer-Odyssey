'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderGenericCodexSkill } = require('../adapters/codex-catalog');
const { loadCatalog } = require('./catalog');
const { normalizePath } = require('./glob');
const { hashBytes, hashObject } = require('./stable');

const ADAPTER_PATH = 'adapters/codex-catalog.js';
const OVERLAY_PATH = 'profiles/overlays/generic/catalog.json';
const TEMPLATE_PATH = 'adapters/templates/generic-codex-skill.md';
const EXPECTED_NATIVE_NAMES = Object.freeze([
  'lisa',
  'lisa-prime',
  'lorie',
  'marge-product-architect',
  'ralph',
  'ralph-prime',
]);

function absoluteFrom(root, relativePath) {
  return path.join(root, ...relativePath.split('/'));
}

function readText(root, relativePath) {
  return fs.readFileSync(absoluteFrom(root, relativePath), 'utf8').replaceAll('\r\n', '\n');
}

function readInput(root, relativePath) {
  const content = readText(root, relativePath);
  return { content, input: { path: relativePath, hash: hashBytes(content) } };
}

function assertOverlay(overlay) {
  if (overlay.apiVersion !== 'homer.odyssey/v1' || overlay.kind !== 'GenericCodexCatalogOverlay' || !Array.isArray(overlay.skills)) {
    throw new Error('Invalid generic Codex catalog overlay');
  }
  const names = overlay.skills.map(({ nativeName }) => nativeName).sort();
  if (JSON.stringify(names) !== JSON.stringify(EXPECTED_NATIVE_NAMES)) {
    throw new Error(`Generic Codex catalog overlay must declare exactly: ${EXPECTED_NATIVE_NAMES.join(', ')}`);
  }
  for (const entry of overlay.skills) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.nativeName)) throw new Error(`Invalid native skill name: ${entry.nativeName}`);
    if (typeof entry.skillPackage !== 'string' || !entry.skillPackage.startsWith('skill:')) throw new Error(`Invalid skill package for ${entry.nativeName}`);
    if (entry.characterPackage !== null && (typeof entry.characterPackage !== 'string' || !entry.characterPackage.startsWith('character:'))) {
      throw new Error(`Invalid character package for ${entry.nativeName}`);
    }
    if (typeof entry.description !== 'string' || !entry.description.includes('Use when ')) throw new Error(`Discovery description must include triggers for ${entry.nativeName}`);
    if (typeof entry.genericInstruction !== 'string' || !entry.genericInstruction.trim()) throw new Error(`Missing generic instruction for ${entry.nativeName}`);
  }
}

function dependencyClosure(byKey, roots) {
  const found = new Map();
  const visiting = new Set();
  function visit(key) {
    if (found.has(key)) return;
    if (visiting.has(key)) throw new Error(`Circular generic catalog dependency at ${key}`);
    const item = byKey.get(key);
    if (!item) throw new Error(`Missing generic catalog package dependency: ${key}`);
    visiting.add(key);
    item.dependencies.forEach(visit);
    visiting.delete(key);
    found.set(key, item);
  }
  roots.filter(Boolean).forEach(visit);
  return [...found.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function buildGenericCatalog({ sourceRoot }) {
  if (!sourceRoot) throw new Error('sourceRoot is required');
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const catalog = loadCatalog(resolvedSourceRoot);
  const catalogIssues = [...catalog.conflicts, ...catalog.packages.flatMap((item) => item.issues)];
  if (catalogIssues.length) throw new Error(`Cannot render invalid package catalog: ${catalogIssues.map((issue) => issue.message).join('; ')}`);

  const template = readInput(resolvedSourceRoot, TEMPLATE_PATH);
  const adapter = readInput(resolvedSourceRoot, ADAPTER_PATH);
  const overlayInput = readInput(resolvedSourceRoot, OVERLAY_PATH);
  const overlay = JSON.parse(overlayInput.content);
  assertOverlay(overlay);
  const byKey = new Map(catalog.packages.map((item) => [item.key, item]));

  const entries = [...overlay.skills]
    .sort((left, right) => left.nativeName.localeCompare(right.nativeName))
    .map((entry) => {
      const skillPackage = byKey.get(entry.skillPackage);
      const characterPackage = entry.characterPackage ? byKey.get(entry.characterPackage) : null;
      if (!skillPackage || (entry.characterPackage && !characterPackage)) throw new Error(`Missing direct package for native skill ${entry.nativeName}`);
      const closure = dependencyClosure(byKey, [entry.characterPackage, entry.skillPackage]);
      const packageSources = closure.map((item) => ({
        hash: item.hash,
        key: item.key,
        path: item.descriptorPath,
        version: item.version,
      }));
      const overlaySource = { path: `${OVERLAY_PATH}#${entry.nativeName}`, hash: hashObject(entry) };
      const sourceHash = hashObject({
        adapter: adapter.input,
        overlay: overlaySource,
        packages: packageSources,
        template: template.input,
      });
      const files = renderGenericCodexSkill({
        characterPackage,
        entry,
        inputSources: [adapter.input, overlaySource, template.input],
        packageSources,
        skillPackage,
        sourceHash,
        template: template.content,
      });
      return {
        files: Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))),
        nativeName: entry.nativeName,
        packageSources,
        sourceHash,
      };
    });
  const files = Object.assign({}, ...entries.map((entry) => entry.files));
  return {
    catalogHash: hashObject(entries.map(({ nativeName, sourceHash }) => ({ nativeName, sourceHash }))),
    entries,
    files: Object.fromEntries(Object.entries(files).sort(([left], [right]) => left.localeCompare(right))),
    nativeNames: entries.map(({ nativeName }) => nativeName),
  };
}

function walkFiles(root, relative = '') {
  const directory = path.join(root, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const child = path.join(relative, entry.name);
      return entry.isDirectory() ? walkFiles(root, child) : [normalizePath(child)];
    });
}

function compareCatalog(build, outputRoot) {
  const expectedPaths = new Set(Object.keys(build.files));
  const managedPaths = build.nativeNames.flatMap((nativeName) => walkFiles(absoluteFrom(outputRoot, `.agents/skills/${nativeName}`))
    .map((relativePath) => `.agents/skills/${nativeName}/${relativePath}`));
  const actualPaths = new Set(managedPaths);
  const issues = [];
  for (const expectedPath of [...expectedPaths].sort()) {
    if (!actualPaths.has(expectedPath)) {
      issues.push({ type: 'missing', path: expectedPath });
      continue;
    }
    const actual = readText(outputRoot, expectedPath);
    if (actual !== build.files[expectedPath]) issues.push({ type: 'changed', path: expectedPath });
  }
  for (const actualPath of [...actualPaths].sort()) {
    if (!expectedPaths.has(actualPath)) issues.push({ type: 'unexpected', path: actualPath });
  }
  return issues;
}

function removeEmptyDirectories(directory, stopAt) {
  if (!fs.existsSync(directory) || path.resolve(directory) === path.resolve(stopAt)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirectories(path.join(directory, entry.name), stopAt);
  }
  if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
}

function renderGenericCatalog({ sourceRoot, outputRoot = sourceRoot, dryRun = false }) {
  const resolvedOutputRoot = path.resolve(outputRoot);
  const build = buildGenericCatalog({ sourceRoot });
  const issues = compareCatalog(build, resolvedOutputRoot);
  const writes = issues.filter(({ type }) => type !== 'unexpected').map(({ path: issuePath }) => issuePath);
  const removals = issues.filter(({ type }) => type === 'unexpected').map(({ path: issuePath }) => issuePath);
  if (!dryRun) {
    for (const relativePath of removals) fs.unlinkSync(absoluteFrom(resolvedOutputRoot, relativePath));
    for (const relativePath of writes) {
      const destination = absoluteFrom(resolvedOutputRoot, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, build.files[relativePath], 'utf8');
    }
    const skillsRoot = absoluteFrom(resolvedOutputRoot, '.agents/skills');
    for (const nativeName of build.nativeNames) removeEmptyDirectories(path.join(skillsRoot, nativeName), skillsRoot);
  }
  return {
    catalogHash: build.catalogHash,
    changed: issues.length > 0,
    dryRun,
    nativeNames: build.nativeNames,
    removals,
    writes,
  };
}

function verifyGenericCatalog({ sourceRoot, outputRoot = sourceRoot }) {
  const build = buildGenericCatalog({ sourceRoot });
  const issues = compareCatalog(build, path.resolve(outputRoot));
  return {
    catalogHash: build.catalogHash,
    entries: build.entries.map(({ nativeName, packageSources, sourceHash }) => ({ nativeName, packageSources, sourceHash })),
    issues,
    nativeNames: build.nativeNames,
    ok: issues.length === 0,
  };
}

module.exports = {
  EXPECTED_NATIVE_NAMES,
  buildGenericCatalog,
  renderGenericCatalog,
  verifyGenericCatalog,
};
