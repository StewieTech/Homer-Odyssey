'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { EXIT } = require('../src/constants');
const {
  INSTALL_LOCK_PATH,
  buildInstallPlan,
  initializeTarget,
  installTarget,
  rollbackInstall,
  verifyInstall,
} = require('../src/installer');
const { hashBytes } = require('../src/stable');

const projectRoot = path.resolve(__dirname, '..');
const nativeNames = ['lisa', 'lisa-prime', 'lorie', 'marge-product-architect', 'ralph', 'ralph-prime'];

function write(relativeRoot, relativePath, content) {
  const destination = path.join(relativeRoot, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return destination;
}

function studioFixture({ overlay = '# Studio fixture policy\n\nHuman approval remains required.', legacy = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-studio-install-'));
  const profilePath = write(root, '.homer/profiles/studio.json', fs.readFileSync(path.join(projectRoot, 'profiles', 'studio.json')));
  write(root, 'AGENTS.md', '# Target routing\n');
  write(root, 'agent.md', '# Target engineering rules\n');
  write(root, '.homer/overlays/studio/policy.md', overlay);
  write(root, '.agents/skills/local-only/SKILL.md', '---\nname: local-only\ndescription: Local skill\n---\n');
  write(root, 'docs/adr/local.md', '# Local decision\n');
  if (legacy) {
    write(root, 'homer.lock', '{"kind":"OdysseyLock","legacy":true}\n');
    write(root, '.homer/generated/characters/legacy/core.md', 'legacy projection\n');
  }
  return { root, profile: path.relative(root, profilePath) };
}

function editProfile(state, mutate) {
  const profilePath = path.join(state.root, state.profile);
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  mutate(profile);
  fs.writeFileSync(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
}

function skillPath(root, name) {
  return path.join(root, '.agents', 'skills', name, 'SKILL.md');
}

test('target initialization creates safe-deny policy and ADR without installing skills', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-init-'));
  write(root, 'AGENTS.md', '# Routing\n');
  const output = initializeTarget({ targetRoot: root, profile: '.homer/profiles/studio.json' });
  assert.equal(output.exitCode, EXIT.POLICY_REVIEW_REQUIRED);
  assert.equal(output.status, 'policy-review-required');
  assert.deepEqual(output.installedSkills, []);
  assert.match(output.followUp, /homer-odyssey install --target \. --profile \.homer\/profiles\/studio\.json/);
  assert.equal(fs.existsSync(path.join(root, '.homer', 'profiles', 'studio.json')), true);
  assert.equal(fs.existsSync(path.join(root, '.homer', 'adr', '0001-homer-target-sanitization.md')), true);
  assert.equal(fs.existsSync(path.join(root, '.agents')), false);
  const profile = JSON.parse(fs.readFileSync(path.join(root, '.homer', 'profiles', 'studio.json'), 'utf8'));
  assert.deepEqual(profile.sanitization.allowedSkillPackages, []);
  assert.deepEqual(profile.sanitization.managedNativeSkillPaths, []);
});

test('target initialization never overwrites an existing policy or ADR', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-init-conflict-'));
  write(root, '.homer/profiles/studio.json', '{}\n');
  assert.throws(() => initializeTarget({ targetRoot: root, profile: '.homer/profiles/studio.json' }), (error) => error.exitCode === EXIT.CUSTOMIZATION_CONFLICT);
  assert.equal(fs.readFileSync(path.join(root, '.homer', 'profiles', 'studio.json'), 'utf8'), '{}\n');
});

test('dry-run reports an exact deterministic write set and does not mutate target', () => {
  const state = studioFixture();
  const before = hashBytes(fs.readFileSync(path.join(state.root, 'AGENTS.md')));
  const first = installTarget({ targetRoot: state.root, profile: state.profile, dryRun: true });
  const second = installTarget({ targetRoot: state.root, profile: state.profile, dryRun: true });
  assert.deepEqual(first, second);
  assert.deepEqual(first.writes.filter((item) => item.startsWith('.agents/skills/')), nativeNames.map((name) => `.agents/skills/${name}/SKILL.md`).sort());
  assert.equal(fs.existsSync(path.join(state.root, ...INSTALL_LOCK_PATH.split('/'))), false);
  assert.equal(hashBytes(fs.readFileSync(path.join(state.root, 'AGENTS.md'))), before);
});

test('Studio install renders six native skills, sanitized evidence, and human-gate reporting', () => {
  const state = studioFixture({ legacy: true });
  const output = installTarget({ targetRoot: state.root, profile: state.profile });
  assert.equal(output.idempotent, false);
  for (const name of nativeNames) {
    const content = fs.readFileSync(skillPath(state.root, name), 'utf8');
    assert.match(content, new RegExp(`^---\\nname: ${name}\\n`));
    assert.match(content, /Read target `AGENTS\.md` first/);
    assert.match(content, /## Operational workflow/);
    assert.doesNotMatch(content, /StewieTech\/Pariss|developSIT|LolaLingo/);
  }
  const generatedRoot = path.join(state.root, '.homer', 'generated', 'install');
  const generatedText = fs.readdirSync(generatedRoot).length && fs.readFileSync(path.join(generatedRoot, 'sanitization-report.json'), 'utf8');
  assert.doesNotMatch(generatedText, /StewieTech\/Pariss|developSIT|LolaLingo/);
  const report = JSON.parse(generatedText);
  assert.ok(report.humanGated.some((item) => item.capability === 'filesystem.write'));
  assert.ok(report.removed.every((item) => item.reason === 'human-gated-authority-not-granted'));
  assert.deepEqual(report.denied, []);
  assert.equal(fs.readFileSync(path.join(state.root, 'homer.lock'), 'utf8'), '{"kind":"OdysseyLock","legacy":true}\n');
  assert.equal(fs.readFileSync(path.join(state.root, '.homer', 'generated', 'characters', 'legacy', 'core.md'), 'utf8'), 'legacy projection\n');
  assert.equal(verifyInstall({ targetRoot: state.root, profile: state.profile }).verdict, 'PASS');
});

test('repeated identical install is byte-stable and a no-op', () => {
  const state = studioFixture();
  installTarget({ targetRoot: state.root, profile: state.profile });
  const lockPath = path.join(state.root, ...INSTALL_LOCK_PATH.split('/'));
  const before = fs.readFileSync(lockPath);
  const output = installTarget({ targetRoot: state.root, profile: state.profile });
  assert.equal(output.idempotent, true);
  assert.deepEqual(output.writes, []);
  assert.deepEqual(fs.readFileSync(lockPath), before);
});

test('verify detects target-owned input drift recorded by the install lock', () => {
  const state = studioFixture();
  installTarget({ targetRoot: state.root, profile: state.profile });
  const lockPath = path.join(state.root, ...INSTALL_LOCK_PATH.split('/'));
  const beforeLock = fs.readFileSync(lockPath);
  write(state.root, 'docs/adr/local.md', '# Changed local decision\n');
  const verification = verifyInstall({ targetRoot: state.root, profile: state.profile });
  assert.equal(verification.verdict, 'FAILED');
  assert.ok(verification.drift.some((item) => item.type === 'target-input-drift' && item.path === 'target-owned/**'));
  const refreshed = installTarget({ targetRoot: state.root, profile: state.profile });
  assert.equal(refreshed.idempotent, false);
  assert.deepEqual(refreshed.writes, []);
  assert.notDeepEqual(fs.readFileSync(lockPath), beforeLock);
  assert.equal(verifyInstall({ targetRoot: state.root, profile: state.profile }).verdict, 'PASS');
});

test('unmanaged same-name native skill produces a semantic conflict and is preserved', () => {
  const state = studioFixture();
  const local = write(state.root, '.agents/skills/lisa/SKILL.md', '---\nname: lisa\ndescription: Local Lisa\n---\n');
  const plan = buildInstallPlan({ targetRoot: state.root, profile: state.profile });
  assert.ok(plan.conflicts.some((item) => item.type === 'unmanaged-native-skill' && item.path.endsWith('lisa/SKILL.md')));
  editProfile(state, (profile) => { profile.sanitization.failOnUnmanagedConflict = false; });
  assert.throws(() => installTarget({ targetRoot: state.root, profile: state.profile }), (error) => {
    if (error.exitCode !== EXIT.CUSTOMIZATION_CONFLICT || error.details.length !== 1) return false;
    const report = JSON.parse(error.details[0]);
    const conflict = report.conflicts.find((item) => item.path.endsWith('lisa/SKILL.md'));
    return report.kind === 'SemanticInstallConflictReport'
      && report.policy.failOnUnmanagedConflict === false
      && conflict.comparison.localHash === conflict.localHash
      && conflict.comparison.proposedHash === conflict.proposedHash;
  });
  assert.match(fs.readFileSync(local, 'utf8'), /Local Lisa/);
  assert.equal(fs.existsSync(skillPath(state.root, 'ralph')), false);
});

test('rollback removes only installer-owned paths and preserves protected/local content', () => {
  const state = studioFixture({ legacy: true });
  installTarget({ targetRoot: state.root, profile: state.profile });
  const preview = rollbackInstall({ targetRoot: state.root, profile: state.profile, dryRun: true });
  assert.ok(preview.actions.some((item) => item.path === '.agents/skills/lisa/SKILL.md'));
  rollbackInstall({ targetRoot: state.root, profile: state.profile });
  for (const name of nativeNames) assert.equal(fs.existsSync(skillPath(state.root, name)), false);
  assert.equal(fs.existsSync(skillPath(state.root, 'local-only')), true);
  assert.equal(fs.readFileSync(path.join(state.root, 'AGENTS.md'), 'utf8'), '# Target routing\n');
  assert.equal(fs.existsSync(path.join(state.root, '.homer', 'generated', 'characters', 'legacy', 'core.md')), true);
  assert.equal(fs.existsSync(path.join(state.root, ...INSTALL_LOCK_PATH.split('/'))), false);
});

test('unresolved target variables and source-specific leakage fail closed', () => {
  const unresolved = studioFixture({ overlay: '# Policy\n\nUse <base-branch>.' });
  assert.throws(() => installTarget({ targetRoot: unresolved.root, profile: unresolved.profile }), (error) => error.exitCode === EXIT.SECURITY_POLICY && error.details.some((item) => item.includes('unresolved-placeholder')));
  const leaked = studioFixture({ overlay: '# Policy\n\nUse StewieTech/Pariss without a configured replacement token.' });
  editProfile(leaked, (profile) => { profile.sanitization.substitutions.repositories = {}; });
  assert.throws(() => installTarget({ targetRoot: leaked.root, profile: leaked.profile }), (error) => error.exitCode === EXIT.SECURITY_POLICY && error.details.some((item) => item.includes('source-specific-leakage')));
});

test('denied capabilities and minimum-version violations reject the full dependency closure', () => {
  const denied = studioFixture();
  editProfile(denied, (profile) => {
    profile.sanitization.capabilities.humanGated = profile.sanitization.capabilities.humanGated.filter((item) => item !== 'filesystem.write');
    profile.sanitization.capabilities.denied.push('filesystem.write');
  });
  assert.throws(() => installTarget({ targetRoot: denied.root, profile: denied.profile }), (error) => {
    if (error.exitCode !== EXIT.UNSAFE_PRIVILEGE || error.details.length !== 1) return false;
    const report = JSON.parse(error.details[0]);
    return report.kind === 'SanitizationReport'
      && report.denied.some((item) => item.package === 'skill:ralph' && item.capability === 'filesystem.write' && item.reason === 'denied');
  });

  const old = studioFixture();
  editProfile(old, (profile) => { profile.sanitization.minimumPackageVersions['skill:lisa'] = '9.0.0'; });
  assert.throws(() => installTarget({ targetRoot: old.root, profile: old.profile }), (error) => error.exitCode === EXIT.INVALID_CONTRACT && error.message.includes('Minimum package version'));
});

test('target-owned overlay changes native output and deterministic install lock', () => {
  const left = studioFixture({ overlay: '# Policy\n\nTarget rule alpha.' });
  const right = studioFixture({ overlay: '# Policy\n\nTarget rule beta.' });
  installTarget({ targetRoot: left.root, profile: left.profile });
  installTarget({ targetRoot: right.root, profile: right.profile });
  const leftSkill = fs.readFileSync(skillPath(left.root, 'lisa'));
  const rightSkill = fs.readFileSync(skillPath(right.root, 'lisa'));
  assert.notEqual(hashBytes(leftSkill), hashBytes(rightSkill));
  const leftLock = fs.readFileSync(path.join(left.root, ...INSTALL_LOCK_PATH.split('/')));
  const rightLock = fs.readFileSync(path.join(right.root, ...INSTALL_LOCK_PATH.split('/')));
  assert.notEqual(hashBytes(leftLock), hashBytes(rightLock));
});

test('Windows-compatible target paths work and required target docs remain enforced', () => {
  const state = studioFixture();
  const windowsTarget = state.root.replaceAll('/', '\\');
  assert.equal(installTarget({ targetRoot: windowsTarget, profile: state.profile, dryRun: true }).dryRun, true);
  fs.rmSync(path.join(state.root, 'agent.md'));
  assert.throws(() => installTarget({ targetRoot: windowsTarget, profile: state.profile }), (error) => error.exitCode === EXIT.INVALID_CONTRACT && error.details.includes('agent.md'));
});
