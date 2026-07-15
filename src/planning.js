'use strict';

const { API_VERSION } = require('./constants');
const { mapPath, matchesAny } = require('./glob');
const { assertContract } = require('./schema');
const { buildProjectedArtifact } = require('./projection');
const { hashObject, sortedUnique } = require('./stable');

function packageCoordinates(sourcePath) {
  const match = /^(?:\.agents|packages)\/(characters|skills)\/([^/]+)\//.exec(sourcePath);
  return match ? { type: match[1], id: match[2] } : null;
}

function isAllowlisted(sourcePath, profile) {
  const coordinates = packageCoordinates(sourcePath);
  if (!coordinates) return false;
  const allowlist = profile.packageAllowlist[coordinates.type] || [];
  return allowlist.includes('*') || allowlist.includes(coordinates.id);
}

function mappedTargetPath(sourcePath, profile) {
  if (!isAllowlisted(sourcePath, profile)) return null;
  for (const mapping of profile.projection.mappings) {
    const mapped = mapPath(sourcePath, mapping);
    if (mapped) return mapped;
  }
  return null;
}

function privilegeDelta(inventory, profile, selectedSourcePaths) {
  const selected = new Set(selectedSourcePaths);
  const sourceCapabilities = sortedUnique(inventory.entries
    .filter((entry) => entry.repository === 'source' && selected.has(entry.path))
    .flatMap((entry) => entry.capabilities));
  const targetCapabilities = sortedUnique(inventory.entries
    .filter((entry) => entry.repository === 'target' && entry.statuses.includes('managed-generated'))
    .flatMap((entry) => entry.capabilities));
  const added = sourceCapabilities.filter((capability) => !targetCapabilities.includes(capability));
  const removed = targetCapabilities.filter((capability) => !sourceCapabilities.includes(capability));
  const allowed = sourceCapabilities.filter((capability) => profile.capabilities.allowed.includes(capability));
  const humanGated = sourceCapabilities.filter((capability) => profile.capabilities.humanGated.includes(capability));
  const denied = sourceCapabilities.filter((capability) =>
    profile.capabilities.denied.includes(capability)
    || (!profile.capabilities.allowed.includes(capability) && !profile.capabilities.humanGated.includes(capability)));
  return assertContract('privilege-delta', {
    apiVersion: API_VERSION,
    kind: 'PrivilegeDelta',
    sourceCapabilities,
    targetCapabilities,
    added,
    removed,
    allowed,
    humanGated,
    denied,
    unsafeIncrease: denied.length > 0,
  });
}

