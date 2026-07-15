'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyProjection, rollbackProjection, verifyProjection } = require('../src/application');
const { loadProfile } = require('../src/config');
const { EXIT } = require('../src/constants');
const { buildInventory, treeFingerprint } = require('../src/inventory');
const { buildPlan, buildDiff } = require('../src/planning');

const projectRoot = path.resolve(__dirname, '..');

function workspace(profileName = 'studio') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-apply-'));
  const sourceRoot = path.join(root, 'source');
  const targetRoot = path.join(root, 'target');
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.cpSync(path.join(projectRoot, 'packages'), path.join(sourceRoot, 'packages'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'profiles'), path.join(sourceRoot, 'profiles'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'adapters'), path.join(sourceRoot, 'adapters'), { recursive: true });
  fs.writeFileSync(path.join(targetRoot, 'AGENTS.md'), '# Target-owned routing\n');
  const loaded = loadProfile(path.join(sourceRoot, 'profiles', `${profileName}.json`));
  const config = {
    ...loaded,
    sourceRoot,
    targetRoot,
    declaration: { sourceCommit: 'source-fixture-sha', targetCommit: 'target-fixture-sha' },
  };
  return { root, sourceRoot, targetRoot, config };
}

function acceptedPlan(state, name = 'plan.json') {
  const inventory = buildInventory(state.config);
  const plan = buildPlan(inventory, state.config, { accepted: true });
  const planPath = path.join(state.root, name);
  fs.writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
  return { inventory, plan, planPath };
}

test('dry-run previews apply without mutation, then apply verifies and is idempotent', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  assert.equal(first.plan.conflicts.length, 0);
  assert.equal(first.plan.privilegeDelta.unsafeIncrease, false);
  const before = treeFingerprint(state.targetRoot);
  const preview = applyProjection(state.config, first.planPath, { dryRun: true });
  assert.equal(preview.dryRun, true);
  assert.ok(preview.writes.length > 20);
  assert.equal(treeFingerprint(state.targetRoot), before);

  const applied = applyProjection(state.config, first.planPath);
  assert.equal(applied.dryRun, false);
  assert.equal(fs.readFileSync(path.join(state.targetRoot, 'AGENTS.md'), 'utf8'), '# Target-owned routing\n');
  assert.ok(fs.existsSync(path.join(state.targetRoot, 'homer.lock')));
  assert.ok(applied.lock.removedCapabilities.includes('filesystem.write'));
  assert.ok(applied.lock.removedCapabilities.includes('github.write'));
  const verification = verifyProjection(state.config);
  assert.equal(verification.exitCode, 0);
  assert.equal(verification.report.verdict, 'PASS');

  const lockBefore = fs.readFileSync(path.join(state.targetRoot, 'homer.lock'), 'utf8');
  const second = acceptedPlan(state, 'second-plan.json');
  const diff = buildDiff(second.plan);
  assert.equal(diff.additions.length, 0);
  assert.equal(diff.removals.length, 0);
  assert.equal(diff.replacements.length, 0);
  const repeated = applyProjection(state.config, second.planPath);
  assert.equal(repeated.idempotent, true);
  assert.equal(fs.readFileSync(path.join(state.targetRoot, 'homer.lock'), 'utf8'), lockBefore);
});

test('apply rejects an unaccepted plan', () => {
  const state = workspace();
  const inventory = buildInventory(state.config);
  const plan = buildPlan(inventory, state.config);
  const planPath = path.join(state.root, 'unaccepted.json');
  fs.writeFileSync(planPath, JSON.stringify(plan));
  assert.throws(() => applyProjection(state.config, planPath), (error) => error.exitCode === EXIT.PLAN_NOT_ACCEPTED);
});

test('apply returns the evaluation exit when a selected package eval fails', () => {
  const state = workspace();
  const evalPath = path.join(state.sourceRoot, 'packages', 'skills', 'lisa', 'evals', 'core.json');
  const evaluation = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  evaluation.assertions[0].value = 'phrase-that-is-not-projected';
  fs.writeFileSync(evalPath, `${JSON.stringify(evaluation, null, 2)}\n`);
  const plan = acceptedPlan(state);
  assert.throws(() => applyProjection(state.config, plan.planPath), (error) => error.exitCode === EXIT.EVAL_FAILED);
});

