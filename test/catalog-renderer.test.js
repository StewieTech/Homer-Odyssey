'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCatalog } = require('../src/catalog');
const {
  EXPECTED_NATIVE_NAMES,
  buildGenericCatalog,
  renderGenericCatalog,
  verifyGenericCatalog,
} = require('../src/catalog-renderer');

const repositoryRoot = path.resolve(__dirname, '..');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'SKILL.md must begin with YAML frontmatter');
  const result = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([a-z][a-z0-9-]*):\s*(.+)$/);
    assert.ok(field, `invalid frontmatter line: ${line}`);
    assert.equal(Object.hasOwn(result, field[1]), false, `duplicate frontmatter field: ${field[1]}`);
    result[field[1]] = field[2].startsWith('"') ? JSON.parse(field[2]) : field[2];
  }
  return result;
}

function copyRendererSource(destination) {
  for (const relativePath of ['packages', 'adapters', 'profiles/overlays/generic']) {
    fs.cpSync(path.join(repositoryRoot, relativePath), path.join(destination, relativePath), { recursive: true });
  }
}

function walkSkillFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? walkSkillFiles(child) : [child];
  });
}

test('generic catalog exposes exactly the six native character workflows', () => {
  const build = buildGenericCatalog({ sourceRoot: repositoryRoot });
  assert.deepEqual(build.nativeNames, EXPECTED_NATIVE_NAMES);
  assert.deepEqual([...new Set(build.nativeNames)], EXPECTED_NATIVE_NAMES);
});

test('checked-in catalog has deterministic package and catalog hash parity', () => {
  const catalogByKey = new Map(loadCatalog(repositoryRoot).packages.map((item) => [item.key, item]));
  const verification = verifyGenericCatalog({ sourceRoot: repositoryRoot });
  assert.equal(verification.ok, true, JSON.stringify(verification.issues));
  for (const entry of verification.entries) {
    const metadataPath = path.join(repositoryRoot, '.agents', 'skills', entry.nativeName, '.homer-catalog.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    assert.equal(metadata.nativeName, entry.nativeName);
    assert.equal(metadata.sourceHash, entry.sourceHash);
    assert.deepEqual(metadata.packages, entry.packageSources);
    for (const source of metadata.packages) {
      assert.equal(source.version, catalogByKey.get(source.key).version);
      assert.equal(source.hash, catalogByKey.get(source.key).hash);
    }
  }
});

test('rendered SKILL.md files have exact valid frontmatter and neutral content', () => {
  const secretShape = /(?:github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,})/;
  for (const nativeName of EXPECTED_NATIVE_NAMES) {
    const skillRoot = path.join(repositoryRoot, '.agents', 'skills', nativeName);
    const skill = fs.readFileSync(path.join(skillRoot, 'SKILL.md'), 'utf8').replaceAll('\r\n', '\n');
    const frontmatter = parseFrontmatter(skill);
    assert.deepEqual(Object.keys(frontmatter).sort(), ['description', 'name']);
    assert.equal(frontmatter.name, nativeName);
    assert.match(frontmatter.description, /Use when /);
    assert.match(skill, /## Required reading/);
    assert.match(skill, /\.\/references\/skill-contract\.md/);
    const files = walkSkillFiles(skillRoot);
    for (const markdownPath of files.filter((filePath) => filePath.endsWith('.md'))) {
      const markdown = fs.readFileSync(markdownPath, 'utf8');
      for (const link of markdown.matchAll(/\]\((\.\/[^)]+)\)/g)) {
        assert.equal(fs.existsSync(path.resolve(path.dirname(markdownPath), link[1])), true, `${nativeName} has a missing reference: ${link[1]}`);
      }
    }
    const rendered = files.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
    assert.doesNotMatch(rendered, /StewieTech\/Pariss|MaxCharacterWork|developSIT/);
    assert.doesNotMatch(rendered, secretShape);
    assert.doesNotMatch(rendered, /\b(?:gh pr merge|git merge|npm publish|kubectl apply|docker compose up|vercel deploy|firebase deploy)\b/i);
    assert.doesNotMatch(rendered, /origin\/(?:master|develop)\b/i);
  }
});

test('renderer is byte-stable, preserves unrelated skills, and detects package drift', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'homer-catalog-'));
  copyRendererSource(tempRoot);
  const unrelatedPath = path.join(tempRoot, '.agents', 'skills', 'unrelated', 'SKILL.md');
  fs.mkdirSync(path.dirname(unrelatedPath), { recursive: true });
  fs.writeFileSync(unrelatedPath, '---\nname: unrelated\ndescription: sentinel\n---\n');

  const first = renderGenericCatalog({ sourceRoot: tempRoot });
  const second = renderGenericCatalog({ sourceRoot: tempRoot });
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(fs.readFileSync(unrelatedPath, 'utf8').includes('sentinel'), true);
  assert.equal(verifyGenericCatalog({ sourceRoot: tempRoot }).ok, true);

  fs.appendFileSync(path.join(tempRoot, 'packages', 'skills', 'lisa', 'core.md'), '\nPortable drift fixture.\n');
  const drift = verifyGenericCatalog({ sourceRoot: tempRoot });
  assert.equal(drift.ok, false);
  assert.ok(drift.issues.some((issue) => issue.path === '.agents/skills/lisa/SKILL.md' && issue.type === 'changed'));
});
