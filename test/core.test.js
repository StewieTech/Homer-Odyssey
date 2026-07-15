'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfile } = require('../src/config');
const { globToRegExp, mapPath, matchesAny } = require('../src/glob');
const { buildInventory } = require('../src/inventory');
const { buildPlan } = require('../src/planning');
const { hashObject } = require('../src/stable');

const fixtureRoot = path.join(__dirname, 'fixtures', 'run');

function fixtureConfig() {
  const loaded = loadProfile(path.join(fixtureRoot, 'profile.json'));
  return {
    ...loaded,
    sourceRoot: path.join(fixtureRoot, 'source'),
    targetRoot: path.join(fixtureRoot, 'target'),
    declaration: { sourceCommit: 'source-sha', targetCommit: 'target-sha' },
  };
}

test('stable hashing ignores object key insertion order', () => {
  assert.equal(hashObject({ alpha: 1, beta: 2 }), hashObject({ beta: 2, alpha: 1 }));
});

test('glob matching and projection mapping are segment aware', () => {
  assert.equal(globToRegExp('docs/adr/**').test('docs/adr/ADR-001.md'), true);
  assert.equal(matchesAny('src/index.ts', ['src/**']), true);
  assert.equal(mapPath('.agents/skills/ralph/SKILL.md', {
    source: '.agents/skills/**',
    target: '.homer/generated/skills/**',
  }), '.homer/generated/skills/ralph/SKILL.md');
});

test('inventory discovers references, capabilities, and target ownership', () => {
  const inventory = buildInventory(fixtureConfig());
  const skill = inventory.entries.find((entry) => entry.path.endsWith('ralph/SKILL.md'));
  const agents = inventory.entries.find((entry) => entry.repository === 'target' && entry.path === 'AGENTS.md');
  assert.deepEqual(skill.references, ['.agents/skills/ralph/helper.md']);
  assert.deepEqual(skill.capabilities, ['filesystem.read']);
  assert.ok(skill.statuses.includes('portable-candidate'));
  assert.ok(agents.statuses.includes('protected'));
  assert.equal(inventory.dependencyGraph.missing.length, 0);
});

test('planning creates generated additions and preserves protected target content', () => {
  const config = fixtureConfig();
  const plan = buildPlan(buildInventory(config), config);
  assert.ok(plan.changes.some((change) => change.type === 'addition' && change.path.endsWith('/SKILL.md')));
  assert.ok(plan.preservedPaths.includes('AGENTS.md'));
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.privilegeDelta.unsafeIncrease, false);
});

test('inventory reports a missing local reference', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-inventory-'));
  const sourceRoot = path.join(tempRoot, 'source');
  const targetRoot = path.join(tempRoot, 'target');
  fs.mkdirSync(path.join(sourceRoot, '.agents', 'skills', 'ralph'), { recursive: true });
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.writeFileSync(path.join(sourceRoot, '.agents', 'skills', 'ralph', 'SKILL.md'), '[missing](./missing.md)');
  const loaded = loadProfile(path.join(fixtureRoot, 'profile.json'));
  const inventory = buildInventory({ ...loaded, sourceRoot, targetRoot, declaration: {} });
  assert.equal(inventory.dependencyGraph.missing.length, 1);
});
