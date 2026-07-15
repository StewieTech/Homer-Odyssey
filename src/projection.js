'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { projectWithCodexAdapter } = require('../adapters/codex');
const { filterDocumentCapabilities } = require('../transforms/capability-filter');
const { generalize } = require('../transforms/generalize');
const { applyOverlay, resolveOverlay } = require('../transforms/overlay');
const { redact } = require('../transforms/redact');
const { hashBytes } = require('./stable');

function buildProjectedArtifact(config, sourcePath, targetPath) {
  const absoluteSource = path.join(config.sourceRoot, ...sourcePath.split('/'));
  const sourceBytes = fs.readFileSync(absoluteSource);
  const sourceHash = hashBytes(sourceBytes);
  let content = generalize(sourceBytes.toString('utf8'), config.profile);
  let removedCapabilities = [];
  if (sourcePath.endsWith('.json') && /\/(?:passport|manifest)\.json$/.test(sourcePath)) {
    const filtered = filterDocumentCapabilities(JSON.parse(content), config.profile);
    content = JSON.stringify(filtered.document, null, 2);
    removedCapabilities = filtered.evaluation.removed;
  }
  content = redact(content);
  const overlay = resolveOverlay(config.sourceRoot, sourcePath, config.profile);
  content = applyOverlay(content, overlay);
  const projectedContent = projectWithCodexAdapter({ content, profile: config.profile, sourceHash, sourcePath, targetPath });
  return {
    content: projectedContent,
    hash: hashBytes(projectedContent),
    overlayHash: overlay?.hash || null,
    removedCapabilities,
    sourceHash,
    sourcePath,
    targetPath,
  };
}

module.exports = { buildProjectedArtifact };
