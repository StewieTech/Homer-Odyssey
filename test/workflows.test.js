'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWorkflowRequest } = require('../scripts/operation-request');
const { validateUpdatePlan } = require('../scripts/validate-update-plan');
const { render } = require('../scripts/render-update-pr-body');

const root = path.resolve(__dirname, '..');
const workflowRoot = path.join(root, '.github', 'workflows');
const workflowNames = [
  'homer-check-drift.yml',
  'homer-plan-odyssey.yml',
  'homer-create-update-pr.yml',
  'homer-verify-target.yml',
];

test('recurring workflows expose manual and reusable bounded contracts', () => {
  for (const name of workflowNames) {
    const source = fs.readFileSync(path.join(workflowRoot, name), 'utf8');
    assert.match(source, /workflow_dispatch:/, name);
    assert.match(source, /workflow_call:/, name);
    assert.match(source, /target_repository:/, name);
    assert.match(source, /target_ref:/, name);
    assert.match(source, /HOMER_ALLOWED_TARGETS/, name);
    assert.match(source, /actions\/upload-artifact@v4/, name);
    assert.match(source, /GITHUB_STEP_SUMMARY/, name);
    assert.doesNotMatch(source, /\bmerge\b/i, name);
  }
});

test('write workflow serializes by target, derives a branch, verifies, and opens draft only', () => {
  const source = fs.readFileSync(path.join(workflowRoot, 'homer-create-update-pr.yml'), 'utf8');
  assert.match(source, /group: homer-mutate-/);
  assert.match(source, /validate-update-plan\.js/);
  assert.match(source, /git switch -c/);
  assert.match(source, /bin\/homer\.js apply/);
  assert.match(source, /bin\/homer\.js verify/);
  assert.match(source, /gh pr create[^\n]*--draft/);
  assert.doesNotMatch(source, /git push[^\n]*(develop|main|master)/);
});

test('workflow request validation is fail-closed at the server allowlist', () => {
  const argv = [
    '--operation', 'check-drift', '--target-repository', 'StewieTech/Pariss',
    '--target-ref', 'developSIT', '--profile', 'pariss', '--package-filters', 'ralph,lisa',
    '--update-channel', 'manual', '--requested-by', 'test', '--dry-run', 'true',
    '--idempotency-key', 'workflow-fixture',
  ];
  const request = buildWorkflowRequest(argv, { HOMER_ALLOWED_TARGETS: 'StewieTech/Pariss,StewieTech/MaxCharacterWork' });
  assert.deepEqual(request.packageFilters, ['lisa', 'ralph']);
  assert.throws(() => buildWorkflowRequest(argv, { HOMER_ALLOWED_TARGETS: '' }), /must be configured/);
  assert.throws(() => buildWorkflowRequest(argv, { HOMER_ALLOWED_TARGETS: 'StewieTech/Other' }), /Unsupported target repository/);
  const invalidProfile = [...argv];
  invalidProfile[7] = 'outside-profile';
  assert.throws(() => buildWorkflowRequest(invalidProfile, { HOMER_ALLOWED_TARGETS: 'StewieTech/Pariss' }), /Unsupported target profile/);
  const invalidRef = [...argv];
  invalidRef[5] = '../unsafe';
  assert.throws(() => buildWorkflowRequest(invalidRef, { HOMER_ALLOWED_TARGETS: 'StewieTech/Pariss' }), /Invalid target ref/);
  const invalidFilter = [...argv];
  invalidFilter[9] = 'not-a-real-package';
  assert.throws(() => buildWorkflowRequest(invalidFilter, { HOMER_ALLOWED_TARGETS: 'StewieTech/Pariss' }), /Unsupported package filters/);
});

test('update-plan guard requires acceptance, safe privileges, and explicit acknowledgement', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'contracts', 'positive.json'), 'utf8'))['odyssey-plan'];
  const plan = {
    ...fixture,
    accepted: true,
    privilegeDelta: { ...fixture.privilegeDelta, added: ['filesystem.read'], unsafeIncrease: false },
  };
  assert.throws(() => validateUpdatePlan(plan, { targetRef: 'main', defaultBranch: 'main', privilegeAcknowledged: false }), /acknowledgement/);
  const result = validateUpdatePlan(plan, { targetRef: 'main', defaultBranch: 'main', privilegeAcknowledged: true });
  assert.match(result.branchName, /^homer\/odyssey-/);
  assert.notEqual(result.branchName, 'main');
});

test('pull-request body presents semantic, privilege, and verification evidence without credentials', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, 'test', 'fixtures', 'contracts', 'positive.json'), 'utf8'));
  const body = render(fixture['odyssey-plan'], fixture.verification, 'StewieTech/Pariss@developSIT');
  assert.match(body, /Semantic delta/);
  assert.match(body, /Privilege delta/);
  assert.match(body, /Verdict: PASS/);
  assert.match(body, /Draft only/);
  assert.doesNotMatch(body, /token|secret|password/i);
});
