#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { argumentsByName } = require('./operation-request');
const { buildDriftStatusEvidence } = require('../src/drift-orchestration');
const { stableJson } = require('../src/stable');

function readJson(filePath, label) {
  try { return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')); }
  catch (error) { throw new Error(`Cannot read ${label}: ${error.message}`); }
}

function run(argv = process.argv.slice(2)) {
  const args = argumentsByName(argv);
  const request = readJson(args.request, 'Odyssey request');
  const response = readJson(args.response, 'Odyssey response');
  let packageVersions;
  try { packageVersions = JSON.parse(args['package-versions']); }
  catch (error) { throw new Error(`Package versions must be valid JSON: ${error.message}`); }
  const evidence = buildDriftStatusEvidence({
    request,
    response,
    orchestration: {
      targetId: args['target-id'],
      trigger: args.trigger,
      workflowId: args['workflow-id'],
      sourceCommit: args['source-commit'],
      packageVersions,
      targetCommit: args['target-commit'],
      targetLockHash: args['target-lock-hash'],
      dedupeKey: args['dedupe-key'],
      retryCount: Number(args['retry-count'] || 0),
      durationMs: Number(args['duration-ms'] || 0),
    },
  });
  const statusPath = path.resolve(args['status-output'] || 'odyssey-drift-status.json');
  const notificationPath = path.resolve(args['notification-output'] || 'odyssey-drift-notification.json');
  fs.writeFileSync(statusPath, `${stableJson(evidence.status, 2)}\n`);
  fs.writeFileSync(notificationPath, `${stableJson(evidence.notification, 2)}\n`);
  return { ...evidence, statusPath, notificationPath };
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    process.stderr.write(`homer drift status: ${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { readJson, run };
