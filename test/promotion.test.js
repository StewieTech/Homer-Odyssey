'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { EXIT } = require('../src/constants');
const { loadSchema, validateSchema } = require('../src/schema');
const { hashBytes } = require('../src/stable');
const {
  PROMOTION_CLASSIFICATIONS,
  acceptPromotionPlan,
  applyPromotionPlan,
  assertCurrentAcceptedPlan,
  classifyPromotionChange,
  createPromotionPlan,
  resolvePromotionDependencyClosure,
} = require('../src/promotion');

const sourceFiles = [
  { path: '.agents/skills/lisa/SKILL.md', content: 'Actor captures evidence. Evaluator judges the captured evidence.' },
  { path: '.agents/skills/ralph/SKILL.md', content: 'One accepted issue becomes one branch and one reviewable change.' },
];
const previousFiles = [
  { path: '.agents/skills/lisa/SKILL.md', content: 'Actor captures evidence.' },
  { path: '.agents/skills/ralph/SKILL.md', content: 'One accepted issue becomes one branch and one reviewable change.' },
];
const targetFiles = [{ path: 'packages/skills/lisa/core.md', content: 'old' }];
const proposedContent = '# Lisa\n\nActor captures evidence. Evaluator judges it.\n';

function draftPlan() {
  return createPromotionPlan({
    source: { repository: 'https://example.test/incubator', commit: 'source-sha', files: sourceFiles },
    previousProvenance: { commit: 'previous-sha', files: previousFiles },
    target: { files: targetFiles },
    selectedPackages: ['skill:lisa'],
    packageFilters: ['skill:lisa'],
    dependencyGraph: { 'skill:lisa': ['skill:lisa-prime'], 'skill:lisa-prime': ['skill:ralph-prime'], 'skill:ralph-prime': [] },
    classifications: { '.agents/skills/lisa/SKILL.md': 'portable-core' },
    proposals: {
      packageFiles: [{
        path: 'packages/skills/lisa/core.md',
        sourcePath: '.agents/skills/lisa/SKILL.md',
        classification: 'portable-core',
        content: proposedContent,
      }],
      overlayFiles: [],
      targetVariables: [{ name: 'QA_SCENARIOS', sourcePath: '.agents/skills/lisa/SKILL.md', description: 'Target scenario catalog', required: true }],
      capabilities: { added: [], removed: [] },
      dependencies: { added: ['skill:lisa-prime'], removed: [] },
      references: { added: ['helpers/evidence.md'], removed: [] },
      versions: [{ package: 'skill:lisa', from: '1.0.0', to: '1.1.0', reason: 'Portable evidence contract expanded' }],
      installerCatalog: { added: ['lisa'], removed: [] },
      evaluations: ['lisa-portability'],
    },
  });
}

test('promotion uses the exact governed classification vocabulary', () => {
  assert.deepEqual(PROMOTION_CLASSIFICATIONS, [
    'portable-core', 'pariss-overlay', 'studio-overlay-candidate', 'target-variable',
    'rejected-unsafe', 'rejected-nonportable', 'unchanged',
  ]);
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'Actor captures evidence before evaluator judgment.' }).classification, 'portable-core');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'StewieTech/Pariss on developSIT' }).classification, 'pariss-overlay');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'Use Studio product canon.' }).classification, 'studio-overlay-candidate');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'Use <base-branch>' }).classification, 'target-variable');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'silently merge the pull request' }).classification, 'rejected-unsafe');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'silently merge the pull request', classification: 'portable-core' }).classification, 'rejected-unsafe');
  assert.equal(classifyPromotionChange({ beforeContent: 'x', afterContent: 'run kubectl in the cluster' }).classification, 'rejected-nonportable');
  assert.equal(classifyPromotionChange({ beforeContent: 'same', afterContent: 'same' }).classification, 'unchanged');
});

test('promotion plan records drift, fingerprints, proposals, and complete dependency closure', () => {
  const plan = draftPlan();
  assert.equal(plan.source.commit, 'source-sha');
  assert.equal(plan.previousProvenance.commit, 'previous-sha');
  assert.match(plan.source.fingerprint, /^[a-f0-9]{64}$/);
  assert.deepEqual(plan.dependencyClosure, ['skill:ralph-prime', 'skill:lisa-prime', 'skill:lisa']);
  assert.equal(plan.changedSourceFiles.length, 1);
  assert.equal(plan.changedSourceFiles[0].classification, 'portable-core');
  assert.equal(plan.humanAcceptanceRequired, true);
  assert.equal(plan.accepted, false);
});

