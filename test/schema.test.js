'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const Ajv2020 = require('ajv/dist/2020');
const { loadSchema, validateSchema } = require('../src/schema');

const fixtureRoot = path.join(__dirname, 'fixtures', 'contracts');
const positive = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'positive.json'), 'utf8'));
const negative = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'negative.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validators = Object.fromEntries(Object.keys(positive).map((name) => [name, ajv.compile(loadSchema(name))]));

for (const name of Object.keys(positive).sort()) {
  test(`${name} accepts its positive fixture`, () => {
    const schema = loadSchema(name);
    assert.deepEqual(validateSchema(schema, positive[name]), []);
    assert.equal(validators[name](positive[name]), true);
  });

  test(`${name} rejects its negative fixture`, () => {
    const schema = loadSchema(name);
    assert.notDeepEqual(validateSchema(schema, negative[name]), []);
    assert.equal(validators[name](negative[name]), false);
  });
}
