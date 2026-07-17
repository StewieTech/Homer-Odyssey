'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadCatalog } = require('./catalog');
const { verifyGenericCatalog, renderGenericCatalog } = require('./catalog-renderer');
const { API_VERSION, EXIT } = require('./constants');
const { runPackageEvals } = require('./evals');
const { HomerError } = require('./errors');
const {
  acceptPromotionPlan,
  assertCurrentAcceptedPlan,
  classifyPromotionChange,
  createPromotionPlan,
  fingerprintFiles,
  resolvePromotionDependencyClosure,
} = require('./promotion');
const { assertContract } = require('./schema');
const { hashBytes, hashObject, sortedUnique } = require('./stable');

const projectRoot = path.resolve(__dirname, '..');

function git(sourceRoot, args, label) {
  const result = spawnSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new HomerError(`Cannot ${label}: ${(result.stderr || result.stdout).trim()}`, EXIT.INVALID_CONTRACT);
  return result.stdout.trim();
}

function readFileSet(root, paths) {
  return sortedUnique(paths).map((relativePath) => {
    const absolute = path.resolve(root, ...relativePath.split('/'));
    const relative = path.relative(root, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new HomerError(`Promotion path escapes root: ${relativePath}`, EXIT.INVALID_CONTRACT);
    return { path: relativePath, content: fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replaceAll('\r\n', '\n') : null };
  });
}

function gitFileSet(sourceRoot, commit, paths) {
  return sortedUnique(paths).map((relativePath) => {
    const result = spawnSync('git', ['-C', sourceRoot, 'show', `${commit}:${relativePath}`], { encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
    return { path: relativePath, content: result.status === 0 ? result.stdout.replaceAll('\r\n', '\n') : null };
  });
}

function walkFiles(root, prefix = '') {
  const absolute = path.join(root, ...prefix.split('/').filter(Boolean));
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [prefix];
  return fs.readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => walkFiles(root, [prefix, entry.name].filter(Boolean).join('/')))
    .sort();
}

function gitTreeFiles(sourceRoot, commit, pathspecs) {
  if (!pathspecs.length) return [];
  const result = spawnSync('git', ['-C', sourceRoot, 'ls-tree', '-r', '--name-only', commit, '--', ...pathspecs], {
    encoding: 'utf8', windowsHide: true, maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) throw new HomerError(`Cannot inspect governed source tree at ${commit}: ${(result.stderr || result.stdout).trim()}`, EXIT.INVALID_CONTRACT);
  return result.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).sort();
}

function genericCatalogPaths(targetRoot) {
  return ['lisa', 'lisa-prime', 'lorie', 'marge-product-architect', 'ralph', 'ralph-prime']
    .flatMap((name) => walkFiles(targetRoot, `.agents/skills/${name}`));
}

function governedSourceScope(packages) {
  const roots = packages.filter((item) => item.type === 'skill').map((item) => `.agents/skills/${item.id}`);
  if (packages.some((item) => item.type === 'character')) roots.push('.agents/skills/character-os');
  const covered = (sourcePath) => roots.some((root) => sourcePath === root || sourcePath.startsWith(`${root}/`));
  const exact = packages.flatMap((item) => item.descriptor.provenance.paths).filter((sourcePath) => !covered(sourcePath));
  return { roots: sortedUnique(roots), exact: sortedUnique(exact) };
}

function discoveredSourcePaths(sourceRoot, commit, packages) {
  const scope = governedSourceScope(packages);
  const current = sortedUnique([...scope.roots.flatMap((root) => walkFiles(sourceRoot, root)), ...scope.exact.filter((item) => fs.existsSync(path.join(sourceRoot, ...item.split('/'))))]);
  const previous = sortedUnique([...gitTreeFiles(sourceRoot, commit, scope.roots), ...gitTreeFiles(sourceRoot, commit, scope.exact)]);
  return sortedUnique([...current, ...previous, ...packages.flatMap((item) => item.descriptor.provenance.paths)]);
}

function promotionSelection(packageFilters = [], targetRoot = projectRoot) {
  const catalog = loadCatalog(targetRoot);
  const byKey = new Map(catalog.packages.map((item) => [item.key, item]));
  const graph = Object.fromEntries(catalog.packages.map((item) => [item.key, item.dependencies]));
  let roots;
  if (!packageFilters.length) roots = catalog.packages.map((item) => item.key);
  else {
    roots = packageFilters.flatMap((filter) => {
      if (filter.includes(':')) return byKey.has(filter) ? [filter] : [];
      return [`character:${filter}`, `skill:${filter}`].filter((key) => byKey.has(key));
    });
    const missing = packageFilters.filter((filter) => !roots.some((key) => key === filter || key.endsWith(`:${filter}`)));
    if (missing.length) throw new HomerError('Unknown promotion package filter', EXIT.MISSING_DEPENDENCY, missing);
  }
  const closure = resolvePromotionDependencyClosure(sortedUnique(roots), graph);
  return { catalog, closure, packages: closure.map((key) => byKey.get(key)) };
}

function targetPathsForPackages(packages, targetRoot = projectRoot) {
  const paths = [];
  for (const item of packages) {
    paths.push(item.descriptorPath, ...item.surfaces.filter((surface) => !surface.path.startsWith('adapter:')).map((surface) => surface.sourcePath));
    const plural = item.type === 'character' ? 'characters' : 'skills';
    for (const profile of ['generic', 'pariss', 'studio']) {
      const overlay = `profiles/overlays/${profile}/${plural}/${item.id}.md`;
      if (fs.existsSync(path.join(targetRoot, ...overlay.split('/')))) paths.push(overlay);
    }
  }
  return sortedUnique([...paths, ...genericCatalogPaths(targetRoot)]);
}

function ownerForPath(packages, sourcePath) {
  const skillMatch = /^\.agents\/skills\/([^/]+)\//.exec(sourcePath);
  if (skillMatch && skillMatch[1] !== 'character-os') {
    const direct = packages.filter((item) => item.type === 'skill' && item.id === skillMatch[1]);
    if (direct.length) return direct;
  }
  if (sourcePath.startsWith('.agents/skills/character-os/')) {
    const characters = packages.filter((item) => item.type === 'character');
    if (characters.length) return characters;
  }
  if (sourcePath.startsWith('.agents/goals/')) {
    const characters = packages.filter((item) => item.type === 'character' && item.descriptor.provenance.paths.some((candidate) => candidate.startsWith('.agents/goals/')));
    if (characters.length) return characters;
  }
  return packages.filter((item) => item.descriptor.provenance.paths.includes(sourcePath));
}

function sourceSlug(sourcePath) {
  return path.basename(sourcePath).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function proposedDestination(item, classification, sourcePath) {
  const plural = item.type === 'character' ? 'characters' : 'skills';
  if (classification === 'portable-core') {
    if (item.type === 'character' || sourcePath.endsWith('/SKILL.md')) return item.surfaces.find((surface) => surface.path === 'core.md')?.sourcePath || null;
    const slug = sourceSlug(sourcePath);
    const existing = item.surfaces.find((surface) => surface.path.startsWith('helpers/') && sourceSlug(surface.path) === slug);
    return existing?.sourcePath || `${item.packageRoot}/helpers/${slug}.md`;
  }
  if (classification === 'pariss-overlay') return `profiles/overlays/pariss/${plural}/${item.id}.md`;
  if (classification === 'studio-overlay-candidate') return `profiles/overlays/studio/${plural}/${item.id}.md`;
  return null;
}

function proposalSet(sourceFiles, previousFiles, packages, targetRoot, classificationOverrides = {}) {
  const before = new Map(previousFiles.map((item) => [item.path, item.content]));
  const targetByPath = new Map(readFileSet(targetRoot, targetPathsForPackages(packages, targetRoot)).map((item) => [item.path, item.content]));
  const grouped = new Map();
  const targetVariables = [];
  const classifications = {};
  for (const source of sourceFiles) {
    let classified = classifyPromotionChange({
      path: source.path,
      beforeContent: before.get(source.path),
      afterContent: source.content,
      classification: classificationOverrides[source.path],
    });
    if (!classificationOverrides[source.path]
      && classified.classification === 'portable-core'
      && (source.path.startsWith('.agents/skills/character-os/') || source.path.startsWith('.agents/goals/'))) {
      classified = { classification: 'pariss-overlay', reason: 'Shared source-system governance remains in reviewed Pariss overlays' };
    }
    classifications[source.path] = classified.classification;
    if (classified.classification === 'unchanged') continue;
    if (classified.classification === 'target-variable') {
      targetVariables.push({
        name: `TARGET_${path.basename(source.path).replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`,
        sourcePath: source.path,
        description: `Target-owned value extracted from ${source.path}`,
        required: true,
      });
      continue;
    }
    for (const owner of ownerForPath(packages, source.path)) {
      const destination = proposedDestination(owner, classified.classification, source.path);
      if (!destination) continue;
      const key = `${classified.classification === 'portable-core' ? 'package' : 'overlay'}:${destination}`;
      const current = grouped.get(key) || {
        kind: classified.classification === 'portable-core' ? 'package' : 'overlay',
        path: destination,
        classification: classified.classification,
        decisionReason: classified.reason,
        beforeHash: targetByPath.get(destination) === null || targetByPath.get(destination) === undefined ? null : hashBytes(targetByPath.get(destination)),
        sourcePaths: [],
        sourceFingerprints: [],
        contents: [],
      };
      current.sourcePaths.push(source.path);
      current.sourceFingerprints.push({ path: source.path, hash: source.content === null ? null : hashBytes(source.content) });
      current.contents.push({ sourcePath: source.path, content: source.content });
      grouped.set(key, current);
    }
  }
  const packageFiles = [];
  const overlayFiles = [];
  for (const entry of [...grouped.values()].sort((left, right) => left.path.localeCompare(right.path))) {
    const orderedContents = entry.contents.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
    let content;
    if (entry.kind === 'package' && orderedContents.length === 1) content = orderedContents[0].content;
    else if (entry.kind === 'package') {
      throw new HomerError(`Multiple portable sources resolve to one canonical destination: ${entry.path}`, EXIT.INVALID_CONTRACT, entry.sourcePaths);
    } else {
      const existing = targetByPath.get(entry.path) || `# Reviewed ${entry.classification} content`;
      const additions = orderedContents.map((item) => `## Promoted source: ${item.sourcePath}\n\n${item.content === null ? '_Source removed at the accepted commit._' : item.content.trim()}`).join('\n\n');
      content = `${existing.trim()}\n\n${additions}\n`;
    }
    const proposal = {
      path: entry.path,
      sourcePaths: sortedUnique(entry.sourcePaths),
      sourceFingerprints: entry.sourceFingerprints.sort((left, right) => left.path.localeCompare(right.path)),
      classification: entry.classification,
      decisionReason: entry.decisionReason,
      beforeHash: entry.beforeHash,
      content,
    };
    (entry.kind === 'package' ? packageFiles : overlayFiles).push(proposal);
  }
  const uniqueVariables = [...new Map(targetVariables.map((item) => [`${item.name}:${item.sourcePath}`, item])).values()];
  return { classifications, packageFiles, overlayFiles, targetVariables: uniqueVariables };
}

function repositoryPromotionState({ sourceRoot, packageFilters = [], targetRoot = projectRoot }) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedTarget = path.resolve(targetRoot);
  if (!fs.existsSync(resolvedSource)) throw new HomerError(`Promotion source root does not exist: ${resolvedSource}`, EXIT.INVALID_CONTRACT);
  if (!fs.existsSync(resolvedTarget)) throw new HomerError(`Promotion target root does not exist: ${resolvedTarget}`, EXIT.INVALID_CONTRACT);
  const selection = promotionSelection(packageFilters, resolvedTarget);
  const commits = sortedUnique(selection.packages.map((item) => item.descriptor.provenance.commit));
  if (commits.length !== 1) throw new HomerError('Selected promotion closure spans multiple provenance commits', EXIT.INVALID_CONTRACT, commits);
  const provenanceCommit = commits[0];
  const sourcePaths = discoveredSourcePaths(resolvedSource, provenanceCommit, selection.packages);
  const sourceFiles = readFileSet(resolvedSource, sourcePaths);
  const previousFiles = gitFileSet(resolvedSource, provenanceCommit, sourcePaths);
  const targetPaths = targetPathsForPackages(selection.packages, resolvedTarget);
  const targetFiles = readFileSet(resolvedTarget, targetPaths);
  return {
    sourceRoot: resolvedSource,
    targetRoot: resolvedTarget,
    sourceCommit: git(resolvedSource, ['rev-parse', 'HEAD'], 'read promotion source commit'),
    sourceRepository: git(resolvedSource, ['remote', 'get-url', 'origin'], 'read promotion source repository'),
    provenanceCommit,
    selection,
    sourceFiles,
    previousFiles,
    targetFiles,
  };
}

function setDelta(afterValues, beforeValues) {
  const after = new Set(afterValues);
  const before = new Set(beforeValues);
  return {
    added: [...after].filter((item) => !before.has(item)).sort(),
    removed: [...before].filter((item) => !after.has(item)).sort(),
  };
}

function mentionedTokens(files, tokens) {
  const text = files.filter((item) => item.content !== null).map((item) => item.content).join('\n').toLowerCase();
  return tokens.filter((token) => text.includes(token.toLowerCase())).sort();
}

function nextPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) return version;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4] || ''}`;
}

function packageKeyForDestination(destination, catalog) {
  const match = /^packages\/(skills|characters)\/([^/]+)\//.exec(destination);
  if (!match) return null;
  const key = `${match[1] === 'skills' ? 'skill' : 'character'}:${match[2]}`;
  return catalog.packages.some((item) => item.key === key) ? key : null;
}

function computedDeltas(state, proposals) {
  const capabilityTokens = sortedUnique(state.selection.catalog.packages.flatMap((item) => [
    ...(item.descriptor.capabilities || []),
    ...(item.descriptor.permissions?.requested || []),
    ...(item.descriptor.permissions?.prohibited || []),
  ]));
  const dependencyTokens = sortedUnique(state.selection.catalog.packages.map((item) => item.id));
  const currentPaths = state.sourceFiles.filter((item) => item.content !== null).map((item) => item.path);
  const previousPaths = state.previousFiles.filter((item) => item.content !== null).map((item) => item.path);
  const affectedPackages = sortedUnique(proposals.packageFiles.map((item) => packageKeyForDestination(item.path, state.selection.catalog)).filter(Boolean));
  return {
    capabilities: setDelta(mentionedTokens(state.sourceFiles, capabilityTokens), mentionedTokens(state.previousFiles, capabilityTokens)),
    dependencies: setDelta(mentionedTokens(state.sourceFiles, dependencyTokens), mentionedTokens(state.previousFiles, dependencyTokens)),
    references: setDelta(currentPaths, previousPaths),
    versions: affectedPackages.map((key) => {
      const item = state.selection.catalog.packages.find((candidate) => candidate.key === key);
      return { package: key, from: item.version, to: nextPatch(item.version), reason: 'Portable canonical content changed' };
    }),
    installerCatalog: {
      added: affectedPackages.filter((key) => key.startsWith('skill:')).map((key) => `refresh:${key.slice('skill:'.length)}`),
      removed: [],
    },
    evaluations: sortedUnique(state.selection.packages.flatMap((item) => item.descriptor.evals.map((evaluation) => `${item.key}:${evaluation}`))),
  };
}

function loadReviewPlan(reviewPath) {
  if (!reviewPath) return null;
  const absolute = path.resolve(reviewPath);
  if (!fs.existsSync(absolute)) throw new HomerError(`Reviewed promotion plan does not exist: ${absolute}`, EXIT.INVALID_CONTRACT);
  const review = JSON.parse(fs.readFileSync(absolute, 'utf8'));
  if (review.kind !== 'PromotionPlan' || !Array.isArray(review.changedSourceFiles)) throw new HomerError('Reviewed promotion input is not a PromotionPlan', EXIT.INVALID_CONTRACT);
  return review;
}

function reviewProposals(values, sourceByPath, targetRoot) {
  return (values || []).map((proposal) => {
    const sourcePaths = sortedUnique(proposal.sourcePaths || [proposal.sourcePath].filter(Boolean));
    const absolute = path.join(targetRoot, ...String(proposal.path).split('/'));
    const beforeContent = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replaceAll('\r\n', '\n') : null;
    return {
      ...proposal,
      sourcePaths,
      sourceFingerprints: sourcePaths.map((sourcePath) => ({ path: sourcePath, hash: sourceByPath.get(sourcePath) === null ? null : hashBytes(sourceByPath.get(sourcePath)) })),
      beforeHash: beforeContent === null ? null : hashBytes(beforeContent),
      contentHash: undefined,
    };
  });
}

function validateReviewedCoverage(plan) {
  const proposalSources = new Set([...plan.proposedPackageFiles, ...plan.proposedOverlayFiles].flatMap((item) => item.sourcePaths));
  const variableSources = new Set(plan.proposedTargetVariables.map((item) => item.sourcePath));
  const missing = plan.changedSourceFiles.filter((item) => {
    if (item.classification === 'portable-core' || item.classification === 'pariss-overlay' || item.classification === 'studio-overlay-candidate') return !proposalSources.has(item.path);
    if (item.classification === 'target-variable') return !variableSources.has(item.path);
    return false;
  }).map((item) => `${item.path}:${item.classification}`);
  if (missing.length) throw new HomerError('Reviewed promotion plan leaves changed source content without a decision payload', EXIT.PLAN_NOT_ACCEPTED, missing);
  const unsafePayloads = [...plan.proposedPackageFiles, ...plan.proposedOverlayFiles].filter((proposal) => {
    if (proposal.content === null) return false;
    return classifyPromotionChange({ path: proposal.path, beforeContent: null, afterContent: proposal.content }).classification === 'rejected-unsafe';
  }).map((proposal) => proposal.path);
  if (unsafePayloads.length) throw new HomerError('Reviewed promotion payload contains unsafe or secret-shaped content', EXIT.SECURITY_POLICY, unsafePayloads);
}

function buildRepositoryPromotionPlan(options) {
  const state = repositoryPromotionState(options);
  const review = options.reviewPlan || loadReviewPlan(options.reviewPath);
  if (review) {
    const stale = [];
    if (review.source?.commit !== state.sourceCommit || review.source?.fingerprint !== fingerprintFiles(state.sourceFiles)) stale.push('source');
    if (review.previousProvenance?.commit !== state.provenanceCommit || review.previousProvenance?.fingerprint !== fingerprintFiles(state.previousFiles)) stale.push('provenance');
    if (review.target?.fingerprint !== fingerprintFiles(readFileSet(state.targetRoot, review.target?.paths || []))) stale.push('target');
    if (JSON.stringify(review.dependencyClosure) !== JSON.stringify(state.selection.closure)) stale.push('dependency-closure');
    if (stale.length) throw new HomerError('Reviewed promotion plan is stale', EXIT.PLAN_NOT_ACCEPTED, stale);
    const reviewedTargetPaths = new Set(review.target.paths);
    const unboundDestinations = [...(review.proposedPackageFiles || []), ...(review.proposedOverlayFiles || [])]
      .map((item) => item.path).filter((destination) => !reviewedTargetPaths.has(destination));
    if (unboundDestinations.length) throw new HomerError('Reviewed promotion destination was not fingerprinted by the draft', EXIT.PLAN_NOT_ACCEPTED, unboundDestinations);
  }
  const classifications = review ? Object.fromEntries(review.changedSourceFiles.map((item) => [item.path, item.classification])) : {};
  const auto = proposalSet(state.sourceFiles, state.previousFiles, state.selection.packages, state.targetRoot, classifications);
  const sourceByPath = new Map(state.sourceFiles.map((item) => [item.path, item.content]));
  const proposals = review ? {
    packageFiles: reviewProposals(review.proposedPackageFiles, sourceByPath, state.targetRoot),
    overlayFiles: reviewProposals(review.proposedOverlayFiles, sourceByPath, state.targetRoot),
    targetVariables: review.proposedTargetVariables || [],
    classifications,
  } : auto;
  const deltas = review ? {
    capabilities: review.capabilityChanges,
    dependencies: review.dependencyChanges,
    references: review.referenceChanges,
    versions: review.versionChanges,
    installerCatalog: review.installerCatalogChanges,
    evaluations: review.requiredEvaluations,
  } : computedDeltas(state, proposals);
  const proposalPaths = [...proposals.packageFiles, ...proposals.overlayFiles].map((item) => item.path);
  state.targetFiles = readFileSet(state.targetRoot, sortedUnique([...targetPathsForPackages(state.selection.packages, state.targetRoot), ...proposalPaths]));
  const draft = createPromotionPlan({
    source: { repository: state.sourceRepository, commit: state.sourceCommit, files: state.sourceFiles },
    previousProvenance: { repository: state.sourceRepository, commit: state.provenanceCommit, files: state.previousFiles },
    target: { files: state.targetFiles },
    packageFilters: options.packageFilters || [],
    selectedPackages: state.selection.packages.map((item) => item.key),
    dependencyGraph: Object.fromEntries(state.selection.catalog.packages.map((item) => [item.key, item.dependencies])),
    classifications: proposals.classifications,
    proposals: {
      ...proposals,
      ...deltas,
    },
  });
  validateReviewedCoverage(draft);
  return { plan: options.accept ? acceptPromotionPlan(draft) : draft, state };
}

function inspectRepositoryPromotion(options) {
  const { plan } = buildRepositoryPromotionPlan(options);
  const counts = Object.fromEntries(plan.changedSourceFiles.map((item) => item.classification).filter((item, index, values) => values.indexOf(item) === index).sort().map((classification) => [classification, plan.changedSourceFiles.filter((item) => item.classification === classification).length]));
  return {
    apiVersion: API_VERSION,
    kind: 'PromotionInspection',
    sourceCommit: plan.source.commit,
    previousProvenanceCommit: plan.previousProvenance.commit,
    sourceFingerprint: plan.source.fingerprint,
    targetFingerprint: plan.target.fingerprint,
    packageFilters: plan.packageFilters,
    dependencyClosure: plan.dependencyClosure,
    changedSourceFiles: plan.changedSourceFiles,
    classifications: counts,
    humanAcceptanceRequired: plan.humanAcceptanceRequired,
  };
}

function currentForPlan(plan, sourceRoot, targetRoot = projectRoot) {
  return {
    sourceFiles: readFileSet(sourceRoot, plan.source.paths),
    provenanceFiles: gitFileSet(sourceRoot, plan.previousProvenance.commit, plan.previousProvenance.paths),
    targetFiles: readFileSet(targetRoot, plan.target.paths),
  };
}

function verifyCanonicalCandidate(targetRoot = projectRoot, dependencyClosure = [], requiredEvaluations = []) {
  const catalog = loadCatalog(targetRoot);
  const issues = [...catalog.conflicts, ...catalog.packages.flatMap((item) => item.issues)];
  if (issues.length) throw new HomerError('Canonical package candidate failed dependency/reference validation', EXIT.MISSING_DEPENDENCY, issues.map((item) => item.message || item.type));
  for (const item of catalog.packages) {
    for (const surface of item.surfaces.filter((entry) => entry.path.endsWith('.json'))) JSON.parse(surface.content);
  }
  const selected = dependencyClosure.length ? catalog.packages.filter((item) => dependencyClosure.includes(item.key)) : catalog.packages;
  const declaredEvaluations = sortedUnique(selected.flatMap((item) => item.descriptor.evals.map((evaluation) => `${item.key}:${evaluation}`)));
  const missing = declaredEvaluations.filter((evaluation) => !requiredEvaluations.includes(evaluation));
  if (missing.length) throw new HomerError('Promotion plan omitted required package evaluations', EXIT.EVAL_FAILED, missing);
  const projections = selected.flatMap((item) => item.surfaces.filter((surface) => !surface.path.startsWith('adapter:')).map((surface) => ({ sourcePath: surface.sourcePath, content: surface.content })));
  const profile = JSON.parse(fs.readFileSync(path.join(targetRoot, 'profiles', 'studio.json'), 'utf8'));
  const evaluations = runPackageEvals(selected, projections, profile);
  const failed = evaluations.filter((item) => !item.passed);
  if (failed.length) throw new HomerError('Canonical package candidate failed required evaluations', EXIT.EVAL_FAILED, failed.map((item) => `${item.package}:${item.name}:${item.message}`));
  return { catalog, evaluations };
}

function restoreSnapshot(snapshot) {
  for (const item of snapshot) {
    if (item.existed) {
      fs.mkdirSync(path.dirname(item.absolute), { recursive: true });
      fs.writeFileSync(item.absolute, item.content);
    } else if (fs.existsSync(item.absolute)) fs.rmSync(item.absolute, { force: true });
  }
}

function snapshotCatalogTrees(targetRoot) {
  return ['lisa', 'lisa-prime', 'lorie', 'marge-product-architect', 'ralph', 'ralph-prime'].map((name) => {
    const relativeRoot = `.agents/skills/${name}`;
    const absoluteRoot = path.join(targetRoot, ...relativeRoot.split('/'));
    return {
      absoluteRoot,
      existed: fs.existsSync(absoluteRoot),
      files: walkFiles(targetRoot, relativeRoot).map((relativePath) => ({
        relativePath: path.relative(absoluteRoot, path.join(targetRoot, ...relativePath.split('/'))),
        content: fs.readFileSync(path.join(targetRoot, ...relativePath.split('/'))),
      })),
    };
  });
}

function restoreCatalogTrees(snapshot) {
  for (const tree of snapshot) {
    fs.rmSync(tree.absoluteRoot, { recursive: true, force: true });
    if (!tree.existed) continue;
    for (const file of tree.files) {
      const absolute = path.join(tree.absoluteRoot, file.relativePath);
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, file.content);
    }
  }
}

function applyRepositoryPromotion({ sourceRoot, planPath, targetRoot = projectRoot }) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedTarget = path.resolve(targetRoot);
  const plan = assertContract('promotion-plan', JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8')));
  assertCurrentAcceptedPlan(plan, currentForPlan(plan, resolvedSource, resolvedTarget));
  if (plan.rejectedContent.length) throw new HomerError('Accepted promotion plan still contains rejected content', EXIT.SECURITY_POLICY, plan.rejectedContent.map((item) => `${item.path}:${item.reason}`));
  const proposalPaths = [...plan.proposedPackageFiles, ...plan.proposedOverlayFiles].map((item) => item.path);
  const selectedItems = loadCatalog(resolvedTarget).packages.filter((item) => plan.dependencyClosure.includes(item.key));
  const selectedDescriptors = selectedItems.map((item) => item.descriptorPath);
  const snapshotPaths = sortedUnique([...proposalPaths, ...selectedDescriptors]);
  const snapshot = snapshotPaths.map((relativePath) => {
    const absolute = path.join(resolvedTarget, ...relativePath.split('/'));
    return { absolute, existed: fs.existsSync(absolute), content: fs.existsSync(absolute) ? fs.readFileSync(absolute) : null };
  });
  const catalogSnapshot = snapshotCatalogTrees(resolvedTarget);
  try {
    for (const proposal of [...plan.proposedPackageFiles, ...plan.proposedOverlayFiles]) {
      const absolute = path.join(resolvedTarget, ...proposal.path.split('/'));
      const before = fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8').replaceAll('\r\n', '\n') : null;
      const beforeHash = before === null ? null : hashBytes(before);
      if (beforeHash !== proposal.beforeHash) throw new HomerError(`Promotion destination changed before apply: ${proposal.path}`, EXIT.PLAN_NOT_ACCEPTED);
      if ((proposal.content === null ? null : hashBytes(proposal.content)) !== proposal.contentHash) throw new HomerError(`Accepted promotion payload changed: ${proposal.path}`, EXIT.PLAN_NOT_ACCEPTED);
      if (proposal.content === null) fs.rmSync(absolute, { force: true });
      else {
        fs.mkdirSync(path.dirname(absolute), { recursive: true });
        fs.writeFileSync(absolute, proposal.content, 'utf8');
      }
    }
    const versions = new Map(plan.versionChanges.map((item) => [item.package, item]));
    for (const item of selectedItems) {
      const descriptorPath = item.descriptorPath;
      const absolute = path.join(resolvedTarget, ...descriptorPath.split('/'));
      const descriptor = JSON.parse(fs.readFileSync(absolute, 'utf8'));
      const versionChange = versions.get(item.key);
      if (versionChange) {
        if (descriptor.version !== versionChange.from) throw new HomerError(`Promotion version baseline changed: ${item.key}`, EXIT.PLAN_NOT_ACCEPTED);
        descriptor.version = versionChange.to;
      }
      if (item.type === 'skill') {
        const helperPrefix = `${item.packageRoot}/helpers/`;
        const helpers = plan.proposedPackageFiles.filter((proposal) => proposal.content !== null && proposal.path.startsWith(helperPrefix))
          .map((proposal) => proposal.path.slice(item.packageRoot.length + 1));
        const removedHelpers = new Set(plan.proposedPackageFiles.filter((proposal) => proposal.content === null && proposal.path.startsWith(helperPrefix))
          .map((proposal) => proposal.path.slice(item.packageRoot.length + 1)));
        descriptor.dependencies.helpers = sortedUnique([...(descriptor.dependencies.helpers || []).filter((helper) => !removedHelpers.has(helper)), ...helpers]);
        descriptor.references = sortedUnique([...(descriptor.references || []).filter((helper) => !removedHelpers.has(helper)), ...helpers]);
      }
      fs.writeFileSync(absolute, `${JSON.stringify(descriptor, null, 2)}\n`);
    }
    verifyCanonicalCandidate(resolvedTarget, plan.dependencyClosure, plan.requiredEvaluations);
    const sourceNow = new Map(readFileSet(resolvedSource, plan.source.paths).map((item) => [item.path, item.content]));
    for (const item of selectedItems) {
      const descriptorPath = item.descriptorPath;
      const absolute = path.join(resolvedTarget, ...descriptorPath.split('/'));
      const descriptor = JSON.parse(fs.readFileSync(absolute, 'utf8'));
      descriptor.provenance.commit = plan.source.commit;
      const relevant = plan.source.paths.filter((sourcePath) => ownerForPath([item], sourcePath).length && sourceNow.get(sourcePath) !== null);
      descriptor.provenance.paths = sortedUnique([...descriptor.provenance.paths.filter((sourcePath) => sourceNow.get(sourcePath) !== null), ...relevant]);
      fs.writeFileSync(absolute, `${JSON.stringify(descriptor, null, 2)}\n`);
    }
    renderGenericCatalog({ sourceRoot: resolvedTarget });
    const verified = verifyCanonicalCandidate(resolvedTarget, plan.dependencyClosure, plan.requiredEvaluations);
    const parity = verifyGenericCatalog({ sourceRoot: resolvedTarget });
    if (!parity.ok) throw new HomerError('Promotion left the generic catalog out of parity', EXIT.DRIFT, parity.issues.map((item) => `${item.type}:${item.path}`));
    return assertContract('promotion-plan', {
      ...plan,
      verification: { status: 'passed', verifiedFingerprint: hashObject({ packages: selectedDescriptors, catalogHash: parity.catalogHash, evaluations: verified.evaluations }) },
    });
  } catch (error) {
    restoreSnapshot(snapshot);
    restoreCatalogTrees(catalogSnapshot);
    throw error;
  }
}

function verifyRepositoryPromotion(options) {
  const { plan, state } = buildRepositoryPromotionPlan(options);
  const catalog = loadCatalog(state.targetRoot);
  const packageIssues = [...catalog.conflicts, ...catalog.packages.flatMap((item) => item.issues)];
  const parity = verifyGenericCatalog({ sourceRoot: state.targetRoot });
  let evaluationDetails = [];
  try {
    verifyCanonicalCandidate(state.targetRoot, plan.dependencyClosure, plan.requiredEvaluations);
  } catch (error) {
    evaluationDetails = error.details?.length ? error.details : [error.message];
  }
  const checks = [
    { name: 'provenance-drift', passed: plan.changedSourceFiles.length === 0, details: plan.changedSourceFiles.map((item) => item.path) },
    { name: 'package-contracts', passed: packageIssues.length === 0, details: packageIssues.map((item) => item.message || item.type) },
    { name: 'required-evaluations', passed: evaluationDetails.length === 0, details: evaluationDetails },
    { name: 'catalog-parity', passed: parity.ok, details: parity.issues.map((item) => `${item.type}:${item.path}`) },
  ];
  return { apiVersion: API_VERSION, kind: 'PromotionVerification', verdict: checks.every((item) => item.passed) ? 'PASS' : 'FAILED', exitCode: checks.every((item) => item.passed) ? EXIT.OK : EXIT.DRIFT, sourceCommit: plan.source.commit, previousProvenanceCommit: plan.previousProvenance.commit, dependencyClosure: plan.dependencyClosure, checks };
}

module.exports = {
  applyRepositoryPromotion,
  buildRepositoryPromotionPlan,
  inspectRepositoryPromotion,
  repositoryPromotionState,
  verifyRepositoryPromotion,
};
