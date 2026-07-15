'use strict';

const { stableJson } = require('../src/stable');

function projectWithCodexAdapter({ content, profile, sourceHash, sourcePath, targetPath }) {
  if (targetPath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    return `${stableJson({ generatedBy: 'Homer Odyssey', generatedSource: { path: sourcePath, hash: sourceHash }, ...parsed }, 2)}\n`;
  }
  return `${profile.projection.generatedMarker}\n<!-- Homer source: ${sourcePath}; source-sha256: ${sourceHash} -->\n\n${content.trim()}\n`;
}

module.exports = { projectWithCodexAdapter };
