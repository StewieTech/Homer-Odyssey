'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDriftStatusEvidence,
  normalizeTrigger,
  planDriftChecks,
  runDriftChecks,
} = require('../src/drift-orchestration');
const { matrixFromPlan } = require('../scripts/orchestrate-drift-checks');

const root = path.resolve(__dirname, '..');
const canonicalRegistry = JSON.parse(fs.readFileSync(path.join(root, 'profiles', 'registries', 'stable-targets.json'), 'utf8'));

function registry(overrides = {}) {
  return {
    ...structuredClone(canonicalRegistry),
    ...overrides,
    limits: { ...canonicalRegistry.limits, ...(overrides.limits || {}) },
    targets: overrides.targets || structuredClone(canonicalRegistry.targets),
  };
}

function trigger(type = 'stable-package-event', overrides = {}) {
  return {
    type,
    requestedBy: 'github:fixture-actor',
    workflowId: 'fixture-workflow/42.1',
    sourceCommit: 'source-fixture-sha',
    packageVersions: [{ id: 'skill:ralph', version: '2.3.0' }],
    ...overrides,
  };
}

function targetState(overrides = {}) {
  return {
    targetCommit: 'target-fixture-sha',
    targetLockHash: 'lock-fixture-sha',
    activeRuns: [],
    completedChecks: [],
    openUpdates: [],
    dismissedUpdates: [],
    ...overrides,
  };
}

function stateFor(value = targetState()) {
  return { targets: { 'max-character-work-studio': value } };
}

function firstPlan(triggerValue = trigger(), state = stateFor(), registryValue = registry()) {
  return planDriftChecks({ registry: registryValue, trigger: triggerValue, state });
}

test('manual, stable-package-event, and schedule triggers share the versioned check-drift contract', () => {
  const plans = ['manual', 'stable-package-event', 'schedule'].map((type) => firstPlan(trigger(type)));
  assert.deepEqual(plans.map((plan) => plan.decisions[0].request.operation), ['check-drift', 'check-drift', 'check-drift']);
  assert.deepEqual(plans.map((plan) => plan.decisions[0].request.kind), ['OdysseyOperationRequest', 'OdysseyOperationRequest', 'OdysseyOperationRequest']);
  assert.deepEqual(plans.map((plan) => plan.decisions[0].request.apiVersion), ['homer.odyssey/v1', 'homer.odyssey/v1', 'homer.odyssey/v1']);
  assert.deepEqual(plans.map((plan) => plan.decisions[0].request.updateChannel), ['manual', 'stable-package', 'scheduled']);
  for (const plan of plans) {
    const request = plan.decisions[0].request;
    assert.equal(request.dryRun, true);
    assert.equal(Object.hasOwn(request, 'branchName'), false);
    assert.equal(Object.hasOwn(request, 'defaultBranch'), false);
    assert.equal(Object.hasOwn(request, 'pullRequest'), false);
  }
});

test('stable events select only compatible registered targets and reject arbitrary target inputs', () => {
  assert.throws(() => firstPlan(trigger('stable-package-event', { targetRepository: 'attacker/repository' })), /unsupported inputs/);
  assert.throws(() => firstPlan(trigger('manual', { targetIds: ['unregistered-target'] })), /unregistered targets/);
  const incompatible = firstPlan(trigger('stable-package-event', {
    packageVersions: [{ id: 'skill:not-compatible', version: '1.0.0' }],
  }), stateFor(), registry({
    targets: [{ ...canonicalRegistry.targets[0], compatiblePackages: ['character:*'] }],
  }));
  assert.equal(incompatible.decisions[0].status, 'suppressed');
  assert.equal(incompatible.decisions[0].dedupeDecision, 'incompatible');
  assert.equal(incompatible.decisions[0].request, null);
});

