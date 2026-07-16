'use strict';

const { EXIT, VERSION } = require('./constants');
const { resolveRunConfig } = require('./config');
const { HomerError } = require('./errors');
const { blockingMissingDependencies, buildInventory, treeFingerprint } = require('./inventory');
const { applyProjection, rollbackProjection, verifyProjection } = require('./application');
const { buildDiff, buildPlan } = require('./planning');
const { executeOperation, readOperationRequest } = require('./odyssey-run');
const { stableJson } = require('./stable');

const help = `Homer Odyssey — Agent Portability Control Plane

Usage:
  homer inspect --source <path> --target <path> [--profile studio|<path>]
  homer plan    --source <path> --target <path> [--profile studio|<path>] [--package-filters <id,...>]
  homer diff    --source <path> --target <path> [--profile studio|<path>] [--package-filters <id,...>]
  homer plan    --config <homer.yaml> --accept > odyssey-plan.json
  homer apply   --config <homer.yaml> --plan <odyssey-plan.json> [--dry-run]
  homer verify  --config <homer.yaml>
  homer rollback --config <homer.yaml> [--dry-run]
  homer run --request <odyssey-operation-request.json> --config <homer.yaml>

All commands emit deterministic JSON. Writes require an accepted current plan and remain confined to profile-managed paths plus the declared lockfile; branch and pull-request operations additionally require an authorized repository adapter.
`;

function parseArguments(argv) {
  const args = [...argv];
  if (!args.length || args.includes('--help') || args.includes('-h')) return { help: true };
  if (args.includes('--version') || args.includes('-v')) return { version: true };
  const command = args.shift();
  if (!['inspect', 'plan', 'diff', 'apply', 'verify', 'rollback', 'run'].includes(command)) throw new HomerError(`Unknown command: ${command}`, EXIT.USAGE);
  const options = { command };
  const aliases = { '--source': 'source', '--target': 'target', '--profile': 'profile', '--config': 'config', '--plan': 'plan', '--request': 'request', '--package-filters': 'packageFilters' };
  const booleans = { '--accept': 'accept', '--dry-run': 'dryRun' };
  while (args.length) {
    const flag = args.shift();
    if (booleans[flag]) {
      if (options[booleans[flag]]) throw new HomerError(`Duplicate option: ${flag}`, EXIT.USAGE);
      options[booleans[flag]] = true;
      continue;
    }
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
  if (options.accept && command !== 'plan') throw new HomerError('--accept is only valid with homer plan', EXIT.USAGE);
  if (options.dryRun && !['apply', 'rollback'].includes(command)) throw new HomerError('--dry-run is only valid with homer apply or homer rollback', EXIT.USAGE);
  if (command === 'apply' && !options.plan) throw new HomerError('homer apply requires --plan <odyssey-plan.json>', EXIT.USAGE);
  if (command === 'run' && !options.request) throw new HomerError('homer run requires --request <odyssey-operation-request.json>', EXIT.USAGE);
  if (options.packageFilters && !['plan', 'diff'].includes(command)) throw new HomerError('--package-filters is only valid with homer plan or homer diff', EXIT.USAGE);
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
  if (options.command === 'run') {
    const output = executeOperation(readOperationRequest(options.request), config);
    return { code: output.exitCode, stdout: `${stableJson(output, 2)}\n` };
  }
  if (options.command === 'apply') {
    const output = applyProjection(config, options.plan, { dryRun: options.dryRun });
    return { code: EXIT.OK, stdout: `${stableJson(output, 2)}\n` };
  }
  if (options.command === 'rollback') {
    const output = rollbackProjection(config, { dryRun: options.dryRun });
    return { code: EXIT.OK, stdout: `${stableJson(output, 2)}\n` };
  }
  if (options.command === 'verify') {
    const verification = verifyProjection(config);
    return { code: verification.exitCode, stdout: `${stableJson(verification.report, 2)}\n` };
  }
  const sourceBefore = treeFingerprint(config.sourceRoot);
  const targetBefore = treeFingerprint(config.targetRoot);
  const inventory = buildInventory(config);
  let plan = null;
  let output = inventory;
  if (options.command === 'plan' || options.command === 'diff') {
    const packageFilters = (options.packageFilters || '').split(',').map((item) => item.trim()).filter(Boolean);
    plan = buildPlan(inventory, config, { accepted: options.accept, packageFilters });
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
