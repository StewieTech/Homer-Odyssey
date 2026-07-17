'use strict';

const { EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { hashBytes, sortedUnique } = require('./stable');

const SOURCE_SPECIFIC_PATTERNS = [
  { id: 'pariss-repository', pattern: /StewieTech\/Pariss/i },
  { id: 'pariss-branch', pattern: /developSIT/i },
  { id: 'pariss-product', pattern: /LolaLingo/i },
];

function versionParts(value) {
  return String(value).split('-', 1)[0].split('.').map((part) => Number(part));
}

function versionAtLeast(actual, minimum) {
  const left = versionParts(actual);
  const right = versionParts(minimum);
  for (let index = 0; index < 3; index += 1) {
    if ((left[index] || 0) > (right[index] || 0)) return true;
    if ((left[index] || 0) < (right[index] || 0)) return false;
  }
  return true;
}

function validateInstallPolicy(profile) {
  const policy = profile.sanitization;
  if (!policy) throw new HomerError('Target profile has no versioned sanitization policy', EXIT.INVALID_CONTRACT);
  const issues = [];
  const allCapabilities = new Map();
  for (const group of ['allowed', 'humanGated', 'denied']) {
    for (const capability of policy.capabilities[group]) {
      if (!allCapabilities.has(capability)) allCapabilities.set(capability, []);
      allCapabilities.get(capability).push(group);
    }
  }
  for (const [capability, groups] of allCapabilities) {
    if (groups.length > 1) issues.push(`${capability} appears in sanitization ${groups.join(' and ')}`);
  }
  for (const id of policy.allowedCharacterPackages) {
    if (!profile.packageAllowlist.characters.includes(id)) issues.push(`character:${id} is absent from the profile package allowlist`);
  }
  for (const id of policy.allowedSkillPackages) {
    if (!profile.packageAllowlist.skills.includes(id)) issues.push(`skill:${id} is absent from the profile package allowlist`);
    if (!policy.nativeSkillNames[id]) issues.push(`skill:${id} has no exact native skill name`);
  }
  const nativeNames = Object.values(policy.nativeSkillNames);
  if (new Set(nativeNames.map((item) => item.toLowerCase())).size !== nativeNames.length) issues.push('Native skill names collide case-insensitively');
  const expectedManaged = policy.allowedSkillPackages
    .map((id) => `.agents/skills/${policy.nativeSkillNames[id]}`.toLowerCase())
    .sort();
  const actualManaged = policy.managedNativeSkillPaths.map((item) => item.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase()).sort();
  if (JSON.stringify(expectedManaged) !== JSON.stringify(actualManaged)) {
    issues.push('Managed native skill paths must exactly match the allowed skill/native-name bindings');
  }
  if (!policy.evidenceOutputPath.replaceAll('\\', '/').startsWith('.homer/generated/install/')) {
    issues.push('Sanitization evidence must use the disjoint .homer/generated/install namespace');
  }
  for (const pattern of policy.deniedPatterns) {
    try { new RegExp(pattern, 'i'); }
    catch (error) { issues.push(`Invalid denied pattern ${JSON.stringify(pattern)}: ${error.message}`); }
  }
  if (issues.length) throw new HomerError('Target sanitization policy is contradictory', EXIT.INVALID_CONTRACT, sortedUnique(issues));
  return policy;
}

function replaceLiteral(content, from, to) {
  if (!from || from === to) return { content, count: 0 };
  const pieces = content.split(from);
  return { content: pieces.join(to), count: pieces.length - 1 };
}

function sanitizeText(content, policy, surface) {
  let output = content.replaceAll('\r\n', '\n');
  const transformations = [];
  const groups = [
    ['vocabulary', Object.fromEntries(Object.entries(policy.targetVocabulary).map(([key, value]) => [`{{${key}}}`, value]))],
    ['path-substitution', policy.substitutions.paths],
    ['repository-substitution', policy.substitutions.repositories],
    ['branch-substitution', policy.substitutions.branches],
  ];
  for (const [type, substitutions] of groups) {
    for (const [from, to] of Object.entries(substitutions).sort(([left], [right]) => left.localeCompare(right))) {
      const beforeHash = hashBytes(output);
      const replaced = replaceLiteral(output, from, to);
      output = replaced.content;
      if (replaced.count) transformations.push({
        type,
        surface,
        count: replaced.count,
        beforeHash,
        afterHash: hashBytes(output),
        fromHash: hashBytes(from),
        toHash: hashBytes(to),
      });
    }
  }
  return { content: output, transformations };
}

function scanSanitizedContent(content, policy, surface) {
  const findings = [];
  for (const rawPattern of policy.deniedPatterns) {
    const pattern = new RegExp(rawPattern, 'i');
    if (pattern.test(content)) findings.push({ type: 'denied-content', surface, ruleHash: hashBytes(rawPattern) });
  }
  if (policy.failOnSourceSpecificLeakage) {
    for (const rule of SOURCE_SPECIFIC_PATTERNS) {
      if (rule.pattern.test(content)) findings.push({ type: 'source-specific-leakage', surface, rule: rule.id });
    }
  }
  if (policy.failOnUnresolvedPlaceholder) {
    const moustache = /\{\{[^{}]+\}\}/.exec(content);
    const angle = /<[a-z][a-z0-9_-]*>/i.exec(content);
    if (moustache || angle) findings.push({ type: 'unresolved-placeholder', surface, tokenHash: hashBytes((moustache || angle)[0]) });
  }
  return findings;
}

function evaluatePackageCapabilities(packages, policy) {
  const allowed = [];
  const humanGated = [];
  const denied = [];
  for (const item of packages) {
    const requested = sortedUnique([
      ...(item.descriptor.capabilities || []),
      ...(item.descriptor.permissions?.requested || []),
    ]);
    for (const capability of requested) {
      const entry = { package: item.key, capability };
      if (policy.capabilities.allowed.includes(capability)) allowed.push(entry);
      else if (policy.capabilities.humanGated.includes(capability)) humanGated.push(entry);
      else denied.push({ ...entry, reason: policy.capabilities.denied.includes(capability) ? 'denied' : 'undeclared' });
    }
  }
  return { allowed, humanGated, denied };
}

function enforceMinimumVersions(packages, policy) {
  const byKey = new Map(packages.map((item) => [item.key, item]));
  const issues = [];
  for (const [key, minimum] of Object.entries(policy.minimumPackageVersions)) {
    const item = byKey.get(key);
    if (!item) issues.push(`${key} is required at ${minimum} but is absent from the dependency closure`);
    else if (!versionAtLeast(item.version, minimum)) issues.push(`${key}@${item.version} is below required ${minimum}`);
  }
  if (issues.length) throw new HomerError('Minimum package version policy failed', EXIT.INVALID_CONTRACT, issues);
}

module.exports = {
  SOURCE_SPECIFIC_PATTERNS,
  enforceMinimumVersions,
  evaluatePackageCapabilities,
  sanitizeText,
  scanSanitizedContent,
  validateInstallPolicy,
  versionAtLeast,
};
