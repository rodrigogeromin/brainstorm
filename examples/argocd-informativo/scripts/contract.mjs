import {readFileSync} from 'node:fs';
export const schema = JSON.parse(readFileSync(new URL('../references/parameters.schema.json', import.meta.url), 'utf8'));
export const schemaVersion = 1;
export const templateVersion = '1.0.0';
export const targetVersion = schema.properties.argoCdVersion.const;
function validate(value, rule, location) {
  if (value === undefined && Object.hasOwn(rule, 'default')) value = rule.default;
  if (value === undefined) return value;
  if (Object.hasOwn(rule, 'const') && value !== rule.const) throw new Error(`${location} must equal ${rule.const}`);
  if (rule.type === 'string') {
    if (typeof value !== 'string') throw new Error(`${location} must be a string`);
    value = value.trim();
    if (value.length < (rule.minLength ?? 0) || value.length > (rule.maxLength ?? Infinity)) throw new Error(`${location} has invalid length`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) throw new Error(`${location} has invalid format`);
  }
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${location} must be an object`);
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) if (!Object.hasOwn(rule.properties,key)) throw new Error(`Unknown parameter: ${location}.${key}`);
    for (const key of rule.required ?? []) if (!Object.hasOwn(value,key)) throw new Error(`${location}.${key} is required`);
    value = Object.fromEntries(Object.entries(rule.properties).map(([key,child]) => [key,validate(value[key],child,`${location}.${key}`)]).filter(([,child])=>child!==undefined));
  }
  return value;
}
export function normalize(input) {
  const result = validate(input,schema,'parameters');
  if (!result) throw new Error('Parameters required');
  return {schemaVersion, templateVersion, ...result, registration:{group:'argoproj.io',kind:'Application',...result.registration,tabTitle:result.registration?.tabTitle ?? result.name}};
}

// Project manifests add provenance fields; generation parameters still use one schema.
export function validateProject(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) throw new Error('Project configuration must be an object');
  const parameters = Object.fromEntries(Object.keys(schema.properties).filter(key => Object.hasOwn(project,key)).map(key => [key,project[key]]));
  const normalized = normalize(parameters);
  if (project.schemaVersion !== schemaVersion || project.templateVersion !== templateVersion) throw new Error('Unsupported project schema/template version');
  return normalized;
}
