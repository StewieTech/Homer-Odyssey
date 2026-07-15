'use strict';

const { sortedUnique } = require('../src/stable');

function evaluateCapabilities(capabilities, profile) {
  const requested = sortedUnique(capabilities || []);
  const allowed = requested.filter((item) => profile.capabilities.allowed.includes(item));
  const humanGated = requested.filter((item) => profile.capabilities.humanGated.includes(item));
  const denied = requested.filter((item) => profile.capabilities.denied.includes(item));
  const undeclared = requested.filter((item) => !allowed.includes(item) && !humanGated.includes(item) && !denied.includes(item));
  return { requested, allowed, humanGated, denied, undeclared, removed: sortedUnique([...humanGated, ...denied, ...undeclared]) };
}

function filterDocumentCapabilities(document, profile) {
  const result = structuredClone(document);
  const evaluation = evaluateCapabilities(result.capabilities || [], profile);
  result.capabilities = evaluation.allowed;
  if (result.permissions?.requested) {
    const permissions = evaluateCapabilities(result.permissions.requested, profile);
    result.permissions.requested = permissions.allowed;
    evaluation.removed = sortedUnique([...evaluation.removed, ...permissions.removed]);
    evaluation.denied = sortedUnique([...evaluation.denied, ...permissions.denied]);
    evaluation.undeclared = sortedUnique([...evaluation.undeclared, ...permissions.undeclared]);
  }
  return { document: result, evaluation };
}

module.exports = { evaluateCapabilities, filterDocumentCapabilities };
