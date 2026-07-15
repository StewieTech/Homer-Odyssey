'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfile } = require('../src/config');
const { applyProjection } = require('../src/application');
const { EXIT } = require('../src/constants');
const { HomerError } = require('../src/errors');
const { buildInventory, treeFingerprint } = require('../src/inventory');
const { buildPlan } = require('../src/planning');
const {
  InMemoryRunStore, RUN_STATES, classifyFailure, executeOperation, planFreshnessReasons, sanitizeEvidence, transition,
} = require('../src/odyssey-run');

const projectRoot = path.resolve(__dirname, '..');

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-run-'));
  const sourceRoot = path.join(root, 'source');
  const targetRoot = path.join(root, 'target');
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const entry of ['packages', 'profiles', 'adapters']) fs.cpSync(path.join(projectRoot, entry), path.join(sourceRoot, entry), { recursive: true });
  fs.writeFileSync(path.join(targetRoot, 'AGENTS.md'), '# Target-owned routing\n');
  const loaded = loadProfile(path.join(sourceRoot, 'profiles', 'studio.json'));
  const config = {
    ...loaded,
    sourceRoot,
    targetRoot,
    declaration: { sourceCommit: 'source-fixture-sha', targetCommit: 'target-fixture-sha' },
  };
  return { root, sourceRoot, targetRoot, config };
}

function request(operation, overrides = {}) {
  return {
    apiVersion: 'homer.odyssey/v1',
    kind: 'OdysseyOperationRequest',
    operation,
    targetRepository: 'StewieTech/Fixture',
    targetRef: 'main',
    profile: 'studio',
    updateChannel: 'manual',
    requestedBy: 'test',
    dryRun: true,
    idempotencyKey: `${operation}-fixture`,
    packageFilters: [],
    ...overrides,
  };
}

function acceptedPlan(state) {
  const plan = buildPlan(buildInventory(state.config), state.config, { accepted: true });
  const planPath = path.join(state.root, 'accepted-plan.json');
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  return { plan, planPath };
}

test('state machine covers the public lifecycle and rejects illegal transitions', () => {
  for (const state of ['requested', 'resolving_target', 'inspecting', 'drift_detected', 'no_drift', 'planning', 'plan_ready', 'awaiting_approval', 'applying', 'validating', 'pr_created', 'blocked', 'failed', 'cancelled', 'rolled_back']) {
    assert.ok(RUN_STATES.includes(state), state);
  }
  const run = { status: 'requested', transitionHistory: [{ from: null, to: 'requested', sequence: 0 }] };
  transition(run, 'resolving_target');
  assert.throws(() => transition(run, 'pr_created'), /Illegal Odyssey Run transition/);
});

test('operation evidence redacts credential-shaped keys and literals', () => {
  const sanitized = sanitizeEvidence({ token: 'github_pat_abcdefghijklmnopqrstuvwxyz', note: 'password=hunter2', contentBase64: 'c2Vuc2l0aXZl', safe: 'plan-ready' });
  assert.equal(sanitized.token, '[REDACTED]');
  assert.equal(sanitized.note, '[REDACTED]');
  assert.equal(sanitized.contentBase64, '[REDACTED]');
  assert.equal(sanitized.safe, 'plan-ready');
});

test('failure mapping covers the public operational taxonomy', () => {
  const cases = [
    ['Authentication failed', EXIT.INTERNAL, 'authentication'],
    ['Authorization failed', EXIT.INTERNAL, 'authorization'],
    ['Repository unavailable', EXIT.INTERNAL, 'repository_unavailable'],
    ['Invalid profile', EXIT.INVALID_CONTRACT, 'invalid_profile'],
    ['Dependency conflict', EXIT.MISSING_DEPENDENCY, 'dependency_conflict'],
    ['Protected file', EXIT.PROTECTED_CONFLICT, 'protected_file_conflict'],
    ['Privilege increase', EXIT.UNSAFE_PRIVILEGE, 'privilege_increase'],
    ['Stale plan', EXIT.PLAN_NOT_ACCEPTED, 'stale_plan'],
    ['Policy violation', EXIT.SECURITY_POLICY, 'policy_violation'],
    ['Validation failed', EXIT.EVAL_FAILED, 'validation_failure'],
    ['Workflow failed', EXIT.INTERNAL, 'workflow_failure'],
    ['Pull request conflict', EXIT.INTERNAL, 'target_pull_request_conflict'],
    ['Unexpected failure', EXIT.INTERNAL, 'internal_error'],
  ];
  for (const [message, code, category] of cases) assert.equal(classifyFailure(new HomerError(message, code)), category);
});

