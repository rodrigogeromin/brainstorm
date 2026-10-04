import {readFile,writeFile,lstat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {normalize,schema} from './contract.mjs';
export async function migrateManifest(source,destination,contract){
  try{await lstat(destination);throw new Error('Destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
  const old=JSON.parse(await readFile(source,'utf8'));
  if(![1,2].includes(old.schemaVersion))throw new Error('Unsupported source manifest schema');
  if(!contract)throw new Error('Explicit audited host contract required');
  const profile=old.profile==='top-bar-action-menu'?'top-bar-action':old.profile;
  const registration={...old.registration};
  if(registration.iconClassName!==undefined){if(registration.icon!==undefined&&registration.icon!==registration.iconClassName)throw new Error('Conflicting icon and iconClassName');registration.icon=registration.iconClassName;delete registration.iconClassName;}
  const input=Object.fromEntries(Object.keys(schema.properties).filter(key=>Object.hasOwn(old,key)).map(key=>[key,old[key]]));
  const normalized=normalize({...input,profile,registration,hostContract:contract});
  const result={...old,...normalized,origin:{...old.origin,adaptations:[...(old.origin?.adaptations??[]),{kind:'manifest-migration',fromSchema:old.schemaVersion,fromTemplate:old.templateVersion??null}]},compatibility:{localBuild:'not-run',harness:'not-run',integrated:[]}};
  delete result.evidence;delete result.validationReport;delete result.integration;
  await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url))try{const [src,dest,contract,...extra]=process.argv.slice(2);if(!src||!dest||!contract||extra.length)throw new Error('Usage: node migrate-manifest.mjs old.json new.json audited-contract.json');await migrateManifest(src,dest,JSON.parse(await readFile(contract,'utf8')));console.log('New manifest written; review diff and update portable files before validation');}catch(e){console.error(e.message);process.exitCode=1;}