function buildPlan(inventory, config, options = {}) {
  const targetByPath = new Map(inventory.entries
    .filter((entry) => entry.repository === 'target')
    .map((entry) => [entry.path, entry]));
  const allSourceCandidates = inventory.entries
    .filter((entry) => entry.repository === 'source' && entry.statuses.includes('portable-candidate'))
    .map((entry) => ({ entry, targetPath: mappedTargetPath(entry.path, config.profile) }))
    .filter((item) => item.targetPath);
  const hasCanonicalPackages = allSourceCandidates.some((item) => item.entry.path.startsWith('packages/'));
  const sourceCandidates = allSourceCandidates
    .filter((item) => !hasCanonicalPackages || item.entry.path.startsWith('packages/'))
    .sort((left, right) => left.targetPath.localeCompare(right.targetPath));
  const selectedTargets = new Set(sourceCandidates.map((item) => item.targetPath));
  const selectedSources = sourceCandidates.map((item) => item.entry.path);
  const changes = [];
  const conflicts = [];
  const preserved = new Set();

  for (const candidate of sourceCandidates) {
    const source = candidate.entry;
    const target = targetByPath.get(candidate.targetPath);
    const projected = buildProjectedArtifact(config, source.path, candidate.targetPath);
    if (matchesAny(candidate.targetPath, config.profile.paths.protected)) {
      conflicts.push({
        type: 'protected-path',
        path: candidate.targetPath,
        message: `Projection from ${source.path} resolves to a protected target path`,
      });
      if (target) preserved.add(target.path);
      continue;
    }
    if (!matchesAny(candidate.targetPath, config.profile.paths.managed)) {
      conflicts.push({
        type: 'protected-path',
        path: candidate.targetPath,
        message: `Projection from ${source.path} is outside the profile's managed paths`,
      });
      if (target) preserved.add(target.path);
      continue;
    }
    if (!target) {
      changes.push({ type: 'addition', path: candidate.targetPath, sourcePath: source.path, ownership: 'generated', beforeHash: null, afterHash: projected.hash });
    } else if (target.statuses.includes('managed-customization')) {
      conflicts.push({
        type: 'customization',
        path: target.path,
        message: `Managed path contains target-owned content without the Homer generated marker`,
      });
      preserved.add(target.path);
    } else {
      const semanticUnchanged = target.hash === projected.hash;
      changes.push({
        type: semanticUnchanged ? 'unchanged' : 'replacement',
        path: target.path,
        sourcePath: source.path,
        ownership: 'generated',
        beforeHash: target.hash,
        afterHash: projected.hash,
      });
    }
  }

  for (const target of targetByPath.values()) {
    if (selectedTargets.has(target.path)) continue;
    if (target.statuses.includes('managed-generated')) {
      if (matchesAny(target.path, config.profile.paths.protected)) {
        conflicts.push({ type: 'protected-path', path: target.path, message: 'Existing generated content is also protected' });
        preserved.add(target.path);
      } else {
        changes.push({ type: 'removal', path: target.path, ownership: 'generated', beforeHash: target.hash, afterHash: null });
      }
    } else if (target.statuses.includes('managed-customization')) {
      conflicts.push({ type: 'customization', path: target.path, message: 'Unmapped target customization exists inside a managed path' });
      preserved.add(target.path);
    } else {
      preserved.add(target.path);
    }
  }

  changes.sort((left, right) => `${left.path}:${left.type}`.localeCompare(`${right.path}:${right.type}`));
  conflicts.sort((left, right) => `${left.path}:${left.type}`.localeCompare(`${right.path}:${right.type}`));
  const delta = privilegeDelta(inventory, config.profile, selectedSources);
  const summary = {
    additions: changes.filter((item) => item.type === 'addition').length,
    removals: changes.filter((item) => item.type === 'removal').length,
    replacements: changes.filter((item) => item.type === 'replacement').length,
    unchanged: changes.filter((item) => item.type === 'unchanged').length,
    preserved: preserved.size,
    protectedConflicts: conflicts.filter((item) => item.type === 'protected-path').length,
    customizationConflicts: conflicts.filter((item) => item.type === 'customization').length,
    authorityChanges: delta.added.length + delta.removed.length,
  };
  const planCore = {
    apiVersion: API_VERSION,
    kind: 'OdysseyPlan',
    accepted: options.accepted === true,
    inputs: inventory.inputs,
    profile: inventory.inputs.profile,
    inventoryHash: inventory.inventoryHash,
    changes,
    preservedPaths: [...preserved].sort(),
    conflicts,
    dependencyGraph: inventory.dependencyGraph,
    privilegeDelta: delta,
    summary,
  };
  const identityCore = { ...planCore };
  delete identityCore.accepted;
  const plan = { ...planCore, planId: hashObject(identityCore) };
  return assertContract('odyssey-plan', plan);
}

function buildDiff(plan) {
  return {
    apiVersion: API_VERSION,
    kind: 'OdysseyDiff',
    planId: plan.planId,
    additions: plan.changes.filter((item) => item.type === 'addition'),
    removals: plan.changes.filter((item) => item.type === 'removal'),
    replacements: plan.changes.filter((item) => item.type === 'replacement'),
    unchangedGenerated: plan.changes.filter((item) => item.type === 'unchanged'),
    preservedTargetOwned: plan.preservedPaths,
    generatedContent: sortedUnique(plan.changes.map((item) => item.path)),
    authorityChanges: plan.privilegeDelta,
    conflicts: plan.conflicts,
    summary: plan.summary,
  };
}

module.exports = { buildDiff, buildPlan, isAllowlisted, mappedTargetPath, privilegeDelta };