test('inspect and check-drift preserve read-only roots and return structured evidence', () => {
  const state = workspace();
  const before = { source: treeFingerprint(state.sourceRoot), target: treeFingerprint(state.targetRoot) };
  const inspected = executeOperation(request('inspect'), state.config);
  const drift = executeOperation(request('check-drift'), state.config);
  assert.equal(inspected.run.status, 'inspection_ready');
  assert.equal(inspected.artifacts[0].type, 'odyssey-inventory');
  assert.equal(drift.run.status, 'drift_detected', JSON.stringify(drift));
  assert.equal(drift.drift.status, 'drift_detected');
  assert.deepEqual({ source: treeFingerprint(state.sourceRoot), target: treeFingerprint(state.targetRoot) }, before);
});

test('idempotency replays compatible results and rejects key reuse with different inputs', () => {
  const state = workspace();
  const store = new InMemoryRunStore();
  const first = executeOperation(request('inspect'), state.config, { store });
  const second = executeOperation(request('inspect'), state.config, { store });
  assert.equal(first.run.runId, second.run.runId);
  assert.equal(second.run.retry.replayed, true);
  assert.throws(() => executeOperation(request('inspect', { targetRef: 'develop' }), state.config, { store }), /incompatible inputs/);
});

test('package filters remain auditable in plan identity without bypassing dependency closure', () => {
  const state = workspace();
  const result = executeOperation(request('plan', { packageFilters: ['lisa'] }), state.config);
  const plan = result.artifacts[0].content;
  assert.deepEqual(plan.packageFilters, ['lisa']);
  assert.ok(plan.changes.some((item) => item.sourcePath?.includes('/lisa/')));
  assert.ok(plan.changes.some((item) => item.sourcePath?.includes('/ralph/')));
});

test('mutation lease blocks a second mutating run for the same target and profile', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const store = new InMemoryRunStore();
  store.acquireLease('StewieTech/Fixture:studio');
  const result = executeOperation(request('create-update-branch', {
    planPath: accepted.planPath,
    defaultBranch: 'main',
    dryRun: false,
    privilegeIncreaseAcknowledged: true,
  }), state.config, { store, repositoryAdapter: { createBranch: () => assert.fail('adapter must not run') } });
  assert.equal(result.run.status, 'failed');
  assert.equal(result.failureCategory, 'authorization');
});

test('fresh accepted plan creates only a derived branch and stale evidence is explicit', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const created = executeOperation(request('create-update-branch', {
    planPath: accepted.planPath,
    defaultBranch: 'main',
    dryRun: false,
    privilegeIncreaseAcknowledged: true,
  }), state.config, {
    repositoryAdapter: {
      createBranch: (input) => ({ ...input, created: true }),
    },
  });
  assert.equal(created.run.status, 'branch_created');
  assert.match(created.artifacts[0].content.branchName, /^homer\/odyssey-/);
  assert.notEqual(created.artifacts[0].content.branchName, 'main');

  fs.appendFileSync(path.join(state.targetRoot, 'AGENTS.md'), 'changed\n');
  const current = buildPlan(buildInventory(state.config), state.config);
  const reasons = planFreshnessReasons(accepted.plan, current, state.config);
  assert.ok(reasons.includes('target_lock_or_managed_files_changed'));
  assert.ok(reasons.includes('inventory_changed'));

  const declarationConfig = { ...state.config, declaration: { ...state.config.declaration, targetCommit: 'different-declaration' } };
  const declarationPlan = buildPlan(buildInventory(declarationConfig), declarationConfig);
  assert.ok(planFreshnessReasons(accepted.plan, declarationPlan, declarationConfig).includes('target_declaration_changed'));
});

test('dry-run branch and pull-request operations return previews without calling write adapters', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const repositoryAdapter = {
    createBranch: () => assert.fail('dry-run must not create a branch'),
    createDraftPullRequest: () => assert.fail('dry-run must not create a pull request'),
  };
  const branch = executeOperation(request('create-update-branch', {
    idempotencyKey: 'branch-preview-fixture',
    planPath: accepted.planPath,
    privilegeIncreaseAcknowledged: true,
  }), state.config, { repositoryAdapter });
  const pullRequest = executeOperation(request('open-pr', {
    idempotencyKey: 'pr-preview-fixture',
    planPath: accepted.planPath,
    branchName: 'homer/odyssey-preview',
    privilegeIncreaseAcknowledged: true,
    pullRequest: { title: 'Homer Odyssey preview', base: 'main' },
  }), state.config, { repositoryAdapter });
  assert.equal(branch.run.status, 'awaiting_approval');
  assert.equal(branch.artifacts[0].content.dryRun, true);
  assert.equal(pullRequest.run.status, 'awaiting_approval');
  assert.equal(pullRequest.artifacts[0].content.draft, true);
  assert.equal(pullRequest.artifacts[0].content.dryRun, true);
});

test('apply-plan validates the exact accepted plan and supports a non-mutating preview', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const before = treeFingerprint(state.targetRoot);
  const result = executeOperation(request('apply-plan', {
    planPath: accepted.planPath,
    privilegeIncreaseAcknowledged: true,
  }), state.config);
  assert.equal(result.run.status, 'applied');
  assert.equal(result.artifacts[0].content.dryRun, true);
  assert.equal(treeFingerprint(state.targetRoot), before);
});

