import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {auditHost} from '../scripts/audit-host.mjs';
import {migrateManifest} from '../scripts/migrate-manifest.mjs';
import {normalize,validateProject} from '../scripts/contract.mjs';
const base={name:'complete-flow',description:'Complete flow',argoCdVersion:'3.0.0',profile:'top-bar-action'};
test('real locks, exact runtime, flyout props and core resource group',()=>{
 const p=normalize(base);assert(p.hostContract.sources.some(s=>s.endsWith('/yarn.lock')));assert.equal(p.hostContract.runtime.react,'16.14.0');assert.deepEqual(p.hostContract.flyoutProps,['application','tree']);
 const core=normalize({...base,profile:'resource-tab',registration:{group:'',kind:'ConfigMap'}});assert.equal(core.registration.group,'');
 assert.equal(normalize({...base,argoCdVersion:'3.5.1'}).hostContract.runtime.react,'19.2.6');
 assert.throws(()=>normalize({...base,profile:'app-view',registration:{shouldDisplay:true}}),/not supported/);
});
test('auditor discovers yarn and records hashes without reviewing contract; failures leave no output',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-audit-'));
 const fetchSource=async url=>({ok:!url.endsWith('pnpm-lock.yaml'),status:url.endsWith('pnpm-lock.yaml')?404:200,text:async()=>url.endsWith('package.json')?'{"dependencies":{"react":"16.14.0"}}':'source'});
 const report=await auditHost('3.0.0',path.join(dir,'audit'),{fetchSource});assert.equal(report.contractReviewed,false);assert.equal(report.files.length,4);assert(report.files.every(f=>f.sha256.length===64));assert(report.files.some(f=>f.path==='ui/yarn.lock'));
 await assert.rejects(auditHost('3.0.0',path.join(dir,'audit'),{fetchSource}),/already exists/);
 await assert.rejects(auditHost('3.0.0',path.join(dir,'failed'),{fetchSource:async()=>({ok:false,status:404})}),/HTTP 404/);assert.deepEqual((await readdir(dir)).sort(),['audit']);
});
test('explicit migration preserves source/custom data and clears integration; alias conflicts reject',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-migrate-')),src=path.join(dir,'old.json'),dest=path.join(dir,'new.json');
 const old={...base,schemaVersion:1,templateVersion:'1.0.0',profile:'top-bar-action-menu',registration:{iconClassName:'fa-book'},custom:{keep:true},origin:{templateSha256:'old'},compatibility:{integrated:['3.0.0']}};
 await writeFile(src,JSON.stringify(old));const before=await readFile(src,'utf8');const migrated=await migrateManifest(src,dest,normalize(base).hostContract);assert.equal(await readFile(src,'utf8'),before);assert.equal(migrated.profile,'top-bar-action');assert.equal(migrated.registration.icon,'fa-book');assert.deepEqual(migrated.custom,old.custom);assert.deepEqual(migrated.compatibility.integrated,[]);assert.equal(migrated.origin.templateSha256,'old');
 await assert.rejects(migrateManifest(src,dest,normalize(base).hostContract),/already exists/);
 await assert.rejects(migrateManifest(src,path.join(dir,'absent.json')),/required/);
 await writeFile(src,JSON.stringify({...old,registration:{icon:'other',iconClassName:'fa-book'}}));await assert.rejects(migrateManifest(src,path.join(dir,'conflict.json'),normalize(base).hostContract),/Conflicting/);
});

test('project validation accepts reordered contract keys but rejects missing registration and argument reorder',()=>{
 const project=normalize(base);
 const reversed=Object.fromEntries(Object.entries(project.hostContract).reverse());
 reversed.runtime=Object.fromEntries(Object.entries(project.hostContract.runtime).reverse());
 assert.deepEqual(validateProject({...project,hostContract:reversed}),project);
 const registration={...project.registration};delete registration.id;
 assert.throws(()=>validateProject({...project,registration}),/registration must include normalized/);
 const argumentMap=[...project.hostContract.argumentMap];[argumentMap[1],argumentMap[2]]=[argumentMap[2],argumentMap[1]];
 assert.throws(()=>validateProject({...project,hostContract:{...project.hostContract,argumentMap}}),/argumentMap/);
});
test('migration upgrades a separately prepared target copy while preserving original and retarget history',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'argocd-retarget-'));
 const original=path.join(dir,'original.json'),prepared=path.join(dir,'prepared.json'),destination=path.join(dir,'migrated.json');
 const old={...base,schemaVersion:1,templateVersion:'1.0.0',origin:{templateSha256:'old',adaptations:[{kind:'custom-ui',detail:'keep'}]},custom:{keep:true}};
 await writeFile(original,JSON.stringify(old));const before=await readFile(original,'utf8');
 const retarget={kind:'retarget',from:'3.0.0',to:'3.5.1'};
 const copy={...old,argoCdVersion:'3.5.1',origin:{...old.origin,adaptations:[...old.origin.adaptations,retarget]}};
 await writeFile(prepared,JSON.stringify(copy));const copyBefore=await readFile(prepared,'utf8');
 const migrated=await migrateManifest(prepared,destination,normalize({...base,argoCdVersion:'3.5.1'}).hostContract);
 assert.equal(migrated.argoCdVersion,'3.5.1');assert.equal(migrated.hostContract.tag,'v3.5.1');assert.equal(migrated.hostContract.runtime.react,'19.2.6');
 assert.deepEqual(migrated.origin.adaptations.slice(0,2),copy.origin.adaptations);assert.deepEqual(migrated.custom,old.custom);
 assert.equal(await readFile(original,'utf8'),before);assert.equal(await readFile(prepared,'utf8'),copyBefore);assert.deepEqual(migrated.compatibility.integrated,[]);
});
