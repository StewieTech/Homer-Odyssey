'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { assertContract } = require('./schema');
const { hashObject, sortedUnique } = require('./stable');
const { parseSimpleYaml } = require('./yaml');

const projectRoot = path.resolve(__dirname, '..');

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new HomerError(`Cannot read ${label} at ${filePath}: ${error.message}`, EXIT.INVALID_CONTRACT);
  }
}

function loadProfile(profileValue, baseDirectory = process.cwd()) {
  const bundledProfile = ['studio', 'restricted', 'pariss'].includes(profileValue);
  const profilePath = bundledProfile
    ? path.join(projectRoot, 'profiles', `${profileValue}.json`)
    : path.resolve(baseDirectory, profileValue);
  const profile = assertContract('target-profile', readJson(profilePath, 'target profile'));

  const groups = profile.capabilities;
  const memberships = new Map();
  for (const group of ['allowed', 'denied', 'humanGated']) {
    for (const capability of groups[group]) {
      if (!memberships.has(capability)) memberships.set(capability, []);
      memberships.get(capability).push(group);
    }
  }
  const overlaps = [...memberships.entries()]
    .filter(([, membership]) => membership.length > 1)
    .map(([capability, membership]) => `${capability} appears in ${membership.join(' and ')}`);
  const pathOverlaps = profile.paths.protected
    .filter((pattern) => profile.paths.managed.includes(pattern))
    .map((pattern) => `${pattern} is both protected and managed`);
  if (overlaps.length || pathOverlaps.length) {
    throw new HomerError('Target profile has ambiguous policy', EXIT.INVALID_CONTRACT, sortedUnique([...overlaps, ...pathOverlaps]));
  }
  return { profile, profileHash: hashObject(profile), profilePath };
}

function requireDirectory(directory, label) {
  let stat;
  try {
    stat = fs.statSync(directory);
  } catch {
    throw new HomerError(`${label} does not exist: ${directory}`, EXIT.INVALID_CONTRACT);
  }
  if (!stat.isDirectory()) throw new HomerError(`${label} is not a directory: ${directory}`, EXIT.INVALID_CONTRACT);
}

function resolveRunConfig(options) {
  let declaration;
  let baseDirectory = process.cwd();
  if (options.config) {
    const configPath = path.resolve(options.config);
    baseDirectory = path.dirname(configPath);
    try {
      declaration = assertContract('homer', parseSimpleYaml(fs.readFileSync(configPath, 'utf8'), configPath));
    } catch (error) {
      if (error instanceof HomerError) throw error;
      throw new HomerError(`Cannot read target declaration at ${configPath}: ${error.message}`, EXIT.INVALID_CONTRACT);
    }
  } else {
    if (!options.source || !options.target) {
      throw new HomerError('Provide --source and --target, or --config <homer.yaml>', EXIT.USAGE);
    }
    declaration = assertContract('homer', {
      apiVersion: 'homer.odyssey/v1',
      kind: 'OdysseyTarget',
      sourceRoot: options.source,
      targetRoot: options.target,
      profile: options.profile || 'studio',
    });
  }

  const sourceRoot = path.resolve(baseDirectory, declaration.sourceRoot);
  const targetRoot = path.resolve(baseDirectory, declaration.targetRoot);
  requireDirectory(sourceRoot, 'Source root');
  requireDirectory(targetRoot, 'Target root');
  if (sourceRoot.toLowerCase() === targetRoot.toLowerCase()) {
    throw new HomerError('Source and target roots must be different', EXIT.INVALID_CONTRACT);
  }
  const loaded = loadProfile(options.profile || declaration.profile, baseDirectory);
  return {
    declaration,
    sourceRoot,
    targetRoot,
    ...loaded,
  };
}

module.exports = { loadProfile, resolveRunConfig };
