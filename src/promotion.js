'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { API_VERSION, EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { assertContract } = require('./schema');
const { hashBytes, hashObject, sortedUnique } = require('./stable');

const PROMOTION_CLASSIFICATIONS = Object.freeze([
  'portable-core',
  'pariss-overlay',
  'studio-overlay-candidate',
  'target-variable',
  'rejected-unsafe',
  'rejected-nonportable',
  'unchanged',
]);

const unsafePatterns = [
  { pattern: /\b(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/, reason: 'Secret-shaped literal cannot be promoted' },
  { pattern: /\b(?:auto(?:matically)?|silently?)\s+(?:merge|deploy|publish|rotate\s+secrets?)\b/i, reason: 'Autonomous external or privileged mutation is unsafe' },
  { pattern: /\b(?:bypass|disable)\s+(?:human|approval|policy|protected|security)\b/i, reason: 'Policy or approval bypass is unsafe' },
  { pattern: /\bstealth(?:y|ily)?\s+(?:automation|posting|messaging|behavior)\b/i, reason: 'Stealth behavior is unsafe' },
];

const sourceSpecificPatterns = [
  /\bStewieTech\/Pariss\b/i,
  /\bdevelopSIT\b/,
  /(?:^|[\s`'"(])\.agents\/(?:skills|goals)\//m,
  /\bPariss\b/,
  /\bLolaLingo\b/i,
];

const studioSpecificPatterns = [
  /\bStewieTech\/MaxCharacterWork\b/i,
  /\bMaxCharacterWork\b/i,
  /\bStudio(?:-owned|\s+(?:product|target|canon|validation|publishing))\b/i,
];

const targetVariablePatterns = [
  /<(?:base-branch|repository|target-root|validation-command|issue-tracker|product|production-domain)>/i,
  /\{\{(?:repository|branch|path|product|validator|issue_tracker)[^}]*\}\}/i,
  /\bTARGET_(?:REPOSITORY|BASE_BRANCH|PATH|PRODUCT|VALIDATORS?)\b/,
];

const nonportablePatterns = [
  { pattern: /\b(?:https?:\/\/)?(?:api\.)?[a-z0-9.-]+\.(?:com|net|io)\b/i, reason: 'Environment or provider domain is not portable' },
  { pattern: /\b(?:docker compose|kubectl|terraform apply|serverless deploy)\b/i, reason: 'Environment-specific operator command is not portable core' },
];

function normalizePath(value) {
  return String(value).replaceAll('\\', '/').replace(/^\.\//, '');
}

function normalizeFileEntries(files = []) {
  const input = Array.isArray(files)
    ? files
    : Object.entries(files).map(([filePath, content]) => ({ path: filePath, content }));
  const entries = input.map((entry) => ({
    path: normalizePath(entry.path),
    content: entry.content === null || entry.content === undefined ? null : String(entry.content).replaceAll('\r\n', '\n'),
  })).sort((left, right) => left.path.localeCompare(right.path));
  const paths = entries.map((entry) => entry.path);
  if (new Set(paths).size !== paths.length) {
    throw new HomerError('Promotion file sets cannot contain duplicate paths', EXIT.INVALID_CONTRACT, paths);
  }
  return entries;
}

function fingerprintFiles(files = []) {
  return hashObject(normalizeFileEntries(files).map((entry) => ({
    path: entry.path,
    exists: entry.content !== null,
    hash: entry.content === null ? null : hashBytes(entry.content),
  })));
}

function classifyPromotionChange({ path: sourcePath, beforeContent, afterContent, classification }) {
  if (classification !== undefined) {
    if (!PROMOTION_CLASSIFICATIONS.includes(classification)) {
      throw new HomerError(`Unknown promotion classification: ${classification}`, EXIT.INVALID_CONTRACT);
    }
  }
  const before = beforeContent === null || beforeContent === undefined ? null : String(beforeContent).replaceAll('\r\n', '\n');
  const after = afterContent === null || afterContent === undefined ? null : String(afterContent).replaceAll('\r\n', '\n');
  if (before === after) return { classification: 'unchanged', reason: 'Content hash is unchanged' };
  const content = after ?? before ?? '';
  const unsafe = unsafePatterns.find(({ pattern }) => pattern.test(content));
  if (unsafe) return { classification: 'rejected-unsafe', reason: unsafe.reason };
  if (classification !== undefined) return { classification, reason: 'Explicit reviewer classification' };
  if (sourceSpecificPatterns.some((pattern) => pattern.test(content))) {
    return { classification: 'pariss-overlay', reason: 'Source-repository identity, vocabulary, path, or branch belongs in the Pariss overlay' };
  }
  if (studioSpecificPatterns.some((pattern) => pattern.test(content))) {
    return { classification: 'studio-overlay-candidate', reason: 'Studio-specific behavior requires target review and an explicit Studio overlay' };
  }
  if (targetVariablePatterns.some((pattern) => pattern.test(content))) {
    return { classification: 'target-variable', reason: 'The value must be supplied by target policy' };
  }
  const nonportable = nonportablePatterns.find(({ pattern }) => pattern.test(content));
  if (nonportable) return { classification: 'rejected-nonportable', reason: nonportable.reason };
  return { classification: 'portable-core', reason: 'Reusable workflow behavior contains no detected repository or unsafe authority' };
}

function resolvePromotionDependencyClosure(selectedPackages = [], dependencyGraph = {}) {
  const selected = sortedUnique(selectedPackages);
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];

  function visit(packageId, stack = []) {
    if (!Object.hasOwn(dependencyGraph, packageId)) {
      throw new HomerError(`Missing promotion dependency node: ${packageId}`, EXIT.MISSING_DEPENDENCY, [...stack, packageId]);
    }
    if (visiting.has(packageId)) {
      throw new HomerError('Promotion dependency graph contains a cycle', EXIT.MISSING_DEPENDENCY, [...stack, packageId]);
    }
    if (visited.has(packageId)) return;
    visiting.add(packageId);
    for (const dependency of sortedUnique(dependencyGraph[packageId] || [])) visit(dependency, [...stack, packageId]);
    visiting.delete(packageId);
    visited.add(packageId);
    ordered.push(packageId);
  }

  for (const packageId of selected) visit(packageId);
  return ordered;
}

function normalizeChangeSet(value = {}) {
  return { added: sortedUnique(value.added || []), removed: sortedUnique(value.removed || []) };
}

function normalizeFileProposals(values = []) {
  const normalized = values.map((proposal) => {
    const content = proposal.content === null ? null : String(proposal.content ?? '').replaceAll('\r\n', '\n');
    const sourcePaths = sortedUnique(proposal.sourcePaths || [proposal.sourcePath].filter(Boolean)).map(normalizePath);
    const sourceFingerprints = (proposal.sourceFingerprints || sourcePaths.map((sourcePath) => ({
      path: sourcePath,
      hash: proposal.sourceContentHash || null,
    }))).map((entry) => ({ path: normalizePath(entry.path), hash: entry.hash ?? null }))
      .sort((left, right) => left.path.localeCompare(right.path));
    const calculatedHash = content === null ? null : hashBytes(content);
    if (proposal.contentHash !== undefined && proposal.contentHash !== calculatedHash) {
      throw new HomerError(`Promotion proposal payload hash does not match content: ${proposal.path}`, EXIT.PLAN_NOT_ACCEPTED);
    }
    return {
      path: normalizePath(proposal.path),
      sourcePaths,
      sourceFingerprints,
      classification: proposal.classification,
      decisionReason: proposal.decisionReason || 'Reviewed source-to-destination promotion decision',
      beforeHash: proposal.beforeHash ?? null,
      content,
      contentHash: calculatedHash,
    };
  }).sort((left, right) => left.path.localeCompare(right.path));
  const destinations = normalized.map((proposal) => proposal.path.toLowerCase());
  if (new Set(destinations).size !== destinations.length) {
    throw new HomerError('Promotion proposals contain duplicate or case-colliding destinations', EXIT.INVALID_CONTRACT, normalized.map((item) => item.path));
  }
  return normalized;
}

function promotionPlanIdentity(plan) {
  const identity = { ...plan };
  delete identity.planId;
  delete identity.accepted;
  delete identity.acceptedPlanId;
  delete identity.verification;
  return identity;
}

function createPromotionPlan(options) {
  const sourceFiles = normalizeFileEntries(options.source.files);
  const previousFiles = normalizeFileEntries(options.previousProvenance.files);
  const targetFiles = normalizeFileEntries(options.target.files);
  const sourceByPath = new Map(sourceFiles.map((entry) => [entry.path, entry.content]));
  const previousByPath = new Map(previousFiles.map((entry) => [entry.path, entry.content]));
  const classificationOverrides = options.classifications || {};
  const changedSourceFiles = sortedUnique([...sourceByPath.keys(), ...previousByPath.keys()]).map((sourcePath) => {
    const beforeContent = previousByPath.has(sourcePath) ? previousByPath.get(sourcePath) : null;
    const afterContent = sourceByPath.has(sourcePath) ? sourceByPath.get(sourcePath) : null;
    const classified = classifyPromotionChange({
      path: sourcePath,
      beforeContent,
      afterContent,
      classification: classificationOverrides[sourcePath],
    });
    return {
      path: sourcePath,
      beforeHash: beforeContent === null ? null : hashBytes(beforeContent),
      afterHash: afterContent === null ? null : hashBytes(afterContent),
      ...classified,
    };
  }).filter((change) => change.classification !== 'unchanged' || options.includeUnchanged === true);
  const packageFilters = sortedUnique(options.packageFilters || options.selectedPackages || []);
  const dependencyClosure = resolvePromotionDependencyClosure(
    options.selectedPackages || packageFilters,
    options.dependencyGraph || {},
  );
  const proposals = options.proposals || {};
  const rejectedContent = changedSourceFiles
    .filter((change) => change.classification.startsWith('rejected-'))
    .map(({ path: rejectedPath, classification, reason }) => ({ path: rejectedPath, classification, reason }));
  const plan = {
    apiVersion: API_VERSION,
    kind: 'PromotionPlan',
    accepted: false,
    acceptedPlanId: null,
    source: {
      repository: options.source.repository,
      commit: options.source.commit,
      fingerprint: fingerprintFiles(sourceFiles),
      paths: sourceFiles.map((entry) => entry.path),
    },
    previousProvenance: {
      repository: options.previousProvenance.repository || options.source.repository,
      commit: options.previousProvenance.commit,
      fingerprint: fingerprintFiles(previousFiles),
      paths: previousFiles.map((entry) => entry.path),
    },
    target: {
      fingerprint: fingerprintFiles(targetFiles),
      paths: targetFiles.map((entry) => entry.path),
    },
    packageFilters,
    dependencyClosure,
    changedSourceFiles,
    proposedPackageFiles: normalizeFileProposals(proposals.packageFiles),
    proposedOverlayFiles: normalizeFileProposals(proposals.overlayFiles),
    proposedTargetVariables: (proposals.targetVariables || []).map((variable) => ({ ...variable, sourcePath: normalizePath(variable.sourcePath) }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    capabilityChanges: normalizeChangeSet(proposals.capabilities),
    dependencyChanges: normalizeChangeSet(proposals.dependencies),
    referenceChanges: normalizeChangeSet(proposals.references),
    versionChanges: (proposals.versions || []).slice().sort((left, right) => left.package.localeCompare(right.package)),
    installerCatalogChanges: normalizeChangeSet(proposals.installerCatalog),
    rejectedContent,
    requiredEvaluations: sortedUnique(proposals.evaluations || []),
    humanAcceptanceRequired: changedSourceFiles.length > 0,
    verification: { status: 'pending', verifiedFingerprint: null },
  };
  plan.planId = hashObject(promotionPlanIdentity(plan));
  return assertContract('promotion-plan', plan);
}

function acceptPromotionPlan(plan) {
  assertContract('promotion-plan', plan);
  const currentPlanId = hashObject(promotionPlanIdentity(plan));
  if (plan.planId !== currentPlanId) {
    throw new HomerError('Promotion plan identity changed before acceptance', EXIT.PLAN_NOT_ACCEPTED);
  }
  return assertContract('promotion-plan', { ...plan, accepted: true, acceptedPlanId: plan.planId });
}

function assertCurrentAcceptedPlan(plan, current) {
  assertContract('promotion-plan', plan);
  const currentPlanId = hashObject(promotionPlanIdentity(plan));
  if (!plan.accepted || plan.acceptedPlanId !== plan.planId || currentPlanId !== plan.planId) {
    throw new HomerError('Promotion apply requires the exact accepted plan', EXIT.PLAN_NOT_ACCEPTED);
  }
  const stale = [];
  if (fingerprintFiles(current.sourceFiles) !== plan.source.fingerprint) stale.push('source');
  if (fingerprintFiles(current.provenanceFiles) !== plan.previousProvenance.fingerprint) stale.push('provenance');
  if (fingerprintFiles(current.targetFiles) !== plan.target.fingerprint) stale.push('target');
  if (stale.length) throw new HomerError('Promotion plan is stale', EXIT.PLAN_NOT_ACCEPTED, stale);
  return true;
}

function safeTargetPath(targetRoot, relativePath) {
  const absoluteRoot = path.resolve(targetRoot);
  const absolutePath = path.resolve(absoluteRoot, ...normalizePath(relativePath).split('/'));
  const relative = path.relative(absoluteRoot, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new HomerError(`Promotion path escapes target root: ${relativePath}`, EXIT.INVALID_CONTRACT);
  }
  return absolutePath;
}

async function applyPromotionPlan(options) {
  const plan = options.plan;
  assertCurrentAcceptedPlan(plan, options.current);
  const proposals = [...plan.proposedPackageFiles, ...plan.proposedOverlayFiles];
  const targetRoot = options.targetRoot;
  if (!targetRoot) throw new HomerError('Promotion apply requires a target root', EXIT.USAGE);
  const backups = [];
  try {
    for (const proposal of proposals) {
      const supplied = options.contentByPath instanceof Map
        ? options.contentByPath.get(proposal.path)
        : options.contentByPath?.[proposal.path];
      if (supplied !== undefined && String(supplied).replaceAll('\r\n', '\n') !== proposal.content) {
        throw new HomerError(`External payload differs from accepted plan: ${proposal.path}`, EXIT.PLAN_NOT_ACCEPTED);
      }
      const normalizedContent = proposal.content;
      if ((normalizedContent === null ? null : hashBytes(normalizedContent)) !== proposal.contentHash) {
        throw new HomerError(`Proposed content hash changed for ${proposal.path}`, EXIT.PLAN_NOT_ACCEPTED);
      }
      const absolutePath = safeTargetPath(targetRoot, proposal.path);
      const before = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath) : null;
      backups.push({ absolutePath, before });
      if (normalizedContent === null) fs.rmSync(absolutePath, { force: true });
      else {
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, normalizedContent, 'utf8');
      }
    }
    const verification = options.verify ? await options.verify({ plan, targetRoot }) : { passed: true };
    if (verification === false || verification?.passed === false) {
      throw new HomerError('Promotion verification failed', EXIT.EVAL_FAILED, verification?.details || []);
    }
    if (options.updateProvenance) await options.updateProvenance({ plan, targetRoot });
    return assertContract('promotion-plan', {
      ...plan,
      verification: {
        status: 'passed',
        verifiedFingerprint: hashObject(proposals.map(({ path: proposalPath, contentHash }) => ({ path: proposalPath, contentHash }))),
      },
    });
  } catch (error) {
    for (const backup of backups.reverse()) {
      if (backup.before === null) fs.rmSync(backup.absolutePath, { force: true });
      else fs.writeFileSync(backup.absolutePath, backup.before);
    }
    throw error;
  }
}

module.exports = {
  PROMOTION_CLASSIFICATIONS,
  acceptPromotionPlan,
  applyPromotionPlan,
  assertCurrentAcceptedPlan,
  classifyPromotionChange,
  createPromotionPlan,
  fingerprintFiles,
  promotionPlanIdentity,
  resolvePromotionDependencyClosure,
};