test('one overlay change affects only the matching generated core', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  applyProjection(state.config, first.planPath);
  const overlay = path.join(state.sourceRoot, 'profiles', 'overlays', 'studio', 'skills', 'lisa.md');
  fs.appendFileSync(overlay, '\nTargeted overlay revision.\n');
  state.config = { ...state.config, ...loadProfile(path.join(state.sourceRoot, 'profiles', 'studio.json')) };
  const second = acceptedPlan(state, 'overlay-plan.json');
  const replacements = second.plan.changes.filter((item) => item.type === 'replacement');
  assert.deepEqual(replacements.map((item) => item.path), ['.homer/generated/skills/lisa/core.md']);
  assert.equal(second.plan.changes.filter((item) => item.type === 'addition' || item.type === 'removal').length, 0);
});

test('verify detects generated drift with exit 18', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  const applied = applyProjection(state.config, first.planPath);
  const generated = path.join(state.targetRoot, ...applied.lock.generatedFiles[0].path.split('/'));
  fs.appendFileSync(generated, '\ndrift\n');
  const verification = verifyProjection(state.config);
  assert.equal(verification.exitCode, EXIT.DRIFT);
  assert.equal(verification.report.verdict, 'FAILED');
  assert.ok(verification.report.drift.length >= 1);
});

test('rollback removes first projection and preserves target-owned content', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  applyProjection(state.config, first.planPath);
  const preview = rollbackProjection(state.config, { dryRun: true });
  assert.equal(preview.dryRun, true);
  assert.ok(fs.existsSync(path.join(state.targetRoot, 'homer.lock')));
  const result = rollbackProjection(state.config);
  assert.ok(result.actions.some((item) => item.type === 'remove'));
  assert.equal(fs.existsSync(path.join(state.targetRoot, 'homer.lock')), false);
  assert.equal(fs.readFileSync(path.join(state.targetRoot, 'AGENTS.md'), 'utf8'), '# Target-owned routing\n');
});

test('rollback rejects generated drift before changing any managed file', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  const applied = applyProjection(state.config, first.planPath);
  const generated = path.join(state.targetRoot, ...applied.lock.generatedFiles[0].path.split('/'));
  fs.appendFileSync(generated, '\ncustomized after apply\n');
  const before = treeFingerprint(state.targetRoot);
  assert.throws(() => rollbackProjection(state.config), (error) => error.exitCode === EXIT.ROLLBACK_FAILED);
  assert.equal(treeFingerprint(state.targetRoot), before);
});

test('rollback after an overlay update restores the previous projection and lock', () => {
  const state = workspace();
  const first = acceptedPlan(state);
  const initial = applyProjection(state.config, first.planPath);
  const coreEntry = initial.lock.generatedFiles.find((item) => item.path.endsWith('/skills/lisa/core.md'));
  const corePath = path.join(state.targetRoot, ...coreEntry.path.split('/'));
  const previousCore = fs.readFileSync(corePath, 'utf8');
  const previousLock = fs.readFileSync(path.join(state.targetRoot, 'homer.lock'), 'utf8');

  const overlay = path.join(state.sourceRoot, 'profiles', 'overlays', 'studio', 'skills', 'lisa.md');
  fs.appendFileSync(overlay, '\nRevision to roll back.\n');
  const second = acceptedPlan(state, 'updated-plan.json');
  applyProjection(state.config, second.planPath);
  assert.notEqual(fs.readFileSync(corePath, 'utf8'), previousCore);

  rollbackProjection(state.config);
  assert.equal(fs.readFileSync(corePath, 'utf8'), previousCore);
  assert.equal(fs.readFileSync(path.join(state.targetRoot, 'homer.lock'), 'utf8'), previousLock);
});