test('dedupe covers active, completed, open-update, dismissal, version, lock, profile, and policy dimensions', () => {
  const initial = firstPlan();
  const dedupeKey = initial.decisions[0].dedupeKey;
  const cases = [
    ['activeRuns', { dedupeKey, runId: 'active-run', url: 'https://github.com/StewieTech/Homer-Odyssey/actions/runs/1' }, 'active_equivalent'],
    ['completedChecks', { dedupeKey, runId: 'complete-run', url: 'https://github.com/StewieTech/Homer-Odyssey/actions/runs/2' }, 'completed_equivalent'],
    ['openUpdates', { dedupeKey, open: true, url: 'https://github.com/StewieTech/MaxCharacterWork/pull/7' }, 'open_update'],
    ['dismissedUpdates', { dedupeKey, reason: 'operator dismissed equivalent update' }, 'dismissed'],
  ];
  for (const [field, record, expected] of cases) {
    const plan = firstPlan(trigger(), stateFor(targetState({ [field]: [record] })));
    assert.equal(plan.decisions[0].dedupeDecision, expected, field);
    assert.equal(plan.decisions[0].request, null, field);
  }

  const changedVersion = firstPlan(trigger('stable-package-event', {
    packageVersions: [{ id: 'skill:ralph', version: '2.3.1' }],
  }), stateFor(targetState({ dismissedUpdates: [{ dedupeKey }] })));
  assert.equal(changedVersion.decisions[0].status, 'queued');
  const changedLock = firstPlan(trigger(), stateFor(targetState({
    targetLockHash: 'changed-lock',
    completedChecks: [{ dedupeKey }],
  })));
  assert.equal(changedLock.decisions[0].status, 'queued');
  const changedProfile = firstPlan(trigger(), stateFor(targetState({ completedChecks: [{ dedupeKey }] })), registry({
    targets: [{ ...canonicalRegistry.targets[0], profile: 'restricted' }],
  }));
  assert.equal(changedProfile.decisions[0].status, 'queued');
  const changedPolicy = firstPlan(trigger(), stateFor(targetState({ completedChecks: [{ dedupeKey }] })), registry({
    targets: [{ ...canonicalRegistry.targets[0], policyHash: 'changed-policy' }],
  }));
  assert.equal(changedPolicy.decisions[0].status, 'queued');
});

test('weekly scans enforce registry target and concurrency bounds before dispatch', () => {
  const targets = ['one', 'two', 'three'].map((suffix) => ({
    ...canonicalRegistry.targets[0],
    id: `target-${suffix}`,
    repository: `StewieTech/Target-${suffix}`,
  }));
  const state = { targets: Object.fromEntries(targets.map((target) => [target.id, targetState()])) };
  const plan = planDriftChecks({
    registry: registry({ targets, limits: { maxTargetsPerRun: 2, concurrency: 1 } }),
    trigger: trigger('schedule'),
    state,
  });
  assert.equal(plan.summary.queued, 2);
  assert.equal(plan.summary.blocked, 1);
  assert.equal(plan.decisions[2].dedupeDecision, 'bounded_limit');
  assert.equal(matrixFromPlan(plan).include.length, 2);
});

test('missing target state blocks honestly without creating a check request', () => {
  const plan = firstPlan(trigger(), {});
  assert.equal(plan.decisions[0].status, 'blocked');
  assert.equal(plan.decisions[0].dedupeDecision, 'missing_target_state');
  assert.equal(plan.decisions[0].request, null);
});

test('queued checks publish exact source/target status and safe notification metadata', () => {
  const plan = firstPlan();
  const decision = plan.decisions[0];
  assert.equal(decision.targetCommit, 'target-fixture-sha');
  assert.equal(decision.targetLockHash, 'lock-fixture-sha');
  const evidence = buildDriftStatusEvidence({
    request: decision.request,
    response: {
      run: {
        runId: 'fixture-run',
        status: 'drift_detected',
        evidenceReferences: [{ url: 'https://github.com/StewieTech/Homer-Odyssey/actions/runs/77' }],
      },
      drift: { summary: { replacements: 2 } },
      privilegeDelta: { unchanged: ['repository.read'] },
      policyDecision: { verdict: 'allowed', providerLog: 'token=unsafe' },
      artifacts: [{ url: 'https://unsafe.example/log' }],
    },
    orchestration: {
      targetId: decision.targetId,
      trigger: plan.trigger.type,
      workflowId: plan.trigger.workflowId,
      sourceCommit: plan.trigger.sourceCommit,
      packageVersions: plan.trigger.packageVersions,
      targetCommit: decision.targetCommit,
      targetLockHash: decision.targetLockHash,
      dedupeKey: decision.dedupeKey,
    },
  });
  assert.deepEqual(evidence.status.target, {
    repository: 'StewieTech/MaxCharacterWork',
    ref: 'develop',
    commit: 'target-fixture-sha',
    lockHash: 'lock-fixture-sha',
  });
  assert.equal(evidence.status.source.commit, 'source-fixture-sha');
  assert.equal(evidence.status.status, 'drift-detected');
  assert.equal(evidence.status.policySummary.providerLog, '[REDACTED]');
  assert.deepEqual(evidence.notification.packageVersions, [{ id: 'skill:ralph', version: '2.3.0' }]);
  assert.deepEqual(evidence.notification.evidenceLinks, ['https://github.com/StewieTech/Homer-Odyssey/actions/runs/77']);
  assert.equal(Object.hasOwn(evidence.notification, 'rawLog'), false);
});

