'use strict';

const { EXIT, VERSION } = require('./constants');
const { resolveRunConfig } = require('./config');
const { HomerError } = require('./errors');
const { blockingMissingDependencies, buildInventory, treeFingerprint } = require('./inventory');
const { buildDiff, buildPlan } = require('./planning');
const { stableJson } = require('./stable');

const help = `Homer Odyssey — Agent Portability Control Plane

Usage:
  homer inspect --source <path> --target <path> [--profile studio|<path>]
  homer plan    --source <path> --target <path> [--profile studio|<path>]
  homer diff    --source <path> --target <path> [--profile studio|<path>]
  homer <inspect|plan|diff> --config <homer.yaml> [--profile studio|<path>]

Read-only commands emit deterministic JSON on stdout and never write to either repository.
`;

function parseArguments(argv) {
  const args = [...argv];
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  if (args.includes('--version') || args.includes('-v')) return { version: true };
  const command = args.shift();
  if (!['inspect', 'plan', 'diff'].includes(command)) throw new HomerError(`Unknown command: ${command}`, EXIT.USAGE);
  const options = { command };
  const aliases = { '--source': 'source', '--target': 'target', '--profile': 'profile', '--config': 'config' };
  while (args.length) {
    const flag = args.shift();
    const key = aliases[flag];
    if (!key) throw new HomerError(`Unknown option: ${flag}`, EXIT.USAGE);
    const value = args.shift();
    if (!value || value.startsWith('--')) throw new HomerError(`Missing value for ${flag}`, EXIT.USAGE);
    if (options[key]) throw new HomerError(`Duplicate option: ${flag}`, EXIT.USAGE);
    options[key] = value;
  }
  if (options.config && (options.source || options.target)) {
    throw new HomerError('--config cannot be combined with --source or --target', EXIT.USAGE);
  }
  return options;
}

function policyExit(inventory, plan) {
  if (blockingMissingDependencies(inventory.entries, inventory.dependencyGraph).length
    || inventory.dependencyGraph.cycles.length
    || inventory.dependencyGraph.conflicts.length) {
    return EXIT.MISSING_DEPENDENCY;
  }
  if (!plan) return EXIT.OK;
  if (plan.conflicts.some((item) => item.type === 'protected-path')) return EXIT.PROTECTED_CONFLICT;
  if (plan.privilegeDelta.unsafeIncrease) return EXIT.UNSAFE_PRIVILEGE;
  if (plan.conflicts.some((item) => item.type === 'customization')) return EXIT.CUSTOMIZATION_CONFLICT;
  return EXIT.OK;
}

function execute(argv) {
  const options = parseArguments(argv);
  if (options.help) return { code: EXIT.OK, stdout: help };
  if (options.version) return { code: EXIT.OK, stdout: `${VERSION}\n` };
  const config = resolveRunConfig(options);
  const sourceBefore = treeFingerprint(config.sourceRoot);
  const targetBefore = treeFingerprint(config.targetRoot);
  const inventory = buildInventory(config);
  let plan = null;
  let output = inventory;
  if (options.command === 'plan' || options.command === 'diff') {
    plan = buildPlan(inventory, config);
    output = options.command === 'diff' ? buildDiff(plan) : plan;
  }
  const sourceAfter = treeFingerprint(config.sourceRoot);
  const targetAfter = treeFingerprint(config.targetRoot);
  if (sourceBefore !== sourceAfter || targetBefore !== targetAfter) {
    throw new HomerError('Read-only invariant violated: repository content changed during execution', EXIT.INTERNAL);
  }
  return { code: policyExit(inventory, plan), stdout: `${stableJson(output, 2)}\n` };
}

function main(argv = process.argv.slice(2), io = process) {
  try {
    const result = execute(argv);
    io.stdout.write(result.stdout);
    return result.code;
  } catch (error) {
    const failure = error instanceof HomerError ? error : new HomerError(error.stack || error.message);
    io.stderr.write(`homer: ${failure.message}\n`);
    for (const detail of failure.details || []) io.stderr.write(`  - ${detail}\n`);
    return failure.exitCode;
  }
}

module.exports = { execute, main, parseArguments, policyExit };
