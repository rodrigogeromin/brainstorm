import {readFile, readdir, mkdir, writeFile, lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalize} from './contract.mjs';
export const templateRoot = fileURLToPath(new URL('../assets/template/', import.meta.url));
export async function entries(dir, prefix = '') {
  const output = [];
  for (const entry of (await readdir(dir, {withFileTypes: true})).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`Template symlink forbidden: ${relative}`);
    if (entry.isDirectory()) output.push(...await entries(path.join(dir, entry.name), relative + '/'));
    else if (entry.isFile()) output.push(relative);
    else throw new Error(`Unsupported template entry: ${relative}`);
  }
  return output;
}
export async function templateHash() {
  const hash = createHash('sha256');
  for (const file of await entries(templateRoot)) hash.update(file + '\0').update(await readFile(path.join(templateRoot, file))).update('\0');
  // The generator and executable contract are part of template provenance.
  for (const file of ['generate.mjs', 'contract.mjs', '../references/parameters.schema.json', '../references/parameters.d.ts']) hash.update(file + '\0').update(await readFile(new URL(file, import.meta.url))).update('\0');
  return hash.digest('hex');
}
export async function generate(input, destination) {
  const project = normalize(input);
  if (typeof destination !== 'string' || !destination.trim()) throw new Error('Destination required');
  const dest = path.resolve(destination);
  try { await lstat(dest); throw new Error(`Destination already exists: ${dest}`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const digest = await templateHash();
  const sourceFiles = await entries(templateRoot);
  // Prepare every output before creating the destination. JSON carries arbitrary user strings safely.
  const outputs = await Promise.all(sourceFiles.map(async file => [file, (await readFile(path.join(templateRoot, file), 'utf8')).replaceAll('__EXTENSION_NAME__', project.name)]));
  // Portable projects receive the exact executable contract and authoritative schema.
  for (const [source, target] of [['contract.mjs', 'scripts/contract.mjs'], ['../references/parameters.schema.json', 'references/parameters.schema.json']]) outputs.push([target, await readFile(new URL(source, import.meta.url), 'utf8')]);
  await mkdir(path.dirname(dest), {recursive: true});
  await mkdir(dest); // exclusive creation closes collision race; never recursive here
  for (const [file, contents] of outputs) {
    await mkdir(path.dirname(path.join(dest, file)), {recursive: true});
    await writeFile(path.join(dest, file), contents, {flag: 'wx'});
  }
  await writeFile(path.join(dest, 'extension-project.json'), JSON.stringify({...project, origin: {templateSha256: digest, adaptations: []}, compatibility: {localBuild: 'not-run', harness: 'not-run', integrated: []}}, null, 2) + '\n', {flag: 'wx'});
  return {destination: dest, templateSha256: digest};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [params, dest, ...extra] = process.argv.slice(2);
    if (!params || !dest || extra.length) throw new Error('Usage: node generate.mjs parameters.json destination');
    console.log(JSON.stringify(await generate(JSON.parse(await readFile(params, 'utf8')), dest)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
