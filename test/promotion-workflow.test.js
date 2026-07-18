'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const { EXIT } = require('../src/constants');
const { applyRepositoryPromotion, buildRepositoryPromotionPlan } = require('../src/promotion-workflow');

const projectRoot = path.resolve(__dirname, '..');
const nativeNames = ['lisa', 'lisa-prime', 'lorie', 'marge-product-architect', 'ralph', 'ralph-prime'];

function write(root, relativePath, content) {
  const absolute = path.join(root, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
}

function promotionFixture({ breakEval = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-promotion-workflow-'));
  const sourceRoot = path.join(root, 'Pariss');
  const targetRoot = path.join(root, 'Homer-Odyssey');
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  for (const relative of ['packages', 'profiles', 'adapters']) {
    fs.cpSync(path.join(projectRoot, relative), path.join(targetRoot, relative), { recursive: true });
  }
  for (const name of nativeNames) {
    fs.cpSync(path.join(projectRoot, '.agents', 'skills', name), path.join(targetRoot, '.agents', 'skills', name), { recursive: true });
  }

  git(sourceRoot, 'init', '-b', 'developSIT');
  git(sourceRoot, 'config', 'user.email', 'promotion-test@example.com');
  git(sourceRoot, 'config', 'user.name', 'Promotion Test');
  git(sourceRoot, 'remote', 'add', 'origin', 'https://github.com/StewieTech/Pariss.git');
  write(sourceRoot, '.agents/skills/ralph/SKILL.md', '# Incubating Ralph\n\nPortable bounded workflow.\n');
  git(sourceRoot, 'add', '.');
  git(sourceRoot, 'commit', '-m', 'previous source');
  const previousCommit = git(sourceRoot, 'rev-parse', 'HEAD');

  const manifestPath = path.join(targetRoot, 'packages', 'skills', 'ralph', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.provenance.commit = previousCommit;
  manifest.provenance.paths = ['.agents/skills/ralph/SKILL.md'];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  if (breakEval) write(sourceRoot, '.agents/skills/ralph/SKILL.md', '# Replacement workflow\n\nPortable but incomplete.\n');
  write(sourceRoot, '.agents/skills/ralph/NEW-PORTABLE-HELPER.md', '# New portable helper\n\nKeep review evidence deterministic.\n');
  git(sourceRoot, 'add', '.');
  git(sourceRoot, 'commit', '-m', 'current source');
  const sourceCommit = git(sourceRoot, 'rev-parse', 'HEAD');
  return { root, sourceRoot, targetRoot, manifestPath, previousCommit, sourceCommit };
}

test('repository promotion discovers new governed files and materializes the accepted reviewed payload', () => {
  const fixture = promotionFixture();
  const { plan } = buildRepositoryPromotionPlan({
    sourceRoot: fixture.sourceRoot,
    targetRoot: fixture.targetRoot,
    packageFilters: ['skill:ralph'],
    accept: true,
  });
  const changed = plan.changedSourceFiles.find((item) => item.path.endsWith('NEW-PORTABLE-HELPER.md'));
  assert.equal(changed.classification, 'portable-core');
  const proposal = plan.proposedPackageFiles.find((item) => item.path === 'packages/skills/ralph/helpers/new-portable-helper.md');
  assert.match(proposal.content, /Keep review evidence deterministic/);
  assert.ok(plan.referenceChanges.added.includes('.agents/skills/ralph/NEW-PORTABLE-HELPER.md'));
  assert.deepEqual(plan.installerCatalogChanges.added, ['refresh:ralph']);
  assert.deepEqual(plan.versionChanges.map((item) => [item.package, item.from, item.to]), [['skill:ralph', '1.1.0', '1.1.1']]);

  const planPath = write(fixture.root, 'accepted-promotion-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
  const applied = applyRepositoryPromotion({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, planPath });
  assert.equal(applied.verification.status, 'passed');
  assert.match(fs.readFileSync(path.join(fixture.targetRoot, ...proposal.path.split('/')), 'utf8'), /Keep review evidence deterministic/);
  const manifest = JSON.parse(fs.readFileSync(fixture.manifestPath, 'utf8'));
  assert.equal(manifest.provenance.commit, fixture.sourceCommit);
  assert.equal(manifest.version, '1.1.1');
  assert.ok(manifest.provenance.paths.includes('.agents/skills/ralph/NEW-PORTABLE-HELPER.md'));
  assert.ok(manifest.references.includes('helpers/new-portable-helper.md'));
  assert.equal(fs.existsSync(path.join(fixture.targetRoot, '.agents', 'skills', 'ralph', 'references', 'new-portable-helper.md')), true);
});

test('a reviewer can override classification and destination before accepting the current plan', () => {
  const fixture = promotionFixture();
  const draft = buildRepositoryPromotionPlan({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, packageFilters: ['skill:ralph'] }).plan;
  const changed = draft.changedSourceFiles.find((item) => item.path.endsWith('NEW-PORTABLE-HELPER.md'));
  changed.classification = 'pariss-overlay';
  changed.reason = 'Reviewer kept source-system guidance in the Pariss overlay';
  const sourceProposal = draft.proposedPackageFiles.find((item) => item.sourcePaths.includes(changed.path));
  const overlayPath = 'profiles/overlays/pariss/skills/ralph.md';
  const existingOverlay = fs.readFileSync(path.join(fixture.targetRoot, ...overlayPath.split('/')), 'utf8');
  draft.proposedPackageFiles = [];
  draft.proposedOverlayFiles = [{
    ...sourceProposal,
    path: overlayPath,
    classification: 'pariss-overlay',
    decisionReason: changed.reason,
    content: `${existingOverlay.trim()}\n\n## Reviewed source addition\n\n${sourceProposal.content}`,
  }];
  draft.versionChanges = [];
  draft.installerCatalogChanges = { added: [], removed: [] };
  const reviewPath = write(fixture.root, 'reviewed-draft.json', `${JSON.stringify(draft, null, 2)}\n`);
  const reviewed = buildRepositoryPromotionPlan({
    sourceRoot: fixture.sourceRoot,
    targetRoot: fixture.targetRoot,
    packageFilters: ['skill:ralph'],
    reviewPath,
    accept: true,
  }).plan;
  assert.equal(reviewed.changedSourceFiles[0].classification, 'pariss-overlay');
  assert.equal(reviewed.proposedPackageFiles.length, 0);
  assert.equal(reviewed.proposedOverlayFiles[0].path, overlayPath);
  assert.equal(reviewed.acceptedPlanId, reviewed.planId);
});

test('new shared Character OS files are discovered and deliberately routed to character overlays', () => {
  const fixture = promotionFixture();
  const passportPath = path.join(fixture.targetRoot, 'packages', 'characters', 'ralph', 'passport.json');
  const passport = JSON.parse(fs.readFileSync(passportPath, 'utf8'));
  passport.provenance.commit = fixture.previousCommit;
  passport.provenance.paths = ['.agents/skills/ralph/SKILL.md'];
  fs.writeFileSync(passportPath, `${JSON.stringify(passport, null, 2)}\n`);
  write(fixture.sourceRoot, '.agents/skills/character-os/NEW-GOVERNANCE.md', '# Shared governance\n\nReview escalation evidence.\n');
  git(fixture.sourceRoot, 'add', '.');
  git(fixture.sourceRoot, 'commit', '-m', 'add shared governance');
  const { plan } = buildRepositoryPromotionPlan({
    sourceRoot: fixture.sourceRoot,
    targetRoot: fixture.targetRoot,
    packageFilters: ['character:ralph'],
  });
  const sourcePath = '.agents/skills/character-os/NEW-GOVERNANCE.md';
  assert.equal(plan.changedSourceFiles.find((item) => item.path === sourcePath).classification, 'pariss-overlay');
  assert.ok(plan.proposedOverlayFiles.some((item) => item.path === 'profiles/overlays/pariss/characters/ralph.md' && item.sourcePaths.includes(sourcePath)));
});

test('repository promotion rejects a tampered accepted payload without moving provenance', () => {
  const fixture = promotionFixture();
  const { plan } = buildRepositoryPromotionPlan({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, packageFilters: ['skill:ralph'], accept: true });
  plan.proposedPackageFiles[0].content = 'tampered\n';
  const planPath = write(fixture.root, 'tampered-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
  assert.throws(() => applyRepositoryPromotion({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, planPath }), (error) => error.exitCode === EXIT.PLAN_NOT_ACCEPTED);
  assert.equal(JSON.parse(fs.readFileSync(fixture.manifestPath, 'utf8')).provenance.commit, fixture.previousCommit);
  assert.equal(fs.existsSync(path.join(fixture.targetRoot, 'packages', 'skills', 'ralph', 'helpers', 'new-portable-helper.md')), false);
});

test('failed required evaluations roll back canonical payload, version, and provenance', () => {
  const fixture = promotionFixture({ breakEval: true });
  const beforeManifest = fs.readFileSync(fixture.manifestPath);
  const beforeCore = fs.readFileSync(path.join(fixture.targetRoot, 'packages', 'skills', 'ralph', 'core.md'));
  const { plan } = buildRepositoryPromotionPlan({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, packageFilters: ['skill:ralph'], accept: true });
  const planPath = write(fixture.root, 'eval-failing-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
  assert.throws(() => applyRepositoryPromotion({ sourceRoot: fixture.sourceRoot, targetRoot: fixture.targetRoot, planPath }), (error) => error.exitCode === EXIT.EVAL_FAILED);
  assert.deepEqual(fs.readFileSync(fixture.manifestPath), beforeManifest);
  assert.deepEqual(fs.readFileSync(path.join(fixture.targetRoot, 'packages', 'skills', 'ralph', 'core.md')), beforeCore);
  assert.equal(fs.existsSync(path.join(fixture.targetRoot, 'packages', 'skills', 'ralph', 'helpers', 'new-portable-helper.md')), false);
  assert.equal(fs.existsSync(path.join(fixture.targetRoot, '.agents', 'skills', 'ralph', 'references', 'new-portable-helper.md')), false);
});
