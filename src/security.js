'use strict';

const path = require('node:path');
const { evaluateCapabilities } = require('../transforms/capability-filter');
const { redact } = require('../transforms/redact');

const unsafePath = /(?:exploit|attack-procedure|secret-export|operational-abuse)/i;
const unsafeContent = [
  { code: 'runnable-attack-tool', pattern: /\b(?:nmap|sqlmap|metasploit)\b/i },
  { code: 'secret-export-procedure', pattern: /\b(?:exfiltrate|dump)\s+(?:a\s+)?(?:secret|credential)/i },
  { code: 'protected-policy-bypass', pattern: /\b(?:bypass|disable)\s+(?:auth|cors|session|entitlement)/i },
  { code: 'stealth-social-automation', pattern: /\bstealth(?:y)?\s+(?:social|automation)/i },
  { code: 'automatic-production-mutation', pattern: /\b(?:deploy|mutate)\s+(?:directly|automatically)\b/i },
  { code: 'provider-attack-procedure', pattern: /\bprovider[- ]specific\s+attack\b/i },
];

function scanText(packageId, surface, content) {
  const findings = [];
  if (unsafePath.test(surface)) findings.push({ package: packageId, surface, code: 'forbidden-reference-path' });
  const sanitized = redact(content);
  for (const rule of unsafeContent) {
    if (rule.pattern.test(sanitized)) findings.push({ package: packageId, surface, code: rule.code });
  }
  return findings;
}

function scanPackageGraph(packages, profile) {
  const findings = [];
  for (const item of packages) {
    const requested = [
      ...(item.descriptor.capabilities || []),
      ...(item.descriptor.permissions?.requested || []),
    ];
    const evaluation = evaluateCapabilities(requested, profile);
    for (const capability of [...evaluation.denied, ...evaluation.undeclared]) {
      findings.push({ package: item.key, surface: item.descriptorPath, code: 'forbidden-capability', capability });
    }
    for (const surface of item.surfaces) findings.push(...scanText(item.key, surface.path, surface.content));
    if (item.type === 'skill') {
      for (const [name, values] of Object.entries({
        commands: item.descriptor.commands,
        workflows: item.descriptor.workflows,
        templates: item.descriptor.templates,
        adapters: item.descriptor.adapters,
        outputs: item.descriptor.outputs,
        validation: item.descriptor.validation,
      })) {
        findings.push(...scanText(item.key, `manifest:${name}`, (values || []).join('\n')));
      }
      findings.push(...scanText(item.key, 'manifest:upgrade', item.descriptor.upgrades.instructions));
    }
  }
  return findings.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

module.exports = { scanPackageGraph, scanText, unsafeContent, unsafePath };
