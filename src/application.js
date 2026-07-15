'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { API_VERSION, EXIT, VERSION } = require('./constants');
const { HomerError } = require('./errors');
const { loadCatalog } = require('./catalog');
const { runPackageEvals } = require('./evals');
const { matchesAny } = require('./glob');
const { blockingMissingDependencies, buildInventory, walkFiles } = require('./inventory');
const { buildPlan, privilegeDelta } = require('./planning');
const { buildProjectedArtifact } = require('./projection');
const { assertContract } = require('./schema');
const { scanPackageGraph, scanText } = require('./security');
const { hashBytes, hashObject, sortedUnique, stableJson } = require('./stable');
const { resolveDependencies } = require('../transforms/dependency-resolver');

function readJson(filePath, contractName) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { throw new HomerError(`Cannot read ${contractName} at ${filePath}: ${error.message}`, EXIT.INVALID_CONTRACT); }
  return parsed;
}

function isOwnedContent(content, profile) {
  if (content.startsWith(profile.projection.generatedMarker)) return true;
  try { return JSON.parse(content).generatedBy === 'Homer Odyssey'; }
  catch { return false; }
}

function safeTargetPath(config, relativePath) {
  const absolute = path.resolve(config.targetRoot, ...relativePath.split('/'));
  const prefix = `${path.resolve(config.targetRoot)}${path.sep}`.toLowerCase();
  if (!absolute.toLowerCase().startsWith(prefix)) throw new HomerError(`Target path escapes target root: ${relativePath}`, EXIT.PROTECTED_CONFLICT);
  if (matchesAny(relativePath, config.profile.paths.protected) || !matchesAny(relativePath, config.profile.paths.managed)) {
    throw new HomerError(`Target path is not writable under profile ${config.profile.id}: ${relativePath}`, EXIT.PROTECTED_CONFLICT);
  }
  return absolute;
}

function safeLockPath(config) {
  const relativePath = config.profile.lockfile.replaceAll('\\', '/');
  const absolute = path.resolve(config.targetRoot, ...relativePath.split('/'));
  const root = path.resolve(config.targetRoot);
  const prefix = `${root}${path.sep}`.toLowerCase();
  if (absolute === root || !absolute.toLowerCase().startsWith(prefix)) {
    throw new HomerError(`Lockfile path escapes target root: ${config.profile.lockfile}`, EXIT.INVALID_CONTRACT);
  }
  if (matchesAny(relativePath, config.profile.paths.protected)) {
    throw new HomerError(`Lockfile conflicts with a protected path: ${relativePath}`, EXIT.PROTECTED_CONFLICT);
  }
  return absolute;
}

