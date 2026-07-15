'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('../src/inventory');

const root = path.resolve(__dirname, '..');
const compatibilityPath = 'docs/toolscli-compatibility.md';
const problems = [];

for (const relativePath of walkFiles(root)) {
  if (relativePath === compatibilityPath || relativePath === 'scripts/check-references.js' || relativePath.startsWith('test/')) continue;
  const absolutePath = path.join(root, ...relativePath.split('/'));
  const bytes = fs.readFileSync(absolutePath);
  if (bytes.includes(0) || bytes.length > 2_000_000) continue;
  const content = bytes.toString('utf8');
  if (content.includes('StewieTech/ToolsCLI') || /^# ToolsCLI\b/m.test(content)) {
    problems.push(`${relativePath}: stale canonical ToolsCLI reference`);
  }
}

const packageMetadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (packageMetadata.bin?.homer !== './bin/homer.js') problems.push('package.json: missing homer bin');
if (!packageMetadata.repository?.url?.includes('StewieTech/Homer-Odyssey')) problems.push('package.json: noncanonical repository URL');

for (const relativePath of walkFiles(path.join(root, 'schemas'))) {
  try { JSON.parse(fs.readFileSync(path.join(root, 'schemas', ...relativePath.split('/')), 'utf8')); }
  catch (error) { problems.push(`schemas/${relativePath}: invalid JSON (${error.message})`); }
}

if (problems.length) {
  process.stderr.write(`${problems.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('Repository identity, schema JSON, and canonical references are valid.\n');
}
