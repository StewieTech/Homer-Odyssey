'use strict';

const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { API_VERSION, EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { loadCatalog } = require('./catalog');
const { blockingMissingDependencies, buildInventory, treeFingerprint } = require('./inventory');
const { applyProjection, rollbackProjection, safeLockPath, validateAcceptedPlan, verifyProjection } = require('./application');
const { buildDiff, buildPlan, privilegeDelta } = require('./planning');
const { buildProjectedArtifact } = require('./projection');
const { assertContract } = require('./schema');
const { hashObject, sortedUnique } = require('./stable');

const RUN_STATES = Object.freeze([
  'requested', 'resolving_target', 'inspecting', 'drift_detected', 'no_drift',
  'planning', 'plan_ready', 'awaiting_approval', 'applying', 'validating',
  'pr_created', 'blocked', 'failed', 'cancelled', 'rolled_back',
  'inspection_ready', 'branch_created', 'applied', 'verified', 'rollback_ready',
]);

const TERMINAL_STATES = new Set([
  'drift_detected', 'no_drift', 'plan_ready', 'awaiting_approval', 'pr_created',
  'blocked', 'failed', 'cancelled', 'rolled_back', 'inspection_ready',
  'branch_created', 'applied', 'verified', 'rollback_ready',
]);

const LEGAL_TRANSITIONS = Object.freeze({
  requested: ['resolving_target', 'cancelled'],
  resolving_target: ['inspecting', 'blocked', 'failed', 'cancelled'],
  inspecting: ['inspection_ready', 'drift_detected', 'no_drift', 'planning', 'validating', 'applying', 'blocked', 'failed', 'cancelled'],
  drift_detected: ['planning', 'cancelled'],
  no_drift: ['cancelled'],
  planning: ['drift_detected', 'no_drift', 'plan_ready', 'awaiting_approval', 'rollback_ready', 'blocked', 'failed', 'cancelled'],
  plan_ready: ['awaiting_approval', 'applying', 'cancelled'],
  awaiting_approval: ['applying', 'cancelled'],
  applying: ['branch_created', 'applied', 'validating', 'pr_created', 'blocked', 'failed', 'cancelled'],
  applied: ['validating', 'blocked', 'failed'],
  validating: ['verified', 'pr_created', 'rolled_back', 'blocked', 'failed'],
  verified: ['pr_created'],
  inspection_ready: [], branch_created: [], pr_created: [], rollback_ready: [],
  blocked: [], failed: [], cancelled: [], rolled_back: [],
});

class InMemoryRunStore {
  constructor() {
    this.results = new Map();
    this.leases = new Set();
  }

  replay(idempotencyKey, inputHash) {
    const saved = this.results.get(idempotencyKey);
    if (!saved) return null;
    if (saved.inputHash !== inputHash) {
      throw new HomerError('Idempotency key was already used with incompatible inputs', EXIT.INVALID_CONTRACT);
    }
    const response = structuredClone(saved.response);
    response.run.retry.replayed = true;
    return response;
  }

  save(idempotencyKey, inputHash, response) {
    this.results.set(idempotencyKey, { inputHash, response: structuredClone(response) });
  }

  acquireLease(key) {
    if (this.leases.has(key)) throw new HomerError(`A mutating Odyssey Run already holds lease ${key}`, EXIT.SECURITY_POLICY);
    this.leases.add(key);
  }

  releaseLease(key) { this.leases.delete(key); }
}

function transition(run, next, reason = '') {
  const allowed = LEGAL_TRANSITIONS[run.status] || [];
  if (!allowed.includes(next)) {
    throw new HomerError(`Illegal Odyssey Run transition: ${run.status} -> ${next}`, EXIT.INTERNAL);
  }
  const previous = run.status;
  run.status = next;
  run.transitionHistory.push({ from: previous, to: next, sequence: run.transitionHistory.length, ...(reason ? { reason } : {}) });
  return run;
}

function classifyFailure(error) {
  const message = error.message.toLowerCase();
  if (message.includes('authentication')) return 'authentication';
  if (message.includes('authorization') || message.includes('lease')) return 'authorization';
  if (message.includes('repository')) return 'repository_unavailable';
  if (error.exitCode === EXIT.INVALID_CONTRACT) return 'invalid_profile';
  if (error.exitCode === EXIT.MISSING_DEPENDENCY) return 'dependency_conflict';
  if (error.exitCode === EXIT.PROTECTED_CONFLICT) return 'protected_file_conflict';
  if (error.exitCode === EXIT.UNSAFE_PRIVILEGE) return 'privilege_increase';
  if (error.exitCode === EXIT.PLAN_NOT_ACCEPTED || message.includes('stale')) return 'stale_plan';
  if (message.includes('pull request conflict') || message.includes('conflicting odyssey pull request')) return 'target_pull_request_conflict';
  if (message.includes('workflow')) return 'workflow_failure';
  if (error.exitCode === EXIT.SECURITY_POLICY) return 'policy_violation';
  if ([EXIT.EVAL_FAILED, EXIT.DRIFT, EXIT.ROLLBACK_FAILED].includes(error.exitCode)) return 'validation_failure';
  return 'internal_error';
}

function validGitRef(value) {
  return typeof value === 'string'
    && value.length > 0
    && !value.startsWith('-')
    && !value.endsWith('/')
    && !value.endsWith('.lock')
    && !value.includes('..')
    && !value.includes('@{')
    && !/[\s~^:?*[\\]/.test(value);
}

function checkedOutBranch(repositoryRoot) {
  try {
    return execFileSync('git', ['-C', repositoryRoot, 'branch', '--show-current'], { encoding: 'utf8', windowsHide: true }).trim();
  } catch { return ''; }
}

function sanitizeEvidence(value, key = '') {
  if (/token|password|secret|authorization|cookie|contentBase64|previousLockBase64/i.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => sanitizeEvidence(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitizeEvidence(child, childKey)]));
  }
  if (typeof value === 'string') {
    return value
      .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED]')
      .replace(/\b(?:token|password|secret)\s*[:=]\s*\S+/gi, '[REDACTED]');
  }
  return value;
}

