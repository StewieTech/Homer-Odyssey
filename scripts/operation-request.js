#!/usr/bin/env node
'use strict';

const { assertContract } = require('../src/schema');
const { stableJson } = require('../src/stable');
const fs = require('node:fs');
const path = require('node:path');

function argumentsByName(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error(`Invalid argument near ${flag || '<end>'}`);
    result[flag.slice(2)] = value;
  }
  return result;
}

function parseList(value) {
  return [...new Set((value || '').split(',').map((item) => item.trim()).filter(Boolean))].sort();
}

function validGitRef(value) {
  return Boolean(value)
    && !value.startsWith('-')
    && !value.endsWith('/')
    && !value.endsWith('.lock')
    && !value.includes('..')
    && !value.includes('@{')
    && !/[\s~^:?*[\\]/.test(value);
}

function availablePackageFilters(root = path.resolve(__dirname, '..', 'packages')) {
  const values = new Set(['*']);
  for (const type of ['characters', 'skills']) {
    const directory = path.join(root, type);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      values.add(entry.name);
      values.add(`${type}/${entry.name}`);
    }
  }
  return values;
}

function buildWorkflowRequest(argv = process.argv.slice(2), env = process.env) {
  const args = argumentsByName(argv);
  const allowedTargets = parseList(env.HOMER_ALLOWED_TARGETS);
  if (!allowedTargets.length) throw new Error('HOMER_ALLOWED_TARGETS must be configured server-side');
  if (!allowedTargets.includes(args['target-repository'])) throw new Error(`Unsupported target repository: ${args['target-repository']}`);
  const allowedProfiles = parseList(env.HOMER_ALLOWED_PROFILES || 'studio,restricted,pariss');
  if (!allowedProfiles.includes(args.profile)) throw new Error(`Unsupported target profile: ${args.profile}`);
  if (!validGitRef(args['target-ref'])) throw new Error(`Invalid target ref: ${args['target-ref']}`);
  const allowedRefs = parseList(env.HOMER_ALLOWED_REFS);
  if (allowedRefs.length && !allowedRefs.includes(args['target-ref'])) throw new Error(`Unsupported target ref: ${args['target-ref']}`);
  const packageFilters = parseList(args['package-filters']);
  const availableFilters = availablePackageFilters();
  const unsupportedFilters = packageFilters.filter((item) => !availableFilters.has(item));
  if (unsupportedFilters.length) throw new Error(`Unsupported package filters: ${unsupportedFilters.join(', ')}`);
  return assertContract('odyssey-operation-request', {
    apiVersion: 'homer.odyssey/v1',
    kind: 'OdysseyOperationRequest',
    operation: args.operation,
    targetRepository: args['target-repository'],
    targetRef: args['target-ref'],
    profile: args.profile,
    updateChannel: args['update-channel'] || 'manual',
    requestedBy: args['requested-by'] || 'github-actions',
    dryRun: args['dry-run'] !== 'false',
    idempotencyKey: args['idempotency-key'],
    packageFilters,
  });
}

if (require.main === module) {
  try { process.stdout.write(`${stableJson(buildWorkflowRequest(), 2)}\n`); }
  catch (error) { process.stderr.write(`homer workflow request: ${error.message}\n`); process.exitCode = 2; }
}

module.exports = { argumentsByName, availablePackageFilters, buildWorkflowRequest, parseList, validGitRef };
