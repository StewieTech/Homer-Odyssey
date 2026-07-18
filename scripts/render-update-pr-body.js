#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

function render(plan, verification, target) {
  return [
    '## Homer Odyssey Update', '',
    `- Target: \`${target}\``,
    `- Plan: \`${plan.planId}\``,
    '', '## Semantic delta', '',
    `- Additions: ${plan.summary.additions}`,
    `- Replacements: ${plan.summary.replacements}`,
    `- Removals: ${plan.summary.removals}`,
    '', '## Privilege delta', '',
    `- Added: ${(plan.privilegeDelta.added || []).join(', ') || 'none'}`,
    `- Removed: ${(plan.privilegeDelta.removed || []).join(', ') || 'none'}`,
    '', '## Validation', '',
    `- Verdict: ${verification.verdict}`,
    `- Checks: ${verification.checks.filter((item) => item.passed).length}/${verification.checks.length} passed`,
    '', '> Draft only. Homer does not merge this pull request.', '',
  ].join('\n');
}

if (require.main === module) {
  try {
    const [planPath, verificationPath, target] = process.argv.slice(2);
    process.stdout.write(render(JSON.parse(fs.readFileSync(planPath, 'utf8')), JSON.parse(fs.readFileSync(verificationPath, 'utf8')), target));
  } catch (error) { process.stderr.write(`homer pull request body: ${error.message}\n`); process.exitCode = 2; }
}

module.exports = { render };