function containsCredential(value) {
  return typeof value === 'string' && /(?:\bgh[pousr]_[A-Za-z0-9_]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\b(?:token|password|secret)\s*[:=])/i.test(value);
}

function readAcceptedPlan(planPath) {
  if (!planPath) throw new HomerError('Operation requires planPath for an accepted Odyssey Plan', EXIT.PLAN_NOT_ACCEPTED);
  let value;
  try { value = JSON.parse(fs.readFileSync(planPath, 'utf8')); }
  catch (error) { throw new HomerError(`Cannot read Odyssey Plan at ${planPath}: ${error.message}`, EXIT.INVALID_CONTRACT); }
  return assertContract('odyssey-plan', value);
}

function planFreshnessReasons(accepted, current, config, context = {}) {
  const reasons = [];
  if (!accepted.accepted) reasons.push('plan_not_accepted');
  if (accepted.inputs.source?.commit !== current.inputs.source?.commit) reasons.push('homer_source_commit_changed');
  if (accepted.inputs.source?.hash !== current.inputs.source?.hash) reasons.push('homer_source_or_overlay_changed');
  if (accepted.inputs.target?.commit !== current.inputs.target?.commit) reasons.push('target_ref_changed');
  if (accepted.inputs.target?.hash !== current.inputs.target?.hash) reasons.push('target_lock_or_managed_files_changed');
  if (hashObject(accepted.profile) !== hashObject(current.profile)) reasons.push('profile_or_policy_changed');
  if (hashObject(accepted.privilegeDelta) !== hashObject(current.privilegeDelta)) reasons.push('privilege_calculation_changed');
  if (accepted.targetDeclarationHash !== current.targetDeclarationHash) reasons.push('target_declaration_changed');
  if (accepted.inventoryHash !== current.inventoryHash) reasons.push('inventory_changed');
  if (accepted.planId !== current.planId) reasons.push('plan_identity_changed');
  if (context.conflictingPullRequest) reasons.push('conflicting_odyssey_pull_request');
  return sortedUnique(reasons);
}

