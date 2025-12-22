// Minimal AJV-compatible stub to allow offline validation.
// Supports a subset of JSON Schema used by PYP scenario schema v2.
class Ajv {
  constructor(options = {}) {
    this.options = options;
    this.formats = {};
  }

  addFormat(name, validator) {
    this.formats[name] = validator;
    return this;
  }

  compile(schema) {
    const validator = (data) => {
      const errors = [];
      const valid = validateAgainstSchema(schema, data, { formats: this.formats, path: '', errors });
      validator.errors = errors.length ? errors : null;
      return valid;
    };
    return validator;
  }
}

function validateAgainstSchema(schema, data, ctx) {
  if (schema === true) return true;
  if (schema === false) {
    ctx.errors.push(makeError(ctx.path, 'schema disallows all values'));
    return false;
  }

  let ok = true;
  const { path, formats, errors } = ctx;

  if (schema.allOf) {
    for (const sub of schema.allOf) {
      if (!validateAgainstSchema(sub, data, { path, formats, errors })) ok = false;
    }
  }

  if (schema.anyOf) {
    let anyValid = false;
    for (const sub of schema.anyOf) {
      const tempErrors = [];
      const localValid = validateAgainstSchema(sub, data, { path, formats, errors: tempErrors });
      if (localValid && tempErrors.length === 0) {
        anyValid = true;
        break;
      }
    }
    if (!anyValid) {
      errors.push(makeError(path, 'should match anyOf schemas'));
      ok = false;
    }
  }

  if (schema.oneOf) {
    let validCount = 0;
    for (const sub of schema.oneOf) {
      const tempErrors = [];
      const localValid = validateAgainstSchema(sub, data, { path, formats, errors: tempErrors });
      if (localValid && tempErrors.length === 0) validCount++;
    }
    if (validCount !== 1) {
      errors.push(makeError(path, 'should match exactly one schema in oneOf'));
      ok = false;
    }
  }

  if (schema.const !== undefined) {
    if (data !== schema.const) {
      errors.push(makeError(path, `should equal constant value ${JSON.stringify(schema.const)}`));
      ok = false;
    }
  }

  if (schema.enum) {
    if (!schema.enum.includes(data)) {
      errors.push(makeError(path, `should be one of enum values`));
      ok = false;
    }
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeValid = types.some(t => checkType(t, data));
    if (!typeValid) {
      errors.push(makeError(path, `should be of type ${types.join(',')}`));
      ok = false;
      return ok;
    }
  }

  if (schema.format && formats && formats[schema.format]) {
    const res = formats[schema.format](data);
    if (!res) {
      errors.push(makeError(path, `should match format ${schema.format}`));
      ok = false;
    }
  }

  if (schema.pattern) {
    const re = new RegExp(schema.pattern);
    if (typeof data === 'string' && !re.test(data)) {
      errors.push(makeError(path, 'should match pattern'));
      ok = false;
    }
  }

  if (schema.minLength !== undefined && typeof data === 'string') {
    if (data.length < schema.minLength) {
      errors.push(makeError(path, `should NOT be shorter than ${schema.minLength} characters`));
      ok = false;
    }
  }

  if (schema.maxLength !== undefined && typeof data === 'string') {
    if (data.length > schema.maxLength) {
      errors.push(makeError(path, `should NOT be longer than ${schema.maxLength} characters`));
      ok = false;
    }
  }

  if (schema.minimum !== undefined && typeof data === 'number') {
    if (data < schema.minimum) {
      errors.push(makeError(path, `should be >= ${schema.minimum}`));
      ok = false;
    }
  }

  if (schema.maximum !== undefined && typeof data === 'number') {
    if (data > schema.maximum) {
      errors.push(makeError(path, `should be <= ${schema.maximum}`));
      ok = false;
    }
  }

  if (schema.type === 'array' && Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(makeError(path, `should NOT have fewer than ${schema.minItems} items`));
      ok = false;
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push(makeError(path, `should NOT have more than ${schema.maxItems} items`));
      ok = false;
    }
    if (schema.items) {
      data.forEach((item, idx) => {
        if (!validateAgainstSchema(schema.items, item, { path: `${path}/${idx}`, formats, errors })) ok = false;
      });
    }
  }

  if (schema.type === 'object' && data && typeof data === 'object' && !Array.isArray(data)) {
    if (schema.required) {
      for (const req of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, req)) {
          errors.push(makeError(path ? `${path}/${req}` : req, 'is required'));
          ok = false;
        }
      }
    }
    const props = schema.properties || {};
    const patternProps = schema.patternProperties || {};
    for (const key of Object.keys(data)) {
      const value = data[key];
      const nextPath = path ? `${path}/${key}` : key;
      if (props[key]) {
        if (!validateAgainstSchema(props[key], value, { path: nextPath, formats, errors })) ok = false;
      } else {
        const matchedPattern = Object.keys(patternProps).find(p => new RegExp(p).test(key));
        if (matchedPattern) {
          if (!validateAgainstSchema(patternProps[matchedPattern], value, { path: nextPath, formats, errors })) ok = false;
        } else if (schema.additionalProperties === false) {
          errors.push(makeError(nextPath, 'is not allowed by additionalProperties=false'));
          ok = false;
        }
      }
    }
  }

  return ok;
}

function checkType(type, data) {
  switch (type) {
    case 'string': return typeof data === 'string';
    case 'number': return typeof data === 'number' && !isNaN(data);
    case 'integer': return Number.isInteger(data);
    case 'object': return data && typeof data === 'object' && !Array.isArray(data);
    case 'array': return Array.isArray(data);
    case 'boolean': return typeof data === 'boolean';
    case 'null': return data === null;
    default: return true;
  }
}

function makeError(instancePath, message) {
  return { instancePath, message };
}

module.exports = Ajv;
module.exports.default = Ajv;
