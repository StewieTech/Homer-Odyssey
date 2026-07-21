#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { argumentsByName } = require('./operation-request');
const { planDriftChecks } = require('../src/drift-orchestration');
const { stableJson } = require('../src/stable');

function parseJson(value, label, fallback) {
  if ((value === undefined || value === '') && fallback !== undefined) return fallback;
  try { return JSON.parse(value); }
  catch (error) { throw new Error(`${label} must be valid JSON: ${error.message}`); }
}

function buildTriggerFromEnvironment(env = process.env) {
  const targetIds = parseJson(env.HOMER_DRIFT_TARGET_IDS || '[]', 'HOMER_DRIFT_TARGET_IDS', []);
  return {
    type: env.HOMER_DRIFT_TRIGGER || 'manual',
    requestedBy: env.HOMER_DRIFT_REQUESTED_BY || 'github-actions',
    workflowId: env.HOMER_DRIFT_WORKFLOW_ID || 'local-drift-orchestration',
    sourceCommit: env.HOMER_DRIFT_SOURCE_COMMIT || 'local-source',
    packageVersions: parseJson(env.HOMER_DRIFT_PACKAGE_VERSIONS, 'HOMER_DRIFT_PACKAGE_VERSIONS'),
    targetIds,
  };
}

function matrixFromPlan(plan) {
  return {
    include: plan.decisions
      .filter((decision) => decision.status === 'queued')
      .map((decision) => ({
        targetId: decision.targetId,
        targetRepository: decision.request.targetRepository,
        targetRef: decision.request.targetRef,
        profile: decision.request.profile,
        packageFilters: decision.request.packageFilters,
        updateChannel: decision.request.updateChannel,
        requestedBy: decision.request.requestedBy,
        idempotencyKey: decision.request.idempotencyKey,
        dedupeKey: decision.dedupeKey,
        targetCommit: decision.targetCommit,
        targetLockHash: decision.targetLockHash,
        triggerType: plan.trigger.type,
        workflowId: plan.trigger.workflowId,
        sourceCommit: plan.trigger.sourceCommit,
        sourcePackageVersions: plan.trigger.packageVersions,
      })),
  };
}

function appendWorkflowOutput(filePath, name, value) {
  if (!filePath) return;
  fs.appendFileSync(filePath, `${name}=${value}\n`);
}

function appendSummary(filePath, plan) {
  if (!filePath) return;
  const lines = [
    '## Homer drift orchestration',
    '',
    `- Trigger: \`${plan.trigger.type}\``,
    `- Orchestration: \`${plan.orchestrationId}\``,
    `- Registered: ${plan.summary.registered}`,
    `- Queued: ${plan.summary.queued}`,
    `- Suppressed: ${plan.summary.suppressed}`,
    `- Dismissed: ${plan.summary.dismissed}`,
    `- Blocked: ${plan.summary.blocked}`,
    '',
  ];
  fs.appendFileSync(filePath, `${lines.join('\n')}\n`);
}

function run(argv = process.argv.slice(2), env = process.env) {
  const args = argumentsByName(argv);
  const root = path.resolve(__dirname, '..');
  const registryPath = path.resolve(args.registry || path.join(root, 'profiles', 'registries', 'stable-targets.json'));
  const outputPath = path.resolve(args.output || 'odyssey-drift-orchestration.json');
  const matrixPath = path.resolve(args['matrix-output'] || 'odyssey-drift-matrix.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const state = parseJson(env.HOMER_DRIFT_TARGET_STATE || '{}', 'HOMER_DRIFT_TARGET_STATE', {});
  const plan = planDriftChecks({ registry, trigger: buildTriggerFromEnvironment(env), state });
  const matrix = matrixFromPlan(plan);
  fs.writeFileSync(outputPath, `${stableJson(plan, 2)}\n`);
  fs.writeFileSync(matrixPath, `${stableJson(matrix, 2)}\n`);
  appendWorkflowOutput(env.GITHUB_OUTPUT, 'matrix', JSON.stringify(matrix));
  appendWorkflowOutput(env.GITHUB_OUTPUT, 'has_work', matrix.include.length ? 'true' : 'false');
  appendWorkflowOutput(env.GITHUB_OUTPUT, 'orchestration_id', plan.orchestrationId);
  appendSummary(env.GITHUB_STEP_SUMMARY, plan);
  return { plan, matrix, outputPath, matrixPath };
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    process.stderr.write(`homer drift orchestration: ${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { buildTriggerFromEnvironment, matrixFromPlan, parseJson, run };