test('promotion plan satisfies the public JSON Schema', () => {
  const schema = loadSchema('promotion-plan');
  assert.deepEqual(validateSchema(schema, draftPlan()), []);
  assert.deepEqual(schema.properties.changedSourceFiles.items.properties.classification.enum, PROMOTION_CLASSIFICATIONS);
  const invalid = {
    ...draftPlan(),
    changedSourceFiles: [{ ...draftPlan().changedSourceFiles[0], classification: 'copy-everything' }],
  };
  assert.notDeepEqual(validateSchema(schema, invalid), []);
});

test('dependency closure rejects missing and cyclic package nodes', () => {
  assert.throws(
    () => resolvePromotionDependencyClosure(['skill:a'], { 'skill:a': ['skill:missing'] }),
    (error) => error.exitCode === EXIT.MISSING_DEPENDENCY,
  );
  assert.throws(
    () => resolvePromotionDependencyClosure(['skill:a'], { 'skill:a': ['skill:b'], 'skill:b': ['skill:a'] }),
    (error) => error.exitCode === EXIT.MISSING_DEPENDENCY,
  );
});

test('apply requires the exact accepted plan and rejects source or target staleness', () => {
  const plan = draftPlan();
  const current = { sourceFiles, provenanceFiles: previousFiles, targetFiles };
  assert.throws(() => assertCurrentAcceptedPlan(plan, current), (error) => error.exitCode === EXIT.PLAN_NOT_ACCEPTED);
  const accepted = acceptPromotionPlan(plan);
  assert.equal(assertCurrentAcceptedPlan(accepted, current), true);
  assert.throws(
    () => assertCurrentAcceptedPlan(accepted, { ...current, sourceFiles: [...sourceFiles, { path: 'new.md', content: 'drift' }] }),
    (error) => error.exitCode === EXIT.PLAN_NOT_ACCEPTED && error.details.includes('source'),
  );
  assert.throws(
    () => assertCurrentAcceptedPlan(accepted, { ...current, targetFiles: [{ ...targetFiles[0], content: 'local edit' }] }),
    (error) => error.exitCode === EXIT.PLAN_NOT_ACCEPTED && error.details.includes('target'),
  );
});

test('apply verifies materialized files before updating provenance', async () => {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-promotion-'));
  const accepted = acceptPromotionPlan(draftPlan());
  const events = [];
  const applied = await applyPromotionPlan({
    plan: accepted,
    current: { sourceFiles, provenanceFiles: previousFiles, targetFiles },
    targetRoot,
    contentByPath: { 'packages/skills/lisa/core.md': proposedContent },
    verify: ({ targetRoot: root }) => {
      const content = fs.readFileSync(path.join(root, 'packages', 'skills', 'lisa', 'core.md'), 'utf8');
      assert.equal(hashBytes(content), accepted.proposedPackageFiles[0].contentHash);
      events.push('verify');
      return { passed: true };
    },
    updateProvenance: () => events.push('provenance'),
  });
  assert.deepEqual(events, ['verify', 'provenance']);
  assert.equal(applied.verification.status, 'passed');
});

test('failed verification rolls back package writes and never updates provenance', async () => {
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-promotion-'));
  const destination = path.join(targetRoot, 'packages', 'skills', 'lisa', 'core.md');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, 'old', 'utf8');
  let provenanceUpdated = false;
  await assert.rejects(() => applyPromotionPlan({
    plan: acceptPromotionPlan(draftPlan()),
    current: { sourceFiles, provenanceFiles: previousFiles, targetFiles },
    targetRoot,
    contentByPath: { 'packages/skills/lisa/core.md': proposedContent },
    verify: () => ({ passed: false, details: ['eval failed'] }),
    updateProvenance: () => { provenanceUpdated = true; },
  }), (error) => error.exitCode === EXIT.EVAL_FAILED);
  assert.equal(fs.readFileSync(destination, 'utf8'), 'old');
  assert.equal(provenanceUpdated, false);
});
