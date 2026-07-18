#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { assertContract } = require('../src/schema');
const { stableJson } = require('../src/stable');

function validateUpdatePlan(planValue, options) {
  const plan = assertContract('odyssey-plan', planValue);
  if (!plan.accepted) throw new Error('Update workflow requires an accepted Odyssey Plan');
  if (plan.conflicts.length) throw new Error('Update workflow refuses a plan with unresolved conflicts');
  if (plan.privilegeDelta.unsafeIncrease) throw new Error('Update workflow refuses an unsafe privilege increase');
  if (plan.privilegeDelta.added.length && options.privilegeAcknowledged !== true) {
    throw new Error('Privilege additions require explicit workflow acknowledgement');
  }
  const branchName = `homer/odyssey-${plan.planId.slice(0, 12)}`;
  if ([options.targetRef, options.defaultBranch].filter(Boolean).includes(branchName)) {
    throw new Error('Derived update branch conflicts with a protected base branch');
  }
  const hasChanges = plan.summary.additions + plan.summary.replacements + plan.summary.removals > 0;
  return { branchName, planId: plan.planId, hasChanges, semanticDelta: plan.summary, privilegeDelta: plan.privilegeDelta };
}

if (require.main === module) {
  try {
    const [planPath, targetRef, defaultBranch, acknowledged = 'false'] = process.argv.slice(2);
    const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
    process.stdout.write(`${stableJson(validateUpdatePlan(plan, { targetRef, defaultBranch, privilegeAcknowledged: acknowledged === 'true' }), 2)}\n`);
  } catch (error) { process.stderr.write(`homer update plan: ${error.message}\n`); process.exitCode = 2; }
}

module.exports = { validateUpdatePlan };