function ensureFreshPlan(request, inventory, config, context) {
  const accepted = readAcceptedPlan(request.planPath);
  if (hashObject(accepted.packageFilters || []) !== hashObject(request.packageFilters)) {
    throw new HomerError('Accepted Odyssey Plan package filters do not match the operation request', EXIT.PLAN_NOT_ACCEPTED, ['package_filters_changed']);
  }
  const current = buildPlan(inventory, config, { packageFilters: accepted.packageFilters || [] });
  const reasons = planFreshnessReasons(accepted, current, config, context);
  if (reasons.length) throw new HomerError('Accepted Odyssey Plan is stale for the current inputs', EXIT.PLAN_NOT_ACCEPTED, reasons);
  validateAcceptedPlan(request.planPath, inventory, config);
  if (current.privilegeDelta.added.length && !request.privilegeIncreaseAcknowledged) {
    throw new HomerError('Privilege increase requires explicit acknowledgement', EXIT.UNSAFE_PRIVILEGE, current.privilegeDelta.added);
  }
  return { accepted, current };
}

function policyBlockers(inventory, plan) {
  const reasons = [];
  if (blockingMissingDependencies(inventory.entries, inventory.dependencyGraph).length
    || inventory.dependencyGraph.cycles.length || inventory.dependencyGraph.conflicts.length) reasons.push('dependency_conflict');
  if (plan?.conflicts.some((item) => item.type === 'protected-path')) reasons.push('protected_file_conflict');
  if (plan?.conflicts.some((item) => item.type === 'customization')) reasons.push('target_customization_conflict');
  if (plan?.privilegeDelta.unsafeIncrease) reasons.push('privilege_increase');
  return reasons;
}

function draftPullRequestBody(request, plan, verification) {
  return [
    '## Homer Odyssey Update',
    '',
    `- Run: \`${request.idempotencyKey}\``,
    `- Target: \`${request.targetRepository}@${request.targetRef}\``,
    `- Profile: \`${request.profile}\``,
    `- Plan: \`${plan.planId}\``,
    '',
    '## Semantic delta',
    '',
    `- Additions: ${plan.summary.additions}`,
    `- Replacements: ${plan.summary.replacements}`,
    `- Removals: ${plan.summary.removals}`,
    '',
    '## Privilege delta',
    '',
    `- Added: ${plan.privilegeDelta.added.join(', ') || 'none'}`,
    `- Removed: ${plan.privilegeDelta.removed.join(', ') || 'none'}`,
    '',
    '## Validation',
    '',
    `- Verdict: ${verification?.verdict || 'pending'}`,
    '- This pull request is draft-only. Homer does not merge it.',
  ].join('\n');
}

function buildRollbackPlan(config, inventory) {
  const preview = rollbackProjection(config, { dryRun: true });
  const currentLock = assertContract('homer-lock', JSON.parse(fs.readFileSync(safeLockPath(config), 'utf8')));
  const previousLock = currentLock.rollback.previousLockBase64
    ? assertContract('homer-lock', JSON.parse(Buffer.from(currentLock.rollback.previousLockBase64, 'base64').toString('utf8')))
    : null;
  const availableById = new Map(loadCatalog(config.sourceRoot).packages.map((item) => [item.key, item]));
  const unavailablePackages = (previousLock?.packages || [])
    .filter((item) => {
      const available = availableById.get(item.id);
      return !available || available.version !== item.version || available.hash !== item.hash;
    })
    .map((item) => `${item.id}@${item.version}`);
  if (unavailablePackages.length) {
    throw new HomerError('Rollback package versions are unavailable from the current Homer source', EXIT.ROLLBACK_FAILED, unavailablePackages);
  }

  const regeneratedFiles = (previousLock?.generatedFiles || []).map((item) => {
    const regenerated = buildProjectedArtifact(config, item.sourcePath, item.path);
    if (regenerated.hash !== item.hash) {
      throw new HomerError(`Prior projection cannot be regenerated exactly: ${item.path}`, EXIT.ROLLBACK_FAILED);
    }
    return { path: item.path, sourcePath: item.sourcePath, hash: regenerated.hash };
  });
  const currentByPath = new Map(currentLock.generatedFiles.map((item) => [item.path, item]));
  const previousByPath = new Map((previousLock?.generatedFiles || []).map((item) => [item.path, item]));
  const paths = sortedUnique([...currentByPath.keys(), ...previousByPath.keys()]);
  const semanticDelta = { additions: [], replacements: [], removals: [], unchanged: [] };
  for (const filePath of paths) {
    const current = currentByPath.get(filePath);
    const previous = previousByPath.get(filePath);
    if (!current) semanticDelta.additions.push(filePath);
    else if (!previous) semanticDelta.removals.push(filePath);
    else if (current.hash !== previous.hash) semanticDelta.replacements.push(filePath);
    else semanticDelta.unchanged.push(filePath);
  }
  const delta = privilegeDelta(inventory, config.profile, (previousLock?.generatedFiles || []).map((item) => item.sourcePath));
  return {
    apiVersion: API_VERSION,
    kind: 'OdysseyRollbackPlan',
    fromPlanId: currentLock.planId,
    toPlanId: previousLock?.planId || null,
    sourceCommit: previousLock?.source.commit || null,
    packageEvidence: { required: previousLock?.packages || [], unavailable: unavailablePackages },
    regeneratedFiles,
    semanticDelta,
    privilegeDelta: delta,
    actions: preview.actions,
    draftPullRequestOnly: true,
  };
}

