// Minimal ajv-formats stub to register common string formats.
module.exports = function addFormats(ajv) {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  ajv.addFormat('date-time', (val) => typeof val === 'string' && dateTimeRegex.test(val));
  ajv.addFormat('uri', (val) => typeof val === 'string' && /^https?:\/\//.test(val));
  ajv.addFormat('uuid', (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val));
  return ajv;
};
