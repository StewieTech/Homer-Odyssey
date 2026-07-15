'use strict';

function generalize(content, profile) {
  return content
    .replaceAll('\r\n', '\n')
    .replaceAll('{{agent}}', profile.vocabulary.agent)
    .replaceAll('{{operation}}', profile.vocabulary.operation)
    .replaceAll('{{plan}}', profile.vocabulary.plan)
    .replaceAll('{{product}}', profile.vocabulary.product);
}

module.exports = { generalize };