function makeRun(request, inventory) {
  return assertContract('odyssey-run', {
    apiVersion: API_VERSION,
    kind: 'OdysseyRun',
    runId: hashObject({ request, source: inventory.inputs.source, target: inventory.inputs.target }).slice(0, 24),
    status: 'requested',
    operation: request.operation,
    exactInputs: request,
    source: inventory.inputs.source,
    target: { ...inventory.inputs.target, repository: request.targetRepository, ref: request.targetRef },
    profile: inventory.inputs.profile,
    transitionHistory: [{ from: null, to: 'requested', sequence: 0 }],
    evidenceReferences: [],
    retry: { attempt: 1, replayed: false },
  });
}

function makeResponse(run, inventory, details = {}) {
  const artifacts = sanitizeEvidence(details.artifacts || []);
  run.evidenceReferences = artifacts.map((item) => ({ type: item.type, name: item.name }));
  const response = {
    apiVersion: API_VERSION,
    kind: 'OdysseyOperationResponse',
    run: assertContract('odyssey-run', run),
    packages: { ...(inventory.summary || {}), filters: run.exactInputs.packageFilters },
    drift: sanitizeEvidence(details.drift || { status: 'not_checked', summary: {} }),
    privilegeDelta: details.privilegeDelta || {},
    policyDecision: sanitizeEvidence(details.policyDecision || { verdict: 'allowed', reasons: [] }),
    artifacts,
    nextAllowedActions: sortedUnique(details.nextAllowedActions || []),
    exitCode: details.exitCode ?? EXIT.OK,
    ...(details.failureCategory ? { failureCategory: details.failureCategory } : {}),
  };
  return assertContract('odyssey-operation-response', response);
}

