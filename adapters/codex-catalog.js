'use strict';

const { stableJson } = require('../src/stable');

function bulletList(values, emptyMessage = 'None.') {
  if (!values.length) return emptyMessage;
  return values.map((value) => `- ${value}`).join('\n');
}

function fillTemplate(template, values) {
  const rendered = template.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g, (placeholder, key) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing Codex catalog template value: ${key}`);
    return values[key];
  });
  const unresolved = rendered.match(/\{\{[^{}]+\}\}/);
  if (unresolved) throw new Error(`Unresolved Codex catalog template value: ${unresolved[0]}`);
  return `${rendered.trim()}\n`;
}

function coreSurface(item, helperPaths = new Map()) {
  const surface = item.surfaces.find(({ path }) => path === 'core.md');
  if (!surface) throw new Error(`${item.key} does not declare core.md`);
  let content = surface.content.trim();
  for (const [packagePath, renderedPath] of helperPaths) {
    content = content.replaceAll(`(./${packagePath})`, `(./${renderedPath})`);
  }
  return content;
}

function characterPassportReference(characterPackage) {
  const passport = characterPackage.descriptor;
  return `# ${passport.name} portable passport

- Role: ${passport.role}
- Purpose: ${passport.purpose}
- Traits: ${passport.traits.join(', ')}
- Portable capabilities requested: ${passport.capabilities.join(', ') || 'none'}
- Required context: ${passport.context.required.join(', ') || 'none'}

This passport defines identity and reusable boundaries only. Current repository instructions and human gates own all effective authority.
`;
}

function skillContractReference(skillPackage) {
  const manifest = skillPackage.descriptor;
  const variables = manifest.variables.map((variable) => {
    const requirement = variable.required ? 'required' : 'optional';
    return `\`${variable.name}\` (${requirement}): ${variable.description || 'Repository-owned input.'}`;
  });
  return `# ${manifest.title} portable contract

- Package: \`${skillPackage.key}@${manifest.version}\`
- Portable capabilities requested: ${manifest.capabilities.join(', ') || 'none'}
- Validation declarations: ${manifest.validation.join(', ') || 'none'}

## Repository-owned inputs

${bulletList(variables)}

## Declared outputs

${bulletList(manifest.outputs.map((output) => `\`${output}\``))}

The contract describes reusable inputs and outputs. It does not supply missing values or grant authority.
`;
}

function requiredReading(characterPackage, helperPaths) {
  const lines = ['1. Read the repository\'s `AGENTS.md` and any more-local agent instructions when present.'];
  let index = 2;
  if (characterPackage) {
    lines.push(`${index}. Read [the portable character passport](./references/character-passport.md).`);
    index += 1;
  }
  lines.push(`${index}. Read [the portable skill contract](./references/skill-contract.md).`);
  index += 1;
  for (const renderedPath of helperPaths.values()) {
    const label = pathLabel(renderedPath);
    lines.push(`${index}. Read [the packaged ${label} helper](./${renderedPath}).`);
    index += 1;
  }
  return lines.join('\n');
}

function pathLabel(renderedPath) {
  return renderedPath.split('/').at(-1).replace(/\.md$/, '').replaceAll('-', ' ');
}

function dependencyInstructions(skillPackage) {
  const dependencies = skillPackage.dependencies.filter((dependency) => dependency.startsWith('skill:'));
  if (!dependencies.length) return 'No delegated native skill is required by this workflow.';
  const names = dependencies.map((dependency) => `\`$${dependency.slice('skill:'.length)}\``);
  return `When delegation is needed, use the matching installed native skill:\n\n${bulletList(names)}`;
}

function identitySection(characterPackage, skillPackage, characterHelperPaths) {
  if (!characterPackage) {
    return `${skillPackage.descriptor.title} is a portable workflow identity. It has no separate character passport and receives no authority beyond the current repository's rules.`;
  }
  return coreSurface(characterPackage, characterHelperPaths).replace(/^# [^\n]+\n+/, '');
}

function renderGenericCodexSkill({ characterPackage, entry, inputSources, packageSources, skillPackage, sourceHash, template }) {
  const nativeRoot = `.agents/skills/${entry.nativeName}`;
  const characterHelpers = characterPackage ? characterPackage.surfaces.filter(({ path }) => path.startsWith('helpers/')) : [];
  const skillHelpers = skillPackage.surfaces.filter(({ path }) => path.startsWith('helpers/'));
  const characterHelperPaths = new Map(characterHelpers.map(({ path }) => [path, `references/character-${path.slice('helpers/'.length)}`]));
  const skillHelperPaths = new Map(skillHelpers.map(({ path }) => [path, `references/${path.slice('helpers/'.length)}`]));
  const allHelperPaths = [...characterHelperPaths.values(), ...skillHelperPaths.values()];
  const files = {};
  files[`${nativeRoot}/SKILL.md`] = fillTemplate(template, {
    dependencies: dependencyInstructions(skillPackage),
    description: JSON.stringify(entry.description),
    genericInstruction: entry.genericInstruction,
    identity: identitySection(characterPackage, skillPackage, characterHelperPaths),
    name: entry.nativeName,
    outputs: bulletList(skillPackage.descriptor.outputs.map((output) => `\`${output}\``)),
    requiredReading: requiredReading(characterPackage, allHelperPaths),
    sourceHash,
    title: skillPackage.descriptor.title,
    workflow: coreSurface(skillPackage, skillHelperPaths).replace(/^# [^\n]+\n+/, ''),
  });
  if (characterPackage) {
    files[`${nativeRoot}/references/character-passport.md`] = characterPassportReference(characterPackage).replaceAll('\r\n', '\n');
  }
  files[`${nativeRoot}/references/skill-contract.md`] = skillContractReference(skillPackage).replaceAll('\r\n', '\n');
  for (const helper of [...characterHelpers, ...skillHelpers]) {
    const renderedPath = characterHelpers.includes(helper) ? characterHelperPaths.get(helper.path) : skillHelperPaths.get(helper.path);
    const outputPath = `${nativeRoot}/${renderedPath}`;
    if (files[outputPath]) throw new Error(`Generic catalog helper path collision at ${outputPath}`);
    files[outputPath] = `${helper.content.trim()}\n`;
  }
  files[`${nativeRoot}/.homer-catalog.json`] = `${stableJson({
    apiVersion: 'homer.odyssey/v1',
    generatedBy: 'Homer Odyssey generic Codex catalog renderer',
    inputs: inputSources,
    kind: 'GenericCodexSkillOwnership',
    nativeName: entry.nativeName,
    ownership: 'homer-generic-catalog',
    packages: packageSources,
    sourceHash,
  }, 2)}\n`;
  return files;
}

module.exports = { fillTemplate, renderGenericCodexSkill };
