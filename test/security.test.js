'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { applyProjection } = require('../src/application');
const { loadProfile } = require('../src/config');
const { EXIT } = require('../src/constants');
const { buildInventory } = require('../src/inventory');
const { buildPlan } = require('../src/planning');
const { redact } = require('../transforms/redact');
const { scanText } = require('../src/security');

const projectRoot = path.resolve(__dirname, '..');

function unsafeWorkspace({ profileName = 'studio', unsafeHelper = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-security-'));
  const sourceRoot = path.join(root, 'source');
  const targetRoot = path.join(root, 'target');
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.cpSync(path.join(projectRoot, 'packages'), path.join(sourceRoot, 'packages'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'profiles'), path.join(sourceRoot, 'profiles'), { recursive: true });
  fs.cpSync(path.join(projectRoot, 'adapters'), path.join(sourceRoot, 'adapters'), { recursive: true });
  if (unsafeHelper) {
    const manifestPath = path.join(sourceRoot, 'packages', 'skills', 'ralph', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const unsafeName = ['attack', 'procedure'].join('-') + '.md';
    manifest.dependencies.helpers.push(`helpers/${unsafeName}`);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(path.dirname(manifestPath), 'helpers', unsafeName), ['n', 'map'].join('') + ' target\n');
  }
  const loaded = loadProfile(path.join(sourceRoot, 'profiles', `${profileName}.json`));
  const config = { ...loaded, sourceRoot, targetRoot, declaration: { sourceCommit: 'fixture', targetCommit: 'fixture' } };
  const plan = buildPlan(buildInventory(config), config, { accepted: true });
  const planPath = path.join(root, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan));
  return { config, planPath };
}

test('transitive unsafe helper prevents Studio projection', () => {
  const state = unsafeWorkspace();
  assert.throws(() => applyProjection(state.config, state.planPath), (error) => error.exitCode === EXIT.SECURITY_POLICY);
});

test('unsafe declared adapter prevents Studio projection', () => {
  const state = unsafeWorkspace({ unsafeHelper: false });
  const adapterPath = path.join(state.config.sourceRoot, 'adapters', 'codex.js');
  fs.writeFileSync(adapterPath, ['sql', 'map'].join('') + ' target\n');
  const plan = buildPlan(buildInventory(state.config), state.config, { accepted: true });
  fs.writeFileSync(state.planPath, JSON.stringify(plan));
  assert.throws(() => applyProjection(state.config, state.planPath), (error) => error.exitCode === EXIT.SECURITY_POLICY);
});

test('security scanner rejects unsafe command surfaces without retaining procedures', () => {
  const unsafe = ['sql', 'map'].join('') + ' target';
  const findings = scanText('skill:test', 'commands/run.txt', unsafe);
  assert.ok(findings.some((item) => item.code === 'runnable-attack-tool'));
});

test('redaction removes credential-shaped literals before projection', () => {
  const credential = 'sk-' + 'a'.repeat(20);
  assert.equal(redact(`token=${credential}`), 'token=[REDACTED]');
});

test('restricted profile classifies write authority as denied', () => {
  const profile = loadProfile('restricted').profile;
  assert.ok(profile.capabilities.denied.includes('filesystem.write'));
  assert.ok(profile.capabilities.denied.includes('github.write'));
  assert.equal(profile.capabilities.humanGated.length, 0);
});

test('restricted projection rejects the transitive Ralph write authority', () => {
  const state = unsafeWorkspace({ profileName: 'restricted', unsafeHelper: false });
  const plan = JSON.parse(fs.readFileSync(state.planPath, 'utf8'));
  assert.deepEqual(plan.privilegeDelta.denied, ['filesystem.write', 'github.write']);
  assert.throws(() => applyProjection(state.config, state.planPath), (error) => error.exitCode === EXIT.UNSAFE_PRIVILEGE);
});