function executeOperation(requestValue, config, options = {}) {
  const request = assertContract('odyssey-operation-request', requestValue);
  if (containsCredential(request.requestedBy) || containsCredential(request.idempotencyKey)) {
    throw new HomerError('Caller metadata must not contain credentials', EXIT.INVALID_CONTRACT);
  }
  for (const [label, ref] of [['targetRef', request.targetRef], ['defaultBranch', request.defaultBranch], ['branchName', request.branchName], ['pullRequest.base', request.pullRequest?.base]]) {
    if (ref !== undefined && !validGitRef(ref)) throw new HomerError(`Invalid Git ref in ${label}: ${ref}`, EXIT.INVALID_CONTRACT);
  }
  if (options.allowedTargets && !options.allowedTargets.includes(request.targetRepository)) {
    throw new HomerError(`Unsupported target repository: ${request.targetRepository}`, EXIT.SECURITY_POLICY);
  }
  const store = options.store || new InMemoryRunStore();
  const inputHash = hashObject(request);
  const replay = store.replay(request.idempotencyKey, inputHash);
  if (replay) return replay;

  const inventory = buildInventory(config);
  const run = makeRun(request, inventory);
  transition(run, 'resolving_target');
  transition(run, 'inspecting');
  const before = { source: treeFingerprint(config.sourceRoot), target: treeFingerprint(config.targetRoot) };
  const mutating = !request.dryRun && ['create-update-branch', 'apply-plan', 'open-pr'].includes(request.operation);
  const leaseKey = `${request.targetRepository}:${request.profile}`;
  let lease = false;
  let response;

  try {
    if (mutating && !request.defaultBranch) throw new HomerError('Mutating operations require explicit defaultBranch evidence', EXIT.INVALID_CONTRACT);
    if (request.operation === 'open-pr' && !request.pullRequest) throw new HomerError('open-pr requires pullRequest.title evidence', EXIT.INVALID_CONTRACT);
    if (mutating) { store.acquireLease(leaseKey); lease = true; }
    let plan;
    let details = { artifacts: [] };

    if (['check-drift', 'plan'].includes(request.operation)) {
      transition(run, 'planning');
      plan = buildPlan(inventory, config, { packageFilters: request.packageFilters });
      const blockers = policyBlockers(inventory, plan);
      if (blockers.length) {
        const blockedExit = blockers.includes('privilege_increase') ? EXIT.UNSAFE_PRIVILEGE
          : blockers.includes('protected_file_conflict') ? EXIT.PROTECTED_CONFLICT
            : blockers.includes('target_customization_conflict') ? EXIT.CUSTOMIZATION_CONFLICT : EXIT.MISSING_DEPENDENCY;
        transition(run, 'blocked', blockers.join(','));
        response = makeResponse(run, inventory, {
          drift: { status: 'blocked', summary: plan.summary, reasons: blockers },
          privilegeDelta: plan.privilegeDelta,
          policyDecision: { verdict: 'blocked', reasons: blockers },
          artifacts: [{ type: 'odyssey-plan', name: 'odyssey-plan.json', content: plan }],
          failureCategory: blockers.includes('privilege_increase') ? 'privilege_increase'
            : blockers.includes('protected_file_conflict') ? 'protected_file_conflict'
              : blockers.includes('dependency_conflict') ? 'dependency_conflict' : 'policy_violation',
          exitCode: blockedExit,
        });
      } else if (request.operation === 'check-drift') {
        const diff = buildDiff(plan);
        const changed = plan.summary.additions + plan.summary.removals + plan.summary.replacements > 0;
        transition(run, changed ? 'drift_detected' : 'no_drift');
        details = {
          drift: { status: changed ? 'drift_detected' : 'no_drift', summary: plan.summary, reasons: [] },
          privilegeDelta: plan.privilegeDelta,
          artifacts: [{ type: 'odyssey-diff', name: 'odyssey-diff.json', content: diff }],
          nextAllowedActions: changed ? ['plan'] : [],
          exitCode: changed ? EXIT.DRIFT : EXIT.OK,
        };
        response = makeResponse(run, inventory, details);
      } else {
        transition(run, 'plan_ready');
        response = makeResponse(run, inventory, {
          drift: { status: 'drift_detected', summary: plan.summary, reasons: [] },
          privilegeDelta: plan.privilegeDelta,
          artifacts: [{ type: 'odyssey-plan', name: 'odyssey-plan.json', content: plan }],
          nextAllowedActions: ['accept-plan'],
        });
      }
    } else if (request.operation === 'inspect') {
      transition(run, 'inspection_ready');
      response = makeResponse(run, inventory, { artifacts: [{ type: 'odyssey-inventory', name: 'odyssey-inventory.json', content: inventory }], nextAllowedActions: ['check-drift', 'plan'] });
    } else if (request.operation === 'verify') {
      transition(run, 'validating');
      const verification = verifyProjection(config);
      transition(run, verification.report.verdict === 'PASS' ? 'verified' : 'failed');
      response = makeResponse(run, inventory, {
        drift: { status: verification.report.drift.length ? 'drift_detected' : 'no_drift', summary: { files: verification.report.drift.length }, reasons: verification.report.drift.map((item) => item.path) },
        privilegeDelta: verification.report.privilegeDelta,
        policyDecision: { verdict: verification.report.verdict === 'PASS' ? 'allowed' : 'blocked', reasons: verification.report.checks.filter((item) => !item.passed).map((item) => item.name) },
        artifacts: [{ type: 'odyssey-verification', name: 'odyssey-verification.json', content: verification.report }],
        nextAllowedActions: verification.report.verdict === 'PASS' ? ['open-pr'] : [],
        ...(verification.exitCode ? { failureCategory: 'validation_failure' } : {}),
        exitCode: verification.exitCode,
      });
    } else if (request.operation === 'rollback-plan') {
      transition(run, 'planning');
      const verification = verifyProjection(config);
      if (verification.report.verdict !== 'PASS') {
        throw new HomerError('Rollback planning requires a valid current lock, available packages, and passing projection checks', verification.exitCode, verification.report.checks.filter((item) => !item.passed).map((item) => item.name));
      }
      const rollback = buildRollbackPlan(config, inventory);
      transition(run, 'rollback_ready');
      response = makeResponse(run, inventory, {
        drift: { status: 'no_drift', summary: { restores: rollback.actions.filter((item) => item.type === 'restore').length, removals: rollback.actions.filter((item) => item.type === 'remove').length }, reasons: [] },
        privilegeDelta: rollback.privilegeDelta,
        artifacts: [
          { type: 'odyssey-rollback-plan', name: 'odyssey-rollback-plan.json', content: rollback },
          { type: 'odyssey-verification', name: 'odyssey-verification.json', content: verification.report },
        ],
        nextAllowedActions: ['open-rollback-pr'],
      });
    } else {
      const adapter = options.repositoryAdapter || {};
      const existingUpdate = adapter.findOpenHomerUpdate ? adapter.findOpenHomerUpdate(request) : null;
      const fresh = ensureFreshPlan(request, inventory, config, { conflictingPullRequest: false });
      if (existingUpdate?.planId && existingUpdate.planId !== fresh.accepted.planId) {
        throw new HomerError('Accepted Odyssey Plan conflicts with another open Odyssey pull request', EXIT.PLAN_NOT_ACCEPTED, ['conflicting_odyssey_pull_request']);
      }
      plan = fresh.current;
      if (request.dryRun && ['create-update-branch', 'open-pr'].includes(request.operation)) {
        const branchName = request.branchName || `homer/odyssey-${plan.planId.slice(0, 12)}`;
        const base = request.pullRequest?.base || request.targetRef;
        if ([base, request.defaultBranch].filter(Boolean).includes(branchName)) throw new HomerError('Preview requires a fresh non-default update branch', EXIT.PROTECTED_CONFLICT);
        transition(run, 'planning');
        transition(run, 'awaiting_approval');
        const preview = request.operation === 'create-update-branch'
          ? { repository: request.targetRepository, baseRef: request.targetRef, branchName, planId: plan.planId, dryRun: true }
          : { repository: request.targetRepository, head: branchName, base, title: request.pullRequest.title, body: draftPullRequestBody(request, plan, options.verification), draft: true, dryRun: true };
        response = makeResponse(run, inventory, {
          privilegeDelta: plan.privilegeDelta,
          artifacts: [{ type: request.operation === 'create-update-branch' ? 'branch-preview' : 'draft-pull-request-preview', name: request.operation === 'create-update-branch' ? 'branch.json' : 'pull-request.json', content: preview }],
          nextAllowedActions: [request.operation],
        });
      } else {
        transition(run, 'applying');
        if (request.operation === 'create-update-branch') {
          const branchName = request.branchName || `homer/odyssey-${plan.planId.slice(0, 12)}`;
          const protectedBranches = new Set([request.targetRef, request.defaultBranch].filter(Boolean));
          if (protectedBranches.has(branchName)) throw new HomerError(`Update branch must differ from protected base ${branchName}`, EXIT.PROTECTED_CONFLICT);
          if (!adapter.createBranch) throw new HomerError('Repository adapter authorization is required to create a branch', EXIT.SECURITY_POLICY);
          const branch = adapter.createBranch({ repository: request.targetRepository, baseRef: request.targetRef, branchName, planId: plan.planId });
          transition(run, 'branch_created');
          response = makeResponse(run, inventory, { privilegeDelta: plan.privilegeDelta, artifacts: [{ type: 'branch-evidence', name: 'branch.json', content: branch }], nextAllowedActions: ['apply-plan'] });
        } else if (request.operation === 'apply-plan') {
          if (!request.dryRun) {
            if (!request.branchName || [request.targetRef, request.defaultBranch].filter(Boolean).includes(request.branchName)) {
              throw new HomerError('Applying a plan requires a fresh non-default update branch', EXIT.PROTECTED_CONFLICT);
            }
            const currentBranch = adapter.currentBranch ? adapter.currentBranch() : checkedOutBranch(config.targetRoot);
            if (currentBranch !== request.branchName) {
              throw new HomerError('Checked-out target branch does not match the authorized update branch', EXIT.PROTECTED_CONFLICT);
            }
          }
          const applied = applyProjection(config, request.planPath, { dryRun: request.dryRun });
          transition(run, 'applied');
          response = makeResponse(run, inventory, { privilegeDelta: plan.privilegeDelta, artifacts: [{ type: 'odyssey-apply', name: 'odyssey-apply.json', content: applied }], nextAllowedActions: request.dryRun ? ['apply-plan'] : ['verify'] });
        } else if (request.operation === 'open-pr') {
          const branchName = request.branchName;
          const base = request.pullRequest?.base || request.targetRef;
          if (!branchName || branchName === base || branchName === request.defaultBranch) throw new HomerError('Draft update pull request requires a fresh non-default branch', EXIT.PROTECTED_CONFLICT);
          if (options.verification?.verdict !== 'PASS') throw new HomerError('Draft update pull request requires passing verification evidence', EXIT.EVAL_FAILED);
          let pullRequest = existingUpdate;
          if (!pullRequest) {
            if (!adapter.createDraftPullRequest) throw new HomerError('Repository adapter authorization is required to open a pull request', EXIT.SECURITY_POLICY);
            const verification = options.verification;
            pullRequest = adapter.createDraftPullRequest({
              repository: request.targetRepository,
              head: branchName,
              base,
              title: request.pullRequest.title,
              body: draftPullRequestBody(request, plan, verification),
              draft: true,
            });
          }
          if (pullRequest.draft !== true) throw new HomerError('Homer may open only draft pull requests', EXIT.SECURITY_POLICY);
          transition(run, 'pr_created');
          response = makeResponse(run, inventory, { privilegeDelta: plan.privilegeDelta, artifacts: [{ type: 'draft-pull-request', name: 'pull-request.json', content: { ...pullRequest, duplicateSuppressed: Boolean(existingUpdate) } }] });
        }
      }
    }

    if (!mutating) {
      const after = { source: treeFingerprint(config.sourceRoot), target: treeFingerprint(config.targetRoot) };
      if (before.source !== after.source || before.target !== after.target) throw new HomerError('Read-only invariant violated during Odyssey operation', EXIT.INTERNAL);
    }
  } catch (caught) {
    const error = caught instanceof HomerError ? caught : new HomerError(caught.stack || caught.message);
    if (!TERMINAL_STATES.has(run.status)) transition(run, 'failed', error.message);
    response = makeResponse(run, inventory, {
      drift: { status: 'failed', summary: {}, reasons: error.details || [] },
      policyDecision: { verdict: 'blocked', reasons: [error.message, ...(error.details || [])] },
      failureCategory: classifyFailure(error),
      exitCode: error.exitCode,
    });
  } finally {
    if (lease) store.releaseLease(leaseKey);
  }

  store.save(request.idempotencyKey, inputHash, response);
  return response;
}

function readOperationRequest(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { throw new HomerError(`Cannot read Odyssey operation request at ${filePath}: ${error.message}`, EXIT.INVALID_CONTRACT); }
}

module.exports = {
  InMemoryRunStore, LEGAL_TRANSITIONS, RUN_STATES, buildRollbackPlan, classifyFailure, draftPullRequestBody,
  executeOperation, planFreshnessReasons, readOperationRequest, transition,
  checkedOutBranch, containsCredential, sanitizeEvidence, validGitRef,
};
