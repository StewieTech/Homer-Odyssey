'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { classifyArtifact } = require('./classify');
const { hashBytes } = require('../src/stable');

function resolveOverlay(sourceRoot, sourcePath, profile) {
  const classification = classifyArtifact(sourcePath);
  if (!classification.portable || classification.surface !== 'core') return null;
  const overlayPath = path.join(sourceRoot, 'profiles', 'overlays', profile.id, classification.packageType, `${classification.packageId}.md`);
  if (!fs.existsSync(overlayPath)) return null;
  const content = fs.readFileSync(overlayPath, 'utf8').replaceAll('\r\n', '\n').trim();
  return { path: overlayPath, content, hash: hashBytes(content) };
}

function applyOverlay(content, overlay) {
  if (!overlay?.content) return content;
  return `${content.trimEnd()}\n\n## Target overlay\n\n${overlay.content}\n`;
}

module.exports = { applyOverlay, resolveOverlay };