test('apply-plan refuses a non-dry write without fresh branch evidence', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const result = executeOperation(request('apply-plan', {
    idempotencyKey: 'unsafe-apply-fixture',
    planPath: accepted.planPath,
    privilegeIncreaseAcknowledged: true,
    dryRun: false,
    defaultBranch: 'main',
  }), state.config);
  assert.equal(result.run.status, 'failed');
  assert.equal(result.failureCategory, 'protected_file_conflict');
  assert.equal(fs.existsSync(path.join(state.targetRoot, 'homer.lock')), false);
});

test('open-pr is draft-only and suppresses a duplicate Homer update pull request', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const input = request('open-pr', {
    planPath: accepted.planPath,
    branchName: 'homer/odyssey-fixture',
    defaultBranch: 'main',
    privilegeIncreaseAcknowledged: true,
    dryRun: false,
    pullRequest: { title: 'Homer Odyssey update', base: 'main' },
  });
  let creates = 0;
  const adapter = {
    findOpenHomerUpdate: () => ({ number: 17, url: 'https://example.test/pr/17', draft: true }),
    createDraftPullRequest: () => { creates += 1; },
  };
  const result = executeOperation(input, state.config, { repositoryAdapter: adapter, verification: { verdict: 'PASS' } });
  assert.equal(result.run.status, 'pr_created');
  assert.equal(result.artifacts[0].content.draft, true);
  assert.equal(result.artifacts[0].content.duplicateSuppressed, true);
  assert.equal(creates, 0);
});

test('open-pr adapter receives a complete draft request and never a merge instruction', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  let received;
  const result = executeOperation(request('open-pr', {
    idempotencyKey: 'new-pr-fixture',
    planPath: accepted.planPath,
    branchName: 'homer/odyssey-new',
    defaultBranch: 'main',
    privilegeIncreaseAcknowledged: true,
    dryRun: false,
    pullRequest: { title: 'Homer Odyssey update', base: 'main' },
  }), state.config, {
    repositoryAdapter: {
      findOpenHomerUpdate: () => null,
      createDraftPullRequest: (input) => { received = input; return { number: 18, url: 'https://example.test/pr/18', draft: input.draft }; },
    },
    verification: { verdict: 'PASS' },
  });
  assert.equal(result.run.status, 'pr_created');
  assert.equal(received.draft, true);
  assert.equal(Object.hasOwn(received, 'merge'), false);
  assert.match(received.body, /Semantic delta/);
  assert.match(received.body, /Privilege delta/);
  assert.match(received.body, /draft-only/);
});

test('open-pr fails closed without passing verification evidence', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const result = executeOperation(request('open-pr', {
    idempotencyKey: 'unverified-pr-fixture',
    planPath: accepted.planPath,
    branchName: 'homer/odyssey-unverified',
    defaultBranch: 'main',
    privilegeIncreaseAcknowledged: true,
    dryRun: false,
    pullRequest: { title: 'Homer Odyssey update', base: 'main' },
  }), state.config, { repositoryAdapter: { findOpenHomerUpdate: () => null } });
  assert.equal(result.run.status, 'failed');
  assert.equal(result.failureCategory, 'validation_failure');
});

test('a conflicting open Odyssey pull request makes the accepted plan stale', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  const result = executeOperation(request('open-pr', {
    idempotencyKey: 'conflicting-pr-fixture',
    planPath: accepted.planPath,
    branchName: 'homer/odyssey-conflict',
    defaultBranch: 'main',
    privilegeIncreaseAcknowledged: true,
    dryRun: false,
    pullRequest: { title: 'Homer Odyssey update', base: 'main' },
  }), state.config, {
    repositoryAdapter: { findOpenHomerUpdate: () => ({ number: 19, draft: true, planId: 'f'.repeat(64) }) },
    verification: { verdict: 'PASS' },
  });
  assert.equal(result.failureCategory, 'stale_plan');
  assert.ok(result.policyDecision.reasons.includes('conflicting_odyssey_pull_request'));
});

test('rollback-plan validates the current projection and emits reviewable rollback evidence without writing', () => {
  const state = workspace();
  const accepted = acceptedPlan(state);
  applyProjection(state.config, accepted.planPath);
  const before = treeFingerprint(state.targetRoot);
  const result = executeOperation(request('rollback-plan'), state.config);
  assert.equal(result.run.status, 'rollback_ready');
  assert.equal(result.policyDecision.verdict, 'allowed');
  assert.ok(result.artifacts.some((item) => item.type === 'odyssey-rollback-plan'));
  assert.ok(result.artifacts.some((item) => item.type === 'odyssey-verification'));
  const rollback = result.artifacts.find((item) => item.type === 'odyssey-rollback-plan').content;
  assert.ok(rollback.semanticDelta.removals.length > 0);
  assert.equal(rollback.packageEvidence.unavailable.length, 0);
  assert.equal(rollback.draftPullRequestOnly, true);
  assert.equal(treeFingerprint(state.targetRoot), before);
});
