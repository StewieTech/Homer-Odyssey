'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { EXIT } = require('./constants');
const { HomerError } = require('./errors');
const { stableJson } = require('./stable');

const schemaRoot = path.resolve(__dirname, '..', 'schemas');

function describeType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function typeMatches(value, expected) {
  if (Array.isArray(expected)) return expected.some((type) => typeMatches(value, type));
  if (expected === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'integer') return Number.isInteger(value);
  if (expected === 'null') return value === null;
  return typeof value === expected;
}

function validateSchema(schema, value, location = '$') {
  const errors = [];
  if (schema.const !== undefined && stableJson(schema.const) !== stableJson(value)) {
    errors.push(`${location}: must equal ${JSON.stringify(schema.const)}`);
    return errors;
  }
  if (schema.enum && !schema.enum.some((item) => stableJson(item) === stableJson(value))) {
    errors.push(`${location}: must be one of ${schema.enum.map(JSON.stringify).join(', ')}`);
  }
  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${location}: expected ${JSON.stringify(schema.type)}, received ${describeType(value)}`);
    return errors;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${location}: must not be empty`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${location}: does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${location}: requires at least ${schema.minItems} item(s)`);
    if (schema.uniqueItems) {
      const serialized = value.map((item) => stableJson(item));
      if (new Set(serialized).size !== serialized.length) errors.push(`${location}: items must be unique`);
    }
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(schema.items, item, `${location}[${index}]`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const properties = schema.properties || {};
    for (const required of schema.required || []) {
      if (!Object.hasOwn(value, required)) errors.push(`${location}.${required}: is required`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (properties[key]) errors.push(...validateSchema(properties[key], child, `${location}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${location}.${key}: unknown property`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        errors.push(...validateSchema(schema.additionalProperties, child, `${location}.${key}`));
      }
    }
  }
  return errors;
}

function loadSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(schemaRoot, `${name}.schema.json`), 'utf8'));
}

function assertContract(name, value) {
  const errors = validateSchema(loadSchema(name), value);
  if (errors.length) throw new HomerError(`Invalid ${name} contract`, EXIT.INVALID_CONTRACT, errors);
  return value;
}

module.exports = { assertContract, loadSchema, validateSchema };