function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.homer-tmp`;
  fs.writeFileSync(temporary, content);
  fs.renameSync(temporary, filePath);
}

function validateAcceptedPlan(planPath, inventory, config) {
  const accepted = assertContract('odyssey-plan', readJson(planPath, 'Odyssey Plan'));
  if (!accepted.accepted) throw new HomerError('homer apply requires an accepted Odyssey Plan', EXIT.PLAN_NOT_ACCEPTED);
  const current = buildPlan(inventory, config);
  if (accepted.planId !== current.planId || accepted.inventoryHash !== current.inventoryHash) {
    throw new HomerError('Accepted Odyssey Plan is stale for the current source, profile, or target inputs', EXIT.PLAN_NOT_ACCEPTED);
  }
  if (blockingMissingDependencies(inventory.entries, inventory.dependencyGraph).length
    || inventory.dependencyGraph.cycles.length || inventory.dependencyGraph.conflicts.length) {
    throw new HomerError('Accepted Odyssey Plan has unresolved dependencies', EXIT.MISSING_DEPENDENCY);
  }
  if (current.conflicts.some((item) => item.type === 'protected-path')) throw new HomerError('Accepted Odyssey Plan contains a protected-path conflict', EXIT.PROTECTED_CONFLICT);
  if (current.conflicts.some((item) => item.type === 'customization')) throw new HomerError('Accepted Odyssey Plan contains an unresolved customization', EXIT.CUSTOMIZATION_CONFLICT);
  if (current.privilegeDelta.unsafeIncrease) throw new HomerError('Accepted Odyssey Plan contains an unsafe privilege increase', EXIT.UNSAFE_PRIVILEGE);
  return { accepted, current };
}

function prepare(config, planPath) {
  const inventory = buildInventory(config);
  const { accepted, current } = validateAcceptedPlan(planPath, inventory, config);
  const catalog = loadCatalog(config.sourceRoot);
  const resolution = resolveDependencies(catalog, config.profile);
  if (resolution.issues.length) throw new HomerError('Package dependency resolution failed', EXIT.MISSING_DEPENDENCY, resolution.issues.map((item) => `${item.type}: ${item.package || ''} ${item.path || item.dependency || item.message}`.trim()));
  const securityFindings = scanPackageGraph(resolution.packages, config.profile);
  if (securityFindings.length) throw new HomerError('Package graph violates target security policy', EXIT.SECURITY_POLICY, securityFindings.map((item) => `${item.package}:${item.surface}:${item.code}`));

  const projections = current.changes
    .filter((change) => change.sourcePath && change.type !== 'removal')
    .map((change) => buildProjectedArtifact(config, change.sourcePath, change.path));
  for (const projection of projections) {
    if (projection.hash !== current.changes.find((change) => change.path === projection.targetPath && change.sourcePath === projection.sourcePath).afterHash) {
      throw new HomerError(`Projection hash does not match Odyssey Plan: ${projection.targetPath}`, EXIT.DRIFT);
    }
    const findings = scanText('projection', projection.targetPath, projection.content);
    if (findings.length) throw new HomerError('Projected output violates target security policy', EXIT.SECURITY_POLICY, findings.map((item) => `${item.surface}:${item.code}`));
  }
  const evalResults = runPackageEvals(resolution.packages, projections, config.profile);
  const failedEvals = evalResults.filter((item) => !item.passed);
  if (failedEvals.length) throw new HomerError('Package evaluations failed', EXIT.EVAL_FAILED, failedEvals.map((item) => `${item.package}:${item.name}`));
  return { accepted, catalog, current, evalResults, inventory, projections, resolution };
}

function makeLock(config, prepared, previousLockContent, backups) {
  const previousLockHash = previousLockContent ? hashBytes(previousLockContent) : '';
  const overlayHash = hashObject(sortedUnique(prepared.projections.map((item) => item.overlayHash).filter(Boolean)));
  const generatedFiles = prepared.projections
    .map((item) => ({ path: item.targetPath, hash: item.hash, sourcePath: item.sourcePath }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const lock = {
    apiVersion: API_VERSION,
    kind: 'OdysseyLock',
    generatedBy: 'Homer Odyssey',
    planId: prepared.accepted.planId,
    source: { commit: prepared.inventory.inputs.source.commit, hash: prepared.inventory.inputs.source.hash },
    target: { inputCommit: prepared.accepted.inputs.target.commit, inputHash: prepared.accepted.inputs.target.hash },
    profile: prepared.inventory.inputs.profile,
    transformerVersion: VERSION,
    overlayHash,
    packages: prepared.resolution.packages.map((item) => ({ id: item.key, version: item.version, hash: item.hash })),
    removedCapabilities: sortedUnique(prepared.projections.flatMap((item) => item.removedCapabilities)),
    deniedDependencies: [],
    generatedFiles,
    validation: [
      { name: 'schemas', passed: true },
      { name: 'dependencies', passed: true },
      { name: 'references', passed: true },
      { name: 'security-policy', passed: true },
      { name: 'package-evals', passed: true },
      { name: 'privileges', passed: true },
    ],
    rollback: {
      previousLockHash,
      previousLockBase64: previousLockContent ? Buffer.from(previousLockContent).toString('base64') : '',
      instructions: 'Run homer rollback with the same target declaration. Homer restores only files recorded here and never deletes target-owned content.',
      files: backups,
    },
  };
  return assertContract('homer-lock', lock);
}

function lockMatchesPrepared(lock, prepared) {
  const expectedPackages = prepared.resolution.packages
    .map((item) => ({ id: item.key, version: item.version, hash: item.hash }));
  const expectedGeneratedFiles = prepared.projections
    .map((item) => ({ path: item.targetPath, hash: item.hash, sourcePath: item.sourcePath }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const expectedOverlayHash = hashObject(sortedUnique(prepared.projections.map((item) => item.overlayHash).filter(Boolean)));
  return lock.source.hash === prepared.inventory.inputs.source.hash
    && lock.profile.hash === prepared.inventory.inputs.profile.hash
    && lock.transformerVersion === VERSION
    && lock.overlayHash === expectedOverlayHash
    && hashObject(lock.packages) === hashObject(expectedPackages)
    && hashObject(lock.generatedFiles) === hashObject(expectedGeneratedFiles)
    && hashObject(lock.removedCapabilities) === hashObject(sortedUnique(prepared.projections.flatMap((item) => item.removedCapabilities)));
}

function applyProjection(config, planPath, options = {}) {
  const prepared = prepare(config, planPath);
  const lockPath = safeLockPath(config);
  const previousLockContent = fs.existsSync(lockPath) ? fs.readFileSync(lockPath, 'utf8') : '';
  const mutableChanges = prepared.current.changes.filter((change) => ['addition', 'replacement', 'removal'].includes(change.type));
  const existingLock = previousLockContent ? assertContract('homer-lock', JSON.parse(previousLockContent)) : null;
  if (!mutableChanges.length && existingLock && lockMatchesPrepared(existingLock, prepared)) {
    return { apiVersion: API_VERSION, kind: 'OdysseyApply', dryRun: Boolean(options.dryRun), idempotent: true, writes: [], removals: [], lockHash: hashObject(existingLock), lock: existingLock };
  }

  const ownedByLock = new Set(existingLock?.generatedFiles.map((item) => item.path) || []);
  const backups = [];
  for (const change of mutableChanges) {
    const absolute = safeTargetPath(config, change.path);
    const existed = fs.existsSync(absolute);
    const content = existed ? fs.readFileSync(absolute) : Buffer.alloc(0);
    if (existed && !isOwnedContent(content.toString('utf8'), config.profile) && !ownedByLock.has(change.path)) {
      throw new HomerError(`Refusing to overwrite target-owned content: ${change.path}`, EXIT.CUSTOMIZATION_CONFLICT);
    }
    backups.push({ path: change.path, existed, contentBase64: content.toString('base64') });
  }
  const lock = makeLock(config, prepared, previousLockContent, backups);
  const writes = mutableChanges.filter((change) => change.type !== 'removal').map((change) => change.path).sort();
  const removals = mutableChanges.filter((change) => change.type === 'removal').map((change) => change.path).sort();
  if (options.dryRun) return { apiVersion: API_VERSION, kind: 'OdysseyApply', dryRun: true, idempotent: false, writes, removals, lockHash: hashObject(lock), lock };

  try {
    for (const change of mutableChanges) {
      const absolute = safeTargetPath(config, change.path);
      if (change.type === 'removal') {
        if (fs.existsSync(absolute)) fs.rmSync(absolute);
      } else {
        const projection = prepared.projections.find((item) => item.targetPath === change.path && item.sourcePath === change.sourcePath);
        atomicWrite(absolute, projection.content);
      }
    }
    atomicWrite(lockPath, `${stableJson(lock, 2)}\n`);
  } catch (error) {
    for (const backup of backups) {
      const absolute = path.join(config.targetRoot, ...backup.path.split('/'));
      if (backup.existed) atomicWrite(absolute, Buffer.from(backup.contentBase64, 'base64'));
      else if (fs.existsSync(absolute)) fs.rmSync(absolute);
    }
    if (previousLockContent) atomicWrite(lockPath, previousLockContent);
    else if (fs.existsSync(lockPath)) fs.rmSync(lockPath);
    throw error;
  }
  return { apiVersion: API_VERSION, kind: 'OdysseyApply', dryRun: false, idempotent: false, writes, removals, lockHash: hashObject(lock), lock };
}

function validateGeneratedJson(relativePath, content) {
  if (!relativePath.endsWith('.json')) return [];
  try {
    const parsed = JSON.parse(content);
    if (parsed.kind === 'CharacterPassport') assertContract('character-passport', parsed);
    else if (parsed.kind === 'SkillManifest') assertContract('skill-manifest', parsed);
    else if (parsed.kind === 'PackageEval') assertContract('package-eval', parsed);
    return [];
  } catch (error) { return [error.message]; }
}

function verifyProjection(config) {
  const lockPath = safeLockPath(config);
  const lock = assertContract('homer-lock', readJson(lockPath, 'homer.lock'));
  const inventory = buildInventory(config);
  const catalog = loadCatalog(config.sourceRoot);
  const resolution = resolveDependencies(catalog, config.profile);
  const securityFindings = scanPackageGraph(resolution.packages, config.profile);
  const projections = lock.generatedFiles.map((item) => buildProjectedArtifact(config, item.sourcePath, item.path));
  const evalResults = runPackageEvals(resolution.packages, projections, config.profile);
  const drift = [];
  const outputErrors = [];
  for (const expected of lock.generatedFiles) {
    const absolute = path.join(config.targetRoot, ...expected.path.split('/'));
    const content = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
    const actualHash = content ? hashBytes(content) : '';
    if (actualHash !== expected.hash) drift.push({ path: expected.path, expectedHash: expected.hash, actualHash });
    outputErrors.push(...validateGeneratedJson(expected.path, content).map((message) => `${expected.path}: ${message}`));
  }
  const lockedPaths = new Set(lock.generatedFiles.map((item) => item.path));
  for (const relativePath of walkFiles(config.targetRoot)) {
    if (!matchesAny(relativePath, config.profile.paths.managed) || lockedPaths.has(relativePath)) continue;
    const content = fs.readFileSync(path.join(config.targetRoot, ...relativePath.split('/')), 'utf8');
    if (isOwnedContent(content, config.profile)) drift.push({ path: relativePath, expectedHash: '', actualHash: hashBytes(content) });
  }
  const sourcePaths = lock.generatedFiles.map((item) => item.sourcePath);
  const delta = privilegeDelta(inventory, config.profile, sourcePaths);
  const checks = [
    { name: 'schemas', passed: outputErrors.length === 0, details: outputErrors },
    { name: 'dependencies', passed: resolution.issues.length === 0, details: resolution.issues.map((item) => item.message || item.type) },
    { name: 'references', passed: catalog.packages.every((item) => item.issues.length === 0), details: catalog.packages.flatMap((item) => item.issues.map((issue) => issue.message)) },
    { name: 'profile-policy', passed: securityFindings.length === 0, details: securityFindings.map((item) => `${item.package}:${item.code}`) },
    { name: 'package-evals', passed: evalResults.every((item) => item.passed), details: evalResults.filter((item) => !item.passed).map((item) => `${item.package}:${item.name}`) },
    { name: 'generated-drift', passed: drift.length === 0, details: drift.map((item) => item.path) },
    { name: 'privileges', passed: !delta.unsafeIncrease, details: delta.denied },
    { name: 'source-integrity', passed: lock.source.hash === inventory.inputs.source.hash && lock.profile.hash === inventory.inputs.profile.hash, details: lock.source.hash === inventory.inputs.source.hash ? [] : ['Source input hash changed'] },
  ];
  const report = assertContract('verification', {
    apiVersion: API_VERSION,
    kind: 'OdysseyVerification',
    verdict: checks.every((item) => item.passed) ? 'PASS' : 'FAILED',
    lockHash: hashObject(lock),
    checks,
    drift,
    privilegeDelta: delta,
  });
  let exitCode = EXIT.OK;
  if (!checks.find((item) => item.name === 'dependencies').passed || !checks.find((item) => item.name === 'references').passed) exitCode = EXIT.MISSING_DEPENDENCY;
  else if (!checks.find((item) => item.name === 'profile-policy').passed || !checks.find((item) => item.name === 'privileges').passed) exitCode = EXIT.SECURITY_POLICY;
  else if (!checks.find((item) => item.name === 'package-evals').passed) exitCode = EXIT.EVAL_FAILED;
  else if (report.verdict === 'FAILED') exitCode = EXIT.DRIFT;
  return { report, exitCode };
}

function rollbackProjection(config, options = {}) {
  const lockPath = safeLockPath(config);
  const lock = assertContract('homer-lock', readJson(lockPath, 'homer.lock'));
  const actions = [];
  const backupByPath = new Map(lock.rollback.files.map((item) => [item.path, item]));
  const paths = sortedUnique([...lock.generatedFiles.map((item) => item.path), ...backupByPath.keys()]);
  for (const relativePath of paths) {
    const backup = backupByPath.get(relativePath);
    if (backup?.existed) actions.push({ type: 'restore', path: relativePath });
    else actions.push({ type: 'remove', path: relativePath });
  }
  if (lock.rollback.previousLockBase64
    && hashBytes(Buffer.from(lock.rollback.previousLockBase64, 'base64')) !== lock.rollback.previousLockHash) {
    throw new HomerError('Rollback packet contains a corrupted previous lockfile', EXIT.ROLLBACK_FAILED);
  }
  for (const action of actions) {
    const absolute = safeTargetPath(config, action.path);
    const locked = lock.generatedFiles.find((item) => item.path === action.path);
    if (locked) {
      const actualHash = fs.existsSync(absolute) ? hashBytes(fs.readFileSync(absolute)) : '';
      if (actualHash !== locked.hash) {
        throw new HomerError(`Rollback refuses drifted generated content: ${action.path}`, EXIT.ROLLBACK_FAILED);
      }
    } else if (fs.existsSync(absolute)) {
      throw new HomerError(`Rollback refuses untracked content: ${action.path}`, EXIT.ROLLBACK_FAILED);
    }
  }
  if (options.dryRun) return { apiVersion: API_VERSION, kind: 'OdysseyRollback', dryRun: true, actions };
  for (const action of actions) {
    const absolute = safeTargetPath(config, action.path);
    if (action.type === 'restore') atomicWrite(absolute, Buffer.from(backupByPath.get(action.path).contentBase64, 'base64'));
    else if (fs.existsSync(absolute)) fs.rmSync(absolute);
  }
  if (lock.rollback.previousLockBase64) atomicWrite(lockPath, Buffer.from(lock.rollback.previousLockBase64, 'base64'));
  else if (fs.existsSync(lockPath)) fs.rmSync(lockPath);
  return { apiVersion: API_VERSION, kind: 'OdysseyRollback', dryRun: false, actions };
}

module.exports = { applyProjection, isOwnedContent, prepare, rollbackProjection, safeLockPath, safeTargetPath, validateAcceptedPlan, verifyProjection };