test('bounded execution isolates failures, retries provider limits, redacts evidence, and never mutates', async () => {
  const targets = ['success', 'retry', 'failure'].map((suffix) => ({
    ...canonicalRegistry.targets[0],
    id: `target-${suffix}`,
    repository: `StewieTech/Target-${suffix}`,
  }));
  const state = { targets: Object.fromEntries(targets.map((target) => [target.id, targetState()])) };
  let active = 0;
  let maximumActive = 0;
  const attempts = new Map();
  const waits = [];
  const received = [];
  const result = await runDriftChecks({
    registry: registry({ targets, limits: { concurrency: 2, maxRetries: 2, maxRateLimitWaitMs: 25 } }),
    trigger: trigger('schedule'),
    state,
    sleep: async (milliseconds) => { waits.push(milliseconds); },
    adapter: async (request) => {
      received.push(request);
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      const count = (attempts.get(request.targetRepository) || 0) + 1;
      attempts.set(request.targetRepository, count);
      if (request.targetRepository.endsWith('Target-retry') && count === 1) {
        throw Object.assign(new Error('unsafe provider detail'), { failureCategory: 'rate_limited', retryAfterMs: 90000 });
      }
      if (request.targetRepository.endsWith('Target-failure')) {
        throw Object.assign(new Error('token=must-not-escape'), { failureCategory: 'workflow_failure' });
      }
      return {
        run: {
          runId: `run-${request.targetRepository.split('-').at(-1)}`,
          status: request.targetRepository.endsWith('Target-retry') ? 'drift_detected' : 'no_drift',
          evidenceReferences: [{ url: 'https://github.com/StewieTech/Homer-Odyssey/actions/runs/42' }],
        },
        drift: { summary: { replacements: 1, providerLog: 'secret=unsafe' } },
        privilegeDelta: { unchanged: ['repository.read'], token: 'github_pat_abcdefghijklmnopqrstuvwxyz' },
        policyDecision: { verdict: 'allowed', rawLog: 'password=unsafe' },
        artifacts: [{ url: 'https://evil.example/unsafe' }],
      };
    },
  });

  assert.equal(maximumActive, 2);
  assert.deepEqual(waits, [25]);
  assert.deepEqual(result.statuses.map((item) => item.status).sort(), ['drift-detected', 'failed', 'no-drift']);
  assert.equal(result.statuses.find((item) => item.status === 'drift-detected').retryCount, 1);
  assert.equal(result.statuses.find((item) => item.status === 'failed').failureCategory, 'workflow_failure');
  const successful = result.statuses.find((item) => item.status === 'no-drift');
  assert.equal(successful.driftSummary.providerLog, '[REDACTED]');
  assert.equal(successful.privilegeSummary.token, '[REDACTED]');
  assert.equal(successful.policySummary.rawLog, '[REDACTED]');
  assert.deepEqual(successful.evidenceLinks, ['https://github.com/StewieTech/Homer-Odyssey/actions/runs/42']);
  for (const request of received) {
    assert.equal(request.operation, 'check-drift');
    assert.equal(request.dryRun, true);
    assert.equal(Object.hasOwn(request, 'branchName'), false);
    assert.equal(Object.hasOwn(request, 'pullRequest'), false);
  }
});

test('trigger normalization rejects credentials and conflicting package versions', () => {
  assert.throws(() => normalizeTrigger(trigger('manual', { requestedBy: 'token=unsafe' })), /credentials/);
  assert.throws(() => normalizeTrigger(trigger('manual', {
    packageVersions: [
      { id: 'skill:ralph', version: '1.0.0' },
      { id: 'skill:ralph', version: '2.0.0' },
    ],
  })), /Conflicting versions/);
  const plan = firstPlan();
  assert.throws(() => buildDriftStatusEvidence({
    request: { ...plan.decisions[0].request, dryRun: false },
    response: {},
    orchestration: {},
  }), /read-only check-drift/);
});
